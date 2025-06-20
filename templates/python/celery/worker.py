#!/usr/bin/env python3
"""
Celery worker entry point
"""
import os
import sys
import signal
import socket
from celery.signals import (
    worker_ready, worker_shutting_down,
    task_prerun, task_postrun, task_retry
)
import structlog

from app.celery_app import celery
from app.config import settings
from app.utils.monitoring import (
    setup_prometheus_server, MetricsCollector,
    metrics_middleware, health_checker
)

logger = structlog.get_logger()


def setup_signal_handlers():
    """Setup signal handlers for graceful shutdown"""
    
    def signal_handler(signum, frame):
        logger.info(
            "Received shutdown signal",
            signal=signum
        )
        # Celery will handle the graceful shutdown
        sys.exit(0)
    
    signal.signal(signal.SIGTERM, signal_handler)
    signal.signal(signal.SIGINT, signal_handler)


def setup_health_checks():
    """Setup health check functions"""
    
    def redis_check():
        """Check Redis connectivity"""
        try:
            import redis
            r = redis.from_url(settings.CELERY_BROKER_URL)
            return r.ping()
        except Exception:
            return False
    
    def disk_space_check():
        """Check available disk space"""
        try:
            import shutil
            usage = shutil.disk_usage('/')
            free_percent = (usage.free / usage.total) * 100
            return free_percent > 10  # At least 10% free space
        except Exception:
            return False
    
    health_checker.add_check('redis', redis_check)
    health_checker.add_check('disk_space', disk_space_check)


def setup_monitoring():
    """Setup monitoring and metrics collection"""
    
    # Start Prometheus server
    if setup_prometheus_server():
        logger.info("Metrics endpoint available at /metrics")
    
    # Setup metrics collector
    hostname = socket.gethostname()
    collector = MetricsCollector(worker_id=hostname)
    collector.start()
    
    # Connect signal handlers for metrics
    task_prerun.connect(metrics_middleware.on_task_prerun)
    task_postrun.connect(metrics_middleware.on_task_postrun)
    task_retry.connect(metrics_middleware.on_task_retry)
    
    return collector


@worker_ready.connect
def worker_ready_handler(sender, **kwargs):
    """Handle worker startup"""
    logger.info(
        "Celery worker ready",
        hostname=sender.hostname,
        queues=[q.name for q in sender.consumer.task_consumer.queues],
        concurrency=sender.concurrency,
        service_name=settings.SERVICE_NAME,
        environment=settings.ENVIRONMENT
    )


@worker_shutting_down.connect
def worker_shutting_down_handler(sender, **kwargs):
    """Handle worker shutdown"""
    logger.info(
        "Celery worker shutting down",
        hostname=sender.hostname
    )


def main():
    """Main entry point for the worker"""
    
    logger.info(
        "Starting Celery worker",
        service_name=settings.SERVICE_NAME,
        environment=settings.ENVIRONMENT,
        broker_url=settings.CELERY_BROKER_URL,
        result_backend=settings.CELERY_RESULT_BACKEND
    )
    
    # Setup signal handlers
    setup_signal_handlers()
    
    # Setup health checks
    setup_health_checks()
    
    # Setup monitoring
    collector = setup_monitoring()
    
    try:
        # Start the Celery worker
        celery.start([
            'worker',
            '--loglevel=info',
            '--concurrency=4',
            '--max-tasks-per-child=1000',
            '--time-limit=3600',
            '--soft-time-limit=3300',
            '--queues=default,email,processing,maintenance,monitoring,priority'
        ])
    
    except KeyboardInterrupt:
        logger.info("Worker interrupted by user")
    
    except Exception as e:
        logger.error("Worker failed to start", error=str(e))
        sys.exit(1)
    
    finally:
        # Cleanup
        if collector:
            collector.stop()
        logger.info("Worker shutdown complete")


if __name__ == '__main__':
    main()
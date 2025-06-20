"""
Celery application configuration
"""
import os
from celery import Celery, Task
from celery.signals import (
    setup_logging, worker_ready, worker_shutting_down,
    task_prerun, task_postrun, task_retry, task_failure
)
import structlog
from prometheus_client import Counter, Histogram, Gauge
import sentry_sdk
from sentry_sdk.integrations.celery import CeleryIntegration

from app.config import settings

# Configure structured logging
structlog.configure(
    processors=[
        structlog.stdlib.filter_by_level,
        structlog.stdlib.add_logger_name,
        structlog.stdlib.add_log_level,
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.UnicodeDecoder(),
        structlog.processors.JSONRenderer()
    ],
    context_class=dict,
    logger_factory=structlog.stdlib.LoggerFactory(),
    cache_logger_on_first_use=True,
)

logger = structlog.get_logger()

# Initialize Sentry if configured
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[CeleryIntegration()],
        environment=settings.ENVIRONMENT,
        traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE
    )

# Prometheus metrics
TASK_COUNTER = Counter(
    'celery_task_total',
    'Total number of tasks',
    ['task_name', 'status']
)

TASK_DURATION = Histogram(
    'celery_task_duration_seconds',
    'Task execution duration',
    ['task_name']
)

ACTIVE_TASKS = Gauge(
    'celery_active_tasks',
    'Number of currently active tasks',
    ['task_name']
)

QUEUE_LENGTH = Gauge(
    'celery_queue_length',
    'Current queue length',
    ['queue_name']
)


class CeleryTask(Task):
    """Custom task class with additional functionality"""
    
    def on_success(self, retval, task_id, args, kwargs):
        """Success handler"""
        logger.info(
            "Task completed successfully",
            task_name=self.name,
            task_id=task_id,
            duration=self.request.duration
        )
        TASK_COUNTER.labels(task_name=self.name, status='success').inc()
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        """Retry handler"""
        logger.warning(
            "Task retrying",
            task_name=self.name,
            task_id=task_id,
            retry_count=self.request.retries,
            exception=str(exc)
        )
        TASK_COUNTER.labels(task_name=self.name, status='retry').inc()
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        """Failure handler"""
        logger.error(
            "Task failed",
            task_name=self.name,
            task_id=task_id,
            exception=str(exc),
            traceback=str(einfo)
        )
        TASK_COUNTER.labels(task_name=self.name, status='failure').inc()


# Create Celery app
celery = Celery(
    'worker',
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    task_cls=CeleryTask
)

# Configure Celery
celery.conf.update(
    # Task execution settings
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Task routing
    task_routes={
        'app.tasks.email.*': {'queue': 'email'},
        'app.tasks.processing.*': {'queue': 'processing'},
        'app.tasks.scheduled.*': {'queue': 'scheduled'},
        'app.tasks.priority.*': {'queue': 'priority'}
    },
    
    # Task behavior
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    task_track_started=True,
    task_time_limit=settings.CELERY_TASK_TIME_LIMIT,
    task_soft_time_limit=settings.CELERY_TASK_SOFT_TIME_LIMIT,
    
    # Result backend settings
    result_expires=settings.CELERY_RESULT_EXPIRES,
    result_backend_transport_options={
        'visibility_timeout': 3600,
        'fanout_prefix': True,
        'fanout_patterns': True
    },
    
    # Worker settings
    worker_prefetch_multiplier=settings.CELERY_WORKER_PREFETCH_MULTIPLIER,
    worker_max_tasks_per_child=settings.CELERY_WORKER_MAX_TASKS_PER_CHILD,
    worker_disable_rate_limits=False,
    worker_send_task_events=True,
    
    # Beat schedule (for periodic tasks)
    beat_schedule={
        'cleanup-old-results': {
            'task': 'app.tasks.maintenance.cleanup_old_results',
            'schedule': 3600.0,  # Every hour
        },
        'health-check': {
            'task': 'app.tasks.monitoring.health_check',
            'schedule': 60.0,  # Every minute
        },
        'update-metrics': {
            'task': 'app.tasks.monitoring.update_queue_metrics',
            'schedule': 30.0,  # Every 30 seconds
        }
    }
)

# Auto-discover tasks
celery.autodiscover_tasks(['app.tasks'])


# Signal handlers
@setup_logging.connect
def setup_celery_logging(**kwargs):
    """Configure Celery logging to use structlog"""
    pass  # We've already configured structlog above


@worker_ready.connect
def worker_ready_handler(sender, **kwargs):
    """Handle worker startup"""
    logger.info(
        "Celery worker started",
        hostname=sender.hostname,
        queues=[q.name for q in sender.consumer.task_consumer.queues]
    )


@worker_shutting_down.connect
def worker_shutting_down_handler(sender, **kwargs):
    """Handle worker shutdown"""
    logger.info(
        "Celery worker shutting down",
        hostname=sender.hostname
    )


@task_prerun.connect
def task_prerun_handler(sender, task_id, task, args, kwargs, **extra):
    """Handle task start"""
    ACTIVE_TASKS.labels(task_name=task.name).inc()
    logger.info(
        "Task starting",
        task_name=task.name,
        task_id=task_id,
        args=args,
        kwargs=kwargs
    )


@task_postrun.connect
def task_postrun_handler(sender, task_id, task, args, kwargs, retval, state, **extra):
    """Handle task completion"""
    ACTIVE_TASKS.labels(task_name=task.name).dec()
    
    if hasattr(task.request, 'start_time'):
        duration = task.request.duration
        TASK_DURATION.labels(task_name=task.name).observe(duration)


if __name__ == '__main__':
    celery.start()
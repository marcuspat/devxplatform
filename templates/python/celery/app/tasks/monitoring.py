"""
Monitoring and metrics Celery tasks
"""
import time
from typing import Dict, List
import structlog
from celery import current_app
from prometheus_client import Gauge

from app.celery_app import celery, QUEUE_LENGTH
from app.config import settings

logger = structlog.get_logger()


@celery.task(
    bind=True,
    name='app.tasks.monitoring.health_check',
    queue='monitoring'
)
def health_check(self) -> Dict:
    """
    Basic health check task
    
    Returns:
        Dict with health status
    """
    try:
        logger.info(
            "Performing health check",
            task_id=self.request.id
        )
        
        start_time = time.time()
        
        # Basic health indicators
        health_status = {
            'status': 'healthy',
            'timestamp': time.time(),
            'worker_id': self.request.hostname,
            'task_id': self.request.id,
            'service': settings.SERVICE_NAME
        }
        
        # Check broker connectivity
        try:
            # Attempt to get broker info
            inspect = current_app.control.inspect()
            stats = inspect.stats()
            if stats:
                health_status['broker'] = 'connected'
            else:
                health_status['broker'] = 'disconnected'
                health_status['status'] = 'degraded'
        except Exception as e:
            health_status['broker'] = f'error: {str(e)}'
            health_status['status'] = 'degraded'
        
        duration = time.time() - start_time
        health_status['response_time'] = duration
        
        logger.info(
            "Health check completed",
            status=health_status['status'],
            duration=duration,
            task_id=self.request.id
        )
        
        return health_status
        
    except Exception as exc:
        logger.error(
            "Health check failed",
            error=str(exc),
            task_id=self.request.id
        )
        raise exc


@celery.task(
    bind=True,
    name='app.tasks.monitoring.update_queue_metrics',
    queue='monitoring'
)
def update_queue_metrics(self) -> Dict:
    """
    Update queue length metrics for Prometheus
    
    Returns:
        Dict with queue metrics
    """
    try:
        logger.debug(
            "Updating queue metrics",
            task_id=self.request.id
        )
        
        metrics = {}
        
        try:
            # Get queue lengths from broker
            inspect = current_app.control.inspect()
            active_queues = inspect.active_queues()
            
            if active_queues:
                for worker, queues in active_queues.items():
                    for queue_info in queues:
                        queue_name = queue_info['name']
                        
                        # Get queue length (this is simplified - actual implementation
                        # would depend on your broker)
                        try:
                            import redis
                            r = redis.from_url(settings.CELERY_BROKER_URL)
                            queue_length = r.llen(queue_name)
                            
                            # Update Prometheus metric
                            QUEUE_LENGTH.labels(queue_name=queue_name).set(queue_length)
                            metrics[queue_name] = queue_length
                            
                        except Exception as e:
                            logger.warning(
                                "Failed to get queue length",
                                queue_name=queue_name,
                                error=str(e)
                            )
            
        except Exception as e:
            logger.warning(
                "Failed to inspect queues",
                error=str(e),
                task_id=self.request.id
            )
        
        logger.debug(
            "Queue metrics updated",
            metrics=metrics,
            task_id=self.request.id
        )
        
        return {
            'status': 'success',
            'metrics': metrics,
            'timestamp': time.time(),
            'task_id': self.request.id
        }
        
    except Exception as exc:
        logger.error(
            "Queue metrics update failed",
            error=str(exc),
            task_id=self.request.id
        )
        raise exc


@celery.task(
    bind=True,
    name='app.tasks.monitoring.collect_worker_stats',
    queue='monitoring'
)
def collect_worker_stats(self) -> Dict:
    """
    Collect comprehensive worker statistics
    
    Returns:
        Dict with worker statistics
    """
    try:
        logger.info(
            "Collecting worker statistics",
            task_id=self.request.id
        )
        
        start_time = time.time()
        stats = {
            'timestamp': start_time,
            'task_id': self.request.id,
            'workers': {},
            'queues': {},
            'summary': {}
        }
        
        try:
            inspect = current_app.control.inspect()
            
            # Get worker stats
            worker_stats = inspect.stats()
            if worker_stats:
                stats['workers'] = worker_stats
            
            # Get active tasks
            active_tasks = inspect.active()
            if active_tasks:
                total_active = sum(len(tasks) for tasks in active_tasks.values())
                stats['summary']['active_tasks'] = total_active
            
            # Get scheduled tasks
            scheduled_tasks = inspect.scheduled()
            if scheduled_tasks:
                total_scheduled = sum(len(tasks) for tasks in scheduled_tasks.values())
                stats['summary']['scheduled_tasks'] = total_scheduled
            
            # Get reserved tasks
            reserved_tasks = inspect.reserved()
            if reserved_tasks:
                total_reserved = sum(len(tasks) for tasks in reserved_tasks.values())
                stats['summary']['reserved_tasks'] = total_reserved
            
            # Get registered tasks
            registered_tasks = inspect.registered()
            if registered_tasks:
                stats['summary']['registered_tasks'] = len(next(iter(registered_tasks.values()), []))
            
        except Exception as e:
            logger.warning(
                "Failed to collect some worker stats",
                error=str(e),
                task_id=self.request.id
            )
        
        duration = time.time() - start_time
        stats['collection_duration'] = duration
        
        logger.info(
            "Worker statistics collected",
            duration=duration,
            active_workers=len(stats.get('workers', {})),
            task_id=self.request.id
        )
        
        return stats
        
    except Exception as exc:
        logger.error(
            "Worker stats collection failed",
            error=str(exc),
            task_id=self.request.id
        )
        raise exc


@celery.task(
    bind=True,
    name='app.tasks.monitoring.generate_report',
    queue='monitoring',
    rate_limit='1/m'  # Generate reports at most once per minute
)
def generate_report(
    self,
    report_type: str = 'daily',
    include_metrics: bool = True
) -> Dict:
    """
    Generate monitoring and performance report
    
    Args:
        report_type: Type of report to generate (daily, weekly, monthly)
        include_metrics: Whether to include detailed metrics
    
    Returns:
        Dict with report data
    """
    try:
        logger.info(
            "Generating monitoring report",
            report_type=report_type,
            include_metrics=include_metrics,
            task_id=self.request.id
        )
        
        start_time = time.time()
        
        report = {
            'report_type': report_type,
            'generated_at': start_time,
            'task_id': self.request.id,
            'summary': {},
            'details': {}
        }
        
        # Collect current stats
        stats_result = collect_worker_stats.delay()
        try:
            current_stats = stats_result.get(timeout=30)
            report['current_stats'] = current_stats
        except Exception as e:
            logger.warning(
                "Failed to get current stats for report",
                error=str(e)
            )
        
        # Add health check
        health_result = health_check.delay()
        try:
            health_status = health_result.get(timeout=30)
            report['health_status'] = health_status
        except Exception as e:
            logger.warning(
                "Failed to get health status for report",
                error=str(e)
            )
        
        # Summary statistics
        report['summary'] = {
            'total_active_tasks': report.get('current_stats', {}).get('summary', {}).get('active_tasks', 0),
            'total_workers': len(report.get('current_stats', {}).get('workers', {})),
            'overall_health': report.get('health_status', {}).get('status', 'unknown')
        }
        
        # Include detailed metrics if requested
        if include_metrics:
            # This would include more detailed metrics from your monitoring system
            report['details']['metrics_collected'] = True
        
        duration = time.time() - start_time
        report['generation_duration'] = duration
        
        logger.info(
            "Monitoring report generated",
            report_type=report_type,
            duration=duration,
            task_id=self.request.id
        )
        
        return report
        
    except Exception as exc:
        logger.error(
            "Report generation failed",
            report_type=report_type,
            error=str(exc),
            task_id=self.request.id
        )
        raise exc


@celery.task(
    bind=True,
    name='app.tasks.monitoring.alert_check',
    queue='monitoring'
)
def alert_check(
    self,
    thresholds: Dict = None
) -> Dict:
    """
    Check system metrics against alert thresholds
    
    Args:
        thresholds: Dictionary of metric thresholds
    
    Returns:
        Dict with alert results
    """
    try:
        logger.info(
            "Performing alert checks",
            task_id=self.request.id
        )
        
        start_time = time.time()
        
        # Default thresholds
        default_thresholds = {
            'max_queue_length': 1000,
            'max_failed_tasks_per_hour': 100,
            'min_active_workers': 1,
            'max_task_duration': 3600  # 1 hour
        }
        
        thresholds = thresholds or default_thresholds
        alerts = []
        
        # Get current metrics
        try:
            metrics_result = update_queue_metrics.delay()
            queue_metrics = metrics_result.get(timeout=30)
            
            # Check queue lengths
            for queue_name, length in queue_metrics.get('metrics', {}).items():
                if length > thresholds.get('max_queue_length', 1000):
                    alerts.append({
                        'type': 'queue_length',
                        'severity': 'warning',
                        'message': f'Queue {queue_name} length ({length}) exceeds threshold ({thresholds["max_queue_length"]})',
                        'queue_name': queue_name,
                        'current_value': length,
                        'threshold': thresholds['max_queue_length']
                    })
        
        except Exception as e:
            alerts.append({
                'type': 'metric_collection',
                'severity': 'error',
                'message': f'Failed to collect queue metrics: {str(e)}'
            })
        
        # Check worker health
        try:
            stats_result = collect_worker_stats.delay()
            worker_stats = stats_result.get(timeout=30)
            
            active_workers = len(worker_stats.get('workers', {}))
            if active_workers < thresholds.get('min_active_workers', 1):
                alerts.append({
                    'type': 'worker_count',
                    'severity': 'critical',
                    'message': f'Active worker count ({active_workers}) below threshold ({thresholds["min_active_workers"]})',
                    'current_value': active_workers,
                    'threshold': thresholds['min_active_workers']
                })
        
        except Exception as e:
            alerts.append({
                'type': 'worker_stats',
                'severity': 'error',
                'message': f'Failed to collect worker stats: {str(e)}'
            })
        
        duration = time.time() - start_time
        
        result = {
            'status': 'completed',
            'alerts': alerts,
            'alert_count': len(alerts),
            'thresholds_checked': thresholds,
            'check_duration': duration,
            'timestamp': start_time,
            'task_id': self.request.id
        }
        
        if alerts:
            logger.warning(
                "Alert conditions detected",
                alert_count=len(alerts),
                alerts=alerts,
                task_id=self.request.id
            )
        else:
            logger.info(
                "No alert conditions detected",
                duration=duration,
                task_id=self.request.id
            )
        
        return result
        
    except Exception as exc:
        logger.error(
            "Alert check failed",
            error=str(exc),
            task_id=self.request.id
        )
        raise exc
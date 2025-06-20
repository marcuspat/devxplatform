"""
Monitoring utilities for Celery workers
"""
import threading
import time
from typing import Optional
import structlog
from prometheus_client import start_http_server, CollectorRegistry, generate_latest
from prometheus_client import Counter, Histogram, Gauge, Info

from app.config import settings

logger = structlog.get_logger()

# Global registry for custom metrics
CUSTOM_REGISTRY = CollectorRegistry()

# Custom metrics
TASK_EXECUTION_TIME = Histogram(
    'celery_task_execution_seconds',
    'Time spent executing tasks',
    ['task_name', 'queue', 'status'],
    registry=CUSTOM_REGISTRY
)

TASK_RETRIES = Counter(
    'celery_task_retries_total',
    'Total number of task retries',
    ['task_name', 'queue'],
    registry=CUSTOM_REGISTRY
)

MEMORY_USAGE = Gauge(
    'celery_worker_memory_usage_bytes',
    'Worker memory usage in bytes',
    ['worker_id'],
    registry=CUSTOM_REGISTRY
)

CPU_USAGE = Gauge(
    'celery_worker_cpu_usage_percent',
    'Worker CPU usage percentage',
    ['worker_id'],
    registry=CUSTOM_REGISTRY
)

WORKER_INFO = Info(
    'celery_worker_info',
    'Information about the Celery worker',
    registry=CUSTOM_REGISTRY
)


class MetricsCollector:
    """Collects and updates worker metrics"""
    
    def __init__(self, worker_id: str = None):
        self.worker_id = worker_id or "unknown"
        self.running = False
        self.thread = None
        
        # Set worker info
        WORKER_INFO.info({
            'worker_id': self.worker_id,
            'service_name': settings.SERVICE_NAME,
            'environment': settings.ENVIRONMENT
        })
    
    def start(self):
        """Start metrics collection in background thread"""
        if self.running:
            return
        
        self.running = True
        self.thread = threading.Thread(target=self._collect_metrics, daemon=True)
        self.thread.start()
        
        logger.info(
            "Metrics collector started",
            worker_id=self.worker_id
        )
    
    def stop(self):
        """Stop metrics collection"""
        self.running = False
        if self.thread:
            self.thread.join(timeout=5)
        
        logger.info(
            "Metrics collector stopped",
            worker_id=self.worker_id
        )
    
    def _collect_metrics(self):
        """Collect system metrics periodically"""
        import psutil
        
        process = psutil.Process()
        
        while self.running:
            try:
                # Collect memory usage
                memory_info = process.memory_info()
                MEMORY_USAGE.labels(worker_id=self.worker_id).set(memory_info.rss)
                
                # Collect CPU usage
                cpu_percent = process.cpu_percent()
                CPU_USAGE.labels(worker_id=self.worker_id).set(cpu_percent)
                
                # Sleep for collection interval
                time.sleep(30)  # Collect every 30 seconds
                
            except Exception as e:
                logger.warning(
                    "Failed to collect system metrics",
                    error=str(e),
                    worker_id=self.worker_id
                )
                time.sleep(30)


def setup_prometheus_server(port: int = None) -> bool:
    """
    Start Prometheus metrics HTTP server
    
    Args:
        port: Port to run the server on
    
    Returns:
        True if server started successfully, False otherwise
    """
    try:
        metrics_port = port or settings.PROMETHEUS_PORT
        
        # Start HTTP server for metrics
        start_http_server(metrics_port, registry=CUSTOM_REGISTRY)
        
        logger.info(
            "Prometheus metrics server started",
            port=metrics_port
        )
        
        return True
        
    except Exception as e:
        logger.error(
            "Failed to start Prometheus server",
            port=metrics_port,
            error=str(e)
        )
        return False


def record_task_execution(
    task_name: str,
    queue: str,
    duration: float,
    status: str = 'success'
):
    """
    Record task execution metrics
    
    Args:
        task_name: Name of the task
        queue: Queue the task was executed from
        duration: Task execution duration in seconds
        status: Task execution status
    """
    TASK_EXECUTION_TIME.labels(
        task_name=task_name,
        queue=queue,
        status=status
    ).observe(duration)


def record_task_retry(task_name: str, queue: str):
    """
    Record task retry event
    
    Args:
        task_name: Name of the task
        queue: Queue the task was executed from
    """
    TASK_RETRIES.labels(
        task_name=task_name,
        queue=queue
    ).inc()


class TaskMetricsMiddleware:
    """Middleware to automatically collect task metrics"""
    
    def __init__(self):
        self.start_times = {}
    
    def on_task_prerun(self, sender=None, task_id=None, task=None, args=None, kwargs=None, **kwds):
        """Record task start time"""
        self.start_times[task_id] = time.time()
    
    def on_task_postrun(
        self,
        sender=None,
        task_id=None,
        task=None,
        args=None,
        kwargs=None,
        retval=None,
        state=None,
        **kwds
    ):
        """Record task completion metrics"""
        start_time = self.start_times.pop(task_id, None)
        if start_time:
            duration = time.time() - start_time
            
            # Determine queue from task routing
            queue = getattr(task, 'queue', 'default')
            
            # Determine status
            status = 'success' if state == 'SUCCESS' else 'failure'
            
            record_task_execution(
                task_name=task.name,
                queue=queue,
                duration=duration,
                status=status
            )
    
    def on_task_retry(self, sender=None, task_id=None, reason=None, einfo=None, **kwds):
        """Record task retry event"""
        queue = getattr(sender, 'queue', 'default')
        record_task_retry(
            task_name=sender.name,
            queue=queue
        )


# Global metrics middleware instance
metrics_middleware = TaskMetricsMiddleware()


def get_metrics_data() -> str:
    """
    Get current metrics data in Prometheus format
    
    Returns:
        Metrics data as string
    """
    return generate_latest(CUSTOM_REGISTRY).decode('utf-8')


def create_custom_metric(
    metric_type: str,
    name: str,
    description: str,
    labels: list = None
):
    """
    Create a custom metric
    
    Args:
        metric_type: Type of metric ('counter', 'gauge', 'histogram')
        name: Metric name
        description: Metric description
        labels: List of label names
    
    Returns:
        Metric instance
    """
    labels = labels or []
    
    if metric_type == 'counter':
        return Counter(name, description, labels, registry=CUSTOM_REGISTRY)
    elif metric_type == 'gauge':
        return Gauge(name, description, labels, registry=CUSTOM_REGISTRY)
    elif metric_type == 'histogram':
        return Histogram(name, description, labels, registry=CUSTOM_REGISTRY)
    else:
        raise ValueError(f"Unknown metric type: {metric_type}")


class HealthChecker:
    """Health check utility for monitoring endpoints"""
    
    def __init__(self):
        self.checks = {}
    
    def add_check(self, name: str, check_func, timeout: int = 30):
        """
        Add a health check
        
        Args:
            name: Name of the health check
            check_func: Function that returns True if healthy
            timeout: Timeout for the check in seconds
        """
        self.checks[name] = {
            'func': check_func,
            'timeout': timeout
        }
    
    def run_checks(self) -> dict:
        """
        Run all health checks
        
        Returns:
            Dictionary with check results
        """
        results = {
            'status': 'healthy',
            'checks': {},
            'timestamp': time.time()
        }
        
        for name, check_config in self.checks.items():
            try:
                # Run check with timeout
                check_func = check_config['func']
                timeout = check_config['timeout']
                
                # Simple timeout implementation
                start_time = time.time()
                is_healthy = check_func()
                duration = time.time() - start_time
                
                if duration > timeout:
                    results['checks'][name] = {
                        'status': 'timeout',
                        'duration': duration
                    }
                    results['status'] = 'degraded'
                else:
                    results['checks'][name] = {
                        'status': 'healthy' if is_healthy else 'unhealthy',
                        'duration': duration
                    }
                    if not is_healthy:
                        results['status'] = 'degraded'
            
            except Exception as e:
                results['checks'][name] = {
                    'status': 'error',
                    'error': str(e)
                }
                results['status'] = 'degraded'
        
        return results


# Global health checker instance
health_checker = HealthChecker()
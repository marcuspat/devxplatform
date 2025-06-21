"""
Data processing Celery tasks
"""
import time
import json
from typing import Dict, List, Any, Optional
import structlog
import httpx
import boto3
from botocore.exceptions import ClientError

from app.celery_app import celery
from app.config import settings
from app.utils.retry import exponential_backoff

logger = structlog.get_logger()


@celery.task(
    bind=True,
    name='app.tasks.processing.process_data',
    queue='processing',
    rate_limit='50/m',
    max_retries=settings.TASK_MAX_RETRIES,
    soft_time_limit=1800,  # 30 minutes
    time_limit=2400  # 40 minutes
)
def process_data(
    self,
    data: Dict[str, Any],
    processing_type: str = 'default',
    options: Optional[Dict] = None
) -> Dict:
    """
    Process data with configurable processing type
    
    Args:
        data: Data to process
        processing_type: Type of processing to perform
        options: Additional processing options
    
    Returns:
        Dict with processing results
    """
    try:
        logger.info(
            "Starting data processing",
            processing_type=processing_type,
            data_size=len(str(data)),
            task_id=self.request.id
        )
        
        start_time = time.time()
        options = options or {}
        
        # Update task progress
        self.update_state(
            state='PROGRESS',
            meta={'status': 'Starting processing', 'progress': 0}
        )
        
        processed_data = {}
        
        if processing_type == 'transform':
            processed_data = _transform_data(data, options)
        elif processing_type == 'validate':
            processed_data = _validate_data(data, options)
        elif processing_type == 'enrich':
            processed_data = _enrich_data(data, options)
        elif processing_type == 'aggregate':
            processed_data = _aggregate_data(data, options)
        else:
            # Default processing
            processed_data = _default_process(data, options)
        
        # Update task progress
        self.update_state(
            state='PROGRESS',
            meta={'status': 'Processing complete', 'progress': 100}
        )
        
        duration = time.time() - start_time
        
        logger.info(
            "Data processing completed",
            processing_type=processing_type,
            duration=duration,
            task_id=self.request.id
        )
        
        return {
            'status': 'success',
            'processing_type': processing_type,
            'duration': duration,
            'processed_data': processed_data,
            'task_id': self.request.id
        }
        
    except Exception as exc:
        logger.error(
            "Data processing failed",
            processing_type=processing_type,
            error=str(exc),
            task_id=self.request.id
        )
        
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            retry_delay = exponential_backoff(
                self.request.retries,
                base_delay=settings.TASK_RETRY_DELAY,
                max_delay=settings.TASK_RETRY_BACKOFF_MAX
            )
            raise self.retry(countdown=retry_delay, exc=exc)
        
        raise exc


@celery.task(
    bind=True,
    name='app.tasks.processing.batch_process_data',
    queue='processing',
    rate_limit='10/m',
    max_retries=2,
    soft_time_limit=3600,  # 1 hour
    time_limit=4500  # 75 minutes
)
def batch_process_data(
    self,
    data_batch: List[Dict[str, Any]],
    processing_type: str = 'default',
    batch_size: int = 100,
    parallel: bool = False
) -> Dict:
    """
    Process a batch of data items
    
    Args:
        data_batch: List of data items to process
        processing_type: Type of processing to perform
        batch_size: Size of each processing batch
        parallel: Whether to process items in parallel
    
    Returns:
        Dict with batch processing results
    """
    try:
        logger.info(
            "Starting batch processing",
            batch_count=len(data_batch),
            processing_type=processing_type,
            batch_size=batch_size,
            parallel=parallel,
            task_id=self.request.id
        )
        
        start_time = time.time()
        results = {
            'total': len(data_batch),
            'processed': 0,
            'failed': 0,
            'results': [],
            'task_id': self.request.id
        }
        
        # Process in batches
        for i in range(0, len(data_batch), batch_size):
            batch = data_batch[i:i + batch_size]
            
            # Update progress
            progress = int((i / len(data_batch)) * 100)
            self.update_state(
                state='PROGRESS',
                meta={
                    'status': f'Processing batch {i // batch_size + 1}',
                    'progress': progress,
                    'processed': results['processed'],
                    'failed': results['failed']
                }
            )
            
            logger.info(
                "Processing batch",
                batch_number=i // batch_size + 1,
                batch_size=len(batch),
                task_id=self.request.id
            )
            
            if parallel and settings.FEATURE_ASYNC_PROCESSING:
                # Process items in parallel using subtasks
                batch_results = _process_batch_parallel(batch, processing_type)
            else:
                # Process items sequentially
                batch_results = _process_batch_sequential(batch, processing_type)
            
            # Aggregate results
            for result in batch_results:
                if result.get('status') == 'success':
                    results['processed'] += 1
                else:
                    results['failed'] += 1
                results['results'].append(result)
        
        duration = time.time() - start_time
        
        logger.info(
            "Batch processing completed",
            results=results,
            duration=duration,
            task_id=self.request.id
        )
        
        results['duration'] = duration
        results['status'] = 'completed'
        
        return results
        
    except Exception as exc:
        logger.error(
            "Batch processing failed",
            error=str(exc),
            task_id=self.request.id
        )
        raise exc


@celery.task(
    bind=True,
    name='app.tasks.processing.fetch_and_process',
    queue='processing',
    rate_limit='20/m'
)
def fetch_and_process(
    self,
    url: str,
    processing_type: str = 'default',
    headers: Optional[Dict] = None
) -> Dict:
    """
    Fetch data from URL and process it
    
    Args:
        url: URL to fetch data from
        processing_type: Type of processing to perform
        headers: HTTP headers for the request
    
    Returns:
        Dict with fetch and processing results
    """
    try:
        logger.info(
            "Fetching and processing data",
            url=url,
            processing_type=processing_type,
            task_id=self.request.id
        )
        
        # Fetch data
        with httpx.Client() as client:
            response = client.get(url, headers=headers or {})
            response.raise_for_status()
            
            if response.headers.get('content-type', '').startswith('application/json'):
                data = response.json()
            else:
                data = {'content': response.text}
        
        # Process the fetched data
        result = process_data.delay(data, processing_type)
        
        return {
            'status': 'success',
            'url': url,
            'processing_task_id': result.id,
            'task_id': self.request.id
        }
        
    except Exception as exc:
        logger.error(
            "Fetch and process failed",
            url=url,
            error=str(exc),
            task_id=self.request.id
        )
        raise exc


# Helper functions
def _transform_data(data: Dict, options: Dict) -> Dict:
    """Transform data based on options"""
    # Implement transformation logic
    transformed = {
        'original': data,
        'transformed': True,
        'options_applied': options
    }
    return transformed


def _validate_data(data: Dict, options: Dict) -> Dict:
    """Validate data based on options"""
    # Implement validation logic
    validation_result = {
        'valid': True,
        'errors': [],
        'data': data
    }
    return validation_result


def _enrich_data(data: Dict, options: Dict) -> Dict:
    """Enrich data with additional information"""
    # Implement enrichment logic
    enriched = {
        **data,
        'enriched': True,
        'enrichment_timestamp': time.time()
    }
    return enriched


def _aggregate_data(data: Dict, options: Dict) -> Dict:
    """Aggregate data based on options"""
    # Implement aggregation logic
    aggregated = {
        'count': len(data) if isinstance(data, (list, dict)) else 1,
        'data': data,
        'aggregated': True
    }
    return aggregated


def _default_process(data: Dict, options: Dict) -> Dict:
    """Default data processing"""
    return {
        'processed': True,
        'data': data,
        'options': options,
        'timestamp': time.time()
    }


def _process_batch_parallel(batch: List[Dict], processing_type: str) -> List[Dict]:
    """Process batch items in parallel"""
    # Create subtasks for parallel processing
    tasks = []
    for item in batch:
        task = process_data.delay(item, processing_type)
        tasks.append(task)
    
    # Wait for all tasks to complete
    results = []
    for task in tasks:
        try:
            result = task.get(timeout=300)  # 5 minute timeout
            results.append(result)
        except Exception as e:
            results.append({
                'status': 'failed',
                'error': str(e),
                'task_id': task.id
            })
    
    return results


def _process_batch_sequential(batch: List[Dict], processing_type: str) -> List[Dict]:
    """Process batch items sequentially"""
    results = []
    for item in batch:
        try:
            # Process item directly (synchronously)
            if processing_type == 'transform':
                result = _transform_data(item, {})
            elif processing_type == 'validate':
                result = _validate_data(item, {})
            else:
                result = _default_process(item, {})
            
            results.append({
                'status': 'success',
                'data': result
            })
        except Exception as e:
            results.append({
                'status': 'failed',
                'error': str(e)
            })
    
    return results
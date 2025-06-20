"""
Test configuration for Celery tests
"""
import pytest
from celery import Celery
from app.config import settings


@pytest.fixture
def celery_app():
    """Create a Celery app for testing"""
    app = Celery('test_worker')
    
    # Use memory transport for testing
    app.conf.update(
        broker_url='memory://',
        result_backend='cache+memory://',
        task_always_eager=True,
        task_eager_propagates=True,
        task_store_eager_result=True
    )
    
    return app


@pytest.fixture
def celery_worker(celery_app):
    """Create a Celery worker for testing"""
    from celery.contrib.testing.worker import start_worker
    
    with start_worker(celery_app) as worker:
        yield worker


@pytest.fixture
def sample_data():
    """Sample data for testing"""
    return {
        'id': 1,
        'name': 'Test Item',
        'value': 42,
        'tags': ['test', 'sample', 'data']
    }
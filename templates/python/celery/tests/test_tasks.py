"""
Tests for Celery tasks
"""
import pytest
from unittest.mock import patch, MagicMock

from app.tasks.processing import process_data, batch_process_data
from app.tasks.email import send_email
from app.tasks.monitoring import health_check, update_queue_metrics


def test_process_data_default(sample_data):
    """Test default data processing"""
    result = process_data(
        data=sample_data,
        processing_type='default'
    )
    
    assert result['status'] == 'success'
    assert result['processing_type'] == 'default'
    assert 'processed_data' in result
    assert 'duration' in result


def test_process_data_transform(sample_data):
    """Test data transformation"""
    result = process_data(
        data=sample_data,
        processing_type='transform'
    )
    
    assert result['status'] == 'success'
    assert result['processing_type'] == 'transform'
    assert result['processed_data']['transformed'] is True


def test_process_data_validate(sample_data):
    """Test data validation"""
    result = process_data(
        data=sample_data,
        processing_type='validate'
    )
    
    assert result['status'] == 'success'
    assert result['processing_type'] == 'validate'
    assert result['processed_data']['valid'] is True


def test_batch_process_data(sample_data):
    """Test batch data processing"""
    batch_data = [sample_data.copy() for _ in range(5)]
    
    result = batch_process_data(
        data_batch=batch_data,
        processing_type='default',
        batch_size=2
    )
    
    assert result['status'] == 'completed'
    assert result['total'] == 5
    assert result['processed'] == 5
    assert result['failed'] == 0


@patch('app.tasks.email.smtplib.SMTP')
def test_send_email(mock_smtp, celery_app):
    """Test email sending task"""
    # Mock SMTP server
    mock_server = MagicMock()
    mock_smtp.return_value.__enter__.return_value = mock_server
    
    result = send_email(
        to_email='test@example.com',
        subject='Test Subject',
        body='Test body content'
    )
    
    assert result['status'] == 'success'
    assert result['to_email'] == 'test@example.com'
    assert result['subject'] == 'Test Subject'
    
    # Verify SMTP was called
    mock_smtp.assert_called_once()
    mock_server.send_message.assert_called_once()


def test_health_check():
    """Test health check task"""
    result = health_check()
    
    assert 'status' in result
    assert 'timestamp' in result
    assert 'service' in result
    assert result['service'] == 'celery-worker'


@patch('app.tasks.monitoring.current_app.control.inspect')
def test_update_queue_metrics(mock_inspect):
    """Test queue metrics update"""
    # Mock inspect response
    mock_inspect.return_value.active_queues.return_value = {
        'worker1': [{'name': 'default'}, {'name': 'email'}]
    }
    
    with patch('redis.from_url') as mock_redis:
        mock_redis.return_value.llen.return_value = 5
        
        result = update_queue_metrics()
        
        assert result['status'] == 'success'
        assert 'metrics' in result
        assert 'timestamp' in result


def test_invalid_processing_type(sample_data):
    """Test processing with invalid type falls back to default"""
    result = process_data(
        data=sample_data,
        processing_type='invalid_type'
    )
    
    # Should fall back to default processing
    assert result['status'] == 'success'
    assert result['processed_data']['processed'] is True


@pytest.mark.parametrize("processing_type", [
    'transform',
    'validate',
    'enrich',
    'aggregate',
    'default'
])
def test_all_processing_types(sample_data, processing_type):
    """Test all processing types"""
    result = process_data(
        data=sample_data,
        processing_type=processing_type
    )
    
    assert result['status'] == 'success'
    assert result['processing_type'] == processing_type
    assert 'processed_data' in result
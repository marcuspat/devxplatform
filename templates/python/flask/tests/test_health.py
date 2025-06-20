"""
Test health endpoints
"""


def test_health_check(test_client):
    """Test basic health check"""
    response = test_client.get('/api/health')
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'healthy'
    assert data['service'] == 'flask-service'
    assert data['version'] == '1.0.0'


def test_detailed_health_check(test_client):
    """Test detailed health check"""
    response = test_client.get('/api/health/detailed')
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] in ['healthy', 'degraded']
    assert 'checks' in data
    assert data['checks']['api'] == 'healthy'


def test_readiness_check(test_client):
    """Test readiness check"""
    response = test_client.get('/api/ready')
    
    assert response.status_code == 200
    data = response.get_json()
    assert data['status'] == 'ready'
    assert data['service'] == 'flask-service'
"""
Test configuration and fixtures
"""
import os
import sys

# Add the parent directory to sys.path so we can import the app module
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from app import create_app, db
from app.models import User
from app.config import TestingConfig


@pytest.fixture(scope='module')
def test_app():
    """Create application for testing"""
    app = create_app(TestingConfig)
    
    with app.app_context():
        # Create test database
        db.create_all()
        
        yield app
        
        # Clean up
        db.session.remove()
        db.drop_all()


@pytest.fixture(scope='module')
def test_client(test_app):
    """Create test client"""
    return test_app.test_client()


@pytest.fixture(scope='function')
def init_database():
    """Initialize database with test data"""
    # Create test user
    user = User(
        email='test@example.com',
        username='testuser',
        full_name='Test User'
    )
    user.set_password('testpassword')
    
    admin = User(
        email='admin@example.com',
        username='admin',
        full_name='Admin User',
        is_admin=True
    )
    admin.set_password('adminpassword')
    
    db.session.add(user)
    db.session.add(admin)
    db.session.commit()
    
    yield db
    
    # Clean up
    db.session.query(User).delete()
    db.session.commit()


@pytest.fixture(scope='function')
def auth_headers(test_client, init_database):
    """Get authentication headers"""
    response = test_client.post('/api/v1/auth/login', json={
        'username': 'testuser',
        'password': 'testpassword'
    })
    
    tokens = response.get_json()['tokens']
    return {
        'Authorization': f"Bearer {tokens['access_token']}"
    }


@pytest.fixture(scope='function')
def admin_headers(test_client, init_database):
    """Get admin authentication headers"""
    response = test_client.post('/api/v1/auth/login', json={
        'username': 'admin',
        'password': 'adminpassword'
    })
    
    tokens = response.get_json()['tokens']
    return {
        'Authorization': f"Bearer {tokens['access_token']}"
    }
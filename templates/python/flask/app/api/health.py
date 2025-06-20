"""
Health check endpoints
"""
from flask import Blueprint, jsonify, current_app
from sqlalchemy import text

from app import db, cache
from app.config import Config

health_bp = Blueprint('health', __name__)


@health_bp.route('/health')
def health_check():
    """Basic health check"""
    return jsonify({
        'status': 'healthy',
        'service': Config.SERVICE_NAME,
        'version': '1.0.0'
    })


@health_bp.route('/health/detailed')
def detailed_health_check():
    """Detailed health check with dependencies"""
    health_status = {
        'status': 'healthy',
        'service': Config.SERVICE_NAME,
        'checks': {
            'api': 'healthy',
            'database': 'unknown',
            'redis': 'unknown'
        }
    }
    
    # Check database
    try:
        db.session.execute(text('SELECT 1'))
        health_status['checks']['database'] = 'healthy'
    except Exception as e:
        health_status['checks']['database'] = 'unhealthy'
        health_status['status'] = 'degraded'
        current_app.logger.error(f"Database health check failed: {e}")
    
    # Check Redis/Cache
    try:
        cache.get('health_check')
        cache.set('health_check', 'ok', timeout=10)
        health_status['checks']['redis'] = 'healthy'
    except Exception as e:
        health_status['checks']['redis'] = 'unhealthy'
        health_status['status'] = 'degraded'
        current_app.logger.error(f"Redis health check failed: {e}")
    
    return jsonify(health_status)


@health_bp.route('/ready')
def readiness_check():
    """Readiness check"""
    # Add any startup checks here
    return jsonify({
        'status': 'ready',
        'service': Config.SERVICE_NAME
    })
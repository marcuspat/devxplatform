"""
Flask application factory
"""
import structlog
from flask import Flask, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_caching import Cache
from prometheus_flask_exporter import PrometheusMetrics

from app.config import Config
from app.exceptions import APIException

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
cache = Cache()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"]
)

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


def create_app(config_name=None):
    """Create Flask application"""
    app = Flask(__name__)
    
    # Load configuration
    if config_name is None:
        app.config.from_object(Config)
    else:
        app.config.from_object(config_name)
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, origins=app.config.get('CORS_ORIGINS', '*'))
    cache.init_app(app)
    limiter.init_app(app)
    
    # Initialize Prometheus metrics
    metrics = PrometheusMetrics(app)
    metrics.info('flask_app_info', 'Application info', version='1.0.0')
    
    # Register error handlers
    register_error_handlers(app)
    
    # Register blueprints
    register_blueprints(app)
    
    # Register CLI commands
    register_commands(app)
    
    # Log startup
    logger.info("Flask application created", 
                service=app.config.get('SERVICE_NAME', 'flask-service'))
    
    return app


def register_error_handlers(app):
    """Register error handlers"""
    
    @app.errorhandler(APIException)
    def handle_api_exception(error):
        """Handle custom API exceptions"""
        response = {
            'error': error.message,
            'code': error.code,
            'details': error.details
        }
        return jsonify(response), error.status_code
    
    @app.errorhandler(404)
    def handle_not_found(error):
        """Handle 404 errors"""
        return jsonify({
            'error': 'Resource not found',
            'code': 'NOT_FOUND'
        }), 404
    
    @app.errorhandler(500)
    def handle_internal_error(error):
        """Handle 500 errors"""
        logger.exception("Internal server error")
        return jsonify({
            'error': 'Internal server error',
            'code': 'INTERNAL_ERROR'
        }), 500
    
    @app.errorhandler(429)
    def handle_rate_limit(error):
        """Handle rate limit errors"""
        return jsonify({
            'error': 'Rate limit exceeded',
            'code': 'RATE_LIMIT_EXCEEDED',
            'details': {
                'retry_after': error.description
            }
        }), 429


def register_blueprints(app):
    """Register Flask blueprints"""
    from app.api.health import health_bp
    from app.api.auth import auth_bp
    from app.api.users import users_bp
    
    app.register_blueprint(health_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api/v1/auth')
    app.register_blueprint(users_bp, url_prefix='/api/v1/users')


def register_commands(app):
    """Register CLI commands"""
    
    @app.cli.command()
    def init_db():
        """Initialize the database"""
        db.create_all()
        logger.info("Database initialized")
    
    @app.cli.command()
    def seed_db():
        """Seed the database with sample data"""
        from app.utils.seed import seed_database
        seed_database()
        logger.info("Database seeded")
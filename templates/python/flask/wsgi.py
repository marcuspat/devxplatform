"""
WSGI entry point for production deployment
"""
import os
from app import create_app

# Get configuration name from environment
config_name = os.getenv('FLASK_CONFIG', 'production')

# Create application
application = create_app(config_name)

if __name__ == '__main__':
    application.run()
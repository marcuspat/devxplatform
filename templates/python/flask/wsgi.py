"""
WSGI entry point for production deployment
"""
import os
import sys

# Ensure the app module can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app

# Get configuration name from environment
config_name = os.getenv('FLASK_CONFIG', 'production')

# Create application
application = create_app(config_name)

if __name__ == '__main__':
    application.run()
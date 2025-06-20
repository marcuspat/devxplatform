"""
Flask application entry point
"""
import os
from app import create_app, db
from app.models import User

# Get configuration name from environment
config_name = os.getenv('FLASK_CONFIG', 'default')

# Create application
app = create_app(config_name)

# Create shell context
@app.shell_context_processor
def make_shell_context():
    """Make database models available in flask shell"""
    return {
        'db': db,
        'User': User
    }


if __name__ == '__main__':
    app.run(
        host=os.getenv('HOST', '0.0.0.0'),
        port=int(os.getenv('PORT', 5000)),
        debug=app.config.get('DEBUG', False)
    )
#!/usr/bin/env python3
"""Test script to identify import issues in Flask template"""

import sys
import os

# Add the directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Testing Flask template imports...")
print("=" * 50)

# Test basic imports
try:
    print("Testing: from app import create_app, db")
    from app import create_app, db
    print("✓ SUCCESS: app (create_app, db)")
except Exception as e:
    print(f"✗ ERROR: app - {e}")

try:
    print("\nTesting: from app.models import User")
    from app.models import User
    print("✓ SUCCESS: app.models.User")
except Exception as e:
    print(f"✗ ERROR: app.models.User - {e}")

try:
    print("\nTesting: from app.config import Config")
    from app.config import Config
    print("✓ SUCCESS: app.config")
except Exception as e:
    print(f"✗ ERROR: app.config - {e}")

try:
    print("\nTesting: from app.exceptions import APIException")
    from app.exceptions import APIException
    print("✓ SUCCESS: app.exceptions")
except Exception as e:
    print(f"✗ ERROR: app.exceptions - {e}")

# Test API imports
try:
    print("\nTesting: from app.api.health import health_bp")
    from app.api.health import health_bp
    print("✓ SUCCESS: app.api.health")
except Exception as e:
    print(f"✗ ERROR: app.api.health - {e}")

try:
    print("\nTesting: from app.api.auth import auth_bp")
    from app.api.auth import auth_bp
    print("✓ SUCCESS: app.api.auth")
except Exception as e:
    print(f"✗ ERROR: app.api.auth - {e}")

try:
    print("\nTesting: from app.api.users import users_bp")
    from app.api.users import users_bp
    print("✓ SUCCESS: app.api.users")
except Exception as e:
    print(f"✗ ERROR: app.api.users - {e}")

print("\n" + "=" * 50)
print("Import test complete!")
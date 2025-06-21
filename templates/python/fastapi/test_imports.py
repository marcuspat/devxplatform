#!/usr/bin/env python3
"""Test script to identify import issues in FastAPI template"""

import sys
import os

# Add the directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Testing FastAPI template imports...")
print("=" * 50)

# Test basic imports
try:
    print("Testing: from app.config import settings")
    from app.config import settings
    print("✓ SUCCESS: app.config")
except Exception as e:
    print(f"✗ ERROR: app.config - {e}")

try:
    print("\nTesting: from app.database import init_db, close_db_connections")
    from app.database import init_db, close_db_connections
    print("✓ SUCCESS: app.database")
except Exception as e:
    print(f"✗ ERROR: app.database - {e}")

try:
    print("\nTesting: from app.exceptions import ServiceException")
    from app.exceptions import ServiceException
    print("✓ SUCCESS: app.exceptions")
except Exception as e:
    print(f"✗ ERROR: app.exceptions - {e}")

try:
    print("\nTesting: from app.middleware import LoggingMiddleware, TimingMiddleware")
    from app.middleware import LoggingMiddleware, TimingMiddleware
    print("✓ SUCCESS: app.middleware")
except Exception as e:
    print(f"✗ ERROR: app.middleware - {e}")

try:
    print("\nTesting: from app.redis import init_redis_pool, close_redis_pool")
    from app.redis import init_redis_pool, close_redis_pool
    print("✓ SUCCESS: app.redis")
except Exception as e:
    print(f"✗ ERROR: app.redis - {e}")

try:
    print("\nTesting: from app.api import router")
    from app.api import router
    print("✓ SUCCESS: app.api")
except Exception as e:
    print(f"✗ ERROR: app.api - {e}")

# Test API v1 imports
try:
    print("\nTesting: from app.api.v1 import auth, health, users")
    from app.api.v1 import auth, health, users
    print("✓ SUCCESS: app.api.v1 modules")
except Exception as e:
    print(f"✗ ERROR: app.api.v1 modules - {e}")

print("\n" + "=" * 50)
print("Import test complete!")
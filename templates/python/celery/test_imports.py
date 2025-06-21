#!/usr/bin/env python3
"""Test script to identify import issues in Celery template"""

import sys
import os

# Add the directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("Testing Celery template imports...")
print("=" * 50)

# Test basic imports
try:
    print("Testing: from app.celery_app import celery")
    from app.celery_app import celery
    print("✓ SUCCESS: app.celery_app")
except Exception as e:
    print(f"✗ ERROR: app.celery_app - {e}")

try:
    print("\nTesting: from app.config import settings")
    from app.config import settings
    print("✓ SUCCESS: app.config")
except Exception as e:
    print(f"✗ ERROR: app.config - {e}")

try:
    print("\nTesting: from app.utils.monitoring import setup_prometheus_server, MetricsCollector")
    from app.utils.monitoring import setup_prometheus_server, MetricsCollector
    print("✓ SUCCESS: app.utils.monitoring")
except Exception as e:
    print(f"✗ ERROR: app.utils.monitoring - {e}")

try:
    print("\nTesting: from app.tasks import email, maintenance, monitoring, processing")
    from app.tasks import email, maintenance, monitoring, processing
    print("✓ SUCCESS: app.tasks modules")
except Exception as e:
    print(f"✗ ERROR: app.tasks modules - {e}")

try:
    print("\nTesting: from app.utils.retry import RetryHandler")
    from app.utils.retry import RetryHandler
    print("✓ SUCCESS: app.utils.retry")
except Exception as e:
    print(f"✗ ERROR: app.utils.retry - {e}")

print("\n" + "=" * 50)
print("Import test complete!")
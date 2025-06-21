"""
API router configuration
"""

from fastapi import APIRouter

from .v1 import auth, health, users

# Create main API router
router = APIRouter()

# Include v1 routers
router.include_router(health.router, tags=["health"])
router.include_router(auth.router, prefix="/auth", tags=["auth"])
router.include_router(users.router, prefix="/users", tags=["users"])

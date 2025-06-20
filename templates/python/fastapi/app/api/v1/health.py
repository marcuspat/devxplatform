"""
Health check endpoints
"""
from typing import Dict

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.redis import get_redis

router = APIRouter()


@router.get("/health", response_model=Dict[str, str])
async def health_check():
    """Basic health check endpoint"""
    return {"status": "healthy"}


@router.get("/health/detailed")
async def detailed_health_check(
    db: AsyncSession = Depends(get_db)
):
    """Detailed health check with dependency status"""
    health_status = {
        "status": "healthy",
        "checks": {
            "api": "healthy",
            "database": "unknown",
            "redis": "unknown"
        }
    }
    
    # Check database
    try:
        await db.execute("SELECT 1")
        health_status["checks"]["database"] = "healthy"
    except Exception as e:
        health_status["checks"]["database"] = "unhealthy"
        health_status["status"] = "degraded"
    
    # Check Redis
    try:
        redis = await get_redis()
        await redis.ping()
        health_status["checks"]["redis"] = "healthy"
    except Exception as e:
        health_status["checks"]["redis"] = "unhealthy"
        health_status["status"] = "degraded"
    
    return health_status
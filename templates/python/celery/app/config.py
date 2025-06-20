"""
Celery worker configuration
"""
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support"""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False
    )
    
    # Service configuration
    SERVICE_NAME: str = "celery-worker"
    ENVIRONMENT: str = Field("development", pattern="^(development|staging|production)$")
    
    # Celery configuration
    CELERY_BROKER_URL: str = Field("redis://localhost:6379/0")
    CELERY_RESULT_BACKEND: str = Field("redis://localhost:6379/1")
    CELERY_TASK_TIME_LIMIT: int = 3600  # 1 hour hard limit
    CELERY_TASK_SOFT_TIME_LIMIT: int = 3300  # 55 minutes soft limit
    CELERY_RESULT_EXPIRES: int = 86400  # 24 hours
    CELERY_WORKER_PREFETCH_MULTIPLIER: int = 4
    CELERY_WORKER_MAX_TASKS_PER_CHILD: int = 1000
    
    # Database configuration (for task results/state)
    DATABASE_URL: Optional[str] = Field(
        "postgresql://user:password@localhost:5432/celery_db"
    )
    
    # Redis configuration
    REDIS_URL: str = Field("redis://localhost:6379/2")
    REDIS_POOL_SIZE: int = 10
    
    # AWS configuration (for S3, SQS, etc.)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    AWS_S3_BUCKET: Optional[str] = None
    
    # Monitoring
    SENTRY_DSN: Optional[str] = None
    SENTRY_TRACES_SAMPLE_RATE: float = 0.1
    PROMETHEUS_PORT: int = 9090
    
    # Logging
    LOG_LEVEL: str = Field("INFO", pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    
    # Task specific settings
    EMAIL_BACKEND: str = "smtp"
    EMAIL_HOST: str = "localhost"
    EMAIL_PORT: int = 587
    EMAIL_USE_TLS: bool = True
    EMAIL_HOST_USER: Optional[str] = None
    EMAIL_HOST_PASSWORD: Optional[str] = None
    EMAIL_FROM: str = "noreply@example.com"
    
    # Rate limiting
    TASK_RATE_LIMIT: str = "100/m"  # 100 tasks per minute
    
    # Retry settings
    TASK_MAX_RETRIES: int = 3
    TASK_RETRY_DELAY: int = 60  # seconds
    TASK_RETRY_BACKOFF: bool = True
    TASK_RETRY_BACKOFF_MAX: int = 600  # 10 minutes
    
    # Feature flags
    FEATURE_ASYNC_PROCESSING: bool = True
    FEATURE_BATCH_PROCESSING: bool = True
    FEATURE_PRIORITY_QUEUE: bool = True


settings = Settings()
"""
Application configuration using Pydantic settings
"""

from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support"""

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", case_sensitive=False
    )

    # Service configuration
    SERVICE_NAME: str = "fastapi-service"
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = Field(
        "development", pattern="^(development|staging|production)$"
    )

    # Server configuration
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 4

    # API configuration
    API_PREFIX: str = "/api/v1"
    ENABLE_DOCS: bool = True

    # CORS configuration
    ALLOWED_ORIGINS: List[str] = ["*"]

    # Database configuration
    DATABASE_URL: str = Field(
        "postgresql+asyncpg://user:password@localhost:5432/dbname"
    )
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 0
    DB_POOL_PRE_PING: bool = True
    DB_ECHO: bool = False

    # Redis configuration
    REDIS_URL: str = Field("redis://localhost:6379/0")
    REDIS_POOL_SIZE: int = 10
    REDIS_DECODE_RESPONSES: bool = True

    # Security configuration
    SECRET_KEY: str = Field("your-secret-key-here-minimum-32-chars", min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Logging configuration
    LOG_LEVEL: str = Field("INFO", pattern="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$")
    LOG_FORMAT: str = "json"

    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_REQUESTS: int = 100
    RATE_LIMIT_WINDOW: int = 60  # seconds

    # External service URLs
    EXTERNAL_API_URL: Optional[str] = None
    EXTERNAL_API_TIMEOUT: int = 30

    # Feature flags
    FEATURE_NEW_ALGORITHM: bool = False
    FEATURE_ENHANCED_LOGGING: bool = True

    @property
    def database_url_sync(self) -> str:
        """Get synchronous database URL"""
        return self.DATABASE_URL.replace("+asyncpg", "")


settings = Settings()  # type: ignore

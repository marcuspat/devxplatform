"""
Custom exceptions for the FastAPI service
"""
from typing import Any, Dict, Optional


class ServiceException(Exception):
    """Base exception for service errors"""
    
    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = "SERVICE_ERROR",
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationException(ServiceException):
    """Raised when validation fails"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=400,
            error_code="VALIDATION_ERROR",
            details=details
        )


class NotFoundException(ServiceException):
    """Raised when a resource is not found"""
    
    def __init__(self, resource: str, identifier: Any):
        super().__init__(
            message=f"{resource} not found",
            status_code=404,
            error_code="NOT_FOUND",
            details={"resource": resource, "identifier": str(identifier)}
        )


class ConflictException(ServiceException):
    """Raised when there's a conflict (e.g., duplicate resource)"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            status_code=409,
            error_code="CONFLICT",
            details=details
        )


class UnauthorizedException(ServiceException):
    """Raised when authentication fails"""
    
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            message=message,
            status_code=401,
            error_code="UNAUTHORIZED"
        )


class ForbiddenException(ServiceException):
    """Raised when user lacks permissions"""
    
    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            message=message,
            status_code=403,
            error_code="FORBIDDEN"
        )


class RateLimitException(ServiceException):
    """Raised when rate limit is exceeded"""
    
    def __init__(self, retry_after: int):
        super().__init__(
            message="Rate limit exceeded",
            status_code=429,
            error_code="RATE_LIMIT_EXCEEDED",
            details={"retry_after": retry_after}
        )


class ExternalServiceException(ServiceException):
    """Raised when external service call fails"""
    
    def __init__(self, service: str, message: str):
        super().__init__(
            message=f"External service error: {message}",
            status_code=502,
            error_code="EXTERNAL_SERVICE_ERROR",
            details={"service": service}
        )
"""
Custom exceptions for Flask application
"""


class APIException(Exception):
    """Base API exception"""
    status_code = 500
    code = 'API_ERROR'
    message = 'An error occurred'
    details = None
    
    def __init__(self, message=None, code=None, details=None, status_code=None):
        super().__init__()
        if message:
            self.message = message
        if code:
            self.code = code
        if details:
            self.details = details
        if status_code:
            self.status_code = status_code


class ValidationError(APIException):
    """Validation error exception"""
    status_code = 400
    code = 'VALIDATION_ERROR'
    message = 'Validation failed'


class NotFoundError(APIException):
    """Resource not found exception"""
    status_code = 404
    code = 'NOT_FOUND'
    message = 'Resource not found'
    
    def __init__(self, resource=None, identifier=None):
        super().__init__()
        if resource:
            self.message = f'{resource} not found'
            self.details = {'resource': resource}
            if identifier:
                self.details['identifier'] = str(identifier)


class ConflictError(APIException):
    """Resource conflict exception"""
    status_code = 409
    code = 'CONFLICT'
    message = 'Resource conflict'


class UnauthorizedError(APIException):
    """Unauthorized access exception"""
    status_code = 401
    code = 'UNAUTHORIZED'
    message = 'Unauthorized'


class ForbiddenError(APIException):
    """Forbidden access exception"""
    status_code = 403
    code = 'FORBIDDEN'
    message = 'Forbidden'


class ExternalServiceError(APIException):
    """External service error exception"""
    status_code = 502
    code = 'EXTERNAL_SERVICE_ERROR'
    message = 'External service error'
    
    def __init__(self, service=None, message=None):
        super().__init__()
        if service:
            self.details = {'service': service}
        if message:
            self.message = f'External service error: {message}'
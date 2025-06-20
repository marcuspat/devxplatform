"""
Timing middleware for performance monitoring
"""
import time
from typing import Callable

from fastapi import Request, Response
from prometheus_client import Histogram, Counter
from starlette.middleware.base import BaseHTTPMiddleware

# Prometheus metrics
REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint", "status"]
)

REQUEST_COUNT = Counter(
    "http_request_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"]
)


class TimingMiddleware(BaseHTTPMiddleware):
    """Middleware for request timing and metrics collection"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        # Skip metrics endpoint to avoid recursion
        if request.url.path == "/metrics":
            return await call_next(request)
        
        # Start timing
        start_time = time.time()
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Get endpoint path (use route pattern if available)
        endpoint = request.url.path
        if hasattr(request, "scope") and "route" in request.scope:
            route = request.scope["route"]
            if hasattr(route, "path"):
                endpoint = route.path
        
        # Record metrics
        REQUEST_DURATION.labels(
            method=request.method,
            endpoint=endpoint,
            status=response.status_code
        ).observe(duration)
        
        REQUEST_COUNT.labels(
            method=request.method,
            endpoint=endpoint,
            status=response.status_code
        ).inc()
        
        # Add timing header
        response.headers["X-Response-Time"] = f"{duration:.3f}"
        
        return response
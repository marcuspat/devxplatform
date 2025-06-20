"""
Retry and backoff utilities
"""
import random
import time
from typing import Union


def exponential_backoff(
    retry_count: int,
    base_delay: Union[int, float] = 1,
    max_delay: Union[int, float] = 300,
    backoff_factor: Union[int, float] = 2,
    jitter: bool = True
) -> Union[int, float]:
    """
    Calculate exponential backoff delay with optional jitter
    
    Args:
        retry_count: Current retry attempt (0-indexed)
        base_delay: Base delay in seconds
        max_delay: Maximum delay in seconds
        backoff_factor: Multiplicative factor for backoff
        jitter: Whether to add random jitter
    
    Returns:
        Delay in seconds
    """
    # Calculate exponential delay
    delay = base_delay * (backoff_factor ** retry_count)
    
    # Cap at max_delay
    delay = min(delay, max_delay)
    
    # Add jitter to prevent thundering herd
    if jitter:
        jitter_range = delay * 0.1  # 10% jitter
        delay += random.uniform(-jitter_range, jitter_range)
    
    # Ensure minimum delay
    delay = max(delay, base_delay)
    
    return delay


def calculate_retry_delay(
    retry_count: int,
    strategy: str = 'exponential',
    base_delay: Union[int, float] = 1,
    max_delay: Union[int, float] = 300,
    **kwargs
) -> Union[int, float]:
    """
    Calculate retry delay using different strategies
    
    Args:
        retry_count: Current retry attempt (0-indexed)
        strategy: Retry strategy ('exponential', 'linear', 'fixed')
        base_delay: Base delay in seconds
        max_delay: Maximum delay in seconds
        **kwargs: Additional strategy-specific parameters
    
    Returns:
        Delay in seconds
    """
    if strategy == 'exponential':
        return exponential_backoff(
            retry_count=retry_count,
            base_delay=base_delay,
            max_delay=max_delay,
            backoff_factor=kwargs.get('backoff_factor', 2),
            jitter=kwargs.get('jitter', True)
        )
    
    elif strategy == 'linear':
        delay = base_delay + (retry_count * kwargs.get('increment', base_delay))
        delay = min(delay, max_delay)
        
        if kwargs.get('jitter', True):
            jitter_range = delay * 0.1
            delay += random.uniform(-jitter_range, jitter_range)
        
        return max(delay, base_delay)
    
    elif strategy == 'fixed':
        return base_delay
    
    else:
        raise ValueError(f"Unknown retry strategy: {strategy}")


def should_retry(
    exception: Exception,
    retry_count: int,
    max_retries: int,
    retryable_exceptions: tuple = None
) -> bool:
    """
    Determine if a task should be retried based on exception and retry count
    
    Args:
        exception: The exception that occurred
        retry_count: Current retry count
        max_retries: Maximum number of retries allowed
        retryable_exceptions: Tuple of exception types that should trigger retry
    
    Returns:
        True if task should be retried, False otherwise
    """
    # Check retry count
    if retry_count >= max_retries:
        return False
    
    # If specific retryable exceptions are defined, check against them
    if retryable_exceptions:
        return isinstance(exception, retryable_exceptions)
    
    # Default: retry on most exceptions except for specific non-retryable ones
    non_retryable_exceptions = (
        ValueError,  # Bad input data
        TypeError,   # Programming errors
        KeyError,    # Missing required data
        # Add more based on your use case
    )
    
    return not isinstance(exception, non_retryable_exceptions)


class RetryManager:
    """
    Manager class for handling retry logic
    """
    
    def __init__(
        self,
        max_retries: int = 3,
        base_delay: Union[int, float] = 1,
        max_delay: Union[int, float] = 300,
        strategy: str = 'exponential',
        retryable_exceptions: tuple = None,
        **strategy_kwargs
    ):
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.strategy = strategy
        self.retryable_exceptions = retryable_exceptions
        self.strategy_kwargs = strategy_kwargs
    
    def get_delay(self, retry_count: int) -> Union[int, float]:
        """Get retry delay for given retry count"""
        return calculate_retry_delay(
            retry_count=retry_count,
            strategy=self.strategy,
            base_delay=self.base_delay,
            max_delay=self.max_delay,
            **self.strategy_kwargs
        )
    
    def should_retry(self, exception: Exception, retry_count: int) -> bool:
        """Check if exception should trigger a retry"""
        return should_retry(
            exception=exception,
            retry_count=retry_count,
            max_retries=self.max_retries,
            retryable_exceptions=self.retryable_exceptions
        )
    
    def execute_with_retry(self, func, *args, **kwargs):
        """
        Execute function with retry logic
        
        Args:
            func: Function to execute
            *args: Function arguments
            **kwargs: Function keyword arguments
        
        Returns:
            Function result
        
        Raises:
            Last exception if all retries are exhausted
        """
        retry_count = 0
        last_exception = None
        
        while retry_count <= self.max_retries:
            try:
                return func(*args, **kwargs)
            
            except Exception as e:
                last_exception = e
                
                if not self.should_retry(e, retry_count):
                    raise e
                
                if retry_count < self.max_retries:
                    delay = self.get_delay(retry_count)
                    time.sleep(delay)
                    retry_count += 1
                else:
                    break
        
        # All retries exhausted
        raise last_exception
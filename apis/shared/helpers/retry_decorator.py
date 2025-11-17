import functools
import asyncio
from typing import Callable, Any
from shared.utils.constants import N_RETRIES
from shared.errors.errors import BadLLMResponseError
from shared.providers.exceptions import ProviderError


def retry_on_llm_failure(max_retries: int = N_RETRIES):
    """
    Decorator that retries async functions when they raise BadLLMResponseError or ProviderError.
    
    Args:
        max_retries: Maximum number of retry attempts (default from constants.N_RETRIES)
    
    Usage:
        @retry_on_provider_or_llm_error()
        async def my_llm_function():
            # ... code that might raise BadLLMResponseError or ProviderError
            pass
    """
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        async def wrapper(*args: Any, **kwargs: Any) -> Any:
            last_exception = None
            
            for attempt in range(max_retries):
                try:
                    return await func(*args, **kwargs)
                except (BadLLMResponseError, ProviderError) as e:
                    last_exception = e
                    if attempt < max_retries - 1:
                        print(f"LLM call failed on attempt {attempt + 1}/{max_retries}: {e}. Retrying...")
                        # Optional: add exponential backoff
                        await asyncio.sleep(0.5 * (2 ** attempt)) # Exponential backoff
                    else:
                        print(f"LLM call failed on final attempt {attempt + 1}/{max_retries}: {e}. Giving up.")
            
            # If all retries failed, raise the last exception
            if last_exception:
                raise last_exception
        
        return wrapper
    return decorator

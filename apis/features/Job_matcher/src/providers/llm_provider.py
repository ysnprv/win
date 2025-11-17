from abc import ABC, abstractmethod
from typing import Dict, Optional, List
from dataclasses import dataclass


@dataclass
class LLMRequest:
    """Standardized LLM request structure"""

    prompt: str
    temperature: float = 0.7
    max_tokens: int = 4000
    model: Optional[str] = None
    system_message: Optional[str] = None
    stop_sequences: Optional[List[str]] = None


@dataclass
class LLMResponse:
    """Standardized LLM response structure"""

    content: str
    model: str
    tokens_used: Optional[int] = None
    finish_reason: Optional[str] = None
    cost: Optional[float] = None
    response_time: Optional[float] = None


class LLMProvider(ABC):
    """
    Abstract base class for LLM providers.
    Ensures consistent interface across different LLM services.
    """

    def __init__(self, api_key: str, model: str = None):
        self.api_key = api_key
        self.default_model = model
        self.provider_name = self.__class__.__name__

    @abstractmethod
    async def generate_response(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000,
        model: Optional[str] = None,
        system_message: Optional[str] = None,
        **kwargs
    ) -> str:
        """
        Generate a response from the LLM.

        Args:
            prompt: The user prompt
            temperature: Randomness control (0.0 to 2.0)
            max_tokens: Maximum tokens in response
            model: Model to use (overrides default)
            system_message: System message for context
            **kwargs: Provider-specific parameters

        Returns:
            Generated text response
        """
        pass

    @abstractmethod
    async def generate_response_detailed(self, request: LLMRequest) -> LLMResponse:
        """
        Generate a detailed response with metadata.

        Args:
            request: Structured LLM request

        Returns:
            Detailed response with metadata
        """
        pass

    @abstractmethod
    def get_available_models(self) -> List[str]:
        """Get list of available models for this provider."""
        pass

    def count_tokens(self, text: str) -> int:
        """
        Rough token estimation (can be overridden by providers with precise counting).
        """
        # Rough estimation: ~4 characters per token for English
        return len(text) // 4

    async def validate_connection(self) -> bool:
        """Test the connection to the LLM provider."""
        try:
            response = await self.generate_response(
                prompt="Hello", temperature=0, max_tokens=10
            )
            return bool(response.strip())
        except Exception:
            return False

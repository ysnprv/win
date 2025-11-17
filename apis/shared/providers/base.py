from typing import Any, Optional
from abc import ABC, abstractmethod


class Provider(ABC):
    """
    Abstract base class for providers.
    """

    @abstractmethod
    async def __call__(self, prompt: str, system: Optional[str] = None, **generation_args: Any) -> str: ...


class EmbeddingProvider(ABC):
    """
    Abstract base class for embedding providers.
    """

    @abstractmethod
    async def embed(self, text: str) -> list[float]: ...

from typing import Dict, Type
import os
from .llm_provider import LLMProvider
from .openai_provider import OpenAIProvider
from .groq_provider import GroqProvider
from features.Job_matcher.src.providers.embedding.hf_embedding import HFEmbedder
from .embedding_provider import EmbeddingProvider


class GeminiProviderWrapper(LLMProvider):
    """Wrapper for shared Gemini provider to match Job Matcher interface"""

    def __init__(self, api_key: str = None, model: str = "gemini-1.5-flash"):
        super().__init__(api_key or os.getenv("GOOGLE_GEN_AI_API_KEY", ""), model)
        from shared.providers.gemini_provider import GeminiProvider

        self._gemini = GeminiProvider(model_name=model)

    async def generate_response(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000,
        model: str = None,
        system_message: str = None,
        **kwargs,
    ) -> str:
        return await self._gemini(prompt=prompt, system=system_message, **kwargs)


class LLMProviderFactory:
    """Factory for creating LLM providers"""

    _providers: Dict[str, Type[LLMProvider]] = {
        "openai": OpenAIProvider,
        "groq": GroqProvider,
        "gemini": GeminiProviderWrapper,
    }

    _embedding_providers: Dict[str, Type[EmbeddingProvider]] = {
        "hf": HFEmbedder,
        "openai": OpenAIProvider,
    }

    @classmethod
    def create_provider(
        cls, provider_name: str, api_key: str = None, model: str = None
    ) -> LLMProvider:
        """
        Create an LLM provider instance.

        Args:
            provider_name: Name of the provider
            api_key: API key
            model: Model name

        Returns:
            Configured LLM provider instance
        """

        provider_name = provider_name.lower()

        if provider_name not in cls._providers:
            available = ", ".join(cls._providers.keys())
            raise ValueError(
                f"Unknown provider '{provider_name}'. Available: {available}"
            )

        provider_class = cls._providers[provider_name]

        # Get API key from settings if not provided
        if not api_key:
            import os

            api_key_map = {
                "openai": os.getenv("OPENAI_API_KEY"),
                "groq": os.getenv("GROQ_API_KEY"),
                "gemini": os.getenv("GOOGLE_GEN_AI_API_KEY"),
            }
            api_key = api_key_map.get(provider_name)

            if not api_key:
                raise ValueError(
                    f"No API key found for {provider_name}. Check your settings."
                )

        # Create provider instance
        if model:
            return provider_class(api_key=api_key, model=model)
        else:
            return provider_class(api_key=api_key)

    @classmethod
    def create_embedding_provider(
        cls, provider_name: str, api_key: str = None, model: str = None
    ) -> EmbeddingProvider:
        """
        Create an embedding provider instance.
        """
        provider_name = provider_name.lower()

        if provider_name not in cls._embedding_providers:
            available = ", ".join(cls._embedding_providers.keys())
            raise ValueError(
                f"Unknown embedding provider '{provider_name}'. Available: {available}"
            )

        provider_class = cls._embedding_providers[provider_name]

        # Get API key from settings if not provided
        if not api_key:
            api_key_map = {
                "openai": os.getenv("OPENAI_API_KEY"),
                "hf": os.getenv("HF_API_KEY"),
            }
            api_key = api_key_map.get(provider_name)

        # Get default model if not provided
        if not model:
            model_map = {
                "hf": "sentence-transformers/all-MiniLM-L6-v2",
                "openai": "text-embedding-3-small",
            }
            model = model_map.get(provider_name)

        if provider_name == "hf":
            if model:
                return provider_class(model_name=model)
            else:
                return provider_class()
        elif provider_name == "openai":
            kwargs = {}
            if api_key:
                kwargs["api_key"] = api_key
            if model:
                kwargs["model"] = model
            return provider_class(**kwargs)
        else:
            kwargs = {}
            if api_key:
                kwargs["api_key"] = api_key
            if model:
                kwargs["model"] = model
            return provider_class(**kwargs)

    @classmethod
    def get_available_providers(cls) -> list:
        """Get list of available provider names"""
        return list(cls._providers.keys())

    @classmethod
    def get_available_embedding_providers(cls) -> list:
        """Get list of available embedding provider names"""
        return list(cls._embedding_providers.keys())


def get_llm_provider(provider: str = "openai", **kwargs) -> LLMProvider:
    """Get an LLM provider with simplified interface"""
    return LLMProviderFactory.create_provider(provider, **kwargs)


def get_embedding_provider(provider: str = "hf", **kwargs) -> EmbeddingProvider:
    """Get an Embedding provider with simplified interface"""
    return LLMProviderFactory.create_embedding_provider(
        provider_name=provider, **kwargs
    )

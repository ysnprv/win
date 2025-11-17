import os
from typing import Optional

from langchain_openai import ChatOpenAI, OpenAIEmbeddings
from langchain_core.messages import HumanMessage, SystemMessage
from openai import APIError, Timeout, APIConnectionError, RateLimitError

from shared.providers.exceptions import ProviderError
from shared.providers.base import Provider, EmbeddingProvider
from shared.helpers.retry_decorator import retry_on_llm_failure


class OpenAIProvider(Provider):
    def __init__(self, api_key: str = None, model_name: str = "gpt-4o-mini"):
        print(f"Initializing OpenAIProvider with model: {model_name}", flush=True)

        api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            print(
                "error: OpenAI API key not found in environment or parameters",
                flush=True,
            )
            raise ProviderError("OpenAI API key is missing")

        print(f" OpenAI API key found", flush=True)

        # Use LangChain ChatOpenAI with updated parameter names
        self._client = ChatOpenAI(
            model=model_name,
            api_key=api_key,
        )
        self.model = model_name
        print(" OpenAIProvider initialized successfully", flush=True)

    async def __call__(self, prompt: str, system: Optional[str] = None, **kwargs) -> str:
        print(" Starting OpenAI LLM request", flush=True)
        try:
            # Build messages list
            messages = []
            if system:
                messages.append(SystemMessage(content=system))
                print(f" Using system prompt (length: {len(system)} chars)", flush=True)
            messages.append(HumanMessage(content=prompt))
            
            print(
                f"Sending request to OpenAI via LangChain...",
                flush=True,
            )
            # Use async invoke with messages
            response = await self._client.ainvoke(messages, **kwargs)
            content = response.content
            print(" OpenAI request successful", flush=True)
            return content
        except (APIError, Timeout, APIConnectionError, RateLimitError) as e:
            print(f"OpenAI provider failed with a recoverable error: {e}", flush=True)
            raise ProviderError(f"OpenAI error: {e}") from e
        except Exception as e:
            print(f"OpenAI provider failed with a non-recoverable error: {e}", flush=True)
            raise ProviderError(f"OpenAI error: {e}") from e


class OpenAIEmbeddingProvider(EmbeddingProvider):
    
    def __init__(
        self,
        api_key: str | None = None,
        embedding_model: str = "text-embedding-3-small",
    ):
        print(
            f" Initializing OpenAIEmbeddingProvider with model: {embedding_model}",
            flush=True,
        )

        api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not api_key:
            print(" OpenAI API key not found for embedding provider", flush=True)
            raise ProviderError("OpenAI API key is missing")

        print(f" Embedding API key found", flush=True)

        # Use LangChain embeddings with updated parameter name
        self._client = OpenAIEmbeddings(
            api_key=api_key,
            model=embedding_model,
        )
        self._model = embedding_model
        print(" OpenAIEmbeddingProvider initialized successfully", flush=True)

    @retry_on_llm_failure(max_retries=3)
    async def embed(self, text: str) -> list[float]:
        print(" Starting embedding generation", flush=True)
        try:
            print(
                f" Sending embedding request via LangChain...",
                flush=True,
            )
            # Use LangChain async embedding call
            vectors = await self._client.aembed_documents([text])
            embedding = vectors[0]
            print(" Embedding generated successfully", flush=True)
            return embedding
        except (APIError, Timeout, APIConnectionError, RateLimitError) as e:
            print(f"OpenAI embedding failed with a recoverable error: {e}", flush=True)
            raise ProviderError(f"OpenAI embedding error: {e}") from e
        except Exception as e:
            print(f"OpenAI embedding failed with a non-recoverable error: {e}", flush=True)
            raise ProviderError(f"OpenAI embedding error: {e}") from e

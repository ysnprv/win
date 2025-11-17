from ollama import AsyncClient
from shared.providers.base import Provider
from typing import Optional


class OllamaProvider(Provider):
    def __init__(self, model_name: str = "llama3"):
        self.model = model_name
        self._client = AsyncClient()

    async def __call__(
        self, prompt: str, system: Optional[str] = None, **generation_args: Any
    ) -> str:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        messages.append({"role": "user", "content": prompt})

        resp = await self._client.chat(
            model=self.model,
            messages=messages,
            **generation_args,
        )

        return resp["message"]["content"]

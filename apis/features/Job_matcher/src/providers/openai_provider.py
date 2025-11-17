import openai
import time
from typing import Optional, List
from .llm_provider import LLMProvider, LLMRequest, LLMResponse


class OpenAIProvider(LLMProvider):
    """OpenAI GPT provider"""

    def __init__(self, api_key: str, model: str = "gpt-3.5-turbo"):
        super().__init__(api_key, model)
        openai.api_key = api_key
        self.client = openai.AsyncOpenAI(api_key=api_key)

        # Available models
        self.available_models = [
            "gpt-4",
            "gpt-4-turbo",
            "gpt-3.5-turbo",
            "gpt-3.5-turbo-16k",
        ]

    async def generate_response(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000,
        model: Optional[str] = None,
        system_message: Optional[str] = None,
        **kwargs,
    ) -> str:
        """Generate response using OpenAI API"""

        model = model or self.default_model

        messages = []
        if system_message:
            messages.append({"role": "system", "content": system_message})
        messages.append({"role": "user", "content": prompt})

        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
                **kwargs,
            )

            return response.choices[0].message.content

        except Exception as e:
            raise Exception(f"OpenAI API error: {str(e)}")

    async def generate_response_detailed(self, request: LLMRequest) -> LLMResponse:
        """Generate detailed response with metadata"""

        start_time = time.time()
        model = request.model or self.default_model

        messages = []
        if request.system_message:
            messages.append({"role": "system", "content": request.system_message})
        messages.append({"role": "user", "content": request.prompt})

        try:
            response = await self.client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
                stop=request.stop_sequences,
            )

            response_time = time.time() - start_time
            choice = response.choices[0]
            usage = response.usage

            # Calculate cost
            cost = self.estimate_cost(
                usage.prompt_tokens, usage.completion_tokens, model
            )

            return LLMResponse(
                content=choice.message.content,
                model=model,
                tokens_used=usage.total_tokens,
                finish_reason=choice.finish_reason,
                cost=cost,
                response_time=response_time,
            )

        except Exception as e:
            raise Exception(f"OpenAI API detailed error: {str(e)}")

    def get_available_models(self) -> List[str]:
        """Get available OpenAI models"""
        return self.available_models

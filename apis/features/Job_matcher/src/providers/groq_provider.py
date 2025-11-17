import time
from typing import Optional, List
from groq import AsyncGroq
from .llm_provider import LLMProvider, LLMRequest, LLMResponse


class GroqProvider(LLMProvider):
    """Groq API provider"""

    def __init__(self, api_key: str, model: str = "llama-3.3-70b-versatile"):
        super().__init__(api_key, model)

        self.available_models = [
            "llama-3.3-70b-versatile",
            "llama-3.1-8b-instant",  # alternative
            "llama-3.2-90b-text-preview",
            "mixtral-8x7b-32768",
            "gemma2-9b-it",
            "llama2-70b-4096",
            "gemma-7b-it",
        ]

        # Initialize Groq client
        self.client = AsyncGroq(api_key=api_key)

    async def generate_response(
        self,
        prompt: str,
        temperature: float = 0.7,
        max_tokens: int = 4000,
        model: Optional[str] = None,
        system_message: Optional[str] = None,
        **kwargs,
    ) -> str:
        """Generate response using Groq SDK"""

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
            raise Exception(f"Groq API error: {str(e)}")

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

            # Extract usage information
            usage = response.usage
            prompt_tokens = usage.prompt_tokens if usage else 0
            completion_tokens = usage.completion_tokens if usage else 0
            total_tokens = usage.total_tokens if usage else 0

            # Calculate cost
            cost = self.estimate_cost(prompt_tokens, completion_tokens, model)

            return LLMResponse(
                content=response.choices[0].message.content,
                model=model,
                tokens_used=total_tokens,
                finish_reason=response.choices[0].finish_reason,
                cost=cost,
                response_time=response_time,
            )

        except Exception as e:
            raise Exception(f"Groq API detailed error: {str(e)}")

    def get_available_models(self) -> List[str]:
        """Get available Groq models"""
        return self.available_models

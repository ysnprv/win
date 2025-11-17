import os
from typing import Optional, Any

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from shared.providers.exceptions import ProviderError
from shared.providers.base import Provider
from shared.helpers.strip_thinking_block import strip_thinking_block
from shared.helpers.logger import get_logger

logger = get_logger(__name__)


class GeminiProvider(Provider):
    """Google Gemini AI provider using LangChain."""

    def __init__(
        self,
        model_name: str = "gemini-1.5-flash",
        temperature: float = 0.0,
    ):
        logger.info(f"Initializing GeminiProvider with model: {model_name}")

        logger.debug("Google API key found")

        # Initialize ChatGoogleGenerativeAI
        self._client = ChatGoogleGenerativeAI(
            model=model_name,
            temperature=temperature,
            google_api_key=os.getenv("GOOGLE_GEN_AI_API_KEY"),
        )
        self.model = model_name
        logger.info("GeminiProvider initialized successfully")

    async def __call__(
        self, prompt: str, system: Optional[str] = None, **generation_args: Any
    ) -> str:
        logger.debug("Starting Gemini LLM request")
        try:
            # Build messages list
            messages = []
            if system:
                messages.append(SystemMessage(content=system))
                logger.debug(f"Using system prompt (length: {len(system)} chars)")
            messages.append(HumanMessage(content=prompt))

            logger.debug(
                f"Sending request to Gemini (prompt length: {len(prompt)} chars)"
            )

            # Use async invoke with messages
            response = await self._client.ainvoke(messages, **generation_args)
            content = response.content

            logger.debug(
                f"Gemini request successful (response length: {len(content)} chars)"
            )
            return strip_thinking_block(content)

        except Exception as e:
            logger.error(f"Gemini provider failed with error: {e}")
            raise ProviderError(f"Gemini error: {e}") from e

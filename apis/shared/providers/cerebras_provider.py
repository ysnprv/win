from shared.providers.base import Provider
from shared.providers.exceptions import ProviderError
from shared.helpers.strip_thinking_block import strip_thinking_block
from shared.helpers.logger import get_logger

from langchain_cerebras import ChatCerebras
from langchain_core.messages import HumanMessage, SystemMessage

from typing import Any, Optional
import os


from httpx import HTTPStatusError, TimeoutException, NetworkError

logger = get_logger(__name__)


class CerebrasProvider(Provider):

    def __init__(self, model_name: str, temperature: float):
        if not os.getenv("CEREBRAS_API_KEY"):
            raise ValueError("CEREBRAS_API_KEY environment variable not set.")

        self._client = ChatCerebras(
            model_name=model_name,
            temperature=temperature,
            timeout=None,
            max_retries=5,
            api_key=os.getenv("CEREBRAS_API_KEY"),
        )

    async def __call__(self, prompt: str, system: Optional[str] = None, **generation_args: Any) -> str:
        logger.debug("Starting Cerebras LLM request")
        try:
            # Build messages list
            messages = []
            if system:
                messages.append(SystemMessage(content=system))
                logger.debug(f"Using system prompt (length: {len(system)} chars)")
            messages.append(HumanMessage(content=prompt))
            
            logger.debug(f"Sending request to Cerebras (prompt length: {len(prompt)} chars)")
            response = await self._client.agenerate([messages])
            content = response.generations[0][0].text
            logger.debug(f"Cerebras request successful (response length: {len(content)} chars)")
            return strip_thinking_block(content)
        except (HTTPStatusError, TimeoutException, NetworkError) as e:
            logger.error(f"Cerebras provider failed with recoverable error: {e}")
            raise ProviderError(f"Cerebras error: {e}") from e
        except Exception as e:
            logger.error(f"Cerebras provider failed with non-recoverable error: {e}")
            raise ProviderError(f"Cerebras error: {e}") from e

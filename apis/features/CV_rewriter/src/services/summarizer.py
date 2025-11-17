from shared.providers.base import Provider
from features.CV_rewriter.src.prompts.prompts import PromptTemplates
from shared.errors.errors import BadLLMResponseError
from shared.helpers.retry_decorator import retry_on_llm_failure
from shared.helpers.strip_thinking_block import strip_thinking_block
from shared.helpers.logger import get_logger
import json
from typing import Dict

logger = get_logger(__name__)


class JobsSummarizer:
    """
    LLM-powered service for generating job titles and summaries.
    Produces a title (max 3 words) and a 3-line paragraph summary.
    """

    def __init__(self, provider: Provider):
        self.provider = provider

    @retry_on_llm_failure(max_retries=3)
    async def summarize(self, jobs_text: str) -> Dict[str, str]:
        """
        Generate a title and summary for job description(s).
        
        Args:
            jobs_text: Combined job descriptions text
            
        Returns:
            Dictionary with 'title' and 'summary' keys
            
        Raises:
            BadLLMResponseError: If LLM cannot generate valid response after retries
            ValueError: If input is invalid
        """
        if len(jobs_text.strip()) < 10:
            logger.error("Job descriptions text too short for summarization")
            raise ValueError("Job descriptions text too short (min 10 chars)")
        
        logger.debug(f"Summarizing job descriptions ({len(jobs_text)} chars)...")
        
        prompt = PromptTemplates.JOBS_SUMMARY.format(jobs_text=jobs_text)
        
        response = await self.provider(prompt)
        response = strip_thinking_block(response)
        result = self._parse_response(response)
        
        logger.info(f"Generated job title: '{result['title']}' and summary ({len(result['summary'])} chars)")
        
        return result
    
    def _parse_response(self, response: str) -> Dict[str, str]:
        """
        Parse JSON response containing title and summary.
        Raises BadLLMResponseError if parsing fails.
        """
        response = response.strip()
        
        # Remove code blocks
        if response.startswith("```json"):
            response = response[7:]
        elif response.startswith("```"):
            response = response[3:]
        if response.endswith("```"):
            response = response[:-3]
        
        response = response.strip()
        
        # Try to parse JSON
        try:
            data = json.loads(response)
        except json.JSONDecodeError:
            # Try to find JSON in response
            try:
                start = response.find('{')
                end = response.rfind('}') + 1
                if start != -1 and end != 0:
                    json_str = response[start:end]
                    data = json.loads(json_str)
                else:
                    raise BadLLMResponseError("No JSON object found in response")
            except (json.JSONDecodeError, ValueError) as e:
                raise BadLLMResponseError(f"Invalid JSON in response: {e}")
        
        if not isinstance(data, dict):
            raise BadLLMResponseError("Response must be a JSON object")
        
        # Extract title - be flexible with format
        title = ""
        if "title" in data:
            if isinstance(data["title"], str):
                title = data["title"].strip()
            elif isinstance(data["title"], dict):
                # Join dict values
                title = " ".join(str(v) for v in data["title"].values() if v)
            else:
                title = str(data["title"]).strip()
        
        # Extract summary - be flexible with format
        summary = ""
        if "summary" in data:
            if isinstance(data["summary"], str):
                summary = data["summary"].strip()
            elif isinstance(data["summary"], dict):
                # Join dict values
                summary = " ".join(str(v) for v in data["summary"].values() if v)
            elif isinstance(data["summary"], list):
                # Join list items
                summary = " ".join(str(item) for item in data["summary"] if item)
            else:
                summary = str(data["summary"]).strip()
        
        # Provide defaults if needed
        if not title or len(title) < 2:
            logger.warning("Title missing or too short, using default")
            title = "Position Available"
        
        if not summary or len(summary) < 10:
            logger.warning("Summary missing or too short, using default")
            summary = "Career opportunity with growth potential and competitive compensation."
        
        # Validate title (max 3 words)
        if len(title.split()) > 3:
            logger.warning(f"Title exceeds 3 words, truncating: '{title}'")
            title = ' '.join(title.split()[:3])
        
        return {"title": title, "summary": summary}

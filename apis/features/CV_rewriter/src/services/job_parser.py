import json
import re
from shared.providers.base import Provider
from features.CV_rewriter.src.models.models import JobDescription
from features.CV_rewriter.src.prompts.prompts import PromptTemplates
from shared.errors.errors import BadLLMResponseError
from shared.helpers.retry_decorator import retry_on_llm_failure
from shared.helpers.strip_thinking_block import strip_thinking_block
from shared.helpers.logger import get_logger

from typing import Any, List

logger = get_logger(__name__)


class JobParser:
    """
    LLM-powered job description parser - works with any format/language.
    Fails if LLM cannot parse after retries - no regex fallbacks.
    """
    
    def __init__(self, provider: Provider):
        self.provider = provider
    
    @retry_on_llm_failure(max_retries=3)
    async def parse(self, raw_job_description: str) -> JobDescription:
        """
        Parse job description using LLM.
        Fails with BadLLMResponseError if parsing doesn't work after retries.
        
        Args:
            raw_job_description: Raw job posting in any language/format
            
        Returns:
            JobDescription with LLM-extracted data
            
        Raises:
            BadLLMResponseError: If LLM cannot parse after retries
            ValueError: If input is too short
        """
        if len(raw_job_description.strip()) < 10:
            logger.error("Job description too short")
            raise ValueError("Job description too short (min 10 chars)")
        
        logger.debug(f"Parsing job description ({len(raw_job_description)} characters)...")
        
        prompt = PromptTemplates.JOB_PARSING.format(
            job_text=raw_job_description
        )
        
        response = await self.provider(prompt)
        response = strip_thinking_block(response)
        parsed_data = self._parse_response(response)
        
        job_title = parsed_data.get("title", "Position")
        company = parsed_data.get("company", "Unknown")
        logger.debug(f"Job parsed: {job_title} at {company}")
        
        # Normalize all list fields to ensure they're lists of strings
        # LLM might return dicts, mixed types, or nested structures - we handle it all
        normalized_data = {
            "title": job_title,
            "company": parsed_data.get("company"),
            "location": parsed_data.get("location"),
            "description": parsed_data.get("description", ""),
            "responsibilities": self._normalize_to_string_list(parsed_data.get("responsibilities", [])),
            "requirements": self._normalize_to_string_list(parsed_data.get("requirements", [])),
            "preferred_qualifications": self._normalize_to_string_list(parsed_data.get("preferred_qualifications", [])),
            "keywords": self._normalize_to_string_list(parsed_data.get("keywords", [])),
            "raw_content": raw_job_description
        }
        
        return JobDescription(**normalized_data)
    
    def _normalize_to_string_list(self, value: Any) -> List[str]:
        """
        Normalize any value to a list of strings.
        Handles: dicts, lists of dicts, mixed types, nested structures, etc.
        Never fails - always returns a valid list of strings.
        """
        if not value:
            return []
        
        # If it's already a list
        if isinstance(value, list):
            result = []
            for item in value:
                if isinstance(item, str):
                    result.append(item)
                elif isinstance(item, dict):
                    # Extract all string values from dict and join them
                    dict_values = [str(v) for v in item.values() if v]
                    if dict_values:
                        result.append(" - ".join(dict_values))
                else:
                    # Convert anything else to string
                    result.append(str(item))
            return result
        
        # If it's a dict, extract all values
        elif isinstance(value, dict):
            result = []
            for v in value.values():
                if isinstance(v, str):
                    result.append(v)
                elif isinstance(v, list):
                    result.extend(self._normalize_to_string_list(v))
                else:
                    result.append(str(v))
            return result
        
        # If it's a string, wrap it in a list
        elif isinstance(value, str):
            return [value]
        
        # Anything else, convert to string and wrap
        else:
            return [str(value)]
    
    def _parse_response(self, response: str) -> dict:
        """
        Parse JSON with lenient extraction.
        Allows flexible fields from AI beyond the standard ones.
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
        
        # Minimal validation - only check it's a dict
        if not isinstance(data, dict):
            raise BadLLMResponseError("Response must be a JSON object")
        
        # Set defaults for core fields
        data.setdefault("title", "Position")
        data.setdefault("description", "")
        
        # No validation of list fields - we normalize them later
        # This ensures we NEVER fail on format issues
        
        return data

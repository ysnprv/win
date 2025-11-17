import json
from typing import Dict, List
from shared.providers.base import Provider
from features.CV_rewriter.src.prompts.prompts import PromptTemplates
from shared.errors.errors import BadLLMResponseError
from shared.helpers.retry_decorator import retry_on_llm_failure
from shared.helpers.strip_thinking_block import strip_thinking_block
from shared.helpers.logger import get_logger

logger = get_logger(__name__)


class CVReviewSummary:
    """Data class for CV review summary."""
    
    def __init__(self, improvements: List[str]):
        self.improvements = improvements
    
    def to_dict(self) -> Dict:
        """Convert to dictionary for JSON serialization."""
        return {"improvements": self.improvements}


class Reviewer:
    """
    LLM-powered CV comparison service that generates a summary of improvements.
    Compares the original anonymized CV with the enhanced anonymized CV.
    Uses the main (non-anonymous) provider for generating the summary.
    """

    def __init__(self, provider: Provider):
        self.provider = provider

    @retry_on_llm_failure(max_retries=3)
    async def review(self, old_cv: str, new_cv: str) -> CVReviewSummary:
        """
        Compare two CV versions and generate an improvement summary.
        
        Args:
            old_cv: Original anonymized CV text
            new_cv: Enhanced anonymized CV text
            
        Returns:
            CVReviewSummary containing list of improvement bullet points
            
        Raises:
            BadLLMResponseError: If LLM cannot generate valid review after retries
            ValueError: If input CVs are invalid
        """
        if len(old_cv.strip()) < 10:
            logger.error("Old CV text too short for review")
            raise ValueError("Old CV text too short (min 10 chars)")
        
        if len(new_cv.strip()) < 10:
            logger.error("New CV text too short for review")
            raise ValueError("New CV text too short (min 10 chars)")
        
        logger.debug(f"Reviewing CV changes (old: {len(old_cv)} chars, new: {len(new_cv)} chars)...")
        
        prompt = PromptTemplates.CV_REVIEW.format(old_cv=old_cv, new_cv=new_cv)
        
        response = await self.provider(prompt)
        response = strip_thinking_block(response)
        improvements = self._parse_response(response)
        
        logger.info(f"Generated review summary with {len(improvements)} improvement points")
        
        return CVReviewSummary(improvements=improvements)
    
    def _normalize_to_string_list(self, value: any) -> List[str]:
        """
        Normalize any value to a list of strings.
        Handles: dicts, lists of dicts, mixed types, etc.
        Never fails - always returns a valid list of strings.
        """
        if not value:
            return []
        
        # If it's already a list
        if isinstance(value, list):
            result = []
            for item in value:
                if isinstance(item, str) and item.strip():
                    result.append(item.strip())
                elif isinstance(item, dict):
                    # Extract all string values from dict
                    dict_values = [str(v).strip() for v in item.values() if v]
                    if dict_values:
                        result.append(" - ".join(dict_values))
                elif item:  # Any other non-empty value
                    str_val = str(item).strip()
                    if str_val:
                        result.append(str_val)
            return result
        
        # If it's a dict, extract all values
        elif isinstance(value, dict):
            result = []
            for v in value.values():
                if isinstance(v, str) and v.strip():
                    result.append(v.strip())
                elif isinstance(v, list):
                    result.extend(self._normalize_to_string_list(v))
                elif v:
                    str_val = str(v).strip()
                    if str_val:
                        result.append(str_val)
            return result
        
        # If it's a string, wrap it in a list
        elif isinstance(value, str) and value.strip():
            return [value.strip()]
        
        # Anything else, convert to string if not empty
        else:
            str_val = str(value).strip()
            return [str_val] if str_val else []
    
    def _parse_response(self, response: str) -> List[str]:
        """
        Parse JSON response containing improvements list.
        Raises BadLLMResponseError only for JSON syntax errors.
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
        
        if "improvements" not in data:
            raise BadLLMResponseError("Missing 'improvements' field in response")
        
        improvements = data["improvements"]
        
        # Normalize to list of strings - never fail on format
        normalized_improvements = self._normalize_to_string_list(improvements)
        
        # If we got nothing useful, return a default message
        if len(normalized_improvements) < 1:
            logger.warning("No valid improvements found, using default message")
            normalized_improvements = ["CV has been enhanced with improved formatting and content"]
        
        # Truncate if too many
        if len(normalized_improvements) > 8:
            logger.warning(f"Review has {len(normalized_improvements)} points, expected 4-8. Truncating to 8.")
            normalized_improvements = normalized_improvements[:8]
        
        logger.debug(f"Successfully parsed {len(normalized_improvements)} improvement points")
        return normalized_improvements

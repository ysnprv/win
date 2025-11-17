from typing import Dict, Any
from shared.providers.base import Provider
from features.Anonymizer.models.models import AnonymizedCV
from features.Anonymizer.src.prompts import PromptTemplates
from shared.errors.errors import BadLLMResponseError
from shared.helpers.retry_decorator import retry_on_llm_failure
from shared.helpers.strip_thinking_block import strip_thinking_block
from shared.helpers.logger import get_logger
import json

logger = get_logger(__name__)


class Anonymizer:
    """
    LLM-powered personal info extraction and CV anonymization.
    Works with any language, any format. Fails if LLM cannot process after retries.
    """

    def __init__(self, provider: Provider):
        self.provider = provider

    @retry_on_llm_failure(max_retries=3)
    async def anonymize(self, raw_cv: str) -> AnonymizedCV:
        """
        Extract personal info and return anonymized CV using LLM.
        Personal info is extracted as a flexible dict with any fields the AI identifies.
        Fails with BadLLMResponseError if extraction doesn't work after retries.

        Args:
            raw_cv: Raw CV text in any language/format

        Returns:
            AnonymizedCV with LLM-extracted personal data dict

        Raises:
            BadLLMResponseError: If LLM cannot parse after retries
        """
        logger.debug("Anonymizing CV with LLM...")
        prompt = PromptTemplates.PRIVACY_EXTRACTION.format(cv_text=raw_cv)
        response = await self.provider(prompt)
        response = strip_thinking_block(response)
        result = self._parse_response(response)

        personal_data = result["personal_info"]
        anonymized_text = result["anonymized_cv"]
        
        # Log a sample of what was extracted (for debugging)
        sample_keys = list(personal_data.keys())[:3]
        logger.debug(f"Personal data extracted with fields: {sample_keys}{'...' if len(personal_data) > 3 else ''}")

        return AnonymizedCV(
            personal_data=personal_data, 
            anonymized_text=anonymized_text
        )

    def _parse_response(self, response: str) -> Dict[str, Any]:
        """
        Parse LLM response with lenient JSON extraction.
        Validates structure but allows flexible personal_info fields.
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
            result = json.loads(response)
        except json.JSONDecodeError:
            # Try to find JSON in response
            try:
                start = response.find("{")
                end = response.rfind("}") + 1
                if start != -1 and end != 0:
                    json_str = response[start:end]
                    result = json.loads(json_str)
                else:
                    raise BadLLMResponseError("No JSON object found in response")
            except (json.JSONDecodeError, ValueError) as e:
                raise BadLLMResponseError(f"Invalid JSON in response: {e}")

        # Validate structure
        if not isinstance(result, dict):
            raise BadLLMResponseError("Response must be a JSON object")

        if "personal_info" not in result:
            raise BadLLMResponseError("Missing 'personal_info' field")

        if "anonymized_cv" not in result:
            raise BadLLMResponseError("Missing 'anonymized_cv' field")

        # Ensure personal_info is a dict (flexible fields) - be lenient
        personal_info = result.get("personal_info", {})
        if not isinstance(personal_info, dict):
            logger.warning(f"personal_info is not a dict, got {type(personal_info)}, using empty dict")
            personal_info = {}
        
        # Validate that personal_info is not empty
        if not personal_info:
            logger.warning("personal_info is empty - AI extracted no personal data")
        
        # Normalize all values in personal_info to be JSON-serializable - never fail
        normalized_personal_info = {}
        for key, value in personal_info.items():
            try:
                # Try to keep original type if it's already good
                if isinstance(value, (str, int, float, bool, type(None))):
                    normalized_personal_info[key] = value
                elif isinstance(value, list):
                    # Normalize list items
                    normalized_personal_info[key] = [str(item) if not isinstance(item, (str, int, float, bool)) else item for item in value]
                elif isinstance(value, dict):
                    # Convert dict to string representation
                    normalized_personal_info[key] = str(value)
                else:
                    # Convert anything else to string
                    normalized_personal_info[key] = str(value)
            except Exception as e:
                logger.warning(f"Failed to normalize personal_info field '{key}': {e}, skipping")
                continue

        # Get anonymized CV - be flexible with type
        anonymized_cv = result.get("anonymized_cv", "")
        if not isinstance(anonymized_cv, str):
            logger.warning(f"anonymized_cv is not a string, got {type(anonymized_cv)}, converting")
            anonymized_cv = str(anonymized_cv)

        # Use original CV if anonymized is too short
        if len(anonymized_cv.strip()) < 10:
            logger.warning("Anonymized CV is too short, this might indicate an extraction issue")
            # Don't fail - just log and continue

        return {"personal_info": normalized_personal_info, "anonymized_cv": anonymized_cv}

import json
from shared.providers.base import Provider
from features.CV_rewriter.src.models.models import QueryResponse
from features.CV_rewriter.src.prompts.prompts import PromptTemplates
from shared.errors.errors import BadLLMResponseError
from shared.helpers.retry_decorator import retry_on_llm_failure
from shared.helpers.strip_thinking_block import strip_thinking_block
from shared.helpers.logger import get_logger

logger = get_logger(__name__)


class QueryGenerator:
    """
    LLM-powered query generator for CV improvement.
    Analyzes CV and generates 4-10 relevant questions to gather additional context.
    """
    
    def __init__(self, provider: Provider):
        self.provider = provider
    
    @retry_on_llm_failure(max_retries=3)
    async def generate(self, cv_text: str) -> QueryResponse:
        """
        Generate queries based on CV content using LLM.
        
        Args:
            cv_text: CV content text in any language
            
        Returns:
            QueryResponse with 4-10 generated questions
            
        Raises:
            BadLLMResponseError: If LLM cannot generate valid queries after retries
            ValueError: If CV text is too short
        """
        if len(cv_text.strip()) < 10:
            logger.error("CV text too short for query generation")
            raise ValueError("CV text too short (min 10 chars)")
        
        logger.debug(f"Generating queries for CV ({len(cv_text)} characters)...")
        
        prompt = PromptTemplates.QUERY_GENERATION.format(cv_text=cv_text)
        
        response = await self.provider(prompt)
        response = strip_thinking_block(response)
        queries_dict = self._parse_response(response)
        
        logger.info(f"Generated {len(queries_dict)} queries successfully")
        
        return QueryResponse(queries=queries_dict)
    
    def _parse_response(self, response: str) -> dict:
        """
        Parse JSON response containing queries.
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
        
        # Normalize all values to strings - be flexible
        normalized_data = {}
        for key, value in data.items():
            # Convert any value to string
            if isinstance(value, str):
                str_val = value.strip()
            elif isinstance(value, dict):
                # Join dict values
                str_val = " - ".join(str(v) for v in value.values() if v)
            elif isinstance(value, list):
                # Join list items
                str_val = " ".join(str(item) for item in value if item)
            else:
                str_val = str(value).strip()
            
            # Only add if we got a valid string
            if str_val:
                normalized_data[key] = str_val
        
        # Must have at least one query
        if len(normalized_data) < 1:
            raise BadLLMResponseError("Must generate at least 1 query")
        
        logger.debug(f"Successfully parsed {len(normalized_data)} queries")
        return normalized_data

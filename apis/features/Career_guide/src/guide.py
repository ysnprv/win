from typing import Optional
import json
from shared.providers.base import Provider, EmbeddingProvider
from shared.helpers.logger import get_logger
from shared.helpers.retry_decorator import retry_on_llm_failure
from shared.helpers.strip_thinking_block import strip_thinking_block
from shared.errors.errors import BadLLMResponseError
from features.Career_guide.src.models.models import (
    CareerGuideInput,
    CareerGuideOutput,
)
from features.Career_guide.src.prompts.prompts import PromptTemplates
from features.Career_guide.src.database.knowledge_base import KnowledgeBase

logger = get_logger(__name__)


class CareerGuide:
    """
    Main orchestrator for career guidance generation.
    Combines user data with job market intelligence to provide personalized career advice.
    """

    def __init__(
        self,
        provider: Provider,
        embedding_provider: EmbeddingProvider,
        knowledge_base: KnowledgeBase
    ):
        """
        Initialize the CareerGuide orchestrator.

        Args:
            provider: LLM provider for generating career guidance
            embedding_provider: Provider for generating embeddings
            knowledge_base: ChromaDB knowledge base with job descriptions
        """
        self.provider = provider
        self.embedding_provider = embedding_provider
        self.knowledge_base = knowledge_base

    @retry_on_llm_failure(max_retries=3)
    async def generate_guide(
        self,
        cv_text: str,
        current_job: str,
        domain: str,
        target_job: Optional[str] = None,
        profile_data: Optional[str] = None
    ) -> CareerGuideOutput:
        """
        Generate comprehensive career guidance for a user.

        Args:
            cv_text: Anonymized CV text content
            current_job: User's current job title
            domain: Work domain (e.g., "IT & Software Engineering")
            target_job: Optional target job title
            profile_data: Optional profile data JSON string

        Returns:
            CareerGuideOutput with personalized career guidance

        Raises:
            BadLLMResponseError: If LLM response cannot be parsed after retries
            ValueError: If domain not found in knowledge base
        """
        logger.info(f"Generating career guide for domain: {domain}")
        
        # Create input model
        guide_input = CareerGuideInput(
            cv_text=cv_text,
            current_job=current_job,
            domain=domain,
            target_job=target_job,
            profile_data=profile_data
        )
        
        # Get combined user data for searching
        combined_user_data = guide_input.get_combined_user_data()
        logger.debug(f"Combined user data length: {len(combined_user_data)} chars")
        
        # Search knowledge base for relevant job descriptions
        logger.info("Searching knowledge base for relevant jobs...")
        job_results = await self.knowledge_base.search_jobs(
            domain=domain,
            user_data=combined_user_data,
            current_job=current_job,
            target_job=target_job,
            n_similarity=3,
            n_regex=2
        )
        
        logger.info(f"Found {len(job_results)} relevant job descriptions")
        
        # Format job descriptions for prompt
        job_descriptions_text = self._format_job_descriptions(job_results)
        
        # Build prompt
        prompt = PromptTemplates.CAREER_GUIDANCE.format(
            cv_text=cv_text,
            profile_data=profile_data if profile_data else "Not provided",
            current_job=current_job,
            target_job=target_job if target_job else "Not specified (focus on current role advancement)",
            domain=domain,
            job_descriptions=job_descriptions_text
        )
        
        logger.debug("Calling LLM for career guidance generation...")
        
        # Call LLM
        response = await self.provider(prompt)
        response = strip_thinking_block(response)
        
        # Parse and validate response
        career_guide = self._parse_response(response)
        
        logger.info("Career guide generated successfully")
        return career_guide

    def _format_job_descriptions(self, job_results: list) -> str:
        """
        Format job search results into a readable text block for the prompt.

        Args:
            job_results: List of job description dictionaries

        Returns:
            Formatted string with all job descriptions
        """
        if not job_results:
            return "No specific job descriptions available."
        
        formatted = []
        for i, job in enumerate(job_results, 1):
            metadata = job.get("metadata", {})
            job_name = metadata.get("name", "Unknown Job")
            content = job.get("content", "")
            source = job.get("source", "unknown")
            
            formatted.append(f"### Job {i}: {job_name.replace('_', ' ')}")
            formatted.append(f"(Source: {source} search)")
            formatted.append(content)
            formatted.append("")  # Empty line between jobs
        
        return "\n".join(formatted)

    def _parse_response(self, response: str) -> CareerGuideOutput:
        """
        Parse and validate LLM response into CareerGuideOutput model.

        Args:
            response: Raw LLM response string

        Returns:
            Validated CareerGuideOutput object

        Raises:
            BadLLMResponseError: If parsing or validation fails
        """
        response = response.strip()

        # Remove markdown code blocks if present
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

        # Validate with Pydantic model
        try:
            career_guide = CareerGuideOutput(**result)
            return career_guide
        except Exception as e:
            raise BadLLMResponseError(f"Response validation failed: {e}")

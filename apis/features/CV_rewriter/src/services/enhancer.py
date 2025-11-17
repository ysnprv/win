from typing import List, Optional, Dict, Any
from shared.providers.base import Provider
from features.CV_rewriter.src.models.models import JobDescription, EnhancedCV, QuestionAnswer
from features.CV_rewriter.src.prompts.prompts import PromptTemplates
from shared.errors.errors import BadLLMResponseError
from shared.helpers.retry_decorator import retry_on_llm_failure
from shared.helpers.strip_thinking_block import strip_thinking_block
from shared.helpers.strip_code_blocks import strip_latex_code_blocks
from shared.helpers.logger import get_logger

logger = get_logger(__name__)


class LatexValidator:
    """Helper class for LaTeX validation."""

    @staticmethod
    def validate_latex(latex_content: str) -> tuple[bool, str]:
        """
        Perform validation on LaTeX content.

        Args:
            latex_content: LaTeX content to validate

        Returns:
            Tuple of (is_valid, error_message)
        """
        if not latex_content or not latex_content.strip():
            return False, "Empty LaTeX content"

        # Check for balanced braces
        open_braces = latex_content.count("{")
        close_braces = latex_content.count("}")
        if open_braces != close_braces:
            return False, f"Unbalanced braces: {open_braces} open, {close_braces} close"

        # Check for some basic LaTeX commands (should have at least some formatting)
        required_commands = [
            r"\section",
            r"\subsection",
            r"\textbf",
            r"\textit",
            r"\item",
        ]
        has_commands = any(cmd in latex_content for cmd in required_commands)

        if not has_commands:
            return (
                False,
                "No LaTeX formatting commands found (missing \\section, \\textbf, \\item, etc.)",
            )

        return True, ""


class Enhancer:
    """
    LLM-powered CV enhancement for target jobs.
    Language-preserving: strictly maintains CV's original language.
    Fails if enhancement doesn't work after retries - no fallbacks.
    """

    def __init__(self, provider: Provider):
        self.provider = provider

    @retry_on_llm_failure(max_retries=3)
    async def enhance(
        self,
        anonymized_cv: str,
        job_descriptions: List[JobDescription],
        qa_pairs: Optional[List[QuestionAnswer]] = None,
        profile_data: Optional[Dict[str, Any]] = None,
        iteration: int = 1,
        similarity_score: float = 0.0,
    ) -> EnhancedCV:
        """
        Enhance anonymized CV for target jobs using LLM.

        Args:
            anonymized_cv: CV text with personal info removed
            job_descriptions: Target job descriptions to optimize for
            qa_pairs: Optional question-answer pairs for additional context
            iteration: Current iteration number (for tracking)
            similarity_score: Current similarity score (for tracking)

        Returns:
            EnhancedCV with improved content and metadata
        """
        if not job_descriptions:
            raise ValueError("At least one job description required for enhancement")

        combined = self._combine_job_requirements(job_descriptions)

        logger.debug(
            f"Enhancing CV for {len(job_descriptions)} job(s): {combined['titles']}"
        )
        
        # Format QA pairs for prompt if provided
        qa_context = ""
        if qa_pairs:
            qa_context = self._format_qa_pairs(qa_pairs)
            logger.debug(f"Including {len(qa_pairs)} Q&A pairs in enhancement context")
        
        # Format profile data for prompt if provided
        profile_context = self._format_profile_data(profile_data)
        if profile_context:
            logger.debug("Including user profile data in enhancement context")

        prompt = PromptTemplates.CV_ENHANCEMENT.format(
            anonymized_cv=anonymized_cv,
            job_titles=combined["titles"],
            key_skills=combined["skills"],
            responsibilities=combined["responsibilities"],
            requirements=combined["requirements"],
            profile_data=profile_context,
            qa_context=qa_context,
        )

        enhanced_text = await self.provider(prompt)

        if not isinstance(enhanced_text, str):
            logger.error("LLM returned non-string response for CV enhancement")
            raise BadLLMResponseError("Enhanced CV must be a string")

        # Strip thinking blocks and code block markers
        enhanced_text = strip_thinking_block(enhanced_text)
        enhanced_text = strip_latex_code_blocks(enhanced_text)

        if len(enhanced_text.strip()) < 20:
            logger.error(
                f"Enhanced CV too short: {len(enhanced_text.strip())} characters"
            )
            raise BadLLMResponseError("Enhanced CV is too short (min 20 chars)")

        # Validate LaTeX formatting
        is_valid, error_msg = LatexValidator.validate_latex(enhanced_text)
        if not is_valid:
            logger.error(f"Invalid LaTeX output from LLM: {error_msg}")
            raise BadLLMResponseError(f"Invalid LaTeX output: {error_msg}")

        logger.debug(
            f"CV enhanced successfully with valid LaTeX ({len(enhanced_text)} characters)"
        )

        return EnhancedCV(
            content=enhanced_text.strip(),
            target_jobs=combined["titles"],
            iteration=iteration,
            similarity_score=similarity_score,
        )

    def _format_qa_pairs(self, qa_pairs: List[QuestionAnswer]) -> str:
        """
        Format question-answer pairs for inclusion in prompt.
        
        Args:
            qa_pairs: List of QuestionAnswer objects
            
        Returns:
            Formatted string with Q&A pairs
        """
        if not qa_pairs:
            return ""
        
        formatted = []
        for i, qa in enumerate(qa_pairs, 1):
            formatted.append(f"Q{i}: {qa.question}")
            formatted.append(f"A{i}: {qa.answer}")
        
        return "\n".join(formatted)
    
    def _format_profile_data(self, profile_data: Optional[Dict[str, Any]]) -> str:
        """
        Format profile data for inclusion in prompt.
        Only includes non-null fields: skills, experiences, education, achievements.
        
        Args:
            profile_data: Dict with user profile data from database
            
        Returns:
            Formatted string with profile information
        """
        if not profile_data:
            return "Not provided"
        
        formatted = []
        
        # Skills
        if profile_data.get("skills") and isinstance(profile_data["skills"], list):
            skills_str = ", ".join(profile_data["skills"])
            formatted.append(f"Skills: {skills_str}")
        
        # Experiences
        if profile_data.get("experiences") and isinstance(profile_data["experiences"], list):
            formatted.append("Experiences:")
            for exp in profile_data["experiences"]:
                formatted.append(f"  • {exp}")
        
        # Education
        if profile_data.get("education") and isinstance(profile_data["education"], list):
            formatted.append("Education:")
            for edu in profile_data["education"]:
                formatted.append(f"  • {edu}")
        
        # Achievements
        if profile_data.get("achievements") and isinstance(profile_data["achievements"], list):
            formatted.append("Achievements:")
            for ach in profile_data["achievements"]:
                formatted.append(f"  • {ach}")
        
        return "\n".join(formatted) if formatted else "Not provided"

    def _combine_job_requirements(self, job_descriptions: List[JobDescription]) -> dict:
        """
        Combine requirements from multiple jobs - handles any language.
        Uses the formatted display method for consistent, nice-looking output.
        """
        all_titles = []
        all_skills = set()
        all_responsibilities = []
        all_requirements = []

        for jd in job_descriptions:
            if jd.title:
                all_titles.append(jd.title)

            # Add unique keywords
            all_skills.update(jd.keywords)

            # Add top responsibilities
            all_responsibilities.extend(jd.responsibilities[:3])

            # Add top requirements
            all_requirements.extend(jd.requirements[:3])

        return {
            "titles": ", ".join(all_titles) if all_titles else "Multiple Positions",
            "skills": ", ".join(sorted(all_skills)) if all_skills else "Various skills",
            "responsibilities": (
                "\n".join(f"• {r}" for r in all_responsibilities)
                if all_responsibilities
                else "Not specified"
            ),
            "requirements": (
                "\n".join(f"• {r}" for r in all_requirements)
                if all_requirements
                else "Not specified"
            ),
        }

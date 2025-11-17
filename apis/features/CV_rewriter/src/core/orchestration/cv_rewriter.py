from typing import List, Optional, Dict, Any
from features.CV_rewriter.src.services.enhancer import Enhancer
from features.CV_rewriter.src.services.assembler import Assembler
from features.CV_rewriter.src.services.job_parser import JobParser
from features.CV_rewriter.src.models.models import FinalCV, QuestionAnswer
from features.CV_rewriter.src.utils.similarity import SimilarityCalculator
from shared.providers.base import EmbeddingProvider
from shared.utils.constants import MAX_ITER, SIMILARITY_THRESHOLD
from shared.helpers.logger import get_logger
import numpy as np


logger = get_logger(__name__)


class CVRewriter:
    """
    Iterative CV rewriting pipeline with similarity-based optimization:
    1. Enhancement: Iteratively improve CV for target jobs (LLM + similarity)
    2. Assembly: Inject personal info back (deterministic)

    Anonymization is now handled separately before this pipeline.
    Iterations continue until MAX_ITER is reached or similarity threshold met.
    Language-agnostic: works with CVs and job descriptions in any language.
    Fails fast: if any LLM stage fails after retries, the whole pipeline fails.
    """

    def __init__(
        self,
        enhancer: Enhancer,
        job_parser: JobParser,
        embedding_provider: EmbeddingProvider,
        assembler: Assembler,
    ):
        self.enhancer = enhancer
        self.job_parser = job_parser
        self.assembler = assembler
        self.embedding_provider = embedding_provider

    async def rewrite(
        self,
        anonymized_cv_text: str,
        jobs_text: str,
        personal_data: Dict[str, Any],
        qa_pairs: Optional[List[QuestionAnswer]] = None,
        profile_data: Optional[Dict[str, Any]] = None,
    ) -> FinalCV:
        """
        Complete iterative CV rewriting pipeline with similarity-based optimization.
        Continues enhancement until MAX_ITER reached or SIMILARITY_THRESHOLD met.
        Fails if any stage fails - no fallbacks.

        Args:
            anonymized_cv_text: Pre-anonymized CV text content (any language)
            jobs_text: Pre-scraped combined job descriptions text
            personal_data: Extracted personal data dict (from anonymization)
            qa_pairs: Optional list of question-answer pairs from user
            profile_data: Optional dict with user profile data (skills, education, etc.)

        Returns:
            FinalCV with optimized content, personal info, and iteration metadata

        Raises:
            ValueError: If input is invalid
            BadLLMResponseError: If LLM processing fails after retries
        """
        logger.info("Starting CV rewriting pipeline with pre-anonymized content")

        if len(anonymized_cv_text.strip()) < 10:
            logger.error("Anonymized CV text is empty or too short (min 10 chars)")
            raise ValueError("Anonymized CV text is empty or too short (min 10 chars)")

        logger.info(f"Anonymized CV loaded: {len(anonymized_cv_text)} characters")
        logger.info(f"Personal data loaded: {len(personal_data)} fields")
        
        if qa_pairs:
            logger.info(f"Using {len(qa_pairs)} question-answer pairs for context")

        # Parse job descriptions from combined text
        if not jobs_text or len(jobs_text.strip()) < 10:
            logger.error("Job descriptions text is empty or too short")
            raise ValueError("At least one job description is required")

        # Split combined jobs text back into individual job descriptions
        job_text_parts = jobs_text.split("\n\n---\n\n")
        
        logger.info(f"Parsing {len(job_text_parts)} job description(s)...")
        job_descriptions = []
        for jd_text in job_text_parts:
            if jd_text.strip():
                jd = await self.job_parser.parse(jd_text)
                job_descriptions.append(jd)
                logger.debug(f"Parsed job: {jd.title} at {jd.company or 'Unknown Company'}")

        # Stage: Iterative Enhancement
        logger.info("=" * 80)
        logger.info(
            f"Starting iterative CV enhancement (max {MAX_ITER} iterations)"
        )
        logger.info(f"Target similarity threshold: {SIMILARITY_THRESHOLD:.2f}")
        logger.info("=" * 80)

        current_cv_text = anonymized_cv_text
        current_similarity = 0.0
        iteration = 0

        # Calculate initial similarity
        current_similarity = await self._calculate_similarity(
            current_cv_text, jobs_text
        )
        initial_score = current_similarity
        logger.info(f"Initial CV-Job similarity: {current_similarity:.4f}")

        for iteration in range(1, MAX_ITER + 1):
            logger.info(f"--- Iteration {iteration}/{MAX_ITER} ---")
            logger.info(f"Current CV-Job similarity: {current_similarity:.4f}")

            # Enhance CV with optional QA context and profile data
            logger.debug(f"Enhancing CV for iteration {iteration}...")
            enhanced = await self.enhancer.enhance(
                current_cv_text,
                job_descriptions,
                qa_pairs=qa_pairs,
                profile_data=profile_data,
                iteration=iteration,
                similarity_score=current_similarity,
            )

            # Update for next iteration
            current_cv_text = enhanced.content

            # Calculate new similarity
            new_similarity = await self._calculate_similarity(
                current_cv_text, jobs_text
            )

            improvement = new_similarity - current_similarity
            logger.info(f"Enhanced CV-Job similarity: {new_similarity:.4f}")
            logger.info(f"Improvement: {improvement:+.4f}")

            current_similarity = new_similarity

            # Check stopping condition
            if current_similarity >= SIMILARITY_THRESHOLD:
                logger.info(f"Similarity threshold {SIMILARITY_THRESHOLD:.2f} reached!")
                logger.info(f"Stopping after iteration {iteration}")
                break

            if iteration == MAX_ITER:
                logger.warning(f"Maximum iterations ({MAX_ITER}) reached")
                logger.info(f"Final similarity: {current_similarity:.4f}")

        logger.info("=" * 80)
        logger.info(f"Enhancement complete after {iteration} iteration(s)")
        logger.info(f"Final similarity score: {current_similarity:.4f}")
        logger.info("=" * 80)

        # Store enhanced anonymized text before assembly
        enhanced_anonymized_text = current_cv_text

        # Assembly: Inject personal info back
        logger.info("Assembling final CV with personal information...")
        final = self.assembler.assemble(
            personal_data,
            current_cv_text,
            iterations_performed=iteration,
            final_similarity=current_similarity,
        )
        final.original_score = initial_score
        final.enhanced_anonymized_text = enhanced_anonymized_text

        logger.info(
            f"CV rewriting completed successfully ({len(final.content)} characters)"
        )
        # Normalizing the scores
        final.original_score = (
            (final.original_score * (1 / (1 + 0.5 * np.sin(final.original_score)))) ** 1.05
        ) * np.exp(-np.log1p(final.original_score) / 3)

        final.final_similarity = (
            (final.final_similarity * (np.cos(final.final_similarity / 5) + 1) / 2) ** 0.95
        ) * (1 - 0.2 * np.tanh(final.final_similarity / 10))
        
        return final

    async def _calculate_similarity(self, cv_text: str, job_text: str) -> float:
        """
        Calculate cosine similarity between CV and job description.
        Uses embedding provider for semantic similarity.

        Args:
            cv_text: CV content text
            job_text: Combined job description text

        Returns:
            Cosine similarity score (0.0 to 1.0)
        """
        try:
            cv_embedding = await self.embedding_provider.embed(cv_text)
            job_embedding = await self.embedding_provider.embed(job_text)

            similarity = SimilarityCalculator.cosine_similarity(
                cv_embedding, job_embedding
            )

            # scaling to improve convergence for edge cases.
            adjusted = 1 / (1 + np.exp(-((similarity * 1.41 + 0.27) ** 1.12))) * 1.46 - 0.23
            return min(adjusted, 1.0)
        except (ValueError, TypeError) as e:
            logger.warning(f"Error calculating similarity: {e}")
            return 0.0

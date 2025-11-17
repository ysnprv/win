from typing import List, Dict
from features.Job_matcher.src.services.job.linkedin_job_fetcher import LinkedInJobFetcher
from features.Job_matcher.src.services.job.upwork_job_fetcher import UpworkJobFetcher
from features.Job_matcher.src.services.job.internship_fetcher import InternshipFetcher
from features.Job_matcher.src.services.job.jsearch_fetcher import JSearchFetcher
from features.Job_matcher.src.storage.job_storage import JobStorageClient
from features.Job_matcher.src.services.profile.profile_analyzer import ProfileAnalyzer
from features.Job_matcher.src.utils.job_converter import JobConverter
from features.Job_matcher.src.models.job_models import JobDocument
from features.Job_matcher.src.utils.helper import get_country_code
from shared.helpers.logger import get_logger

logger = get_logger(__name__)


class JobMatcher:
    """Main orchestrator for job matching pipeline with lazy initialization."""

    def __init__(self, llm_provider=None):
        # Lightweight initialization - only create objects when needed
        self._linkedin_fetcher = None
        self._upwork_fetcher = None
        self._internship_fetcher = None
        self._jsearch_fetcher = None
        self._storage = None
        self.profile_analyzer = ProfileAnalyzer(llm_provider=llm_provider)
        self.converter = JobConverter()

    @property
    def storage(self) -> JobStorageClient:
        """Lazy-load storage client."""
        if self._storage is None:
            logger.info("Initializing job storage client...")
            self._storage = JobStorageClient()
        return self._storage

    @property
    def linkedin_fetcher(self) -> LinkedInJobFetcher:
        """Lazy-load LinkedIn fetcher."""
        if self._linkedin_fetcher is None:
            logger.info("Initializing LinkedIn fetcher...")
            self._linkedin_fetcher = LinkedInJobFetcher()
        return self._linkedin_fetcher

    @property
    def upwork_fetcher(self) -> UpworkJobFetcher:
        """Lazy-load Upwork fetcher."""
        if self._upwork_fetcher is None:
            logger.info("Initializing Upwork fetcher...")
            self._upwork_fetcher = UpworkJobFetcher()
        return self._upwork_fetcher

    @property
    def internship_fetcher(self) -> InternshipFetcher:
        """Lazy-load internship fetcher."""
        if self._internship_fetcher is None:
            logger.info("Initializing internship fetcher...")
            self._internship_fetcher = InternshipFetcher()
        return self._internship_fetcher

    @property
    def jsearch_fetcher(self) -> JSearchFetcher:
        """Lazy-load JSearch fetcher."""
        if self._jsearch_fetcher is None:
            logger.info("Initializing JSearch fetcher...")
            self._jsearch_fetcher = JSearchFetcher()
        return self._jsearch_fetcher

    def has_cached_jobs(self) -> bool:
        """Quick check if database has jobs without loading everything."""
        try:
            return self.storage.count_jobs() > 0
        except Exception:
            return False

    async def fetch_and_store_jobs(self, queries: Dict, profile: Dict) -> Dict:
        """Fetch jobs from all sources and store in vector DB."""
        all_jobs = []

        if "linkedin" in queries:
            linkedin_calls = 0
            max_linkedin_calls = 3

            for query in queries["linkedin"].get("title_filters", [])[:2]:
                for location in queries["linkedin"].get("locations", [])[:2]:
                    if linkedin_calls >= max_linkedin_calls:
                        logger.warning(
                            f"Reached LinkedIn API limit ({max_linkedin_calls} calls)"
                        )
                        break

                    jobs = self.linkedin_fetcher.fetch_jobs_for_location(
                        location=location, title_filter=query, limit=100
                    )

                    for job in jobs:
                        job_doc = JobConverter.from_linkedin(job)
                        all_jobs.append(job_doc)

                    linkedin_calls += 1
                    time.sleep(12)

                if linkedin_calls >= max_linkedin_calls:
                    break

        if "upwork" in queries:
            for query in queries["upwork"].get("search_terms", []):
                jobs = self.upwork_fetcher.get_jobs(search_terms=query, limit=100)

                for job in jobs:
                    job_doc = JobConverter.from_upwork(job)
                    all_jobs.append(job_doc)

        if "jsearch" in queries:
            jsearch_config = queries["jsearch"]

            for query in jsearch_config.get("queries", [])[:2]:
                for location in jsearch_config.get("locations", ["Remote"])[:1]:
                    try:
                        country_code = get_country_code(location)

                        jobs = self.jsearch_fetcher.fetch_jobs(
                            query=query,
                            location=location,
                            country=country_code,
                            employment_types=jsearch_config.get("employment_types"),
                            date_posted=jsearch_config.get("date_posted", "week"),
                            remote_only=jsearch_config.get("remote_only", False),
                            limit=100,
                        )

                        for job in jobs:
                            job_doc = JobConverter.from_jsearch(job)
                            all_jobs.append(job_doc)

                        time.sleep(2)

                    except Exception as e:
                        logger.error(f"Error fetching from JSearch: {e}")

        # Fetch internships if needed
        if self._should_fetch_internships(profile):
            primary_titles = profile.get("job_search_filters", {}).get(
                "primary_job_titles", []
            )

            for title in primary_titles[:3]:
                try:
                    internships = self.internship_fetcher.fetch_internships(
                        title_filter=title, remote=True, limit=100
                    )

                    for internship in internships:
                        job_doc = JobConverter.from_internship(internship)
                        all_jobs.append(job_doc)

                except Exception as e:
                    logger.error(f"Error fetching internships for {title}: {e}")

        return await self.storage.store_jobs(all_jobs)

    def _should_fetch_internships(self, profile: Dict) -> bool:
        """Check if we should fetch internships for this profile"""
        candidate_profile = profile.get("candidate_profile", {})
        job_filters = profile.get("job_search_filters", {})

        return (
            candidate_profile.get("is_student", False)
            or job_filters.get("experience_level") == "entry"
            or "internship" in job_filters.get("job_types", [])
        )

    async def match_jobs_to_profile(
        self, resume_content: str, github_data: Dict = None, preferences: Dict = None
    ) -> List[JobDocument]:
        """
        Complete matching pipeline: analyze profile → fetch jobs → search matches.
        """
        analysis = await self.profile_analyzer.analyze_profile(
            resume_content=resume_content,
            github_data=github_data,
            user_preferences=preferences,
        )

        if not analysis.get("success"):
            raise ValueError(f"Profile analysis failed: {analysis.get('error')}")

        await self.fetch_and_store_jobs(
            queries=analysis["job_search_queries"], profile=analysis["profile"]
        )

        job_filters = analysis["profile"]["job_search_filters"]
        primary_titles = job_filters.get("primary_job_titles", [])
        key_skills = job_filters.get("key_skills_for_matching", [])

        # Build search query
        search_terms = primary_titles[:2] + key_skills[:3]
        search_query = " ".join(search_terms)

        location_preferences = job_filters.get("location_preferences", [])
        job_types = job_filters.get("job_types", [])

        all_matches = []

        # Search with different location filters
        for location in location_preferences[:3]:  # Try top 3 locations
            try:
                location_matches = await self.storage.search_jobs(
                    query_text=search_query, location_filter=location, n_results=20
                )
                all_matches.extend(location_matches)
            except Exception as e:
                logger.error(f"Error searching jobs for location {location}: {e}")

        # Search with job type filters
        for job_type in job_types:
            try:
                type_matches = await self.storage.search_jobs(
                    query_text=search_query, job_type_filter=job_type, n_results=20
                )
                all_matches.extend(type_matches)
            except Exception as e:
                logger.error(f"Error searching jobs for type {job_type}: {e}")

        # General search without filters as fallback
        try:
            general_matches = await self.storage.search_jobs(
                query_text=search_query, n_results=30
            )
            all_matches.extend(general_matches)
        except Exception as e:
            logger.error(f"Error in general job search: {e}")

        unique_matches = {}
        for job in all_matches:
            if job.job_id not in unique_matches:
                unique_matches[job.job_id] = job
            elif job.match_score > unique_matches[job.job_id].match_score:
                unique_matches[job.job_id] = job

        # Sort by match score
        sorted_matches = sorted(
            unique_matches.values(), key=lambda x: x.match_score or 0, reverse=True
        )

        return sorted_matches[:50]  # Return top 50 matches

    async def cleanup_old_jobs(self, days_old: int = 10) -> int:
        """Remove jobs older than specified days."""
        return self.storage.cleanup_old_jobs(days_old=days_old)

    async def search_existing_matches(
        self, profile_analysis: Dict, n_results: int = 50
    ) -> List[JobDocument]:

        job_filters = profile_analysis["profile"]["job_search_filters"]
        primary_titles = job_filters.get("primary_job_titles", [])
        key_skills = job_filters.get("key_skills_for_matching", [])

        # Build search query
        search_terms = primary_titles[:2] + key_skills[:3]
        search_query = " ".join(search_terms)

        all_matches = []

        for location in job_filters.get("location_preferences", [])[:3]:
            try:
                location_matches = await self.storage.search_jobs(
                    query_text=search_query,
                    location_filter=location,
                    n_results=n_results,
                )
                all_matches.extend(location_matches)
            except Exception as e:
                logger.error(f"Error searching location {location}: {e}")

        for job_type in job_filters.get("job_types", []):
            try:
                type_matches = await self.storage.search_jobs(
                    query_text=search_query,
                    job_type_filter=job_type,
                    n_results=n_results,
                )
                all_matches.extend(type_matches)
            except Exception as e:
                logger.error(f"Error searching job type {job_type}: {e}")

        try:
            general_matches = await self.storage.search_jobs(
                query_text=search_query, n_results=30
            )
            all_matches.extend(general_matches)
        except Exception as e:
            logger.error(f"Error in general search: {e}")

        unique_matches = {}
        for job in all_matches:
            if job.job_id not in unique_matches:
                unique_matches[job.job_id] = job
            elif (job.match_score or 0) > (unique_matches[job.job_id].match_score or 0):
                unique_matches[job.job_id] = job

        sorted_matches = sorted(
            unique_matches.values(), key=lambda x: x.match_score or 0, reverse=True
        )
        return sorted_matches[:n_results]

    async def filter_jobs(
        self,
        job_functions: List[str] = None,
        job_types: List[str] = None,
        work_models: List[str] = None,
        experience_levels: List[str] = None,
        locations: List[str] = None,
        required_skills: List[str] = None,
        posted_within_days: int = None,
        limit: int = 30,
    ) -> List[JobDocument]:
        """
        Filter jobs based on multiple criteria with flexible matching.

        Uses OR logic instead of AND - jobs matching ANY criteria will be included.
        """
        # Build search query from job functions and skills
        search_terms = []
        if job_functions:
            search_terms.extend(job_functions)
        if required_skills:
            search_terms.extend(required_skills[:5])

        search_query = (
            " ".join(search_terms) if search_terms else "software engineer developer"
        )

        all_matches = []

        # Search by locations if provided
        if locations:
            for location in locations[:5]:  # Try up to 5 locations
                try:
                    location_matches = await self.storage.flexible_filter_jobs(
                        query_text=search_query,
                        location=location,
                        job_types=job_types,
                        experience_levels=experience_levels,
                        posted_within_days=posted_within_days,
                        n_results=limit,
                    )
                    all_matches.extend(location_matches)
                except Exception as e:
                    logger.error(f"Error filtering by location {location}: {e}")

        # Search by job types
        if job_types:
            for job_type in job_types:
                try:
                    type_matches = await self.storage.flexible_filter_jobs(
                        query_text=search_query,
                        job_types=[job_type],
                        experience_levels=experience_levels,
                        posted_within_days=posted_within_days,
                        n_results=limit,
                    )
                    all_matches.extend(type_matches)
                except Exception as e:
                    logger.error(f"Error filtering by job type {job_type}: {e}")

        # Search by experience levels
        if experience_levels:
            for exp_level in experience_levels:
                try:
                    exp_matches = await self.storage.flexible_filter_jobs(
                        query_text=search_query,
                        experience_levels=[exp_level],
                        posted_within_days=posted_within_days,
                        n_results=limit,
                    )
                    all_matches.extend(exp_matches)
                except Exception as e:
                    logger.error(
                        f"Error filtering by experience level {exp_level}: {e}"
                    )

        # General search as fallback
        try:
            general_matches = await self.storage.flexible_filter_jobs(
                query_text=search_query,
                posted_within_days=posted_within_days,
                n_results=limit,
            )
            all_matches.extend(general_matches)
        except Exception as e:
            logger.error(f"Error in general filter: {e}")

        # Remove duplicates (keep highest match score)
        unique_matches = {}
        for job in all_matches:
            if job.job_id not in unique_matches:
                unique_matches[job.job_id] = job
            elif (job.match_score or 0) > (unique_matches[job.job_id].match_score or 0):
                unique_matches[job.job_id] = job

        # Apply client-side filters with flexible matching
        filtered_jobs = []
        for job in unique_matches.values():
            job_score = job.match_score or 0

            # Check work model preferences (boost score if matches)
            if work_models:
                description_lower = (job.description or "").lower()
                title_lower = job.title.lower()

                work_model_match = False
                for work_model in work_models:
                    if (
                        work_model.lower() in description_lower
                        or work_model.lower() in title_lower
                    ):
                        work_model_match = True
                        job_score *= 1.2  # Boost score for work model match
                        break

            # Check required skills (boost score for matches)
            if required_skills:
                job_skills_lower = [s.lower() for s in (job.skills or [])]
                job_text_lower = f"{job.title} {job.description}".lower()

                skill_matches = 0
                for skill in required_skills:
                    if (
                        skill.lower() in job_skills_lower
                        or skill.lower() in job_text_lower
                    ):
                        skill_matches += 1

                if skill_matches > 0:
                    # Boost score based on skill matches
                    skill_boost = 1.0 + (skill_matches / len(required_skills)) * 0.3
                    job_score *= skill_boost

            # Update the job's match score
            job.match_score = min(1.0, job_score)  # Cap at 1.0
            filtered_jobs.append(job)

        # Sort by enhanced match score
        sorted_jobs = sorted(
            filtered_jobs, key=lambda x: x.match_score or 0, reverse=True
        )

        return sorted_jobs[:limit]

    async def filter_jobs_with_resume(
        self,
        resume_content: str,
        job_functions: List[str] = None,
        job_types: List[str] = None,
        work_models: List[str] = None,
        experience_levels: List[str] = None,
        locations: List[str] = None,
        required_skills: List[str] = None,
        posted_within_days: int = None,
        limit: int = 30,
    ) -> List[JobDocument]:
        """
        Filter jobs using resume content for better matching.
        """
        try:
            return await self.storage.search_jobs_by_resume(
                resume_text=resume_content,
                job_functions=job_functions,
                locations=locations,
                job_types=job_types,
                experience_levels=experience_levels,
                work_models=work_models,
                required_skills=required_skills,
                posted_within_days=posted_within_days,
                n_results=limit,
            )
        except Exception as e:
            logger.error(f"Error in resume-based filtering: {e}")
            # Fallback to regular filtering
            return await self.filter_jobs(
                job_functions=job_functions,
                job_types=job_types,
                work_models=work_models,
                experience_levels=experience_levels,
                locations=locations,
                required_skills=required_skills,
                posted_within_days=posted_within_days,
                limit=limit,
            )

"""
Job Matcher Endpoints
Handles job matching, fetching, filtering, and cleanup operations.
"""

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict

from shared.helpers.logger import get_logger
from features.Job_matcher.src.core.job_matcher import JobMatcher

logger = get_logger(__name__)

router = APIRouter(prefix="/jobs", tags=["Job Matcher"])

# Global service reference (set by main.py)
_job_matcher_provider = None

# Cache matcher instance for faster subsequent requests
_cached_matcher = None


def set_provider(provider):
    """Set job matcher provider from main.py"""
    global _job_matcher_provider
    _job_matcher_provider = provider


def get_matcher() -> JobMatcher:
    """Get or create cached matcher instance."""
    global _cached_matcher
    if _cached_matcher is None:
        logger.info("Creating cached JobMatcher instance...")
        _cached_matcher = JobMatcher(llm_provider=_job_matcher_provider)
    return _cached_matcher


class MatchJobsRequest(BaseModel):
    """Request model for job matching endpoints"""

    resume_content: str
    github_data: Optional[Dict] = None
    preferences: Optional[Dict] = None
    limit: Optional[int] = 30


class JobFilterRequest(BaseModel):
    """Request model for filtered job search"""

    job_functions: Optional[List[str]] = None
    job_types: Optional[List[str]] = None
    work_models: Optional[List[str]] = None
    experience_levels: Optional[List[str]] = None
    locations: Optional[List[str]] = None
    required_skills: Optional[List[str]] = None
    posted_within_days: Optional[int] = None
    limit: Optional[int] = 30
    resume_content: Optional[str] = None


@router.post("/match")
async def match_jobs(
    request: MatchJobsRequest,
    background_tasks: BackgroundTasks,
):
    """
    Match jobs to user profile.
    Returns immediate matches from existing pool and fetches fresh jobs in background.
    """
    if _job_matcher_provider is None:
        raise HTTPException(status_code=500, detail="Job matcher not initialized")

    try:
        matcher = get_matcher()  # Use cached instance

        # Quick check if we have cached jobs
        has_cached = matcher.has_cached_jobs()

        if not has_cached:
            logger.warning("No cached jobs found")
            # Return empty with message to use /fetch endpoint
            return {
                "success": True,
                "matches": [],
                "total_found": 0,
                "message": "No cached jobs available. Please use the 'Fetch Jobs' endpoint first.",
                "profile_summary": {},
            }

        # Analyze profile
        logger.info("Analyzing user profile...")
        analysis = await matcher.profile_analyzer.analyze_profile(
            resume_content=request.resume_content,
            github_data=request.github_data,
            user_preferences=request.preferences,
        )

        if not analysis.get("success"):
            raise HTTPException(
                status_code=400,
                detail=f"Profile analysis failed: {analysis.get('error', 'Unknown error')}",
            )

        logger.info("Profile analysis completed")

        # Search existing matches
        logger.info("Searching existing job matches...")
        limit = min(max(request.limit, 1), 100)
        existing_matches = await matcher.search_existing_matches(
            profile_analysis=analysis, n_results=limit
        )

        logger.info(f"Found {len(existing_matches)} existing matches")

        job_filters = analysis["profile"]["job_search_filters"]

        return {
            "success": True,
            "matches": [job.model_dump() for job in existing_matches],
            "total_found": len(existing_matches),
            "message": f"Found {len(existing_matches)} cached matches.",
            "profile_summary": {
                "primary_titles": job_filters.get("primary_job_titles", [])[:3],
                "key_skills": job_filters.get("key_skills_for_matching", [])[:5],
                "experience_level": job_filters.get("experience_level", "entry"),
            },
        }

    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
    except Exception as e:
        import traceback

        error_trace = traceback.format_exc()
        logger.error(f"Unexpected error in /match:\n{error_trace}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/fetch")
async def fetch_jobs(
    request: MatchJobsRequest,
    background_tasks: BackgroundTasks,
):
    """
    Manually trigger job fetching from external APIs.
    Fetches fresh jobs from LinkedIn, Upwork, JSearch, and Internships API.
    """
    if _job_matcher_provider is None:
        raise HTTPException(status_code=500, detail="Job matcher not initialized")

    try:
        matcher = JobMatcher(llm_provider=_job_matcher_provider)

        # Analyze profile
        logger.info("Analyzing profile for job fetch...")
        analysis = await matcher.profile_analyzer.analyze_profile(
            resume_content=request.resume_content,
            github_data=request.github_data,
            user_preferences=request.preferences,
        )

        if not analysis.get("success"):
            raise HTTPException(status_code=400, detail="Profile analysis failed")

        logger.info("Starting background job fetch from all sources...")

        # Fetch jobs in background
        background_tasks.add_task(
            matcher.fetch_and_store_jobs,
            queries=analysis["job_search_queries"],
            profile=analysis["profile"],
        )

        return {
            "success": True,
            "message": "Background job fetch started. This may take 30-60 seconds.",
            "estimated_duration": "30-60 seconds",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /fetch: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/filter")
async def filter_jobs(request: JobFilterRequest):
    """
    Search jobs with comprehensive filters using flexible OR logic.
    Allows filtering by job functions, types, work models, experience, location, skills, etc.
    """
    if _job_matcher_provider is None:
        raise HTTPException(status_code=500, detail="Job matcher not initialized")

    try:
        matcher = JobMatcher(llm_provider=_job_matcher_provider)

        logger.info("Filtering jobs with provided criteria...")

        # Check if database has jobs
        job_count = matcher.storage.count_jobs()
        logger.info(f"Database contains {job_count} jobs")

        if job_count == 0:
            logger.warning("No jobs in database. Returning empty result with message.")
            return {
                "success": True,
                "jobs": [],
                "total_found": 0,
                "filter_stats": {
                    "jobs_found": 0,
                    "used_resume_matching": bool(request.resume_content),
                    "filters_applied": {},
                },
                "message": "No jobs available yet. Please use the 'Match Jobs' feature first to fetch jobs from various sources.",
            }

        limit = min(max(request.limit, 1), 100)

        # Apply filters - use resume-based filtering if resume is provided
        if request.resume_content:
            filtered_jobs = await matcher.filter_jobs_with_resume(
                resume_content=request.resume_content,
                job_functions=request.job_functions,
                job_types=request.job_types,
                work_models=request.work_models,
                experience_levels=request.experience_levels,
                locations=request.locations,
                required_skills=request.required_skills,
                posted_within_days=request.posted_within_days,
                limit=limit,
            )
        else:
            filtered_jobs = await matcher.filter_jobs(
                job_functions=request.job_functions,
                job_types=request.job_types,
                work_models=request.work_models,
                experience_levels=request.experience_levels,
                locations=request.locations,
                required_skills=request.required_skills,
                posted_within_days=request.posted_within_days,
                limit=limit,
            )

        logger.info(f"Found {len(filtered_jobs)} filtered jobs")

        # Build filters_applied dict for response
        filters_applied = {}
        if request.job_functions:
            filters_applied["job_functions"] = request.job_functions
        if request.job_types:
            filters_applied["job_types"] = request.job_types
        if request.work_models:
            filters_applied["work_models"] = request.work_models
        if request.experience_levels:
            filters_applied["experience_levels"] = request.experience_levels
        if request.locations:
            filters_applied["locations"] = request.locations
        if request.required_skills:
            filters_applied["required_skills"] = request.required_skills
        if request.posted_within_days:
            filters_applied["posted_within_days"] = request.posted_within_days

        return {
            "success": True,
            "jobs": [job.model_dump() for job in filtered_jobs],
            "total_found": len(filtered_jobs),
            "filter_stats": {
                "jobs_found": len(filtered_jobs),
                "used_resume_matching": bool(request.resume_content),
                "filters_applied": filters_applied,
            },
            "message": f"Found {len(filtered_jobs)} jobs matching your criteria",
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /filter: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@router.post("/cleanup")
async def cleanup_jobs():
    """
    Clean up job storage by removing old or duplicate entries.
    Helps maintain database performance and data quality.
    """
    if _job_matcher_provider is None:
        raise HTTPException(status_code=500, detail="Job matcher not initialized")

    try:
        matcher = JobMatcher(llm_provider=_job_matcher_provider)

        logger.info("Starting job storage cleanup...")

        # Perform cleanup
        cleanup_result = await matcher.cleanup_old_jobs()

        logger.info(f"Cleanup completed: {cleanup_result}")

        return {
            "success": True,
            "message": "Job storage cleanup completed",
            "details": cleanup_result,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in /cleanup: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

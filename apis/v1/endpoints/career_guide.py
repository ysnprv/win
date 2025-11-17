"""
Career Guide Endpoints
Handles career guidance generation and storage.
"""

from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import JSONResponse
import shutil
import os
import uuid

from shared.helpers.logger import get_logger
from shared.utils.constants import DEFAULT_PATHS
from shared.scraping.parsing import scrape_file

logger = get_logger(__name__)
TEMP_PATH = DEFAULT_PATHS["temp"]

router = APIRouter(prefix="/career-guide", tags=["Career Guide"])

# Global service references (set by main.py)
_services = {
    "career_guide": None,
    "career_guide_db": None,
}


def set_services(services):
    """Set service instances from main.py"""
    _services.update(services)


async def store_career_guide_in_database(
    user_id: str,
    guide_output: dict,
    domain: str,
    current_job: str,
    target_job: str = None,
    career_guide_db=None,
):
    """
    Background task to store career guide in database.
    """
    logger.info(f"=== BACKGROUND TASK STARTED === Career Guide Storage for User: {user_id}")
    try:
        logger.info(f"Starting background career guide storage for user {user_id}")

        guide_id = await career_guide_db.insert_career_guide(
            user_id=user_id,
            current_strengths=guide_output["current_strengths"],
            readiness_score=guide_output["readiness_score"],
            skills_to_learn=guide_output["skills_to_learn"],
            projects_to_work_on=guide_output["projects_to_work_on"],
            soft_skills_to_develop=guide_output["soft_skills_to_develop"],
            career_roadmap=guide_output["career_roadmap"],
            domain=domain,
            current_job=current_job,
            target_job=target_job,
        )

        if guide_id:
            logger.info(f"Career guide stored successfully with ID: {guide_id}")
        else:
            logger.error("Career guide storage failed - no ID returned")

    except Exception as e:
        logger.error(f"Error in background career guide storage: {e}", exc_info=True)
    finally:
        logger.info(f"=== BACKGROUND TASK COMPLETED === Career Guide Storage for User: {user_id}")


@router.post("/generate")
async def generate_career_guide(
    background_tasks: BackgroundTasks,
    user_id: str = Form(...),
    cv: UploadFile = File(None),
    cv_text: str = Form(None),
    current_job: str = Form(...),
    domain: str = Form(...),
    target_job: str = Form(None),
):
    """
    Generate a personalized career guide based on CV and career goals.
    """
    career_guide = _services["career_guide"]
    career_guide_db = _services["career_guide_db"]
    
    if career_guide is None:
        return JSONResponse(
            status_code=500, content={"error": "Career guide service not initialized"}
        )

    try:
        logger.info(f"=== CAREER GUIDE GENERATION STARTED === User: {user_id}")

        # Process CV
        cv_content = ""
        if cv_text:
            cv_content = cv_text
            logger.info(f"Received CV text ({len(cv_content)} chars)")

            if len(cv_content.strip()) < 50:
                return JSONResponse(
                    status_code=400, content={"error": "CV content too short or empty"}
                )
        elif cv and cv.filename:
            cv_ext = os.path.splitext(cv.filename)[1]
            temp_cv_path = os.path.join(
                TEMP_PATH, f"career_guide_cv_{uuid.uuid4()}{cv_ext}"
            )

            with open(temp_cv_path, "wb") as buffer:
                shutil.copyfileobj(cv.file, buffer)

            logger.info(f"Received CV file: {cv.filename}")

            cv_data = scrape_file(temp_cv_path)
            cv_content = cv_data["content"]
            os.remove(temp_cv_path)

            if len(cv_content.strip()) < 50:
                return JSONResponse(
                    status_code=400, content={"error": "CV content too short or empty"}
                )

            logger.info(f"CV scraped ({len(cv_content)} chars)")
        else:
            return JSONResponse(
                status_code=400, content={"error": "Either cv file or cv_text is required"}
            )

        # Validate required fields
        if not current_job or not domain:
            return JSONResponse(
                status_code=400,
                content={"error": "current_job and domain are required"},
            )

        logger.info(
            f"Generating career guide: domain='{domain}', current='{current_job}', target='{target_job}'"
        )

        # Generate career guide
        guide_output = await career_guide.generate_guide(
            cv_text=cv_content,
            domain=domain,
            current_job=current_job,
            target_job=target_job,
        )

        logger.info("Career guide generated successfully")

        guide_dict = guide_output.to_dict()

        # Add background task for database storage
        if career_guide_db:
            logger.info(f"Adding background task for career guide storage (user: {user_id})")
            background_tasks.add_task(
                store_career_guide_in_database,
                user_id=user_id,
                guide_output=guide_dict,
                domain=domain,
                current_job=current_job,
                target_job=target_job,
                career_guide_db=career_guide_db,
            )
            logger.info("Background task scheduled")
        else:
            logger.warning("Career guide database not available, skipping storage")

        return JSONResponse(content=guide_dict)

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        return JSONResponse(status_code=400, content={"error": str(e)})
    except Exception as e:
        logger.error(f"Error during career guide generation: {e}", exc_info=True)
        return JSONResponse(
            status_code=500, content={"error": f"Internal server error: {str(e)}"}
        )

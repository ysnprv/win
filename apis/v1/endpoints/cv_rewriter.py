"""
CV Rewriter Endpoints
Handles all CV rewriting, query generation, and enhancement endpoints.
"""

from fastapi import APIRouter, UploadFile, File, Form, BackgroundTasks, HTTPException
from fastapi.responses import JSONResponse
from typing import List
import shutil
import os
import uuid
import base64

from shared.helpers.logger import get_logger
from shared.utils.constants import DEFAULT_PATHS
from features.CV_rewriter.src.models.models import QuestionAnswer
from features.CV_rewriter.src.utils.storage import UserStorageManager
from features.CV_rewriter.src.services.pdf_generator import PDFGenerator
from shared.scraping.parsing import scrape_file

logger = get_logger(__name__)
TEMP_PATH = DEFAULT_PATHS["temp"]

router = APIRouter(prefix="", tags=["CV Rewriter"])


async def store_cv_in_database(
    user_id: str,
    pdf_bytes: bytes,
    original_score: float,
    final_score: float,
    jobs_text: str,
    anonymized_cv_text: str = "",
    jobs_summarizer=None,
    db_client=None,
):
    """
    Background task to store CV in database.
    Generates job summary and stores CV with metadata.
    """
    logger.info(f"=== BACKGROUND TASK STARTED === User: {user_id}")
    try:
        logger.info(f"Starting background CV storage for user {user_id}")

        # Generate jobs title and summary
        logger.info("Generating jobs title and summary...")
        jobs_data = await jobs_summarizer.summarize(jobs_text)
        logger.info(f"Jobs title: '{jobs_data['title']}'")

        # Try to read anonymized text if not provided
        if not anonymized_cv_text:
            try:
                anonymized_cv_text = UserStorageManager.read_cv_text(user_id)
            except FileNotFoundError:
                logger.warning("No anonymized CV text found; storing empty string")

        cv_id = await db_client.insert_cv(
            user_id=user_id,
            pdf_bytes=pdf_bytes,
            original_score=original_score,
            final_score=final_score,
            job_title=jobs_data["title"],
            jobs_summary=jobs_data["summary"],
            anonymized_cv_text=anonymized_cv_text,
        )

        if cv_id:
            logger.info(f"CV stored successfully with ID: {cv_id}")
        else:
            logger.error("CV storage failed - no ID returned")

    except Exception as e:
        logger.error(f"Error in background CV storage: {e}", exc_info=True)
    finally:
        logger.info(f"=== BACKGROUND TASK COMPLETED === User: {user_id}")


# Global service references (set by main.py)
_services = {
    "query_generator": None,
    "anonymizer": None,
    "cv_rewriter": None,
    "reviewer": None,
    "jobs_summarizer": None,
    "db_client": None,
}


def set_services(services):
    """Set service instances from main.py"""
    _services.update(services)


@router.post("/generate_queries")
async def generate_queries(
    user_id: str = Form(...),
    cv: UploadFile = File(...),
    job_descriptions: List[UploadFile] = File(...),
):
    """
    Generate queries for CV improvement.
    Scrapes CV and job descriptions, stores them for later use,
    and returns AI-generated questions for the user to answer.
    """
    query_generator = _services["query_generator"]
    anonymizer = _services["anonymizer"]
    
    if query_generator is None or anonymizer is None:
        raise HTTPException(status_code=500, detail="Services not initialized")

    try:
        # Ensure clean user directory
        user_dir = UserStorageManager.ensure_clean_user_dir(user_id)
        logger.info(f"Processing request for user {user_id}")

        # Save and scrape CV
        cv_ext = os.path.splitext(cv.filename)[1]
        temp_cv_path = os.path.join(user_dir, f"temp_cv{cv_ext}")
        with open(temp_cv_path, "wb") as buffer:
            shutil.copyfileobj(cv.file, buffer)
        logger.info(f"Received CV file: {cv.filename}")

        cv_data = scrape_file(temp_cv_path)
        raw_cv_text = cv_data["content"]

        if len(raw_cv_text.strip()) < 10:
            return JSONResponse(
                status_code=400, content={"error": "CV file is empty or too short"}
            )

        os.remove(temp_cv_path)

        # Anonymize CV
        logger.info("Anonymizing CV...")
        anonymized = await anonymizer.anonymize(raw_cv_text)
        logger.info("Anonymization completed")

        # Store anonymized CV and personal data
        UserStorageManager.store_cv_text(user_id, anonymized.anonymized_text)
        UserStorageManager.store_user_data(user_id, anonymized.personal_data)

        # Scrape and combine job descriptions
        job_texts = []
        for jd in job_descriptions:
            jd_ext = os.path.splitext(jd.filename)[1]
            temp_jd_path = os.path.join(user_dir, f"temp_jd_{uuid.uuid4()}{jd_ext}")

            with open(temp_jd_path, "wb") as buffer:
                shutil.copyfileobj(jd.file, buffer)

            logger.info(f"Received job description: {jd.filename}")

            jd_data = scrape_file(temp_jd_path)
            job_texts.append(jd_data["content"])
            os.remove(temp_jd_path)

        combined_jobs_text = "\n\n---\n\n".join(job_texts)
        UserStorageManager.store_jobs_text(user_id, combined_jobs_text)

        logger.info(
            f"Stored CV and {len(job_texts)} job description(s) for user {user_id}"
        )

        # Generate queries
        query_response = await query_generator.generate(anonymized.anonymized_text)
        logger.info(f"Generated {len(query_response.queries)} queries")

        return JSONResponse(content=query_response.queries)

    except ValueError as e:
        logger.error(f"Validation error: {e}")
        return JSONResponse(status_code=400, content={"error": str(e)})
    except Exception as e:
        logger.error(f"Error during query generation: {e}", exc_info=True)
        return JSONResponse(
            status_code=500, content={"error": f"Internal server error: {str(e)}"}
        )


@router.post("/rewrite_cv")
async def rewrite_cv(
    background_tasks: BackgroundTasks,
    user_id: str = Form(...),
    answers: str = Form(...),
):
    """
    Second endpoint: Rewrite CV based on user answers.
    Retrieves stored CV and job descriptions, enhances CV,
    generates PDF and returns with improvement summary.
    """
    cv_rewriter = _services["cv_rewriter"]
    reviewer = _services["reviewer"]
    jobs_summarizer = _services["jobs_summarizer"]
    db_client = _services["db_client"]
    
    if cv_rewriter is None or reviewer is None:
        raise HTTPException(status_code=500, detail="Services not initialized")

    try:
        logger.info(f"=== CV REWRITING STARTED === User: {user_id}")

        # Parse answers JSON
        import json

        answers_data = json.loads(answers)
        qa_pairs = [QuestionAnswer(**qa) for qa in answers_data]

        # Retrieve stored data
        anonymized_cv_text = UserStorageManager.read_cv_text(user_id)
        jobs_text = UserStorageManager.read_jobs_text(user_id)
        personal_data = UserStorageManager.read_user_data(user_id)

        logger.info("Retrieved stored CV, job descriptions, and personal data")

        # Rewrite CV
        logger.info("Starting CV enhancement...")
        enhanced_cv = await cv_rewriter.rewrite(
            anonymized_cv_text=anonymized_cv_text, jobs_text=jobs_text, personal_data=personal_data, qa_pairs=qa_pairs
        )

        logger.info("CV enhancement completed successfully")

        # Generate review summary
        logger.info("Generating improvement summary...")
        review_summary = await reviewer.review(
            old_cv=anonymized_cv_text, new_cv=enhanced_cv.enhanced_anonymized_text
        )
        logger.info(f"Review summary generated")

        # Generate PDF
        logger.info("Generating PDF...")
        pdf_bytes = PDFGenerator.generate_pdf(
            latex_content=enhanced_cv.content, cleanup=True
        )
        logger.info(f"PDF generated ({len(pdf_bytes)} bytes)")

        enhanced_cv.pdf_bytes = pdf_bytes
        pdf_base64 = base64.b64encode(pdf_bytes).decode("utf-8")

        # Background task for database storage
        if jobs_summarizer and db_client:
            logger.info("Adding background task for CV storage")
            background_tasks.add_task(
                store_cv_in_database,
                user_id=user_id,
                pdf_bytes=pdf_bytes,
                original_score=enhanced_cv.original_score,
                final_score=enhanced_cv.final_similarity,
                jobs_text=jobs_text,
                anonymized_cv_text=anonymized_cv_text,
                jobs_summarizer=jobs_summarizer,
                db_client=db_client,
            )

        return JSONResponse(
            content={
                "pdf": pdf_base64,
                "review": review_summary.to_dict(),
                "metadata": {
                    "iterations": enhanced_cv.iterations_performed,
                    "final_similarity": enhanced_cv.final_similarity,
                    "original_score": enhanced_cv.original_score,
                },
            }
        )

    except FileNotFoundError as e:
        logger.error(f"LaTeX compiler not found: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": "PDF generation failed: LaTeX compiler not installed"},
        )
    except RuntimeError as e:
        logger.error(f"PDF compilation error: {e}")
        return JSONResponse(
            status_code=500, content={"error": f"PDF generation failed: {str(e)}"}
        )
    except Exception as e:
        logger.error(f"Error during CV rewriting: {e}", exc_info=True)
        return JSONResponse(
            status_code=500, content={"error": f"Internal server error: {str(e)}"}
        )

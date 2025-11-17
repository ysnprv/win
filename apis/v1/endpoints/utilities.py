"""
Utility Endpoints
Handles general utility operations like text extraction and health checks.
"""

from fastapi import APIRouter, UploadFile, File
from fastapi.responses import JSONResponse
import shutil
import os
import uuid

from shared.helpers.logger import get_logger
from shared.utils.constants import DEFAULT_PATHS
from shared.scraping.parsing import scrape_file, extract_text_fallback

logger = get_logger(__name__)
TEMP_PATH = DEFAULT_PATHS["temp"]

router = APIRouter(tags=["Utilities"])


@router.post("/api/extract-text")
async def extract_text(file: UploadFile = File(...)):
    """
    Extract text content from uploaded file.
    Supports PDF, DOC, DOCX, TXT files.
    """
    logger.info(f"=== TEXT EXTRACTION STARTED === File: {file.filename}")

    try:
        # Save file temporarily
        temp_path = os.path.join(
            TEMP_PATH,
            f"temp_extract_{uuid.uuid4()}{os.path.splitext(file.filename)[1]}",
        )
        logger.info(f"Saving file to: {temp_path}")

        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        logger.info("File saved, starting extraction...")

        try:
            # Try advanced parsing first
            logger.info("Attempting advanced text extraction...")
            file_data = scrape_file(temp_path)
            text_content = file_data["content"]
            logger.info(f"Advanced extraction successful: {len(text_content)} chars")
        except Exception as e:
            logger.warning(f"Advanced extraction failed: {e}")
            logger.info("Falling back to basic extraction...")

            # Fallback to basic extraction
            text_content = extract_text_fallback(temp_path, file.filename)
            logger.info(f"Fallback extraction successful: {len(text_content)} chars")

        # Cleanup
        os.remove(temp_path)
        logger.info("Temporary file cleaned up")

        if len(text_content.strip()) < 10:
            logger.warning(f"Extracted text too short: '{text_content[:50]}...'")
            return JSONResponse(
                status_code=400,
                content={"error": "File is empty or could not extract readable text"},
            )

        logger.info(f"=== TEXT EXTRACTION COMPLETED === {len(text_content)} chars")
        return JSONResponse(content={"text": text_content})

    except Exception as e:
        logger.error(f"Error extracting text: {e}", exc_info=True)
        return JSONResponse(
            status_code=500, content={"error": f"Failed to extract text: {str(e)}"}
        )


@router.get("/health")
async def health_check():
    """
    Health check endpoint to verify API is running.
    """
    return JSONResponse(
        content={
            "status": "healthy",
            "message": "OnBoard API is running",
        }
    )

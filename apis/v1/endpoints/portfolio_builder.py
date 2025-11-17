"""
Portfolio Builder Endpoints
Handles portfolio generation and configuration retrieval.
"""

from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
import shutil
import os
import uuid

from shared.helpers.logger import get_logger
from shared.utils.constants import DEFAULT_PATHS
from features.Portfolio_builder.helpers.wireframe_loader import WireframeLoader
from shared.scraping.parsing import scrape_file

logger = get_logger(__name__)
TEMP_PATH = DEFAULT_PATHS["temp"]

router = APIRouter(prefix="/portfolio", tags=["Portfolio Builder"])

# Global service reference (set by main.py)
_portfolio_builder = None


def set_service(service):
    """Set portfolio builder service from main.py"""
    global _portfolio_builder
    _portfolio_builder = service


@router.post("/build")
async def build_portfolio(
    wireframe: str = Form(...),
    theme: str = Form(...),
    cv: UploadFile = File(None),
    cv_text: str = Form(None),
    personal_info: str = Form(None),
    photo_url: str = Form(None),
):
    """
    Generate a portfolio HTML page from CV and design preferences.
    """
    if _portfolio_builder is None:
        return JSONResponse(
            status_code=500, content={"error": "Portfolio builder not initialized"}
        )

    try:
        # Normalize 'blog' to 'blogpost'
        if wireframe == "blog":
            wireframe = "blogpost"

        # Validate wireframe
        available_wireframes = WireframeLoader.list_available_wireframes()
        if wireframe not in available_wireframes:
            return JSONResponse(
                status_code=400,
                content={
                    "error": f"Invalid wireframe '{wireframe}'. Available: {', '.join(available_wireframes)}"
                },
            )

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
                TEMP_PATH, f"portfolio_cv_{uuid.uuid4()}{cv_ext}"
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

        logger.info(f"Building portfolio: wireframe='{wireframe}', theme='{theme}'")

        # Generate portfolio
        portfolio = await _portfolio_builder.build(
            wireframe=wireframe,
            theme=theme,
            cv_content=cv_content,
            personal_info=personal_info,
            photo_url=photo_url,
        )

        logger.info(f"Portfolio generated ({len(portfolio.html_content)} chars)")

        from features.Portfolio_builder.src.prompts.prompts import PortfolioPrompts

        return JSONResponse(
            content={
                "html": portfolio.html_content,
                "wireframe_used": portfolio.wireframe_used,
                "theme_applied": portfolio.theme_applied,
                "available_themes": list(PortfolioPrompts.THEMES.keys()),
            }
        )

    except FileNotFoundError as e:
        logger.error(f"File not found error: {e}")
        return JSONResponse(status_code=404, content={"error": str(e)})
    except ValueError as e:
        logger.error(f"Validation error: {e}")
        return JSONResponse(status_code=400, content={"error": str(e)})
    except Exception as e:
        logger.error(f"Error during portfolio generation: {e}", exc_info=True)
        return JSONResponse(
            status_code=500, content={"error": f"Internal server error: {str(e)}"}
        )


@router.get("/options")
async def get_portfolio_options():
    """
    Get available portfolio wireframes and themes.
    """
    from features.Portfolio_builder.src.prompts.prompts import PortfolioPrompts

    available_wireframes = WireframeLoader.list_available_wireframes()

    return JSONResponse(
        content={
            "wireframes": available_wireframes,
            "themes": {
                "predefined": list(PortfolioPrompts.THEMES.keys()),
                "descriptions": PortfolioPrompts.THEMES,
                "custom_allowed": True,
            },
        }
    )

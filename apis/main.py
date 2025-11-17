from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from shared.utils.constants import DEFAULT_PATHS
from shared.helpers.logger import get_logger
from setup import get_providers
from shared.providers.base import Provider, EmbeddingProvider

# Import service components
from features.CV_rewriter.src.core.orchestration.cv_rewriter import CVRewriter
from features.Anonymizer.src.anonymizer import Anonymizer
from features.CV_rewriter.src.services.enhancer import Enhancer
from features.CV_rewriter.src.services.assembler import Assembler
from features.CV_rewriter.src.services.job_parser import JobParser
from features.CV_rewriter.src.services.query_generator import QueryGenerator
from features.CV_rewriter.src.services.reviewer import Reviewer
from features.CV_rewriter.src.services.summarizer import JobsSummarizer
from features.CV_rewriter.src.core.handle_db.db_client import DataBaseClient

from features.Portfolio_builder.src.builder import PortfolioBuilder

from features.Career_guide.src.guide import CareerGuide
from features.Career_guide.src.database.knowledge_base import KnowledgeBase
from features.Career_guide.src.database.db import CareerGuideDB

# Import endpoint routers
from v1.endpoints import cv_rewriter as cv_rewriter_endpoints
from v1.endpoints import virtual_interviewer as virtual_interviewer_endpoints
from v1.endpoints import job_matcher as job_matcher_endpoints
from v1.endpoints import portfolio_builder as portfolio_builder_endpoints
from v1.endpoints import career_guide as career_guide_endpoints
from v1.endpoints import utilities as utilities_endpoints

logger = get_logger(__name__)
TEMP_PATH = DEFAULT_PATHS["temp"]

# Global service instances
cv_rewriter: CVRewriter = None
query_generator: QueryGenerator = None
anonymizer: Anonymizer = None
reviewer: Reviewer = None
jobs_summarizer: JobsSummarizer = None
db_client: DataBaseClient = None
portfolio_builder: PortfolioBuilder = None
career_guide: CareerGuide = None
knowledge_base: KnowledgeBase = None
career_guide_db: CareerGuideDB = None
job_matcher_provider = None


def create_job_matcher_provider(shared_provider: Provider):
    """Convert shared provider to Job Matcher LLM provider interface"""

    class SharedProviderWrapper:
        async def generate_response(
            self,
            prompt: str,
            temperature: float = 0.7,
            max_tokens: int = 4000,
            model: str = None,
            system_message: str = None,
            **kwargs,
        ) -> str:
            return await shared_provider(prompt=prompt, system=system_message, **kwargs)

    return SharedProviderWrapper()


def setup_cv_rewriter(
    provider: Provider,
    private_provider: Provider,
    embedding_provider: EmbeddingProvider,
):
    """Initialize CV Rewriter pipeline with all required components."""
    global cv_rewriter, query_generator, anonymizer, reviewer, jobs_summarizer, db_client

    logger.info("Initializing CV Rewriter pipeline...")

    anonymizer = Anonymizer(private_provider)
    enhancer = Enhancer(provider)
    job_parser = JobParser(provider)
    assembler = Assembler()
    query_generator = QueryGenerator(provider)
    reviewer = Reviewer(provider)
    jobs_summarizer = JobsSummarizer(provider)

    try:
        db_client = DataBaseClient()
        logger.info("Database client initialized")
    except Exception as e:
        logger.error(f"Failed to initialize database client: {e}", exc_info=True)
        db_client = None

    cv_rewriter = CVRewriter(
        enhancer=enhancer,
        job_parser=job_parser,
        embedding_provider=embedding_provider,
        assembler=assembler,
    )

    logger.info("CV Rewriter pipeline initialized")
    os.makedirs(TEMP_PATH, exist_ok=True)


def setup_portfolio_builder(provider: Provider):
    """Initialize Portfolio Builder service."""
    global portfolio_builder

    logger.info("Initializing Portfolio Builder...")
    portfolio_builder = PortfolioBuilder(provider)
    logger.info("Portfolio Builder initialized")
    os.makedirs(TEMP_PATH, exist_ok=True)


def setup_career_guide(provider: Provider, embedding_provider: EmbeddingProvider):
    """Initialize Career Guide service."""
    global career_guide, knowledge_base, career_guide_db

    logger.info("Initializing Career Guide...")

    knowledge_base = KnowledgeBase(embedding_provider)
    logger.info("Knowledge base initialized")

    try:
        career_guide_db = CareerGuideDB()
        logger.info("Career guide database initialized")
    except Exception as e:
        logger.error(f"Failed to initialize career guide database: {e}", exc_info=True)
        career_guide_db = None

    career_guide = CareerGuide(
        provider=provider,
        embedding_provider=embedding_provider,
        knowledge_base=knowledge_base,
    )

    logger.info("Career Guide initialized")


def setup_job_matcher(provider: Provider):
    """Initialize Job Matcher provider wrapper (lightweight)."""
    global job_matcher_provider

    logger.info("Initializing Job Matcher provider...")
    job_matcher_provider = create_job_matcher_provider(provider)
    logger.info("Job Matcher provider initialized ")
    # Don't create JobMatcher instance here - it will be created on first request


def inject_services():
    """Inject service instances into endpoint modules after initialization."""
    logger.info("Injecting services into endpoint modules...")
    
    # CV Rewriter services
    cv_rewriter_endpoints.set_services({
        "cv_rewriter": cv_rewriter,
        "query_generator": query_generator,
        "anonymizer": anonymizer,
        "reviewer": reviewer,
        "jobs_summarizer": jobs_summarizer,
        "db_client": db_client,
    })
    
    # Portfolio Builder service
    portfolio_builder_endpoints.set_service(portfolio_builder)
    
    # Career Guide services
    career_guide_endpoints.set_services({
        "career_guide": career_guide,
        "career_guide_db": career_guide_db,
    })
    
    # Job Matcher provider
    job_matcher_endpoints.set_provider(job_matcher_provider)
    
    logger.info("Services injected successfully")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Lifespan context manager for FastAPI application.
    Handles startup and shutdown operations for resources.
    
    Startup: Initialize all services and providers
    Shutdown: Clean up resources (if needed)
    """
    # Startup: Initialize services
    logger.info("=== OnBoard API Starting Up ===")

    try:
        provider, private_provider, embedding_provider = get_providers()
        logger.info("Providers initialized")

        setup_cv_rewriter(provider, private_provider, embedding_provider)
        setup_portfolio_builder(provider)
        setup_career_guide(provider, embedding_provider)
        setup_job_matcher(provider)  # Lightweight - no DB initialization

        inject_services()

        logger.info("=== All services initialized successfully===")

    except Exception as e:
        logger.error(f"Failed to initialize services: {e}", exc_info=True)
        raise

    yield

    # Shutdown: Clean up resources
    logger.info("=== OnBoard API Shutting Down ===")
    # Add any cleanup logic here if needed
    logger.info("=== Shutdown complete ===")


# Create FastAPI application with lifespan
app = FastAPI(
    title="OnBoard APIs",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS - get allowed origins from environment or use default
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Register endpoint routers
app.include_router(cv_rewriter_endpoints.router)
app.include_router(virtual_interviewer_endpoints.router)
app.include_router(job_matcher_endpoints.router)
app.include_router(portfolio_builder_endpoints.router)
app.include_router(career_guide_endpoints.router)
app.include_router(utilities_endpoints.router)

logger.info("=== All endpoint routers registered ===")


## Removed main block: UVicorn runner is handled by docker/entrypoint

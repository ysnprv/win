import os
import uuid
from typing import Optional
from supabase import create_client, Client
from shared.errors.errors import DBAccessError, DBInsertionError
from shared.helpers.logger import get_logger

logger = get_logger(__name__)


class CareerGuideDB:
    """
    Singleton client for managing career guide records in Supabase.
    Handles storing career guide results with user linkage.
    """

    _instance = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self) -> None:
        """
        Initialize the Supabase database client.
        Uses environment variables for configuration.
        """
        # Only initialize once
        if CareerGuideDB._initialized:
            return
        
        # Get credentials from environment
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            logger.error("Supabase credentials not found in environment variables")
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        
        try:
            self.client: Client = create_client(supabase_url, supabase_key)
            CareerGuideDB._initialized = True
            logger.info("Supabase client for CareerGuideDB initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise DBAccessError(f"Supabase initialization failed: {str(e)}")

    @staticmethod
    def get_instance() -> Optional["CareerGuideDB"]:
        """
        Get the singleton instance of CareerGuideDB.

        Returns:
            CareerGuideDB instance or None if not initialized.
        """
        if CareerGuideDB._instance is None:
            return None
        return CareerGuideDB._instance

    async def insert_career_guide(
        self,
        user_id: str,
        current_strengths: list,
        readiness_score: int,
        skills_to_learn: list,
        projects_to_work_on: list,
        soft_skills_to_develop: list,
        career_roadmap: list,
        domain: str,
        current_job: str,
        target_job: Optional[str] = None
    ) -> Optional[str]:
        """
        Insert a career guide record into the database.
        
        Args:
            user_id: UUID of the user (from auth)
            current_strengths: List of user's strengths
            readiness_score: Score 0-100 indicating readiness
            skills_to_learn: List of skills to learn
            projects_to_work_on: List of projects to work on
            soft_skills_to_develop: List of soft skills to develop
            career_roadmap: List of 5 roadmap steps
            domain: Work domain
            current_job: Current job title
            target_job: Target job title (optional)
            
        Returns:
            UUID string of the created career guide record, or None on failure
            
        Raises:
            DBInsertionError: If database insertion fails
        """
        try:
            # Generate unique career guide ID
            guide_id = str(uuid.uuid4())
            
            logger.debug(f"Inserting career guide record for user {user_id}")
            
            try:
                insert_data = {
                    "id": guide_id,
                    "user_id": user_id,
                    "current_strengths": current_strengths,
                    "readiness_score": readiness_score,
                    "skills_to_learn": skills_to_learn,
                    "projects_to_work_on": projects_to_work_on,
                    "soft_skills_to_develop": soft_skills_to_develop,
                    "career_roadmap": career_roadmap,
                    "domain": domain,
                    "current_job": current_job,
                    "target_job": target_job
                }
                
                response = self.client.table("career_guides").insert(insert_data).execute()
                
                logger.info(f"Career guide record created successfully with ID: {guide_id}")
                return guide_id
                
            except Exception as e:
                logger.error(f"Failed to insert career guide record: {e}")
                raise DBInsertionError(f"Database insertion failed: {str(e)}")
                
        except DBInsertionError:
            # Re-raise our custom errors
            raise
        except Exception as e:
            logger.error(f"Unexpected error during career guide insertion: {e}")
            raise DBInsertionError(f"Unexpected error: {str(e)}")

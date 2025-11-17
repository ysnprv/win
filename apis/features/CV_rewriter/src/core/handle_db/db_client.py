import os
import uuid
from datetime import datetime
from typing import Optional
from supabase import create_client, Client
from shared.errors.errors import (
    DBAccessError,
    DBInsertionError,
)
from shared.helpers.logger import get_logger

logger = get_logger(__name__)


class DataBaseClient:
    """
    Singleton client for managing Supabase database operations.
    Handles CV storage in both database and storage bucket.
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
        if DataBaseClient._initialized:
            return
        
        # Get credentials from environment
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        
        if not supabase_url or not supabase_key:
            logger.error("Supabase credentials not found in environment variables")
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        
        try:
            self.client: Client = create_client(supabase_url, supabase_key)
            DataBaseClient._initialized = True
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise DBAccessError(f"Supabase initialization failed: {str(e)}")

    @staticmethod
    def get_instance() -> "DataBaseClient":
        """
        Get the singleton instance of DataBaseClient.

        Returns:
            DataBaseClient instance or None if not initialized.
        """
        if DataBaseClient._instance is None:
            return None
        return DataBaseClient._instance

    async def insert_cv(
        self,
        user_id: str,
        pdf_bytes: bytes,
        original_score: float,
        final_score: float,
        job_title: str,
        jobs_summary: str
        , anonymized_cv_text: Optional[str] = None
    ) -> Optional[str]:
        """
        Insert a CV record into the database and upload PDF to storage.
        
        Args:
            user_id: UUID of the user (from auth)
            pdf_bytes: PDF file as bytes
            original_score: Original CV-job similarity score
            final_score: Enhanced CV-job similarity score
            job_title: AI-generated title for the job (max 3 words)
            jobs_summary: AI-generated summary of job descriptions
            
        Returns:
            UUID string of the created CV record, or None on failure
            
        Raises:
            DBInsertionError: If database insertion fails
            DBAccessError: If storage upload fails
        """
        try:
            # Generate unique CV ID
            cv_id = str(uuid.uuid4())
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            
            # Upload PDF to storage bucket
            # Path: {user_id}/{timestamp}_{cv_id}.pdf
            storage_path = f"{user_id}/{timestamp}_{cv_id}.pdf"
            
            logger.debug(f"Uploading PDF to storage: {storage_path}")
            
            try:
                storage_response = self.client.storage.from_("cv-pdfs").upload(
                    path=storage_path,
                    file=pdf_bytes,
                    file_options={"content-type": "application/pdf"}
                )
                
                # Get the public URL (will be protected by RLS)
                pdf_url = self.client.storage.from_("cv-pdfs").get_public_url(storage_path)
                
                logger.info(f"PDF uploaded successfully to: {storage_path}")
                
            except Exception as e:
                logger.error(f"Failed to upload PDF to storage: {e}")
                raise DBAccessError(f"Storage upload failed: {str(e)}")
            
            # Insert record into cvs table
            logger.debug(f"Inserting CV record into database for user {user_id}")
            
            try:
                insert_data = {
                    "id": cv_id,
                    "user_id": user_id,
                    "pdf_url": pdf_url,
                    "original_score": original_score,
                    "final_score": final_score,
                    "job_title": job_title,
                    "jobs_summary": jobs_summary
                }

                # Add anonymized CV text if provided
                if anonymized_cv_text is not None:
                    insert_data["anonymized_cv_text"] = anonymized_cv_text
                
                response = self.client.table("cvs").insert(insert_data).execute()
                
                logger.info(f"CV record created successfully with ID: {cv_id}")
                return cv_id
                
            except Exception as e:
                logger.error(f"Failed to insert CV record: {e}")
                
                # Attempt to clean up uploaded file
                try:
                    self.client.storage.from_("cv-pdfs").remove([storage_path])
                    logger.debug(f"Cleaned up orphaned storage file: {storage_path}")
                except:
                    logger.warning(f"Failed to clean up storage file: {storage_path}")
                
                raise DBInsertionError(f"Database insertion failed: {str(e)}")
                
        except (DBInsertionError, DBAccessError):
            # Re-raise our custom errors
            raise
        except Exception as e:
            logger.error(f"Unexpected error during CV insertion: {e}")
            raise DBInsertionError(f"Unexpected error: {str(e)}")

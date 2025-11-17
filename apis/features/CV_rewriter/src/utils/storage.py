import os
import shutil
import json
from pathlib import Path
from typing import Dict, Any
from shared.utils.constants import DEFAULT_PATHS
from shared.helpers.logger import get_logger

logger = get_logger(__name__)

TEMP_PATH = DEFAULT_PATHS["temp"]


class UserStorageManager:
    """
    Manages temporary storage of scraped CV and job descriptions per user.
    Uses user-specific directories to isolate data.
    """
    
    @staticmethod
    def get_user_dir(user_id: str) -> str:
        """Get the directory path for a specific user."""
        user_dir = os.path.join(TEMP_PATH, str(user_id))
        return user_dir
    
    @staticmethod
    def ensure_clean_user_dir(user_id: str) -> str:
        """
        Ensure user directory exists and is empty.
        Clears any existing files from previous sessions.
        """
        user_dir = UserStorageManager.get_user_dir(user_id)
        
        # Remove existing directory if it exists
        if os.path.exists(user_dir):
            logger.debug(f"Clearing existing directory for user {user_id}")
            shutil.rmtree(user_dir)
        
        # Create fresh directory
        os.makedirs(user_dir, exist_ok=True)
        logger.debug(f"Created clean directory for user {user_id}: {user_dir}")
        
        return user_dir
    
    @staticmethod
    def store_cv_text(user_id: str, cv_text: str) -> str:
        """
        Store scraped CV text to user's directory.
        Returns the file path.
        """
        user_dir = UserStorageManager.get_user_dir(user_id)
        cv_path = os.path.join(user_dir, "cv.txt")
        
        with open(cv_path, "w", encoding="utf-8") as f:
            f.write(cv_text)
        
        logger.info(f"Stored CV text for user {user_id} ({len(cv_text)} chars)")
        return cv_path
    
    @staticmethod
    def store_jobs_text(user_id: str, jobs_text: str) -> str:
        """
        Store scraped job descriptions text to user's directory.
        Returns the file path.
        """
        user_dir = UserStorageManager.get_user_dir(user_id)
        jobs_path = os.path.join(user_dir, "jobs.txt")
        
        with open(jobs_path, "w", encoding="utf-8") as f:
            f.write(jobs_text)
        
        logger.info(f"Stored jobs text for user {user_id} ({len(jobs_text)} chars)")
        return jobs_path
    
    @staticmethod
    def read_cv_text(user_id: str) -> str:
        """
        Read stored CV text for a user.
        Raises FileNotFoundError if not found.
        """
        user_dir = UserStorageManager.get_user_dir(user_id)
        cv_path = os.path.join(user_dir, "cv.txt")
        
        if not os.path.exists(cv_path):
            raise FileNotFoundError(f"No stored CV found for user {user_id}")
        
        with open(cv_path, "r", encoding="utf-8") as f:
            cv_text = f.read()
        
        logger.debug(f"Read CV text for user {user_id} ({len(cv_text)} chars)")
        return cv_text
    
    @staticmethod
    def read_jobs_text(user_id: str) -> str:
        """
        Read stored job descriptions text for a user.
        Raises FileNotFoundError if not found.
        """
        user_dir = UserStorageManager.get_user_dir(user_id)
        jobs_path = os.path.join(user_dir, "jobs.txt")
        
        if not os.path.exists(jobs_path):
            raise FileNotFoundError(f"No stored jobs found for user {user_id}")
        
        with open(jobs_path, "r", encoding="utf-8") as f:
            jobs_text = f.read()
        
        logger.debug(f"Read jobs text for user {user_id} ({len(jobs_text)} chars)")
        return jobs_text
    
    @staticmethod
    def store_user_data(user_id: str, personal_data: Dict[str, Any]) -> str:
        """
        Store personal data as JSON to user's directory.
        Returns the file path.
        """
        user_dir = UserStorageManager.get_user_dir(user_id)
        user_data_path = os.path.join(user_dir, "user_data.txt")
        
        with open(user_data_path, "w", encoding="utf-8") as f:
            json.dump(personal_data, f, ensure_ascii=False, indent=2)
        
        logger.info(f"Stored personal data for user {user_id} ({len(personal_data)} fields)")
        return user_data_path
    
    @staticmethod
    def read_user_data(user_id: str) -> Dict[str, Any]:
        """
        Read stored personal data for a user.
        Raises FileNotFoundError if not found.
        """
        user_dir = UserStorageManager.get_user_dir(user_id)
        user_data_path = os.path.join(user_dir, "user_data.txt")
        
        if not os.path.exists(user_data_path):
            raise FileNotFoundError(f"No stored personal data found for user {user_id}")
        
        with open(user_data_path, "r", encoding="utf-8") as f:
            personal_data = json.load(f)
        
        logger.debug(f"Read personal data for user {user_id} ({len(personal_data)} fields)")
        return personal_data
    
    @staticmethod
    def cleanup_user_dir(user_id: str):
        """Remove user's directory and all contents."""
        user_dir = UserStorageManager.get_user_dir(user_id)
        
        if os.path.exists(user_dir):
            shutil.rmtree(user_dir)
            logger.debug(f"Cleaned up directory for user {user_id}")

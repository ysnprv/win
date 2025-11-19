import asyncio
import shutil
import subprocess
from pathlib import Path
from typing import Optional

from shared.helpers.logger import get_logger
from features.Job_matcher.src.storage.job_storage import JobStorageClient
from features.Job_matcher.src.storage.fill_db import import_database, REPO_PATH

logger = get_logger(__name__)


class JobDBInitializer:
    """Singleton initializer for Job Matcher DB which clones a repo and fills DB.

    This mimics `KnowledgeBase` behavior from Career Guide: lazy initialization
    and cleanup after population.
    """

    _instance = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if JobDBInitializer._initialized:
            return

        self._lock = asyncio.Lock()

    async def ensure_initialized(self):
        """Ensure the jobs DB is filled (non-blocking when called multiple times)."""
        async with self._lock:
            if JobDBInitializer._initialized:
                return

            try:
                storage = JobStorageClient()

                # If there are already jobs, nothing to do.
                if storage.count_jobs() > 0:
                    logger.info("Jobs DB already contains data, skipping DB populate")
                    JobDBInitializer._initialized = True
                    return

                # Clone the repo and import JSON
                project_root = Path(__file__).resolve().parent.parent.parent.parent.parent
                db_dir = Path(__file__).parent
                temp_clone_dir = db_dir / "jobs-json-temp"

                if temp_clone_dir.exists():
                    logger.debug(f"Removing existing temp clone directory: {temp_clone_dir}")
                    shutil.rmtree(temp_clone_dir)

                logger.info(f"Cloning jobs data from {REPO_PATH} into {temp_clone_dir}...")
                try:
                    subprocess.run(["git", "clone", REPO_PATH, str(temp_clone_dir)], check=True, capture_output=True, text=True)
                except subprocess.CalledProcessError as e:
                    logger.error(f"Failed to git clone jobs repo: {e.stderr}")
                    # don't raise, we still want service to start
                    return

                json_path = temp_clone_dir / "jobs_export.json"
                if not json_path.exists():
                    logger.error(f"jobs_export.json not found in cloned repo: {json_path}")
                    shutil.rmtree(temp_clone_dir)
                    return

                logger.info("Importing cloned jobs JSON into ChromaDB...")

                # Call the helper import_database with absolute path to JSON (non-interactive)
                await import_database(str(json_path), confirm=True)

                # Cleanup clone
                if temp_clone_dir.exists():
                    logger.info(f"Cleaning up cloned repository: {temp_clone_dir}")
                    shutil.rmtree(temp_clone_dir)

                JobDBInitializer._initialized = True
                logger.info("Job DB initialization completed")

            except Exception as e:
                logger.error(f"Error during DB initialization: {e}")
                # don't prevent API from starting; keep initialized False
                return


def get_db_initializer() -> JobDBInitializer:
    return JobDBInitializer()

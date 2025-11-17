import os
import shutil
import subprocess
from pathlib import Path
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from shared.helpers.logger import get_logger
from shared.providers.base import EmbeddingProvider

logger = get_logger(__name__)


class KnowledgeBase:
    """
    Singleton ChromaDB client for managing job descriptions vector database.
    Uses lazy initialization and auto-clones job data from GitHub on first use.
    """

    _instance = None
    _initialized = False
    _client = None
    _embedding_provider = None

    JOBS_REPO_URL = "https://github.com/EpicDragon123/jobs-data"
    
    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, embedding_provider: EmbeddingProvider = None):
        """
        Initialize the ChromaDB knowledge base.
        
        Args:
            embedding_provider: Provider for generating embeddings
        """
        # Only initialize once
        if KnowledgeBase._initialized:
            return
        
        if embedding_provider is None:
            raise ValueError("embedding_provider is required for first initialization")
        
        KnowledgeBase._embedding_provider = embedding_provider
        
        # Initialize ChromaDB in-memory client
        try:
            self._client = chromadb.Client(Settings(
                anonymized_telemetry=False,
                allow_reset=True
            ))
            logger.info("ChromaDB client initialized (in-memory)")
            KnowledgeBase._initialized = True
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB client: {e}")
            raise

    @staticmethod
    def get_instance() -> Optional["KnowledgeBase"]:
        """
        Get the singleton instance of KnowledgeBase.
        
        Returns:
            KnowledgeBase instance or None if not initialized.
        """
        if KnowledgeBase._instance is None:
            return None
        return KnowledgeBase._instance

    def _get_database_dir(self) -> Path:
        """Get the directory where database files are stored."""
        return Path(__file__).parent

    def _clone_jobs_data(self) -> Path:
        """
        Clone the jobs-data repository and return the path to raw data.
        
        Returns:
            Path to the raw data directory
            
        Raises:
            RuntimeError: If cloning fails
        """
        db_dir = self._get_database_dir()
        temp_clone_dir = db_dir / "jobs-data-temp"
        raw_dir = db_dir / "raw"
        
        # Clean up any existing directories
        if raw_dir.exists():
            logger.debug(f"Removing existing raw directory: {raw_dir}")
            shutil.rmtree(raw_dir)
        if temp_clone_dir.exists():
            logger.debug(f"Removing existing temp clone directory: {temp_clone_dir}")
            shutil.rmtree(temp_clone_dir)
        
        logger.info(f"Cloning jobs data from {self.JOBS_REPO_URL}...")
        
        try:
            # Clone the repository to temporary directory
            result = subprocess.run(
                ["git", "clone", self.JOBS_REPO_URL, str(temp_clone_dir)],
                capture_output=True,
                text=True,
                check=True
            )
            logger.info("Jobs data cloned successfully")
            
            # Move raw directory to final location
            temp_raw_dir = temp_clone_dir / "raw"
            if not temp_raw_dir.exists():
                raise RuntimeError("raw directory not found in cloned repository")
            
            shutil.move(str(temp_raw_dir), str(raw_dir))
            logger.debug(f"Moved raw directory to {raw_dir}")
            
            # Remove temporary clone directory (includes .git)
            if temp_clone_dir.exists():
                shutil.rmtree(temp_clone_dir)
                logger.debug("Removed temporary clone directory")
            
            return raw_dir
            
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to clone jobs data: {e.stderr}")
            # Clean up on failure
            if temp_clone_dir.exists():
                shutil.rmtree(temp_clone_dir)
            raise RuntimeError(f"Git clone failed: {e.stderr}")
        except Exception as e:
            logger.error(f"Unexpected error during clone: {e}")
            # Clean up on failure
            if temp_clone_dir.exists():
                shutil.rmtree(temp_clone_dir)
            raise RuntimeError(f"Failed to clone jobs data: {str(e)}")

    def _normalize_collection_name(self, folder_name: str) -> str:
        """
        Normalize folder name to collection name.
        
        Args:
            folder_name: Original folder name (e.g., "Business & Management")
            
        Returns:
            Normalized collection name (e.g., "business_and_management")
        """
        return folder_name.lower().replace(" & ", "_and_").replace(" ", "_")

    async def _populate_collection(self, collection, raw_dir: Path, folder_name: str):
        """
        Populate a ChromaDB collection with job descriptions from a folder.
        
        Args:
            collection: ChromaDB collection to populate
            raw_dir: Path to raw data directory
            folder_name: Name of the subfolder containing job descriptions
        """
        folder_path = raw_dir / folder_name
        
        if not folder_path.exists() or not folder_path.is_dir():
            logger.warning(f"Folder not found: {folder_path}")
            return
        
        txt_files = list(folder_path.glob("*.txt"))
        logger.info(f"Populating collection '{collection.name}' with {len(txt_files)} job descriptions...")
        
        for txt_file in txt_files:
            try:
                # Read job description
                with open(txt_file, "r", encoding="utf-8") as f:
                    content = f.read().strip()
                
                if not content:
                    logger.warning(f"Empty file skipped: {txt_file.name}")
                    continue
                
                # Extract job name from filename (remove .txt extension)
                job_name = txt_file.stem
                
                # Generate embedding
                embedding = await self._embedding_provider.embed(content)
                
                # Add to collection
                collection.add(
                    documents=[content],
                    metadatas=[{"name": job_name}],
                    ids=[f"{collection.name}_{job_name}"],
                    embeddings=[embedding]
                )
                
                logger.debug(f"Added job: {job_name}")
                
            except Exception as e:
                logger.error(f"Error processing file {txt_file.name}: {e}")
                continue
        
        logger.info(f"Collection '{collection.name}' populated successfully")

    async def initialize_database(self):
        """
        Initialize the database by cloning job data and populating collections.
        This is called lazily on first query if collections are not ready.
        """
        logger.info("Starting database initialization...")
        
        # Clone jobs data
        raw_dir = self._clone_jobs_data()
        
        try:
            # Get all subdirectories (domains)
            domains = [d.name for d in raw_dir.iterdir() if d.is_dir()]
            logger.info(f"Found {len(domains)} domains: {domains}")
            
            # Create and populate collections for each domain
            for domain in domains:
                collection_name = self._normalize_collection_name(domain)
                
                try:
                    logger.info(f"[INIT] Starting collection: '{collection_name}' (domain: {domain})")
                    # Create collection
                    collection = self._client.get_or_create_collection(
                        name=collection_name,
                        metadata={"domain": domain}
                    )
                    
                    # Populate collection
                    await self._populate_collection(collection, raw_dir, domain)
                    logger.info(f"[INIT] Completed collection: '{collection_name}'")
                    
                except Exception as e:
                    logger.error(f"Error creating/populating collection '{collection_name}': {e}")
                    continue
            
            logger.info("Database initialization completed successfully")
            
        finally:
            # Always clean up the raw directory after populating all collections
            if raw_dir.exists():
                logger.info(f"Cleaning up cloned repository data: {raw_dir}")
                shutil.rmtree(raw_dir)
                logger.info("Cloned repository cleaned up successfully")

    def _is_database_ready(self) -> bool:
        """
        Quick check if database has been initialized and has collections.
        
        Returns:
            True if database is ready, False otherwise
        """
        try:
            collections = self._client.list_collections()
            return len(collections) > 0
        except Exception as e:
            logger.error(f"Error checking database readiness: {e}")
            return False

    async def ensure_initialized(self):
        """
        Ensure the database is initialized and ready.
        If not, trigger initialization.
        """
        if not self._is_database_ready():
            logger.info("Database not ready, initializing...")
            await self.initialize_database()
        else:
            logger.debug("Database is ready")

    def get_available_domains(self) -> List[str]:
        """
        Get list of available job domains.
        
        Returns:
            List of domain names (original format, not normalized)
        """
        try:
            collections = self._client.list_collections()
            # Extract original domain names from metadata
            domains = []
            for collection in collections:
                metadata = collection.metadata
                if metadata and "domain" in metadata:
                    domains.append(metadata["domain"])
            return sorted(domains)
        except Exception as e:
            logger.error(f"Error getting available domains: {e}")
            return []

    async def search_jobs(
        self,
        domain: str,
        user_data: str,
        current_job: str,
        target_job: Optional[str] = None,
        n_similarity: int = 3,
        n_regex: int = 2
    ) -> List[Dict[str, Any]]:
        """
        Search for relevant job descriptions based on user data and job preferences.
        
        Args:
            domain: Work domain (e.g., "IT & Software Engineering")
            user_data: Combined user data (CV + personal info + profile)
            current_job: User's current job title
            target_job: User's target job title (optional)
            n_similarity: Number of results from similarity search
            n_regex: Number of results from metadata matching
            
        Returns:
            List of job descriptions with metadata, limited to top 5 combined results
        """
        await self.ensure_initialized()
        
        # Normalize domain to collection name
        collection_name = self._normalize_collection_name(domain)
        
        try:
            collection = self._client.get_collection(name=collection_name)
        except Exception as e:
            logger.error(f"Collection '{collection_name}' not found: {e}")
            raise ValueError(f"Domain '{domain}' not found in database")
        
        results = []
        seen_ids = set()
        
        # 1. Similarity search
        try:
            logger.info(f"Performing similarity search in '{collection_name}'...")
            embedding = await self._embedding_provider.embed(user_data)
            
            similarity_results = collection.query(
                query_embeddings=[embedding],
                n_results=n_similarity
            )
            
            # Process similarity results
            if similarity_results and similarity_results["ids"]:
                for i, doc_id in enumerate(similarity_results["ids"][0]):
                    if doc_id not in seen_ids:
                        content = similarity_results["documents"][0][i]
                        results.append({
                            "id": doc_id,
                            "content": content,
                            "metadata": similarity_results["metadatas"][0][i],
                            "source": "similarity"
                        })
                        seen_ids.add(doc_id)
                        logger.info(f"[QUERY] Similarity result {i+1}: {content[:50]}...")
                        
            logger.info(f"Found {len(results)} results from similarity search")
            
        except Exception as e:
            logger.error(f"Error in similarity search: {e}")
        
        # 2. Regex/metadata matching search
        try:
            logger.info("Performing metadata matching search...")
            
            # Get all documents from collection
            all_results = collection.get(include=["documents", "metadatas"])
            
            # Filter by matching job names
            jobs_to_match = [current_job]
            if target_job:
                jobs_to_match.append(target_job)
            
            logger.info(f"[DEBUG] Jobs to match: {jobs_to_match}")
            logger.info(f"[DEBUG] Total documents in collection: {len(all_results['metadatas'])}")
            logger.info(f"[DEBUG] Sample metadata names: {[m.get('name', '') for m in all_results['metadatas'][:5]]}")
            
            matched = []
            for i, metadata in enumerate(all_results["metadatas"]):
                job_name = metadata.get("name", "")
                doc_id = all_results["ids"][i]
                
                # Skip if already in results
                if doc_id in seen_ids:
                    continue
                
                # Check if any job matches the metadata name
                for job in jobs_to_match:
                    # Normalize both for comparison
                    normalized_job = job.lower().replace(" ", "_")
                    normalized_name = job_name.lower()
                    
                    # Split into words for fuzzy matching
                    job_words = set(normalized_job.split("_"))
                    name_words = set(normalized_name.split("_"))
                    
                    # Calculate word overlap
                    common_words = job_words.intersection(name_words)
                    
                    # Match if:
                    # 1. Exact substring match (original logic)
                    # 2. At least 2 words in common
                    # 3. At least 50% word overlap for shorter job titles
                    exact_match = normalized_job in normalized_name or normalized_name in normalized_job
                    word_match = len(common_words) >= 2
                    percentage_match = len(common_words) >= len(job_words) * 0.5 and len(job_words) >= 2
                    
                    if exact_match or word_match or percentage_match:
                        content = all_results["documents"][i]
                        matched.append({
                            "id": doc_id,
                            "content": content,
                            "metadata": metadata,
                            "source": "metadata"
                        })
                        seen_ids.add(doc_id)
                        logger.info(f"[QUERY] Metadata match (job: {job}, name: {job_name}): {content[:50]}...")
                        break
            
            # Add top N regex results
            results.extend(matched[:n_regex])
            logger.info(f"Found {len(matched)} matches from metadata search, added {min(len(matched), n_regex)}")
            
        except Exception as e:
            logger.error(f"Error in metadata matching: {e}")
        
        # Return top 5 combined results
        final_results = results[:5]
        logger.info(f"Returning {len(final_results)} total job descriptions")
        
        return final_results

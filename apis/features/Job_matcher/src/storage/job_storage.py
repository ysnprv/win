from typing import List, Dict, Optional
import chromadb
from chromadb.config import Settings
from features.Job_matcher.src.models.job_models import JobDocument
from features.Job_matcher.src.providers.llm_factory import get_embedding_provider
import sys 
from pathlib import Path 

project_root = Path(__file__).resolve().parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

from shared.errors.errors import DBAccessError, DBInsertionError
from shared.helpers.logger import get_logger

logger = get_logger(__name__)
from shared.utils.constants import DEFAULT_PATHS
import os
import json

class JobStorageClient:
    _instance = None
    _initialized = False

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self, db_path: str = None):
        """Initialize the job storage client with lazy loading."""
        # Don't initialize anything heavy here
        self._db_path = db_path or DEFAULT_PATHS["jobs_db"]
        self._client = None
        self._jobs_collection = None
        self._embedding_provider = None

    @property
    def client(self):
        """Load ChromaDB client."""
        if self._client is None:
            logger.info("Initializing ChromaDB client...")
            os.makedirs(self._db_path, exist_ok=True)
            self._client = chromadb.PersistentClient(
                path=self._db_path,
                settings=Settings(anonymized_telemetry=False)
            )
            logger.info("ChromaDB client initialized")
        return self._client

    @property
    def jobs_collection(self):
        """Load jobs collection."""
        if self._jobs_collection is None:
            logger.info("Getting or creating jobs collection...")
            self._jobs_collection = self.client.get_or_create_collection(
                name="jobs",
                metadata={"description": "Job postings from various sources"}
            )
            logger.info(f"Jobs collection ready with {self._jobs_collection.count()} jobs")
        return self._jobs_collection

    @property
    def embedding_provider(self):
        """Lazy-load embedding provider."""
        if self._embedding_provider is None:
            logger.info("Initializing embedding provider...")
            self._embedding_provider = get_embedding_provider("hf")
            logger.info("Embedding provider initialized")
        return self._embedding_provider

    def count_jobs(self) -> int:
        """Get the total number of jobs in the database (fast operation)."""
        try:
            return self.jobs_collection.count()
        except Exception as e:
            logger.error(f"Failed to count jobs: {e}")
            return 0

    async def search_jobs_cached(
        self, 
        query_text: str,
        n_results: int = 50,
        location_filter: Optional[str] = None,
        job_type_filter: Optional[str] = None
    ) -> List[JobDocument]:
        """
        Fast cached search that reuses embeddings if possible.
        """
        try:
            # Check if we already have jobs
            if self.count_jobs() == 0:
                logger.warning("No jobs in database for search")
                return []

            query_embedding = await self.embedding_provider.embed(query_text)
            
            where_filter = {}
            if location_filter:
                where_filter["location"] = {"$eq": location_filter}
            if job_type_filter:
                where_filter["job_type"] = {"$eq": job_type_filter}
            
            results = self.jobs_collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_filter if where_filter else None
            )
            
            jobs = []
            if results['ids'] and results['ids'][0]:
                for i, job_id in enumerate(results['ids'][0]):
                    metadata = results['metadatas'][0][i]
                    distance = results['distances'][0][i]
                    job = self._reconstruct_job(metadata, distance, query_text)
                    jobs.append(job)
        
            return jobs
        
        except Exception as e:
            logger.error(f"Failed to search jobs: {e}")
            raise DBAccessError(f"Failed to search jobs: {str(e)}")

    def already_stored(self, job_id: str) -> bool:
        """
        Check if a job is already stored.
        
        Args:
            job_id: Unique job identifier
            
        Returns:
            True if job exists, False otherwise
            
        Raises:
            DBAccessError: If database access fails
        """
        try:
            results = self.jobs_collection.get(
                ids=[job_id],
                limit=1
            )
            return bool(results["ids"])
        except Exception as e:
            raise DBAccessError(f"Failed to check job existence: {str(e)}")

    async def store_job(self, job: JobDocument) -> None:
        """
        Store a single job in the database.
        
        Args:
            job: JobDocument to store
            
        Raises:
            DBInsertionError: If job insertion fails
        """
        if self.already_stored(job.job_id):
            return

        try:
            embedding_text = self._create_embedding_text(job)
            
            embedding = await self.embedding_provider.embed(embedding_text)
            
            metadata = self._prepare_metadata(job)
            
            self.jobs_collection.add(
                ids=[job.job_id],
                embeddings=[embedding],
                documents=[embedding_text],
                metadatas=[metadata]
            )
            
        except Exception as e:
            raise DBInsertionError(f"Failed to store job {job.job_id}: {str(e)}")

    async def store_jobs(self, jobs: List[JobDocument]) -> Dict:        
        stored = 0
        duplicates = 0
        
        # Pre-filter duplicates in the incoming batch
        seen_source_ids = set()
        unique_jobs = []
        
        for job in jobs:
            unique_key = f"{job.source}_{job.source_job_id}"
            
            if unique_key in seen_source_ids:
                duplicates += 1
                continue
            
            seen_source_ids.add(unique_key)
            unique_jobs.append(job)
        
        for i, job in enumerate(unique_jobs, 1):
            try:
                if self.already_stored(job.job_id):
                    duplicates += 1
                    continue
                
                await self.store_job(job)
                stored += 1
                
            except Exception as e:
                raise e
        
        result = {
            "stored": stored,
            "duplicates": duplicates,
            "total_processed": len(jobs)
        }
        return result

    async def search_jobs(
        self, 
        query_text: str,
        n_results: int = 50,
        location_filter: Optional[str] = None,
        job_type_filter: Optional[str] = None
    ) -> List[JobDocument]:
        """
        Search for jobs using semantic similarity.
        """
        try:
            query_embedding = await self.embedding_provider.embed(query_text)
            
            where_filter = {}
            if location_filter:
                where_filter["location"] = {"$eq": location_filter}
            if job_type_filter:
                where_filter["job_type"] = {"$eq": job_type_filter}
            
            results = self.jobs_collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_filter if where_filter else None
            )
            
            # Convert to JobDocument objects
            jobs = []
            if results['ids'] and results['ids'][0]:
                for i, job_id in enumerate(results['ids'][0]):
                    metadata = results['metadatas'][0][i]
                    distance = results['distances'][0][i]
                    
                    job = self._reconstruct_job(metadata, distance)
                    jobs.append(job)
        
            return jobs
        
        except Exception as e:
            raise DBAccessError(f"Failed to search jobs: {str(e)}")

    def _create_embedding_text(self, job: JobDocument) -> str:
        """Create text for embedding generation."""
        parts = [
            f"Title: {job.title}",
            f"Company: {job.company}",
            f"Location: {job.location}",
            f"Type: {job.job_type}",
            f"Level: {job.experience_level}",
            f"Description: {job.description[:300]}",  # Limit length
        ]
        
        if job.skills:
            parts.append(f"Skills: {', '.join(job.skills[:10])}")
        
        return "\n".join(parts)

    def _prepare_metadata(self, job: JobDocument) -> Dict:
        """Flatten job metadata for ChromaDB."""
        return {
            "title": job.title,
            "company": job.company,
            "location": job.location,
            "job_type": job.job_type,
            "experience_level": job.experience_level,
            "source": job.source,
            "source_job_id": job.source_job_id,
            "source_url": job.source_url,
            "posted_date": int(job.posted_date.timestamp()),  
            "skills": json.dumps(job.skills[:5]),
            "description": job.description[:500] if job.description else ""  
        }

    def _calculate_enhanced_match_score(
        self, 
        metadata: Dict, 
        similarity_score: float, 
        search_query: str = None
    ) -> float:
        """Calculate enhanced match score based on multiple factors."""
        
        # Base similarity score (60% weight)
        if similarity_score <= 0.0:
            base_score = 1.0
        elif similarity_score >= 1.5:
            base_score = 0.2
        else:
            base_score = max(0.2, 1.0 - (similarity_score * 0.6))
        
        # Title relevance bonus (20% weight)
        title_bonus = 0.0
        if search_query:
            title_lower = metadata.get("title", "").lower()
            search_terms = search_query.lower().split()
            title_matches = sum(1 for term in search_terms if term in title_lower)
            if search_terms:
                title_bonus = min(0.2, (title_matches / len(search_terms)) * 0.2)
        
        # Skills relevance bonus (10% weight)
        skills_bonus = 0.0
        job_skills = json.loads(metadata.get("skills", "[]"))
        if job_skills and search_query:
            search_terms = search_query.lower().split()
            skill_matches = sum(
                1 for skill in job_skills 
                for term in search_terms 
                if term.lower() in skill.lower()
            )
            if search_terms:
                skills_bonus = min(0.1, (skill_matches / len(search_terms)) * 0.1)
        
        # Experience level alignment (5% weight)
        exp_bonus = 0.0
        experience_level = metadata.get("experience_level", "mid")
        if experience_level in ["entry", "junior"]:
            exp_bonus = 0.02
        elif experience_level in ["mid", "senior"]:
            exp_bonus = 0.05
        
        # Job type preference (5% weight)
        type_bonus = 0.0
        job_type = metadata.get("job_type", "full_time")
        if job_type == "full_time":
            type_bonus = 0.05
        elif job_type == "remote":
            type_bonus = 0.04
        elif job_type == "internship":
            type_bonus = 0.03
        
        # Combine all factors
        final_score = base_score + title_bonus + skills_bonus + exp_bonus + type_bonus
        
        # Cap at 1.0 and add slight randomness for variety
        final_score = min(0.98, final_score)
    
        return max(0.1, min(0.98, final_score))

    def _reconstruct_job(self, metadata: Dict, similarity_score: float, search_query: str = None) -> JobDocument:
        """Reconstruct JobDocument from metadata."""
        from datetime import datetime
        
        # Use enhanced scoring
        match_score = self._calculate_enhanced_match_score(metadata, similarity_score, search_query)
        
        # Convert timestamp back to datetime
        posted_timestamp = metadata.get("posted_date")
        if isinstance(posted_timestamp, (int, float)):
            posted_date = datetime.fromtimestamp(posted_timestamp)
        else:
            # Fallback for old ISO format data
            try:
                posted_date = datetime.fromisoformat(str(posted_timestamp))
            except:
                posted_date = datetime.now()
        
        return JobDocument(
            job_id=f"{metadata.get('source', 'unknown')}_{metadata.get('source_job_id', 'unknown')}",
            title=metadata.get("title", ""),
            company=metadata.get("company", ""),
            location=metadata.get("location", ""),
            description=metadata.get("description", ""),  
            skills=json.loads(metadata.get("skills", "[]")),
            job_type=metadata.get("job_type", "full_time"),
            experience_level=metadata.get("experience_level", "mid"),
            source=metadata.get("source", "unknown"),
            source_job_id=metadata.get("source_job_id", ""),
            source_url=metadata.get("source_url", ""),
            posted_date=posted_date,
            match_score=round(match_score, 3)  
        )

    def cleanup_old_jobs(self, days_old: int = 10) -> int:
        """Remove jobs older than specified days."""
        from datetime import datetime, timedelta
        
        try:
            cutoff_date = datetime.now() - timedelta(days=days_old)
            cutoff_timestamp = int(cutoff_date.timestamp())  # Convert to timestamp
            
            old_jobs = self.jobs_collection.get(
                where={"posted_date": {"$lt": cutoff_timestamp}}  # Use numeric comparison
            )
            
            if old_jobs and old_jobs['ids']:
                self.jobs_collection.delete(ids=old_jobs['ids'])
                return len(old_jobs['ids'])
            
            return 0
            
        except Exception as e:
            logger.error(f"Error cleaning up old jobs: {e}")
            return 0

    async def filter_jobs(
        self,
        query_text: str,
        location: Optional[str] = None,
        job_types: Optional[List[str]] = None,
        experience_levels: Optional[List[str]] = None,
        posted_within_days: Optional[int] = None,
        n_results: int = 50
    ) -> List[JobDocument]:
        """
        Filter jobs with multiple criteria.
        
        Args:
            query_text: Search query for semantic matching
            location: Location filter
            job_types: List of job types to include
            experience_levels: List of experience levels to include
            posted_within_days: Only include jobs posted within X days
            n_results: Maximum number of results
        
        Returns:
            List of matching JobDocument objects
        """
        try:
            query_embedding = await self.embedding_provider.embed(query_text)
            
            # Build ChromaDB where filter
            where_filter = {}
            
            if location:
                where_filter["location"] = {"$eq": location}
            
            if job_types:
                where_filter["job_type"] = {"$in": job_types}
            
            if experience_levels:
                where_filter["experience_level"] = {"$in": experience_levels}
            
            if posted_within_days:
                from datetime import datetime, timedelta
                cutoff_date = datetime.now() - timedelta(days=posted_within_days)
                cutoff_timestamp = int(cutoff_date.timestamp())  # Convert to timestamp
                where_filter["posted_date"] = {"$gte": cutoff_timestamp}  # Use numeric comparison
        
            # Query with filters
            results = self.jobs_collection.query(
                query_embeddings=[query_embedding],
                n_results=n_results,
                where=where_filter if where_filter else None
            )
            
            # Convert to JobDocument objects
            jobs = []
            if results['ids'] and results['ids'][0]:
                for i, job_id in enumerate(results['ids'][0]):
                    metadata = results['metadatas'][0][i]
                    distance = results['distances'][0][i]
                    
                    job = self._reconstruct_job(metadata, distance, query_text)
                    jobs.append(job)
        
            return jobs
    
        except Exception as e:
            raise DBAccessError(f"Failed to filter jobs: {str(e)}")

    async def flexible_filter_jobs(
        self,
        query_text: str,
        location: Optional[str] = None,
        job_types: Optional[List[str]] = None,
        experience_levels: Optional[List[str]] = None,
        posted_within_days: Optional[int] = None,
        n_results: int = 50
    ) -> List[JobDocument]:
        """
        Flexible filter jobs with OR logic for multiple criteria.
        
        Args:
            query_text: Search query for semantic matching
            location: Location filter
            job_types: List of job types to include
            experience_levels: List of experience levels to include
            posted_within_days: Only include jobs posted within X days
            n_results: Maximum number of results
        
        Returns:
            List of matching JobDocument objects
        """
        try:
            query_embedding = await self.embedding_provider.embed(query_text)
            
            all_jobs = []
            
            # Strategy 1: Search by each location separately
            if location:
                try:
                    location_results = self.jobs_collection.query(
                        query_embeddings=[query_embedding],
                        n_results=n_results,
                        where={"location": {"$eq": location}}
                    )
                    all_jobs.extend(self._convert_results_to_jobs(location_results, query_text))
                except Exception as e:
                    logger.error(f"Location search failed: {e}")
            
            # Strategy 2: Search by job types separately
            if job_types:
                for job_type in job_types:
                    try:
                        type_results = self.jobs_collection.query(
                            query_embeddings=[query_embedding],
                            n_results=n_results // len(job_types),
                            where={"job_type": {"$eq": job_type}}
                        )
                        all_jobs.extend(self._convert_results_to_jobs(type_results, query_text))
                    except Exception as e:
                        logger.error(f"Job type search failed for {job_type}: {e}")
            
            # Strategy 3: Search by experience levels separately
            if experience_levels:
                for exp_level in experience_levels:
                    try:
                        exp_results = self.jobs_collection.query(
                            query_embeddings=[query_embedding],
                            n_results=n_results // len(experience_levels),
                            where={"experience_level": {"$eq": exp_level}}
                        )
                        all_jobs.extend(self._convert_results_to_jobs(exp_results, query_text))
                    except Exception as e:
                        logger.error(f"Experience level search failed for {exp_level}: {e}")
            
            # Strategy 4: Date filter if specified
            if posted_within_days:
                try:
                    from datetime import datetime, timedelta
                    cutoff_date = datetime.now() - timedelta(days=posted_within_days)
                    cutoff_timestamp = int(cutoff_date.timestamp())  # Convert to timestamp
                    date_results = self.jobs_collection.query(
                        query_embeddings=[query_embedding],
                        n_results=n_results,
                        where={"posted_date": {"$gte": cutoff_timestamp}}  # Use numeric comparison
                    )
                    all_jobs.extend(self._convert_results_to_jobs(date_results, query_text))
                except Exception as e:
                    logger.error(f"Date filter search failed: {e}")
            
            # Strategy 5: General semantic search as fallback
            try:
                general_results = self.jobs_collection.query(
                    query_embeddings=[query_embedding],
                    n_results=n_results
                )
                all_jobs.extend(self._convert_results_to_jobs(general_results, query_text))
            except Exception as e:
                logger.error(f"General search failed: {e}")
            
            # Remove duplicates while preserving best match scores
            unique_jobs = {}
            for job in all_jobs:
                if job.job_id not in unique_jobs:
                    unique_jobs[job.job_id] = job
                elif (job.match_score or 0) > (unique_jobs[job.job_id].match_score or 0):
                    unique_jobs[job.job_id] = job
            
            # Sort by match score and return top results
            sorted_jobs = sorted(
                unique_jobs.values(),
                key=lambda x: x.match_score or 0,
                reverse=True
            )
            
            return sorted_jobs[:n_results]
        
        except Exception as e:
            raise DBAccessError(f"Failed to filter jobs flexibly: {str(e)}")

    def _convert_results_to_jobs(self, results, query_text: str = None) -> List[JobDocument]:
        """Convert ChromaDB results to JobDocument list."""
        jobs = []
        if results['ids'] and results['ids'][0]:
            for i, job_id in enumerate(results['ids'][0]):
                metadata = results['metadatas'][0][i]
                distance = results['distances'][0][i]
                job = self._reconstruct_job(metadata, distance, query_text)
                jobs.append(job)
        return jobs

    async def search_jobs_by_resume(
        self,
        resume_text: str,
        job_functions: Optional[List[str]] = None,
        locations: Optional[List[str]] = None,
        job_types: Optional[List[str]] = None,
        experience_levels: Optional[List[str]] = None,
        work_models: Optional[List[str]] = None,
        required_skills: Optional[List[str]] = None,
        posted_within_days: Optional[int] = None,
        n_results: int = 50
    ) -> List[JobDocument]:
        """
        Search jobs using resume content and flexible filtering.
        
        Combines semantic search with resume content and applies filters flexibly.
        """
        try:
            # Create search query from resume and job functions
            search_parts = [resume_text]
            
            if job_functions:
                search_parts.extend(job_functions)
                
            if required_skills:
                search_parts.extend(required_skills[:10])
            
            search_query = " ".join(search_parts)
            
            # Get embedding for the combined search query
            query_embedding = await self.embedding_provider.embed(search_query)
            
            all_jobs = []
            search_strategies = []
            
            # Strategy 1: Location-based searches
            if locations:
                for location in locations[:5]:  # Limit to 5 locations
                    search_strategies.append({"location": {"$eq": location}})
            
            # Strategy 2: Job type searches
            if job_types:
                for job_type in job_types:
                    search_strategies.append({"job_type": {"$eq": job_type}})
            
            # Strategy 3: Experience level searches
            if experience_levels:
                for exp_level in experience_levels:
                    search_strategies.append({"experience_level": {"$eq": exp_level}})
            
            # Strategy 4: Date filter
            if posted_within_days:
                from datetime import datetime, timedelta
                cutoff_date = datetime.now() - timedelta(days=posted_within_days)
                cutoff_timestamp = int(cutoff_date.timestamp())  # Convert to timestamp
                search_strategies.append({"posted_date": {"$gte": cutoff_timestamp}})  # Use numeric comparison
        
            # Execute each search strategy
            results_per_strategy = max(10, n_results // max(len(search_strategies), 1))
            
            for strategy in search_strategies:
                try:
                    results = self.jobs_collection.query(
                        query_embeddings=[query_embedding],
                        n_results=results_per_strategy,
                        where=strategy
                    )
                    all_jobs.extend(self._convert_results_to_jobs(results, search_query))
                except Exception as e:
                    logger.error(f"Strategy search failed: {e}")
        
            # Always do a general search as fallback
            try:
                general_results = self.jobs_collection.query(
                    query_embeddings=[query_embedding],
                    n_results=n_results
                )
                all_jobs.extend(self._convert_results_to_jobs(general_results, search_query))
            except Exception as e:
                logger.error(f"General search failed: {e}")
        
            # Remove duplicates and keep best match scores
            unique_jobs = {}
            for job in all_jobs:
                if job.job_id not in unique_jobs:
                    unique_jobs[job.job_id] = job
                elif (job.match_score or 0) > (unique_jobs[job.job_id].match_score or 0):
                    unique_jobs[job.job_id] = job
            
            # Apply work model and skill filters
            filtered_jobs = []
            for job in unique_jobs.values():
                if work_models:
                    job_text = f"{job.title} {job.description}".lower()
                    work_model_match = any(
                        model.lower() in job_text for model in work_models
                    )
                    if not work_model_match:
                        pass
                
                if required_skills:
                    job_skills_lower = [s.lower() for s in (job.skills or [])]
                    job_text_lower = f"{job.title} {job.description}".lower()
                    
                    skill_match = any(
                        skill.lower() in job_skills_lower or skill.lower() in job_text_lower
                        for skill in required_skills
                    )
                    if not skill_match:
                        if job.match_score:
                            job.match_score *= 0.8 
                
                filtered_jobs.append(job)
            
            # Sort by match score
            sorted_jobs = sorted(
                filtered_jobs,
                key=lambda x: x.match_score or 0,
                reverse=True
            )
            
            return sorted_jobs[:n_results]
            
        except Exception as e:
            raise DBAccessError(f"Failed to search jobs by resume: {str(e)}")
import requests
import os
from typing import List, Dict, Optional
from shared.helpers.logger import get_logger

logger = get_logger(__name__)
import time

class JSearchFetcher:
    """Fetches jobs from RapidAPI JSearch API (aggregates multiple job sites)"""
    
    def __init__(self):
        self.base_url = "https://jsearch.p.rapidapi.com/search"
        self.headers = {
            "X-RapidAPI-Key": os.getenv("RAPIDAPI_KEY", ""),
            "X-RapidAPI-Host": "jsearch.p.rapidapi.com"
        }
        logger.info(f"JSearchFetcher initialized. Base URL: {self.base_url}")
    
    def fetch_jobs(
        self,
        query: str,
        location: Optional[str] = None,
        country: str = "us",
        date_posted: str = "all",
        employment_types: Optional[str] = None,
        remote_only: bool = False,
        page: int = 1,
        num_pages: int = 1,
        limit: int = 50
    ) -> List[Dict]:
        """
        Fetch jobs from JSearch API.
        
        Args:
            query: Job search query (e.g., "python developer in chicago")
            location: Optional location to append to query
            country: Country code 
            date_posted: 'all', 'today', '3days', 'week', 'month'
            employment_types: Comma-separated: 'FULLTIME,PARTTIME,CONTRACTOR,INTERN'
            remote_only: Filter for remote jobs only
            page: Page number to start from
            num_pages: Number of pages to fetch
            limit: Maximum jobs to return
        
        Returns:
            List of job dictionaries
        """
        jobs = []
        
        # Build query string
        full_query = query
        if location and location.lower() not in query.lower():
            full_query = f"{query} in {location}"
        
        logger.info(f"JSearch query: '{full_query}' | Country: {country} | Pages: {num_pages}")
        
        for current_page in range(page, page + num_pages):
            if len(jobs) >= limit:
                break
            
            params = {
                "query": full_query,
                "page": str(current_page),
                "num_pages": "1",  
                "country": country,
                "date_posted": date_posted
            }
            
            if employment_types:
                params["employment_types"] = employment_types
            
            if remote_only:
                params["work_from_home"] = "true"
            
            try:
                response = requests.get(
                    self.base_url,
                    headers=self.headers,
                    params=params,
                    timeout=30
                )
                
                # Handle rate limiting
                if response.status_code == 429:
                    logger.warning(f"Rate limit hit on page {current_page}")
                    break
                
                # Handle forbidden
                if response.status_code == 403:
                    logger.warning(f"Access forbidden. Check API subscription.")
                    break
                
                response.raise_for_status()
                
                data = response.json()
                
                # Extract jobs from response
                if data.get("status") == "OK":
                    batch = data.get("data", [])
                    
                    if not batch:
                        logger.debug(f"Empty response on page {current_page}")
                        break
                    
                    jobs.extend(batch)
                    logger.info(f"Fetched {len(batch)} jobs from page {current_page} (Total: {len(jobs)})")

                    time.sleep(1)
                else:
                    logger.warning(f"API returned status: {data.get('status')}")
                    break
                    
            except requests.exceptions.RequestException as e:
                logger.error(f"Error fetching page {current_page}: {e}")
                break
        
        return jobs[:limit]
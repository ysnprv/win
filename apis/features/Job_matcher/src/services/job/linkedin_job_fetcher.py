import requests
import os
from typing import List, Dict
from shared.helpers.logger import get_logger
from features.Job_matcher.config.settings import TARGET_COUNTRIES

logger = get_logger(__name__)
import time

class LinkedInJobFetcher:
    """Fetches jobs from RapidAPI LinkedIn Jobs API"""
    
    def __init__(self):
        self.base_url = "https://linkedin-job-search-api.p.rapidapi.com/active-jb-24h"
        self.headers = {
            "X-RapidAPI-Key": os.getenv("RAPIDAPI_KEY", ""),
            "X-RapidAPI-Host": "linkedin-job-search-api.p.rapidapi.com"
        }
        logger.info(f"JobFetcher initialized. Base URL: {self.base_url}")
    
    def fetch_jobs_for_location(
        self, 
        location: str, 
        title_filter: str = "Data Engineer OR Software Engineer OR Developer",
        limit: int = 100
    ) -> List[Dict]:
        """Fetch jobs for a specific location"""
        jobs = []
        offset = 0
        consecutive_empty = 0
        
        while len(jobs) < limit and consecutive_empty < 2:
            logger.debug(f"requesting offset={offset} need={limit - len(jobs)}")
            params = {
                "location_filter": location,
                "title_filter": title_filter,
                "limit": min(100, limit - len(jobs)),
                "offset": offset,
                "description_type": "text",
                "type_filter": "FULL_TIME",
                "remote": "true"
            }
            
            try:
                response = requests.get(self.base_url, headers=self.headers, params=params, timeout=30)
                
                if response.status_code == 429:
                    logger.warning(f"Rate limit hit for {location}. Skipping...")
                    break
                
                if response.status_code == 403:
                    logger.warning(f"Access forbidden for {location}. Check API key.")
                    break
                
                response.raise_for_status()
                data = response.json()
                
                # Handle different response formats
                if isinstance(data, list):
                    batch = data   
                elif isinstance(data, dict):
                    batch = data.get("data", [])
                else:
                    batch = []
                
                if not batch:
                    consecutive_empty += 1
                    logger.debug(f"Empty response (attempt {consecutive_empty}/2)")
                    
                    if consecutive_empty >= 2:
                        logger.info(f"No jobs found for {location} after 2 attempts")
                        break
                    
                    time.sleep(2)
                    continue  # Try again without incrementing offset
                
                consecutive_empty = 0
                jobs.extend(batch)
                offset += len(batch)
                
                logger.info(f" Fetched {len(batch)} jobs from {location} (Total: {len(jobs)})")
                time.sleep(1)
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Error: {e}")
                break

        return jobs
    
    def fetch_all_regions(self, limit_per_region: int = 100) -> List[Dict]:
        """
        Fetch jobs from all target regions (MENA + Africa)
        
        Returns:
            List of all fetched jobs
        """
        all_jobs = []
        
        for country in TARGET_COUNTRIES:
            logger.info(f"\n Fetching jobs from {country}...")
            jobs = self.fetch_jobs_for_location(country, limit=limit_per_region)
            all_jobs.extend(jobs)
            
            # Add source country for tracking
            for job in jobs:
                job["fetched_from_country"] = country
        
        logger.info(f"\n Total jobs fetched: {len(all_jobs)}")
        return all_jobs


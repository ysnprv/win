import requests
import os
from typing import List, Dict, Optional
from shared.helpers.logger import get_logger

logger = get_logger(__name__)
import time


class InternshipFetcher:
    """Fetches internship jobs from RapidAPI Internships API"""
    
    def __init__(self):
        self.base_url = "https://internships-api.p.rapidapi.com/active-jb-7d"
        self.headers = {
            "X-RapidAPI-Key": os.getenv("RAPIDAPI_KEY", ""),
            "X-RapidAPI-Host": "internships-api.p.rapidapi.com"
        }
        logger.info(f"InternshipFetcher initialized. Base URL: {self.base_url}")
    
    def fetch_internships(
        self,
        title_filter: Optional[str] = None,
        location_filter: Optional[str] = None,
        description_filter: Optional[str] = None,
        remote: Optional[bool] = None,
        date_filter: Optional[str] = None,
        description_type: Optional[str] = None,
        limit: int = 50,
        max_retries: int = 3
    ) -> List[Dict]:
        """Fetch internships with flexible filtering"""
        logger.info(f"fetch_internships start: title={title_filter}, location={location_filter}, limit={limit}")
        
        jobs = []
        offset = 0
        
        while len(jobs) < limit:
            logger.debug(f"requesting offset={offset} need={limit - len(jobs)}")

            params = {
                "offset": offset,
            }
            
            if title_filter:
                params["title_filter"] = title_filter
            if location_filter:
                params["location_filter"] = location_filter
            if description_filter:
                params["description_filter"] = description_filter
            if remote is not None:
                params["remote"] = "true" if remote else "false"
            if date_filter:
                params["date_filter"] = date_filter
            if description_type:
                params["description_type"] = description_type
        
            success = False  # Flag to track if we got data
        
            for attempt in range(max_retries):
                try:
                    logger.debug(f"Request params: {params}")
                    response = requests.get(
                        self.base_url,
                        headers=self.headers,
                        params=params,
                        timeout=30
                    )
                    
                    logger.debug(f"Response status: {response.status_code}")
                    
                    # Handle rate limiting
                    if response.status_code == 429:
                        wait_time = 60 * (attempt + 1)
                        logger.warning(f"Rate limit hit. Waiting {wait_time}s before retry {attempt + 1}/{max_retries}")
                        time.sleep(wait_time)
                        continue
                    
                    response.raise_for_status()
                    
                    data = response.json()
                    logger.debug(f"API response type: {type(data)}")
                    
                    # Handle different response formats
                    if isinstance(data, list):
                        batch = data
                    elif isinstance(data, dict):
                        batch = data.get("data", data.get("jobs", []))
                    else:
                        logger.warning(f"unexpected response format: {data}")
                        batch = []
                    
                    logger.debug(f"Batch size: {len(batch)}")
                    
                    if not batch:
                        logger.debug(f"got empty batch from API (offset={offset}) - no more jobs available")
                        success = False
                        break 
                    
                    jobs.extend(batch)
                    offset += len(batch)
                    success = True
                    
                    logger.info(f"Fetched {len(batch)} internships (Total: {len(jobs)})")
                    
                    # Rate limiting
                    time.sleep(2)
                    break  # Success, exit retry loop
                    
                except requests.exceptions.RequestException as e:
                    logger.error(f"Error fetching internships (attempt {attempt + 1}/{max_retries}): {e}")
                    if attempt < max_retries - 1:
                        time.sleep(5 * (attempt + 1))
                    else:
                        logger.error(f"All retries exhausted. Returning {len(jobs)} jobs collected so far")
                        success = False
                        break

            if not success:
                logger.warning(f"No more data available or all retries failed. Stopping.")
                break
    
        logger.info(f"Final result: {len(jobs)} internships fetched")
        return jobs[:limit]  
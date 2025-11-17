import requests
import os
from typing import List, Dict
from shared.helpers.logger import get_logger

logger = get_logger(__name__)
import time


class UpworkJobFetcher:
    def __init__(self):
        self.base_url = "https://upwork-jobs-api2.p.rapidapi.com"
        self.headers = {
            "X-RapidAPI-Key": os.getenv("RAPIDAPI_KEY", ""),
            "X-RapidAPI-Host": "upwork-jobs-api2.p.rapidapi.com"
        }
        logger.info(f"JobFetcher initialized. Base URL: {self.base_url}")
        
    def get_jobs(self, search_terms: str = None, location: str = None, 
            time_range: str = "24h", limit: int = 10) -> List[Dict]:
    
        time_endpoints = {
            "1h": "/active-freelance-1h",
            "24h": "/active-freelance-24h", 
            "7d": "/active-freelance-7d"
        }
        
        if time_range not in time_endpoints:
            raise ValueError(f"Invalid time_range. Use: {list(time_endpoints.keys())}")
        
        url = f"{self.base_url}{time_endpoints[time_range]}"
        return self._fetch_jobs(url, search_terms, location, limit)

    def _fetch_jobs(self, url: str, search_terms: str, location: str, limit: int):
        jobs = []
        offset = 0
        while len(jobs) < limit:
            logger.debug(f"[debug] requesting offset={offset} need={limit - len(jobs)}")
            params = {
                "location_filter": location,
                "search": search_terms,
                "limit": min(100, limit - len(jobs)),
                "offset": offset,
            }
            
            try:
                response = requests.get(
                    url,
                    headers=self.headers,
                    params=params,
                    timeout=30
                )
                response.raise_for_status()
                
                data = response.json()
                logger.debug(f"API response type: {type(data)}")
                
                # Handle different response formats
                if isinstance(data, list):
                    batch = data  # API returns jobs directly as a list
                elif isinstance(data, dict):
                    batch = data.get("data", [])  # API returns {"data": [...]}
                else:
                    logger.warning(f"unexpected response format: {data}")
                    batch = []
                
                if not batch:
                    logger.debug(f"got empty batch from API (offset={offset}) - breaking")
                    break  # No more jobs available
                
                jobs.extend(batch)
                offset += len(batch)
                
                logger.info(f" Fetched {len(batch)} jobs from {location} (Total: {len(jobs)})")
                
                # Rate limiting: avoid hitting API limits
                time.sleep(1)
                
            except requests.exceptions.RequestException as e:
                logger.error(f"Error fetching jobs from {location}: {e}")
                logger.debug(f"Response status: {response.status_code if 'response' in locals() else 'No response'}")
                break
        
        return jobs
    

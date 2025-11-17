from typing import Dict, Union
from shared.helpers.logger import get_logger

logger = get_logger(__name__)
from datetime import datetime, timezone, timedelta
import re


def parse_timestamp(timestamp: Union[str, int, datetime, None]) -> datetime:

    if timestamp is None:
        return datetime.now(tz=timezone.utc)
    
    if isinstance(timestamp, datetime):
        if timestamp.tzinfo is None:
            return timestamp.replace(tzinfo=timezone.utc)
        return timestamp
    
    if isinstance(timestamp, int):
        try:
            return datetime.fromtimestamp(timestamp, tz=timezone.utc)
        except (ValueError, OSError):
            try:
                return datetime.fromtimestamp(timestamp / 1000, tz=timezone.utc)
            except:
                return datetime.now(tz=timezone.utc)
    
    if isinstance(timestamp, str):
        timestamp = timestamp.strip()
        relative_match = re.match(
            r'(\d+)\s+(second|minute|hour|day|week|month)s?\s+ago', 
            timestamp.lower()
        )
        if relative_match:
            value = int(relative_match.group(1))
            unit = relative_match.group(2)
            
            now = datetime.now(tz=timezone.utc)
            
            if unit == 'second':
                return now - timedelta(seconds=value)
            elif unit == 'minute':
                return now - timedelta(minutes=value)
            elif unit == 'hour':
                return now - timedelta(hours=value)
            elif unit == 'day':
                return now - timedelta(days=value)
            elif unit == 'week':
                return now - timedelta(weeks=value)
            elif unit == 'month':
                return now - timedelta(days=value * 30)
    
        try:
            timestamp_clean = timestamp.replace('Z', '+00:00')
            return datetime.fromisoformat(timestamp_clean)
        except ValueError:
            pass
        
        try:
            dt = datetime.fromisoformat(timestamp)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except ValueError:
            pass
        
        try:
            dt = datetime.strptime(timestamp, "%Y-%m-%d")
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
        
        try:
            dt = datetime.strptime(timestamp, "%Y-%m-%dT%H:%M:%S")
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    
    logger.warning(f"Could not parse timestamp: {timestamp}, using current time")
    return datetime.now(tz=timezone.utc)

def get_country_code(location: str) -> str:
        """Map location to country code"""
        country_map = {
            "united states": "us",
            "canada": "ca",
            "germany": "de",
            "uk": "gb",
            "united kingdom": "gb",
            "france": "fr",
            "tunisia": "tn",
            "morocco": "ma",
            "egypt": "eg"
        }
        
        location_lower = location.lower()
        return country_map.get(location_lower, "us")
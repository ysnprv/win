from typing import List, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime

class JobDocument(BaseModel):
    job_id: str
    title: str
    company: str
    location: str
    description: str
    skills: List[str] = Field(default_factory=list)
    job_type: str = "full_time"  # full_time, part_time, internship
    experience_level: str = "mid"  # entry, mid, senior
    source: Literal["linkedin", "upwork", "internship", "jsearch"] 
    source_job_id: str
    source_url: str
    posted_date: datetime
    match_score: Optional[float] = None
    
    class Config:
        extra = "forbid"  
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }
    
    def model_dump(self, **kwargs):
        data = super().model_dump(**kwargs)
        
        if isinstance(data.get("posted_date"), datetime):
            data["posted_date"] = data["posted_date"].isoformat()
        
        return data
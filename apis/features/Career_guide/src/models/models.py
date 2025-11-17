from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class CareerGuideOutput(BaseModel):
    """Complete career guide output from the LLM - simplified flat format."""
    current_strengths: List[str] = Field(
        ...,
        min_length=1,
        description="List of user's current strengths"
    )
    readiness_score: int = Field(
        ...,
        ge=0,
        le=100,
        description="Readiness score 0-100"
    )
    skills_to_learn: List[str] = Field(
        ...,
        min_length=1,
        description="Skills to learn"
    )
    projects_to_work_on: List[str] = Field(
        ...,
        min_length=1,
        description="Projects to work on"
    )
    soft_skills_to_develop: List[str] = Field(
        ...,
        min_length=1,
        description="Soft skills to develop"
    )
    career_roadmap: List[str] = Field(
        ...,
        min_length=5,
        max_length=5,
        description="5-step career roadmap"
    )

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format for JSON serialization."""
        return {
            "current_strengths": self.current_strengths,
            "readiness_score": self.readiness_score,
            "skills_to_learn": self.skills_to_learn,
            "projects_to_work_on": self.projects_to_work_on,
            "soft_skills_to_develop": self.soft_skills_to_develop,
            "career_roadmap": self.career_roadmap
        }


class CareerGuideInput(BaseModel):
    """Input data for career guide generation."""
    cv_text: str = Field(..., description="CV content as text")
    profile_data: Optional[str] = Field(None, description="Optional profile data JSON string")
    target_job: Optional[str] = Field(None, description="Target job title (optional)")
    current_job: str = Field(..., description="Current job title")
    domain: str = Field(..., description="Work domain")

    def get_combined_user_data(self) -> str:
        """
        Combine all user data into a single string for embedding/search.
        
        Returns:
            Combined string with all user information
        """
        parts = [
            f"CV:\n{self.cv_text}",
        ]
        
        if self.profile_data:
            parts.append(f"\nPROFILE:\n{self.profile_data}")
        
        if self.current_job:
            parts.append(f"\nCURRENT JOB: {self.current_job}")
        
        if self.target_job:
            parts.append(f"\nTARGET JOB: {self.target_job}")
        
        return "\n".join(parts)

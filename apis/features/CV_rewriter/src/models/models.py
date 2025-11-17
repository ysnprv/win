from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict


class QuestionAnswer(BaseModel):
    """Question-answer pair from user."""
    question: str
    answer: str


class QueryResponse(BaseModel):
    """Response containing generated queries for the user."""
    queries: Dict[str, str] = Field(default_factory=dict)  # e.g., {"q1": "question 1", "q2": "question 2"}


class JobDescription(BaseModel):
    """Parsed job description - ultra-flexible model that accepts any structure.

    Standard fields are defined below, but AI can add any additional fields
    it extracts from the job posting (e.g., salary, benefits, team_size, etc.)
    No validation to ensure robustness - we normalize in the parser.
    """

    model_config = ConfigDict(extra="allow", arbitrary_types_allowed=True)

    title: str = "Position"
    company: Optional[str] = None
    location: Optional[Any] = None  # Can be string, list, or anything
    description: str = ""
    responsibilities: List[str] = Field(default_factory=list)
    requirements: List[str] = Field(default_factory=list)
    preferred_qualifications: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    raw_content: str = ""


class EnhancedCV(BaseModel):
    """Enhanced CV content with iteration tracking."""

    content: str = ""
    target_jobs: str = ""
    iteration: int = 1
    similarity_score: float = 0.0


class FinalCV(BaseModel):
    """Final assembled CV with iteration metadata and optional PDF."""

    model_config = ConfigDict(arbitrary_types_allowed=True)

    content: str = ""  # LaTeX-formatted content
    pdf_bytes: Optional[bytes] = None  # PDF file bytes (if generated)
    iterations_performed: int = 1
    final_similarity: float = 0.0
    original_score: float = 0.0
    enhanced_anonymized_text: Optional[str] = None  # Enhanced CV before personal info reinjection

from typing import Dict, Any
from pydantic import BaseModel, ConfigDict, Field


class AnonymizedCV(BaseModel):
    """CV with personal info extracted - ultra-flexible.

    personal_data is a flexible dict where AI can extract any fields it deems personal.
    Common fields: name, email, phone, location, linkedin, portfolio, etc.
    """

    model_config = ConfigDict(arbitrary_types_allowed=True)

    personal_data: Dict[str, Any] = Field(default_factory=dict)
    anonymized_text: str = ""

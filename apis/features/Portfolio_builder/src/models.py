from typing import Optional
from pydantic import BaseModel, field_validator


class PortfolioRequest(BaseModel):
    """Request model for portfolio generation."""
    wireframe: str  # 'classic', 'sidepanel', 'blogpost'
    theme: str  # predefined theme name or custom description
    cv_content: str  # scraped CV content in markdown
    
    @field_validator("wireframe")
    @classmethod
    def validate_wireframe(cls, v):
        # Normalize 'blog' to 'blogpost' for consistency FIRST
        if v == "blog":
            v = "blogpost"
        
        valid_wireframes = ["classic", "sidepanel", "blogpost", "hero", "gallery"]
        if v not in valid_wireframes:
            raise ValueError(f"wireframe must be one of {valid_wireframes}")
        return v
    
    @field_validator("cv_content")
    @classmethod
    def validate_cv_content(cls, v):
        if len(v.strip()) < 10:
            raise ValueError("CV content too short (min 10 chars)")
        return v
    
    @field_validator("theme")
    @classmethod
    def validate_theme(cls, v):
        if len(v.strip()) < 3:
            raise ValueError("Theme description too short (min 3 chars)")
        return v


class Portfolio(BaseModel):
    """Generated portfolio HTML."""
    html_content: str
    wireframe_used: str
    theme_applied: str
    
    @field_validator("html_content")
    @classmethod
    def validate_html_content(cls, v):
        if len(v.strip()) < 100:
            raise ValueError("Generated HTML too short (min 100 chars)")
        if "<!DOCTYPE html>" not in v and "<html" not in v:
            raise ValueError("Invalid HTML: missing doctype or html tag")
        return v

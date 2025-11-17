from typing import Dict
from features.Job_matcher.src.models.job_models import JobDocument
from features.Job_matcher.src.utils.helper import parse_timestamp


class JobConverter:
    """
    Converts raw job data from different APIs to standardized JobDocument format.
    """
    @staticmethod
    def from_linkedin(linkedin_job: Dict) -> JobDocument:
        """Convert LinkedIn API response to JobDocument"""
    
        posted_date = parse_timestamp(
            linkedin_job.get("date_posted")
        )
        
        return JobDocument(
            job_id=f"linkedin_{linkedin_job.get('id', 'unknown')}",
            title=linkedin_job.get("title", ""),
            company=linkedin_job.get("organization", ""),
            location=linkedin_job.get("location", ""),
            description=linkedin_job.get("description", ""),
            skills=linkedin_job.get("skills", []),
            job_type="full_time",
            experience_level="mid",
            source="linkedin",
            source_job_id=linkedin_job.get("id", ""),
            source_url=linkedin_job.get("url", ""),
            posted_date=posted_date
        )
    
    @staticmethod
    def from_upwork(upwork_job: Dict) -> JobDocument:
        """Convert Upwork API response to JobDocument"""
        
        raw_skills = upwork_job.get("skills", [])
        if raw_skills and isinstance(raw_skills[0], dict):
            skills = [skill.get("name", skill.get("id", "")) for skill in raw_skills if isinstance(skill, dict)]
        else:
            skills = raw_skills if isinstance(raw_skills, list) else []
        
        job_id = upwork_job.get("id", "unknown")
        source_job_id = str(job_id) if job_id else "unknown"
        
        posted_date = parse_timestamp(
            upwork_job.get("date_posted")
        )
        
        return JobDocument(
            job_id=f"upwork_{source_job_id}",
            title=upwork_job.get("title", ""),
            company=upwork_job.get("client_name", "Upwork Client"),
            location="Remote",
            description=upwork_job.get("description", ""),
            skills=skills,
            job_type="full_time",
            experience_level="mid",
            source="upwork",
            source_job_id=source_job_id,
            source_url=upwork_job.get("url", ""),
            posted_date=posted_date
        )
    
    @staticmethod
    def from_internship(internship_job: Dict) -> JobDocument:
        """Convert Internship API response to JobDocument"""
        
        posted_date = parse_timestamp(
            internship_job.get("date_posted")
        )
        
        return JobDocument(
            job_id=f"internship_{internship_job.get('id', 'unknown')}",
            title=internship_job.get("title", ""),
            company=internship_job.get("company", internship_job.get("organization", "Unknown Company")),
            location=internship_job.get("location", "Remote"),
            description=internship_job.get("description", ""),
            skills=internship_job.get("skills", internship_job.get("required_skills", [])),
            job_type="internship",
            experience_level="entry",
            source="internship",
            source_job_id=internship_job.get("id", ""),
            source_url=internship_job.get("url", internship_job.get("application_url", "")),
            posted_date=posted_date
        )
    
    @staticmethod
    def from_jsearch(jsearch_job: Dict) -> JobDocument:
        """Convert JSearch API response to JobDocument"""
        
        # Extract skills from job_highlights if available
        skills = []
        highlights = jsearch_job.get("job_highlights", {})
        qualifications = highlights.get("Qualifications", [])
        
        # Simple skill extraction from qualifications
        for qual in qualifications[:5]:
            common_skills = ["Python", "Java", "JavaScript", "React", "Node.js", 
                            "SQL", "AWS", "Docker", "Kubernetes", "TypeScript"]
            for skill in common_skills:
                if skill.lower() in qual.lower() and skill not in skills:
                    skills.append(skill)
        
        # Map employment type
        employment_type = jsearch_job.get("job_employment_type", "FULLTIME")
        job_type_map = {
            "FULLTIME": "full_time",
            "PARTTIME": "part_time",
            "CONTRACTOR": "contract",
            "INTERN": "internship"
        }
        job_type = job_type_map.get(employment_type, "full_time")
        
        # Determine experience level from title
        title = jsearch_job.get("job_title", "").lower()
        if "senior" in title or "sr" in title or "lead" in title:
            experience_level = "senior"
        elif "junior" in title or "jr" in title or "entry" in title:
            experience_level = "entry"
        elif "intern" in title:
            experience_level = "entry"
        else:
            experience_level = "mid"
        
        # Handle null locations 
        location = jsearch_job.get("job_location")
        if not location:
            city = jsearch_job.get("job_city")
            state = jsearch_job.get("job_state")
            country = jsearch_job.get("job_country")
            
            if city and state:
                location = f"{city}, {state}"
            elif city:
                location = city
            elif country:
                location = country
            else:
                location = "Remote"
        
        location = location or "Remote"

        posted_date = parse_timestamp(jsearch_job.get("job_posted_at_timestamp"))
        
        return JobDocument(
            job_id=f"jsearch_{jsearch_job.get('job_id', 'unknown')}",
            title=jsearch_job.get("job_title", "Unknown Position"),
            company=jsearch_job.get("employer_name", "Unknown Company"),
            location=location,
            description=jsearch_job.get("job_description", "")[:1000],
            skills=skills,
            job_type=job_type,
            experience_level=experience_level,
            source="jsearch",
            source_job_id=jsearch_job.get("job_id", ""),
            source_url=jsearch_job.get("job_apply_link", ""),
            posted_date=posted_date  
        )

    @staticmethod
    def from_api_response(source: str, job_data: Dict) -> JobDocument:
        """Factory method to convert job data based on source."""
        converters = {
            "linkedin": JobConverter.from_linkedin,
            "upwork": JobConverter.from_upwork, 
            "internship": JobConverter.from_internship,
            "jsearch": JobConverter.from_jsearch  
        }
        
        converter = converters.get(source)
        if not converter:
            raise ValueError(f"Unknown job source: {source}")
        
        return converter(job_data)
from typing import Dict

class ProfileValidator:
    """Validate and enhance profile data"""
    
    def validate_and_enhance_profile(self, profile_data: Dict) -> Dict:
        """Validate and enhance the LLM-generated profile data."""
        
        # Ensure required sections exist
        if "candidate_profile" not in profile_data:
            profile_data["candidate_profile"] = {}
        
        if "job_search_filters" not in profile_data:
            profile_data["job_search_filters"] = {}
        
        candidate = profile_data["candidate_profile"]
        job_filters = profile_data["job_search_filters"]
        
        # Validate student logic
        if candidate.get("candidate_type") == "student":
            candidate["is_student"] = True
        
        # Ensure job types include appropriate options for students
        if candidate.get("is_student"):
            job_types = job_filters.get("job_types", [])
            student_job_types = ["internship", "part_time", "entry_level"]
            
            for job_type in student_job_types:
                if job_type not in job_types:
                    job_types.append(job_type)
            
            job_filters["job_types"] = job_types
            job_filters["experience_level"] = "entry"
        
        # Critical validation: Check for job titles
        if not job_filters.get("primary_job_titles"):
            return {
                "success": False,
                "error": "Unable to determine suitable job titles from your profile",
                "suggestion": "Please provide more details about your target roles or update your resume with clearer job objectives",
                "fallback_action": "Consider manually specifying job titles in preferences"
            }
        
        # Ensure we have skills
        if not job_filters.get("key_skills_for_matching"):
            tech_skills = profile_data.get("technical_skills", {})
            skills = []
            
            if tech_skills.get("programming_languages"):
                skills.extend(tech_skills["programming_languages"][:3])
            
            if tech_skills.get("frameworks_and_tools"):
                skills.extend(tech_skills["frameworks_and_tools"][:2])
            
            job_filters["key_skills_for_matching"] = skills[:5] if skills else ["Communication", "Problem Solving"]
        
        # Set default locations if not specified
        if not job_filters.get("location_preferences"):
            job_filters["location_preferences"] = ["Tunisia", "Morocco", "Egypt"]
        
        return profile_data
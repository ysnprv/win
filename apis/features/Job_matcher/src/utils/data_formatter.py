from typing import Dict, Optional


class DataFormatter:
    """Format external data for LLM prompts"""
    
    def format_github_data(self, github_data: Optional[Dict]) -> str:
        """Format GitHub data for LLM consumption."""
        if not github_data or github_data.get("error"):
            return "GitHub data not available"
        
        formatted = []
        
        profile = github_data.get("profile", {})
        formatted.append(f"GitHub: {profile.get('username')} - {profile.get('public_repos', 0)} repos")
        
        if profile.get("bio"):
            formatted.append(f"Bio: {profile.get('bio')}")
        
        contributions = github_data.get("contributions", {})
        total_contributions = contributions.get("total_contributions_last_year", "Unknown")
        formatted.append(f"Contributions (Last Year): {total_contributions}")
        
        skills = github_data.get("technical_skills", {})
        if skills.get("programming_languages"):
            formatted.append(f"Languages: {', '.join(skills['programming_languages'][:5])}")
        
        if skills.get("frameworks_and_libraries"):
            formatted.append(f"Frameworks: {', '.join(skills['frameworks_and_libraries'][:5])}")
        
        projects = github_data.get("projects", {})
        pinned = projects.get("pinned_projects", [])
        if pinned:
            formatted.append("Key Projects:")
            for project in pinned[:3]:
                formatted.append(f"- {project['name']}: {project.get('description', 'No description')[:100]}")
        
        return "\n".join(formatted)
    
    def format_user_preferences(self, preferences: Optional[Dict]) -> str:
        """Format user preferences for LLM consumption."""
        if not preferences:
            return "No specific preferences provided"
        
        formatted = []
        
        if preferences.get("preferred_locations"):
            formatted.append(f"Preferred Locations: {', '.join(preferences['preferred_locations'])}")
        
        if preferences.get("job_types"):
            formatted.append(f"Job Types: {', '.join(preferences['job_types'])}")
        
        if preferences.get("remote_preference"):
            formatted.append(f"Remote Work: {preferences['remote_preference']}")
        
        if preferences.get("industry_preferences"):
            formatted.append(f"Industries: {', '.join(preferences['industry_preferences'])}")
        
        return "\n".join(formatted) if formatted else "No preferences specified"
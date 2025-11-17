from typing import Dict, List

class QueryGenerator:
    """Generate platform-specific job search queries"""
    
    def generate_queries(self, profile: Dict) -> Dict:
        """Generate optimized search queries for job fetcher APIs."""
        job_filters = profile.get("job_search_filters", {})
        candidate_profile = profile.get("candidate_profile", {})
        
        linkedin_queries = self._generate_linkedin_queries(job_filters, candidate_profile)
        upwork_queries = self._generate_upwork_queries(job_filters, candidate_profile)
        jsearch_queries = self._generate_jsearch_queries(job_filters, candidate_profile)  # Add this
        
        locations = job_filters.get("location_preferences", ["Remote"])
        job_types = job_filters.get("job_types", ["full_time"])
        
        return {
            "linkedin": {
                "title_filters": linkedin_queries[:5],
                "locations": locations,
                "job_types": job_types,
                "experience_level": job_filters.get("experience_level", "entry")
            },
            "upwork": {
                "search_terms": upwork_queries,
                "locations": locations,
                "time_range": "24h"
            },
            "jsearch": {  
                "queries": jsearch_queries[:3],
                "locations": locations[:2],  # Top 2 locations
                "employment_types": self._map_job_types(job_types),
                "date_posted": "today",
                "remote_only": job_filters.get("remote_work_suitable", False)
            },
            "general": {
                "is_student": candidate_profile.get("is_student", False),
                "remote_suitable": job_filters.get("remote_work_suitable", True),
                "priority_job_types": job_types
            }
        }
    
    def _generate_linkedin_queries(self, job_filters: Dict, candidate_profile: Dict) -> List[str]:
        """Generate LinkedIn-specific queries"""
        queries = []
        primary_titles = job_filters.get("primary_job_titles", [])
        
        for title in primary_titles:
            title_lower = title.lower()           
            if candidate_profile.get("is_student"):
                if "intern" not in title_lower:
                    queries.extend([
                        f"{title} Intern",
                        f"{title} Internship"
                    ])
                
                queries.extend([
                    f"Student {title}",
                    f"Entry Level {title}",
                    f"Part Time {title}"
                ])
            elif candidate_profile.get("candidate_type") == "new_graduate":
                queries.extend([
                    f"Entry Level {title}",
                    f"Junior {title}",
                    f"Graduate {title}",
                    title
                ])
            else:
                queries.append(title)
        
        return queries
    
    def _generate_upwork_queries(self, job_filters: Dict, candidate_profile: Dict) -> List[str]:
        """Generate Upwork-specific skill-based queries"""
        queries = []
        skills = job_filters.get("key_skills_for_matching", [])
        primary_titles = job_filters.get("primary_job_titles", [])
        
        if len(skills) >= 3:
            queries.extend([
                " OR ".join(skills[:3]),
                " OR ".join(skills[2:5]) if len(skills) >= 5 else " OR ".join(skills),
                f"{primary_titles[0]} {skills[0]}" if primary_titles and skills else ""
            ])
        
        return [q for q in queries if q]
    
    def _generate_jsearch_queries(self, job_filters: Dict, candidate_profile: Dict) -> List[str]:
        """Generate JSearch-specific queries (natural language style)"""
        queries = []
        primary_titles = job_filters.get("primary_job_titles", [])
        skills = job_filters.get("key_skills_for_matching", [])[:3]
        
        for title in primary_titles[:3]:  # Top 3 titles
            if candidate_profile.get("is_student"):
                queries.extend([
                    f"{title} internship",
                    f"entry level {title}",
                    f"{title} for students"
                ])
            else:
                # Add skills to query for better matching
                if skills:
                    queries.append(f"{title} {' '.join(skills[:2])}")
                queries.append(title)
        
        return queries
    
    def _map_job_types(self, job_types: List[str]) -> str:
        """Convert internal job types to JSearch format"""
        type_map = {
            "full_time": "FULLTIME",
            "part_time": "PARTTIME",
            "contract": "CONTRACTOR",
            "internship": "INTERN"
        }
        
        mapped = [type_map.get(jt, "FULLTIME") for jt in job_types if jt in type_map]
        return ",".join(mapped) if mapped else "FULLTIME"
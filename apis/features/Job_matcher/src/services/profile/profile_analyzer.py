from typing import Dict, Optional
from datetime import datetime
from features.Job_matcher.src.utils.data_formatter import DataFormatter
from features.Job_matcher.src.services.profile.profile_validator import ProfileValidator
from features.Job_matcher.src.services.profile.query_generator import QueryGenerator
from features.Job_matcher.src.prompts.profile_analyzer_prompt import PROFILE_ANALYZER_PROMPT
from features.Job_matcher.src.providers.llm_factory import get_llm_provider
from shared.helpers.json_extractor import extract_json_from_response

class ProfileAnalyzer:
    """
    LLM-powered profile analyzer 
    """
    def __init__(self, llm_provider=None):
        if llm_provider:
            self.llm_client = llm_provider
        else:
            # Changed order: Try OpenAI first, then Gemini, then Groq
            try:
                self.llm_client = get_llm_provider("openai", model="gpt-4o-mini")
            except Exception:
                try:
                    self.llm_client = get_llm_provider("gemini", model="gemini-1.5-flash")
                except Exception:
                    try:
                        self.llm_client = get_llm_provider("groq", model="mixtral-8x7b-32768")
                    except Exception:
                        raise Exception("No LLM provider available. Check your API keys.")
        
        self.prompt_template = PROFILE_ANALYZER_PROMPT
        self.data_formatter = DataFormatter()
        self.validator = ProfileValidator()
        self.query_generator = QueryGenerator()
    
    async def analyze_profile(
        self, 
        resume_content: str, 
        github_data: Optional[Dict] = None,
        user_preferences: Optional[Dict] = None
    ) -> Dict:
        """
        Analyze candidate profile and return job search parameters.
        """
        # Format inputs
        github_data_str = self.data_formatter.format_github_data(github_data)
        user_preferences_str = self.data_formatter.format_user_preferences(user_preferences)
        
        formatted_prompt = self.prompt_template.format(
            resume_content=resume_content,
            github_data=github_data_str,
            user_preferences=user_preferences_str
        )
        
        try:
            response = await self.llm_client.generate_response(
                prompt=formatted_prompt,
                temperature=0.1, 
                max_tokens=2000
            )
            
            raw_snippet = response[:2000] if response else ""
            
            try:
                profile_data = extract_json_from_response(response)
            except Exception as json_error:
                return {
                    "success": False,
                    "error": f"Failed to parse LLM response as JSON: {str(json_error)}",
                    "raw_response": raw_snippet
                }
            
            # Validate structure
            if not isinstance(profile_data, dict):
                return {
                    "success": False,
                    "error": "LLM returned invalid JSON structure (expected object).",
                    "raw_response": raw_snippet
                }
            
            # Validate and enhance profile
            validation_result = self.validator.validate_and_enhance_profile(profile_data)
            
            # If validation failed, return error
            if not validation_result.get("success", True):
                return validation_result
            
            validated_profile = validation_result
            
            search_queries = self.query_generator.generate_queries(validated_profile)
            
            return {
                "success": True,
                "profile": validated_profile,
                "job_search_queries": search_queries,
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": f"Profile analysis failed: {str(e)}"
            }


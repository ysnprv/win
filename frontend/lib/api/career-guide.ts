/**
 * Career Guide API Client
 * Handles communication with the career guide backend service
 */

export interface CareerGuideResponse {
  current_strengths: string[];
  readiness_score: number;
  skills_to_learn: string[];
  projects_to_work_on: string[];
  soft_skills_to_develop: string[];
  career_roadmap: string[];
}

/**
 * Get the API base URL
 */
function getApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    throw new Error('API calls must be made from the client side');
  }
  
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

/**
 * Generate career guidance for a user
 */
export async function generateCareerGuide(
  userId: string,
  cvFile: File | null,
  cvText: string | null,
  currentJob: string,
  domain: string,
  targetJob: string | null,
  profileData: Record<string, any> | null
): Promise<CareerGuideResponse> {
  try {
    const API_BASE_URL = getApiBaseUrl();
    
    // Prepare form data
    const formData = new FormData();
    formData.append('user_id', userId);
    
    if (cvFile) {
      formData.append('cv', cvFile);
    }
    
    if (cvText) {
      formData.append('cv_text', cvText);
    }
    
    formData.append('current_job', currentJob);
    formData.append('domain', domain);
    
    if (targetJob) {
      formData.append('target_job', targetJob);
    }
    
    if (profileData) {
      formData.append('profile_data', JSON.stringify(profileData));
    }

    console.log('Generating career guide...', {
      userId,
      currentJob,
      domain,
      targetJob,
      hasProfileData: !!profileData,
    });

    const response = await fetch(`${API_BASE_URL}/career-guide/generate`, {
      method: 'POST',
      mode: 'cors',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API request failed with status ${response.status}`);
    }

    const data = await response.json();
    console.log('Career guide generated successfully');
    
    return data as CareerGuideResponse;
  } catch (error) {
    console.error('Error generating career guide:', error);
    throw error;
  }
}

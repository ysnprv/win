export interface QuestionAnswer {
  question: string;
  answer: string;
}

export interface GenerateQueriesResponse {
  [key: string]: string; // { "q1": "question text", ... }
}

/**
 * Get the API base URL - ensures it works in browser only
 */
function getApiBaseUrl(): string {
  // Only run in browser
  if (typeof window === 'undefined') {
    throw new Error('API calls must be made from the client side');
  }
  
  // Use environment variable or default to localhost:8000
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

/**
 * Check if the backend API is accessible
 */
async function checkBackendHealth(): Promise<boolean> {
  try {
    const API_BASE_URL = getApiBaseUrl();
    console.log('Checking backend health at:', `${API_BASE_URL}/health`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      mode: 'cors',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Backend health check successful:', data);
      return true;
    }
    
    console.warn('Backend health check returned non-OK status:', response.status);
    return false;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}

/**
 * Convert text to a File object for backend upload
 */
function textToFile(text: string, filename: string): File {
  const blob = new Blob([text], { type: 'text/plain' });
  return new File([blob], filename, { type: 'text/plain' });
}

/**
 * Generate queries from CV and job descriptions
 */
export async function generateQueries(
  userId: string,
  cvFile: File,
  jobDescriptions: Array<{ type: 'file' | 'text'; file?: File; text?: string }>
): Promise<GenerateQueriesResponse> {
  try {
    const API_BASE_URL = getApiBaseUrl();
    
    // Check backend health first
    const isHealthy = await checkBackendHealth();
    if (!isHealthy) {
      throw new Error("Service is currently unavailable. Please try again later.");
    }
    
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('cv', cvFile);

    // Process job descriptions - convert text to files if needed
    jobDescriptions.forEach((job, index) => {
      if (job.type === 'file' && job.file) {
        formData.append('job_descriptions', job.file);
      } else if (job.type === 'text' && job.text && job.text.trim()) {
        // Convert text to file
        const textFile = textToFile(job.text, `job_description_${index + 1}.txt`);
        formData.append('job_descriptions', textFile);
      }
    });

    console.log('Sending request to:', `${API_BASE_URL}/generate_queries`);
    
    const response = await fetch(`${API_BASE_URL}/generate_queries`, {
      method: 'POST',
      mode: 'cors',
      body: formData,
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Array.from(response.headers.entries()));

    if (!response.ok) {
      throw new Error("Failed to generate questions. Please try again.");
    }

    const data = await response.json();
    console.log('Received questions:', Object.keys(data).length);
    return data;
  } catch (error) {
    console.error('Error in generateQueries:', error);
    
    if (error instanceof TypeError) {
      throw new Error("Unable to connect to the service. Please try again later.");
    }
    throw new Error("Failed to generate questions. Please try again.");
  }
}

export interface CVReviewSummary {
  improvements: string[];
}

export interface RewriteCVResponse {
  pdf: string; // Base64-encoded PDF
  review: CVReviewSummary;
  metadata: {
    iterations: number;
    final_similarity: number;
    original_score: number;
  };
}

/**
 * Rewrite CV using answers to queries
 */
export async function rewriteCV(
  userId: string,
  qaPairs: QuestionAnswer[],
  profileData?: Record<string, any>
): Promise<RewriteCVResponse> {
  try {
    const API_BASE_URL = getApiBaseUrl();
    
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('answers', JSON.stringify(qaPairs));
    
    // Add profile data if provided
    if (profileData) {
      formData.append('profile_data', JSON.stringify(profileData));
    }

    console.log('Sending CV rewrite request to:', `${API_BASE_URL}/rewrite_cv`);
    console.log('QA pairs count:', qaPairs.length);
    console.log('Profile data included:', profileData ? 'Yes' : 'No');

    const response = await fetch(`${API_BASE_URL}/rewrite_cv`, {
      method: 'POST',
      mode: 'cors',
      body: formData,
    });

    console.log('Response status:', response.status);
    console.log('Response content-type:', response.headers.get('content-type'));

    if (!response.ok) {
      throw new Error("Failed to enhance CV. Please try again.");
    }

    const data: RewriteCVResponse = await response.json();
    console.log('Received CV with review summary:', data.review.improvements.length, 'points');
    return data;
  } catch (error) {
    console.error('Error in rewriteCV:', error);
    
    if (error instanceof TypeError) {
      throw new Error("Unable to connect to the service. Please try again later.");
    }
    throw new Error("Failed to enhance CV. Please try again.");
  }
}

/**
 * Portfolio Builder API Client
 */

export interface PortfolioGenerationRequest {
  wireframe: string;
  theme: string;
  cv?: File;
  cvText?: string;
  personalInfo?: Record<string, any>;
  photoUrl?: string;
}

export interface PortfolioGenerationResponse {
  html: string;
  wireframe_used: string;
  theme_applied: string;
  available_themes: string[];
}

export interface PortfolioOptionsResponse {
  wireframes: string[];
  themes: {
    predefined: string[];
    descriptions: Record<string, string>;
    custom_allowed: boolean;
  };
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
 * Get available portfolio options (wireframes and themes)
 */
export async function getPortfolioOptions(): Promise<PortfolioOptionsResponse> {
  const API_BASE_URL = getApiBaseUrl();
  
  const response = await fetch(`${API_BASE_URL}/portfolio/options`, {
    method: 'GET',
    mode: 'cors',
  });

  if (!response.ok) {
    throw new Error("Failed to load portfolio options. Please try again.");
  }

  return response.json();
}

/**
 * Generate portfolio HTML
 */
export async function generatePortfolio(
  request: PortfolioGenerationRequest
): Promise<PortfolioGenerationResponse> {
  const API_BASE_URL = getApiBaseUrl();

  const formData = new FormData();
  formData.append('wireframe', request.wireframe);
  formData.append('theme', request.theme);

  if (request.cv) {
    formData.append('cv', request.cv);
  }

  if (request.cvText) {
    formData.append('cv_text', request.cvText);
  }

  if (request.personalInfo) {
    formData.append('personal_info', JSON.stringify(request.personalInfo));
  }

  if (request.photoUrl) {
    formData.append('photo_url', request.photoUrl);
  }

  const response = await fetch(`${API_BASE_URL}/portfolio/build`, {
    method: 'POST',
    mode: 'cors',
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Failed to generate portfolio. Please try again.");
  }

  return response.json();
}

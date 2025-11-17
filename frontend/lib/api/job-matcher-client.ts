import { JobDocument, MatchJobsRequest, MatchJobsResponse } from "@/types/job-matcher";
import { API_BASE_URL } from "@/lib/constants";


class JobMatcherAPIClient {
  private baseURL: string;

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL;
  }


  async matchJobs(request: MatchJobsRequest): Promise<MatchJobsResponse> {
    try {
      const response = await fetch(`${this.baseURL}/jobs/match`, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        // Handle HTTP errors
        let errorMessage = `Server error: ${response.status}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.message || errorMessage;
        } catch {
          // If response isn't JSON, use status text
          errorMessage = response.statusText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Validate response structure
      if (typeof data.success !== "boolean") {
        throw new Error("Invalid response format: missing 'success' field");
      }

      if (!Array.isArray(data.matches)) {
        throw new Error("Invalid response format: 'matches' must be an array");
      }

      // Normalize match scores to percentage (0-100)
      // Backend returns similarity scores between 0-1
      const normalizedMatches = data.matches.map((job: JobDocument) => ({
        ...job,
        match_score: this.normalizeMatchScore(job.match_score),
      }));

      return {
        success: data.success,
        matches: normalizedMatches,
        message: data.message,
      };
      
    } catch (error) {
      console.error("[JobMatcherAPI] Error:", error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error("Failed to fetch job matches. Please try again.");
    }
  }
  private normalizeMatchScore(score: number | undefined): number {
    if (score === undefined || score === null) {
      return 0;
    }

    // If already a percentage (>1), return as is
    if (score > 1) {
      return Math.min(Math.round(score), 100);
    }

    // Convert 0-1 range to 0-100
    return Math.min(Math.round(score * 100), 100);
  }
}

export const jobMatcherAPI = new JobMatcherAPIClient();
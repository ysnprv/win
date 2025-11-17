import { JobFilterRequest, JobFilterResponse } from "@/types/job-matcher";
import { API_BASE_URL } from "@/lib/constants";

export const jobFilterAPI = {
  async filterJobs(request: JobFilterRequest): Promise<JobFilterResponse> {
    const response = await fetch(`${API_BASE_URL}/jobs/filter`, {
      method: "POST",
      mode: "cors",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
};
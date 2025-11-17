export interface JobDocument {
  job_id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  skills: string[];
  job_type: "full_time" | "part_time" | "internship" ;
  experience_level: "entry" | "mid" | "senior";
  source: "linkedin" | "upwork" | "internship";
  source_job_id: string;
  source_url: string;
  posted_date: string;
  match_score?: number;
}

export interface JobSearchFilters {
  job_functions?: string[];
  excluded_titles?: string[];
  job_types?: string[];
  work_models?: string[];
  locations?: string[];
  required_skills?: string[];
  experience_levels?: string[];
  salary_min?: number;
  salary_max?: number;
  posted_within_days?: number;
}

// New interface to match backend endpoint
export interface JobFilterRequest {
  job_functions?: string[];
  job_types?: string[];
  work_models?: string[];
  experience_levels?: string[];
  locations?: string[];
  required_skills?: string[];
  posted_within_days?: number;
  resume_content?: string;
  limit?: number;
}

export interface JobFilterResponse {
  success: boolean;
  jobs: JobDocument[];
  total_found: number;
  filter_stats: {
    jobs_found: number;
    used_resume_matching: boolean;
    filters_applied: Record<string, any>;
  };
  message: string;
}

export interface MatchJobsRequest {
  resume_content: string;
  github_data?: Record<string, any>;
  preferences?: Record<string, any>;
  limit?: number;
}

export interface MatchJobsResponse {
  success: boolean;
  matches: JobDocument[];
  message?: string;
}

export interface JobCardProps {
  jobId: string;
  title: string;
  company: string;
  companyLogo?: string;
  location: string;
  type: "Remote" | "Hybrid" | "On-site" | any;
  employmentType: string;
  salary?: string;
  techstack: string[];
  postedAt: Date;
  matchScore: number;
  matchReasons: {
    skills: number;
    experience: number;
    culture: number;
  };
  description: string;
  applicants?: number;
  platforms: string[];
  sourceUrl: string;
  isLiked?: boolean;
  isSaved?: boolean;
  onLike?: (jobId: string) => void;
  onSave?: (jobId: string) => void;
}
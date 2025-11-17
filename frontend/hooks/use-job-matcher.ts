import { useMutation, useQueryClient } from "@tanstack/react-query";
import { JobDocument, MatchJobsRequest, JobFilterRequest, JobSearchFilters } from "@/types/job-matcher";
import { jobMatcherAPI } from "@/lib/api/job-matcher-client";
import { jobFilterAPI } from "@/lib/api/job-filter-client";
import { useState, useCallback } from "react";

const JOBS_PER_PAGE = 6;
const TOTAL_JOBS_TO_FETCH = 100;

export function useJobMatcher() {
  const queryClient = useQueryClient();
  const [allJobs, setAllJobs] = useState<JobDocument[]>([]);
  const [page, setPage] = useState<number>(1);
  const [backendMessage, setBackendMessage] = useState<string | null>(null);

  // Original job matching mutation
  const matchMutation = useMutation({
    mutationFn: async (request: MatchJobsRequest) => {
      const response = await jobMatcherAPI.matchJobs({
        ...request,
        limit: TOTAL_JOBS_TO_FETCH,
      });
      
      if (!response.success) {
        throw new Error(response.message || "Job matching failed");
      }
      
      return {
        jobs: response.matches,
        request,
      };
    },
    onSuccess: ({ jobs, request }) => {
      setAllJobs(jobs);
      queryClient.setQueryData(["lastMatchRequest"], request);
      setPage(1);
    },
  });

  // New filter mutation
  const filterMutation = useMutation({
    mutationFn: async (request: JobFilterRequest) => {
      const response = await jobFilterAPI.filterJobs({
        ...request,
        limit: TOTAL_JOBS_TO_FETCH,
      });
      
      if (!response.success) {
        throw new Error(response.message || "Job filtering failed");
      }
      
      return {
        jobs: response.jobs,
        request,
      };
    },
    onSuccess: ({ jobs, request }, variables) => {
      setAllJobs(jobs);
      queryClient.setQueryData(["lastFilterRequest"], request);
      setPage(1);
    },
    onError: (error: Error) => {
      setBackendMessage(error.message);
    },
  });

  const matchJobs = async (request: MatchJobsRequest) => {
    return await matchMutation.mutateAsync(request);
  };

  const filterJobs = async (filters: JobSearchFilters, resumeContent?: string) => {
    setBackendMessage(null); // Clear previous message
    const filterRequest: JobFilterRequest = {
      job_functions: filters.job_functions,
      job_types: filters.job_types,
      work_models: filters.work_models,
      experience_levels: filters.experience_levels,
      locations: filters.locations,
      required_skills: filters.required_skills,
      posted_within_days: filters.posted_within_days,
      resume_content: resumeContent,
      limit: TOTAL_JOBS_TO_FETCH,
    };

    try {
      const result = await filterMutation.mutateAsync(filterRequest);
      return result;
    } catch (error) {
      if (error instanceof Error) {
        setBackendMessage(error.message);
      }
      throw error;
    }
  };

  const totalPages = Math.max(1, Math.ceil(allJobs.length / JOBS_PER_PAGE));
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;
  const displayedJobs = allJobs.slice((page - 1) * JOBS_PER_PAGE, page * JOBS_PER_PAGE);

  const refetchJobs = async () => {
    const lastMatchRequest = queryClient.getQueryData<MatchJobsRequest>(["lastMatchRequest"]);
    const lastFilterRequest = queryClient.getQueryData<JobFilterRequest>(["lastFilterRequest"]);
    
    setAllJobs([]);
    setPage(1);
    
    // Use the most recent request type
    if (lastFilterRequest) {
      return filterMutation.mutateAsync(lastFilterRequest);
    } else if (lastMatchRequest) {
      return matchMutation.mutateAsync(lastMatchRequest);
    } else {
      throw new Error("No previous job search to refetch");
    }
  };

  const clearCache = () => {
    setAllJobs([]);
    setPage(1);
    queryClient.removeQueries({ queryKey: ["lastMatchRequest"] });
    queryClient.removeQueries({ queryKey: ["lastFilterRequest"] });
  };

  return {
    jobs: displayedJobs,
    allJobs,
    allJobsCount: allJobs.length,
    isLoading: matchMutation.isPending || filterMutation.isPending,
    error: matchMutation.error?.message || filterMutation.error?.message || null,
    backendMessage,
    matchJobs,
    filterJobs,
    refetchJobs,
    clearCache,
    page,
    setPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    isFetchingNextPage: false,
  };
}
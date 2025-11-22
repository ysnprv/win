"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, SlidersHorizontal, Briefcase, Loader2, AlertCircle, RefreshCw, X, Plus, FileText, User } from "lucide-react";
import JobMatcherHero from "@/components/services/job-matcher-hero";
import { useJobMatcher } from "@/hooks/use-job-matcher";
import { convertJobDocumentToCardProps } from "@/lib/utils/job-converter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import JobCard from "@/components/job-matcher/job-card";
import { JobSearchFilters } from "@/types/job-matcher";
import JobFilterModal from "@/components/job-matcher/job-filter-modal";
import { CVSelector, type CVSource } from "@/components/shared/cv-selector";
import { textExtractorAPI } from "@/lib/api/text-extractor-client";

const DEFAULT_FILTERS: JobSearchFilters = {
  job_types: ["full_time"],
  work_models: ["remote", "hybrid"],
  locations: ["Berlin", "Remote"],
  experience_levels: ["entry", "mid"],
};

const STORAGE_KEYS = {
  ACTIVE_FILTERS: "jobMatcher_activeFilters",
  LIKED_JOBS: "likedJobs", 
  SAVED_JOBS: "savedJobs",
  SELECTED_CV: "jobMatcher_selectedCV",
} as const;

export default function JobMatcherPage() {
  const { 
    jobs, 
    allJobs,
    allJobsCount,
    page,
    setPage,
    totalPages,
    isLoading, 
    error,
    backendMessage,
    matchJobs, 
    filterJobs,
    refetchJobs,
    
    
    hasPrevPage,
  } = useJobMatcher();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [likedJobs, setLikedJobs] = useState<Set<string>>(new Set());
  const [savedJobs, setSavedJobs] = useState<Set<string>>(new Set());
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showCVSelector, setShowCVSelector] = useState(false);
  const [activeFilters, setActiveFilters] = useState<JobSearchFilters>({});
  const [filtersLoaded, setFiltersLoaded] = useState(false);
  const [selectedCVSource, setSelectedCVSource] = useState<CVSource | null>(null);
  const [resumeContent, setResumeContent] = useState<string>("");
  const [isExtractingCV, setIsExtractingCV] = useState(false);
  const [shouldFetchJobs, setShouldFetchJobs] = useState(false);
  
  const topOfResultsRef = useRef<HTMLDivElement>(null);
  const lastFetchParamsRef = useRef<string>("");

  // Load persisted data on mount
  useEffect(() => {
    const liked = localStorage.getItem(STORAGE_KEYS.LIKED_JOBS);
    const saved = localStorage.getItem(STORAGE_KEYS.SAVED_JOBS);
    const savedFilters = localStorage.getItem(STORAGE_KEYS.ACTIVE_FILTERS);
    const savedCVSource = localStorage.getItem(STORAGE_KEYS.SELECTED_CV);
    
    if (liked) setLikedJobs(new Set(JSON.parse(liked)));
    if (saved) setSavedJobs(new Set(JSON.parse(saved)));
    
    // Load saved filters or use defaults
    if (savedFilters) {
      try {
        const parsedFilters = JSON.parse(savedFilters);
        setActiveFilters(parsedFilters);
      } catch (error) {
        console.error("Failed to parse saved filters:", error);
        setActiveFilters(DEFAULT_FILTERS);
      }
    } else {
      setActiveFilters(DEFAULT_FILTERS);
    }
    
    // Try to restore CV selection (for database CVs only)
    if (savedCVSource) {
      try {
        const parsedCVSource = JSON.parse(savedCVSource);
        if (parsedCVSource.type === 'database') {
          setSelectedCVSource(parsedCVSource);
        }
      } catch (error) {
        console.error("Failed to parse saved CV source:", error);
      }
    }
    
    setFiltersLoaded(true);
    setShouldFetchJobs(true); // Trigger initial fetch
  }, []);

  // Extract resume content when CV is selected
  useEffect(() => {
    const extractResumeContent = async () => {
      if (!selectedCVSource) {
        setResumeContent("");
        return;
      }

      setIsExtractingCV(true);
      try {
        if (selectedCVSource.type === 'file') {
          // Extract text from uploaded file
          const text = await textExtractorAPI.extractText(selectedCVSource.file);
          setResumeContent(text);
        } else if (selectedCVSource.type === 'database') {
          // For database CVs, use the stored content
          const cvContent = selectedCVSource.cv.pdf_url; // Adjust based on your CV type
          setResumeContent(cvContent);
        }
      } catch (error) {
        console.error("Failed to extract resume content:", error);
        setResumeContent("");
      } finally {
        setIsExtractingCV(false);
        setShouldFetchJobs(true); // Trigger fetch after extraction
      }
    };

    extractResumeContent();
  }, [selectedCVSource]);

  // SINGLE unified effect for fetching jobs
  // Triggers when: filters load initially, resume content changes, or filters change
  useEffect(() => {
    if (!filtersLoaded || isLoading || isExtractingCV || !shouldFetchJobs) {
      return;
    }

    // Create a cache key to prevent duplicate fetches
    const fetchParams = JSON.stringify({ filters: activeFilters, resumeLength: resumeContent.length });
    
    // Skip if we just fetched with same params
    if (lastFetchParamsRef.current === fetchParams) {
      setShouldFetchJobs(false);
      return;
    }

    lastFetchParamsRef.current = fetchParams;
    setShouldFetchJobs(false); // Reset flag

    // Fetch jobs with current filters and resume (empty string if no CV)
    filterJobs(activeFilters, resumeContent.trim() || "").catch((err) => {
      console.error("Failed to fetch jobs:", err);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldFetchJobs, filtersLoaded, activeFilters, resumeContent]);
  // Intentionally excluding filterJobs, isLoading, isExtractingCV to prevent infinite loops

  // Persist filters whenever they change
  useEffect(() => {
    if (filtersLoaded) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_FILTERS, JSON.stringify(activeFilters));
    }
  }, [activeFilters, filtersLoaded]);

  // Persist CV selection (database CVs only)
  useEffect(() => {
    if (selectedCVSource?.type === 'database') {
      localStorage.setItem(STORAGE_KEYS.SELECTED_CV, JSON.stringify(selectedCVSource));
    } else if (selectedCVSource === null) {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_CV);
    }
  }, [selectedCVSource]);

  // Scroll to top of results on page change
  useEffect(() => {
    if (!topOfResultsRef.current) return;
    topOfResultsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [page]);

  const handleLike = useCallback((jobId: string) => {
    setLikedJobs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      localStorage.setItem(STORAGE_KEYS.LIKED_JOBS, JSON.stringify([...newSet]));
      return newSet;
    });
  }, []);

  const handleSave = useCallback((jobId: string) => {
    setSavedJobs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      localStorage.setItem(STORAGE_KEYS.SAVED_JOBS, JSON.stringify([...newSet]));
      return newSet;
    });
  }, []);

  const handleRefresh = async () => {
    try {
      await filterJobs(activeFilters, resumeContent.trim() || "");
    } catch (err) {
      console.error("Failed to refresh jobs:", err);
    }
  };

  const handleApplyFilters = useCallback((filters: JobSearchFilters) => {
    setActiveFilters(filters);
    setShowFilterModal(false);
    setShouldFetchJobs(true); // Trigger fetch with new filters
  }, []);

  const removeFilter = useCallback((filterType: keyof JobSearchFilters, value: string) => {
    const updatedFilters = { ...activeFilters };
    const currentValues = updatedFilters[filterType] as string[];
    if (currentValues && Array.isArray(currentValues)) {
      (updatedFilters[filterType] as string[]) = currentValues.filter(v => v !== value);
      if ((updatedFilters[filterType] as string[]).length === 0) {
        delete updatedFilters[filterType];
      }
    }
    
    setActiveFilters(updatedFilters);
    setShouldFetchJobs(true); // Trigger fetch with updated filters
  }, [activeFilters]);

  const addQuickFilter = useCallback((filterType: keyof JobSearchFilters, value: string | number) => {
    const updatedFilters = { ...activeFilters };
    
    if (typeof value === 'string') {
      const arrayFilterTypes: Array<keyof JobSearchFilters> = [
        'job_functions', 'job_types', 'work_models', 'experience_levels', 
        'locations', 'required_skills', 'excluded_titles'
      ];
      
      if (arrayFilterTypes.includes(filterType)) {
        const currentValues = (updatedFilters[filterType] as string[]) || [];
        if (!currentValues.includes(value)) {
          (updatedFilters[filterType] as string[]) = [...currentValues, value];
        }
      }
    }
    
    if (typeof value === 'number') {
      const numberFilterTypes: Array<keyof JobSearchFilters> = [
        'salary_min', 'salary_max', 'posted_within_days'
      ];
      
      if (numberFilterTypes.includes(filterType)) {
        (updatedFilters[filterType] as number) = value;
      }
    }
    
    setActiveFilters(updatedFilters);
    setShouldFetchJobs(true); // Trigger fetch with quick filter
  }, [activeFilters]);

  const handleCVSelect = (cvSource: CVSource | null) => {
    setSelectedCVSource(cvSource);
    if (cvSource) {
      setShowCVSelector(false);
    }
    // Resume extraction will trigger automatically via useEffect
    // Then jobs will refresh via the unified useEffect
  };

  const handleRemoveCV = () => {
    setSelectedCVSource(null);
    // This will trigger resume extraction useEffect -> set resumeContent to ""
    // Which will trigger the unified fetch useEffect with empty resume
    setShouldFetchJobs(true);
  };

  const handleShowFilterModal = () => {
    setShowFilterModal(true);
  };

  // Get all active filter tags
  const getActiveFilterTags = () => {
    const tags: Array<{ type: keyof JobSearchFilters; value: string; label: string }> = [];
    
    Object.entries(activeFilters).forEach(([key, values]) => {
      if (Array.isArray(values)) {
        values.forEach(value => {
          tags.push({
            type: key as keyof JobSearchFilters,
            value,
            label: formatFilterLabel(key, value)
          });
        });
      }
    });
    
    return tags;
  };

  const formatFilterLabel = (type: string, value: string) => {
    const formatMap: Record<string, Record<string, string>> = {
      job_types: {
        full_time: "Full-time",
        part_time: "Part-time", 
        internship: "Internship",
        contract: "Contract"
      },
      work_models: {
        remote: "Remote",
        hybrid: "Hybrid",
        onsite: "On-site"
      },
      experience_levels: {
        entry: "Entry Level",
        mid: "Mid Level", 
        senior: "Senior Level"
      }
    };
    
    return formatMap[type]?.[value] || value;
  };

  // Client-side search should operate on the full set of job matches
  const filteredAllJobs = (allJobs || []).filter((job) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      job.title.toLowerCase().includes(query) ||
      job.company.toLowerCase().includes(query) ||
      job.skills.some((skill) => skill.toLowerCase().includes(query))
    );
  });
  const activeFilterTags = getActiveFilterTags();

  // Paginate after search
  const filteredTotalPages = Math.max(1, Math.ceil(filteredAllJobs.length / 6));
  useEffect(() => {
    if (page > filteredTotalPages) {
      setPage(1);
    }
    // reset to first page when search query changes
  }, [filteredTotalPages]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);
 

  const paginatedJobs = filteredAllJobs.slice((page - 1) * 6, page * 6);

  // Check if we should show CV selection prompt
  const shouldShowCVPrompt = !selectedCVSource && !showCVSelector && allJobs.length === 0 && !isLoading && !isExtractingCV;

  return (
    <div className="min-h-screen bg-background">
      {/* Job Matcher hero — wrapped in container so it matches page width and doesn't stick to corners */}
      <div className="container mx-auto px-4 md:px-6 mt-8 md:mt-10 flex justify-center">
        <div className="w-full max-w-5xl">
          <JobMatcherHero />
        </div>
      </div>
      <div className="border-b border-border bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Briefcase className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight">AI Job Matcher</h1>
              <p className="text-muted-foreground">
                Discover opportunities tailored to your profile
              </p>
            </div>
            
            {/* CV Selection Button */}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowCVSelector(true)}
              disabled={isExtractingCV}
            >
              <User className="w-4 h-4" />
              {isExtractingCV ? "Processing..." : selectedCVSource ? 'Change CV' : 'Select CV'}
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading || isExtractingCV}
              title="Refresh job matches"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>

          {/* Selected CV Info with Remove Button */}
          {selectedCVSource && (
            <div className="mb-4 rounded-lg border border-border/60 bg-card/80 backdrop-blur-md p-3">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded bg-green-500/10 flex items-center justify-center">
                  <FileText className="w-3 h-3 text-green-600" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  Using: {selectedCVSource.type === 'file' 
                    ? selectedCVSource.file.name
                    : selectedCVSource.cv.job_title
                  }
                </span>
                <Badge variant="secondary" className="text-xs">
                  {selectedCVSource.type === 'file' ? 'Uploaded' : 'From Database'}
                </Badge>
                {isExtractingCV && (
                  <Badge variant="outline" className="text-xs">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Extracting...
                  </Badge>
                )}
                {/* Remove CV Button */}
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-auto h-8 w-8 p-0 hover:bg-destructive/10"
                  onClick={handleRemoveCV}
                  title="Remove CV"
                  disabled={isExtractingCV}
                >
                  <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            </div>
          )}

          {/* Search and Filter Section */}
          <div className="space-y-4">
            <div className="flex gap-3 max-w-3xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search by title, company, or skills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button 
                variant="outline" 
                className="gap-2"
                onClick={handleShowFilterModal}
              >
                <SlidersHorizontal className="w-4 h-4" />
                Edit Filters
                {activeFilterTags.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 rounded-full p-0 text-xs">
                    {activeFilterTags.length}
                  </Badge>
                )}
              </Button>
            </div>

            {/* Active Filters Display */}
            {activeFilterTags.length > 0 && (
              <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-md p-4">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="text-sm font-medium text-foreground">Active Filters</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setActiveFilters(DEFAULT_FILTERS);
                      setShouldFetchJobs(true);
                    }}
                  >
                    Reset to Defaults
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeFilterTags.map((tag, index) => (
                    <Badge 
                      key={`${tag.type}-${tag.value}-${index}`}
                      variant="secondary" 
                      className="cursor-pointer hover:bg-secondary/80 pr-1 gap-1 whitespace-normal break-words shrink max-w-full"
                    >
                      <span className="break-words whitespace-normal max-w-[12rem] truncate">{tag.label}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 hover:bg-destructive/20 rounded-full"
                        onClick={() => removeFilter(tag.type, tag.value)}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Filter Suggestions */}
            <div className="flex gap-2 flex-wrap">
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => addQuickFilter('work_models', 'remote')}
              >
                <Plus className="w-3 h-3 mr-1" />
                Remote
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => addQuickFilter('job_types', 'full_time')}
              >
                <Plus className="w-3 h-3 mr-1" />
                Full-time
              </Badge>
              <Badge 
                variant="outline" 
                className="cursor-pointer hover:bg-accent transition-colors"
                onClick={() => addQuickFilter('experience_levels', 'senior')}
              >
                <Plus className="w-3 h-3 mr-1" />
                Senior Level
              </Badge>
            </div>

            {/* CV Selection Prompt */}
            {shouldShowCVPrompt && (
              <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-md p-6 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-sm font-semibold mb-2">Want personalized job matches?</h3>
                <p className="text-xs text-muted-foreground mb-3">
                  Upload your CV to get jobs tailored to your experience and skills
                </p>
                <Button size="sm" onClick={() => setShowCVSelector(true)} className="gap-2">
                  <User className="w-3 h-3" />
                  Select CV
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Main Content */}
        {(isLoading || isExtractingCV) && jobs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">
              {isExtractingCV 
                ? "Extracting CV content..." 
                : selectedCVSource 
                  ? "Analyzing your CV and finding the best matches..." 
                  : "Finding job opportunities..."
              }
            </span>
          </div>
        ) : (
          <>
            {paginatedJobs.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedJobs.map((job) => {
                    const cardProps = convertJobDocumentToCardProps(job);
                    return (
                      <JobCard
                        key={job.job_id}
                        {...cardProps}
                        isLiked={likedJobs.has(job.job_id)}
                        isSaved={savedJobs.has(job.job_id)}
                        onLike={handleLike}
                        onSave={handleSave}
                      />
                    );
                  })}
                </div>

                <div ref={topOfResultsRef} />

                {/* Pagination controls */}
                <div className="mt-8 flex flex-col items-center">
                  <div className="mb-3 text-sm text-muted-foreground">
                    Showing {Math.min(((page - 1) * 6) + 1, filteredAllJobs.length)}
                    -{Math.min(page * 6, filteredAllJobs.length)} of {filteredAllJobs.length} results
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={!hasPrevPage}
                    >
                      Previous
                    </Button>

                    {/* Page numbers */}
                    <div className="flex gap-1 flex-wrap justify-center">
                      {Array.from({ length: filteredTotalPages }, (_, idx) => idx + 1).map((p) => (
                        <Button
                          key={p}
                          size="sm"
                          variant={p === page ? "secondary" : "ghost"}
                          onClick={() => setPage(p)}
                        >
                          {p}
                        </Button>
                      ))}
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(Math.min(filteredTotalPages, page + 1))}
                      disabled={!(page < filteredTotalPages)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            ) : !isLoading && !isExtractingCV ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                  <Briefcase className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mb-2">
                  {backendMessage || "No jobs found matching your criteria."}
                </p>
                {backendMessage?.includes("No jobs available") ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-4">
                      {selectedCVSource 
                        ? "Click below to start fetching jobs based on your CV"
                        : "Upload your CV to start finding personalized job matches"
                      }
                    </p>
                    {selectedCVSource ? (
                      <Button onClick={async () => {
                        if (resumeContent.trim()) {
                          await matchJobs({ resume_content: resumeContent.trim(), limit: 100 });
                        }
                      }} className="gap-2">
                        <Briefcase className="w-4 h-4" />
                        Find Jobs for Me
                      </Button>
                    ) : (
                      <Button onClick={() => setShowCVSelector(true)} className="gap-2">
                        <User className="w-4 h-4" />
                        Select CV to Start
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-4">
                      Try adjusting your search or filters
                    </p>
                    <Button onClick={handleRefresh}>
                      Refresh Matches
                    </Button>
                  </div>
                )}
              </div>
            ) : null}
          </>
        )}
      </div>

      {/* CV Selector Modal */}
      <Dialog open={showCVSelector} onOpenChange={setShowCVSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto border-border bg-popover/95">
          <DialogHeader>
            <DialogTitle className="text-foreground">Select Your CV</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Upload your CV or select from your saved CVs to get personalized job matches
            </DialogDescription>
          </DialogHeader>
          
          <CVSelector 
            onCVSelect={handleCVSelect}
            label=""
            description="Choose your CV to start finding jobs tailored to your experience and skills"
          />
        </DialogContent>
      </Dialog>

      {/* Filter Modal */}
      <JobFilterModal
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        filters={activeFilters}
        onApplyFilters={handleApplyFilters}
      />
    </div>
  );
}
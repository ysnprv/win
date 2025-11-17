import { JobCardProps, JobDocument } from "@/types/job-matcher";

export function convertJobDocumentToCardProps(job: JobDocument): Omit<JobCardProps, "isLiked" | "isSaved"> {
  const typeMap: Record<string, string> = {
    full_time: "Full-time",
    part_time: "Part-time",
    internship: "Internship",
  };

  const getWorkType = (location: string): "Remote" | "Hybrid" | any => {
    const locationLower = location.toLowerCase();
    if (locationLower.includes("remote")) return "Remote";
    if (locationLower.includes("hybrid")) return "Hybrid";
    return "";
  };

  const calculateMatchReasons = (score: number) => {
    // Score is already in 0-100 range, add slight variance for visual interest
    const variance = Math.random() * 10 - 5;
    return {
      skills: Math.min(100, Math.max(0, Math.round(score + variance))),
      experience: Math.min(100, Math.max(0, Math.round(score - variance))),
      culture: Math.min(100, Math.max(0, Math.round(score))),
    };
  };

  // Convert match_score from 0-1 range to 0-100 range BEFORE rounding
  const matchScorePercentage = (job.match_score || 0) * 100;

  return {
    jobId: job.job_id,
    title: job.title,
    company: job.company,
    companyLogo: undefined,
    location: job.location,
    type: getWorkType(job.location),
    employmentType: typeMap[job.job_type] || "Full-time",
    salary: undefined,
    techstack: job.skills,
    postedAt: new Date(job.posted_date),
    matchScore: Math.round(matchScorePercentage), // Round after conversion to percentage
    matchReasons: calculateMatchReasons(matchScorePercentage),
    description: job.description,
    applicants: undefined,
    platforms: [job.source],
    sourceUrl: job.source_url,
  };
}
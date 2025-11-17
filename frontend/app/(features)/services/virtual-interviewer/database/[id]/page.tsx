"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { InterviewNav } from "@/components/virtual-interviewer/interview-nav";
import { fetchInterviewById, deleteInterview, downloadInterviewPDF, Interview } from "@/lib/api/interviews";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Trash2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function InterviewDetailPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params.id as string;

  const [interview, setInterview] = useState<Interview | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadInterview() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchInterviewById(interviewId);
        setInterview(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load interview");
      } finally {
        setLoading(false);
      }
    }

    loadInterview();
  }, [interviewId]);

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteInterview(interviewId);
      toast.success("Interview deleted successfully");
      router.push("/services/virtual-interviewer/database");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete interview");
    } finally {
      setDeleting(false);
    }
  };

  const handleDownload = async () => {
    if (!interview?.pdf_url) return;
    
    try {
      setDownloading(true);
      await downloadInterviewPDF(interview.pdf_url, interviewId);
      toast.success("PDF downloaded successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[#05e34f] dark:text-[#04c945]";
    if (score >= 60) return "text-yellow-500 dark:text-yellow-400";
    if (score >= 40) return "text-orange-500 dark:text-orange-400";
    return "text-red-500 dark:text-red-400";
  };

  // Get difficulty badge color
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "intermediate":
        return "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20";
      case "advanced":
        return "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20";
      case "expert":
        return "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/20";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background px-6 py-10">
        <div className="container mx-auto max-w-5xl">
          <InterviewNav />
          <div className="space-y-6">
            <Skeleton className="h-12 w-3/4 bg-muted" />
            <Skeleton className="h-64 w-full bg-muted" />
            <Skeleton className="h-48 w-full bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background px-6 py-10">
        <div className="container mx-auto max-w-5xl">
          <InterviewNav />
          <div className="rounded-lg border border-red-200/40 bg-red-50/50 backdrop-blur p-8 text-center dark:border-red-800/40 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error || "Interview not found"}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/services/virtual-interviewer/database")}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Database
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background px-6 py-10">
      <div className="container mx-auto max-w-5xl">
        <InterviewNav />

        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/services/virtual-interviewer/database")}
              className="mb-3"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Database
            </Button>
            <h1 className="text-2xl font-semibold text-foreground">
              Interview with {interview.interviewer_name}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {format(new Date(interview.created_at), "MMMM dd, yyyy 'at' h:mm a")}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={downloading || !interview.pdf_url}
            >
              {downloading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Download PDF
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  {deleting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="mr-2 h-4 w-4" />
                  )}
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Interview</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete this interview? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Interview Metadata */}
        <div className="mb-6 rounded-xl border border-border/60 bg-card/80 p-6 backdrop-blur-md">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <span className="text-xs text-muted-foreground">Interviewer Role</span>
              <p className="text-sm font-medium text-foreground mt-1">{interview.interviewer_role}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Interview Style</span>
              <p className="text-sm font-medium text-foreground mt-1">{interview.interview_style}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Difficulty</span>
              <div className="mt-1">
                <Badge variant="outline" className={getDifficultyColor(interview.difficulty_level)}>
                  {interview.difficulty_level}
                </Badge>
              </div>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Total Exchanges</span>
              <p className="text-sm font-medium text-foreground mt-1">{interview.total_exchanges}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Overall Score</span>
              <p className={`text-sm font-bold mt-1 ${getScoreColor(interview.overall_score)}`}>
                {Math.round(interview.overall_score)}/100
              </p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Acceptance Probability</span>
              <p className={`text-sm font-bold mt-1 ${getScoreColor(interview.acceptance_probability)}`}>
                {Math.round(interview.acceptance_probability)}%
              </p>
            </div>
          </div>
        </div>

        {/* Performance Scores */}
        <div className="mb-6 rounded-xl border border-border/60 bg-card/80 p-6 backdrop-blur-md">
          <h2 className="text-lg font-semibold text-foreground mb-4">Performance Breakdown</h2>
          <div className="space-y-4">
            {[
              { label: "Technical Competency", value: interview.technical_competency },
              { label: "Communication Skills", value: interview.communication_skills },
              { label: "Problem Solving", value: interview.problem_solving },
              { label: "Cultural Fit", value: interview.cultural_fit },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-foreground">{metric.label}</span>
                  <span className={`text-sm font-semibold ${getScoreColor(metric.value)}`}>
                    {Math.round(metric.value)}/100
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-500"
                    style={{ width: `${metric.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Key Strengths */}
          <div className="rounded-xl border border-border/60 bg-card/80 p-6 backdrop-blur-md">
            <h2 className="text-lg font-semibold text-foreground mb-4">Key Strengths</h2>
            <ul className="space-y-2">
              {interview.key_strengths.map((strength, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-[#05e34f] dark:text-[#04c945] mt-1">●</span>
                  <span>{strength}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Areas for Improvement */}
          <div className="rounded-xl border border-border/60 bg-card/80 p-6 backdrop-blur-md">
            <h2 className="text-lg font-semibold text-foreground mb-4">Areas for Improvement</h2>
            <ul className="space-y-2">
              {interview.areas_for_improvement.map((area, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-orange-500 dark:text-orange-400 mt-1">●</span>
                  <span>{area}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Recommendations */}
          <div className="rounded-xl border border-border/60 bg-card/80 p-6 backdrop-blur-md">
            <h2 className="text-lg font-semibold text-foreground mb-4">Recommendations</h2>
            <ul className="space-y-2">
              {interview.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-primary mt-1">●</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Next Steps */}
          <div className="rounded-xl border border-border/60 bg-card/80 p-6 backdrop-blur-md">
            <h2 className="text-lg font-semibold text-foreground mb-4">Next Steps</h2>
            <ul className="space-y-2">
              {interview.next_steps.map((step, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-foreground">
                  <span className="text-accent mt-1">●</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

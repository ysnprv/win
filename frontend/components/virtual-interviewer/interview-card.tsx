"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Interview } from "@/lib/api/interviews";
import { Badge } from "@/components/ui/badge";

interface InterviewCardProps {
  interview: Interview;
}

export function InterviewCard({ interview }: InterviewCardProps) {
  // Format date
  const formattedDate = format(new Date(interview.created_at), "MMM dd, yyyy");

  // Calculate circle properties for the overall score
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (interview.overall_score / 100) * circumference;

  // Determine color based on score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[#05e34f] dark:text-[#04c945]"; // Green
    if (score >= 60) return "text-yellow-500 dark:text-yellow-400"; // Yellow
    if (score >= 40) return "text-orange-500 dark:text-orange-400"; // Orange
    return "text-red-500 dark:text-red-400"; // Red
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

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <Link href={`/services/virtual-interviewer/database/${interview.id}`}>
          <div className="group cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-card/80 backdrop-blur-md transition-all duration-200 hover:bg-card hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 dark:hover:shadow-primary/5">
            <div className="p-4">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Interview Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  <h3 className="text-base font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                    {interview.interviewer_name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {interview.interviewer_role}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className={getDifficultyColor(interview.difficulty_level)}>
                      {interview.difficulty_level}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formattedDate}
                    </span>
                  </div>
                </div>

                {/* Right: Overall Score Circle */}
                <div className="flex-shrink-0">
                  <div className="relative w-16 h-16">
                    <svg className="w-16 h-16 -rotate-90">
                      {/* Background circle */}
                      <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="5"
                        fill="none"
                        className="text-muted"
                      />
                      {/* Progress circle */}
                      <circle
                        cx="32"
                        cy="32"
                        r={radius}
                        stroke="currentColor"
                        strokeWidth="5"
                        fill="none"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        className={`${getScoreColor(interview.overall_score)} transition-all duration-500`}
                      />
                    </svg>
                    {/* Score text */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-foreground">
                        {Math.round(interview.overall_score)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Link>
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="center"
        className="w-80 border-border/50 bg-popover/95 backdrop-blur-xl shadow-xl"
      >
        <div className="space-y-3">
          <div>
            <h4 className="text-xs font-medium text-foreground mb-1">Interview Stats</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Style:</span>{" "}
                <span className="text-foreground font-medium">{interview.interview_style}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Exchanges:</span>{" "}
                <span className="text-foreground font-medium">{interview.total_exchanges}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium text-foreground mb-1">Performance Breakdown</h4>
            <div className="space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Technical:</span>
                <span className="text-foreground font-medium">{Math.round(interview.technical_competency)}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Communication:</span>
                <span className="text-foreground font-medium">{Math.round(interview.communication_skills)}/100</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Problem Solving:</span>
                <span className="text-foreground font-medium">{Math.round(interview.problem_solving)}/100</span>
              </div>
            </div>
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Acceptance Probability:</span>{" "}
            <span className={`text-sm font-semibold ${getScoreColor(interview.acceptance_probability)}`}>
              {Math.round(interview.acceptance_probability)}%
            </span>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

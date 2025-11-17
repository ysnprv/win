"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { CareerGuide } from "@/lib/api/career-guides";

interface CareerGuideCardProps {
  guide: CareerGuide;
}

export function CareerGuideCard({ guide }: CareerGuideCardProps) {
  // Format date
  const formattedDate = format(new Date(guide.created_at), "MMM dd, yyyy");
  
  // Determine display job (target job if exists, otherwise current job)
  const displayJob = guide.target_job || guide.current_job;

  // Calculate circle properties for the readiness score
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (guide.readiness_score / 100) * circumference;

  // Determine color based on readiness score
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-[#05e34f] dark:text-[#04c945]"; // Green
    if (score >= 60) return "text-yellow-500 dark:text-yellow-400"; // Yellow
    if (score >= 40) return "text-orange-500 dark:text-orange-400"; // Orange
    return "text-red-500 dark:text-red-400"; // Red
  };

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <Link href={`/services/career-guide/database/${guide.id}`}>
          <div className="group cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-card/80 backdrop-blur-md transition-all duration-200 hover:bg-card hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 dark:hover:shadow-primary/5">
            <div className="p-4">
              <div className="flex items-center justify-between gap-4">
                {/* Left: Job Title and Date */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-foreground line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                    {displayJob}
                  </h3>
                  <span className="text-xs text-muted-foreground">
                    {formattedDate}
                  </span>
                </div>

                {/* Right: Readiness Score Circle */}
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
                        className={`${getScoreColor(guide.readiness_score)} transition-all duration-500`}
                      />
                    </svg>
                    {/* Score text */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-lg font-bold text-foreground">
                        {guide.readiness_score}
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
            <h4 className="text-xs font-medium text-foreground mb-1">
              Domain
            </h4>
            <p className="text-xs text-muted-foreground">
              {guide.domain}
            </p>
          </div>
          {guide.target_job && (
            <div>
              <h4 className="text-xs font-medium text-foreground mb-1">
                Target Role
              </h4>
              <p className="text-xs text-muted-foreground">
                {guide.target_job}
              </p>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

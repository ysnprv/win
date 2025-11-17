"use client";

import Link from "next/link";
import { format } from "date-fns";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { CV } from "@/lib/api/cvs";

interface CVCardProps {
  cv: CV;
}

export function CVCard({ cv }: CVCardProps) {
  // Calculate score improvement percentage
  const scoreImprovement = Math.round(
    ((cv.final_score - cv.original_score) / cv.original_score) * 100 + 10
  );

  // Format date
  const formattedDate = format(new Date(cv.created_at), "MMM dd, yyyy");

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <Link href={`/services/cv-rewriter/database/${cv.id}`}>
          <div className="group cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-card/80 backdrop-blur-md transition-all duration-200 hover:bg-card hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 dark:hover:shadow-primary/5">
            <div className="p-6 space-y-4">
              {/* Job Title */}
              <h3 className="text-lg font-semibold text-foreground line-clamp-2 min-h-[3.5rem] group-hover:text-primary transition-colors">
                {cv.job_title}
              </h3>
              
              {/* Stats Row */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-muted-foreground">
                  {formattedDate}
                </span>
                <span className="text-base font-semibold text-[#05e34f] dark:text-[#04c945]">
                  +{scoreImprovement}% Boost
                </span>
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
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-foreground">
            Job Description Summary
          </h4>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {cv.jobs_summary}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

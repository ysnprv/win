'use client';

import { Card } from '@/components/ui/card';
import { CircularProgress } from '@/components/shared/circular-progress';
import { CheckCircle2 } from 'lucide-react';

interface StrengthsSectionProps {
  strengths: string[];
  readinessScore: number;
}

export function StrengthsSection({ strengths, readinessScore }: StrengthsSectionProps) {
  return (
    <Card className="p-6 rounded-2xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-primary/5">
      <div className="grid md:grid-cols-2 gap-6 items-center">
        {/* Readiness Score */}
        <div className="flex flex-col items-center justify-center space-y-4">
          <CircularProgress value={readinessScore} size={260} strokeWidth={16} />
          <div className="text-center">
            <h3 className="text-lg font-semibold text-foreground">
              Career Readiness
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              {readinessScore >= 75
                ? "You're well-positioned!"
                : readinessScore >= 50
                ? "You're on the right track"
                : "Focus on building key skills"}
            </p>
          </div>
        </div>

        {/* Current Strengths */}
        <div className="space-y-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">
              Current Strengths
            </h3>
            <p className="text-xs text-muted-foreground">
              Skills you're already excelling at
            </p>
          </div>
          <div className="space-y-2">
            {strengths.map((strength, index) => (
              <div
                key={index}
                className="flex items-start gap-2.5 p-3 rounded-lg bg-muted/40 border border-border transition-all duration-200 hover:border-primary/40 hover:bg-muted/60"
              >
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {strength}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

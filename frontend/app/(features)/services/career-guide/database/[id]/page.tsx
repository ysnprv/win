"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StrengthsSection } from "@/components/career-guide/strengths-section";
import { ImprovementSection } from "@/components/career-guide/improvement-section";
import { RoadmapSection } from "@/components/career-guide/roadmap-section";
import { fetchCareerGuideById, CareerGuide } from "@/lib/api/career-guides";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function CareerGuideDetailPage() {
  const params = useParams();
  const router = useRouter();
  const guideId = params.id as string;

  const [guide, setGuide] = useState<CareerGuide | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadGuide() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCareerGuideById(guideId);
        setGuide(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load career guide";
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }

    if (guideId) {
      loadGuide();
    }
  }, [guideId]);

  const handleBack = () => {
    router.push("/services/career-guide/database");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background px-6 py-10">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-6">
            <Skeleton className="h-10 w-32 mb-4 bg-muted" />
            <Skeleton className="h-8 w-64 bg-muted" />
          </div>
          <div className="space-y-6">
            <Card className="p-6 rounded-2xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-primary/5">
              <div className="space-y-4">
                <Skeleton className="h-40 w-full bg-muted" />
                <div className="grid md:grid-cols-2 gap-4">
                  <Skeleton className="h-32 w-full bg-muted" />
                  <Skeleton className="h-32 w-full bg-muted" />
                </div>
                <Skeleton className="h-48 w-full bg-muted" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error || !guide) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background px-6 py-10">
        <div className="container mx-auto max-w-5xl">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-6 gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Database
          </Button>
          <Card className="p-12 rounded-2xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-primary/5">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Career Guide Not Found
              </h2>
              <p className="text-muted-foreground text-sm">
                {error || "The career guide you're looking for doesn't exist or you don't have access to it."}
              </p>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background px-6 py-10">
      <div className="container mx-auto max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Database
          </Button>
        </div>

        <div className="mb-4">
          <h2 className="text-2xl font-semibold text-foreground">
            Career Guide
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {guide.target_job || guide.current_job} • {guide.domain}
          </p>
        </div>

        <div className="space-y-6">
          {/* Strengths & Readiness */}
          <StrengthsSection
            strengths={guide.current_strengths}
            readinessScore={guide.readiness_score}
          />

          {/* Areas for Improvement */}
          <ImprovementSection
            skills={guide.skills_to_learn}
            projects={guide.projects_to_work_on}
            softSkills={guide.soft_skills_to_develop}
          />

          {/* Career Roadmap */}
          <RoadmapSection roadmap={guide.career_roadmap} />
        </div>
      </div>
    </div>
  );
}

"use client";

import { Card } from "@/components/ui/card";
import { BookOpen, Wrench, Heart } from "lucide-react";

interface ImprovementSectionProps {
  skills: string[];
  projects: string[];
  softSkills: string[];
}

export function ImprovementSection({ skills, projects, softSkills }: ImprovementSectionProps) {
  return (
    <Card className="p-6 rounded-2xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-primary/5">
      {/* Section Title */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Areas for Improvement
        </h2>
        <p className="text-sm text-muted-foreground">
          Focus on these areas to accelerate your career growth
        </p>
      </div>

      {/* Skills and Projects Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Skills to Learn */}
        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Skills to Learn
            </h3>
          </div>
          <div className="space-y-2">
            {skills.map((skill, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-card border border-border transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
              >
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {skill}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Projects to Work On */}
        <div className="p-4 rounded-xl border border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Wrench className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Projects to Work On
            </h3>
          </div>
          <div className="space-y-2">
            {projects.map((project, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-card border border-border transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
              >
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {project}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Soft Skills to Develop */}
      <div className="flex justify-center">
        <div className="w-full md:w-1/2 p-4 rounded-xl border border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Heart className="h-4 w-4 text-primary" />
            </div>
            <h3 className="text-base font-semibold text-foreground">
              Soft Skills to Develop
            </h3>
          </div>
          <div className="space-y-2">
            {softSkills.map((softSkill, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-card border border-border transition-all duration-200 hover:border-primary/40 hover:shadow-sm"
              >
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {softSkill}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

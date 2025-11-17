'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Navigation, MapPin, Flag, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RoadmapSectionProps {
  roadmap: string[];
}

export function RoadmapSection({ roadmap }: RoadmapSectionProps) {
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  // Icons for each step
  const stepIcons = [MapPin, Navigation, Zap, Navigation, Flag];

  return (
    <Card className="p-6 rounded-2xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-primary/5 overflow-hidden">
      {/* Section Title */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-foreground mb-1">
          Career Roadmap
        </h2>
        <p className="text-sm text-muted-foreground">
          Follow this path to reach your career goals
        </p>
      </div>

      {/* Roadmap Steps */}
      <div className="relative">
        {/* Steps Container */}
        <div className="relative">
          {roadmap.map((step, index) => {
            const isEven = index % 2 === 0;
            const Icon = stepIcons[index] || Navigation;
            const isHovered = hoveredStep === index;
            const isFirst = index === 0;
            const isLast = index === roadmap.length - 1;

            return (
              <div
                key={index}
                className={cn(
                  'relative mb-16 lg:mb-24',
                  'flex items-center',
                  'lg:justify-start',
                  !isEven && 'lg:justify-end'
                )}
              >
                {/* Connecting Line */}
                {index < roadmap.length - 1 && (
                  <div className="absolute top-full left-0 w-full h-20 lg:h-24 pointer-events-none hidden lg:block" style={{ zIndex: 0 }}>
                    <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                      <path
                        d={isEven 
                          ? 'M 22.5 0 C 22.5 25, 40 45, 50 50 C 60 55, 77.5 75, 77.5 100'
                          : 'M 77.5 0 C 77.5 25, 60 45, 50 50 C 40 55, 22.5 75, 22.5 100'
                        }
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        strokeLinecap="round"
                        className="text-neutral-300 dark:text-neutral-700"
                        opacity="0.5"
                      />
                    </svg>
                  </div>
                )}
                
                <div
                  className={cn(
                    'group relative w-full lg:w-[45%]',
                    'transform transition-all duration-300 ease-out',
                    isHovered && 'scale-[1.02]'
                  )}
                  style={{ zIndex: 10 }}
                  onMouseEnter={() => setHoveredStep(index)}
                  onMouseLeave={() => setHoveredStep(null)}
                >
                  {/* Step Card */}
                  <div
                    className={cn(
                      'relative p-4 rounded-xl border',
                      'transition-all duration-300',
                      'bg-card',
                      'border-border',
                      isHovered && 'shadow-lg shadow-primary/10 border-primary/40'
                    )}
                  >
                    {/* Step Number Badge */}
                    <div
                      className={cn(
                        'absolute -top-2 -left-2',
                        'w-8 h-8 rounded-full',
                        'flex items-center justify-center',
                        'font-semibold text-sm',
                        'shadow-md transition-all duration-300',
                        'bg-primary',
                        'text-primary-foreground',
                        isHovered && 'scale-110 shadow-primary/30'
                      )}
                    >
                      {index + 1}
                    </div>

                    {/* Icon */}
                    <div
                      className={cn(
                        'inline-flex p-2 rounded-lg mb-3',
                        'transition-all duration-300',
                        'bg-primary/10',
                        isHovered && 'scale-105 bg-primary/20'
                      )}
                    >
                      <Icon
                        className="h-4 w-4 text-primary"
                      />
                    </div>

                    {/* Step Content */}
                    <div className="relative">
                      <p className="text-sm leading-relaxed text-foreground/90">
                        {step}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

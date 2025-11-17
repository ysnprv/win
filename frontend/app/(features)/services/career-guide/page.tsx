'use client';

import { useState } from 'react';
import { CVSelector, CVSource } from '@/components/shared/cv-selector';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generateCareerGuide, CareerGuideResponse } from '@/lib/api/career-guide';
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { StrengthsSection } from '@/components/career-guide/strengths-section';
import { ImprovementSection } from '@/components/career-guide/improvement-section';
import { RoadmapSection } from '@/components/career-guide/roadmap-section';
import { CareerGuideNav } from '@/components/career-guide/career-guide-nav';

type WorkflowStep = 'input' | 'result' | 'loading';

const CAREER_DOMAINS = [
  'Art',
  'Business & Management',
  'Education & Research',
  'Engineering',
  'Finance & Accounting',
  'Healthcare',
  'IT & Software Engineering',
  'Legal & Compliance',
  'Operations & Supply Chain',
  'Sales & Marketing',
];

export default function CareerGuidePage() {
  // State management
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('input');
  const [cvSource, setCvSource] = useState<CVSource | null>(null);
  const [currentJob, setCurrentJob] = useState('');
  const [targetJob, setTargetJob] = useState('');
  const [domain, setDomain] = useState('');
  const [useTargetJob, setUseTargetJob] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [careerGuide, setCareerGuide] = useState<CareerGuideResponse | null>(null);

  // Get user ID
  const getUserId = async (): Promise<string> => {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  };

  // Validate inputs
  const validateInputs = (): boolean => {
    if (!cvSource) {
      toast.error('Please upload or select a CV');
      return false;
    }

    if (!currentJob.trim()) {
      toast.error('Please enter your current job title');
      return false;
    }

    if (!domain) {
      toast.error('Please select a career domain');
      return false;
    }

    if (useTargetJob && !targetJob.trim()) {
      toast.error('Please enter your target job or uncheck the option');
      return false;
    }

    return true;
  };

  // Handle generate career guide
  const handleGenerateGuide = async () => {
    if (!validateInputs()) return;

    setIsGenerating(true);
    setCurrentStep('loading');

    try {
      const userId = await getUserId();

      // Fetch user profile data from Supabase
      const supabase = createClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('skills, experiences, education, achievements')
        .eq('id', userId)
        .single();

      // Filter out null values from profile data
      const profileData: Record<string, any> = {};
      if (profile) {
        if (profile.skills) profileData.skills = profile.skills;
        if (profile.experiences) profileData.experiences = profile.experiences;
        if (profile.education) profileData.education = profile.education;
        if (profile.achievements) profileData.achievements = profile.achievements;
      }

      const guide = await generateCareerGuide(
        userId,
        cvSource!.type === 'file' ? cvSource!.file : null,
        cvSource!.type === 'database' ? cvSource!.cv.anonymized_cv_text : null,
        currentJob,
        domain,
        useTargetJob ? targetJob : null,
        Object.keys(profileData).length > 0 ? profileData : null
      );

      setCareerGuide(guide);
      setCurrentStep('result');
      toast.success('Career guide generated successfully!');
    } catch (error) {
      console.error('Error generating career guide:', error);
      toast.error('Failed to generate career guide. Please try again.');
      setCurrentStep('input');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle restart
  const handleRestart = () => {
    setCvSource(null);
    setCurrentJob('');
    setTargetJob('');
    setDomain('');
    setUseTargetJob(false);
    setCareerGuide(null);
    setCurrentStep('input');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background px-6 py-10">
      <div className="container mx-auto max-w-5xl">
        {/* Navigation - only show on input step and result step */}
        {(currentStep === 'input' || currentStep === 'result') && <CareerGuideNav />}

        {/* Hero Section - Only on input step */}
        {currentStep === 'input' && (
          <div className="relative mb-16 overflow-hidden rounded-3xl">
            {/* Grainy gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-accent/8 via-primary/5 to-accent/8 opacity-70" />
            <div 
              className="absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
                backgroundSize: '100px 100px'
              }}
            />
            
            <div className="relative px-8 py-12 md:px-12 md:py-16">
              <div className="max-w-4xl mx-auto">
                <div className="text-center space-y-6 mb-12">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
                    <svg className="h-3.5 w-3.5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="text-xs font-medium text-accent">Job Market Intelligence</span>
                  </div>
                  
                  <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.05]">
                    Navigate Your
                    <br />
                    <span className="bg-gradient-to-r from-accent via-primary to-accent bg-clip-text text-transparent">
                      Career Journey
                    </span>
                  </h1>
                  
                  <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                    Get a personalized roadmap built from your CV and enriched with real job market data. Know your strengths, bridge your gaps, and chart your path forward.
                  </p>
                </div>
                
                {/* Feature Grid */}
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="p-5 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Career Readiness Score</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">Quantified assessment of your readiness for target roles</p>
                  </div>
                  
                  <div className="p-5 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                      <svg className="h-5 w-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Skills Gap Analysis</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">Identify exactly what skills and projects you need</p>
                  </div>
                  
                  <div className="p-5 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                      <svg className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Personalized Roadmap</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">Step-by-step career progression plan tailored to you</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compact header for other steps */}
        {currentStep !== 'input' && (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
              Career Guide
            </h1>
          </div>
        )}

        {/* Input Step */}
        {currentStep === 'input' && (
          <Card className="p-6 rounded-2xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-primary/5">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-1.5 text-neutral-900 dark:text-neutral-50">
                  Career Information
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm font-light">
                  Upload your CV and tell us about your career goals
                </p>
              </div>

              {/* Horizontal Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: CV Upload/Selection */}
                <div>
                  <CVSelector
                    onCVSelect={setCvSource}
                    label="Your CV"
                    description="Upload your CV or select from your saved CVs"
                  />
                </div>

                {/* Right: Career Details */}
                <div className="space-y-4">
                  {/* Domain Selection */}
                  <div className="space-y-2 mt-2.5">
                    <Label htmlFor="domain" className="text-sm font-semibold text-foreground">
                      Career Domain
                    </Label>
                    <Select value={domain} onValueChange={setDomain}>
                      <SelectTrigger 
                        className="bg-card border-border"
                        suppressHydrationWarning
                      >
                        <SelectValue placeholder="Select domain" />
                      </SelectTrigger>
                      <SelectContent suppressHydrationWarning>
                        {CAREER_DOMAINS.map((d) => (
                          <SelectItem key={d} value={d}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Current Job */}
                  <div className="space-y-2">
                    <Label htmlFor="current-job" className="text-sm font-semibold text-foreground">
                      Current Job Title
                    </Label>
                    <Input
                      id="current-job"
                      placeholder="e.g., Software Engineer"
                      value={currentJob}
                      onChange={(e) => setCurrentJob(e.target.value)}
                      className="bg-card border-border"
                    />
                  </div>

                  {/* Target Job (Optional) */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="use-target-job"
                        checked={useTargetJob}
                        onCheckedChange={(checked) => setUseTargetJob(checked as boolean)}
                      />
                      <Label
                        htmlFor="use-target-job"
                        className="text-sm font-medium text-neutral-900 dark:text-neutral-50 cursor-pointer"
                      >
                        I have a target job in mind
                      </Label>
                    </div>
                    {useTargetJob && (
                      <>
                        <Input
                          id="target-job"
                          placeholder="e.g., Senior Software Architect"
                          value={targetJob}
                          onChange={(e) => setTargetJob(e.target.value)}
                          className="bg-card border-border"
                        />
                        <p className="text-xs text-muted-foreground">
                          If not specified, we'll provide tips for your current role
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-center pt-2">
                <Button
                  onClick={handleGenerateGuide}
                  disabled={isGenerating || !cvSource || !domain || !currentJob}
                  size="lg"
                  className="px-6 py-2.5 text-sm font-medium rounded-lg shadow-lg shadow-primary/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Get Guidance
                </Button>
              </div>
            </div>
          </Card>
        )}

        {/* Loading Step */}
        {currentStep === 'loading' && (
          <div className="space-y-6">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-50">
                Analyzing Your Career Path
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm mt-1">
                Please wait while we craft your personalized guide
              </p>
            </div>
            <Card className="p-6 rounded-2xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-primary/5">
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mt-0.5 flex-shrink-0"></div>
                  <div>
                    <p className="text-sm font-medium text-foreground mb-1">
                      Analyzing your career trajectory
                    </p>
                    <p className="text-xs text-muted-foreground">
                      We're comparing your profile against real job market data, identifying skill gaps, and creating a personalized roadmap. This comprehensive analysis takes 2-3 minutes to ensure accuracy.
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-40 w-full" />
                  <div className="grid md:grid-cols-2 gap-4">
                    <Skeleton className="h-32 w-full" />
                    <Skeleton className="h-32 w-full" />
                  </div>
                  <Skeleton className="h-48 w-full" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Result Step */}
        {currentStep === 'result' && careerGuide && (
          <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-50">
                Your Career Guide
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRestart}
                className="border-neutral-200 dark:border-neutral-700"
              >
                Start Over
              </Button>
            </div>

            {/* Strengths & Readiness */}
            <StrengthsSection
              strengths={careerGuide.current_strengths}
              readinessScore={careerGuide.readiness_score}
            />

            {/* Areas for Improvement */}
            <ImprovementSection
              skills={careerGuide.skills_to_learn}
              projects={careerGuide.projects_to_work_on}
              softSkills={careerGuide.soft_skills_to_develop}
            />

            {/* Career Roadmap */}
            <RoadmapSection roadmap={careerGuide.career_roadmap} />
          </div>
        )}
      </div>
    </div>
  );
}

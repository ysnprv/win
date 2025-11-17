'use client';

import { useState, lazy, Suspense } from 'react';
import { FileUpload } from '@/components/cv-rewriter/file-upload';
import { JobDescriptionInputs, JobDescriptionInput } from '@/components/cv-rewriter/job-description-inputs';
import { QuestionsForm, QuestionAnswer } from '@/components/cv-rewriter/questions-form';
import { AISummary } from '@/components/cv-rewriter/ai-summary';
import { CVRewriterNav } from '@/components/cv-rewriter/cv-rewriter-nav';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { generateQueries, rewriteCV, CVReviewSummary } from '@/lib/api/cv-rewriter';
import { toast } from 'sonner';
import { Sparkles, FileText, MessageSquare, CheckCircle, ArrowLeft } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

// Lazy load PDF viewer to avoid SSR issues with DOMMatrix
const PDFViewer = lazy(() => 
  import('@/components/cv-rewriter/pdf-viewer').then(mod => ({ default: mod.PDFViewer }))
);

type WorkflowStep = 'upload' | 'questions' | 'result';

export default function CVRewriterPage() {
  // State management
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('upload');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [jobDescriptions, setJobDescriptions] = useState<JobDescriptionInput[]>([]);
  const [questions, setQuestions] = useState<Record<string, string> | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);
  const [reviewSummary, setReviewSummary] = useState<CVReviewSummary | null>(null);
  const [isGeneratingQueries, setIsGeneratingQueries] = useState(false);
  const [isGeneratingCV, setIsGeneratingCV] = useState(false);

  // Get user ID
  const getUserId = async (): Promise<string> => {
    const supabase = createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  };

  // Validate uploads
  const validateUploads = (): boolean => {
    if (!cvFile) {
      toast.error('Please upload your CV');
      return false;
    }

    const validJobs = jobDescriptions.filter(
      (job) =>
        (job.type === 'file' && job.file) ||
        (job.type === 'text' && job.text && job.text.trim().length > 0)
    );

    if (validJobs.length === 0) {
      toast.error('Please add at least one job description');
      return false;
    }

    return true;
  };

  // Handle generate queries
  const handleGenerateQueries = async () => {
    if (!validateUploads()) return;

    // Immediately go to questions step with loading state
    setIsGeneratingQueries(true);
    setCurrentStep('questions');

    try {
      const userId = await getUserId();

      const generatedQuestions = await generateQueries(userId, cvFile!, jobDescriptions);

      if (Object.keys(generatedQuestions).length === 0) {
        toast.error('No questions generated. Please try again.');
        setCurrentStep('upload'); // Go back on error
        return;
      }

      setQuestions(generatedQuestions);
      toast.success('Questions generated successfully!');
    } catch (error) {
      console.error('Error generating queries:', error);
      toast.error('Failed to generate questions. Please try again.');
      setCurrentStep('upload'); // Go back on error
    } finally {
      setIsGeneratingQueries(false);
    }
  };

  // Handle submit answers and generate CV
  const handleSubmitAnswers = async (answers: QuestionAnswer[]) => {
    // Immediately go to result step with loading state
    setIsGeneratingCV(true);
    setCurrentStep('result');

    try {
      const userId = await getUserId();
      
      // Fetch user profile data from Supabase
      const supabase = createClient();
      const { data: profile } = await supabase
        .from('profiles')
        .select('name, skills, experiences, education, achievements')
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

      const response = await rewriteCV(userId, answers, Object.keys(profileData).length > 0 ? profileData : undefined);

      // Convert base64 PDF to blob
      const pdfData = atob(response.pdf);
      const pdfArray = new Uint8Array(pdfData.length);
      for (let i = 0; i < pdfData.length; i++) {
        pdfArray[i] = pdfData.charCodeAt(i);
      }
      const pdfBlob = new Blob([pdfArray], { type: 'application/pdf' });

      // Create a URL for the PDF blob
      const url = URL.createObjectURL(pdfBlob);
      setPdfUrl(url);
      // Set a download filename using the user's name if available
      const userName = profile?.name ? profile.name.trim() : null;
      const safeName = userName ? userName.replace(/\s+/g, '_') : 'enhanced_cv';
      setPdfFilename(`${safeName}_CV.pdf`);
      setReviewSummary(response.review);
      toast.success('Your enhanced CV is ready!');
    } catch (error) {
      console.error('Error generating CV:', error);
      toast.error('Failed to enhance your CV. Please try again.');
      setCurrentStep('questions'); // Go back on error
    } finally {
      setIsGeneratingCV(false);
    }
  };

  // Handle restart
  const handleRestart = () => {
    setCvFile(null);
    setJobDescriptions([]);
    setQuestions(null);
    setPdfUrl(null);
    setReviewSummary(null);
    setCurrentStep('upload');
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl);
    }
  };

  // Render step indicator
  const StepIndicator = () => {
    const steps = [
      { id: 'upload', label: 'Upload', icon: FileText },
      { id: 'questions', label: 'Q&A', icon: MessageSquare },
      { id: 'result', label: 'Result', icon: CheckCircle },
    ];

    const currentIndex = steps.findIndex((step) => step.id === currentStep);

    return (
      <div className="flex items-center justify-center gap-2 mb-12">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = index < currentIndex;

          return (
            <div key={step.id} className="flex items-center">
              <div
                className={`flex flex-col items-center gap-2 transition-all duration-200 ${
                  isActive ? 'scale-105' : 'scale-100'
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 ${
                    isCompleted
                      ? 'bg-primary'
                      : isActive
                      ? 'bg-primary ring-2 ring-primary/20 ring-offset-2 ring-offset-background'
                      : 'bg-muted'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isCompleted || isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                </div>
                <span
                  className={`text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'text-foreground'
                      : isCompleted
                      ? 'text-foreground/80'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`mx-3 h-0.5 w-16 transition-all duration-200 ${
                    index < currentIndex
                      ? 'bg-primary'
                      : 'bg-muted'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background px-6 py-10">
      <div className={`container mx-auto ${currentStep === 'result' ? 'max-w-6xl' : 'max-w-5xl'}`}>
        {/* Navigation - Only show on upload step */}
        {currentStep === 'upload' && <CVRewriterNav />}

        {/* Hero Section */}
        {currentStep === 'upload' && (
          <div className="relative mb-16 overflow-hidden rounded-3xl">
            {/* Grainy gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-accent/10 to-primary/5 opacity-60" />
            <div 
              className="absolute inset-0 opacity-[0.15]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'repeat',
                backgroundSize: '128px 128px'
              }}
            />
            
            <div className="relative px-8 py-12 md:px-12 md:py-16">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                {/* Left: Text Content */}
                <div className="space-y-6">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-medium text-primary">AI-Powered Enhancement</span>
                  </div>
                  
                  <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                    Your CV,
                    <br />
                    <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      Reimagined
                    </span>
                  </h1>
                  
                  <p className="text-lg text-muted-foreground leading-relaxed max-w-md">
                    Our AI analyzes job descriptions, asks the right questions, and transforms your CV into a compelling narrative that stands out.
                  </p>
                  
                  <div className="flex flex-wrap gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-sm text-foreground/80">Context-aware rewriting</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-accent" />
                      <span className="text-sm text-foreground/80">ATS-optimized</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="text-sm text-foreground/80">Multi-job targeting</span>
                    </div>
                  </div>
                </div>
                
                {/* Right: Visual Element */}
                <div className="relative hidden md:block">
                  <div className="relative aspect-square">
                    {/* Decorative gradient blobs */}
                    <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-primary/30 to-accent/30 rounded-full blur-3xl" />
                    <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-accent/20 to-primary/20 rounded-full blur-3xl" />
                    
                    {/* Floating cards */}
                    <div className="absolute top-8 right-8 p-4 rounded-xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-primary/5 rotate-6 hover:rotate-3 transition-transform">
                      <FileText className="h-8 w-8 text-primary mb-2" />
                      <div className="text-xs text-muted-foreground">Original CV</div>
                    </div>
                    <div className="absolute bottom-8 left-8 p-4 rounded-xl bg-card/80 backdrop-blur-xl border border-primary/40 shadow-lg shadow-primary/10 -rotate-6 hover:-rotate-3 transition-transform">
                      <Sparkles className="h-8 w-8 text-accent mb-2" />
                      <div className="text-xs font-medium text-foreground">Enhanced CV</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Compact header for other steps */}
        {currentStep !== 'upload' && (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
              CV Booster
            </h1>
          </div>
        )}

        {/* Step Indicator */}
        <StepIndicator />

        {/* Content */}
        <div className="space-y-8">
          {/* Step 1: Upload */}
          {currentStep === 'upload' && (
            <Card className="p-6 rounded-2xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-primary/5">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold mb-1.5 text-foreground">
                    Upload Your Documents
                  </h2>
                  <p className="text-muted-foreground text-sm font-light">
                    Upload your current CV and the job descriptions you're targeting
                  </p>
                </div>

                {/* Horizontal Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Left: CV Upload */}
                  <div>
                    <FileUpload
                      onFileSelect={setCvFile}
                      label="Your CV"
                      description="Upload your current CV (PDF, DOCX, TXT, or MD, max 10MB)"
                    />
                  </div>

                  {/* Right: Job Descriptions */}
                  <div>
                    <JobDescriptionInputs
                      onJobDescriptionsChange={setJobDescriptions}
                      maxJobs={5}
                    />
                  </div>
                </div>

                <div className="flex justify-center pt-2">
                  <Button
                    onClick={handleGenerateQueries}
                    disabled={isGeneratingQueries || !cvFile}
                    size="lg"
                    className="px-6 py-2.5 text-sm font-medium rounded-lg shadow-lg shadow-primary/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isGeneratingQueries ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Generating Questions...
                      </>
                    ) : (
                      <>
                        Enhance
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Step 2: Questions */}
          {currentStep === 'questions' && (
            <Card className="p-8 rounded-2xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-primary/5">
              {isGeneratingQueries ? (
                <div className="space-y-6">
                  <div className="flex items-start gap-3 p-4 mb-6 rounded-lg bg-muted/50 border border-border">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mt-0.5 flex-shrink-0"></div>
                    <div>
                      <p className="text-sm font-medium text-foreground mb-1">
                        Analyzing your CV and job descriptions
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Our AI is generating personalized questions to gather additional context about your experience and skills.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  ))}
                </div>
              ) : questions ? (
                <QuestionsForm
                  questions={questions}
                  onSubmit={handleSubmitAnswers}
                  isSubmitting={isGeneratingCV}
                />
              ) : null}
            </Card>
          )}

          {/* Step 3: Result */}
          {currentStep === 'result' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary mb-4">
                  <CheckCircle className="h-6 w-6 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-semibold mb-2 text-neutral-900 dark:text-neutral-50">
                  {isGeneratingCV ? 'Enhancing Your CV' : 'Your Enhanced CV is Ready'}
                </h2>
                <p className="text-neutral-600 dark:text-neutral-400 text-sm font-light">
                  {isGeneratingCV ? 'Please wait while we enhance your CV' : 'Review your enhanced CV and see what\'s been improved'}
                </p>
              </div>

              {/* Two-column layout: PDF on left, Summary on right */}
              <Card className="p-8 rounded-2xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-primary/5">
                {isGeneratingCV ? (
                  <div className="space-y-6">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mt-0.5 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          Crafting your enhanced CV
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Our AI is rewriting your CV with optimized content, formatting it professionally, and tailoring it to your target jobs. This process typically takes 2-3 minutes as we ensure every detail is perfect.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col lg:flex-row gap-8 lg:gap-0">
                    {/* PDF Skeleton */}
                    <div className="flex-1 lg:flex-[3] lg:pr-12">
                      <Skeleton className="h-[calc(100vh-350px)] min-h-[700px] w-full rounded-xl" />
                    </div>
                    {/* Separator */}
                    <div className="hidden lg:block w-px bg-border flex-shrink-0"></div>
                    <div className="lg:hidden h-px w-full bg-border"></div>
                    {/* Summary Skeleton */}
                    <div className="flex-1 lg:flex-[2] lg:pl-12">
                      <div className="space-y-4">
                        <Skeleton className="h-8 w-1/2" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                      </div>
                    </div>
                  </div>
                  </div>
                ) : pdfUrl && reviewSummary ? (
                  <div className="flex flex-col lg:flex-row gap-8 lg:gap-0">
                    {/* PDF Viewer - Takes less width for more space on improvements */}
                    <div className="flex-1 lg:flex-[3] lg:pr-12 min-w-0">
                      <Suspense 
                        fallback={
                          <div className="flex items-center justify-center min-h-[600px] rounded-xl bg-muted/30 backdrop-blur-lg border border-border">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
                              <p className="text-muted-foreground text-sm">Loading PDF viewer...</p>
                            </div>
                          </div>
                        }
                      >
                        <PDFViewer pdfUrl={pdfUrl} filename={pdfFilename || 'enhanced_cv.pdf'} />
                      </Suspense>
                    </div>

                    {/* Vertical Separator - Hidden on mobile */}
                    <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-neutral-200 dark:via-neutral-800 to-transparent flex-shrink-0"></div>

                    {/* Horizontal Separator - Visible on mobile only */}
                    <div className="lg:hidden h-px w-full bg-gradient-to-r from-transparent via-neutral-200 dark:via-neutral-800 to-transparent"></div>

                    {/* AI Summary - Takes more width to reduce wrapping */}
                    <div className="flex-1 lg:flex-[2] lg:pl-12 min-w-0">
                      <AISummary improvements={reviewSummary.improvements} />
                    </div>
                  </div>
                ) : null}
              </Card>

              {/* Action Button - Only show when CV is ready */}
              {!isGeneratingCV && pdfUrl && reviewSummary && (
                <div className="flex justify-center pt-2">
                  <Button
                    onClick={handleRestart}
                    variant="outline"
                    size="lg"
                    className="px-5 py-2.5 text-sm font-medium rounded-lg border border-border hover:bg-accent transition-all duration-200"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Create Another CV
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

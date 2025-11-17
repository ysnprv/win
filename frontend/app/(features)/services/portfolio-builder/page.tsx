'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, CheckCircle2, AlertCircle, Loader2, ArrowLeft, ExternalLink, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { generatePortfolio } from '@/lib/api/portfolio-builder';
import { CVSelector, CVSource } from '@/components/shared/cv-selector';
import type { Tables } from '@/types/database.types';
import Link from 'next/link';

type Profile = Tables<'profiles'>;
type WorkflowStep = 'configure' | 'result';

const WIREFRAMES = [
  { id: 'classic', name: 'Classic', badge: '/wireframes/classic.png', description: 'Traditional layout with clear sections. Best for corporate and professional profiles.' },
  { id: 'sidepanel', name: 'Side Panel', badge: '/wireframes/sidepanel.png', description: 'Fixed sidebar navigation. Perfect for content-heavy portfolios and detailed showcases.' },
  { id: 'blog', name: 'Blog', badge: '/wireframes/blog.png', description: 'Article-style layout. Ideal for writers, bloggers, and thought leaders.' },
  { id: 'hero', name: 'Hero', badge: '/wireframes/hero.png', description: 'Bold hero section design. Great for making a strong first impression.' },
  { id: 'gallery', name: 'Gallery', badge: '/wireframes/gallery.png', description: 'Visual-first layout. Best for designers, artists, and creative professionals.' },
];

const THEMES = [
  { id: 'professional', name: 'Professional', badge: '/themes/Professional.png', description: 'Clean and corporate style with neutral colors and formal typography.' },
  { id: 'creative', name: 'Creative', badge: '/themes/Creative.png', description: 'Vibrant and artistic with bold colors and expressive design elements.' },
  { id: 'minimal', name: 'Minimal', badge: '/themes/Minimal.png', description: 'Simple and clean with focus on content and whitespace.' },
  { id: 'tech', name: 'Tech', badge: '/themes/Tech.png', description: 'Modern tech-inspired with sharp edges and code-like aesthetics.' },
  { id: 'elegant', name: 'Elegant', badge: '/themes/Elegant.png', description: 'Sophisticated and refined with subtle details and premium feel.' },
  { id: 'dynamic', name: 'Dynamic', badge: '/themes/Dynamic.png', description: 'Energetic and modern with movement and contemporary design.' },
];

const PROFILE_FIELDS = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'location', label: 'Location' },
  { key: 'targeted_role', label: 'Targeted Role' },
  { key: 'skills', label: 'Skills' },
  { key: 'education', label: 'Education' },
  { key: 'experiences', label: 'Experiences' },
  { key: 'achievements', label: 'Achievements' },
  { key: 'github_url', label: 'GitHub URL' },
  { key: 'linkedin_url', label: 'LinkedIn URL' },
  { key: 'twitter_url', label: 'Twitter URL' },
];

export default function PortfolioBuilderPage() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('configure');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [selectedWireframe, setSelectedWireframe] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [customTheme, setCustomTheme] = useState<string>('');
  const [useCustomTheme, setUseCustomTheme] = useState(false);
  const [cvSource, setCvSource] = useState<CVSource | null>(null);
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);

  // Load user profile
  useEffect(() => {
    async function loadProfile() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('Please log in to use the portfolio builder');
        return;
      }

      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
        toast.error('Failed to load profile');
        return;
      }

      setProfile(profileData);
      
      // Auto-select all non-null fields
      const nonNullFields = PROFILE_FIELDS
        .filter(field => {
          const value = profileData[field.key as keyof Profile];
          return value !== null && value !== undefined && 
                 (Array.isArray(value) ? value.length > 0 : value !== '');
        })
        .map(field => field.key);
      
      setSelectedFields(nonNullFields);
    }

    loadProfile();
  }, []);

  const handleCvSelect = (source: CVSource | null) => {
    setCvSource(source);
  };

  const toggleField = (fieldKey: string) => {
    setSelectedFields(prev =>
      prev.includes(fieldKey)
        ? prev.filter(k => k !== fieldKey)
        : [...prev, fieldKey]
    );
  };

  const handleGenerate = async () => {
    if (!selectedWireframe) {
      toast.error('Please select a wireframe');
      return;
    }

    if (!useCustomTheme && !selectedTheme) {
      toast.error('Please select a theme or enter a custom theme');
      return;
    }

    if (useCustomTheme && customTheme.trim().length < 3) {
      toast.error('Custom theme description must be at least 3 characters');
      return;
    }

    if (!profile) {
      toast.error('Profile not loaded');
      return;
    }

    // Immediately go to result step with loading state
    setIsGenerating(true);
    setCurrentStep('result');

    try {
      // Build personal info from selected fields
      const personalInfo: Record<string, any> = {};
      selectedFields.forEach(fieldKey => {
        const value = profile[fieldKey as keyof Profile];
        if (value !== null && value !== undefined) {
          personalInfo[fieldKey] = value;
        }
      });

      const response = await generatePortfolio({
        wireframe: selectedWireframe,
        theme: useCustomTheme ? customTheme.trim() : selectedTheme!,
        cv: cvSource?.type === 'file' ? cvSource.file : undefined,
        cvText: cvSource?.type === 'database' ? cvSource.cv.anonymized_cv_text || undefined : undefined,
        personalInfo,
        photoUrl: profile.avatar_url || undefined,
      });

      setGeneratedHtml(response.html);
      toast.success('Portfolio generated successfully!');
    } catch (error) {
      console.error('Error generating portfolio:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to generate portfolio');
      setCurrentStep('configure'); // Go back on error
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBack = () => {
    setCurrentStep('configure');
  };

  const openInNewTab = () => {
    if (!generatedHtml) return;
    const newWindow = window.open();
    if (newWindow) {
      newWindow.document.write(generatedHtml);
      newWindow.document.close();
    }
  };

  const getSubdomainName = () => {
    if (!profile?.name) return 'john-doe';
    return profile.name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
  };

  const availableFields = PROFILE_FIELDS.filter(field => {
    if (!profile) return false;
    const value = profile[field.key as keyof Profile];
    return value !== null && value !== undefined && 
           (Array.isArray(value) ? value.length > 0 : value !== '');
  });

  if (currentStep === 'result') {
    return (
      <div className="min-h-screen w-full bg-gradient-to-br from-background via-muted/30 to-background p-6">
        <div className="max-w-[1800px] mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={handleBack}
                className="bg-card/60 backdrop-blur-xl border-border"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                  {isGenerating ? 'Building Your Portfolio' : 'Your Portfolio'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {isGenerating ? 'Creating your professional portfolio...' : 'Preview your generated portfolio'}
                </p>
              </div>
            </div>
            <Button
              onClick={openInNewTab}
              disabled={isGenerating}
              className="shadow-lg shadow-primary/25 disabled:opacity-50 cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in New Tab
            </Button>
          </div>

          {/* Preview */}
          <Card className="bg-card/60 backdrop-blur-xl border-border shadow-lg shadow-primary/5 p-6 h-[calc(100vh-16rem)]">
            <div className="h-full border-2 border-border rounded-lg overflow-hidden relative">
              {isGenerating ? (
                <div className="w-full h-full bg-background p-8">
                  <div className="space-y-6">
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border border-border">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mt-0.5 flex-shrink-0"></div>
                      <div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          Building your portfolio website
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Our AI is generating a complete HTML portfolio with your chosen wireframe and theme, structuring your content beautifully, and adding interactive elements. This takes 2-4 minutes to ensure a polished result.
                        </p>
                      </div>
                    </div>
                    <div className="space-y-8">
                      <Skeleton className="h-12 w-1/3 mx-auto" />
                      <div className="grid grid-cols-3 gap-4">
                        <Skeleton className="h-32" />
                        <Skeleton className="h-32" />
                        <Skeleton className="h-32" />
                      </div>
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-4/5" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-24" />
                        <Skeleton className="h-24" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <iframe
                  srcDoc={generatedHtml ? `
                    <style>
                      a {
                        cursor: pointer !important;
                      }
                    </style>
                    <script>
                      document.addEventListener('click', function(e) {
                        const target = e.target.closest('a');
                        if (target && target.tagName === 'A') {
                          e.preventDefault();
                          e.stopPropagation();
                          return false;
                        }
                      }, true);
                    </script>
                    ${generatedHtml}
                  ` : ''}
                  className="w-full h-full"
                  title="Portfolio Preview"
                  sandbox="allow-scripts"
                />
              )}
            </div>
          </Card>

          {/* Premium Hosting Message - Only show when not generating */}
          {!isGenerating && (
            <Card className="relative overflow-hidden border-0 shadow-lg group cursor-pointer bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900 dark:from-neutral-50 dark:via-neutral-100 dark:to-neutral-50">
            {/* Animated gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/30 to-blue-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {/* Animated shine effect */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
              <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            </div>

            {/* Noise texture */}
            <div 
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              }}
            />

            <div className="relative p-8 text-center space-y-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 dark:bg-neutral-900/10 backdrop-blur-sm mb-2 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-6 h-6 text-white dark:text-neutral-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white dark:text-neutral-900 group-hover:text-blue-100 dark:group-hover:text-blue-900 transition-colors duration-300">
                  Host Your Portfolio Online
                </h3>
                <p className="text-sm text-neutral-300 dark:text-neutral-600 max-w-md mx-auto">
                  Upgrade to a higher plan to receive premium hosting with your own custom subdomain
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 dark:bg-neutral-900/5 backdrop-blur-sm border border-white/10 dark:border-neutral-900/10 group-hover:bg-white/10 dark:group-hover:bg-neutral-900/10 group-hover:border-white/20 dark:group-hover:border-neutral-900/20 transition-all duration-300">
                  <span className="text-sm font-mono font-semibold text-white dark:text-neutral-900">
                    {getSubdomainName()}.talentya-onboard.ai
                  </span>
                  <svg className="w-4 h-4 text-white dark:text-neutral-900 group-hover:translate-x-1 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>

                <Button 
                  variant="outline" 
                  className="bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-50 border-white/20 dark:border-neutral-900/20 hover:bg-white/90 dark:hover:bg-neutral-800 hover:scale-105 transition-all duration-300"
                >
                  Upgrade Now
                </Button>
              </div>
            </div>
          </Card>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-muted/30 to-background p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Hero Section */}
        <div className="relative mb-12 overflow-hidden rounded-3xl">
          {/* Grainy gradient background with purple/pink tones */}
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 via-pink-500/6 to-blue-500/8 opacity-60" />
          <div 
            className="absolute inset-0 opacity-[0.13]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat',
              backgroundSize: '120px 120px'
            }}
          />
          
          <div className="relative px-8 py-12 md:px-12 md:py-16">
            <div className="grid md:grid-cols-5 gap-8 items-center">
              {/* Left: Text Content */}
              <div className="md:col-span-3 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                  <Sparkles className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-medium text-purple-600 dark:text-purple-400">AI-Generated Design</span>
                </div>
                
                <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
                  Build Your
                  <br />
                  <span className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                    Digital Presence
                  </span>
                </h1>
                
                <p className="text-lg text-muted-foreground leading-relaxed max-w-xl">
                  Transform your profile into a stunning portfolio website. Choose from multiple layouts and themes, then let AI craft your perfect professional showcase.
                </p>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <svg className="h-3 w-3 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">5 Wireframes</div>
                      <div className="text-xs text-muted-foreground">From classic to gallery layouts</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-pink-500/10 flex items-center justify-center flex-shrink-0">
                      <svg className="h-3 w-3 text-pink-600 dark:text-pink-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">6 Themes</div>
                      <div className="text-xs text-muted-foreground">Professional to creative styles</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                      <svg className="h-3 w-3 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">Custom Themes</div>
                      <div className="text-xs text-muted-foreground">Describe your own style</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 h-5 w-5 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                      <svg className="h-3 w-3 text-purple-600 dark:text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-foreground">Instant Preview</div>
                      <div className="text-xs text-muted-foreground">See your portfolio live</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right: Visual Preview Stack */}
              <div className="md:col-span-2 relative hidden md:block">
                <div className="relative h-80">
                  {/* Decorative gradient blobs */}
                  <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-blue-500/15 to-purple-500/15 rounded-full blur-3xl" />
                  
                  {/* Stacked preview cards */}
                  <div className="absolute top-12 right-4 w-48 h-32 rounded-lg bg-card/90 backdrop-blur-xl border border-border shadow-xl rotate-6 hover:rotate-3 transition-transform overflow-hidden">
                    <div className="p-3 bg-gradient-to-br from-purple-500/10 to-transparent h-full">
                      <div className="space-y-2">
                        <div className="h-2 w-16 bg-foreground/20 rounded" />
                        <div className="h-1.5 w-24 bg-foreground/10 rounded" />
                        <div className="h-1.5 w-20 bg-foreground/10 rounded" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute top-20 left-4 w-48 h-32 rounded-lg bg-card/90 backdrop-blur-xl border border-primary/40 shadow-xl shadow-primary/10 -rotate-6 hover:-rotate-3 transition-transform overflow-hidden">
                    <div className="p-3 bg-gradient-to-br from-primary/10 to-transparent h-full">
                      <div className="space-y-2">
                        <div className="w-8 h-8 rounded-full bg-primary/20" />
                        <div className="h-2 w-20 bg-foreground/20 rounded" />
                        <div className="h-1.5 w-full bg-foreground/10 rounded" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="absolute bottom-8 right-8 w-48 h-32 rounded-lg bg-card/90 backdrop-blur-xl border border-border shadow-xl rotate-3 hover:rotate-0 transition-transform overflow-hidden">
                    <div className="p-3 bg-gradient-to-br from-pink-500/10 to-transparent h-full">
                      <div className="grid grid-cols-3 gap-1">
                        <div className="aspect-square bg-foreground/10 rounded" />
                        <div className="aspect-square bg-foreground/10 rounded" />
                        <div className="aspect-square bg-foreground/10 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Design Selection */}
          <div className="space-y-6">
            {/* Wireframe Selection */}
            <Card className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border-neutral-200/50 dark:border-neutral-800/50 shadow-sm p-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    Select Wireframe
                  </Label>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                    Choose your portfolio layout
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {WIREFRAMES.map((wireframe) => (
                    <button
                      key={wireframe.id}
                      onClick={() => setSelectedWireframe(wireframe.id)}
                      title={wireframe.description}
                      className={`group relative rounded-md overflow-hidden border-2 transition-all ${
                        selectedWireframe === wireframe.id
                          ? 'border-neutral-900 dark:border-neutral-50 ring-2 ring-neutral-900/20 dark:ring-neutral-50/20'
                          : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
                      }`}
                    >
                      <div className="aspect-[4/3] relative overflow-hidden">
                        <img
                          src={wireframe.badge}
                          alt={wireframe.name}
                          className="absolute inset-0 w-full h-full object-contain p-1.5 group-hover:blur-sm transition-all duration-150"
                        />
                        {/* Hover Description Overlay - Veil Animation */}
                        <div 
                          className="absolute inset-0 bg-black/95 backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform duration-150 ease-out flex items-center justify-center p-3"
                          style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E")`,
                          }}
                        >
                          <p className="text-xs leading-tight text-white text-center relative z-10 -mt-3">
                            {wireframe.description}
                          </p>
                        </div>
                      </div>
                      {selectedWireframe === wireframe.id && (
                        <div className="absolute top-1 right-1 bg-neutral-900 dark:bg-neutral-50 rounded-full p-0.5 z-10">
                          <CheckCircle2 className="w-2.5 h-2.5 text-white dark:text-neutral-900" />
                        </div>
                      )}
                      <div className="absolute bottom-0 inset-x-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm py-1 text-center">
                        <span className="text-[10px] font-medium text-neutral-900 dark:text-neutral-50">
                          {wireframe.name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {/* Theme Selection */}
            <Card className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border-neutral-200/50 dark:border-neutral-800/50 shadow-sm p-4">
              <div className="space-y-3">
                <div>
                  <Label className="text-sm font-medium text-neutral-900 dark:text-neutral-50">
                    Select Theme
                  </Label>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
                    Choose a predefined theme or create your own
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="custom-theme"
                    checked={useCustomTheme}
                    onCheckedChange={(checked: boolean) => {
                      setUseCustomTheme(checked);
                      if (checked) setSelectedTheme(null);
                    }}
                  />
                  <Label
                    htmlFor="custom-theme"
                    className="text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer"
                  >
                    Use custom theme description
                  </Label>
                </div>

                {useCustomTheme ? (
                  <div className="space-y-2">
                    <Textarea
                      placeholder="e.g., Modern and vibrant with bold colors..."
                      value={customTheme}
                      onChange={(e) => setCustomTheme(e.target.value.slice(0, 50))}
                      maxLength={50}
                      className="resize-none bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-sm h-20"
                    />
                    <p className="text-xs text-neutral-500 dark:text-neutral-500 text-right">
                      {customTheme.length}/50
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setSelectedTheme(theme.id)}
                        title={theme.description}
                        className={`group relative rounded-md overflow-hidden border-2 transition-all ${
                          selectedTheme === theme.id
                            ? 'border-neutral-900 dark:border-neutral-50 ring-2 ring-neutral-900/20 dark:ring-neutral-50/20'
                            : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 dark:hover:border-neutral-600'
                        }`}
                      >
                        <div className="aspect-[4/3] relative overflow-hidden">
                          <img
                            src={theme.badge}
                            alt={theme.name}
                            className="absolute inset-0 w-full h-full object-contain p-1.5 group-hover:blur-sm transition-all duration-150"
                          />
                          {/* Hover Description Overlay - Veil Animation */}
                          <div 
                            className="absolute inset-0 bg-black/95 backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform duration-150 ease-out flex items-center justify-center p-3"
                            style={{
                              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.15'/%3E%3C/svg%3E")`,
                            }}
                          >
                            <p className="text-xs leading-tight text-white text-center relative z-10 -mt-3">
                              {theme.description}
                            </p>
                          </div>
                        </div>
                        {selectedTheme === theme.id && (
                          <div className="absolute top-1 right-1 bg-neutral-900 dark:bg-neutral-50 rounded-full p-0.5 z-10">
                            <CheckCircle2 className="w-2.5 h-2.5 text-white dark:text-neutral-900" />
                          </div>
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-white/95 dark:bg-neutral-900/95 backdrop-blur-sm py-1 text-center">
                          <span className="text-[10px] font-medium text-neutral-900 dark:text-neutral-50">
                            {theme.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </Card>

          </div>

          {/* Right Column: Content */}
          <div className="space-y-6">
            {/* CV Upload/Selection */}
            <Card className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border-neutral-200/50 dark:border-neutral-800/50 shadow-sm p-6">
              <CVSelector
                onCVSelect={handleCvSelect}
                label="CV (Optional)"
                description="Upload your CV or select from your saved CVs"
              />
            </Card>

            {/* Profile Fields Selection */}
            <Card className="bg-white/60 dark:bg-neutral-900/60 backdrop-blur-xl border-neutral-200/50 dark:border-neutral-800/50 shadow-sm p-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-medium text-neutral-900 dark:text-neutral-50">
                    Profile Information
                  </Label>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    Select which information to include from your profile
                  </p>
                </div>
                {availableFields.length === 0 ? (
                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <UserPlus className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Complete your profile for better results
                        </p>
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                          Add information to your profile so the AI can generate a more personalized and accurate portfolio.
                        </p>
                        <Link href="/profile">
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 bg-white dark:bg-neutral-900 hover:bg-blue-50 dark:hover:bg-blue-950/50 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-100"
                          >
                            Go to Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                      <p className="text-xs text-blue-700 dark:text-blue-300 flex items-center gap-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Adding more profile information helps the AI generate better results
                      </p>
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {availableFields.map((field) => (
                        <div key={field.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={field.key}
                            checked={selectedFields.includes(field.key)}
                            onCheckedChange={() => toggleField(field.key)}
                          />
                          <Label
                            htmlFor={field.key}
                            className="text-sm text-neutral-700 dark:text-neutral-300 cursor-pointer"
                          >
                            {field.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Card>
          </div>
        </div>


        {/* Generate Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedWireframe || (!selectedTheme && !useCustomTheme)}
            className="bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-50 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 px-6"
            size="sm"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

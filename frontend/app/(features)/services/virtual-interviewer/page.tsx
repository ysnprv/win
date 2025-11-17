'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { InterviewNav } from '@/components/virtual-interviewer/interview-nav';
import { PersonaSelector } from '@/components/virtual-interviewer/persona-selector';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { 
  MessageSquare, 
  Video, 
  Users,
  Target,
  Trophy,
  Clock,
  Brain,
  Zap,
  Play,
  Mic
} from 'lucide-react';

type WorkflowStep = 'setup' | 'interview' | 'result';

export default function VirtualInterviewerPage() {
  // State management
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('setup');
  const [isStarting, setIsStarting] = useState(false);

  // Handle start interview
  const handleStartInterview = async () => {
    setIsStarting(true);
    
    // Get selected persona from localStorage
    const selectedPersona = localStorage.getItem("selectedPersona") || "alex_chen";
    
    // Navigate to interview room with persona parameter
    setTimeout(() => {
      router.push(`/services/virtual-interviewer/room?persona=${selectedPersona}`);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background px-6 py-10">
      <div className="container mx-auto max-w-5xl">
        <InterviewNav />
        
        {/* Hero Section - Only on setup step */}
        {currentStep === 'setup' && (
          <>
            <div className="relative mb-16 overflow-hidden rounded-3xl">
              {/* Grainy gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/8 via-blue-500/10 to-cyan-500/8 opacity-60" />
              <div 
                className="absolute inset-0 opacity-[0.13]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'repeat',
                  backgroundSize: '120px 120px'
                }}
              />
              
              <div className="relative px-8 py-12 md:px-12 md:py-16">
                <div className="max-w-4xl mx-auto">
                  <div className="text-center space-y-6 mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                      <Brain className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-medium text-purple-600 dark:text-purple-400">AI-Powered Practice</span>
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.05]">
                      Master Your
                      <br />
                      <span className="bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 dark:from-purple-400 dark:via-blue-400 dark:to-cyan-400 bg-clip-text text-transparent">
                        Interview Skills
                      </span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                      Practice with our AI interviewer powered by a conversational agent. Choose from 5 unique AI personas with distinct roles, styles, and difficulty levels. Get comprehensive feedback reports automatically saved to your profile.
                    </p>
                  </div>
                  
                  {/* Feature Grid */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-5 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50">
                      <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-3">
                        <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">Dynamic Personas</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">5 unique interviewer personalities with distinct styles</p>
                    </div>
                    
                    <div className="p-5 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50">
                      <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                        <Target className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">Realistic Experience</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">Adaptive responses that mirror real interview scenarios</p>
                    </div>
                    
                    <div className="p-5 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50">
                      <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center mb-3">
                        <Trophy className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                      <h3 className="text-sm font-semibold text-foreground mb-1">Instant Feedback</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">Detailed analysis of your performance after each session</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Compact header for other steps */}
        {currentStep !== 'setup' && (
          <div className="text-center mb-8">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
              Virtual Interviewer
            </h1>
          </div>
        )}

        {/* Start Interview Section */}
        {currentStep === 'setup' && (
          <Card className="p-8 md:p-12 rounded-2xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-purple-500/5 relative overflow-hidden">
            {/* Decorative gradient blobs */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-full blur-3xl -z-10" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-cyan-500/10 to-purple-500/10 rounded-full blur-3xl -z-10" />
            
            <div className="max-w-3xl mx-auto text-center space-y-8">
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/30">
                <Zap className="h-10 w-10 text-purple-600 dark:text-purple-400" />
              </div>

              {/* Title */}
              <div className="space-y-3">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground font-heading">
                  Ready for Your Interview?
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto font-body">
                  Experience a realistic interview with our AI-powered system. Each session is unique, adaptive, and designed to help you improve.
                </p>
              </div>

              {/* Features Grid */}
              <div className="grid md:grid-cols-2 gap-4 py-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 text-left">
                  <div className="p-2 rounded-lg bg-purple-500/10 shrink-0">
                    <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">AI Persona System</h3>
                    <p className="text-xs text-muted-foreground">Interview with AI personas featuring unique roles, styles, and difficulty levels</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 text-left">
                  <div className="p-2 rounded-lg bg-blue-500/10 shrink-0">
                    <Brain className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Conversational Agent</h3>
                    <p className="text-xs text-muted-foreground">Real-time bidirectional communication with an intelligent interview agent</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 text-left">
                  <div className="p-2 rounded-lg bg-cyan-500/10 shrink-0">
                    <Clock className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Smart Interview Flow</h3>
                    <p className="text-xs text-muted-foreground">Automatic interview conclusion based on message count and conversation context</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/30 border border-border/50 text-left">
                  <div className="p-2 rounded-lg bg-purple-500/10 shrink-0">
                    <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Comprehensive Analysis</h3>
                    <p className="text-xs text-muted-foreground">Detailed feedback reports automatically saved to your Supabase profile database</p>
                  </div>
                </div>
              </div>

              {/* Persona Selector */}
              <div className="pt-6">
                <PersonaSelector />
              </div>

              {/* CTA */}
              <div className="pt-6">
                <Button
                  onClick={handleStartInterview}
                  disabled={isStarting}
                  size="lg"
                  className="h-12 px-8 text-base font-semibold rounded-xl shadow-2xl shadow-purple-500/30 bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isStarting ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-current mr-2"></div>
                      Preparing Interview...
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Start Interview Now
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-4">
                  No preparation needed • WebSocket-powered real-time chat • Auto-saved feedback
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Interview Step - Coming Soon */}
        {currentStep === 'interview' && (
          <Card className="p-8 rounded-2xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-primary/5">
            <div className="text-center space-y-6 py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-500/10 mb-4">
                <Video className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground">
                Interview Interface
              </h2>
              <p className="text-muted-foreground max-w-md mx-auto">
                The interactive interview interface is currently under development. You'll soon be able to have real-time conversations with our AI interviewer.
              </p>
              <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto mt-8">
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <MessageSquare className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2 mx-auto" />
                  <p className="text-xs text-muted-foreground">Text Chat</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <Mic className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2 mx-auto" />
                  <p className="text-xs text-muted-foreground">Voice Input</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 border border-border">
                  <Clock className="h-6 w-6 text-cyan-600 dark:text-cyan-400 mb-2 mx-auto" />
                  <p className="text-xs text-muted-foreground">Real-time Feedback</p>
                </div>
              </div>
              <Button
                onClick={() => setCurrentStep('setup')}
                variant="outline"
                className="mt-6"
              >
                Back to Setup
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

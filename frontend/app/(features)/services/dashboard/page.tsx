'use client';

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import ServiceCard from "@/components/services/service-card";
import { format } from "date-fns";
import { 
  FileText, 
  Compass, 
  Briefcase, 
  Sparkles, 
  ArrowRight,
  TrendingUp,
  Target,
  Zap
} from "lucide-react";

interface CV {
  id: string;
  job_title: string;
  final_score: number;
  original_score: number;
  created_at: string;
}

interface CareerGuide {
  id: string;
  current_job: string;
  target_job: string | null;
  readiness_score: number;
  domain: string;
  created_at: string;
}

export default function DashboardPage() {
  const [userName, setUserName] = useState<string>("");
  const [greeting, setGreeting] = useState<string>("");
  const [latestCV, setLatestCV] = useState<CV | null>(null);
  const [latestGuide, setLatestGuide] = useState<CareerGuide | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      
      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get profile for name
      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();

      setUserName(profile?.name || user.email?.split('@')[0] || "there");

      // Get latest CV
      const { data: cvs } = await supabase
        .from("cvs")
        .select("id, job_title, final_score, original_score, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (cvs && cvs.length > 0) {
        setLatestCV(cvs[0]);
      }

      // Get latest career guide
      const { data: guides } = await supabase
        .from("career_guides")
        .select("id, current_job, target_job, readiness_score, domain, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (guides && guides.length > 0) {
        setLatestGuide(guides[0]);
      }

      setLoading(false);
    }

    // Set greeting based on time
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Good morning");
    else if (hour < 18) setGreeting("Good afternoon");
    else setGreeting("Good evening");

    loadData();
  }, []);

  const services = [
    {
      title: "CV Rewriter",
      description: "Transform your CV with AI-powered enhancements",
      icon: FileText,
      href: "/services/cv-rewriter",
      gradient: "from-primary/5 via-accent/10 to-primary/5",
      iconColor: "text-primary",
      accentColor: "primary",
    },
    {
      title: "Career Guide",
      description: "Get personalized career guidance and roadmaps",
      icon: Compass,
      href: "/services/career-guide",
      gradient: "from-accent/8 via-primary/5 to-accent/8",
      iconColor: "text-accent",
      accentColor: "accent",
    },
    {
      title: "Job Matcher",
      description: "Find jobs that match your skills perfectly",
      icon: Target,
      href: "/services/jobmatcher",
      gradient: "from-emerald-500/5 via-cyan-400/8 to-emerald-500/5",
      iconColor: "text-emerald-600 dark:text-cyan-300",
      accentColor: "emerald",
      disabled: true,
    },
    {
      title: "Portfolio Builder",
      description: "Create stunning portfolio websites instantly",
      icon: Briefcase,
      href: "/services/portfolio-builder",
      gradient: "from-purple-500/8 via-pink-500/6 to-blue-500/8",
      iconColor: "text-purple-600 dark:text-purple-400",
      accentColor: "purple",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Grainy Gradient */}
      <section className="relative min-h-[40vh] flex items-center justify-center overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/15 to-primary/20 animate-gradient" />
        
        {/* Grainy texture overlay */}
        <div 
          className="absolute inset-0 opacity-[0.15] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '128px 128px'
          }}
        />
        
        {/* Blur effect overlay */}
        <div className="absolute inset-0 backdrop-blur-[100px] bg-background/40" />
        
        {/* Floating elements */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-float-delayed" />
        
        {/* Content */}
        <div className="relative z-10 text-center px-4">
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 font-heading">
            {loading ? <Skeleton className="inline-block h-16 w-48" /> : `${greeting}, ${userName}!`}
          </h1>
        </div>
      </section>

      <div className="container mx-auto max-w-7xl px-6 space-y-8 pb-12">

        {/* Latest Activity Section */}
        {!loading && (latestCV || latestGuide) && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Latest CV */}
            {latestCV && (
              <Link href={`/services/cv-rewriter/database/${latestCV.id}`}>
                <Card className="p-4 bg-card/80 backdrop-blur-xl border-border hover:border-primary/40 transition-all duration-200 hover:shadow-lg hover:shadow-primary/10 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground font-label">Latest CV</p>
                        <h3 className="text-xs font-semibold text-foreground font-body line-clamp-1">
                          {latestCV.job_title}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-green-600 dark:text-green-500 font-label">
                        +{Math.round(((latestCV.final_score - latestCV.original_score) / latestCV.original_score) * 100 + 10)}%
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              </Link>
            )}

            {/* Latest Career Guide */}
            {latestGuide && (
              <Link href={`/services/career-guide/database/${latestGuide.id}`}>
                <Card className="p-4 bg-card/80 backdrop-blur-xl border-border hover:border-accent/40 transition-all duration-200 hover:shadow-lg hover:shadow-accent/10 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-1.5 rounded-lg bg-accent/10">
                        <Compass className="h-4 w-4 text-accent" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium text-muted-foreground font-label">Latest Guide</p>
                        <h3 className="text-xs font-semibold text-foreground font-body line-clamp-1">
                          {latestGuide.target_job || latestGuide.current_job}
                        </h3>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-accent font-label">
                        {latestGuide.readiness_score}%
                      </span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </div>
                </Card>
              </Link>
            )}
          </div>
        )}

        {/* Services Grid */}
        <div className={`${!loading && !latestCV && !latestGuide ? "mt-12 md:mt-20" : ""}`}>
          <h2 className="text-3xl font-semibold text-foreground mb-4 font-heading">Our Services</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <ServiceCard
              href="/services/cv-rewriter"
              title="CV Booster"
              description="Transform your CV into a compelling narrative that stands out"
              icon={Sparkles}
              gradient="from-primary/5 via-accent/10 to-primary/5"
              tagText="AI-Powered"
              tagIcon={Sparkles}
              tagColor="primary"
              features={[{ label: "Context-aware rewriting", colorClass: "bg-primary" }, { label: "ATS-optimized", colorClass: "bg-accent" }]}
              statusText="Get Started"
            />

            <ServiceCard
              href="/services/career-guide"
              title="Career Guide"
              description="Get a personalized roadmap built from your CV and real market data"
              icon={() => (
                <svg className="h-3 w-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              )}
              gradient="from-accent/8 via-primary/5 to-accent/8"
              tagText="Market Intel"
              tagColor="accent"
              features={[{ label: "Readiness score", colorClass: "bg-primary" }, { label: "Growth roadmap", colorClass: "bg-accent" }]}
              statusText="Get Started"
            />

            <ServiceCard
              href="/services/jobmatcher"
              title="Job Matcher"
              description="Find jobs that match your skills perfectly with AI-powered matching"
              icon={Target}
              gradient="from-emerald-500/5 via-cyan-400/8 to-emerald-500/5"
              tagText="Smart Match"
              tagIcon={Target}
              tagColor="emerald"
              features={[{ label: "Smart matching", colorClass: "bg-emerald-500" }, { label: "Real-time updates", colorClass: "bg-cyan-400" }]}
              statusText="Explore"
            />

            <ServiceCard
              href="/services/virtual-interviewer"
              title="Virtual Interviewer"
              description="Practice interviews with AI personalities and get actionable feedback"
              icon={Zap}
              gradient="from-purple-500/8 via-blue-500/10 to-cyan-500/8"
              tagText="Practice"
              tagIcon={Zap}
              tagColor="purple"
              features={[{ label: "AI-powered personas", colorClass: "bg-purple-500" }, { label: "Real-time feedback", colorClass: "bg-blue-500" }]}
              statusText="Live"
            />

            <ServiceCard
              href="/services/portfolio-builder"
              title="Portfolio Builder"
              description="Transform your profile into a stunning portfolio website"
              icon={Briefcase}
              gradient="from-purple-500/8 via-pink-500/6 to-blue-500/8"
              tagText="AI-Generated"
              tagIcon={Sparkles}
              tagColor="purple"
              features={[{ label: "5 Wireframes", colorClass: "bg-purple-500" }, { label: "6 Themes", colorClass: "bg-pink-500" }]}
              statusText="Get Started"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

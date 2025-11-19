import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArrowRight, Sparkles, Compass, Target, Video, Briefcase } from "lucide-react";
import Image from "next/image";
import LogoLink from "@/components/logo-link";

// LogoLink is a client component imported from components/logo-link.tsx

export default async function Home() {
  // Check if user is authenticated
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If authenticated, redirect to dashboard
  if (user) {
    redirect("/services/dashboard");
  }

  return (
    <div className="min-h-screen w-full bg-background overflow-hidden">
      {/* Animated gradient background and grain */}
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-accent/8 to-primary/10 animate-landing-gradient" />
      <div
        className="absolute inset-0 opacity-[0.12] mix-blend-overlay -z-10"
        style={{
          backgroundImage:
            `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.4' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '140px 140px'
        }}
      />
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Logo - centered, switch based on theme like AppSidebar
          - larger on medium+ screens and overlapping the hero headline */}
      <div className="absolute left-1/2 top-4 z-50 -translate-x-1/2 md:top-20 md:-translate-y-6">
        {/* On small screens, show smaller inline logo; on md+ show larger and overlapping */}
        <div className="md:hidden">
          <LogoLink width={140} height={40} />
        </div>
        <div className="hidden md:block">
          <LogoLink width={320} height={110} className="-translate-y-6" />
        </div>
      </div>

      {/* Main Content */}
      {/* Increase top padding so the large logo fits overlapping the hero */}
      <div className="container mx-auto max-w-7xl px-6 pt-28 md:pt-36 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-12">
          {/* Text column */}
          <div className="space-y-6 md:pr-8">
            <div className="inline-flex items-center gap-3 px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
              <Sparkles className="h-4 w-4 text-accent" />
              <span className="text-xs font-medium text-accent font-label">AI-powered career toolkit</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-heading font-extrabold leading-[0.95] tracking-tight">
              Make an impression.
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Faster. Bolder. Smarter.
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl">
              AI-powered CV analysis, job matching from multiple sources, personalized career guidance,
              resume optimization, virtual interviews, and portfolio creation — with privacy protection.
            </p>

            <div className="flex items-center gap-4 pt-2">
              <Button asChild size="lg" className="shadow-lg shadow-primary/25">
                <Link href="/signup">Get Started</Link>
              </Button>

              <Button asChild variant="outline" size="lg">
                <Link href="/login">Login</Link>
              </Button>
            </div>

            {/* Removed blue orb and feature bullets as requested */}
          </div>

          {/* Visual column — large, dramatic blobs & orbs */}
          <div className="hidden md:flex relative justify-center items-center md:order-last">
            <div className="relative w-[600px] h-[480px]">
              {/* Large blurred blobs */}
              <div className="absolute -left-14 -top-10 w-64 h-64 rounded-full bg-gradient-to-br from-purple-500/40 via-pink-500/30 to-blue-500/20 blur-3xl animate-drift-slow" />
              <div className="absolute -right-8 top-24 w-52 h-52 rounded-full bg-gradient-to-br from-emerald-500/30 via-cyan-400/20 blur-2xl animate-float-slow" />

              {/* Removed empty blue floating orb */}

              {/* Decorative rotated accent */}
              <div className="absolute -right-6 bottom-6 w-48 h-36 rotate-12 rounded-xl bg-gradient-to-r from-accent/30 to-primary/25 border border-border blur-md" />

              {/* Floating cards for features (CV Booster, Career Guide, Job Matcher) */}
              <div className="absolute top-4 right-4 p-4 rounded-xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-primary/5 rotate-6 hover:rotate-3 transition-transform">
                <Sparkles className="h-5 w-5 text-primary mb-1" />
                <div className="text-xs font-semibold text-foreground">CV Optimizer</div>
                <div className="text-[11px] text-muted-foreground">LaTeX CVs tailored to jobs</div>
              </div>

              <div className="absolute bottom-4 left-4 p-4 rounded-xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-accent/5 -rotate-6 hover:-rotate-2 transition-transform">
                <Compass className="h-5 w-5 text-foreground mb-1" />
                <div className="text-xs font-semibold text-foreground">Career Guide</div>
                <div className="text-[11px] text-muted-foreground">5-step career roadmap</div>
              </div>

              <div className="absolute right-2 top-40 p-4 rounded-xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-emerald/5 translate-x-6 hover:-translate-y-1 transition-transform">
                <Target className="h-5 w-5 text-accent mb-1" />
                <div className="text-xs font-semibold text-foreground">Job Matcher</div>
                <div className="text-[11px] text-muted-foreground">Jobs from LinkedIn, Upwork & more</div>
              </div>

              {/* Virtual Interviewer */}
              <div className="absolute left-36 top-50 p-4 rounded-xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-blue-500/5 hover:-translate-y-1 transition-transform">
                <Video className="h-5 w-5 text-accent mb-1" />
                <div className="text-xs font-semibold text-foreground">Virtual Interviewer</div>
                <div className="text-[11px] text-muted-foreground">AI interviews with voice</div>
              </div>

              {/* Portfolio Builder */}
              <div className="absolute right-8 bottom-20 p-4 rounded-xl bg-card/80 backdrop-blur-xl border border-border shadow-lg shadow-purple-500/5 rotate-12 hover:rotate-6 transition-transform">
                <Briefcase className="h-5 w-5 text-purple-500 mb-1" />
                <div className="text-xs font-semibold text-foreground">Portfolio Builder</div>
                <div className="text-[11px] text-muted-foreground">HTML portfolios from CV</div>
              </div>

            </div>
          </div>
        </div>

        {/* Sub-hero features: large, spaced icons for a dramatic effect */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-4">
            <div className="text-3xl text-primary"><Sparkles /></div>
            <div>
              <div className="text-lg font-semibold">Privacy-First AI</div>
              <div className="text-sm text-muted-foreground">Anonymized processing ensures your data stays secure while delivering personalized insights.</div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="text-3xl text-accent"><Compass /></div>
            <div>
              <div className="text-lg font-semibold">Multi-Source Intelligence</div>
              <div className="text-sm text-muted-foreground">Aggregates jobs from LinkedIn, Upwork, and specialized APIs for comprehensive matching.</div>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="text-3xl text-foreground"><ArrowRight /></div>
            <div>
              <div className="text-lg font-semibold">Real-Time Processing</div>
              <div className="text-sm text-muted-foreground">Live interviews, instant CV optimization, and semantic job matching powered by advanced LLMs.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

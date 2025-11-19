"use client";

import { Briefcase, Star, Radar } from "lucide-react";

export default function JobMatcherHero() {
  return (
    <div className="relative mb-16 overflow-hidden rounded-3xl">
      {/* Slightly shorter on Y axis than other heroes */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-cyan-50 to-emerald-50 opacity-90 dark:from-emerald-900/20 dark:via-cyan-900/20 dark:to-emerald-900/20" />

      {/* subtle noise texture for richness */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage:
            `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.5' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(#noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px'
        }}
      />

      <div className="relative container mx-auto max-w-5xl px-6 py-10 md:px-12 md:py-12">
        <div className="grid md:grid-cols-2 items-center gap-8">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 border border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800">
              <Star className="h-4 w-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-200">AI Matchmaking</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-[1.05]">
              Find the right role —
              <br />
              <span className="bg-gradient-to-r from-emerald-500 to-cyan-400 bg-clip-text text-transparent">
                faster and smarter
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl">
              We analyze your resume and preferences then match you to roles with better alignment, priority and fit.
              Hover the orbs for quick previews of perks and fit.
            </p>

            {/* Compact stats row to match other heroes (no CTAs) */}
            <div className="flex gap-3 pt-2 items-center">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                <span className="text-sm text-foreground/80">Personalized fit</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-cyan-400 dark:bg-cyan-300" />
                <span className="text-sm text-foreground/80">Priority alerts</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 dark:bg-emerald-300" />
                <span className="text-sm text-foreground/80">Tailored matches & fit scores</span>
              </div>
            </div>

            {/* removed duplicate stat points — single compact stat row above */}
          </div>

          {/* Right: floating shapes & orbs */}
          <div className="relative flex justify-center items-center md:order-last">
            <div className="relative w-[320px] h-48 md:h-56 md:w-[420px]">
              {/* Blurry background blobs */}
              <div className="absolute -left-10 top-2 w-36 h-36 rounded-full bg-emerald-300/40 blur-3xl dark:bg-emerald-700/30" />
              <div className="absolute -right-6 -top-6 w-44 h-44 rounded-full bg-cyan-300/30 blur-3xl dark:bg-cyan-700/20" />

              {/* floating shapes */}
              <div className="absolute left-8 top-8 p-3 rounded-lg bg-card/80 border border-border/40 shadow-md transform transition-all hover:-translate-y-1">
                <div className="flex items-center gap-2">
                  <Radar className="w-5 h-5 text-cyan-500 dark:text-cyan-300" />
                  <div>
                    <div className="text-xs font-semibold text-foreground">Role Radar</div>
                    <div className="text-[11px] text-muted-foreground">Spots roles that match your career goals</div>
                  </div>
                </div>
              </div>

              {/* Hoverable orbs */}
              <div className="absolute bottom-6 right-8 flex gap-3 items-end">
                <div className="group relative">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-400 shadow-lg cursor-pointer transform transition-all duration-200 group-hover:scale-110" />
                </div>

                <div className="group relative">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-300 to-emerald-100 shadow-md cursor-pointer transform transition-all duration-200 group-hover:scale-110 dark:from-emerald-700 dark:to-emerald-500" />
                </div>

                <div className="group relative">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-300 to-cyan-200 shadow cursor-pointer transform transition-all duration-200 group-hover:scale-110 dark:from-sky-700 dark:to-cyan-500" />
                </div>
              </div>

              {/* small rotated accent panel */}
              <div className="absolute -right-6 bottom-10 w-28 h-28 rotate-12 rounded-xl bg-gradient-to-r from-emerald-200/60 to-cyan-200/55 border border-emerald-200/30 blur-md shadow-lg" />

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
import React from "react";
import { Card } from "@/components/ui/card";
import { ArrowRight } from "lucide-react";

type IconType = React.ComponentType<React.SVGProps<SVGSVGElement>>;

interface Feature {
  label: string;
  colorClass?: string;
}

interface Props {
  href: string;
  title: string;
  description: string;
  icon?: IconType;
  gradient?: string; // tailwind gradient classes, e.g. "from-primary/5 via-accent/10 to-primary/5"
  tagText?: string;
  tagIcon?: IconType;
  tagColor?: string; // e.g. "primary" or "emerald"
  features?: Feature[];
  statusText?: string;
}

export default function ServiceCard({
  href,
  title,
  description,
  icon: Icon,
  gradient = "from-primary/5 via-accent/10 to-primary/5",
  tagText,
  tagIcon: TagIcon,
  tagColor = "primary",
  features = [],
  statusText = "",
}: Props) {
  // Map tag color to explicit classes to avoid Tailwind JIT purge issues
  const tagClassMap: Record<string, { bg: string; border: string; text: string }> = {
    primary: { bg: "bg-primary/10", border: "border-primary/20", text: "text-primary" },
    accent: { bg: "bg-accent/10", border: "border-accent/20", text: "text-accent" },
    emerald: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-600 dark:text-cyan-300" },
    purple: { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-600 dark:text-purple-400" },
  };

  const tagCls = tagClassMap[tagColor] || tagClassMap["primary"];

  return (
    <Link href={href}>
      <div className="relative overflow-hidden rounded-lg h-[320px] transition-all duration-200 hover:scale-[1.02] cursor-pointer">
        {/* gradient background (configurable) */}
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-60`} />
        {/* noise overlay for richness */}
        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            backgroundRepeat: 'repeat',
            backgroundSize: '120px 120px'
          }}
        />

        <div className="relative h-full p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ${tagCls.bg} border ${tagCls.border}`}>
              {TagIcon ? <TagIcon className={`h-3 w-3 ${tagCls.text}`} /> : null}
              <span className={`text-[10px] font-medium ${tagCls.text} font-label`}>{tagText}</span>
            </div>

            <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-muted text-muted-foreground font-label">
              {statusText}
            </span>
          </div>

          {/* Title + description: fixed heights to keep layout consistent */}
          <h3 className="text-xl font-bold text-foreground mb-2 font-heading min-h-[56px]">
            {title}
          </h3>

          <p className="text-xs text-muted-foreground font-body mb-4 flex-1 min-h-[48px]">
            {description}
          </p>

          {/* Features: fixed min height so items do not shift layout */}
          <div className="space-y-2 min-h-[72px]">
            {features.map((f, i) => (
              <div className="flex items-center gap-2" key={i}>
                <div
                  className={`h-1.5 w-1.5 rounded-full ${f.colorClass || "bg-primary"}`}
                />
                <span className="text-[10px] text-foreground/70 font-body">{f.label}</span>
              </div>
            ))}
          </div>

          {/* CTA anchored to bottom for consistent alignment */}
          <div className="absolute left-6 right-6 bottom-6 flex items-center gap-2 text-xs font-medium text-primary font-label">
            {Icon ? <Icon className="h-3 w-3" /> : null}
            <span className="flex items-center gap-2">Get Started <ArrowRight className="h-3 w-3" /></span>
          </div>
        </div>
      </div>
    </Link>
  );
}

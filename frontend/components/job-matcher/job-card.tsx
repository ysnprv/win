import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
dayjs.extend(relativeTime);
import Image from "next/image";
import { 
  MapPin, 
  Building2, 
  DollarSign, 
  Clock, 
  Users, 
  Bookmark,
  Heart,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Zap,
  Award,
  Globe
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { AnimatedCircularProgressBar } from "../ui/animated-circular-progress-bar";
import { JobCardProps } from "@/types/job-matcher";

const JobCard = ({
  jobId,
  title,
  company,
  companyLogo,
  location,
  type,
  employmentType,
  salary,
  techstack,
  postedAt,
  matchScore,
  description,
  applicants,
  platforms,
  sourceUrl,
  isLiked = false,
  isSaved = false,
  onLike,
  onSave,
}: JobCardProps) => {
  
  const getMatchLevel = (score: number) => {
    if (score >= 90) return { 
      label: "Excellent Match", 
      primaryColor: "rgb(16, 185, 129)",
      secondaryColor: "rgb(209, 250, 229)",
      textColor: "text-emerald-600 dark:text-emerald-400",
      badgeClass: "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20"
    };
    if (score >= 80) return { 
      label: "Great Match", 
      primaryColor: "rgb(59, 130, 246)",
      secondaryColor: "rgb(219, 234, 254)",
      textColor: "text-blue-600 dark:text-blue-400",
      badgeClass: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-500/20"
    };
    if (score >= 70) return { 
      label: "Good Match", 
      primaryColor: "rgb(139, 92, 246)",
      secondaryColor: "rgb(237, 233, 254)",
      textColor: "text-violet-600 dark:text-violet-400",
      badgeClass: "bg-violet-500/10 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400 border-violet-500/20"
    };
    return { 
      label: "Fair Match", 
      primaryColor: "rgb(249, 115, 22)",
      secondaryColor: "rgb(254, 243, 199)",
      textColor: "text-orange-600 dark:text-orange-400",
      badgeClass: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400 border-orange-500/20"
    };
  };

  const matchLevel = getMatchLevel(matchScore);
  const formattedDate = dayjs(postedAt).fromNow();
  
  return (
    <div className="group cursor-pointer overflow-hidden rounded-xl border border-border/60 bg-card/80 backdrop-blur-md transition-all duration-300 hover:bg-card hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30 dark:hover:shadow-primary/5">
      {/* Header Section with Gradient */}
      <div className="relative bg-gradient-to-br from-primary/5 via-primary/3 to-transparent p-6 pb-4 border-b border-border/40">
        {/* Match Score - Top Right */}
        <div className="absolute top-4 right-4 z-10">
          <AnimatedCircularProgressBar
            max={100}
            min={0}
            value={matchScore}
            gaugePrimaryColor={matchLevel.primaryColor}
            gaugeSecondaryColor={matchLevel.secondaryColor}
            className="size-14"
          />
        </div>

        {/* Company Info */}
        <div className="flex items-start gap-3 pr-16">
          {companyLogo ? (
            <div className="w-12 h-12 rounded-lg overflow-hidden border border-border/60 flex-shrink-0 bg-background/50">
              <Image
                src={companyLogo}
                width={48}
                height={48}
                alt={company}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-border/60 flex items-center justify-center flex-shrink-0">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base mb-1 line-clamp-2 text-foreground group-hover:text-primary transition-colors leading-tight break-words whitespace-normal">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground font-medium">{company}</p>
          </div>
        </div>

        {/* Location & Type - Below Company Info */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3" />
            <span className="font-medium">{location}</span>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-6 space-y-4">
        {/* Match Level Badge with Icon */}
        <div className="flex items-center justify-between">
          <Badge 
            className={cn(
              "font-medium text-xs border px-3 py-1",
              matchLevel.badgeClass
            )}
          >
            <Sparkles className="w-3 h-3 mr-1.5" />
            {matchLevel.label}
          </Badge>
          {salary && (
            <div className="flex items-center gap-1.5 text-sm font-semibold text-[#05e34f] dark:text-[#04c945]">
              <TrendingUp className="w-4 h-4" />
              {salary}
            </div>
          )}
        </div>


        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
          {description}
        </p>

        {/* Meta Info */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" />
            <span>{formattedDate}</span>
          </div>
          <span className="text-border">•</span>
          <span className="font-medium">{employmentType}</span>
          {applicants && (
            <>
              <span className="text-border">•</span>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>{applicants} applicants</span>
              </div>
            </>
          )}
        </div>

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-1.5">
          {techstack.slice(0, 4).map((tech, index) => (
            <Badge 
              key={index} 
              variant="outline" 
              className="text-xs font-medium px-2 py-0.5 bg-background/50 hover:bg-background transition-colors"
            >
              {tech}
            </Badge>
          ))}
          {techstack.length > 4 && (
            <Badge 
              variant="outline" 
              className="text-xs font-medium px-2 py-0.5 bg-background/50"
            >
              +{techstack.length - 4} more
            </Badge>
          )}
        </div>

        {/* Platform Badges */}
        {platforms && platforms.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {platforms.map((platform) => (
              <Badge
                key={platform}
                variant="secondary"
                className="text-[10px] uppercase tracking-wide font-semibold px-2 py-0.5"
              >
                {platform}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="px-6 pb-6 flex gap-2 pt-2">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "rounded-lg h-9 w-9 transition-colors",
            isLiked 
              ? "text-red-500 hover:text-red-600 bg-red-500/10 hover:bg-red-500/20" 
              : "hover:bg-muted"
          )}
          onClick={(e) => {
            e.preventDefault();
            onLike?.(jobId);
          }}
        >
          <Heart className={cn("w-4 h-4", isLiked && "fill-current")} />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "rounded-lg h-9 w-9 transition-colors",
            isSaved 
              ? "text-blue-500 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20" 
              : "hover:bg-muted"
          )}
          onClick={(e) => {
            e.preventDefault();
            onSave?.(jobId);
          }}
        >
          <Bookmark className={cn("w-4 h-4", isSaved && "fill-current")} />
        </Button>

        <Button 
          className="flex-1 gap-2 h-9 font-semibold shadow-sm hover:shadow-md transition-shadow" 
          asChild
        >
          <a 
            href={sourceUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center"
          >
            View Details
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </Button>
      </div>
    </div>
  );
};

export default JobCard;
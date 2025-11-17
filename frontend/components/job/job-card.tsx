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
  ExternalLink
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
  matchReasons,
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
      textColor: "text-emerald-600 dark:text-emerald-400"
    };
    if (score >= 80) return { 
      label: "Great Match", 
      primaryColor: "rgb(59, 130, 246)",
      secondaryColor: "rgb(219, 234, 254)",
      textColor: "text-blue-600 dark:text-blue-400"
    };
    if (score >= 70) return { 
      label: "Good Match", 
      primaryColor: "rgb(139, 92, 246)",
      secondaryColor: "rgb(237, 233, 254)",
      textColor: "text-violet-600 dark:text-violet-400"
    };
    return { 
      label: "Fair Match", 
      primaryColor: "rgb(249, 115, 22)",
      secondaryColor: "rgb(254, 243, 199)",
      textColor: "text-orange-600 dark:text-orange-400"
    };
  };

  const matchLevel = getMatchLevel(matchScore);
  const formattedDate = dayjs(postedAt).fromNow();

  return (
    <div className="group relative rounded-xl border border-border bg-card hover:shadow-lg transition-all duration-300 overflow-hidden">
      {/* Match Score Badge - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <AnimatedCircularProgressBar
          max={100}
          min={0}
          value={matchScore}
          gaugePrimaryColor={matchLevel.primaryColor}
          gaugeSecondaryColor={matchLevel.secondaryColor}
          className="size-15"
        />
      </div>

      {/* Work Type Badge - Top Left */}
      <div className="absolute top-4 left-4 z-10">
        <Badge 
          variant="secondary" 
          className={cn(
            "font-medium",
            type === "Remote" && "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400",
            type === "Hybrid" && "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
          )}
        >
          {type}
        </Badge>
      </div>

      <div className="p-6 pt-20">
        {/* Company Info */}
        <div className="flex items-start gap-4 mb-4">
          {companyLogo ? (
            <div className="w-14 h-14 rounded-lg overflow-hidden border border-border flex-shrink-0">
              <Image
                src={companyLogo}
                width={56}
                height={56}
                alt={company}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-border flex items-center justify-center flex-shrink-0">
              <Building2 className="w-6 h-6 text-primary" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg mb-1 line-clamp-2 text-foreground group-hover:text-primary transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground">{company}</p>
          </div>
        </div>

        {/* Match Level Badge */}
        <div className="mb-4">
          <Badge className={cn(
            "border-0",
            matchLevel.textColor
          )}
          style={{
            backgroundColor: matchLevel.secondaryColor
          }}
          >
            {matchLevel.label}
          </Badge>
        </div>

        {/* Match Breakdown */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-muted/50 rounded-lg p-2.5 text-center border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Skills</p>
            <p className="text-sm font-bold text-foreground">{matchReasons.skills}%</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5 text-center border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Experience</p>
            <p className="text-sm font-bold text-foreground">{matchReasons.experience}%</p>
          </div>
          <div className="bg-muted/50 rounded-lg p-2.5 text-center border border-border/50">
            <p className="text-xs text-muted-foreground mb-1">Culture</p>
            <p className="text-sm font-bold text-foreground">{matchReasons.culture}%</p>
          </div>
        </div>

        {/* Job Details */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="w-4 h-4" />
            <span>{location}</span>
            <span>•</span>
            <span>{employmentType}</span>
          </div>
          
          {salary && (
            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="font-semibold text-green-600 dark:text-green-400">{salary}</span>
            </div>
          )}

          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
            {applicants && (
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{applicants} applicants</span>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
          {description}
        </p>

        {/* Tech Stack */}
        <div className="flex flex-wrap gap-2 mb-4">
          {techstack.slice(0, 4).map((tech, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tech}
            </Badge>
          ))}
          {techstack.length > 4 && (
            <Badge variant="outline" className="text-xs">
              +{techstack.length - 4}
            </Badge>
          )}
        </div>

        {/* Platform Badges */}
        {platforms && platforms.length > 0 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {platforms.map((platform) => (
              <Badge
                key={platform}
                variant="secondary"
                className="text-xs capitalize"
              >
                {platform}
              </Badge>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full",
              isLiked && "text-red-500 hover:text-red-600"
            )}
            onClick={() => onLike?.(jobId)}
          >
            <Heart className={cn("w-5 h-5", isLiked && "fill-current")} />
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "rounded-full",
              isSaved && "text-blue-500 hover:text-blue-600"
            )}
            onClick={() => onSave?.(jobId)}
          >
            <Bookmark className={cn("w-5 h-5", isSaved && "fill-current")} />
          </Button>

          <Button className="flex-1 gap-2" asChild>
            <a 
              href={sourceUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center"
            >
              View Details
              <ExternalLink className="w-4 h-4" />
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default JobCard;
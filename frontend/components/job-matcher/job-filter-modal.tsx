"use client";

import { useState } from "react";
import { X, MapPin, Briefcase, Clock, DollarSign, Award, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { JobSearchFilters } from "@/types/job-matcher";

interface JobFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: JobSearchFilters;
  onApplyFilters: (filters: JobSearchFilters) => void;
}

const JOB_FUNCTIONS = [
  "Software Engineer", "Frontend Engineer", "Backend Engineer", "Full Stack Engineer",
  "Data Engineer", "Data Scientist", "ML Engineer", "DevOps Engineer", "QA Engineer", "UI/UX Designer", "Product Manager"
];

const JOB_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" }
];

const WORK_MODELS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "onsite", label: "On-site" }
];

const EXPERIENCE_LEVELS = [
  { value: "entry", label: "Entry Level" },
  { value: "mid", label: "Mid Level" },
  { value: "senior", label: "Senior Level" }
];

const COMMON_LOCATIONS = [
  "Tunis", "Casablanca", "Cairo", "Berlin", "Dubai", 
  "Remote", "Tehran", "Mecca", "Marrakech"
];

export default function JobFilterModal({ isOpen, onClose, filters, onApplyFilters }: JobFilterModalProps) {
  const [localFilters, setLocalFilters] = useState<JobSearchFilters>(filters);
  const [customLocation, setCustomLocation] = useState("");
  const [customSkill, setCustomSkill] = useState("");

  const toggleArrayFilter = (key: keyof JobSearchFilters, value: string) => {
    setLocalFilters(prev => {
      const current = prev[key] as string[] || [];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      
      return { ...prev, [key]: updated };
    });
  };

  const addCustomLocation = () => {
    if (customLocation.trim()) {
      toggleArrayFilter('locations', customLocation.trim());
      setCustomLocation("");
    }
  };

  const addCustomSkill = () => {
    if (customSkill.trim()) {
      toggleArrayFilter('required_skills', customSkill.trim());
      setCustomSkill("");
    }
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
  };

  const clearAll = () => {
    setLocalFilters({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building className="w-5 h-5" />
            Job Filters
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Job Functions */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Briefcase className="w-4 h-4" />
              Job Functions
            </Label>
            <div className="flex flex-wrap gap-2">
              {JOB_FUNCTIONS.map(func => (
                <Badge
                  key={func}
                  variant={localFilters.job_functions?.includes(func) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayFilter('job_functions', func)}
                >
                  {func}
                </Badge>
              ))}
            </div>
          </div>

          {/* Job Types */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Clock className="w-4 h-4" />
              Job Type
            </Label>
            <div className="flex flex-wrap gap-2">
              {JOB_TYPES.map(type => (
                <Badge
                  key={type.value}
                  variant={localFilters.job_types?.includes(type.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayFilter('job_types', type.value)}
                >
                  {type.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Work Models */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4" />
              Work Model
            </Label>
            <div className="flex flex-wrap gap-2">
              {WORK_MODELS.map(model => (
                <Badge
                  key={model.value}
                  variant={localFilters.work_models?.includes(model.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayFilter('work_models', model.value)}
                >
                  {model.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Experience Levels */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <Award className="w-4 h-4" />
              Experience Level
            </Label>
            <div className="flex flex-wrap gap-2">
              {EXPERIENCE_LEVELS.map(level => (
                <Badge
                  key={level.value}
                  variant={localFilters.experience_levels?.includes(level.value) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayFilter('experience_levels', level.value)}
                >
                  {level.label}
                </Badge>
              ))}
            </div>
          </div>

          {/* Locations */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <MapPin className="w-4 h-4" />
              Locations
            </Label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add custom location..."
                value={customLocation}
                onChange={(e) => setCustomLocation(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomLocation()}
              />
              <Button size="sm" onClick={addCustomLocation}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {COMMON_LOCATIONS.map(location => (
                <Badge
                  key={location}
                  variant={localFilters.locations?.includes(location) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggleArrayFilter('locations', location)}
                >
                  {location}
                </Badge>
              ))}
              {localFilters.locations?.filter(loc => !COMMON_LOCATIONS.includes(loc)).map(location => (
                <Badge
                  key={location}
                  variant="default"
                  className="cursor-pointer gap-1"
                >
                  {location}
                  <X 
                    className="w-3 h-3 hover:bg-destructive/20 rounded-full" 
                    onClick={() => toggleArrayFilter('locations', location)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          {/* Required Skills */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Required Skills</Label>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add required skill..."
                value={customSkill}
                onChange={(e) => setCustomSkill(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addCustomSkill()}
              />
              <Button size="sm" onClick={addCustomSkill}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {localFilters.required_skills?.map(skill => (
                <Badge
                  key={skill}
                  variant="default"
                  className="cursor-pointer gap-1"
                >
                  {skill}
                  <X 
                    className="w-3 h-3 hover:bg-destructive/20 rounded-full" 
                    onClick={() => toggleArrayFilter('required_skills', skill)}
                  />
                </Badge>
              ))}
            </div>
          </div>

          
          {/* Posted Within */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Posted Within</Label>
            <div className="flex gap-2">
              {[7, 14, 30].map(days => (
                <Badge
                  key={days}
                  variant={localFilters.posted_within_days === days ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => setLocalFilters(prev => ({ ...prev, posted_within_days: days }))}
                >
                  {days} days
                </Badge>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={clearAll}>
            Clear All
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleApply}>
              Apply Filters
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
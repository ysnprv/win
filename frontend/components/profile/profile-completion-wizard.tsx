"use client";

import * as React from "react";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Calendar, Briefcase, Award, Link as LinkIcon } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { updateProfile } from "@/lib/profile/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const profileSchema = z.object({
  // Step 1: Basic Info - all optional
  name: z.string().max(255).optional(),
  location: z.string().optional(),
  birthday: z.string().optional(),
  
  // Step 2: Professional Info
  targeted_role: z.string().optional(),
  organization: z.string().optional(),
  
  // Step 3: Skills & Experience (comma-separated strings)
  skills: z.string().optional(),
  experiences: z.string().optional(),
  education: z.string().optional(),
  achievements: z.string().optional(),
  
  // Step 4: Social Links - Allow empty or valid URL
  linkedin_url: z.string().optional().refine(
    (val) => !val || val === "" || z.string().url().safeParse(val).success,
    { message: "Invalid URL" }
  ),
  github_url: z.string().optional().refine(
    (val) => !val || val === "" || z.string().url().safeParse(val).success,
    { message: "Invalid URL" }
  ),
  twitter_url: z.string().optional().refine(
    (val) => !val || val === "" || z.string().url().safeParse(val).success,
    { message: "Invalid URL" }
  ),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileCompletionWizardProps {
  initialData?: Partial<ProfileFormValues>;
  userEmail: string;
}

const steps = [
  { id: 1, title: "Basic Info", icon: Calendar, description: "Tell us about yourself" },
  { id: 2, title: "Professional", icon: Briefcase, description: "Your career goals" },
  { id: 3, title: "Skills & Experience", icon: Award, description: "What you bring" },
  { id: 4, title: "Social Links", icon: LinkIcon, description: "Connect with you" },
];

export function ProfileCompletionWizard({ initialData, userEmail }: ProfileCompletionWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initialData?.name || "",
      location: initialData?.location || "",
      birthday: initialData?.birthday || "",
      targeted_role: initialData?.targeted_role || "",
      organization: initialData?.organization || "",
      skills: initialData?.skills || "",
      experiences: initialData?.experiences || "",
      education: initialData?.education || "",
      achievements: initialData?.achievements || "",
      linkedin_url: initialData?.linkedin_url || "",
      github_url: initialData?.github_url || "",
      twitter_url: initialData?.twitter_url || "",
    },
  });

  const progress = (currentStep / steps.length) * 100;

  const onSubmit = async (data: ProfileFormValues) => {
    console.log("🔴 onSubmit CALLED - This should ONLY happen when Complete Profile button is clicked!");
    console.log("Current step:", currentStep);
    console.log("Steps length:", steps.length);
    
    setIsSubmitting(true);

    try {
      // Convert comma-separated strings to arrays, use null if empty
      const skills = data.skills ? data.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const experiences = data.experiences ? data.experiences.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const education = data.education ? data.education.split(",").map((s) => s.trim()).filter(Boolean) : [];
      const achievements = data.achievements ? data.achievements.split(",").map((s) => s.trim()).filter(Boolean) : [];

      const profileData = {
        name: data.name || null,
        location: data.location || null,
        birthday: data.birthday || null,
        targeted_role: data.targeted_role || null,
        organization: data.organization || null,
        skills: skills.length > 0 ? skills : null,
        experiences: experiences.length > 0 ? experiences : null,
        education: education.length > 0 ? education : null,
        achievements: achievements.length > 0 ? achievements : null,
        linkedin_url: data.linkedin_url || null,
        github_url: data.github_url || null,
        twitter_url: data.twitter_url || null,
      };

      // Mark profile as completed for the first time
      const result = await updateProfile(profileData, true);

      if (result.success) {
        toast.success("Profile completed successfully!", {
          description: "You're all set! Redirecting to dashboard...",
        });
        
        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = "/services/dashboard";
        }, 1000);
      } else {
        toast.error("Failed to update profile", {
          description: result.error || "Please try again",
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      toast.error("An unexpected error occurred", {
        description: "Please try again later",
      });
      setIsSubmitting(false);
    }
  };

  const handleNext = async () => {
    console.log("🟢 handleNext called - Current step:", currentStep);
    
    let fieldsToValidate: (keyof ProfileFormValues)[] = [];

    // Validate current step fields
    switch (currentStep) {
      case 1:
        fieldsToValidate = ["name", "location", "birthday"];
        break;
      case 2:
        fieldsToValidate = ["targeted_role", "organization"];
        break;
      case 3:
        fieldsToValidate = ["skills", "experiences", "education", "achievements"];
        break;
      case 4:
        fieldsToValidate = ["linkedin_url", "github_url", "twitter_url"];
        break;
    }

    const isStepValid = await form.trigger(fieldsToValidate);
    console.log("Step valid:", isStepValid);

    if (isStepValid) {
      if (currentStep < steps.length) {
        console.log("Moving to next step:", currentStep + 1);
        setCurrentStep(currentStep + 1);
      } else {
        console.log("⚠️ Already on last step, should not reach here!");
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Prevent form submission on Enter key press (except on submit button)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLFormElement>) => {
    if (e.key === "Enter") {
      console.log("⚠️ Enter key pressed! Preventing default...");
      e.preventDefault();
      return false;
    }
  };

  const handleSkip = async () => {
    console.log("🟡 handleSkip called - Current step:", currentStep);
    
    // Save current progress before skipping
    const formData = form.getValues();
    const profileData = {
      name: formData.name || null,
      location: formData.location || null,
      birthday: formData.birthday || null,
      targeted_role: formData.targeted_role || null,
      organization: formData.organization || null,
      skills: formData.skills ? formData.skills.split(",").map((s) => s.trim()).filter(Boolean) : [],
      experiences: formData.experiences ? formData.experiences.split(",").map((s) => s.trim()).filter(Boolean) : [],
      education: formData.education ? formData.education.split(",").map((s) => s.trim()).filter(Boolean) : [],
      achievements: formData.achievements ? formData.achievements.split(",").map((s) => s.trim()).filter(Boolean) : [],
      linkedin_url: formData.linkedin_url || null,
      github_url: formData.github_url || null,
      twitter_url: formData.twitter_url || null,
    };

    // Save progress silently WITHOUT marking as completed
    console.log("Saving progress without completion flag...");
    await updateProfile(profileData);

    // Just move to next step - don't auto-redirect
    if (currentStep < steps.length) {
      console.log("Moving to next step:", currentStep + 1);
      setCurrentStep(currentStep + 1);
    } else {
      console.log("⚠️ Already on last step - handleSkip should be hidden!");
    }
  };

  const CurrentIcon = steps[currentStep - 1].icon;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-background via-background to-muted/20">
      {/* Theme Toggle - Top Left */}
      <div className="absolute top-4 left-4 z-50">
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-3xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent leading-tight flex items-center justify-center gap-1">
            <span>Welcome to</span>
            <Image
              src="/onboard_logo-1-blue.png"
              alt="OnBoard"
              width={140}
              height={36}
              className="inline-block h-9 w-auto align-middle relative top-[2px]"
            />
          </h1>
          <p className="text-muted-foreground text-lg">
            Let's complete your profile for better job matching
          </p>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm font-medium">
            <span className="text-muted-foreground">Step {currentStep} of {steps.length}</span>
            <span className="text-primary">{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Steps Indicator */}
        <div className="flex justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            
            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground shadow-lg scale-110"
                      : isCompleted
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-muted bg-background text-muted-foreground"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <p className={`mt-2 text-xs font-medium text-center ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {step.title}
                </p>
              </div>
            );
          })}
        </div>

        {/* Form Card */}
        <Card className="border-2 shadow-xl backdrop-blur-sm bg-card/95">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <CurrentIcon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{steps[currentStep - 1].title}</CardTitle>
                <CardDescription className="text-base">
                  {steps[currentStep - 1].description}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} onKeyDown={handleKeyDown} className="space-y-6">
                {/* Step 1: Basic Info */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input placeholder="John Doe" {...field} />
                          </FormControl>
                          <FormDescription>This is how you'll be identified on the platform</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="San Francisco, CA" {...field} />
                          </FormControl>
                          <FormDescription>Where are you based?</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="birthday"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Birthday</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormDescription>Optional: Helps us personalize your experience</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 2: Professional Info */}
                {currentStep === 2 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="targeted_role"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Role</FormLabel>
                          <FormControl>
                            <Input placeholder="Senior Software Engineer" {...field} />
                          </FormControl>
                          <FormDescription>What position are you aiming for?</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="organization"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Current Organization</FormLabel>
                          <FormControl>
                            <Input placeholder="Acme Inc." {...field} />
                          </FormControl>
                          <FormDescription>Where do you currently work?</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 3: Skills & Experience */}
                {currentStep === 3 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="skills"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Skills</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="React, TypeScript, Node.js, Python, AWS" 
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>Separate skills with commas</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="experiences"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Experience Highlights</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Built scalable microservices, Led team of 5 engineers" 
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>Key experiences (comma-separated)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="education"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Education</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="BS Computer Science - Stanford, MS Data Science - MIT" 
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>Your educational background (comma-separated)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="achievements"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Achievements</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="AWS Certified, Published research paper, Won hackathon" 
                              className="min-h-[80px]"
                              {...field} 
                            />
                          </FormControl>
                          <FormDescription>Notable achievements (comma-separated)</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Step 4: Social Links */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="linkedin_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LinkedIn URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://linkedin.com/in/yourprofile" {...field} />
                          </FormControl>
                          <FormDescription>Your LinkedIn profile</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="github_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GitHub URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://github.com/yourusername" {...field} />
                          </FormControl>
                          <FormDescription>Your GitHub profile</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="twitter_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Twitter/X URL</FormLabel>
                          <FormControl>
                            <Input placeholder="https://twitter.com/yourusername" {...field} />
                          </FormControl>
                          <FormDescription>Your Twitter/X profile</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between pt-6 border-t">
                  <div className="flex gap-2">
                    {currentStep > 1 && (
                      <Button type="button" variant="outline" onClick={handlePrevious}>
                        Previous
                      </Button>
                    )}
                    {currentStep < steps.length && (
                      <Button type="button" variant="ghost" onClick={handleSkip}>
                        Skip this step
                      </Button>
                    )}
                  </div>
                  {currentStep < steps.length ? (
                    <Button type="button" onClick={handleNext}>
                      Next
                    </Button>
                  ) : (
                    <Button 
                      type="button" 
                      disabled={isSubmitting}
                      onClick={() => {
                        console.log("✅ Complete Profile button clicked!");
                        form.handleSubmit(onSubmit)();
                      }}
                    >
                      {isSubmitting ? "Completing..." : "Complete Profile"}
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

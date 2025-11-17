import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { ProfileTabs } from "@/components/profile/profile-tabs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function ProfilePage() {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  // Fetch full profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Only redirect if profile doesn't exist at all (shouldn't happen with trigger)
  if (!profile) {
    redirect("/complete-profile");
  }

  // Check if user is OAuth user (Google, GitHub, etc.)
  const isOAuthUser = user.identities?.some(
    identity => identity.provider !== 'email'
  );

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Theme Toggle - Top Left */}
      <div className="absolute top-4 left-4 z-50">
        <ThemeToggle />
      </div>

      <div className="container max-w-7xl mx-auto px-8 sm:px-12 lg:px-16 py-8 sm:py-12">
        <div className="space-y-6">
          {/* Back button */}
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link href="/services/dashboard">
              <ChevronLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </Button>

          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
              Profile Settings
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg">
              Manage your account and preferences
            </p>
          </div>

          {/* Sidebar Layout */}
          <div className="flex flex-col lg:flex-row gap-8">
            <ProfileTabs 
              profile={profile} 
              userEmail={user.email || ""} 
              isOAuthUser={isOAuthUser || false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

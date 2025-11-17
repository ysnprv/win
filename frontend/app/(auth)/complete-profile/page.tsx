import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { ProfileCompletionWrapper } from "@/components/profile/profile-completion-wrapper";

export default async function CompleteProfilePage() {
    const supabase = await createClient();

    const {
        data: { user },
        error,
    } = await supabase.auth.getUser();

    if (error || !user) {
        redirect("/login");
    }

    // Fetch existing profile data
    const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    const initialData = profile
        ? {
              name: profile.name || "",
              location: profile.location || "",
              birthday: profile.birthday || "",
              targeted_role: profile.targeted_role || "",
              organization: profile.organization || "",
              skills: profile.skills?.join(", ") || "",
              experiences: profile.experiences?.join(", ") || "",
              education: profile.education?.join(", ") || "",
              achievements: profile.achievements?.join(", ") || "",
              linkedin_url: profile.linkedin_url || "",
              github_url: profile.github_url || "",
              twitter_url: profile.twitter_url || "",
          }
        : undefined;

    return (
        <ProfileCompletionWrapper
            initialData={initialData}
            userEmail={user.email || ""}
        />
    );
}

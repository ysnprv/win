import { createClient } from "@/utils/supabase/server";
import type { Database } from "@/types/database.types";
import { calculateProfileCompletion } from "@/lib/profile/completion";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

/**
 * Get the current user's profile
 */
export async function getUserProfile(): Promise<Profile | null> {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
        return null;
    }

    const { data: profile, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

    if (error) {
        console.error("Error fetching profile:", error);
        return null;
    }

    return profile;
}

/**
 * Update the current user's profile
 */
export async function updateUserProfile(updates: ProfileUpdate): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
        return { success: false, error: "User not authenticated" };
    }

    const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id);

    if (error) {
        console.error("Error updating profile:", error);
        return { success: false, error: error.message };
    }

    return { success: true };
}

/**
 * Get profile completion percentage (calculated dynamically)
 */
export async function getProfileCompletion(): Promise<number> {
    const profile = await getUserProfile();
    return calculateProfileCompletion(profile);
}

/**
 * Check if user has active subscription
 */
export async function hasActiveSubscription(): Promise<boolean> {
    const profile = await getUserProfile();
    
    if (!profile || profile.subscription === "Starter") {
        return false;
    }

    // If subscription_end_date is null or in the future, subscription is active
    if (!profile.subscription_end_date) {
        return true;
    }

    const endDate = new Date(profile.subscription_end_date);
    return endDate > new Date();
}

/**
 * Get user's subscription plan
 */
export async function getSubscriptionPlan(): Promise<Database["public"]["Tables"]["profiles"]["Row"]["subscription"]> {
    const profile = await getUserProfile();
    return profile?.subscription ?? "Starter";
}

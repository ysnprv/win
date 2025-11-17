"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import type { Database } from "@/types/database.types";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type ActionResult = {
    success: boolean;
    error?: string;
    message?: string;
};

/**
 * Update user profile data
 */
export async function updateProfile(
    updates: ProfileUpdate,
    markAsCompleted = false
): Promise<ActionResult> {
    const supabase = await createClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "User not authenticated" };
    }

    const updateData: ProfileUpdate = {
        id: user.id,
        email: user.email,
        ...updates,
        // Mark profile as completed if this is the first time completing it
        ...(markAsCompleted && { profile_completed: true }),
    };

    // Use upsert to handle both insert and update cases
    const { error } = await supabase.from("profiles").upsert(
        updateData,
        {
            onConflict: "id",
        }
    );

    if (error) {
        console.error("Error updating profile:", error);
        return { success: false, error: error.message };
    }

    return { success: true, message: "Profile updated successfully" };
}

/**
 * Upload user avatar to Supabase Storage
 */
export async function uploadAvatar(
    formData: FormData
): Promise<ActionResult & { url?: string }> {
    const supabase = await createClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "User not authenticated" };
    }

    const file = formData.get("avatar") as File;

    if (!file || file.size === 0) {
        return { success: false, error: "No file provided" };
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
        return { success: false, error: "File size must be less than 5MB" };
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
        return {
            success: false,
            error: "Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed",
        };
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/avatar.${fileExt}`;

    // Delete old avatar if exists
    await supabase.storage.from("avatars").remove([filePath]);

    // Upload new avatar
    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
            upsert: true,
            contentType: file.type,
        });

    if (uploadError) {
        console.error("Error uploading avatar:", uploadError);
        return { success: false, error: uploadError.message };
    }

    // Get public URL
    const {
        data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    // Update profile with avatar URL
    const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", user.id);

    if (updateError) {
        console.error("Error updating profile with avatar URL:", updateError);
        return { success: false, error: updateError.message };
    }

    return {
        success: true,
        message: "Avatar uploaded successfully",
        url: publicUrl,
    };
}

/**
 * Update user email (requires re-authentication)
 */
export async function updateEmail(
    newEmail: string,
    password: string
): Promise<ActionResult> {
    const supabase = await createClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "User not authenticated" };
    }

    // Check if the new email already belongs to another account
    const { data: existingUser } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", newEmail)
        .neq("id", user.id)
        .single();

    if (existingUser) {
        return { 
            success: false, 
            error: "This email is already associated with another account" 
        };
    }

    // Re-authenticate user with password
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password,
    });

    if (signInError) {
        return { success: false, error: "Invalid password" };
    }

    // Update email
    const { error } = await supabase.auth.updateUser({
        email: newEmail,
    });

    if (error) {
        return { success: false, error: error.message };
    }

    // Update the profiles table email field
    const { error: profileError } = await supabase
        .from("profiles")
        .update({ email: newEmail })
        .eq("id", user.id);

    if (profileError) {
        console.error("Error updating profile email:", profileError);
        // Don't fail the operation, but log the error
        // The auth email was updated successfully
    }

    // Sign out from all devices for security
    await supabase.auth.signOut({ scope: "global" });

    return {
        success: true,
        message:
            "Check both emails for confirmation",
    };
}

/**
 * Update user password (requires re-authentication)
 */
export async function updatePassword(
    currentPassword: string,
    newPassword: string
): Promise<ActionResult> {
    const supabase = await createClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "User not authenticated" };
    }

    // Validate new password
    if (newPassword.length < 8) {
        return {
            success: false,
            error: "Password must be at least 8 characters",
        };
    }

    const hasLetter = /[a-zA-Z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);

    if (!hasLetter || !hasNumber) {
        return {
            success: false,
            error: "Password must contain both letters and numbers",
        };
    }

    // Re-authenticate user with current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword,
    });

    if (signInError) {
        return { success: false, error: "Current password is incorrect" };
    }

    // Update password
    const { error } = await supabase.auth.updateUser({
        password: newPassword,
    });

    if (error) {
        return { success: false, error: error.message };
    }

    // Sign out from all devices for security
    await supabase.auth.signOut({ scope: "global" });

    return {
        success: true,
        message:
            "Password updated successfully",
    };
}

/**
 * Deactivate user account (30-day grace period before permanent deletion)
 */
export async function deactivateAccount(
    confirmationText: string
): Promise<ActionResult> {
    const supabase = await createClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "User not authenticated" };
    }

    // Verify confirmation text
    if (confirmationText !== "DELETE MY ACCOUNT") {
        return { success: false, error: "Confirmation text does not match" };
    }

    // Mark account as deactivated
    const { error } = await supabase
        .from("profiles")
        .update({
            is_deactivated: true,
            deactivated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

    if (error) {
        console.error("Error deactivating account:", error);
        return { success: false, error: error.message };
    }

    // Sign out user
    await supabase.auth.signOut();

    return {
        success: true,
        message:
            "Account deactivated. You have 30 days to log back in and reactivate before permanent deletion.",
    };
}

/**
 * Reactivate a deactivated account
 */
export async function reactivateAccount(): Promise<ActionResult> {
    const supabase = await createClient();

    const {
        data: { user },
        error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
        return { success: false, error: "User not authenticated" };
    }

    // Check if account is deactivated
    const { data: profile } = await supabase
        .from("profiles")
        .select("is_deactivated, deactivated_at")
        .eq("id", user.id)
        .single();

    if (!profile?.is_deactivated) {
        return { success: false, error: "Account is not deactivated" };
    }

    // Reactivate account
    const { error } = await supabase
        .from("profiles")
        .update({
            is_deactivated: false,
            deactivated_at: null,
        })
        .eq("id", user.id);

    if (error) {
        console.error("Error reactivating account:", error);
        return { success: false, error: error.message };
    }

    return { success: true, message: "Account reactivated successfully" };
}

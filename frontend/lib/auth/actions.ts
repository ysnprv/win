"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
    getEmailConfirmationRedirectUrl,
    getPasswordResetRedirectUrl,
    getOAuthRedirectUrl,
} from "./redirect-config";

export type AuthResult = {
    success: boolean;
    error?: string;
};

export async function signUp(formData: FormData): Promise<AuthResult> {
    try {
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        // Validation
        if (!email || !password || !confirmPassword) {
            return { success: false, error: "All fields are required" };
        }

        if (password !== confirmPassword) {
            return { success: false, error: "Passwords do not match" };
        }

        if (password.length < 8) {
            return {
                success: false,
                error: "Password must be at least 8 characters",
            };
        }

        // Password strength validation
        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);

        if (!hasLetter || !hasNumber) {
            return {
                success: false,
                error: "Password must contain both letters and numbers",
            };
        }

        const supabase = await createClient();
        const headerList = await headers();
        let origin = headerList.get("origin") || undefined;

        // If origin header isn't provided (common on server callbacks), try forwards headers
        if (!origin) {
            const forwardedHost =
                headerList.get("x-forwarded-host") || headerList.get("host");
            const forwardedProto =
                headerList.get("x-forwarded-proto") ||
                headerList.get("x-forwarded-protocol") ||
                headerList.get("x-forwarded-scheme");
            if (forwardedHost) {
                origin = `${forwardedProto ?? "https"}://${forwardedHost}`;
            }
        }

        const redirectUrl = getEmailConfirmationRedirectUrl(origin);

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: redirectUrl,
            },
        });

        if (error) {
            // If user already exists, try to resend confirmation email
            if (
                error.message.toLowerCase().includes("already registered") ||
                error.message.toLowerCase().includes("user already exists")
            ) {
                const { error: resendError } = await supabase.auth.resend({
                    type: "signup",
                    email,
                    options: {
                        emailRedirectTo: redirectUrl,
                    },
                });

                if (resendError) {
                    return {
                        success: false,
                        error: "This email is already registered. Please check your email for a verification link or try logging in.",
                    };
                }

                // Successfully resent verification email
                return { success: true };
            }

            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error("Sign up error:", error);
        return {
            success: false,
            error: "An unexpected error occurred during sign up",
        };
    }
}

export async function signIn(formData: FormData): Promise<AuthResult> {
    try {
        const email = formData.get("email") as string;
        const password = formData.get("password") as string;

        if (!email || !password) {
            return { success: false, error: "Email and password are required" };
        }

        const supabase = await createClient();

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        redirect("/services/dashboard");
    } catch (error) {
        // Check if this is a Next.js redirect (which is expected)
        if (error && typeof error === "object" && "digest" in error) {
            // This is a Next.js redirect, not an actual error
            throw error;
        }

        console.error("Sign in error:", error);
        return {
            success: false,
            error: "An unexpected error occurred during sign in",
        };
    }
}

export async function signInWithGoogle(): Promise<{
    url: string | null;
    error?: string;
}> {
    try {
        const supabase = await createClient();
        const headerList = await headers();
        let origin = headerList.get("origin") || undefined;
        if (!origin) {
            const forwardedHost =
                headerList.get("x-forwarded-host") || headerList.get("host");
            const forwardedProto =
                headerList.get("x-forwarded-proto") ||
                headerList.get("x-forwarded-protocol") ||
                headerList.get("x-forwarded-scheme");
            if (forwardedHost) {
                origin = `${forwardedProto ?? "https"}://${forwardedHost}`;
            }
        }
        const redirectUrl = getOAuthRedirectUrl(origin);

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: redirectUrl,
            },
        });

        if (error) {
            return { url: null, error: error.message };
        }

        return { url: data.url };
    } catch (error) {
        console.error("Google sign in error:", error);
        return { url: null, error: "Failed to initiate Google sign in" };
    }
}

export async function signInWithLinkedIn(): Promise<{
    url: string | null;
    error?: string;
}> {
    try {
        const supabase = await createClient();
        const headerList = await headers();
        let origin = headerList.get("origin") || undefined;
        if (!origin) {
            const forwardedHost =
                headerList.get("x-forwarded-host") || headerList.get("host");
            const forwardedProto =
                headerList.get("x-forwarded-proto") ||
                headerList.get("x-forwarded-protocol") ||
                headerList.get("x-forwarded-scheme");
            if (forwardedHost) {
                origin = `${forwardedProto ?? "https"}://${forwardedHost}`;
            }
        }
        const redirectUrl = getOAuthRedirectUrl(origin);

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: "linkedin_oidc",
            options: {
                redirectTo: redirectUrl,
                scopes: "openid profile email",
            },
        });

        if (error) {
            return { url: null, error: error.message };
        }

        return { url: data.url };
    } catch (error) {
        console.error("LinkedIn sign in error:", error);
        return { url: null, error: "Failed to initiate LinkedIn sign in" };
    }
}

export async function resetPassword(formData: FormData): Promise<AuthResult> {
    try {
        const email = formData.get("email") as string;

        if (!email) {
            return { success: false, error: "Email is required" };
        }

        const supabase = await createClient();
        const headerList = await headers();
        let origin = headerList.get("origin") || undefined;
        if (!origin) {
            const forwardedHost =
                headerList.get("x-forwarded-host") || headerList.get("host");
            const forwardedProto =
                headerList.get("x-forwarded-proto") ||
                headerList.get("x-forwarded-protocol") ||
                headerList.get("x-forwarded-scheme");
            if (forwardedHost) {
                origin = `${forwardedProto ?? "https"}://${forwardedHost}`;
            }
        }
        const redirectUrl = getPasswordResetRedirectUrl(origin);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: redirectUrl,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error("Reset password error:", error);
        return {
            success: false,
            error: "An unexpected error occurred while sending reset email",
        };
    }
}

export async function updatePassword(formData: FormData): Promise<AuthResult> {
    try {
        const password = formData.get("password") as string;
        const confirmPassword = formData.get("confirmPassword") as string;

        if (!password || !confirmPassword) {
            return { success: false, error: "All fields are required" };
        }

        if (password !== confirmPassword) {
            return { success: false, error: "Passwords do not match" };
        }

        if (password.length < 8) {
            return {
                success: false,
                error: "Password must be at least 8 characters",
            };
        }

        const hasLetter = /[a-zA-Z]/.test(password);
        const hasNumber = /[0-9]/.test(password);

        if (!hasLetter || !hasNumber) {
            return {
                success: false,
                error: "Password must contain both letters and numbers",
            };
        }

        const supabase = await createClient();

        const { error } = await supabase.auth.updateUser({
            password,
        });

        if (error) {
            return { success: false, error: error.message };
        }

        redirect("/services/dashboard");
    } catch (error) {
        // Check if this is a Next.js redirect (which is expected)
        if (error && typeof error === "object" && "digest" in error) {
            // This is a Next.js redirect, not an actual error
            throw error;
        }

        console.error("Update password error:", error);
        return {
            success: false,
            error: "An unexpected error occurred while updating password",
        };
    }
}

export async function signOut(): Promise<void> {
    try {
        const supabase = await createClient();
        await supabase.auth.signOut();
        redirect("/login");
    } catch (error) {
        // Check if this is a Next.js redirect (which is expected)
        if (error && typeof error === "object" && "digest" in error) {
            // This is a Next.js redirect, not an actual error
            throw error;
        }

        console.error("Sign out error:", error);
        // Still redirect to login even on error
        redirect("/login");
    }
}

export async function resendConfirmationEmail(
    email: string
): Promise<AuthResult> {
    try {
        const supabase = await createClient();
        const headerList = await headers();
        let origin = headerList.get("origin") || undefined;
        if (!origin) {
            const forwardedHost =
                headerList.get("x-forwarded-host") || headerList.get("host");
            const forwardedProto =
                headerList.get("x-forwarded-proto") ||
                headerList.get("x-forwarded-protocol") ||
                headerList.get("x-forwarded-scheme");
            if (forwardedHost) {
                origin = `${forwardedProto ?? "https"}://${forwardedHost}`;
            }
        }
        const redirectUrl = getEmailConfirmationRedirectUrl(origin);

        const { error } = await supabase.auth.resend({
            type: "signup",
            email,
            options: {
                emailRedirectTo: redirectUrl,
            },
        });

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error("Resend confirmation email error:", error);
        return {
            success: false,
            error: "An unexpected error occurred while resending confirmation email",
        };
    }
}

import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    // Try to get forward-aware origin — helpful when behind a proxy or load balancer
    const forwardedHost =
        request.headers.get("x-forwarded-host") || request.headers.get("host");
    const forwardedProto =
        request.headers.get("x-forwarded-proto") ||
        request.headers.get("x-forwarded-protocol") ||
        request.headers.get("x-forwarded-scheme");
    const origin = forwardedHost
        ? `${forwardedProto ?? "https"}://${forwardedHost}`
        : new URL(request.url).origin;
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/services/dashboard";
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle OAuth errors from provider
    if (error) {
        console.error("OAuth provider error:", error, errorDescription);
        return NextResponse.redirect(
            `${origin}/auth/auth-error?error=${encodeURIComponent(
                error
            )}&description=${encodeURIComponent(
                errorDescription || "Authentication failed"
            )}`
        );
    }

    if (code) {
        const supabase = await createClient();
        const { error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
            console.error("Code exchange error:", exchangeError);
            return NextResponse.redirect(
                `${origin}/auth/auth-error?error=${encodeURIComponent(
                    exchangeError.message
                )}`
            );
        }

        // Successfully got session, now check user profile
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (user) {
            // Try to get profile with better error handling
            let profile = null;
            try {
                const { data: profileData } = await supabase
                    .from("profiles")
                    .select("*")
                    .eq("id", user.id)
                    .single();
                profile = profileData;
            } catch (profileError) {
                console.error("Profile lookup error:", profileError);
                // Continue with null profile - will redirect to complete-profile
            }

            // Handle account reactivation
            if (profile?.is_deactivated) {
                return NextResponse.redirect(
                    `${origin}/complete-profile?reactivate=true`
                );
            }

            // If profile doesn't exist or lookup failed, redirect to complete profile (new user)
            if (!profile) {
                return NextResponse.redirect(`${origin}/complete-profile`);
            }

            // If profile_completed is false or null, redirect to complete profile (first login)
            if (!profile.profile_completed) {
                return NextResponse.redirect(`${origin}/complete-profile`);
            }

            // Profile completed, go to dashboard
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Error occurred, redirect to error page
    return NextResponse.redirect(`${origin}/auth/auth-error`);
}

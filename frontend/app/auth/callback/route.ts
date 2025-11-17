import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        // Try to get forward-aware origin — helpful when behind a proxy or load balancer
        const forwardedHost =
            request.headers.get("x-forwarded-host") ||
            request.headers.get("host");
        const forwardedProto =
            request.headers.get("x-forwarded-proto") ||
            request.headers.get("x-forwarded-protocol") ||
            request.headers.get("x-forwarded-scheme");
        const origin = forwardedHost
            ? `${forwardedProto ?? "https"}://${forwardedHost}`
            : new URL(request.url).origin;
        const code = searchParams.get("code");
        const next = searchParams.get("next") ?? "/services/dashboard";

        if (code) {
            const supabase = await createClient();
            const { error } = await supabase.auth.exchangeCodeForSession(code);

            if (!error) {
                // Check if this is a password reset flow
                if (next === "/reset-password") {
                    return NextResponse.redirect(`${origin}/reset-password`);
                }

                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (user) {
                    try {
                        const { data: profile } = await supabase
                            .from("profiles")
                            .select("*")
                            .eq("id", user.id)
                            .single();

                        // Handle account reactivation
                        if (profile?.is_deactivated) {
                            return NextResponse.redirect(
                                `${origin}/complete-profile?reactivate=true`
                            );
                        }

                        // If profile doesn't exist, redirect to complete profile (new user)
                        if (!profile) {
                            return NextResponse.redirect(
                                `${origin}/complete-profile`
                            );
                        }

                        // If profile_completed is false or null, redirect to complete profile (first login)
                        if (!profile.profile_completed) {
                            return NextResponse.redirect(
                                `${origin}/complete-profile`
                            );
                        }

                        // Profile completed, go to dashboard
                        return NextResponse.redirect(`${origin}${next}`);
                    } catch (profileError) {
                        // If there's an error fetching the profile, still proceed to dashboard
                        console.error("Profile fetch error:", profileError);
                        return NextResponse.redirect(`${origin}${next}`);
                    }
                }

                // No user found, go to dashboard anyway
                return NextResponse.redirect(`${origin}${next}`);
            } else {
                console.error("Auth exchange error:", error);
            }
        }

        // Error occurred, redirect to error page
        return NextResponse.redirect(`${origin}/auth/auth-error`);
    } catch (error) {
        console.error("Callback route error:", error);
        // Fallback to dashboard on any error
        return NextResponse.redirect(
            `${new URL(request.url).origin}/services/dashboard`
        );
    }
}

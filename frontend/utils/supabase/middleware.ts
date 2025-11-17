import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const updateSession = async (request: NextRequest) => {
    // Create an unmodified response
    let supabaseResponse = NextResponse.next({
        request,
    });

    const supabase = createServerClient(supabaseUrl!, supabaseKey!, {
        cookies: {
            getAll() {
                return request.cookies.getAll();
            },
            setAll(cookiesToSet) {
                cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
                supabaseResponse = NextResponse.next({
                    request,
                });
                cookiesToSet.forEach(({ name, value, options }) =>
                    supabaseResponse.cookies.set(name, value, options)
                );
            },
        },
    });

    // IMPORTANT: Avoid writing any logic between createServerClient and
    // supabase.auth.getUser(). A simple mistake could make it very hard to debug
    // issues with users being randomly logged out.

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Define protected routes that require authentication
    const protectedRoutes = ["/services", "/profile", "/settings"];
    const authRoutes = ["/login", "/signup", "/forgot-password"];
    const publicAuthRoutes = ["/complete-profile"];
    
    const isProtectedRoute = protectedRoutes.some((route) =>
        request.nextUrl.pathname.startsWith(route)
    );
    const isAuthRoute = authRoutes.some((route) =>
        request.nextUrl.pathname.startsWith(route)
    );
    const isPublicAuthRoute = publicAuthRoutes.some((route) =>
        request.nextUrl.pathname.startsWith(route)
    );

    // Redirect unauthenticated users to login if accessing protected routes
    if (isProtectedRoute && !user) {
        const redirectUrl = new URL("/login", request.url);
        redirectUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
        return NextResponse.redirect(redirectUrl);
    }

    // If user is authenticated and trying to access auth pages, redirect to dashboard
    if (user && isAuthRoute) {
        // Check if email is verified for email/password users
        const hasEmailProvider = user.identities?.some(
            identity => identity.provider === 'email'
        );
        const isEmailVerified = user.email_confirmed_at !== null;

        // If email/password user hasn't verified email, keep them on auth pages
        if (hasEmailProvider && !isEmailVerified && !request.nextUrl.pathname.startsWith("/auth")) {
            return NextResponse.redirect(new URL("/login?message=verify-email", request.url));
        }

        // Otherwise redirect to dashboard
        return NextResponse.redirect(new URL("/services/dashboard", request.url));
    }

    return supabaseResponse;
};

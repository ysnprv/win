/**
 * Helper utilities for managing Supabase email redirect URLs
 * These URLs are read from environment variables to avoid hard-coding
 */

/**
 * Gets the redirect URL for email confirmations (signup, email verification)
 * Falls back to dynamic origin if environment variable is not set
 * @param origin - Optional HTTP origin header value
 * @returns The redirect URL for email confirmations
 */
export function getEmailConfirmationRedirectUrl(origin?: string): string {
    // Prioritize explicit env var for redirect (set per deployment)
    const envUrl =
        process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        // Vercel provides VERCEL_URL without protocol in prod
        (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : undefined) ||
        (process.env.NEXT_PUBLIC_HOST
            ? `http://${process.env.NEXT_PUBLIC_HOST}`
            : undefined);
    if (envUrl) {
        return `${envUrl}/auth/callback`;
    }

    // Fallback to dynamic origin if env variable not set
    if (origin) {
        return `${origin}/auth/callback`;
    }

    // Final fallback to localhost for development
    if (process.env.NODE_ENV === "development") {
        return "http://localhost:3000/auth/callback";
    }

    throw new Error(
        "NEXT_PUBLIC_SUPABASE_REDIRECT_URL is not configured. " +
            "Please set it in .env.local or provide the origin parameter."
    );
}

/**
 * Gets the redirect URL for password reset emails
 * Falls back to dynamic origin if environment variable is not set
 * @param origin - Optional HTTP origin header value
 * @returns The redirect URL for password reset emails
 */
export function getPasswordResetRedirectUrl(origin?: string): string {
    const envUrl =
        process.env.NEXT_PUBLIC_SUPABASE_PASSWORD_RESET_REDIRECT_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : undefined) ||
        (process.env.NEXT_PUBLIC_HOST
            ? `http://${process.env.NEXT_PUBLIC_HOST}`
            : undefined);
    if (envUrl) {
        return `${envUrl}/auth/callback?next=/reset-password`;
    }

    // Fallback to dynamic origin if env variable not set
    if (origin) {
        return `${origin}/auth/callback?next=/reset-password`;
    }

    // Final fallback to localhost for development
    if (process.env.NODE_ENV === "development") {
        return "http://localhost:3000/auth/callback?next=/reset-password";
    }

    throw new Error(
        "NEXT_PUBLIC_SUPABASE_PASSWORD_RESET_REDIRECT_URL is not configured. " +
            "Please set it in .env.local or provide the origin parameter."
    );
}

/**
 * Gets the redirect URL for OAuth callbacks
 * Falls back to dynamic origin if environment variable is not set
 * @param origin - Optional HTTP origin header value
 * @returns The redirect URL for OAuth callbacks
 */
export function getOAuthRedirectUrl(origin?: string): string {
    const envUrl =
        process.env.NEXT_PUBLIC_SUPABASE_REDIRECT_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        (process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : undefined) ||
        (process.env.NEXT_PUBLIC_HOST
            ? `http://${process.env.NEXT_PUBLIC_HOST}`
            : undefined);
    if (envUrl) {
        return `${envUrl}/auth/callback`;
    }

    // Fallback to dynamic origin if env variable not set
    if (origin) {
        return `${origin}/auth/callback`;
    }

    // Final fallback to localhost for development
    if (process.env.NODE_ENV === "development") {
        return "http://localhost:3000/auth/callback";
    }

    throw new Error(
        "NEXT_PUBLIC_SUPABASE_REDIRECT_URL is not configured. " +
            "Please set it in .env.local or provide the origin parameter."
    );
}

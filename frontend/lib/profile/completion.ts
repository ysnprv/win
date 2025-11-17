import type { Database } from "@/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Fields that contribute to profile completion
 */
const PROFILE_FIELDS = [
    "name",
    "location",
    "birthday",
    "linkedin_url",
    "github_url",
    "twitter_url",
    "targeted_role",
    "organization",
    "skills",
    "experiences",
    "education",
    "achievements",
] as const;

/**
 * Calculate profile completion percentage dynamically
 * 
 * @param profile - The user profile object
 * @returns Completion percentage (0-100)
 * 
 * @example
 * ```ts
 * const profile = await getUserProfile();
 * const completion = calculateProfileCompletion(profile);
 * console.log(`Profile is ${completion}% complete`);
 * ```
 */
export function calculateProfileCompletion(profile: Profile | null): number {
    if (!profile) return 0;

    let filledFields = 0;
    const totalFields = PROFILE_FIELDS.length;

    for (const field of PROFILE_FIELDS) {
        const value = profile[field];

        // Check if field has a meaningful value
        if (value !== null && value !== undefined && value !== "") {
            // For arrays, check if they have at least one item
            if (Array.isArray(value)) {
                if (value.length > 0) {
                    filledFields++;
                }
            } else {
                filledFields++;
            }
        }
    }

    return Math.round((filledFields / totalFields) * 100);
}

/**
 * Get list of incomplete profile fields
 * 
 * @param profile - The user profile object
 * @returns Array of field names that are not filled
 */
export function getIncompleteFields(profile: Profile | null): string[] {
    if (!profile) return [...PROFILE_FIELDS];

    const incomplete: string[] = [];

    for (const field of PROFILE_FIELDS) {
        const value = profile[field];

        if (value === null || value === undefined || value === "") {
            incomplete.push(field);
        } else if (Array.isArray(value) && value.length === 0) {
            incomplete.push(field);
        }
    }

    return incomplete;
}

/**
 * Get human-readable field names
 */
export const FIELD_LABELS: Record<typeof PROFILE_FIELDS[number], string> = {
    name: "Full Name",
    location: "Location",
    birthday: "Birthday",
    linkedin_url: "LinkedIn Profile",
    github_url: "GitHub Profile",
    twitter_url: "Twitter Profile",
    targeted_role: "Targeted Role",
    organization: "Organization",
    skills: "Skills",
    experiences: "Work Experience",
    education: "Education",
    achievements: "Achievements",
};

/**
 * Get suggestions for completing profile
 * 
 * @param profile - The user profile object
 * @returns Array of suggestions with field names and labels
 */
export function getProfileSuggestions(profile: Profile | null) {
    const incomplete = getIncompleteFields(profile);
    
    return incomplete.map(field => ({
        field,
        label: FIELD_LABELS[field as typeof PROFILE_FIELDS[number]],
    }));
}

/**
 * Check if profile is complete
 * 
 * @param profile - The user profile object
 * @returns True if all fields are filled
 */
export function isProfileComplete(profile: Profile | null): boolean {
    return calculateProfileCompletion(profile) === 100;
}

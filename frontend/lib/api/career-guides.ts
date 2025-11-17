import { createClient } from "@/utils/supabase/client";

export interface CareerGuide {
  id: string;
  user_id: string;
  current_strengths: string[];
  readiness_score: number;
  skills_to_learn: string[];
  projects_to_work_on: string[];
  soft_skills_to_develop: string[];
  career_roadmap: string[];
  domain: string;
  current_job: string;
  target_job: string | null;
  created_at: string;
  updated_at: string;
}

export interface CareerGuideWithPagination {
  guides: CareerGuide[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetch all career guides for the authenticated user with pagination
 */
export async function fetchUserCareerGuides(
  page: number = 1,
  pageSize: number = 10
): Promise<CareerGuideWithPagination> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please sign in to continue");
  }

  // Calculate pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  // Fetch career guides with pagination
  const { data: guides, error, count } = await supabase
    .from("career_guides")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error("Failed to load career guides");
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    guides: guides || [],
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Fetch a single career guide by ID
 */
export async function fetchCareerGuideById(guideId: string): Promise<CareerGuide> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please sign in to continue");
  }

  // Fetch the career guide
  const { data: guide, error } = await supabase
    .from("career_guides")
    .select("*")
    .eq("id", guideId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    throw new Error("Failed to load career guide");
  }

  if (!guide) {
    throw new Error("Career guide not found");
  }

  return guide;
}

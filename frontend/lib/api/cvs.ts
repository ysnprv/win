import { createClient } from "@/utils/supabase/client";

export interface CV {
  id: string;
  user_id: string;
  pdf_url: string;
  original_score: number;
  final_score: number;
  job_title: string;
  jobs_summary: string;
  anonymized_cv_text: string | null;
  created_at: string;
}

export interface CVWithPagination {
  cvs: CV[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetch all CVs for the authenticated user with pagination
 */
export async function fetchUserCVs(
  page: number = 1,
  pageSize: number = 10
): Promise<CVWithPagination> {
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

  // Fetch CVs with pagination
  const { data: cvs, error, count } = await supabase
    .from("cvs")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error("Failed to load CVs");
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    cvs: cvs || [],
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Fetch a single CV by ID
 */
export async function fetchCVById(cvId: string): Promise<CV> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please sign in to continue");
  }

  // Fetch CV
  const { data: cv, error } = await supabase
    .from("cvs")
    .select("*")
    .eq("id", cvId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    throw new Error("Failed to load CV");
  }

  if (!cv) {
    throw new Error("CV not found");
  }

  return cv;
}

/**
 * Delete a CV by ID
 */
export async function deleteCVById(cvId: string): Promise<void> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please sign in to continue");
  }

  // First, get the CV to retrieve the pdf_url for storage deletion
  const { data: cv, error: fetchError } = await supabase
    .from("cvs")
    .select("pdf_url")
    .eq("id", cvId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !cv) {
    throw new Error("CV not found");
  }

  // Extract storage path from URL
  // URL format: https://{project}.supabase.co/storage/v1/object/public/cv-pdfs/{user_id}/{filename}
  const urlParts = cv.pdf_url.split("/cv-pdfs/");
  if (urlParts.length === 2) {
    const storagePath = urlParts[1];

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from("cv-pdfs")
      .remove([storagePath]);

    if (storageError) {
      console.error("Failed to delete PDF from storage:", storageError);
      // Continue with database deletion even if storage fails
    }
  }

  // Delete from database (RLS will ensure user can only delete their own CVs)
  const { error: deleteError } = await supabase
    .from("cvs")
    .delete()
    .eq("id", cvId)
    .eq("user_id", user.id);

  if (deleteError) {
    throw new Error("Failed to delete CV");
  }
}

/**
 * Get user's name for filename
 */
export async function getUserName(): Promise<string> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return "user";
  }

  // Fetch profile name
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  return profile?.name || "user";
}

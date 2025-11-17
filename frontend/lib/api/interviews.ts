import { createClient } from "@/utils/supabase/client";

export interface Interview {
  id: string;
  user_id: string;
  interviewer_name: string;
  interviewer_role: string;
  interview_style: string;
  difficulty_level: string;
  total_exchanges: number;
  overall_score: number;
  technical_competency: number;
  communication_skills: number;
  problem_solving: number;
  cultural_fit: number;
  acceptance_probability: number;
  key_strengths: string[];
  areas_for_improvement: string[];
  recommendations: string[];
  next_steps: string[];
  pdf_url: string;
  created_at: string;
  updated_at: string;
}

export interface InterviewWithPagination {
  interviews: Interview[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Fetch all interviews for the authenticated user with pagination
 */
export async function fetchUserInterviews(
  page: number = 1,
  pageSize: number = 10
): Promise<InterviewWithPagination> {
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

  // Fetch interviews with pagination
  const { data: interviews, error, count } = await supabase
    .from("interviews")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error("Failed to load interviews");
  }

  const total = count || 0;
  const totalPages = Math.ceil(total / pageSize);

  return {
    interviews: interviews || [],
    total,
    page,
    pageSize,
    totalPages,
  };
}

/**
 * Fetch a single interview by ID
 */
export async function fetchInterviewById(interviewId: string): Promise<Interview> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please sign in to continue");
  }

  // Fetch interview
  const { data: interview, error } = await supabase
    .from("interviews")
    .select("*")
    .eq("id", interviewId)
    .eq("user_id", user.id)
    .single();

  if (error) {
    throw new Error("Failed to load interview");
  }

  if (!interview) {
    throw new Error("Interview not found");
  }

  // Ensure numeric fields are numbers (sometimes database values can be null or strings)
  const normalizeNumber = (val: unknown) => {
    if (val === null || val === undefined) return 0;
    if (typeof val === "number") return val;
    const parsed = Number(val);
    return Number.isNaN(parsed) ? 0 : parsed;
  };

  return {
    ...interview,
    overall_score: normalizeNumber((interview as any).overall_score),
    technical_competency: normalizeNumber((interview as any).technical_competency),
    communication_skills: normalizeNumber((interview as any).communication_skills),
    problem_solving: normalizeNumber((interview as any).problem_solving),
    cultural_fit: normalizeNumber((interview as any).cultural_fit),
    acceptance_probability: normalizeNumber((interview as any).acceptance_probability),
  } as Interview;
}

/**
 * Delete an interview by ID
 */
export async function deleteInterview(interviewId: string): Promise<void> {
  const supabase = createClient();

  // Get authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Please sign in to continue");
  }

  // First, get the interview to retrieve the PDF URL
  const { data: interview, error: fetchError } = await supabase
    .from("interviews")
    .select("pdf_url")
    .eq("id", interviewId)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !interview) {
    throw new Error("Failed to find interview");
  }

  // Delete the PDF from storage if it exists
  if (interview.pdf_url) {
    try {
      const pdfPath = interview.pdf_url.split("/interview-pdfs/")[1];
      if (pdfPath) {
        await supabase.storage.from("interview-pdfs").remove([pdfPath]);
      }
    } catch (error) {
      console.error("Failed to delete PDF from storage:", error);
    }
  }

  // Delete the interview record
  const { error: deleteError } = await supabase
    .from("interviews")
    .delete()
    .eq("id", interviewId)
    .eq("user_id", user.id);

  if (deleteError) {
    throw new Error("Failed to delete interview");
  }
}

/**
 * Download interview PDF
 */
export async function downloadInterviewPDF(pdfUrl: string, interviewId: string): Promise<void> {
  try {
    const response = await fetch(pdfUrl);
    if (!response.ok) throw new Error("Failed to download PDF");
    
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `interview-report-${interviewId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error) {
    throw new Error("Failed to download PDF");
  }
}

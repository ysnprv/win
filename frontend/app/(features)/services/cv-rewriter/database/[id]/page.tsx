"use client";

import { useEffect, useState, lazy, Suspense } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { fetchCVById, deleteCVById, getUserName, CV } from "@/lib/api/cvs";
import { format } from "date-fns";
import { toast } from "sonner";

// Lazy load PDF viewer
const PDFViewer = lazy(() =>
  import("@/components/cv-rewriter/pdf-viewer").then((mod) => ({
    default: mod.PDFViewer,
  }))
);

export default function CVDetailPage() {
  const router = useRouter();
  const params = useParams();
  const cvId = params.id as string;

  const [cv, setCV] = useState<CV | null>(null);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadCV() {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchCVById(cvId);
        setCV(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load CV");
      } finally {
        setLoading(false);
      }
    }

    loadCV();
    // fetch current user's name for filename
    (async () => {
      try {
        const name = await getUserName();
        setPdfFilename(`${name.replace(/\s+/g, '_')}_CV.pdf`);
      } catch (e) {
        setPdfFilename('enhanced_cv.pdf');
      }
    })();
  }, [cvId]);

  const handleDownload = async () => {
    if (!cv) return;

    try {
      const userName = await getUserName();
      const filename = `${userName}_CV.pdf`;

      // Fetch the PDF from the URL
      const response = await fetch(cv.pdf_url);
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("CV downloaded successfully");
      } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download CV. Please try again.");
    }
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await deleteCVById(cvId);
      toast.success("CV deleted successfully");
      router.push("/services/cv-rewriter/database");
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to delete CV. Please try again.");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="flex min-h-[600px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-neutral-400" />
            <p className="mt-4 text-sm text-neutral-600 dark:text-neutral-400">
              Loading CV...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !cv) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20">
          <p className="text-red-800 dark:text-red-200">
            {error || "CV not found"}
          </p>
          <Button
            onClick={() => router.push("/services/cv-rewriter/database")}
            variant="outline"
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Database
          </Button>
        </div>
      </div>
    );
  }

  const scoreImprovement = Math.round(
    ((cv.final_score - cv.original_score) / cv.original_score) * 100 + 10
  );
  const formattedDate = format(new Date(cv.created_at), "MMMM dd, yyyy 'at' HH:mm");

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background px-6 py-10">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            onClick={() => router.push("/services/cv-rewriter/database")}
            variant="ghost"
            size="sm"
            className="mb-4 -ml-2 text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Database
          </Button>
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-medium tracking-tight text-foreground">
                {cv.job_title}
              </h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {formattedDate}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-lg font-medium tracking-tight text-[#05e34f] hover:text-[#04c945] transition-colors">
                +{scoreImprovement}% Boost
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    disabled={deleting}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="border-border bg-popover/95 backdrop-blur-xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">Delete CV</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      Are you sure you want to delete this CV? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-border">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-red-500/90 hover:bg-red-600/90 text-white"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        "Delete"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Two-column layout: PDF on left, Summary on right */}
        <Card className="p-6 rounded-xl bg-card/80 backdrop-blur-xl border border-border shadow-xl shadow-primary/5">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-0">
            {/* PDF Viewer - Left side */}
            <div className="flex-1 lg:flex-[3] lg:pr-12 min-w-0">
              <Suspense
                fallback={
                  <div className="flex h-[600px] items-center justify-center rounded-lg border border-border bg-muted/30 backdrop-blur">
                    <div className="text-center">
                      <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
                      <p className="mt-3 text-xs text-muted-foreground">
                        Loading PDF viewer...
                      </p>
                    </div>
                  </div>
                }
              >
                <PDFViewer pdfUrl={cv.pdf_url} filename={pdfFilename || 'enhanced_cv.pdf'} />
              </Suspense>
            </div>

            {/* Vertical Separator - Hidden on mobile */}
            <div className="hidden lg:block w-px bg-border flex-shrink-0"></div>

            {/* Horizontal Separator - Visible on mobile only */}
            <div className="lg:hidden h-px w-full bg-border"></div>

            {/* Jobs Summary - Right side */}
            <div className="flex-1 lg:flex-[2] lg:pl-12 min-w-0">
              <div className="space-y-3">
                <h2 className="text-base font-medium text-foreground">
                  Chosen jobs summary
                </h2>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  AI-generated summary of all provided job descriptions
                </p>
                <p className="text-sm leading-relaxed text-foreground/90 pt-4">
                  {cv.jobs_summary}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

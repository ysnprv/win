"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { CVRewriterNav } from "@/components/cv-rewriter/cv-rewriter-nav";
import { CVCard } from "@/components/cv-rewriter/cv-card";
import { fetchUserCVs, CVWithPagination } from "@/lib/api/cvs";
import { FileX } from "lucide-react";

function CVCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card/60 backdrop-blur-md">
      <div className="p-6 space-y-4">
        <Skeleton className="h-14 w-full bg-muted" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-4 w-24 bg-muted" />
          <Skeleton className="h-5 w-16 bg-muted" />
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex min-h-[500px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 p-12 backdrop-blur">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <FileX className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mt-6 text-base font-medium text-foreground">
        No CVs found
      </h3>
      <p className="mt-1 text-center text-xs text-muted-foreground">
        You haven't generated any CVs yet. Generate your first CV to get started!
      </p>
    </div>
  );
}

export default function CVDatabasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPage = Number(searchParams.get("page")) || 1;

  const [data, setData] = useState<CVWithPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCVs() {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchUserCVs(currentPage, 10);
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load CVs");
      } finally {
        setLoading(false);
      }
    }

    loadCVs();
  }, [currentPage]);

  const handlePageChange = (page: number) => {
    router.push(`/services/cv-rewriter/database?page=${page}`);
  };

  // Generate pagination items
  const generatePaginationItems = () => {
    if (!data) return [];
    
    const items = [];
    const { page, totalPages } = data;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        items.push(i);
      }
    } else {
      if (page <= 3) {
        items.push(1, 2, 3, 4, "ellipsis", totalPages);
      } else if (page >= totalPages - 2) {
        items.push(1, "ellipsis", totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        items.push(1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages);
      }
    }

    return items;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background px-6 py-10">
      <div className="container mx-auto max-w-7xl">
        <CVRewriterNav />

        <div className="mb-6">
          <h1 className="text-2xl font-medium tracking-tight text-foreground">
            Your CV Database
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            View and manage all your generated CVs
          </p>
        </div>

      {error && (
        <div className="mb-6 rounded-lg border border-red-200/40 bg-red-50/50 backdrop-blur p-4 text-xs text-red-600 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <CVCardSkeleton key={i} />
          ))}
        </div>
      ) : data && data.cvs.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data?.cvs.map((cv) => (
              <CVCard key={cv.id} cv={cv} />
            ))}
          </div>

          {data && data.totalPages > 1 && (
            <div className="mt-12">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => handlePageChange(currentPage - 1)}
                      className={
                        currentPage === 1
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>

                  {generatePaginationItems().map((item, index) => (
                    <PaginationItem key={index}>
                      {item === "ellipsis" ? (
                        <PaginationEllipsis />
                      ) : (
                        <PaginationLink
                          onClick={() => handlePageChange(item as number)}
                          isActive={currentPage === item}
                          className="cursor-pointer"
                        >
                          {item}
                        </PaginationLink>
                      )}
                    </PaginationItem>
                  ))}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => handlePageChange(currentPage + 1)}
                      className={
                        currentPage === data.totalPages
                          ? "pointer-events-none opacity-50"
                          : "cursor-pointer"
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
      </div>
    </div>
  );
}

'use client';

import { useState, useCallback, useEffect } from 'react';
import { FileUpload } from '@/components/cv-rewriter/file-upload';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Skeleton } from '@/components/ui/skeleton';
import { Database, Upload, X, FileText, FileX, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchUserCVs, CV } from '@/lib/api/cvs';
import { format } from 'date-fns';
import { toast } from 'sonner';

export type CVSource = 
  | { type: 'file'; file: File }
  | { type: 'database'; cv: CV };

interface CVSelectorProps {
  onCVSelect: (source: CVSource | null) => void;
  label?: string;
  description?: string;
}

interface SelectedDatabaseCVProps {
  cv: CV;
  onRemove: () => void;
}

function SelectedDatabaseCV({ cv, onRemove }: SelectedDatabaseCVProps) {
  const scoreImprovement = Math.round(
    ((cv.final_score - cv.original_score) / cv.original_score) * 100 + 10
  );
  const formattedDate = format(new Date(cv.created_at), "MMM dd, yyyy");

  return (
    <HoverCard openDelay={200}>
      <HoverCardTrigger asChild>
        <div className="flex items-center gap-4 p-5 rounded-xl bg-card/60 backdrop-blur-md border border-border shadow-sm hover:bg-card hover:shadow-md hover:border-primary/30 transition-all duration-200">
          <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2">
            <FileText className="h-4 w-4 text-primary" />
          </div>
            <div className="flex-1 min-w-0">
            <p className="text-base font-medium truncate text-foreground">{cv.job_title}</p>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-muted-foreground">{formattedDate}</p>
              <span className="text-xs font-semibold text-[#05e34f] dark:text-[#04c945]">
                +{scoreImprovement}% Boost
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="flex-shrink-0 hover:bg-red-100 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-500 transition-all duration-200"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </HoverCardTrigger>
      <HoverCardContent
        side="right"
        align="center"
        className="w-80 border-border/50 bg-popover/95 backdrop-blur-xl shadow-xl"
      >
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-foreground">
            Job Description Summary
          </h4>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {cv.jobs_summary}
          </p>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}

interface CVDatabaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (cv: CV) => void;
}

function CVDatabaseModal({ open, onOpenChange, onSelect }: CVDatabaseModalProps) {
  const [cvs, setCVs] = useState<CV[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCVId, setSelectedCVId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadCVs = useCallback(async (page: number) => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchUserCVs(page, 8);
      setCVs(result.cvs);
      setTotalPages(result.totalPages);
      setCurrentPage(result.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load CVs');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load CVs when modal opens
  const handleOpenChange = useCallback((newOpen: boolean) => {
    onOpenChange(newOpen);
  }, [onOpenChange]);

  useEffect(() => {
    if (open) {
      setSelectedCVId(null);
      loadCVs(1);
    }
  // run when open changes
  }, [open, loadCVs]);

  const handlePageChange = (page: number) => {
    loadCVs(page);
  };

  const handleConfirm = () => {
    const selectedCV = cvs.find(cv => cv.id === selectedCVId);
    if (selectedCV) {
      onSelect(selectedCV);
      onOpenChange(false);
    } else {
      toast.error('Please select a CV');
    }
  };

  const generatePaginationItems = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const items: (number | 'ellipsis')[] = [];
    if (currentPage <= 3) {
      items.push(1, 2, 3, 4, 'ellipsis', totalPages);
    } else if (currentPage >= totalPages - 2) {
      items.push(1, 'ellipsis', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      items.push(1, 'ellipsis', currentPage - 1, currentPage, currentPage + 1, 'ellipsis', totalPages);
    }
    return items;
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="w-[60vw] h-[60vh] overflow-hidden flex flex-col border-border bg-popover/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-foreground">Select CV from Database</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Choose a CV from your saved CVs to use for this service
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-2">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200/40 bg-red-50/50 backdrop-blur p-3 text-xs text-red-600 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full bg-muted" />
              ))}
            </div>
          ) : cvs.length === 0 ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/40 p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <FileX className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-sm font-medium text-foreground">
                No CVs found
              </h3>
              <p className="mt-1 text-center text-xs text-muted-foreground">
                You haven't generated any CVs yet. Generate your first CV in CV Rewriter!
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {cvs.map((cv) => {
                  const scoreImprovement = Math.round(
                    ((cv.final_score - cv.original_score) / cv.original_score) * 100 + 10
                  );
                  const formattedDate = format(new Date(cv.created_at), "MMM dd, yyyy");

                  return (
                    <HoverCard key={cv.id} openDelay={200}>
                      <HoverCardTrigger asChild>
                        <div
                          className={`group cursor-pointer overflow-hidden rounded-xl border transition-all duration-200 ${
                            selectedCVId === cv.id
                              ? 'border-primary bg-primary/5 shadow-md shadow-primary/20'
                              : 'border-border/60 bg-card/80 hover:bg-card hover:shadow-lg hover:shadow-primary/10 hover:border-primary/30'
                          }`}
                          onClick={() => setSelectedCVId(cv.id)}
                        >
                          <div className="p-6 space-y-4 min-h-[140px]">
                            <div className="flex items-start gap-2">
                              <Checkbox
                                checked={selectedCVId === cv.id}
                                onCheckedChange={(checked) => {
                                  setSelectedCVId(checked ? cv.id : null);
                                }}
                                className="mt-0.5"
                                onClick={(e) => e.stopPropagation()}
                              />
                              <h3 className="flex-1 text-base font-semibold text-foreground whitespace-normal break-words group-hover:text-primary transition-colors">
                                {cv.job_title}
                              </h3>
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">
                                {formattedDate}
                              </span>
                              <span className="text-sm font-semibold text-[#05e34f] dark:text-[#04c945]">
                                +{scoreImprovement}% Boost
                              </span>
                            </div>
                          </div>
                        </div>
                      </HoverCardTrigger>
                      <HoverCardContent
                        side="right"
                        align="center"
                        className="w-80 border-border/50 bg-popover/95 backdrop-blur-xl shadow-xl"
                      >
                        <div className="space-y-2">
                          <h4 className="text-xs font-medium text-foreground">
                            Job Description Summary
                          </h4>
                          <p className="text-xs leading-relaxed text-muted-foreground">
                            {cv.jobs_summary}
                          </p>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  );
                })}
              </div>

              {totalPages > 1 && (
                <div className="mt-6">
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
                              onClick={() => handlePageChange(item)}
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
                            currentPage === totalPages
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

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-border"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedCVId}
            className="shadow-lg shadow-primary/25"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Confirm Selection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function CVSelector({ onCVSelect, label = 'Your CV', description = 'Upload your CV or select from database' }: CVSelectorProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'database'>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [selectedCV, setSelectedCV] = useState<CV | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const handleTabChange = (value: string) => {
    const newTab = value as 'upload' | 'database';
    setActiveTab(newTab);
    
    // Reset inputs when switching tabs
    setUploadedFile(null);
    setSelectedCV(null);
    onCVSelect(null);
  };

  const handleFileSelect = (file: File | null) => {
    setUploadedFile(file);
    if (file) {
      onCVSelect({ type: 'file', file });
    } else {
      onCVSelect(null);
    }
  };

  const handleDatabaseCVSelect = (cv: CV) => {
    setSelectedCV(cv);
    onCVSelect({ type: 'database', cv });
    toast.success('CV selected from database');
  };

  const handleRemoveSelectedCV = () => {
    setSelectedCV(null);
    onCVSelect(null);
  };

  return (
    <div className="w-full">
      <label className="text-base font-semibold text-foreground block mb-4">{label}</label>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted/50 backdrop-blur">
          <TabsTrigger 
            value="upload" 
            className="text-xs font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 rounded-md"
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            Upload File
          </TabsTrigger>
          <TabsTrigger 
            value="database" 
            className="text-xs font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 rounded-md"
          >
            <Database className="mr-1.5 h-3.5 w-3.5" />
            From Database
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-3">
          <FileUpload
            onFileSelect={handleFileSelect}
            label=""
            description={description}
          />
        </TabsContent>

        <TabsContent value="database" className="mt-3">
          {!selectedCV ? (
            <div className="w-full">
              <div
                className="relative rounded-xl border-2 border-dashed border-border bg-card/60 hover:border-primary/50 hover:bg-card/80 backdrop-blur-md transition-all duration-200 cursor-pointer"
                onClick={() => setModalOpen(true)}
              >
                <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
                  <div className="mb-3 rounded-full bg-primary/10 p-3">
                    <Database className="h-5 w-5 text-primary" />
                  </div>
                  <p className="mb-1 text-sm font-medium text-foreground">
                    <span className="text-primary">Click to select</span> from your saved CVs
                  </p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
            </div>
          ) : (
            <SelectedDatabaseCV cv={selectedCV} onRemove={handleRemoveSelectedCV} />
          )}
        </TabsContent>
      </Tabs>

      <CVDatabaseModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSelect={handleDatabaseCVSelect}
      />
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut } from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configure PDF.js worker - only in browser
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

interface PDFViewerProps {
  pdfUrl: string | null;
  filename?: string;
}

export function PDFViewer({ pdfUrl, filename = 'enhanced_cv.pdf' }: PDFViewerProps) {
  // All hooks must be called before any conditional returns
  const [isClient, setIsClient] = useState(false);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  // Slightly more zoomed in by default so text is easier to read
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [downloading, setDownloading] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Don't render on server - now safe after all hooks are called
  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-[600px] rounded-xl bg-white/60 dark:bg-neutral-900/60 backdrop-blur-lg border border-neutral-200/50 dark:border-neutral-800/50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900 dark:border-neutral-100"></div>
      </div>
    );
  }

  function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
    setNumPages(numPages);
    setPageNumber(1);
    setLoading(false);
  }

  function onDocumentLoadError(error: Error): void {
    console.error('Error loading PDF:', error);
    setLoading(false);
  }

  const changePage = (offset: number) => {
    setPageNumber((prevPageNumber) => {
      const newPage = prevPageNumber + offset;
      return Math.min(Math.max(1, newPage), numPages);
    });
  };

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 2.5));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));

  // legacy fallback (not used) - prefer fetch->blob for cross-origin downloads

  async function handleDownloadFetch() {
    if (!pdfUrl) return;
    setDownloading(true);

    try {
      // Fetch the file as a blob first so we can trigger a real download
      const res = await fetch(pdfUrl, { mode: 'cors' });
      if (!res.ok) throw new Error(`Failed to download: ${res.status}`);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      // Fallback - direct navigation / open in new tab if fetch fails (CORS or server issue)
      try {
        const link = document.createElement('a');
        link.href = pdfUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (e) {
        console.error('Download failed', e);
      }
    } finally {
      setDownloading(false);
    }
  }

  if (!pdfUrl) {
    return null;
  }

  return (
    <div className="w-full max-w-full space-y-3 overflow-hidden">
      {/* Control bar */}
      <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-white/60 dark:bg-neutral-900/60 backdrop-blur-lg border border-neutral-200/50 dark:border-neutral-800/50">
        {/* Page Navigation */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => changePage(-1)}
            disabled={pageNumber <= 1 || loading}
            className="h-8 w-8 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium min-w-[90px] text-center text-neutral-700 dark:text-neutral-300">
            Page {pageNumber} of {numPages || '—'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => changePage(1)}
            disabled={pageNumber >= numPages || loading}
            className="h-8 w-8 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomOut}
            disabled={scale <= 0.5 || loading}
            className="h-8 w-8 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs font-medium min-w-[50px] text-center text-neutral-700 dark:text-neutral-300">
            {Math.round(scale * 100)}%
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={zoomIn}
            disabled={scale >= 2.5 || loading}
            className="h-8 w-8 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all duration-200"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
        </div>

        {/* Download Button */}
        <Button
          onClick={handleDownloadFetch}
          disabled={loading || downloading}
          className="text-sm font-medium bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-neutral-50 dark:text-neutral-900 shadow-sm transition-all duration-200"
        >
          <Download className="h-3.5 w-3.5 mr-1.5" />
          {downloading ? 'Downloading…' : 'Download'}
        </Button>
      </div>

      {/* PDF Display - Fixed viewport, PDF scales inside independently */}
      <div className="relative w-full h-[calc(100vh-350px)] min-h-[700px] rounded-xl bg-white/60 dark:bg-neutral-900/60 backdrop-blur-lg border border-neutral-200/50 dark:border-neutral-800/50 overflow-auto">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-neutral-900/60 backdrop-blur-lg z-10">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900 dark:border-neutral-100"></div>
          </div>
        )}
        <div className="p-6 w-fit mx-auto">
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="flex items-center justify-center w-full h-[600px]">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-neutral-900 dark:border-neutral-100"></div>
              </div>
            }
            error={
              <div className="flex items-center justify-center w-full h-[600px] text-red-600 dark:text-red-500">
                <p className="text-sm">Failed to load PDF. Please try again.</p>
              </div>
            }
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-sm"
            />
          </Document>
        </div>
      </div>
    </div>
  );
}

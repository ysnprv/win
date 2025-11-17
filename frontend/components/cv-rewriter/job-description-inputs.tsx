'use client';

import { useState } from 'react';
import { FileUpload } from './file-upload';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { X, Plus } from 'lucide-react';

export interface JobDescriptionInput {
  id: string;
  type: 'file' | 'text';
  file?: File;
  text?: string;
}

interface JobDescriptionInputsProps {
  onJobDescriptionsChange: (jobs: JobDescriptionInput[]) => void;
  maxJobs?: number;
}

export function JobDescriptionInputs({
  onJobDescriptionsChange,
  maxJobs = 5,
}: JobDescriptionInputsProps) {
  const [jobInputs, setJobInputs] = useState<JobDescriptionInput[]>([
    { id: '1', type: 'file' },
  ]);

  const addJobInput = () => {
    if (jobInputs.length < maxJobs) {
      const newJob: JobDescriptionInput = {
        id: Date.now().toString(),
        type: 'file',
      };
      const updatedJobs = [...jobInputs, newJob];
      setJobInputs(updatedJobs);
      onJobDescriptionsChange(updatedJobs);
    }
  };

  const removeJobInput = (id: string) => {
    if (jobInputs.length > 1) {
      const updatedJobs = jobInputs.filter((job) => job.id !== id);
      setJobInputs(updatedJobs);
      onJobDescriptionsChange(updatedJobs);
    }
  };

  const updateJobInput = (id: string, updates: Partial<JobDescriptionInput>) => {
    const updatedJobs = jobInputs.map((job) =>
      job.id === id ? { ...job, ...updates } : job
    );
    setJobInputs(updatedJobs);
    onJobDescriptionsChange(updatedJobs);
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Job Descriptions</h3>
          <p className="text-sm text-muted-foreground font-light">
            Add up to {maxJobs} job descriptions ({jobInputs.length}/{maxJobs})
          </p>
        </div>
        {jobInputs.length < maxJobs && (
          <Button
            onClick={addJobInput}
            variant="outline"
            className="text-sm font-medium transition-all duration-200"
          >
            <Plus className="h-4 w-4 mr-1.5" />
            Add Job
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {jobInputs.map((job, index) => (
          <div
            key={job.id}
            className="relative p-5 rounded-xl bg-card/60 backdrop-blur-md border border-border shadow-sm"
          >
            {/* Remove button */}
            {jobInputs.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeJobInput(job.id)}
                className="absolute top-3 right-3 h-8 w-8 hover:bg-red-100 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-500 transition-all duration-200"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {index + 1}
                </div>
                <h4 className="text-sm font-medium text-foreground">Job Description</h4>
              </div>

              <Tabs
                value={job.type}
                onValueChange={(value) =>
                  updateJobInput(job.id, { type: value as 'file' | 'text', file: undefined, text: undefined })
                }
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg">
                  <TabsTrigger value="file" className="text-xs font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 rounded-md">
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger value="text" className="text-xs font-medium data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 rounded-md">
                    Paste Text
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="mt-3">
                  <FileUpload
                    onFileSelect={(file) => updateJobInput(job.id, { file: file || undefined, text: undefined })}
                    label=""
                    description="Upload job description (PDF, DOCX, TXT, or MD, max 10MB)"
                  />
                </TabsContent>

                <TabsContent value="text" className="mt-3">
                  <Textarea
                    placeholder="Paste the job description here..."
                    value={job.text || ''}
                    onChange={(e) => updateJobInput(job.id, { text: e.target.value, file: undefined })}
                    className="min-h-[140px] resize-y bg-card/60 backdrop-blur-md border-border focus:border-primary transition-all duration-200 text-sm"
                  />
                  {job.text && (
                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {job.text.length} characters
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

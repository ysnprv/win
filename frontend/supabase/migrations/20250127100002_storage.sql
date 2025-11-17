-- =====================================================================
-- Migration: Storage Setup
-- Description: Storage buckets and RLS policies for user-uploaded content
-- =====================================================================

-- Clean up existing policies
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;

-- Clean up bucket
DELETE FROM storage.objects WHERE bucket_id = 'avatars';
DELETE FROM storage.buckets WHERE id = 'avatars';

-- =====================================================================
-- CREATE STORAGE BUCKET
-- =====================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'avatars',
    'avatars',
    true, -- Public for avatar URLs
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
);

-- =====================================================================
-- RLS POLICIES FOR STORAGE
-- =====================================================================

-- Allow users to upload their own avatar
-- Path structure: {user_id}/avatar.{ext}
CREATE POLICY "Users can upload own avatar"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

-- Allow users to update their own avatar
CREATE POLICY "Users can update own avatar"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

-- Allow users to delete their own avatar
CREATE POLICY "Users can delete own avatar"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'avatars' AND
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

-- Allow anyone to view avatars (public bucket)
CREATE POLICY "Avatars are publicly accessible"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'avatars');

-- =====================================================================
-- CV PDFS STORAGE BUCKET
-- =====================================================================

-- Clean up existing CV PDFs policies if they exist
DROP POLICY IF EXISTS "Users can upload own CV" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own CV" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own CV" ON storage.objects;

-- Clean up CV PDFs bucket
DELETE FROM storage.objects WHERE bucket_id = 'cv-pdfs';
DELETE FROM storage.buckets WHERE id = 'cv-pdfs';

-- Create public bucket for CV PDFs (RLS still controls access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'cv-pdfs',
    'cv-pdfs',
    true, -- Public bucket - but RLS ensures users can only access their own CVs
    10485760, -- 10MB limit
    ARRAY['application/pdf']::text[]
);

-- =====================================================================
-- RLS POLICIES FOR CV PDFS
-- =====================================================================

-- Allow users to upload their own CVs
-- Path structure: {user_id}/{timestamp}_{cv_id}.pdf
CREATE POLICY "Users can upload own CV"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'cv-pdfs' AND
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

-- Allow users to view only their own CVs
CREATE POLICY "Users can view own CV"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'cv-pdfs' AND
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

-- Allow users to delete their own CVs
CREATE POLICY "Users can delete own CV"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'cv-pdfs' AND
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

-- =====================================================================
-- INTERVIEW PDFS STORAGE BUCKET
-- =====================================================================

-- Clean up existing interview PDFs policies if they exist
DROP POLICY IF EXISTS "Users can upload own interview PDF" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own interview PDF" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own interview PDF" ON storage.objects;

-- Clean up interview PDFs bucket
DELETE FROM storage.objects WHERE bucket_id = 'interview-pdfs';
DELETE FROM storage.buckets WHERE id = 'interview-pdfs';

-- Create public bucket for interview PDFs (RLS still controls access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'interview-pdfs',
    'interview-pdfs',
    true, -- Public bucket - but RLS ensures users can only access their own PDFs
    10485760, -- 10MB limit
    ARRAY['application/pdf']::text[]
);

-- =====================================================================
-- RLS POLICIES FOR INTERVIEW PDFS
-- =====================================================================

-- Allow users to upload their own interview PDFs
-- Path structure: {user_id}/{timestamp}_{interview_id}.pdf
CREATE POLICY "Users can upload own interview PDF"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'interview-pdfs' AND
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

-- Allow users to view only their own interview PDFs
CREATE POLICY "Users can view own interview PDF"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'interview-pdfs' AND
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

-- Allow users to delete their own interview PDFs
CREATE POLICY "Users can delete own interview PDF"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'interview-pdfs' AND
        (storage.foldername(name))[1] = (SELECT auth.uid())::text
    );

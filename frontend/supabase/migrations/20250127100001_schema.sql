-- =====================================================================
-- Migration: Core Schema
-- Description: Core database schema with profiles table, types, and base functions
-- =====================================================================

-- Clean up functions first (they may not exist yet)
DROP FUNCTION IF EXISTS public.update_profile_completion() CASCADE;
DROP FUNCTION IF EXISTS public.calculate_profile_completion(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_last_login() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop table (CASCADE will drop all triggers and policies)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop types
DROP TYPE IF EXISTS subscription_plan CASCADE;

-- =====================================================================
-- TYPES
-- =====================================================================

CREATE TYPE subscription_plan AS ENUM ('Starter', 'Achiever', 'Expert');

-- =====================================================================
-- TABLES
-- =====================================================================

CREATE TABLE public.profiles (
    -- Primary key linked to auth.users
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic info
    name TEXT,
    email TEXT,
    location TEXT,
    birthday DATE,
    avatar_url TEXT,
    
    -- Social links
    linkedin_url TEXT,
    github_url TEXT,
    twitter_url TEXT,
    
    -- Professional info
    targeted_role TEXT,
    organization TEXT,
    
    -- Skills and experience (stored as JSON arrays)
    skills TEXT[],
    experiences TEXT[],
    education TEXT[],
    achievements TEXT[],
    
    -- Subscription info
    subscription subscription_plan DEFAULT 'Starter',
    subscription_end_date TIMESTAMPTZ,
    
    -- Profile metadata
    is_verified BOOLEAN DEFAULT FALSE,
    last_login TIMESTAMPTZ,
    
    -- Account deactivation
    is_deactivated BOOLEAN DEFAULT FALSE,
    deactivated_at TIMESTAMPTZ,
    
    -- Profile completion tracking (for first-time setup)
    profile_completed BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- INDEXES
-- =====================================================================

CREATE INDEX profiles_email_idx ON public.profiles(email);
CREATE INDEX profiles_subscription_idx ON public.profiles(subscription);
CREATE INDEX profiles_deactivated_idx ON public.profiles(is_deactivated, deactivated_at) WHERE is_deactivated = TRUE;

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "profiles_select_own"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (id = (SELECT auth.uid()));

-- Users can insert their own profile
CREATE POLICY "profiles_insert_own"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (id = (SELECT auth.uid()));

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = (SELECT auth.uid()))
    WITH CHECK (id = (SELECT auth.uid()));

-- =====================================================================
-- FUNCTIONS
-- =====================================================================

-- Auto-create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, name, is_verified)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name',
            ''
        ),
        -- OAuth users are auto-verified, email users need verification
        COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE)
    )
    ON CONFLICT (id) DO UPDATE SET
        is_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, FALSE),
        email = NEW.email,
        name = COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name',
            EXCLUDED.name
        );
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't prevent user creation
        RAISE WARNING 'Error creating profile for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$
SET search_path = pg_catalog, public;

-- Update last_login and is_verified when auth.users changes
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
    -- Update last_login when user signs in (last_sign_in_at changes)
    IF NEW.last_sign_in_at IS NOT NULL AND (OLD.last_sign_in_at IS NULL OR NEW.last_sign_in_at > OLD.last_sign_in_at) THEN
        UPDATE public.profiles
        SET last_login = NEW.last_sign_in_at
        WHERE id = NEW.id;
    END IF;
    
    -- Update is_verified when email is confirmed
    IF NEW.email_confirmed_at IS NOT NULL AND OLD.email_confirmed_at IS NULL THEN
        UPDATE public.profiles
        SET is_verified = TRUE
        WHERE id = NEW.id;
    END IF;
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error updating last_login for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$;

-- Cleanup deactivated accounts (30+ days)
CREATE OR REPLACE FUNCTION public.cleanup_deactivated_accounts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
    deleted_count INTEGER := 0;
    user_record RECORD;
BEGIN
    -- Find accounts deactivated for 30+ days
    FOR user_record IN
        SELECT id
        FROM public.profiles
        WHERE is_deactivated = TRUE
            AND deactivated_at IS NOT NULL
            AND deactivated_at < NOW() - INTERVAL '30 days'
    LOOP
        -- Delete user (CASCADE deletes profile)
        DELETE FROM auth.users WHERE id = user_record.id;
        deleted_count := deleted_count + 1;
    END LOOP;
    
    RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.cleanup_deactivated_accounts() IS 
    'Permanently deletes user accounts deactivated for 30+ days. Run via scheduled job.';

-- =====================================================================
-- TRIGGERS
-- =====================================================================

-- Create profile on user signup
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Update updated_at on profile changes
CREATE TRIGGER on_profile_updated
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Update last_login on auth.users changes
CREATE TRIGGER on_auth_user_updated
    AFTER UPDATE ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.update_last_login();

-- =====================================================================
-- GRANTS
-- =====================================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;

-- =====================================================================
-- DATA MIGRATION
-- =====================================================================

-- Update existing profiles to set is_verified correctly based on auth.users
UPDATE public.profiles p
SET is_verified = (
    SELECT COALESCE(u.email_confirmed_at IS NOT NULL, FALSE)
    FROM auth.users u
    WHERE u.id = p.id
);

-- =====================================================================
-- CVS TABLE
-- =====================================================================

-- Drop table if exists
DROP TABLE IF EXISTS public.cvs CASCADE;

-- Create CVs table for storing generated CV documents
CREATE TABLE public.cvs (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key to user
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- CV data
    pdf_url TEXT NOT NULL,
    original_score FLOAT NOT NULL,
    final_score FLOAT NOT NULL,
    job_title TEXT NOT NULL,
    jobs_summary TEXT NOT NULL,
    -- Anonymized CV content (pre-anonymized or enhanced text)
    anonymized_cv_text TEXT,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- INDEXES FOR CVS
-- =====================================================================

CREATE INDEX cvs_user_id_idx ON public.cvs(user_id);
CREATE INDEX cvs_created_at_idx ON public.cvs(created_at DESC);

-- =====================================================================
-- ROW LEVEL SECURITY FOR CVS
-- =====================================================================

ALTER TABLE public.cvs ENABLE ROW LEVEL SECURITY;

-- Users can view their own CVs
CREATE POLICY "cvs_select_own"
    ON public.cvs
    FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- Users can insert their own CVs
CREATE POLICY "cvs_insert_own"
    ON public.cvs
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can delete their own CVs
CREATE POLICY "cvs_delete_own"
    ON public.cvs
    FOR DELETE
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- =====================================================================
-- GRANTS FOR CVS
-- =====================================================================

GRANT SELECT, INSERT, DELETE ON public.cvs TO authenticated;

-- =====================================================================
-- CAREER GUIDES TABLE
-- =====================================================================

-- Drop table if exists
DROP TABLE IF EXISTS public.career_guides CASCADE;

-- Create career guides table for storing AI-generated career guidance
CREATE TABLE public.career_guides (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key to user
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Career guide content (arrays of strings)
    current_strengths TEXT[] NOT NULL,
    readiness_score INTEGER NOT NULL CHECK (readiness_score >= 0 AND readiness_score <= 100),
    skills_to_learn TEXT[] NOT NULL,
    projects_to_work_on TEXT[] NOT NULL,
    soft_skills_to_develop TEXT[] NOT NULL,
    career_roadmap TEXT[] NOT NULL,
    
    -- Context information
    domain TEXT NOT NULL,
    current_job TEXT NOT NULL,
    target_job TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- INDEXES FOR CAREER GUIDES
-- =====================================================================

CREATE INDEX career_guides_user_id_idx ON public.career_guides(user_id);
CREATE INDEX career_guides_domain_idx ON public.career_guides(domain);
CREATE INDEX career_guides_created_at_idx ON public.career_guides(created_at DESC);
CREATE INDEX career_guides_user_created_idx ON public.career_guides(user_id, created_at DESC);

-- =====================================================================
-- ROW LEVEL SECURITY FOR CAREER GUIDES
-- =====================================================================

ALTER TABLE public.career_guides ENABLE ROW LEVEL SECURITY;

-- Users can view their own career guides
CREATE POLICY "career_guides_select_own"
    ON public.career_guides
    FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- Users can insert their own career guides
CREATE POLICY "career_guides_insert_own"
    ON public.career_guides
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can update their own career guides
CREATE POLICY "career_guides_update_own"
    ON public.career_guides
    FOR UPDATE
    TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can delete their own career guides
CREATE POLICY "career_guides_delete_own"
    ON public.career_guides
    FOR DELETE
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- =====================================================================
-- FUNCTIONS FOR CAREER GUIDES
-- =====================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_career_guide_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = pg_catalog, public;

-- =====================================================================
-- TRIGGERS FOR CAREER GUIDES
-- =====================================================================

-- Trigger to update updated_at on row update
CREATE TRIGGER update_career_guides_updated_at
    BEFORE UPDATE ON public.career_guides
    FOR EACH ROW
    EXECUTE FUNCTION public.update_career_guide_updated_at();

-- =====================================================================
-- GRANTS FOR CAREER GUIDES
-- =====================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_guides TO authenticated;

-- =====================================================================
-- INTERVIEWS TABLE
-- =====================================================================

-- Drop table if exists
DROP TABLE IF EXISTS public.interviews CASCADE;

-- Create interviews table for storing virtual interviewer session results
CREATE TABLE public.interviews (
    -- Primary key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign key to user
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Interview metadata
    interviewer_name TEXT NOT NULL,
    interviewer_role TEXT NOT NULL,
    interview_style TEXT NOT NULL,
    difficulty_level TEXT NOT NULL,
    total_exchanges INTEGER NOT NULL,
    
    -- Performance scores
    overall_score FLOAT NOT NULL CHECK (overall_score >= 0 AND overall_score <= 100),
    technical_competency FLOAT NOT NULL CHECK (technical_competency >= 0 AND technical_competency <= 100),
    communication_skills FLOAT NOT NULL CHECK (communication_skills >= 0 AND communication_skills <= 100),
    problem_solving FLOAT NOT NULL CHECK (problem_solving >= 0 AND problem_solving <= 100),
    cultural_fit FLOAT NOT NULL CHECK (cultural_fit >= 0 AND cultural_fit <= 100),
    acceptance_probability FLOAT NOT NULL CHECK (acceptance_probability >= 0 AND acceptance_probability <= 100),
    
    -- Interview analysis
    key_strengths TEXT[] NOT NULL,
    areas_for_improvement TEXT[] NOT NULL,
    recommendations TEXT[] NOT NULL,
    next_steps TEXT[] NOT NULL,
    
    -- PDF report URL
    pdf_url TEXT NOT NULL,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================================
-- INDEXES FOR INTERVIEWS
-- =====================================================================

CREATE INDEX interviews_user_id_idx ON public.interviews(user_id);
CREATE INDEX interviews_created_at_idx ON public.interviews(created_at DESC);
CREATE INDEX interviews_user_created_idx ON public.interviews(user_id, created_at DESC);
CREATE INDEX interviews_overall_score_idx ON public.interviews(overall_score DESC);

-- =====================================================================
-- ROW LEVEL SECURITY FOR INTERVIEWS
-- =====================================================================

ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;

-- Users can view their own interviews
CREATE POLICY "interviews_select_own"
    ON public.interviews
    FOR SELECT
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- Users can insert their own interviews
CREATE POLICY "interviews_insert_own"
    ON public.interviews
    FOR INSERT
    TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can update their own interviews
CREATE POLICY "interviews_update_own"
    ON public.interviews
    FOR UPDATE
    TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

-- Users can delete their own interviews
CREATE POLICY "interviews_delete_own"
    ON public.interviews
    FOR DELETE
    TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- =====================================================================
-- FUNCTIONS FOR INTERVIEWS
-- =====================================================================

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_interview_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = pg_catalog, public;

-- =====================================================================
-- TRIGGERS FOR INTERVIEWS
-- =====================================================================

-- Trigger to update updated_at on row update
CREATE TRIGGER update_interviews_updated_at
    BEFORE UPDATE ON public.interviews
    FOR EACH ROW
    EXECUTE FUNCTION public.update_interview_updated_at();

-- =====================================================================
-- GRANTS FOR INTERVIEWS
-- =====================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.interviews TO authenticated;

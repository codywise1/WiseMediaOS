-- Migration: Upgrade Notes Module
-- Created: 2026-01-04
-- Goal: Support block-based content, advanced filtering, and entity linking

-- 1. Create types for note category and visibility if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'note_category') THEN
        CREATE TYPE note_category AS ENUM ('idea', 'meeting', 'sales_call', 'sop', 'task', 'general');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'note_visibility') THEN
        CREATE TYPE note_visibility AS ENUM ('internal', 'client_visible');
    END IF;
END$$;

-- 2. Update notes table schema
-- We'll use a transaction just in case
BEGIN;

-- Add new columns and rename existing ones if needed
ALTER TABLE public.notes 
ADD COLUMN IF NOT EXISTS "plainText" text,
ADD COLUMN IF NOT EXISTS "category_new" note_category DEFAULT 'general',
ADD COLUMN IF NOT EXISTS "visibility" note_visibility DEFAULT 'internal',
ADD COLUMN IF NOT EXISTS "authorUserId" uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS "clientId" uuid REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS "projectId" uuid REFERENCES public.projects(id),
ADD COLUMN IF NOT EXISTS "meetingId" uuid REFERENCES public.meetings(id),
ADD COLUMN IF NOT EXISTS "proposalId" uuid REFERENCES public.proposals(id),
ADD COLUMN IF NOT EXISTS "invoiceId" uuid REFERENCES public.invoices(id),
ADD COLUMN IF NOT EXISTS "orgId" uuid;

-- Rename is_pinned to pinned if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'is_pinned'
    ) THEN
        ALTER TABLE public.notes RENAME COLUMN is_pinned TO pinned;
    END IF;
END$$;

-- Handle content type change (text -> jsonb)
DO $$
DECLARE
    col_type text;
BEGIN
    SELECT data_type INTO col_type 
    FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'content';
    
    IF col_type = 'text' THEN
        -- Attempt to convert existing content to JSONB paragraph block if it's text
        ALTER TABLE public.notes ALTER COLUMN content TYPE jsonb USING 
            CASE 
                WHEN content IS NULL THEN '[]'::jsonb
                WHEN content ~ '^\[.*\]$' OR content ~ '^\{.*\}$' THEN content::jsonb
                ELSE jsonb_build_array(jsonb_build_object('id', gen_random_uuid(), 'type', 'paragraph', 'content', content))
            END;
    END IF;
END$$;

-- Migrate existing flags if they exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'is_shared_with_client'
    ) THEN
        UPDATE public.notes SET visibility = 'client_visible' WHERE is_shared_with_client = true;
    END IF;
END$$;

-- Migrate existing category if possible
-- Handle mapping from text to enum
UPDATE public.notes SET category_new = 
    CASE 
        WHEN LOWER(category) = 'idea' THEN 'idea'::note_category
        WHEN LOWER(category) = 'meeting' THEN 'meeting'::note_category
        WHEN LOWER(category) = 'sop' THEN 'sop'::note_category
        WHEN LOWER(category) = 'task' THEN 'task'::note_category
        ELSE 'general'::note_category
    END
WHERE category IS NOT NULL;

-- Drop old category if it exists as text and rename the new one
-- First check if "category" is the old text column
DO $$
DECLARE
    col_type text;
BEGIN
    SELECT data_type INTO col_type 
    FROM information_schema.columns 
    WHERE table_name = 'notes' AND column_name = 'category';
    
    IF col_type = 'text' THEN
        ALTER TABLE public.notes DROP COLUMN category;
        ALTER TABLE public.notes RENAME COLUMN category_new TO category;
    END IF;
END$$;

-- Handle clientId/projectId mapping from existing client_id/project_id if they exist
-- IMPORTANT: Only migrate if the referenced entity actually exists to avoid FK violations
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'client_id'
    ) THEN
        UPDATE public.notes 
        SET "clientId" = client_id 
        WHERE "clientId" IS NULL 
        AND client_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = client_id);
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'notes' AND column_name = 'project_id'
    ) THEN
        UPDATE public.notes 
        SET "projectId" = project_id 
        WHERE "projectId" IS NULL
        AND project_id IS NOT NULL
        AND EXISTS (SELECT 1 FROM public.projects WHERE id = project_id);
    END IF;
END$$;

-- 3. Create Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notes_org_id ON public.notes ("orgId");
CREATE INDEX IF NOT EXISTS idx_notes_client_id_new ON public.notes ("clientId");
CREATE INDEX IF NOT EXISTS idx_notes_project_id_new ON public.notes ("projectId");
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON public.notes (updated_at);
CREATE INDEX IF NOT EXISTS idx_notes_category ON public.notes (category);
CREATE INDEX IF NOT EXISTS idx_notes_visibility ON public.notes (visibility);
CREATE INDEX IF NOT EXISTS idx_notes_pinned ON public.notes (pinned);

-- 4. Audit logging table
CREATE TABLE IF NOT EXISTS public.note_audit_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    note_id uuid REFERENCES public.notes(id) ON DELETE CASCADE,
    actor_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.note_audit_log ENABLE ROW LEVEL SECURITY;

-- Policies for audit log
CREATE POLICY "Admins and staff can view audit logs"
    ON public.note_audit_log FOR SELECT TO authenticated
    USING (
        (auth.jwt()->>'email' = 'icodywise@gmail.com') OR
        ((auth.jwt()->'user_metadata'->>'role') IN ('admin','staff'))
    );

-- Update Note RLS Policies
-- Revoke old ones first
DROP POLICY IF EXISTS "Admins and staff can read notes" ON public.notes;
DROP POLICY IF EXISTS "Admins and staff can write notes" ON public.notes;
DROP POLICY IF EXISTS "Clients can read shared notes" ON public.notes;

-- New Policies
CREATE POLICY "Admins and staff can read all notes"
  ON public.notes FOR SELECT TO authenticated
  USING (
    (auth.jwt()->>'email' = 'icodywise@gmail.com') OR
    ((auth.jwt()->'user_metadata'->>'role') IN ('admin','staff'))
  );

CREATE POLICY "Admins and staff can manage all notes"
  ON public.notes FOR ALL TO authenticated
  USING (
    (auth.jwt()->>'email' = 'icodywise@gmail.com') OR
    ((auth.jwt()->'user_metadata'->>'role') IN ('admin','staff'))
  )
  WITH CHECK (
    (auth.jwt()->>'email' = 'icodywise@gmail.com') OR
    ((auth.jwt()->'user_metadata'->>'role') IN ('admin','staff'))
  );

CREATE POLICY "Clients can read shared notes for their account"
  ON public.notes FOR SELECT TO authenticated
  USING (
    "clientId" = (SELECT id FROM public.clients WHERE email = auth.jwt()->>'email' LIMIT 1)
    AND visibility = 'client_visible'
  );

COMMIT;

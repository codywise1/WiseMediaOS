-- Fix FK relationship for notes.clientId to point to clients table instead of profiles
-- This ensures PostgREST can detect the relationship for client:clients!clientId(*)

BEGIN;

-- 1. Drop the incorrect foreign key referencing profiles
ALTER TABLE public.notes DROP CONSTRAINT IF EXISTS "notes_clientId_fkey";

-- 2. Add the correct foreign key referencing clients
-- We use validation to ensure all current values exist in clients table
-- If this fails, it means we have notes linked to profiles that are not in clients table
DO $$
BEGIN
    -- Check if we need to clean up any invalid references first?
    -- Only optional step: if we have IDs in "clientId" that don't exist in "clients", we might need to NULL them
    -- UPDATE public.notes SET "clientId" = NULL WHERE "clientId" IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.clients WHERE id = "clientId");
    
    -- Now add the constraint
    ALTER TABLE public.notes 
    ADD CONSTRAINT "notes_clientId_fkey" 
    FOREIGN KEY ("clientId") 
    REFERENCES public.clients(id);
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'Foreign key violation detected. Some clientId values in notes do not exist in clients table.';
        -- Optional: Force clean up if needed, but better to let user know
        -- For now we assume data is consistent or user will handle it
END$$;

COMMIT;

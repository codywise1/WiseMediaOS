-- Fix RLS policy for note_audit_log to allow INSERTs
-- Previously only had a SELECT policy, causing 403s on log creation

BEGIN;

CREATE POLICY "Admins and staff can insert audit logs"
    ON public.note_audit_log FOR INSERT TO authenticated
    WITH CHECK (
        -- User can only log their own actions
        auth.uid() = actor_id AND
        (
            -- Check for admin/staff role
            (auth.jwt()->>'email' = 'icodywise@gmail.com') OR
            ((auth.jwt()->'user_metadata'->>'role') IN ('admin','staff'))
        )
    );

COMMIT;

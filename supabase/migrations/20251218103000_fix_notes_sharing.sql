ALTER TABLE public.notes
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS is_shared_with_client boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_shared_with_admin boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS related_meeting text;

ALTER TABLE public.notes
  ALTER COLUMN is_shared_with_client SET DEFAULT false;

ALTER TABLE public.notes
  ALTER COLUMN is_shared_with_admin SET DEFAULT false;

-- Backfill created_by from admin_id if present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'notes'
      AND column_name = 'admin_id'
  ) THEN
    UPDATE public.notes
    SET created_by = COALESCE(created_by, admin_id)
    WHERE created_by IS NULL;
  END IF;
END $$;

ALTER TABLE public.notes
  ALTER COLUMN created_by SET DEFAULT auth.uid();

-- Replace note policies so clients can read shared notes.
DROP POLICY IF EXISTS "Only admins can view notes" ON public.notes;
DROP POLICY IF EXISTS "Only admins can create notes" ON public.notes;
DROP POLICY IF EXISTS "Only admins can update own notes" ON public.notes;
DROP POLICY IF EXISTS "Only admins can delete own notes" ON public.notes;

DROP POLICY IF EXISTS "Admins and staff can read notes" ON public.notes;
DROP POLICY IF EXISTS "Admins and staff can write notes" ON public.notes;
DROP POLICY IF EXISTS "Clients can read shared notes" ON public.notes;

CREATE POLICY "Admins and staff can read notes"
  ON public.notes FOR SELECT TO authenticated
  USING (
    (auth.jwt()->>'email' = 'icodywise@gmail.com') OR
    ((auth.jwt()->'user_metadata'->>'role') IN ('admin','staff'))
  );

CREATE POLICY "Admins and staff can write notes"
  ON public.notes FOR ALL TO authenticated
  USING (
    (auth.jwt()->>'email' = 'icodywise@gmail.com') OR
    ((auth.jwt()->'user_metadata'->>'role') IN ('admin','staff'))
  )
  WITH CHECK (
    (auth.jwt()->>'email' = 'icodywise@gmail.com') OR
    ((auth.jwt()->'user_metadata'->>'role') IN ('admin','staff'))
  );

CREATE POLICY "Clients can read shared notes"
  ON public.notes FOR SELECT TO authenticated
  USING (
    client_id = public.get_user_client_id()
    AND is_shared_with_client = true
  );

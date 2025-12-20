/*
  # Add Documents Storage + Metadata

  - Creates private Storage bucket: documents
  - Creates table: documents (metadata)
  - Adds RLS policies for admin/staff
  - Adds Storage policies for admin/staff on bucket documents
*/

-- Helper function: admin or staff
CREATE OR REPLACE FUNCTION is_staff_or_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (
    is_admin()
    OR (auth.jwt()->'user_metadata'->>'role') = 'staff'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Documents metadata table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text NOT NULL DEFAULT 'documents',
  path text NOT NULL UNIQUE,
  filename text NOT NULL,
  content_type text,
  size_bytes bigint,
  owner_team text,
  status text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for documents table (admin/staff only)
DROP POLICY IF EXISTS "Staff/Admin can read documents" ON documents;
DROP POLICY IF EXISTS "Staff/Admin can insert documents" ON documents;
DROP POLICY IF EXISTS "Staff/Admin can update documents" ON documents;
DROP POLICY IF EXISTS "Staff/Admin can delete documents" ON documents;

CREATE POLICY "Staff/Admin can read documents"
  ON documents FOR SELECT
  TO authenticated
  USING (is_staff_or_admin());

CREATE POLICY "Staff/Admin can insert documents"
  ON documents FOR INSERT
  TO authenticated
  WITH CHECK (is_staff_or_admin());

CREATE POLICY "Staff/Admin can update documents"
  ON documents FOR UPDATE
  TO authenticated
  USING (is_staff_or_admin())
  WITH CHECK (is_staff_or_admin());

CREATE POLICY "Staff/Admin can delete documents"
  ON documents FOR DELETE
  TO authenticated
  USING (is_staff_or_admin());

-- Storage policies for bucket documents (admin/staff only)
-- Note: storage.objects already has RLS enabled in Supabase.
DROP POLICY IF EXISTS "Staff/Admin can read documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Staff/Admin can upload documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Staff/Admin can update documents bucket" ON storage.objects;
DROP POLICY IF EXISTS "Staff/Admin can delete documents bucket" ON storage.objects;

CREATE POLICY "Staff/Admin can read documents bucket"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents' AND is_staff_or_admin());

CREATE POLICY "Staff/Admin can upload documents bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents' AND is_staff_or_admin());

CREATE POLICY "Staff/Admin can update documents bucket"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documents' AND is_staff_or_admin())
  WITH CHECK (bucket_id = 'documents' AND is_staff_or_admin());

CREATE POLICY "Staff/Admin can delete documents bucket"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'documents' AND is_staff_or_admin());

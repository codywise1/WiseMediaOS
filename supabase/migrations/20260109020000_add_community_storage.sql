-- Create a public bucket for community posts
INSERT INTO storage.buckets (id, name, public)
VALUES ('community', 'community', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the 'community' bucket

-- 1. Anyone (authenticated) can view files
CREATE POLICY "Anyone can view community files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'community');

-- 2. Anyone (authenticated) can upload files
CREATE POLICY "Authenticated users can upload community files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'community');

-- 3. Users can delete their own files
CREATE POLICY "Users can delete own community files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'community' AND auth.uid() = owner);

-- 4. Admins can delete any file
CREATE POLICY "Admins can delete any community file"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'community' AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

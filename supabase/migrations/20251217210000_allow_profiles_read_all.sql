DROP POLICY IF EXISTS "Anyone authenticated can view profiles" ON public.profiles;

CREATE POLICY "Anyone authenticated can view profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

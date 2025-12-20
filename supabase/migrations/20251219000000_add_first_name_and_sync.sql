-- Function to sync clients.name to profiles.full_name
CREATE OR REPLACE FUNCTION public.sync_client_name_to_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update profile with matching email
  UPDATE public.profiles
  SET 
    full_name = NEW.name,
    updated_at = now()
  WHERE email = NEW.email;
  
  RETURN NEW;
END;
$$;

-- Create trigger on clients table (update or insert)
DROP TRIGGER IF EXISTS on_client_name_update ON public.clients;
CREATE TRIGGER on_client_name_update
  AFTER INSERT OR UPDATE OF name, email
  ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_client_name_to_profile();

-- Initial backfill: Update existing profiles based on existing clients
UPDATE public.profiles p
SET 
  full_name = c.name
FROM public.clients c
WHERE p.email = c.email;

/*
  # Add Profile Auto-Creation and Admin Setup

  ## Changes
  1. Create trigger function to automatically create profile when user signs up
  2. Set info@wisemedia.io as admin if it exists
  3. Handle profile creation on auth.users insert

  ## Security
  - Trigger runs with security definer privileges
  - Automatically assigns admin role to info@wisemedia.io
  - All other users get 'free' role by default
*/

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  user_role text;
BEGIN
  -- Check if email is admin email
  IF lower(NEW.email) = 'info@wisemedia.io' THEN
    user_role := 'admin';
  ELSE
    user_role := 'free';
  END IF;

  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    user_role
  );

  RETURN NEW;
END;
$$;

-- Create trigger for new user signups
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Update existing info@wisemedia.io to admin if exists
UPDATE public.profiles
SET role = 'admin'
WHERE lower(email) = 'info@wisemedia.io';
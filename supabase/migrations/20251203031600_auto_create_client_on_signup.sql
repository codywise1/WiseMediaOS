/*
  # Auto-Create Client Record on User Signup

  ## Overview
  This migration automatically creates a client record when a new user signs up.
  This ensures that every user account has a corresponding client profile.

  ## Changes Made

  1. **Trigger Function**
     - Creates a client record automatically when a user signs up
     - Uses user metadata (name, phone, email) to populate client record
     - Sets default status to 'active'
     - Only creates client for non-admin users

  2. **Trigger**
     - Fires after user insert in auth.users
     - Automatically handled by Supabase auth system

  ## Benefits
  - Seamless user onboarding
  - No manual client creation needed
  - User data syncs to client database automatically
*/

-- Function to create client record on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create client record for non-admin users
  IF NEW.raw_user_meta_data->>'role' != 'admin' THEN
    INSERT INTO public.clients (
      id,
      name,
      email,
      phone,
      status,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
      NEW.email,
      NEW.raw_user_meta_data->>'phone',
      'active',
      NOW(),
      NOW()
    )
    ON CONFLICT (email) DO UPDATE
    SET
      name = COALESCE(EXCLUDED.name, clients.name),
      phone = COALESCE(EXCLUDED.phone, clients.phone),
      updated_at = NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
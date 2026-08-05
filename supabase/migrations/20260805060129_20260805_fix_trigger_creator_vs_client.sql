-- Fix handle_new_user trigger:
-- Only insert into clients when role = 'user' (admin-created client accounts).
-- Creator Club signups (free/pro/elite) and admin signups are excluded.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'user');

  -- Only create a client record for explicitly admin-created client accounts
  IF v_role = 'user' THEN
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

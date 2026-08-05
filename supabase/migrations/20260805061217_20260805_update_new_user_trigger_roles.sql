-- Updated trigger: self-signups → member, admin-provisioned accounts → client
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'member');

  -- Normalize legacy role values
  IF v_role IN ('free', 'pro', 'elite', 'staff') THEN
    v_role := 'member';
  ELSIF v_role = 'user' THEN
    v_role := 'client';
  END IF;

  -- Insert or update profile
  INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', SPLIT_PART(NEW.email, '@', 1)),
    v_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email      = EXCLUDED.email,
    full_name  = COALESCE(EXCLUDED.full_name, profiles.full_name),
    role       = EXCLUDED.role,
    updated_at = NOW();

  -- Only create a clients record for admin-provisioned client accounts
  IF v_role = 'client' THEN
    INSERT INTO public.clients (id, name, email, phone, status, created_at, updated_at)
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
      name       = COALESCE(EXCLUDED.name, clients.name),
      phone      = COALESCE(EXCLUDED.phone, clients.phone),
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

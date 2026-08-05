-- Step 1: Drop any existing role check constraint first
DO $$
BEGIN
  ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Step 2: Migrate old role values to new 3-role system
-- member = Creator Club (was free/pro/elite/staff)
UPDATE public.profiles
SET role = 'member'
WHERE role IN ('free', 'pro', 'elite', 'staff');

-- client = Agency clients (was user)
UPDATE public.profiles
SET role = 'client'
WHERE role = 'user';

-- Step 3: Add new constraint with only 3 valid roles
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'member', 'client'));

-- Step 4: Mirror into auth.users metadata (best-effort)
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"member"')
WHERE raw_user_meta_data->>'role' IN ('free', 'pro', 'elite', 'staff');

UPDATE auth.users
SET raw_user_meta_data = jsonb_set(raw_user_meta_data, '{role}', '"client"')
WHERE raw_user_meta_data->>'role' = 'user';

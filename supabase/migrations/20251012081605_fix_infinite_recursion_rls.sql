/*
  # Fix Infinite Recursion in RLS Policies

  ## Problem
  The admin RLS policies were causing infinite recursion by querying the profiles table
  within a policy that's applied to the profiles table itself.

  ## Solution
  Remove the recursive admin policies and rely on the simpler user-level policies.
  Admin functionality can be handled at the application level instead of through RLS.

  ## Changes
  - Drop the problematic admin policies that check role in a subquery
  - Keep the simple policies that allow users to read/update their own profiles
*/

-- Drop the recursive admin policies
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- The remaining policies are:
-- 1. "Anyone authenticated can view own profile" - allows users to read their own profile
-- 2. "Anyone authenticated can update own profile" - allows users to update their own profile
-- 3. "Anyone authenticated can insert own profile" - allows profile creation

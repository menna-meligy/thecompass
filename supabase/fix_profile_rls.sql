-- ============================================================
-- FIX PROFILE RLS POLICIES
-- Adds policies to allow service role and authenticated users
-- to properly access profiles needed for bookings
-- ============================================================

-- Allow authenticated users to insert their own profile if it doesn't exist
-- (This is already in schema.sql but we're being explicit)
DROP POLICY IF EXISTS "Allow profile creation on signup" ON public.profiles;
CREATE POLICY "Allow profile creation on signup" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow service role to bypass RLS and manage profiles
-- (Service role key bypasses RLS, but we're being explicit for clarity)
DROP POLICY IF EXISTS "Service role can manage profiles" ON public.profiles;
CREATE POLICY "Service role can manage profiles" ON public.profiles
  FOR ALL USING (auth.role() = 'service_role');

-- Verify no users are missing profiles
SELECT
  COUNT(*) as users_without_profiles
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
);

-- Check profile count
SELECT
  'auth.users' as table_name,
  COUNT(*) as record_count
FROM auth.users
UNION ALL
SELECT
  'public.profiles' as table_name,
  COUNT(*) as record_count
FROM public.profiles;

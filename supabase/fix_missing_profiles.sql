-- ============================================================
-- FIX MISSING PROFILES MIGRATION
-- Ensures all auth.users have corresponding profiles in public.profiles
-- This permanently fixes the foreign key constraint error
-- ============================================================

-- 1. Create profiles for ALL auth.users that don't have one yet
INSERT INTO public.profiles (id, email, role)
SELECT
  au.id,
  au.email,
  'user'
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO NOTHING;

-- 2. Create roadmap_progress for any users that don't have one
INSERT INTO public.roadmap_progress (user_id)
SELECT p.id
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.roadmap_progress rp WHERE rp.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- 3. Verify the fix worked
SELECT
  'Profiles without auth match' as issue,
  COUNT(*) as count
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users au WHERE au.id = p.id
)
UNION ALL
SELECT
  'Auth users without profiles' as issue,
  COUNT(*) as count
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles p WHERE p.id = au.id
);

-- 4. Verify trigger is in place and working
-- The handle_new_user() trigger should already exist from schema.sql
-- If it doesn't, recreate it:
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile if it doesn't already exist
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  )
  ON CONFLICT (id) DO NOTHING;

  -- Create roadmap progress if it doesn't already exist
  INSERT INTO public.roadmap_progress (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Make sure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

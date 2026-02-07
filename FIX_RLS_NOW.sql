-- ============================================
-- FIX RLS PERMISSION DENIED - RUN THIS NOW
-- ============================================
-- Copy this entire file and run in Supabase Dashboard:
-- https://supabase.com/dashboard/project/igsmyoghkkyetsyqbqlm/sql/new

-- Step 1: Disable RLS on both tables
ALTER TABLE IF EXISTS dua_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_metadata DISABLE ROW LEVEL SECURITY;

-- Step 2: Verify RLS is disabled (should show rowsecurity = false)
SELECT 
  tablename, 
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('dua_requests', 'user_metadata');

-- Expected result:
-- tablename      | RLS Enabled
-- --------------|-------------
-- dua_requests  | false
-- user_metadata | false

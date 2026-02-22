-- Temporarily disable RLS for App Store release
-- This ensures Edge Functions can access tables without permission issues
-- Run this SQL directly in Supabase Dashboard: https://supabase.com/dashboard/project/igsmyoghkkyetsyqbqlm/sql/new

ALTER TABLE IF EXISTS dua_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_metadata DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('dua_requests', 'user_metadata');

-- Note: This is a temporary fix for App Store release
-- After release, we should re-enable RLS with proper service role policies

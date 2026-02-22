-- Fix RLS for dua_requests to allow service role access
-- Service role bypasses RLS automatically, but blocking policies can cause issues
-- Remove blocking policies that prevent Edge Functions from accessing the table

-- Drop the blocking policies that prevent all access
DROP POLICY IF EXISTS "Dua requests blocked for anon" ON dua_requests;
DROP POLICY IF EXISTS "User metadata blocked for anon" ON user_metadata;

-- Note: Service role (used by Edge Functions) bypasses RLS automatically
-- These blocking policies were unnecessary and could interfere with Edge Function access
-- Edge Functions using service_role key will have full access to the table

-- Keep RLS enabled for security, but allow service role to bypass it
-- Client-side access should go through Edge Functions (dua-client, dua-admin) which use service role

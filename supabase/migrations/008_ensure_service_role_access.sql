-- Ensure service role can access dua_requests and user_metadata
-- This is a backup fix in case Supabase client library still has RLS issues
-- Service role should bypass RLS automatically, but explicit policies ensure compatibility

-- Drop any remaining blocking policies
DROP POLICY IF EXISTS "Dua requests blocked for anon" ON dua_requests;
DROP POLICY IF EXISTS "User metadata blocked for anon" ON user_metadata;

-- Note: With Supabase client library using service role key, RLS should be bypassed automatically
-- These explicit policies are only needed if REST API is still used somewhere
-- The client library approach in dua-client/index.ts should handle this correctly

-- If RLS is still blocking, uncomment the following to temporarily disable RLS (less secure):
-- ALTER TABLE dua_requests DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_metadata DISABLE ROW LEVEL SECURITY;

-- Alternative: Add explicit service role policies (if needed)
-- CREATE POLICY IF NOT EXISTS "Service role can access dua_requests"
--   ON dua_requests FOR ALL
--   USING (
--     (current_setting('request.jwt.claims', true)::json->>'role')::text = 'service_role'
--   )
--   WITH CHECK (
--     (current_setting('request.jwt.claims', true)::json->>'role')::text = 'service_role'
--   );

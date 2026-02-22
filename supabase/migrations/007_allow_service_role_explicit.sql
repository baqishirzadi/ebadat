-- Fix: Allow service role to access tables via REST API
-- Service role should bypass RLS, but when using REST API with policies, we need explicit allow

-- The issue: Existing policies check auth.uid() which doesn't exist for service role
-- Solution: Add policies that allow when JWT role is 'service_role'

-- For dua_requests: Allow service role (Edge Functions use service role)
DROP POLICY IF EXISTS "Service role can access dua_requests" ON dua_requests;
CREATE POLICY "Service role can access dua_requests"
  ON dua_requests
  FOR ALL
  USING (
    -- Check if the request is from service role
    -- Supabase sets this in JWT claims when Authorization header has service_role key
    (current_setting('request.jwt.claims', true)::json->>'role')::text = 'service_role'
  )
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::json->>'role')::text = 'service_role'
  );

-- For user_metadata: Allow service role
DROP POLICY IF EXISTS "Service role can access user_metadata" ON user_metadata;
CREATE POLICY "Service role can access user_metadata"
  ON user_metadata
  FOR ALL
  USING (
    (current_setting('request.jwt.claims', true)::json->>'role')::text = 'service_role'
  )
  WITH CHECK (
    (current_setting('request.jwt.claims', true)::json->>'role')::text = 'service_role'
  );

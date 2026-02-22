-- Secure RLS for Dua Requests using Edge Functions (service role)

-- Ensure RLS is enabled
ALTER TABLE IF EXISTS dua_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_metadata ENABLE ROW LEVEL SECURITY;

-- Drop permissive policies from initial setup
DROP POLICY IF EXISTS "Users can view own dua requests" ON dua_requests;
DROP POLICY IF EXISTS "Users can insert own dua requests" ON dua_requests;
DROP POLICY IF EXISTS "Users can update own pending requests" ON dua_requests;
DROP POLICY IF EXISTS "Users can manage own metadata" ON user_metadata;

-- Deny all access from anon/client role (service role bypasses RLS)
CREATE POLICY "Dua requests blocked for anon"
  ON dua_requests
  FOR ALL
  USING (false)
  WITH CHECK (false);

CREATE POLICY "User metadata blocked for anon"
  ON user_metadata
  FOR ALL
  USING (false)
  WITH CHECK (false);

-- Secure RLS policies for dua_requests and user_metadata
-- Requires Supabase Auth (auth.uid()) to be enabled in the app.
-- Admin access is granted to users whose auth UID exists in admin_users.id and is_active = true.

-- Ensure RLS is enabled
ALTER TABLE dua_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metadata ENABLE ROW LEVEL SECURITY;

-- Drop permissive policies if they exist
DROP POLICY IF EXISTS "Users can view own dua requests" ON dua_requests;
DROP POLICY IF EXISTS "Users can insert own dua requests" ON dua_requests;
DROP POLICY IF EXISTS "Users can update own pending requests" ON dua_requests;
DROP POLICY IF EXISTS "Users can manage own metadata" ON user_metadata;

-- User policies (authenticated)
CREATE POLICY "Users can read own requests"
  ON dua_requests FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own requests"
  ON dua_requests FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own pending requests"
  ON dua_requests FOR UPDATE
  USING (auth.uid()::text = user_id AND status = 'pending');

CREATE POLICY "Users can manage own metadata"
  ON user_metadata FOR ALL
  USING (auth.uid()::text = user_id);

-- Admin policies (authenticated admin users)
CREATE POLICY "Admins can read all requests"
  ON dua_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM admin_users
      WHERE admin_users.id::text = auth.uid()::text
        AND admin_users.is_active = true
    )
  );

CREATE POLICY "Admins can update requests"
  ON dua_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM admin_users
      WHERE admin_users.id::text = auth.uid()::text
        AND admin_users.is_active = true
    )
  );

-- Note:
-- To use these policies, ensure your app authenticates users with Supabase Auth.
-- For admin access, insert the admin user's auth UID into admin_users.id
-- and set is_active = true.

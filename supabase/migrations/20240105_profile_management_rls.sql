-- 1. Correct Niroz's profile: Set name and ensure Admin role
-- Ensure we target the correct user by email through auth.users join
UPDATE profiles 
SET full_name = 'Niroz', 
    role = 'admin' 
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'asniroz@gmail.com'
);

-- 2. New RLS Policies for Profiles
-- Allow admins to see and manage all profiles in their own family

-- Admins can update any profile in their family
CREATE POLICY "Admins can update family member profiles" ON profiles
  FOR UPDATE USING (
    family_id IN (
      SELECT family_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can delete any profile in their family (except themselves, handled by logic or RLS)
CREATE POLICY "Admins can delete family member profiles" ON profiles
  FOR DELETE USING (
    family_id IN (
      SELECT family_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    ) AND id != auth.uid()
  );

-- 3. Update Existing Invite Codes Policy
-- The previous policy might be restrictive if the family_id is null on new invites
-- Ensuring admins can manage invite codes for their family
DROP POLICY IF EXISTS "Admins can manage invite codes" ON invite_codes;
CREATE POLICY "Admins can manage invite codes" ON invite_codes
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Refresh Cache
NOTIFY pgrst, 'reload schema';

-- FIXED RLS FOR EVENTS (INSERT + UPDATE + DELETE)
-- Run this in the Supabase SQL Editor to fix "new row violates row-level security policy" errors.

-- 1. Ensure RLS is active
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 2. Clear old policies to avoid conflicts
DROP POLICY IF EXISTS "Users can insert events" ON events;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON events;
DROP POLICY IF EXISTS "Allow insert for family members" ON events;
DROP POLICY IF EXISTS "Allow update for creators and admins" ON events;
DROP POLICY IF EXISTS "Allow delete for creators and admins" ON events;

-- 3. INSERT POLICY (The Missing Piece)
-- Only allow inserting if the user belongs to the family_id they are inserting for.
CREATE POLICY "Allow insert for family members"
ON events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.family_id = events.family_id
  )
);

-- 4. UPDATE POLICY (Re-applying the fix)
CREATE POLICY "Allow update for creators and admins"
ON events FOR UPDATE
USING (
  auth.uid() = created_by
  OR 
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.family_id = events.family_id
  )
);

-- 5. DELETE POLICY
CREATE POLICY "Allow delete for creators and admins"
ON events FOR DELETE
USING (
  auth.uid() = created_by
  OR 
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.family_id = events.family_id
  )
);

-- 6. READ POLICY (Ensure everyone can see events)
DROP POLICY IF EXISTS "Enable read access for all users" ON events;
CREATE POLICY "Allow read for family members"
ON events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.family_id = events.family_id
  )
);

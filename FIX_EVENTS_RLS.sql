-- RLS SECURITY FIX FOR EVENTS
-- Run this script in the Supabase SQL Editor to allow Admins to update any event.

-- 1. Ensure RLS is enabled on the events table
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 2. Drop potentially conflicting policies
DROP POLICY IF EXISTS "Users can update their own events" ON events;
DROP POLICY IF EXISTS "Admins can update all events" ON events;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON events;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON events;

-- 3. Create the new permissive policy for Updates
-- This allows a user to UPDATE an event if:
--   a) They created it (auth.uid() == created_by)
--   b) OR they are an Admin in the same family group
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
)
WITH CHECK (
  auth.uid() = created_by
  OR 
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
    AND profiles.family_id = events.family_id
  )
);

-- 4. Create similar policy for Deletes
DROP POLICY IF EXISTS "Users can delete their own events" ON events;
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

-- 5. Helper: Ensure created_by is auto-filled if missing (for future inserts)
CREATE OR REPLACE FUNCTION public.handle_new_event() 
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.created_by IS NULL THEN
    NEW.created_by := auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_event_created ON events;
CREATE TRIGGER on_event_created
  BEFORE INSERT ON events
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_event();

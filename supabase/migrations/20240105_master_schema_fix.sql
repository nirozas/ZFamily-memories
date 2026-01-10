-- MASTER SCHEMA FIX & STORAGE SETUP
-- Run this in the Supabase SQL Editor to resolve "column not found" errors

-- 1. Update events table
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS participants TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS content JSONB DEFAULT '{"assets": []}';

-- 2. Update albums table
ALTER TABLE albums 
ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';

-- 3. Ensure Storage Buckets exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-assets', 'event-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('album-assets', 'album-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS Policies (Fix for image uploads)
-- Drop existing to avoid conflicts then recreate
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Auth Upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth Update" ON storage.objects;
DROP POLICY IF EXISTS "Auth Delete" ON storage.objects;

-- Event & Album Assets Policies
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id IN ('event-assets', 'album-assets'));
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('event-assets', 'album-assets') AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING (bucket_id IN ('event-assets', 'album-assets') AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING (bucket_id IN ('event-assets', 'album-assets') AND auth.role() = 'authenticated');

-- 5. Force schema cache refresh (PostgREST hack)
NOTIFY pgrst, 'reload schema';

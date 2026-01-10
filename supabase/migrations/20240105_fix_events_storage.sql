-- 1. Add content column to events if missing
ALTER TABLE events ADD COLUMN IF NOT EXISTS content JSONB DEFAULT '{"assets": []}';

-- 2. Create storage buckets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-assets', 'event-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('album-assets', 'album-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage RLS Policies
-- Event Assets
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'event-assets');
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'event-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING (bucket_id = 'event-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING (bucket_id = 'event-assets' AND auth.role() = 'authenticated');

-- Album Assets
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'album-assets');
CREATE POLICY "Auth Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'album-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE USING (bucket_id = 'album-assets' AND auth.role() = 'authenticated');
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING (bucket_id = 'album-assets' AND auth.role() = 'authenticated');

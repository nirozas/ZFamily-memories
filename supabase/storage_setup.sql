-- Create storage buckets for assets
INSERT INTO storage.buckets (id, name, public) 
VALUES ('event-assets', 'event-assets', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('album-assets', 'album-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for 'event-assets' bucket
-- Allow public to read files
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'event-assets');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated Upload" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'event-assets');

-- Allow authenticated users to update/delete their own files (simplification for beta)
CREATE POLICY "Authenticated Update" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'event-assets');

CREATE POLICY "Authenticated Delete" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'event-assets');

-- Set up RLS policies for 'album-assets' bucket
-- Allow public to read files
CREATE POLICY "Public Access Album" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'album-assets');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated Upload Album" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'album-assets');

-- Allow authenticated users to update/delete their own files (simplification for beta)
CREATE POLICY "Authenticated Update Album" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'album-assets');

CREATE POLICY "Authenticated Delete Album" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'album-assets');

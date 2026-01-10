-- Migration to add missing columns to family_media
ALTER TABLE family_media ADD COLUMN IF NOT EXISTS folder TEXT DEFAULT '/';
ALTER TABLE family_media ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Ensure RLS is enabled and allows authenticated read
ALTER TABLE family_media ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for family_media') THEN
        CREATE POLICY "Public read access for family_media" ON family_media
            FOR SELECT USING (true);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated insert for family_media') THEN
        CREATE POLICY "Authenticated insert for family_media" ON family_media
            FOR INSERT WITH CHECK (auth.role() = 'authenticated');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Owner update for family_media') THEN
        CREATE POLICY "Owner update for family_media" ON family_media
            FOR UPDATE USING (auth.uid() = uploaded_by);
    END IF;
END $$;

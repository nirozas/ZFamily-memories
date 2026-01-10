-- Migration to add country support to events and albums
ALTER TABLE events ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS country TEXT;

-- Index for performance on country lookups
CREATE INDEX IF NOT EXISTS idx_events_country ON events (family_id, country) WHERE country IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_albums_country ON albums (family_id, country) WHERE country IS NOT NULL;

-- Notify internal schema cache
NOTIFY pgrst, 'reload schema';

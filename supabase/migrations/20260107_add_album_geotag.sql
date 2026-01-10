-- Migration to add location support to albums
ALTER TABLE albums ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE albums ADD COLUMN IF NOT EXISTS geotag JSONB; -- {lat: number, lng: number}

-- Index for performance on family_id and geotag lookups
CREATE INDEX IF NOT EXISTS idx_albums_geotag ON albums (family_id) WHERE geotag IS NOT NULL;

-- Notify internal schema cache
NOTIFY pgrst, 'reload schema';

-- Add hashtags and participants
ALTER TABLE events ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';
ALTER TABLE events ADD COLUMN IF NOT EXISTS participants TEXT[] DEFAULT '{}';
ALTER TABLE albums ADD COLUMN IF NOT EXISTS hashtags TEXT[] DEFAULT '{}';

-- Create indexes for hashtag search performance
CREATE INDEX IF NOT EXISTS idx_events_hashtags ON events USING GIN (hashtags);
CREATE INDEX IF NOT EXISTS idx_albums_hashtags ON albums USING GIN (hashtags);

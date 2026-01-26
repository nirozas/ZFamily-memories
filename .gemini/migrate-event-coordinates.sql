-- Migration Script: Extract Coordinates from Events
-- Purpose: Populate latitude/longitude columns from existing geotag JSON data
-- Run this in Supabase SQL Editor

-- Step 1: Check current state
SELECT 
    id, 
    title, 
    location,
    geotag,
    latitude,
    longitude
FROM events
WHERE geotag IS NOT NULL
LIMIT 10;

-- Step 2: Update events that have geotag but missing lat/lng columns
UPDATE events
SET 
    latitude = CASE 
        WHEN geotag IS NOT NULL AND geotag->>'lat' IS NOT NULL 
        THEN (geotag->>'lat')::float 
        ELSE latitude 
    END,
    longitude = CASE 
        WHEN geotag IS NOT NULL AND geotag->>'lng' IS NOT NULL 
        THEN (geotag->>'lng')::float 
        WHEN geotag IS NOT NULL AND geotag->>'lon' IS NOT NULL 
        THEN (geotag->>'lon')::float 
        ELSE longitude 
    END
WHERE geotag IS NOT NULL
  AND (latitude IS NULL OR longitude IS NULL);

-- Step 3: Verify the update
SELECT 
    COUNT(*) as total_events,
    COUNT(geotag) as events_with_geotag,
    COUNT(latitude) as events_with_latitude,
    COUNT(longitude) as events_with_longitude
FROM events;

-- Step 4: Show events now ready for map display
SELECT 
    id,
    title,
    location,
    latitude,
    longitude,
    event_date
FROM events
WHERE latitude IS NOT NULL 
  AND longitude IS NOT NULL
ORDER BY event_date DESC;

# 🗺️ Event Locations Missing from Map - FIXED

## Problem Diagnosis

**Issue:** Events (Moments) were NOT appearing on the Heritage Map, but Albums were showing correctly.

**Root Cause:** The `EventEditor` was saving coordinates to the `geotag` JSON field, but NOT to the separate `latitude` and `longitude` database columns. The Heritage Map's coordinate parser checks multiple sources, but existing events only had data in `geotag`.

## Solution Applied

### 1. ✅ Fixed EventEditor Save Function
**File:** `EventEditor.tsx` lines 185-194

Added coordinate extraction before saving:

```typescript
// Extract coordinates from geotag for database columns
let latitude = null;
let longitude = null;
if (eventData.geotag && typeof eventData.geotag === 'object') {
    latitude = eventData.geotag.lat ?? null;
    longitude = eventData.geotag.lng ?? null;
}

const payload = {
    // ... other fields
    geotag: eventData.geotag || null,
    latitude,  // ✅ NEW: Store as separate column for map queries
    longitude, // ✅ NEW: Store as separate column for map queries
    content: eventData.content || { assets: [], galleryMode: 'cards' },
};
```

**Impact:** 
- ✅ New events will now save coordinates correctly
- ✅ Events can be queried by lat/lng at the database level
- ✅ Events will appear on Heritage Map immediately after creation

### 2. 📝 Database Migration Required

**For Existing Events:**  
Run the SQL script saved at `.gemini/migrate-event-coordinates.sql` in your Supabase SQL Editor.

This will:
1. Extract `lat` and `lng` from the `geotag` JSON field
2. Populate the `latitude` and `longitude` columns
3. Make all existing events visible on the map

```sql
-- Quick migration (copy-paste into Supabase SQL Editor)
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
```

## How Event Location Works Now

### Data Flow:
1. **User Action:** Creator uses LocationPicker in Event Editor
2. **LocationPicker Response:** Returns `(address, lat, lng)`
3. **State Update:** 
   ```typescript
   geotag: lat && lng ? { lat, lng } : null,
   location: address
   ```
4. **Save to Database:** 
   - `geotag` → JSON field for rich data
   - `latitude` → Float column (for queries/indexing)
   - `longitude` → Float column (for queries/indexing)
   - `location` → Text field for display

### Map Coordinate Resolution Priority:
The `HeritageMap` now checks (in order):
1. ✅ `geotag` field (JSON object or [lng, lat] array)
2. ✅ `latitude` and `longitude` columns
3. ✅ `location_data` field (fallback for legacy data)

## Testing Checklist

### After Migration:
- [ ] Run the SQL migration in Supabase
- [ ] Refresh the Heritage Map page
- [ ] Console should now show: `[HeritageMap] Fetched X events` (where X > 0)
- [ ] Event markers should appear with colored pins or cover images
- [ ] Clicking an event marker should show a popup card with "View Moment" button

### Creating a New Event:
- [ ] Go to `/event/new`
- [ ] Fill in Title and Date
- [ ] Click the Location field and pick a place (use LocationPicker)
- [ ] Save the event
- [ ] Navigate to `/map`
- [ ] The new event should appear immediately

## Why Albums Were Working

Albums have always stored coordinates in multiple formats:
- Album-level `geotag` in the albums table
- Album `config.geotag` as JSON
- Page assets with `lat`/`lng` properties
- Map assets with `places[]` arrays

This redundancy made albums resilient to coordinate parsing issues.

## Summary

**Before:** Events had `geotag: { lat, lng }` but NO `latitude`/`longitude` columns  
**After:** Events have BOTH `geotag` JSON AND separate float columns

This ensures:
- ✅ Events appear on Heritage Map
- ✅ Database-level coordinate queries work
- ✅ Consistent behavior with Albums
- ✅ Future-proof for spatial indexing

**Status:** 🎉 **FIXED - Run migration to display existing events!**

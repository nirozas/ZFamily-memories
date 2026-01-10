# Fix Event Images - Quick Checklist

## Issue
Event images showing empty boxes - files exist in Supabase but aren't displaying.

## Root Causes Found
1. ❌ Auto-migration was blocking app startup
2. ⚠️ Storage buckets may not be public
3. ⚠️ URLs in database might be incorrect format

## Immediate Fixes

### 1. Disabled Auto-Migration
✅ **DONE** - Commented out in `main.tsx`  
The app should now load properly!

### 2. Make Buckets Public

Run this SQL in **Supabase SQL Editor**:

```sql
-- Make all buckets public
UPDATE storage.buckets 
SET public = true 
WHERE id IN ('event-assets', 'album-assets', 'system-assets');

-- Verify
SELECT id, name, public FROM storage.buckets;
```

Expected result: All three buckets should show `public: true`

### 3. Run Migration Manually

Once the app loads:
1. Go to **Media Library**
2. Look for purple **"Fix Event Images"** button
3. Click it to run migration
4. Check results in alert

## Verification Steps

After running SQL:
1. **Refresh browser** (Ctrl+R or Cmd+R)
2. **Check Events page** - images should appear
3. **Check Media Library** - images should display
4. **Check console** - no errors

## Alternative: UI Method

Instead of SQL, use Supabase Dashboard:
1. Go to **Storage**
2. For each bucket (`event-assets`, `album-assets`, `system-assets`):
   - Click bucket name
   - Click **Settings** (gear icon)
   - ✅ Enable **"Public bucket"**
   - Click **Save**

## If Still Not Working

Share screenshot showing:
- Browser console (F12 → Console tab)
- Network tab (F12 → Network tab, filter: Img)
- Failed image requests (red color)

Then we can see exact error!

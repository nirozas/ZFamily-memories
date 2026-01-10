# Create System Assets Bucket in Supabase

## Complete SQL Setup

Copy and paste this entire block into your **Supabase SQL Editor** and run it:

```sql
-- ============================================
-- CREATE SYSTEM-ASSETS BUCKET
-- ============================================

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'system-assets',
    'system-assets',
    true,
    52428800, -- 50MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- 2. Enable public read access
CREATE POLICY "Public can view system assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'system-assets');

-- 3. Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload system assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'system-assets');

-- 4. Allow authenticated users to update
CREATE POLICY "Authenticated users can update system assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'system-assets');

-- 5. Allow authenticated users to delete
CREATE POLICY "Authenticated users can delete system assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'system-assets');

-- ============================================
-- VERIFICATION
-- ============================================
-- Check that bucket was created successfully
SELECT * FROM storage.buckets WHERE id = 'system-assets';
```

## Expected Result

After running, you should see:
- ✅ Bucket `system-assets` created
- ✅ Public access enabled
- ✅ 4 policies created

## Folder Structure

The folders will be created **automatically** when you upload files:
- `system-assets/background/` - Created when first background is uploaded
- `system-assets/sticker/` - Created when first sticker is uploaded
- `system-assets/frame/` - Created when first frame is uploaded
- `system-assets/ribbon/` - Created when first ribbon is uploaded

No additional SQL needed for folders!

## Alternative: Use Supabase UI

Prefer clicking? Here's how:

1. Go to **Storage** in Supabase Dashboard
2. Click **New bucket**
3. Fill in:
   - Name: `system-assets`
   - ✅ **Public bucket** (checked)
   - File size limit: `50 MB`
   - Allowed MIME types: `image/*`
4. Click **Create bucket**
5. The bucket policies will be created automatically

## Troubleshooting

If you get "bucket already exists" error:
```sql
-- Delete existing bucket (WARNING: deletes all files!)
DELETE FROM storage.objects WHERE bucket_id = 'system-assets';
DELETE FROM storage.buckets WHERE id = 'system-assets';

-- Then re-run the CREATE commands above
```

## Next Steps

Once the bucket is created:
1. Go to Media Library in your app
2. Click "System Assets" tab
3. Select a category (Background, Sticker, Frame, or Ribbon)
4. Click "Add Asset" to upload
5. Files will automatically go to the correct folder!

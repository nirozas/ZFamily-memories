-- Migration: Enhance family_media and ensure compatibility for URLs
-- This ensures 'metadata' column exists and provides useful utility columns.

-- 1. Ensure family_media has metadata column
do $$
begin
  if not exists (select 1 from information_schema.columns where table_name = 'family_media' and column_name = 'metadata') then
    alter table "family_media" add column "metadata" jsonb default '{}'::jsonb;
  end if;
end $$;

-- 2. Ensure url column is text (it should be, but just in case)
-- We assume it is TEXT or VARCHAR. No action needed usually if it works.

-- 3. We can create an index on metadata->>'googlePhotoId' for faster lookups if used frequently
create index if not exists idx_family_media_google_photo_id on family_media ((metadata->>'googlePhotoId'));

-- 4. RLS Policies: Ensure authenticated users can insert (usually already present)
-- This is just a check, typically handled in initial setup.
-- If you need to allow URL-only assets (where size might be 0), ensure constraints allow it.
alter table "family_media" alter column "size" drop not null;
alter table "family_media" alter column "filename" drop not null;

-- 5. Events table content validation (optional)
-- Nothing schema-wise needed for JSONB content.

-- Add content JSONB to events for rich media support
ALTER TABLE events ADD COLUMN IF NOT EXISTS content JSONB DEFAULT '[]'::jsonb;

-- Add event_id to shared_links to allow sharing events
ALTER TABLE shared_links ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE CASCADE;

-- Update the RLS policy for shared_links to allow viewing event links
DROP POLICY IF EXISTS "Users can view own album links" ON shared_links;
CREATE POLICY "Users can view own family links" ON shared_links
  FOR SELECT USING (
    (album_id IN (SELECT id FROM albums WHERE family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid()))) OR
    (event_id IN (SELECT id FROM events WHERE family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid())))
  );

-- Update get_shared_album_content to support events or rename it
CREATE OR REPLACE FUNCTION get_shared_content(token_param TEXT)
RETURNS JSONB AS $$
DECLARE
  link_record RECORD;
  album_record RECORD;
  event_record RECORD;
  pages_json JSONB;
BEGIN
  -- 1. Validate Token
  SELECT * INTO link_record FROM shared_links
  WHERE token = token_param
    AND is_active = TRUE
    AND expires_at > NOW();

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired token');
  END IF;

  -- 2. Fetch Content (Album or Event)
  IF link_record.album_id IS NOT NULL THEN
    SELECT * INTO album_record FROM albums WHERE id = link_record.album_id;
    
    SELECT jsonb_agg(
      to_jsonb(p) || jsonb_build_object(
        'assets', (
          SELECT COALESCE(jsonb_agg(to_jsonb(a)), '[]'::jsonb)
          FROM assets a
          WHERE a.page_id = p.id
        )
      )
    ) INTO pages_json
    FROM (
      SELECT * FROM pages WHERE album_id = link_record.album_id ORDER BY page_number
    ) p;

    RETURN jsonb_build_object(
      'success', true,
      'type', 'album',
      'album', to_jsonb(album_record),
      'pages', pages_json
    );
  ELSIF link_record.event_id IS NOT NULL THEN
    SELECT * INTO event_record FROM events WHERE id = link_record.event_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'type', 'event',
      'event', to_jsonb(event_record)
    );
  END IF;

  RETURN jsonb_build_object('success', false, 'error', 'No content associated with this link');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

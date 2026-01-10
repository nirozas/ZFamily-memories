-- ===========================================================
-- RUN THIS IN SUPABASE SQL EDITOR to create event_reviews table
-- ===========================================================

-- Create the event_reviews table
CREATE TABLE IF NOT EXISTS event_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_reviews_event_id ON event_reviews(event_id);
CREATE INDEX IF NOT EXISTS idx_event_reviews_user_id ON event_reviews(user_id);

-- Enable RLS
ALTER TABLE event_reviews ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies (in case they exist)
DROP POLICY IF EXISTS "Family members can view event reviews" ON event_reviews;
DROP POLICY IF EXISTS "Family members can create reviews" ON event_reviews;

-- RLS Policies
CREATE POLICY "Family members can view event reviews" ON event_reviews
  FOR SELECT USING (
    event_id IN (
      SELECT e.id FROM events e
      WHERE e.family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Family members can create reviews" ON event_reviews
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    event_id IN (
      SELECT e.id FROM events e
      WHERE e.family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid())
    )
  );

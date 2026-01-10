-- ============================================================================
-- ZOABI FAMILY DATABASE SCHEMA
-- Comprehensive version with 4 roles, invite codes, and events
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USER ROLES & PROFILES
-- ============================================================================

-- Define user role types
CREATE TYPE user_role AS ENUM ('admin', 'creator', 'member', 'external_viewer');

-- Profiles table (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT,
  avatar_url TEXT,
  role user_role DEFAULT 'member',
  family_id UUID, -- Grouping multiple users under one family
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. FAMILY GROUPS
-- ============================================================================

CREATE TABLE family_groups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add foreign key to profiles after family_groups exists
ALTER TABLE profiles
  ADD CONSTRAINT profiles_family_id_fkey 
  FOREIGN KEY (family_id) REFERENCES family_groups(id) ON DELETE SET NULL;

-- ============================================================================
-- 3. INVITE CODES
-- ============================================================================

CREATE TABLE invite_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  family_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  role user_role NOT NULL DEFAULT 'member',
  max_uses INTEGER DEFAULT 1,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- 4. EVENTS (Family Diary/Timeline)
-- ============================================================================

CREATE TABLE events (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  location TEXT,
  geotag JSONB, -- {lat: number, lng: number}
  category TEXT,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. ALBUMS
-- ============================================================================

CREATE TABLE albums (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  family_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE SET NULL, -- Link album to event
  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- e.g., 'Weddings', 'Vacations'
  cover_image_url TEXT,
  config JSONB DEFAULT '{}', -- Global theme/background settings
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. PAGES (The Flip-book structure)
-- ============================================================================

CREATE TABLE pages (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  page_number INT NOT NULL,
  template_id TEXT NOT NULL, -- e.g., 'layout-2-grid', 'layout-full-video'
  background_color TEXT DEFAULT '#ffffff',
  background_image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(album_id, page_number)
);

-- ============================================================================
-- 7. ASSETS (Images/Videos on a page)
-- ============================================================================

CREATE TABLE assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  page_id UUID REFERENCES pages(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  asset_type TEXT CHECK (asset_type IN ('image', 'video', 'ribbon', 'frame', 'text')),
  config JSONB DEFAULT '{}', -- Stores filters, AI prompts, transforms, and content
  z_index INT DEFAULT 1,
  slot_id INT, -- Maps to the specific box in the template
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7a. FAMILY MEDIA (User uploads)
-- ============================================================================

CREATE TABLE family_media (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  family_id UUID REFERENCES family_groups(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  type TEXT CHECK (type IN ('image', 'video')),
  category TEXT,
  folder TEXT DEFAULT '/', -- For folder organization
  filename TEXT,
  size BIGINT,
  tags TEXT[], -- Hashtags for search
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 7b. LIBRARY ASSETS (System assets: backgrounds, stickers, frames)
-- ============================================================================

CREATE TABLE library_assets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  category TEXT CHECK (category IN ('background', 'sticker', 'frame', 'ribbon')),
  url TEXT NOT NULL,
  name TEXT NOT NULL,
  tags TEXT[],
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 8. SHARED LINKS (Ephemeral Sharing - 48 hours)
-- ============================================================================

CREATE TABLE shared_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  album_id UUID REFERENCES albums(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '2 days'),
  is_active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- 9. EVENT REVIEWS (Family reflections on events)
-- ============================================================================

CREATE TABLE event_reviews (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_profiles_family_id ON profiles(family_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_invite_codes_code ON invite_codes(code);
CREATE INDEX idx_invite_codes_family_id ON invite_codes(family_id);
CREATE INDEX idx_events_family_id ON events(family_id);
CREATE INDEX idx_events_event_date ON events(event_date);
CREATE INDEX idx_albums_family_id ON albums(family_id);
CREATE INDEX idx_albums_creator_id ON albums(creator_id);
CREATE INDEX idx_albums_event_id ON albums(event_id);
CREATE INDEX idx_pages_album_id ON pages(album_id);
CREATE INDEX idx_assets_page_id ON assets(page_id);
CREATE INDEX idx_shared_links_token ON shared_links(token);
CREATE INDEX idx_shared_links_expires_at ON shared_links(expires_at);
CREATE INDEX idx_event_reviews_event_id ON event_reviews(event_id);
CREATE INDEX idx_event_reviews_user_id ON event_reviews(user_id);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_family_groups_updated_at BEFORE UPDATE ON family_groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_albums_updated_at BEFORE UPDATE ON albums
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pages_updated_at BEFORE UPDATE ON pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON assets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS TRIGGER AS $$
BEGIN
    -- Create profile for new user (default role: member)
    -- Family assignment and role upgrade handled via invite codes
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'member');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a new user is created in Auth
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_signup();

-- Function to validate and use invite code
CREATE OR REPLACE FUNCTION use_invite_code(code_param TEXT, user_id_param UUID)
RETURNS JSONB AS $$
DECLARE
  code_record RECORD;
  result JSONB;
BEGIN
  -- Get the invite code
  SELECT * INTO code_record FROM invite_codes
  WHERE code = code_param
    AND is_active = TRUE
    AND current_uses < max_uses
    AND (expires_at IS NULL OR expires_at > NOW())
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid or expired invite code');
  END IF;

  -- Update user's profile with family and role
  UPDATE profiles
  SET family_id = code_record.family_id,
      role = code_record.role
  WHERE id = user_id_param;

  -- Increment usage count
  UPDATE invite_codes
  SET current_uses = current_uses + 1
  WHERE id = code_record.id;

  RETURN jsonb_build_object(
    'success', true, 
    'family_id', code_record.family_id,
    'role', code_record.role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if share link is valid
CREATE OR REPLACE FUNCTION is_share_link_valid(token_param TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shared_links
    WHERE token = token_param
      AND is_active = TRUE
      AND expires_at > NOW()
  );
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_reviews ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can view their own profile and family members
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can view family members" ON profiles
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Family Groups: Users can view their own family
CREATE POLICY "Users can view their family" ON family_groups
  FOR SELECT USING (
    id IN (SELECT family_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admins can manage family groups" ON family_groups
  FOR ALL USING (
    id IN (
      SELECT family_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Invite Codes: Only admins can manage
CREATE POLICY "Admins can manage invite codes" ON invite_codes
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Anyone can view active codes for validation" ON invite_codes
  FOR SELECT USING (is_active = TRUE AND current_uses < max_uses);

-- Events: Family members can view, creators and admins can manage
CREATE POLICY "Family members can view events" ON events
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Creators and admins can manage events" ON events
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'creator')
    )
  );

-- Albums: Family members can view published, creators manage own, admins manage all
CREATE POLICY "Family members can view published albums" ON albums
  FOR SELECT USING (
    (is_published = TRUE AND family_id IN (
      SELECT family_id FROM profiles WHERE id = auth.uid()
    )) OR creator_id = auth.uid()
  );

CREATE POLICY "Creators can manage own albums" ON albums
  FOR ALL USING (creator_id = auth.uid());

CREATE POLICY "Admins can manage all family albums" ON albums
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Pages: Inherit permissions from albums
CREATE POLICY "Users can view pages in accessible albums" ON pages
  FOR SELECT USING (
    album_id IN (
      SELECT id FROM albums WHERE 
        (is_published = TRUE AND family_id IN (
          SELECT family_id FROM profiles WHERE id = auth.uid()
        )) OR creator_id = auth.uid()
    )
  );

CREATE POLICY "Album creators can manage pages" ON pages
  FOR ALL USING (
    album_id IN (SELECT id FROM albums WHERE creator_id = auth.uid())
  );

-- Assets: Inherit permissions from pages
CREATE POLICY "Users can view assets in accessible pages" ON assets
  FOR SELECT USING (
    page_id IN (
      SELECT p.id FROM pages p
      JOIN albums a ON p.album_id = a.id
      WHERE (a.is_published = TRUE AND a.family_id IN (
        SELECT family_id FROM profiles WHERE id = auth.uid()
      )) OR a.creator_id = auth.uid()
    )
  );

CREATE POLICY "Album creators can manage assets" ON assets
  FOR ALL USING (
    page_id IN (
      SELECT p.id FROM pages p
      JOIN albums a ON p.album_id = a.id
      WHERE a.creator_id = auth.uid()
    )
  );

-- Shared Links: Creators and admins can manage
CREATE POLICY "Users can view own album links" ON shared_links
  FOR SELECT USING (
    album_id IN (SELECT id FROM albums WHERE creator_id = auth.uid())
  );

  FOR ALL USING (
    album_id IN (SELECT id FROM albums WHERE creator_id = auth.uid())
  );

-- Family Media: Family members can view, uploaders/admins manage
ALTER TABLE family_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view media" ON family_media
  FOR SELECT USING (
    family_id IN (SELECT family_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Uploaders can manage own media" ON family_media
  FOR ALL USING (uploaded_by = auth.uid());

CREATE POLICY "Admins can manage all family media" ON family_media
  FOR ALL USING (
    family_id IN (
      SELECT family_id FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Library Assets: Everyone can read, only admins can manage
ALTER TABLE library_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view library assets" ON library_assets
  FOR SELECT USING (true); -- System assets are public to all authenticated users

CREATE POLICY "Admins can manage library assets" ON library_assets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Event Reviews: Family members can view and create
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

-- Function to get album content via shared token (bypassing RLS)
CREATE OR REPLACE FUNCTION get_shared_album_content(token_param TEXT)
RETURNS JSONB AS $$
DECLARE
  link_record RECORD;
  album_record RECORD;
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

  -- 2. Fetch Album
  SELECT * INTO album_record FROM albums WHERE id = link_record.album_id;
  
  -- 3. Fetch Pages with Assets
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
    'album', to_jsonb(album_record),
    'pages', pages_json
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
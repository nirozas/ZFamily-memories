-- Create the library_assets table
CREATE TABLE IF NOT EXISTS library_assets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category TEXT NOT NULL CHECK (category IN ('background', 'sticker', 'frame', 'ribbon')),
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    tags TEXT[],
    is_premium BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE library_assets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Public read access" ON library_assets
    FOR SELECT USING (true);

CREATE POLICY "Admin write access" ON library_assets
    FOR ALL USING (auth.role() = 'authenticated'); -- Simplified for now, typically would check for admin role

-- Insert Initial Assets

-- BACKGROUNDS
INSERT INTO library_assets (category, name, url, tags) VALUES
    ('background', 'Vintage Paper', 'https://images.unsplash.com/photo-1579546128583-b09e2363158c?w=1200&q=80', ARRAY['vintage', 'paper', 'texture']),
    ('background', 'Watercolor Wash', 'https://images.unsplash.com/photo-1517816428103-7098e7225c52?w=1200&q=80', ARRAY['watercolor', 'blue', 'art']),
    ('background', 'Clean Canvas', 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1200&q=80', ARRAY['canvas', 'white', 'texture']),
    ('background', 'Floral Pattern', 'https://images.unsplash.com/photo-1490750967868-58cb75069ed6?w=1200&q=80', ARRAY['floral', 'spring', 'pattern']),
    ('background', 'Dark Slate', 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1200&q=80', ARRAY['dark', 'slate', 'modern']),
    ('background', 'Gold Texture', 'https://images.unsplash.com/photo-1556093416-64fa2e5572b9?w=1200&q=80', ARRAY['gold', 'luxury', 'metal']),
    ('background', 'Wooden Table', 'https://images.unsplash.com/photo-1516528387618-afa90b13e000?w=1200&q=80', ARRAY['wood', 'rustic', 'brown']),
    ('background', 'Marble Surface', 'https://images.unsplash.com/photo-1541575825707-8898992e5c83?w=1200&q=80', ARRAY['marble', 'white', 'luxury']);

-- STICKERS (Using high quality PNGs from clear CDN sources or placeholders that render well)
-- Note: In a real prod env, these should be uploaded to the project's storage bucket. 
-- Using descriptive placeholder services or reliable public assets for demo.
INSERT INTO library_assets (category, name, url, tags) VALUES
    ('sticker', 'Golden Heart', 'https://cdn-icons-png.flaticon.com/512/929/929417.png', ARRAY['love', 'heart', 'gold']),
    ('sticker', 'Vintage Camera', 'https://cdn-icons-png.flaticon.com/512/3659/3659784.png', ARRAY['camera', 'photo', 'vintage']),
    ('sticker', 'Tape Strip', 'https://cdn-icons-png.flaticon.com/512/2362/2362788.png', ARRAY['tape', 'scrapbook', 'decoration']),
    ('sticker', 'Push Pin', 'https://cdn-icons-png.flaticon.com/512/81/81958.png', ARRAY['pin', 'office', 'memo']),
    ('sticker', 'Gold Star', 'https://cdn-icons-png.flaticon.com/512/1828/1828884.png', ARRAY['star', 'gold', 'award']),
    ('sticker', 'Flower Bouquet', 'https://cdn-icons-png.flaticon.com/512/3209/3209923.png', ARRAY['flower', 'nature', 'decoration']),
    ('sticker', 'Travel Suitcase', 'https://cdn-icons-png.flaticon.com/512/3135/3135679.png', ARRAY['travel', 'vacation', 'luggage']),
    ('sticker', 'Baby Balloons', 'https://cdn-icons-png.flaticon.com/512/3247/3247855.png', ARRAY['baby', 'birthday', 'celebration']);

-- FRAMES (PNG items with transparency in the middle ideally, but for now generic frames)
INSERT INTO library_assets (category, name, url, tags) VALUES
    ('frame', 'Gold Polaroid', 'https://png.pngtree.com/png-clipart/20230206/original/pngtree-golden-frame-vintage-png-image_8945229.png', ARRAY['gold', 'polaroid', 'photo']),
    ('frame', 'Vintage Border', 'https://png.pngtree.com/png-clipart/20221028/ourmid/pngtree-vintage-border-vector-png-image_6403482.png', ARRAY['vintage', 'ornate', 'border']),
    ('frame', 'Simple White', 'https://w7.pngwing.com/pngs/35/606/png-transparent-white-frames-borders-and-frames-picture-frames-shadow-angle-white-text-thumbnail.png', ARRAY['white', 'simple', 'clean']),
    ('frame', 'Film Strip', 'https://w7.pngwing.com/pngs/424/608/png-transparent-film-strip-cinema-movie-film-strip-miscellaneous-angle-white-thumbnail.png', ARRAY['film', 'cinema', 'strip']);

-- RIBBONS
INSERT INTO library_assets (category, name, url, tags) VALUES
    ('ribbon', 'Red Banner', 'https://cdn-icons-png.flaticon.com/512/1643/1643216.png', ARRAY['red', 'banner', 'ribbon']),
    ('ribbon', 'Gold Ribbon', 'https://cdn-icons-png.flaticon.com/512/1162/1162986.png', ARRAY['gold', 'award', 'ribbon']),
    ('ribbon', 'Blue Label', 'https://cdn-icons-png.flaticon.com/512/9617/9617013.png', ARRAY['blue', 'label', 'tag']);

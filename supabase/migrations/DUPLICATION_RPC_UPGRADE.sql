-- =====================================================================
-- DUPLICATION ENGINE V2: Server-Side Deep Clone with Schema Resilience
-- =====================================================================
-- This function safely duplicates an album and all its pages/assets
-- while gracefully handling missing columns (total_pages, layout_metadata)
-- =====================================================================

CREATE OR REPLACE FUNCTION duplicate_album_v2(source_album_id UUID, new_title TEXT DEFAULT NULL)
RETURNS TABLE(new_album_id UUID, success BOOLEAN, error_message TEXT) AS $$
DECLARE
    v_new_album_id UUID;
    v_source_title TEXT;
    v_final_title TEXT;
    v_has_total_pages BOOLEAN;
    v_has_layout_metadata BOOLEAN;
BEGIN
    -- 1. Check if source album exists
    SELECT title INTO v_source_title FROM albums WHERE id = source_album_id;
    IF NOT FOUND THEN
        RETURN QUERY SELECT NULL::UUID, FALSE, 'Source album not found';
        RETURN;
    END IF;

    -- Determine final title
    v_final_title := COALESCE(new_title, 'Copy of ' || v_source_title);

    -- 2. Detect optional columns (graceful degradation for schema variations)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'albums' AND column_name = 'total_pages'
    ) INTO v_has_total_pages;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'albums' AND column_name = 'layout_metadata'
    ) INTO v_has_layout_metadata;

    -- 3. Create the new album record (Dynamic SQL for optional columns)
    IF v_has_total_pages AND v_has_layout_metadata THEN
        INSERT INTO albums (
            family_id, title, description, category, cover_image_url,
            is_published, hashtags, location, country, geotag, config,
            total_pages, layout_metadata, created_at, updated_at
        )
        SELECT
            family_id, v_final_title, description, category, cover_image_url,
            false, hashtags, location, country, geotag, config,
            total_pages, layout_metadata, NOW(), NOW()
        FROM albums WHERE id = source_album_id
        RETURNING id INTO v_new_album_id;
    ELSIF v_has_total_pages THEN
        INSERT INTO albums (
            family_id, title, description, category, cover_image_url,
            is_published, hashtags, location, country, geotag, config,
            total_pages, created_at, updated_at
        )
        SELECT
            family_id, v_final_title, description, category, cover_image_url,
            false, hashtags, location, country, geotag, config,
            total_pages, NOW(), NOW()
        FROM albums WHERE id = source_album_id
        RETURNING id INTO v_new_album_id;
    ELSE
        -- Minimal safe insert
        INSERT INTO albums (
            family_id, title, description, category, cover_image_url,
            is_published, hashtags, location, country, geotag, config,
            created_at, updated_at
        )
        SELECT
            family_id, v_final_title, description, category, cover_image_url,
            false, hashtags, location, country, geotag, config,
            NOW(), NOW()
        FROM albums WHERE id = source_album_id
        RETURNING id INTO v_new_album_id;
    END IF;

    -- 4. Deep clone all pages from unified schema (album_pages)
    INSERT INTO album_pages (
        album_id, page_number, layout_json, layout_template, background_config, created_at, updated_at
    )
    SELECT
        v_new_album_id, page_number, 
        COALESCE(layout_json, '[]'::jsonb), 
        layout_template, 
        background_config,
        NOW(), NOW()
    FROM album_pages
    WHERE album_id = source_album_id;

    -- 5. Legacy Schema Support: Clone pages and assets (if they exist)
    -- This runs in a nested block to prevent errors if legacy tables don't exist
    BEGIN
        DECLARE
            old_page_record RECORD;
            new_page_id UUID;
        BEGIN
            FOR old_page_record IN 
                SELECT * FROM pages WHERE album_id = source_album_id
            LOOP
                -- Clone Page
                INSERT INTO pages (
                    album_id, page_number, template_id, background_color, background_image, background_opacity, created_at, updated_at
                )
                VALUES (
                    v_new_album_id, old_page_record.page_number, old_page_record.template_id, 
                    old_page_record.background_color, old_page_record.background_image, 
                    old_page_record.background_opacity, NOW(), NOW()
                )
                RETURNING id INTO new_page_id;

                -- Clone Assets for this Page
                INSERT INTO assets (
                    page_id, url, asset_type, config, z_index, slot_id, created_at, updated_at
                )
                SELECT 
                    new_page_id, url, asset_type, config, z_index, slot_id, NOW(), NOW()
                FROM assets
                WHERE page_id = old_page_record.id;
            END LOOP;
        EXCEPTION WHEN undefined_table THEN
            -- Legacy schema doesn't exist, skip silently
            NULL;
        END;
    END;

    -- 6. Return success
    RETURN QUERY SELECT v_new_album_id, TRUE, NULL::TEXT;
    RETURN;

EXCEPTION WHEN OTHERS THEN
    -- Global error handler
    RETURN QUERY SELECT NULL::UUID, FALSE, SQLERRM;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- SCHEMA CACHE RELOAD (PostgREST)
-- =====================================================================
NOTIFY pgrst, 'reload schema';

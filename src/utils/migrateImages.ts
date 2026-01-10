import { supabase } from '../lib/supabase';

/**
 * Migration Script: Fix Event Image URLs
 * 
 * This script checks and updates image URLs without assuming table structure
 */

export async function migrateEventImages() {
    console.log('🔄 Starting event image migration...');

    try {
        // First, let's check what columns exist in the assets table
        const { error: testError } = await (supabase
            .from('assets') as any)
            .select('*')
            .limit(1);

        if (testError) {
            console.error('Cannot access assets table:', testError);
            return { success: false, error: testError.message, migrated: 0, skipped: 0, errors: 0 };
        }

        // Get all assets
        const { data: assets, error: fetchError } = await supabase
            .from('assets')
            .select('*');

        if (fetchError) {
            console.error('Error fetching assets:', fetchError);
            return { success: false, error: fetchError.message, migrated: 0, skipped: 0, errors: 0 };
        }

        if (!assets || assets.length === 0) {
            console.log('✅ No assets found to migrate');
            return { success: true, migrated: 0, skipped: 0, errors: 0 };
        }

        console.log(`📊 Found ${assets.length} assets to check`);

        let migratedCount = 0;
        let skippedCount = 0;
        let errorCount = 0;

        for (const asset of assets) {
            try {
                const assetData = asset as any;
                const assetUrl = assetData.url || assetData.image_url || assetData.src;
                const assetId = assetData.id;

                if (!assetUrl || !assetId) {
                    console.warn('⚠️ Asset missing URL or ID:', assetData);
                    errorCount++;
                    continue;
                }

                // Skip if already in new format
                if (assetUrl.includes('/family/') || assetUrl.includes('/system/')) {
                    skippedCount++;
                    continue;
                }

                const urlParts = assetUrl.split('/');
                const filename = urlParts[urlParts.length - 1];

                if (!filename) {
                    console.warn(`⚠️ Cannot extract filename from URL: ${assetUrl}`);
                    errorCount++;
                    continue;
                }

                let newUrl: string | null = null;
                const bucketsToCheck = ['event-assets', 'album-assets'];

                for (const bucket of bucketsToCheck) {
                    const { data: fileExists } = await supabase
                        .storage
                        .from(bucket)
                        .list('', { search: filename });

                    if (fileExists && fileExists.length > 0) {
                        const { data } = supabase
                            .storage
                            .from(bucket)
                            .getPublicUrl(filename);

                        newUrl = data.publicUrl;
                        console.log(`✓ Found file in ${bucket}: ${filename}`);
                        break;
                    }
                }

                if (newUrl && newUrl !== assetUrl) {
                    // Try to update using whatever URL field exists
                    const updateData: any = {};
                    if ('url' in assetData) updateData.url = newUrl;
                    if ('image_url' in assetData) updateData.image_url = newUrl;
                    if ('src' in assetData) updateData.src = newUrl;

                    const { error: updateError } = await (supabase
                        .from('assets') as any)
                        .update(updateData as any)
                        .eq('id', assetId);

                    if (updateError) {
                        console.error(`❌ Error updating asset ${assetId}:`, updateError);
                        errorCount++;
                    } else {
                        console.log(`✅ Migrated ${assetId}: ${filename}`);
                        migratedCount++;
                    }
                } else if (!newUrl) {
                    console.warn(`⚠️ File not found in storage: ${filename}`);
                    errorCount++;
                }

            } catch (err) {
                console.error(`❌ Error processing asset:`, err);
                errorCount++;
            }
        }

        console.log('\n📊 Migration Summary:');
        console.log(`✅ Migrated: ${migratedCount}`);
        console.log(`⏭️ Skipped: ${skippedCount}`);
        console.log(`❌ Errors: ${errorCount}`);

        return {
            success: true,
            migrated: migratedCount,
            skipped: skippedCount,
            errors: errorCount
        };

    } catch (error) {
        console.error('❌ Migration failed:', error);
        return { success: false, error: String(error), migrated: 0, skipped: 0, errors: 0 };
    }
}

export async function reorganizeStorage(familyId: string, dryRun: boolean = true) {
    console.log(`🔄 ${dryRun ? '[DRY RUN]' : ''} Reorganizing storage...`);

    try {
        const { data: assets } = await supabase
            .from('assets')
            .select('*');

        if (!assets) return { success: true };

        for (const asset of assets) {
            const assetData = asset as any;
            const assetUrl = assetData.url || assetData.image_url || assetData.src;
            if (!assetUrl) continue;

            const urlParts = assetUrl.split('/');
            const filename = urlParts[urlParts.length - 1];
            const bucket = assetUrl.includes('event-assets') ? 'event-assets' : 'album-assets';

            const newPath = `family/${familyId}/${filename}`;

            if (dryRun) {
                console.log(`Would move: ${filename} → ${newPath}`);
            } else {
                const { data: fileData } = await supabase
                    .storage
                    .from(bucket)
                    .download(filename);

                if (fileData) {
                    await supabase
                        .storage
                        .from('album-assets')
                        .upload(newPath, fileData, { upsert: true });

                    const { data } = supabase
                        .storage
                        .from('album-assets')
                        .getPublicUrl(newPath);

                    const updateData: any = {};
                    if ('url' in assetData) updateData.url = data.publicUrl;
                    if ('image_url' in assetData) updateData.image_url = data.publicUrl;
                    if ('src' in assetData) updateData.src = data.publicUrl;

                    await (supabase.from('assets') as any)
                        .update(updateData as any)
                        .eq('id', assetData.id);

                    console.log(`✅ Moved: ${filename}`);
                }
            }
        }

        return { success: true };
    } catch (error) {
        console.error('Error reorganizing storage:', error);
        return { success: false, error: String(error) };
    }
}

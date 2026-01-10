import type { Asset, Page } from '../contexts/AlbumContext';
import type { AlbumLayout, LayoutConfig } from '../data/defaultLayouts';

function generateId() {
    return crypto.randomUUID();
}

/**
 * Creates a placeholder asset for a layout slot
 */
export function createPlaceholder(zIndex: number): Asset {
    return {
        id: generateId(),
        type: 'image',
        url: '', // Empty URL signifies placeholder
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        rotation: 0,
        zIndex: zIndex,
        isPlaceholder: true,
        fitMode: 'cover',
        opacity: 100,
        flipX: false,
        flipY: false,
        lockAspectRatio: false,
        scale: 1,
        borderWidth: 0
    };
}

/**
 * Updates an asset's position and dimensions based on a layout slot configuration
 */
export function updateAssetPosition(asset: Asset, slot: LayoutConfig): Asset {
    // Layout slots use percentages (0-100)
    // Handle both new 'x/y' and legacy 'left/top' keys
    asset.x = slot.x ?? slot.left ?? 0;
    asset.y = slot.y ?? slot.top ?? 0;
    asset.width = slot.width;
    asset.height = slot.height;
    asset.rotation = slot.rotation || 0;
    asset.zIndex = slot.z_index;

    // Force fit mode to 'cover' for layouts so they fill the slot nicely
    asset.fitMode = 'cover';
    asset.crop = undefined; // Clear any manual crop
    asset.lockAspectRatio = false; // Allow shaping to slot

    // Reset scale
    asset.scale = 1;

    return asset;
}

export interface LayoutUpdate {
    pageId: string;
    assets: Asset[];
    layoutTemplate: string;
}

/**
 * Calculates the new state of pages after applying a layout.
 * Supports both Spread and Single layouts, and explicit targeting (DnD).
 */
export function calculateLayoutApplication(
    layout: AlbumLayout,
    leftPage: Page | undefined | null,
    rightPage?: Page | null,
    targetPageId?: string
): LayoutUpdate[] {
    const updates: LayoutUpdate[] = [];

    if (!leftPage) return updates;

    if (layout.is_spread) {
        // --- SPREAD LAYOUT ---
        // Splits slots into Left (0-100) and Right (100-200) buckets

        const leftSlots: LayoutConfig[] = [];
        const rightSlots: LayoutConfig[] = [];

        layout.config.forEach(slot => {
            const x = slot.x ?? slot.left ?? 0;
            if (x < 100) {
                leftSlots.push(slot);
            } else {
                const shifted = { ...slot };
                if (shifted.x !== undefined) shifted.x -= 100;
                if (shifted.left !== undefined) shifted.left -= 100;
                rightSlots.push(shifted);
            }
        });

        // Gather all media from both pages
        const leftMedia = leftPage.assets.filter(a => a.type === 'image' || a.type === 'video');
        const rightMedia = rightPage ? rightPage.assets.filter(a => a.type === 'image' || a.type === 'video') : [];
        const allMedia = [...leftMedia, ...rightMedia];

        // Gather text/decorations to preserve
        const leftOther = leftPage.assets.filter(a => a.type !== 'image' && a.type !== 'video');
        const rightOther = rightPage ? rightPage.assets.filter(a => a.type !== 'image' && a.type !== 'video') : [];

        let mediaIndex = 0;

        // 1. Process Left Page
        const newLeftAssets: Asset[] = [...leftOther];
        leftSlots.forEach(slot => {
            let asset: Asset;
            if (mediaIndex < allMedia.length) {
                asset = { ...allMedia[mediaIndex] };
                mediaIndex++;
            } else {
                asset = createPlaceholder(slot.z_index);
            }
            updateAssetPosition(asset, slot);
            newLeftAssets.push(asset);
        });
        updates.push({ pageId: leftPage.id, assets: newLeftAssets, layoutTemplate: layout.name });

        // 2. Process Right Page (if exists)
        if (rightPage) {
            const newRightAssets: Asset[] = [...rightOther];
            rightSlots.forEach(slot => {
                let asset: Asset;
                if (mediaIndex < allMedia.length) {
                    asset = { ...allMedia[mediaIndex] };
                    mediaIndex++;
                } else {
                    asset = createPlaceholder(slot.z_index);
                }
                updateAssetPosition(asset, slot);
                newRightAssets.push(asset);
            });
            updates.push({ pageId: rightPage.id, assets: newRightAssets, layoutTemplate: layout.name });
        }

    } else {
        // --- SINGLE PAGE LAYOUT ---
        // Determine target page
        // If targetPageId provided (Drop), use it.
        // Else default to Left Page (or logic provided by UI, usually 'left').

        let targetPage = leftPage;
        if (targetPageId) {
            if (leftPage.id === targetPageId) targetPage = leftPage;
            else if (rightPage && rightPage.id === targetPageId) targetPage = rightPage;
        }

        const currentMedia = targetPage.assets.filter(a => a.type === 'image' || a.type === 'video');
        const otherAssets = targetPage.assets.filter(a => a.type !== 'image' && a.type !== 'video');

        const newAssets: Asset[] = [...otherAssets];
        const slots = layout.config;

        slots.forEach((slot, index) => {
            let asset: Asset;
            if (index < currentMedia.length) {
                asset = { ...currentMedia[index] };
            } else {
                asset = createPlaceholder(slot.z_index);
            }
            updateAssetPosition(asset, slot);
            newAssets.push(asset);
        });

        updates.push({ pageId: targetPage.id, assets: newAssets, layoutTemplate: layout.name });
    }

    return updates;
}

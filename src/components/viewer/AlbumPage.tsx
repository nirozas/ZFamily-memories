import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';
import { type Page, type LayoutBox } from '../../contexts/AlbumContext';
import { LayoutFrame } from '../shared/LayoutFrame';
import { mapAssetsToLayoutSlots } from '../../lib/layoutUtils';

interface AlbumPageProps {
    page: Page;
    dimensions: { width: number; height: number };
    side: 'left' | 'right' | 'single';
    isCover?: boolean;
    density?: 'hard' | 'soft';
    isSpread?: boolean;
    onVideoClick: (url: string, rotation?: number) => void;
}

/**
 * AlbumPage (Unified Rendering Engine v5.0)
 * 
 * The source of truth for rendering pages in all modes.
 * Implements strict absolute positioning and Z-Index hierarchy.
 */
export const AlbumPage: React.FC<AlbumPageProps> = ({
    page,
    dimensions,
    side,
    isCover,
    density,
    isSpread,
    onVideoClick
}) => {

    // 1. Data Normalization (The "Bridge")
    const normalizedPage = useMemo(() => {
        const styles = page.pageStyles || {
            backgroundColor: page.backgroundColor || '#fdfdfd',
            backgroundOpacity: page.backgroundOpacity ?? 100,
            backgroundImage: page.backgroundImage
        };

        const layoutBoxes: LayoutBox[] = page.layoutConfig || [];
        const textLayers: LayoutBox[] = page.textLayers || [];
        const freeformAssets = page.assets.filter(a => a.slotId === undefined || a.slotId === null);

        let combinedLayout: LayoutBox[] = [];

        if (layoutBoxes.length > 0) {
            combinedLayout = mapAssetsToLayoutSlots(layoutBoxes, page.assets);
        }

        freeformAssets.forEach(asset => {
            const role = asset.type === 'text' ? 'text' : 'slot';
            combinedLayout.push({
                id: asset.id,
                role: role,
                left: asset.x,
                top: asset.y,
                width: asset.width,
                height: asset.height,
                zIndex: asset.zIndex || (role === 'text' ? 50 : 10),
                content: {
                    type: asset.type === 'image' || asset.type === 'frame' ? 'image' : (asset.type as any),
                    url: asset.url,
                    zoom: asset.crop?.zoom || 1,
                    x: asset.crop?.x || 50,
                    y: asset.crop?.y || 50,
                    rotation: asset.rotation || 0,
                    text: asset.content,
                    config: { ...asset }
                }
            });
        });

        return { styles, layout: combinedLayout, text: textLayers };
    }, [page]);

    // 2. Container Styles
    const containerStyle = useMemo(() => {
        return {
            position: 'relative' as const,
            width: `${dimensions.width}px`,
            height: `${dimensions.height}px`,
            backgroundColor: normalizedPage.styles.backgroundColor,
            overflow: 'hidden' as const,
            boxSizing: 'border-box' as const,
            border: '1px solid rgba(0,0,0,0.05)',
        };
    }, [dimensions, normalizedPage.styles.backgroundColor]);

    // 3. Layer Rendering
    return (
        <div
            data-density={density}
            className={cn(
                "relative select-none album-page",
                density !== 'hard' && "shadow-[inset_3px_0_20px_-7px_rgba(0,0,0,0.2)]",
                (isSpread || page.isSpreadLayout) && "is-spread-layout"
            )}
            style={containerStyle}
        >
            {/* LAYER 0: Background */}
            {normalizedPage.styles.backgroundImage && (
                <img
                    src={normalizedPage.styles.backgroundImage}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
                    style={{ opacity: (normalizedPage.styles.backgroundOpacity || 100) / 100 }}
                />
            )}

            {/* LAYER 10 & 50: Unified Content */}
            <div className="w-full h-full relative z-[20]">
                {normalizedPage.layout.map((box, idx) => (
                    <LayoutFrame
                        key={box.id || `box-${idx}`}
                        box={box}
                        onVideoClick={onVideoClick}
                        isEditable={false}
                    />
                ))}


                {/* Independent Text Layers */}
                {normalizedPage.text.map((box, idx) => (
                    <LayoutFrame
                        key={box.id || `text-${idx}`}
                        box={box}
                        isEditable={false}
                    />
                ))}
            </div>

            {/* LAYER 100: Overlays */}
            <div className="absolute inset-x-[3%] inset-y-[3%] pointer-events-none border border-dashed border-red-500/0 z-[100] rounded-sm" />

            {/* Page Number */}
            {!isCover && (
                <div className={cn("absolute bottom-6 text-[10px] font-sans tracking-[0.3em] uppercase opacity-30 z-[90]", side === 'left' ? "left-8" : "right-8")}>
                    {page.pageNumber}
                </div>
            )}

            {/* Cinematic Shadows */}
            {!isCover && density !== 'hard' && (
                <div className={cn("absolute inset-y-0 w-24 pointer-events-none z-[15] transition-opacity duration-500", side === 'left' ? "right-0 bg-gradient-to-l from-black/20 to-transparent" : "left-0 bg-gradient-to-r from-black/20 to-transparent")} />
            )}

            <div className="absolute inset-0 pointer-events-none opacity-[0.04] bg-[url('https://www.transparenttextures.com/patterns/paper.png')] mix-blend-multiply z-20" />
        </div>
    );
};

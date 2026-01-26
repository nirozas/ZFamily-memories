import React, { memo } from 'react';
import { Maximize2, MapPin } from 'lucide-react';
import { type Asset } from '../../contexts/AlbumContext';
import { getTransformedUrl, getFilterStyle, getClipPathStyle } from '../../lib/assetUtils';
import { useGooglePhotosUrl } from '../../hooks/useGooglePhotosUrl';
import { MapAsset } from '../ui/MapAsset';

interface AssetDisplayProps {
    asset: Asset;
    offsetX?: number;
    dimensions: { width: number; height: number };
    onVideoClick?: (url: string) => void;
    isInSlot?: boolean;
}

/**
 * AssetDisplay (Version 2.0)
 * 
 * Renders individual assets (image, video, text, map, etc.)
 * Enhanced with Version 2.0 media rules: object-fit cover, stopPropagation, no-loop streams.
 */
export const AssetDisplay = memo(function AssetDisplay({
    asset,
    offsetX = 0,
    dimensions,
    onVideoClick,
    isInSlot = false
}: AssetDisplayProps) {
    const { url: resolvedUrl } = useGooglePhotosUrl(asset.googlePhotoId, asset.url);
    const displayUrl = resolvedUrl || asset.url;

    // Calculate positioning
    // If isInSlot is true, we assume the parent is already positioned and we take up 100%
    const style: React.CSSProperties = isInSlot ? {
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        zIndex: asset.zIndex || 1,
        ...getFilterStyle(asset),
        ...getClipPathStyle(asset),
        opacity: (asset.opacity ?? 100) / 100,
        willChange: 'transform',
        backfaceVisibility: 'hidden',
    } : {
        position: 'absolute',
        left: `${((asset.x + offsetX) / 100) * dimensions.width}px`,
        top: `${(asset.y / 100) * dimensions.height}px`,
        width: `${(asset.width / 100) * dimensions.width}px`,
        height: `${(asset.height / 100) * dimensions.height}px`,
        transform: `rotate(${asset.rotation || 0}deg) scale(${asset.flipX ? -1 : 1}, ${asset.flipY ? -1 : 1})`,
        transformOrigin: `${(asset.pivot?.x ?? 0.5) * 100}% ${(asset.pivot?.y ?? 0.5) * 100}%`,
        zIndex: asset.zIndex || 0,
        ...getFilterStyle(asset),
        ...getClipPathStyle(asset),
        opacity: (asset.opacity ?? 100) / 100,
        willChange: 'transform',
        backfaceVisibility: 'hidden',
    };

    // 1. Handle Images
    if (asset.type === 'image' || asset.type === 'frame') {
        const crop = asset.crop;
        const isLayoutImage = isInSlot || asset.fitMode === 'cover';

        if (isLayoutImage) {
            return (
                <div style={{ ...style, overflow: 'hidden' }} className="bg-gray-100/50">
                    <img
                        src={getTransformedUrl(displayUrl, asset)}
                        alt=""
                        className="absolute w-full h-full shadow-none transition-opacity duration-300"
                        style={{
                            objectFit: 'cover',
                            objectPosition: crop ? `${crop.x ?? 50}% ${crop.y ?? 50}%` : 'center',
                            transform: `scale(${crop?.zoom ?? 1})`,
                            transformOrigin: crop ? `${crop.x ?? 50}% ${crop.y ?? 50}%` : 'center',
                            display: 'block'
                        }}
                        draggable={false}
                        loading="lazy"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            );
        }

        return (
            <div style={{ ...style, overflow: 'hidden' }}>
                <img
                    src={getTransformedUrl(displayUrl, asset)}
                    alt=""
                    className="absolute max-w-none shadow-none"
                    style={{
                        width: crop ? `${(1 / (crop.width || 1)) * 100}%` : '100%',
                        height: crop ? `${(1 / (crop.height || 1)) * 100}%` : '100%',
                        left: crop ? `-${(crop.x || 0) * (crop.width ? 1 / crop.width : 1) * 100}%` : '0',
                        top: crop ? `-${(crop.y || 0) * (crop.height ? 1 / crop.height : 1) * 100}%` : '0',
                        objectFit: crop ? 'fill' : (asset.fitMode === 'fit' ? 'contain' : ((asset.fitMode as any) === 'stretch' ? 'fill' : 'cover')),
                        display: 'block'
                    }}
                    draggable={false}
                    onClick={(e) => e.stopPropagation()}
                />
            </div>
        );
    }

    // 2. Handle Videos (Version 2.0 Rules)
    if (asset.type === 'video') {
        return (
            <div style={{ ...style, overflow: 'hidden' }} className="group/video layout-frame">
                <video
                    src={displayUrl}
                    style={{
                        width: '100%',
                        height: '100%',
                        transform: `translateZ(0)`,
                        // Prevent distortion: Default to 'cover' for immersive feel, 'contain' if entire video must be seen.
                        // User request "full width and full height in view" implies filling the frame without stretching (aspect ratio preservation).
                        objectFit: 'cover',
                        zIndex: 999
                    }}
                    playsInline
                    controls
                    crossOrigin="anonymous"
                    preload="metadata"
                    className="pointer-events-auto stPageFlip-ignore"
                    onMouseDown={(e) => { e.stopPropagation(); }}
                    onClick={(e) => { e.stopPropagation(); }}
                    onPointerDown={(e) => { e.stopPropagation(); }}
                    onPointerUp={(e) => { e.stopPropagation(); }}
                    onPlay={(e) => {
                        e.stopPropagation();
                        // Unmute video after user interaction (complies with browser autoplay policy)
                        const video = e.currentTarget;
                        video.muted = false;
                    }}
                    onTouchStart={(e) => { e.stopPropagation(); }}
                    onEnded={(e) => {
                        e.stopPropagation();
                        // Exit fullscreen on video end
                        if (document.fullscreenElement) {
                            document.exitFullscreen().catch(err => console.warn("Exit fullscreen error:", err));
                        }
                    }}
                    muted
                // Video 2.0: NO loop
                />

                {/* Fullscreen Overlay Button */}
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (onVideoClick) onVideoClick(displayUrl);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                    onMouseUp={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onPointerUp={(e) => e.stopPropagation()}
                    className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-catalog-accent text-white rounded-md opacity-0 group-hover/video:opacity-100 transition-all z-10 pointer-events-auto shadow-lg backdrop-blur-sm scale-90 hover:scale-100 stPageFlip-ignore"
                    title="Open Fullscreen"
                >
                    <Maximize2 className="w-4 h-4" />
                </button>
            </div>
        );
    }

    // 3. Handle Text
    if (asset.type === 'text') {
        return (
            <div style={{
                ...style,
                fontSize: asset.fontSize || 16,
                fontFamily: asset.fontFamily,
                color: asset.textColor,
                textAlign: asset.textAlign as any,
                fontWeight: asset.fontWeight,
                lineHeight: asset.lineHeight,
                whiteSpace: 'pre-wrap',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
            }}
                className="pointer-events-none select-none"
                dangerouslySetInnerHTML={{ __html: asset.content || '' }}
            />
        );
    }

    // 4. Handle Location
    if (asset.type === 'location') {
        return (
            <div style={{
                ...style,
                fontSize: asset.fontSize || 14,
                fontFamily: asset.fontFamily || 'Inter',
                color: asset.textColor || '#6b7280',
                textAlign: asset.textAlign as any || 'left',
                fontWeight: asset.fontWeight || 'normal',
                whiteSpace: 'nowrap',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
            }} className="pointer-events-none select-none">
                <MapPin className="w-[1em] h-[1em] text-purple-600 flex-shrink-0" />
                <span>{asset.content}</span>
            </div>
        );
    }

    // 5. Handle Map
    if (asset.type === 'map' && asset.mapConfig) {
        return (
            <div style={style} className="stPageFlip-ignore">
                <MapAsset
                    center={asset.mapConfig.center}
                    zoom={asset.mapConfig.zoom}
                    places={asset.mapConfig.places}
                    interactive={true}
                    lazyLoad={true}
                />
            </div>
        );
    }

    return null;
});

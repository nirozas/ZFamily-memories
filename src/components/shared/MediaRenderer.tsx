import { memo } from 'react';
import { Maximize2, MapPin } from 'lucide-react';
import { getTransformedUrl, getFilterStyle } from '../../lib/assetUtils';
import { MapAsset } from '../ui/MapAsset';
import { useGooglePhotosUrl } from '../../hooks/useGooglePhotosUrl';
import { cn } from '../../lib/utils';

interface MediaRendererProps {
    type: 'image' | 'video' | 'text' | 'map' | 'location';
    url?: string;
    content?: string;
    zoom?: number;
    focalX?: number;
    focalY?: number;
    rotation?: number;
    config?: any;
    isEditable?: boolean;
    onVideoClick?: (url: string, rotation?: number) => void;
    className?: string;
}

/**
 * MediaRenderer
 * The universal engine for rendering media content across Studio, Preview, and View.
 * Ensures pixel-perfect consistency in cropping, scaling, and rotation.
 */
export const MediaRenderer = memo(function MediaRenderer({
    type,
    url,
    content,
    zoom = 1,
    focalX = 50,
    focalY = 50,
    rotation = 0,
    config = {},
    isEditable = false,
    onVideoClick,
    className
}: MediaRendererProps) {

    const { url: resolvedUrl } = useGooglePhotosUrl(config.googlePhotoId, url);
    const displayUrl = resolvedUrl || url || '';

    // 1. Handle Images
    if (type === 'image') {
        return (
            <img
                src={getTransformedUrl(displayUrl, config)}
                alt=""
                className={cn("absolute w-full h-full shadow-none transition-all duration-300", className)}
                crossOrigin="anonymous"
                style={{
                    objectFit: 'cover',
                    objectPosition: `${focalX}% ${focalY}%`,
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: `${focalX}% ${focalY}%`, // Pivot at the focal point
                    display: 'block',
                    ...getFilterStyle(config),
                }}
                draggable={false}
                loading="lazy"
                onClick={(e) => {
                    if (!isEditable) e.stopPropagation();
                }}
            />
        );
    }

    // 2. Handle Videos
    if (type === 'video') {
        const videoStyle: React.CSSProperties = {
            objectFit: 'contain',
            objectPosition: `${focalX}% ${focalY}%`,
            transform: `scale(${zoom}) rotate(${rotation}deg)`,
            transformOrigin: 'center',
            zIndex: 50,
            pointerEvents: 'auto',
            display: 'block',
            cursor: 'pointer'
        };

        const stopPropagation = (e: React.SyntheticEvent | React.MouseEvent | React.TouchEvent) => {
            e.stopPropagation();
        };

        return (
            <div
                className={cn("w-full h-full relative overflow-hidden group video-container-v5", className)}
                style={{ pointerEvents: 'auto', zIndex: 100 }}
                onClick={stopPropagation}
                onMouseDown={stopPropagation}
                onMouseUp={stopPropagation}
                onTouchStart={stopPropagation}
            >
                <video
                    src={displayUrl}
                    className="w-full h-full"
                    style={videoStyle}
                    playsInline
                    controls={true}
                    controlsList="nofullscreen"
                    crossOrigin="anonymous"
                    preload="metadata"
                    muted
                    onPlay={(e) => {
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                    }}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                    }}
                    onPointerUp={(e) => {
                        e.stopPropagation();
                        e.nativeEvent.stopImmediatePropagation();
                    }}
                />


                {!isEditable && onVideoClick && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                            if (displayUrl) onVideoClick(displayUrl, rotation);
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            e.nativeEvent.stopImmediatePropagation();
                        }}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-catalog-accent text-white rounded-md opacity-0 group-hover:opacity-100 transition-all z-[60] pointer-events-auto cursor-pointer shadow-lg backdrop-blur-sm scale-90 hover:scale-100"
                        title="Open Fullscreen"
                    >
                        <Maximize2 className="w-4 h-4" />
                    </button>
                )}

            </div>
        );
    }

    // 3. Handle Text
    if (type === 'text') {
        const style = config || {};
        return (
            <div
                className={cn("w-full h-full p-2 break-words overflow-hidden flex flex-col justify-center", className)}
                style={{
                    fontFamily: style.fontFamily || 'Inter, sans-serif',
                    fontSize: style.fontSize || 16,
                    fontWeight: style.fontWeight || 'normal',
                    color: style.textColor || style.color || 'inherit',
                    textAlign: (style.textAlign || 'center') as any,
                    textDecoration: style.textDecoration || 'none',
                    lineHeight: style.lineHeight || 1.2,
                    letterSpacing: (style.letterSpacing || 0) + 'px',
                    textShadow: style.textShadow || 'none',
                    backgroundColor: style.textBackgroundColor || 'transparent',
                }}
                dangerouslySetInnerHTML={{ __html: content || '' }}
            />
        );
    }

    // 4. Handle Location
    if (type === 'location') {
        return (
            <div
                className={cn("w-full h-full flex items-center gap-2 px-3 py-2 overflow-hidden", className)}
                style={{
                    fontFamily: config.fontFamily || 'Inter, sans-serif',
                    fontSize: config.fontSize || 14,
                    color: config.textColor || '#6b7280'
                }}
            >
                <MapPin className="w-[1.2em] h-[1.2em] text-purple-600 flex-shrink-0" />
                <span className="truncate">{content || 'Location'}</span>
            </div>
        );
    }

    // 5. Handle Map
    if (type === 'map' && config.mapConfig) {
        return (
            <div className={cn("w-full h-full", className)}>
                <MapAsset
                    center={config.mapConfig.center}
                    zoom={config.mapConfig.zoom}
                    places={config.mapConfig.places}
                    interactive={!isEditable}
                    lazyLoad={true}
                />
            </div>
        );
    }

    return null;
});

import { memo } from 'react';
import { type LayoutBox } from '../../contexts/AlbumContext';
import { MediaRenderer } from './MediaRenderer';
import { cn } from '../../lib/utils';
import { getClipPathStyle } from '../../lib/assetUtils';
import { Lock, RotateCw } from 'lucide-react';

interface LayoutFrameProps {
    box: LayoutBox;
    isEditable?: boolean;
    isSelected?: boolean;
    zoom?: number; // Canvas zoom for handle scaling
    onVideoClick?: (url: string, rotation?: number) => void;
    onClick?: (e: React.MouseEvent) => void;
    onMouseDown?: (e: React.MouseEvent) => void;
    onPointerDown?: (e: React.PointerEvent) => void;
    onDoubleClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    className?: string;
}

/**
 * LayoutFrame (Unified Component v5.3)
 * The single source of truth for rendering any layout element across Studio and Viewer.
 * Fulfills the "SYSTEM ALIGNMENT" requirement for Unified Component Architecture.
 */
export const LayoutFrame = memo(function LayoutFrame({
    box,
    isEditable = false,
    isSelected = false,
    zoom = 1,
    onVideoClick,
    onClick,
    onPointerDown,
    onDoubleClick,
    onContextMenu,
    className
}: LayoutFrameProps) {

    const config = box.content?.config || {};
    const isLocked = config.isLocked;

    // Strict Z-Index Hierarchy
    const getStrictZIndex = (role: string, customZ?: number) => {
        if (customZ !== undefined && customZ >= 100) return customZ;
        switch (role) {
            case 'slot': return 10;
            case 'text': return 50;
            case 'decoration': return 5;
            default: return customZ || 10;
        }
    };

    const isMedia = box.role === 'slot' && (box.content?.type === 'image' || box.content?.type === 'video');

    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${box.left || 0}%`,
        top: `${box.top || 0}%`,
        width: `${box.width}%`,
        height: `${box.height}%`,
        zIndex: isMedia ? 100 : getStrictZIndex(box.role, box.zIndex),
        overflow: 'hidden',
        borderRadius: config.borderRadius ? `${config.borderRadius}px` : undefined,
        border: config.borderWidth ? `${config.borderWidth}px solid ${config.borderColor || '#000'}` : undefined,
        opacity: (config.opacity ?? 100) / 100,
        ...getClipPathStyle(config as any),
        pointerEvents: isEditable ? 'auto' : (box.role === 'text' ? 'none' : 'auto'),
    };

    return (
        <div
            className={cn(
                "layout-frame transition-all duration-300",
                isEditable && !isLocked && "cursor-move",
                isSelected && "z-[200]",
                className
            )}
            style={style}
            onClick={(e) => {
                if (!isEditable) e.stopPropagation();
                onClick?.(e);
            }}
            onPointerDown={(e) => {
                if (!isEditable) e.stopPropagation();
                onPointerDown?.(e);
            }}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
        >
            <MediaRenderer
                type={box.content?.type || 'image'}
                url={box.content?.url}
                content={box.content?.text}
                zoom={box.content?.zoom}
                focalX={box.content?.x}
                focalY={box.content?.y}
                rotation={box.content?.rotation}
                config={config}
                isEditable={isEditable}
                onVideoClick={onVideoClick}
            />

            {/* --- PROFESSIONAL STUDIO OVERLAYS (Conditional) --- */}
            {isEditable && isSelected && (
                <>
                    {/* Selection Border */}
                    <div className="absolute inset-0 border-2 border-catalog-accent z-[99] pointer-events-none rounded-sm shadow-[0_0_8px_rgba(194,65,12,0.3)]" />

                    {/* Lock Indicator */}
                    {isLocked && (
                        <div className="absolute top-2 right-2 bg-orange-600 text-white p-1 rounded-full shadow-lg z-[110] border-2 border-white">
                            <Lock className="w-3 h-3" />
                        </div>
                    )}

                    {/* Rotate Handle */}
                    {!isLocked && (
                        <div
                            className="absolute -top-10 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border-2 border-catalog-accent rounded-full flex items-center justify-center cursor-alias shadow-lg hover:scale-110 transition-transform z-[101] pointer-events-auto"
                            style={{ transform: `translate(-50%, 0) scale(${1 / zoom})` }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                const ev = e as any;
                                ev.handleType = 'rotate';
                                onPointerDown?.(ev);
                            }}
                        >
                            <RotateCw className="w-4 h-4 text-catalog-accent" />
                        </div>
                    )}

                    {/* 8-Point Pro Resize Engine */}
                    {!isLocked && [
                        { h: 'nw', c: 'nw-resize', t: 0, l: 0 },
                        { h: 'n', c: 'n-resize', t: 0, l: 50 },
                        { h: 'ne', c: 'ne-resize', t: 0, l: 100 },
                        { h: 'e', c: 'e-resize', t: 50, l: 100 },
                        { h: 'se', c: 'se-resize', t: 100, l: 100 },
                        { h: 's', c: 's-resize', t: 100, l: 50 },
                        { h: 'sw', c: 'sw-resize', t: 100, l: 0 },
                        { h: 'w', c: 'w-resize', t: 50, l: 0 }
                    ].map((handle) => (
                        <div
                            key={handle.h}
                            className="absolute w-3 h-3 bg-white border-2 border-catalog-accent rounded-full z-[101] shadow-md hover:bg-catalog-accent hover:scale-125 transition-all pointer-events-auto"
                            style={{
                                top: `${handle.t}%`,
                                left: `${handle.l}%`,
                                cursor: handle.c,
                                transform: `translate(-50%, -50%) scale(${1 / zoom})`
                            }}
                            onPointerDown={(e) => {
                                e.stopPropagation();
                                const ev = e as any;
                                ev.handleType = handle.h;
                                onPointerDown?.(ev);
                            }}
                        />
                    ))}
                </>
            )}
        </div>
    );
});

import { useAlbum, type Page, type Asset } from '../../contexts/AlbumContext';
import type { AlbumLayout } from '../../data/defaultLayouts';
import { cn } from '../../lib/utils';
import { useState, memo, useEffect, useRef } from 'react';
import React from 'react';
import { motion } from 'framer-motion';
import { Image as ImageIcon, RotateCw } from 'lucide-react';
import { ContextMenu } from './ContextMenu';

interface EditorCanvasProps {
    page: Page;
    nextPage?: Page;
    side?: 'left' | 'right' | 'single';
    editorMode: 'select' | 'mask' | 'pivot';
    setEditorMode: (mode: 'select' | 'mask' | 'pivot') => void;
    showPrintSafe?: boolean;
    zoom: number;
    onPageSelect?: (pageId: string) => void;
    onApplyLayout?: (layout: AlbumLayout, pageId: string) => void;
}


export function EditorCanvas({ page, nextPage, side = 'single', editorMode, setEditorMode, showPrintSafe = true, zoom, onPageSelect, onApplyLayout }: EditorCanvasProps) {
    const {
        album,
        selectedAssetId,
        setSelectedAssetId,
        updateAsset,
        removeAsset,
        duplicateAsset,
        updateAssetZIndex,
        addAsset
    } = useAlbum();

    const canvasRef = useRef<HTMLDivElement>(null);

    const getSizeStyles = () => {
        const { width, height } = album?.config?.dimensions || { width: 1000, height: 700 };
        const totalWidth = nextPage ? width * 2 : width;
        const aspectRatio = totalWidth / height;
        return {
            width: `${totalWidth}px`,
            aspectRatio: `${aspectRatio}`,
            backgroundColor: page.backgroundColor,
        };
    };
    const [editingAssetId, setEditingAssetId] = useState<string | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, assetId?: string, pageId?: string } | null>(null);
    const [guides, setGuides] = useState<{ type: 'v' | 'h', pos: number }[]>([]);

    const handleContextMenu = (e: React.MouseEvent, assetId?: string, assetPageId?: string) => {
        if (album?.config.isLocked) return;
        e.preventDefault();
        setContextMenu({ x: e.clientX, y: e.clientY, assetId, pageId: assetPageId });
        if (assetId) setSelectedAssetId(assetId);
    };

    const handleContextAction = (action: string) => {
        if (!contextMenu?.assetId) return;
        const assetId = contextMenu.assetId;

        const targetPageId = contextMenu.pageId || page.id;

        switch (action) {
            case 'duplicate': duplicateAsset(targetPageId, assetId); break;
            case 'delete': removeAsset(targetPageId, assetId); break;
            case 'front': updateAssetZIndex(targetPageId, assetId, 'front'); break;
            case 'back': updateAssetZIndex(targetPageId, assetId, 'back'); break;
        }
    };

    const findSnappingPoints = (draggingId: string, draggingRect: { x: number, y: number, w: number, h: number }) => {
        const snapThreshold = 1.0; // 1% threshold
        const newGuides: { type: 'v' | 'h', pos: number }[] = [];
        let snappedX = draggingRect.x;
        let snappedY = draggingRect.y;

        const canvasWidth = nextPage ? 200 : 100;

        // Deterministic 1% snapping
        snappedX = Math.round(snappedX / 1) * 1;
        snappedY = Math.round(snappedY / 1) * 1;

        // 12-Column Grid Snapping (Relative to single page width of 100)
        const colWidth = 100 / 12;
        for (let i = 0; i <= (nextPage ? 24 : 12); i++) {
            const colPos = i * colWidth;
            if (Math.abs(snappedX - colPos) < snapThreshold) {
                snappedX = colPos;
                newGuides.push({ type: 'v', pos: colPos });
            }
            if (Math.abs(snappedX + draggingRect.w - colPos) < snapThreshold) {
                snappedX = colPos - draggingRect.w;
                newGuides.push({ type: 'v', pos: colPos });
            }
        }

        const otherAssets = page.assets.filter(a => a.id !== draggingId && !a.isHidden);

        // Check against page centers
        const pageCenterX = 50; // Middle of single page
        const pageCenterY = 50;

        if (Math.abs(draggingRect.x + draggingRect.w / 2 - pageCenterX) < snapThreshold) {
            snappedX = pageCenterX - draggingRect.w / 2;
            newGuides.push({ type: 'v', pos: pageCenterX });
        }
        if (Math.abs(draggingRect.y + draggingRect.h / 2 - pageCenterY) < snapThreshold) {
            snappedY = pageCenterY - draggingRect.h / 2;
            newGuides.push({ type: 'h', pos: pageCenterY });
        }

        // Check against bleed (using 3% as roughly 1/8")
        const bleed = 3;
        if (Math.abs(draggingRect.x - bleed) < snapThreshold) {
            snappedX = bleed;
            newGuides.push({ type: 'v', pos: bleed });
        }
        if (Math.abs(draggingRect.x + draggingRect.w - (canvasWidth - bleed)) < snapThreshold) {
            snappedX = canvasWidth - bleed - draggingRect.w;
            newGuides.push({ type: 'v', pos: canvasWidth - bleed });
        }

        // Check against other assets
        otherAssets.forEach(target => {
            const targetLeft = target.x;
            const targetCenterX = target.x + target.width / 2;

            if (Math.abs(draggingRect.x - targetLeft) < snapThreshold) {
                snappedX = targetLeft;
                newGuides.push({ type: 'v', pos: targetLeft });
            }
            if (Math.abs(draggingRect.x + draggingRect.w / 2 - targetCenterX) < snapThreshold) {
                snappedX = targetCenterX - draggingRect.w / 2;
                newGuides.push({ type: 'v', pos: targetCenterX });
            }
        });

        // Spread Center Snapping
        if (nextPage) {
            const spreadCenter = 100;
            if (Math.abs(draggingRect.x + draggingRect.w / 2 - spreadCenter) < snapThreshold) {
                snappedX = spreadCenter - draggingRect.w / 2;
                newGuides.push({ type: 'v', pos: spreadCenter });
            }
        }

        return { snappedX, snappedY, guides: newGuides };
    };

    const handleAssetClick = (assetId: string, pageId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedAssetId(assetId);
        if (onPageSelect) onPageSelect(pageId);
    };

    const handleCanvasClick = (e: React.MouseEvent) => {
        setSelectedAssetId(null);
        setEditingAssetId(null);

        // Determine which page was clicked in spread view
        if (nextPage && onPageSelect) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            // Spread is usually rendered as 2 pages wide.
            // But EditorCanvas currently renders 200% width if nextPage exists?
            // Yes, getSizeStyles returns width * 2.

            if (x > rect.width / 2) {
                onPageSelect(nextPage.id);
            } else {
                onPageSelect(page.id);
            }
        } else if (onPageSelect) {
            onPageSelect(page.id);
        }
    };


    const handleTextUpdate = (assetId: string, newContent: string) => {
        updateAsset(page.id, assetId, { content: newContent });
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (album?.config.isLocked) return;

        // Handle Layout Drop
        const layoutData = e.dataTransfer.getData('layout');
        if (layoutData && onApplyLayout) {
            try {
                const layout = JSON.parse(layoutData);
                const rect = e.currentTarget.getBoundingClientRect();
                let targetPageId = page.id;

                // If in spread view, check if dropped on right side
                if (nextPage) {
                    const x = e.clientX - rect.left;
                    if (x > rect.width / 2) {
                        targetPageId = nextPage.id;
                    }
                }

                onApplyLayout(layout, targetPageId);
                return;
            } catch (err) {
                console.error('Failed to parse layout drop', err);
                return;
            }
        }

        const assetData = e.dataTransfer.getData('asset');

        if (!assetData) return;

        try {
            const data = JSON.parse(assetData);
            const rect = e.currentTarget.getBoundingClientRect();

            let targetPageId = page.id;

            // Load image to get original dimensions
            if (data.type === 'image' || data.type === 'frame' || !data.type) {
                const img = new Image();
                img.src = data.url;
                img.onload = () => {
                    let w = 40; // Default width 40%
                    const ratio = img.naturalWidth / img.naturalHeight;
                    let h = w / ratio;

                    let dropX = ((e.clientX - rect.left) / (rect.width / (zoom || 1))) * (nextPage ? 200 : 100);
                    let dropY = ((e.clientY - rect.top) / (rect.height / (zoom || 1))) * 100;

                    // If dropped on the right side of a spread, it goes to nextPage
                    if (nextPage && dropX > 100) {
                        targetPageId = nextPage.id;
                        dropX -= 100;
                    }

                    let x = dropX - (w / 2);
                    let y = dropY - (h / 2);

                    const isFrame = data.type === 'frame' || data.category === 'frames' || data.category === 'frame';
                    const isBackground = data.category === 'backgrounds' || data.category === 'background';
                    const isDecoration = data.category === 'stickers' || data.category === 'ribbons' || data.category === 'sticker' || data.category === 'ribbon';

                    // If it's a background or frame, we want it to start at 100% but still be movable
                    if (isBackground || isFrame) {
                        w = 100;
                        h = w / ratio;
                        x = 0;
                        y = 0;
                    }

                    addAsset(targetPageId, {
                        type: isFrame ? 'frame' : 'image',
                        url: data.url,
                        x, y, width: w, height: h,
                        originalDimensions: { width: img.naturalWidth, height: img.naturalHeight },
                        rotation: 0,
                        zIndex: isFrame ? 50 : (isBackground ? 0 : (page.assets.length || 0) + 1),
                        pivot: { x: 0.5, y: 0.5 },
                        aspectRatio: ratio,
                        isLocked: false,
                        fitMode: (isFrame || isDecoration || isBackground) ? 'fit' : 'cover'
                    });
                };
            }
        } catch (err) {
            console.error('Drop error:', err);
        }
    };

    return (
        <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            onContextMenu={(e) => handleContextMenu(e)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            className="relative transition-all duration-300 select-none editor-canvas"
            data-page-id={page.id}
            data-side={side}
            style={getSizeStyles()}
        >
            {/* 12-Column Grid */}
            {album?.config?.gridSettings?.visible && (
                <div className="absolute inset-0 pointer-events-none z-0 flex px-0">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="flex-1 border-r border-catalog-accent/5 h-full last:border-r-0" />
                    ))}
                </div>
            )}

            {/* Print Safe / Bleed Simulation Overlay */}
            {showPrintSafe && (
                <div className="absolute inset-0 pointer-events-none z-50">
                    <div className="absolute inset-0 bg-black/10" style={{
                        clipPath: `polygon(
                            0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%,
                            3% 3%, 
                            97% 3%,
                            97% 97%,
                            3% 97%,
                            3% 3%
                        )`
                    }} />
                    <div className="absolute inset-0 border-[1px] border-dashed border-red-500/20" style={{
                        margin: '3%',
                    }} />
                </div>
            )}
            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    onAction={handleContextAction}
                    onClose={() => setContextMenu(null)}
                />
            )}
            {/* Assets from Page 1 (Left or Single) */}
            {[...page.assets].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((asset) => (
                <AssetRenderer
                    key={asset.id}
                    asset={asset}
                    pageId={page.id}
                    side={nextPage ? 'left' : side}
                    isSelected={selectedAssetId === asset.id}
                    isEditing={editingAssetId === asset.id}
                    onClick={(e) => handleAssetClick(asset.id, page.id, e)}
                    onDoubleClick={() => setEditingAssetId(asset.id)}
                    onUpdateText={handleTextUpdate}
                    onEditEnd={() => setEditingAssetId(null)}
                    onContextMenu={(e) => handleContextMenu(e, asset.id, page.id)}
                    onSnap={(rect) => {
                        const result = findSnappingPoints(asset.id, rect);
                        setGuides(result.guides);
                        return result;
                    }}
                    onSnapEnd={() => setGuides([])}
                    zoom={zoom}
                    editorMode={editorMode}
                    setEditorMode={setEditorMode}
                    canvasRef={canvasRef}
                    otherPage={nextPage}
                />
            ))}

            {/* Assets from Page 2 (Right) */}
            {nextPage && [...nextPage.assets].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((asset) => (
                <AssetRenderer
                    key={asset.id}
                    asset={asset}
                    pageId={nextPage.id}
                    side="right"
                    isSelected={selectedAssetId === asset.id}
                    isEditing={editingAssetId === asset.id}
                    onClick={(e) => handleAssetClick(asset.id, nextPage!.id, e)}
                    onDoubleClick={() => setEditingAssetId(asset.id)}
                    onUpdateText={handleTextUpdate}
                    onEditEnd={() => setEditingAssetId(null)}
                    onContextMenu={(e) => handleContextMenu(e, asset.id, nextPage.id)}
                    onSnap={(rect) => {
                        const result = findSnappingPoints(asset.id, rect);
                        setGuides(result.guides);
                        return result;
                    }}
                    onSnapEnd={() => setGuides([])}
                    zoom={zoom}
                    editorMode={editorMode}
                    setEditorMode={setEditorMode}
                    canvasRef={canvasRef}
                    otherPage={page}
                />
            ))}

            {/* Smart Guides */}
            {guides.map((guide, i) => (
                <div
                    key={i}
                    className="absolute bg-catalog-accent/50 z-[100] pointer-events-none"
                    style={{
                        left: guide.type === 'v' ? guide.pos : 0,
                        top: guide.type === 'h' ? guide.pos : 0,
                        width: guide.type === 'v' ? '1px' : '100%',
                        height: guide.type === 'h' ? '1px' : '100%',
                    }}
                />
            ))}

            {/* Selection Controls Overlay (Rendered Above All Assets) */}
            {selectedAssetId && page.assets.find(a => a.id === selectedAssetId) && (
                <AssetControls
                    asset={page.assets.find(a => a.id === selectedAssetId)!}
                    pageId={page.id}
                    side={nextPage ? 'left' : side}
                    zoom={zoom}
                    canvasRef={canvasRef}
                    isDragging={false}
                />
            )}
            {selectedAssetId && nextPage?.assets.find(a => a.id === selectedAssetId) && (
                <AssetControls
                    asset={nextPage.assets.find(a => a.id === selectedAssetId)!}
                    pageId={nextPage.id}
                    side="right"
                    zoom={zoom}
                    canvasRef={canvasRef}
                    isDragging={false}
                />
            )}

            {/* Empty State */}
            {page.assets.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-catalog-text/40">
                        <p className="text-lg font-serif italic">Drop images here</p>
                        <p className="text-sm mt-2">Or select from the sidebar</p>
                    </div>
                </div>
            )}

        </div>
    );
}

interface AssetRendererProps {
    asset: Asset;
    isSelected: boolean;
    isEditing?: boolean;
    onClick: (e: React.MouseEvent) => void;
    onDoubleClick?: () => void;
    onUpdateText?: (id: string, content: string) => void;
    onEditEnd?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    editorMode: 'select' | 'mask' | 'pivot';
    setEditorMode: (mode: 'select' | 'mask' | 'pivot') => void;
    zoom: number;
    onSnap?: (rect: { x: number, y: number, w: number, h: number }) => { snappedX: number, snappedY: number };
    onSnapEnd?: () => void;
    pageId: string;
    side?: 'left' | 'right' | 'single';
    canvasRef: React.RefObject<HTMLDivElement | null>;
    otherPage?: Page;
}

const AssetRenderer = memo(function AssetRenderer({
    asset, isSelected, isEditing, onClick, onDoubleClick, onUpdateText, onEditEnd,
    onContextMenu, onSnap, onSnapEnd, pageId, side = 'single', editorMode,
    zoom, canvasRef, otherPage
}: AssetRendererProps) {
    const { updateAsset, album, moveAssetToPage } = useAlbum();
    const [textValue, setTextValue] = useState(asset.content || '');

    useEffect(() => {
        if (!isEditing) {
            setTextValue(asset.content || '');
        }
    }, [asset.content, isEditing]);

    // For responsive rendering, we now treat coordinates (0-100) as direct percentages
    const refWidth = 100;
    const refHeight = 100;
    const canvasRefWidth = side === 'single' ? 100 : 200;

    // Spread view handling for X position
    const renderX = (side === 'right' ? asset.x + 100 : asset.x);
    const leftPercent = (renderX / canvasRefWidth) * 100;
    const topPercent = (asset.y / refHeight) * 100;
    const widthPercent = (asset.width / refWidth) * (side === 'single' ? 100 : 50);
    const heightPercent = (asset.height / refHeight) * 100;

    const getFilterStyle = (asset: Asset) => {
        let filterString = '';
        const intensity = (asset.filterIntensity ?? 100) / 100;

        switch (asset.filter) {
            case 'vintage':
                filterString += `sepia(${50 * intensity}%) contrast(${120 * intensity}%) brightness(${90 * intensity}%) `;
                break;
            case 'matte':
                filterString += `contrast(${80 * intensity}%) brightness(${110 * intensity}%) saturate(${70 * intensity}%) `;
                break;
            case 'portrait':
                filterString += `brightness(${105 * intensity}%) contrast(${105 * intensity}%) sepia(${10 * intensity}%) `;
                break;
            case 'film':
                filterString += `contrast(${125 * intensity}%) hue-rotate(${-10 * intensity}deg) saturate(${80 * intensity}%) `;
                break;
            case 'sketch':
                filterString += `grayscale(100%) contrast(${200 * intensity}%) brightness(${120 * intensity}%) `;
                break;
            case 'cartoon':
                filterString += `saturate(${200 * intensity}%) contrast(${120 * intensity}%) brightness(${110 * intensity}%) `;
                break;
            default: break;
        }

        // Standard Adjustments
        if (asset.brightness !== undefined && asset.brightness !== 100) filterString += `brightness(${asset.brightness / 100}) `;
        if (asset.contrast !== undefined && asset.contrast !== 100) filterString += `contrast(${asset.contrast / 100}) `;
        if (asset.saturate !== undefined && asset.saturate !== 100) filterString += `saturate(${asset.saturate / 100}) `;
        if (asset.blur) filterString += `blur(${asset.blur}px) `;
        if (asset.sepia) filterString += `sepia(${asset.sepia}%) `;
        if (asset.hue) filterString += `hue-rotate(${asset.hue}deg) `;

        return filterString.trim() ? { filter: filterString.trim() } : {};
    };


    const getClipPath = () => {
        if (!asset.clipPoints || asset.clipPoints.length < 3) {
            return undefined;
        }

        // CSS Polygon natively supports percentages
        const pointsStr = asset.clipPoints
            .map(p => `${p.x * 100}% ${p.y * 100}%`)
            .join(', ');

        return `polygon(${pointsStr})`;
    };

    return (
        <motion.div
            drag={!isEditing && !asset.isLocked && !album?.config?.isLocked}
            dragMomentum={false}
            dragElastic={0} // Absolute precision, no bouncing
            transition={{ type: "tween", duration: 0 }} // Eliminate re-render delay
            whileDrag={{ zIndex: 100 }}
            onDrag={(_, info) => {
                if (onSnap) {
                    // Convert current asset position to canvas-relative for snapping
                    const currentAssetX = side === 'right' ? asset.x + refWidth : asset.x;
                    const rect = {
                        x: (currentAssetX + (info.offset.x / zoom)),
                        y: (asset.y + (info.offset.y / zoom)),
                        w: asset.width,
                        h: asset.height
                    };
                    onSnap(rect);
                }
            }}
            onDragEnd={(_, info) => {
                if (!canvasRef.current) return;
                const rect = canvasRef.current.getBoundingClientRect();
                const totalWidthInPixels = rect.width;
                const heightInPixels = rect.height;

                // For spreads, totalWidthInPixels covers both pages (200%)
                const pageWidthInPixels = otherPage ? totalWidthInPixels / 2 : totalWidthInPixels;

                // Convert pixel offset to percentage offset
                const offsetXPercent = (info.offset.x / zoom / pageWidthInPixels) * 100;
                const offsetYPercent = (info.offset.y / zoom / heightInPixels) * 100;

                // Calculate final position in 0-100 system
                let finalX = asset.x + offsetXPercent;
                let finalY = asset.y + offsetYPercent;

                const absoluteX = (side === 'right' ? asset.x + 100 : asset.x) + offsetXPercent;

                if (onSnap) {
                    const draggingRect = {
                        x: (side === 'right' ? asset.x + 100 : asset.x) + offsetXPercent,
                        y: asset.y + offsetYPercent,
                        w: asset.width,
                        h: asset.height
                    };
                    const { snappedX, snappedY } = onSnap(draggingRect);
                    finalX = side === 'right' ? snappedX - 100 : snappedX;
                    finalY = snappedY;
                    onSnapEnd?.();
                }

                // Page crossing detection in spread view
                if (otherPage && side === 'left' && absoluteX > 100) {
                    moveAssetToPage(asset.id, pageId, otherPage.id, absoluteX - 100, finalY);
                } else if (otherPage && side === 'right' && absoluteX < 100) {
                    moveAssetToPage(asset.id, pageId, otherPage.id, absoluteX, finalY);
                } else {
                    updateAsset(pageId, asset.id, { x: finalX, y: finalY });
                }
            }}
            onClick={onClick}
            onDoubleClick={onDoubleClick}
            onContextMenu={onContextMenu}
            className={cn(
                "absolute cursor-move group/asset",
                !isSelected && !asset.isHidden && "hover:ring-1 hover:ring-catalog-accent/30",
                asset.isLocked && "cursor-default pointer-events-none",
                asset.isHidden && "opacity-0 pointer-events-none",
                isSelected && "z-50"
            )}
            style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                ...getFilterStyle(asset),
                transformOrigin: `${(asset.pivot?.x ?? 0.5) * 100}% ${(asset.pivot?.y ?? 0.5) * 100}%`,
                transform: `rotate(${asset.rotation || 0}deg) scale(${asset.flipX ? -1 : 1}, ${asset.flipY ? -1 : 1})`,
                zIndex: asset.zIndex || 0,
                opacity: (asset.opacity ?? 100) / 100,
                x: 0,
                y: 0
            }}
        >
            {/* FloatingToolbar removed and moved to Top Bar */}
            {/* Control Handles - Now rendered via AssetControls component */}

            {/* Pivot Control Widget */}
            {isSelected && editorMode === 'pivot' && !album?.config?.isLocked && !asset.isLocked && (
                <div
                    className="absolute z-[70] w-6 h-6 -ml-3 -mt-3 flex items-center justify-center cursor-move group/pivot"
                    style={{
                        left: `${(asset.pivot?.x ?? 0.5) * 100}%`,
                        top: `${(asset.pivot?.y ?? 0.5) * 100}%`
                    }}
                    onMouseDown={(e) => {
                        e.stopPropagation();
                        const rect = (e.currentTarget.closest('.group\\/asset') as HTMLElement).getBoundingClientRect();

                        const handleMouseMove = (mv: MouseEvent) => {
                            let x = (mv.clientX - rect.left) / rect.width;
                            let y = (mv.clientY - rect.top) / rect.height;

                            // 9-point snapping
                            const snaps = [0, 0.5, 1];
                            snaps.forEach(s => {
                                if (Math.abs(x - s) < 0.05) x = s;
                                if (Math.abs(y - s) < 0.05) y = s;
                            });

                            updateAsset(pageId, asset.id, { pivot: { x, y } });
                        };

                        const handleMouseUp = () => {
                            window.removeEventListener('mousemove', handleMouseMove);
                            window.removeEventListener('mouseup', handleMouseUp);
                        };

                        window.addEventListener('mousemove', handleMouseMove);
                        window.addEventListener('mouseup', handleMouseUp);
                    }}
                >
                    <div className="w-4 h-4 rounded-full border-2 border-white bg-catalog-accent shadow-lg flex items-center justify-center">
                        <div className="w-1 h-1 bg-white rounded-full" />
                    </div>
                    <div className="absolute w-full h-[1px] bg-white opacity-50" />
                    <div className="absolute h-full w-[1px] bg-white opacity-50" />
                </div>
            )}

            {/* Mask Points Editor */}
            {isSelected && editorMode === 'mask' && asset.type === 'image' && !album?.config?.isLocked && !asset.isLocked && (
                <div className="absolute inset-0 z-[70] pointer-events-none">
                    <svg
                        className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                    >
                        {/* Connecting Path Visual */}
                        {asset.clipPoints && (
                            <path
                                d={`M ${asset.clipPoints[0].x * 100} ${asset.clipPoints[0].y * 100} ` +
                                    asset.clipPoints.slice(1).map(p => `L ${p.x * 100} ${p.y * 100}`).join(' ') + ' Z'}
                                fill="rgba(0,180,255,0.1)"
                                stroke="var(--catalog-accent)"
                                strokeWidth="0.5"
                                strokeDasharray="1 0.5"
                                vectorEffect="non-scaling-stroke"
                            />
                        )}
                    </svg>

                    {(asset.clipPoints || []).map((p, i) => (
                        <div
                            key={i}
                            className="absolute w-3 h-3 -ml-1.5 -mt-1.5 bg-white border-2 border-catalog-accent rounded-full shadow-md cursor-move pointer-events-auto hover:scale-125 transition-transform z-[71]"
                            style={{
                                left: `${p.x * 100}%`,
                                top: `${p.y * 100}%`
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                const rect = (e.currentTarget.closest('.group\\/asset') as HTMLElement).getBoundingClientRect();

                                const handleMouseMove = (mv: MouseEvent) => {
                                    const newPoints = [...(asset.clipPoints || [])];
                                    let nx = (mv.clientX - rect.left) / rect.width;
                                    let ny = (mv.clientY - rect.top) / rect.height;

                                    // Optional: Snapping to edges
                                    if (Math.abs(nx) < 0.02) nx = 0;
                                    if (Math.abs(nx - 1) < 0.02) nx = 1;
                                    if (Math.abs(ny) < 0.02) ny = 0;
                                    if (Math.abs(ny - 1) < 0.02) ny = 1;

                                    newPoints[i] = { ...newPoints[i], x: nx, y: ny };
                                    updateAsset(pageId, asset.id, { clipPoints: newPoints });
                                };

                                const handleMouseUp = () => {
                                    window.removeEventListener('mousemove', handleMouseMove);
                                    window.removeEventListener('mouseup', handleMouseUp);
                                };

                                window.addEventListener('mousemove', handleMouseMove);
                                window.addEventListener('mouseup', handleMouseUp);
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Content Renderers with Cropping */}
            <div
                className="w-full h-full relative overflow-hidden pointer-events-auto"
                style={{
                    borderRadius: `${asset.borderRadius || 0}px`,
                    border: asset.borderWidth ? `${asset.borderWidth}px solid ${asset.borderColor || '#000'}` : 'none',
                    clipPath: getClipPath(),
                }}
            >
                {(asset.type === 'image' || asset.type === 'frame') && asset.url && !asset.isPlaceholder && (
                    <img
                        src={asset.url}
                        alt=""
                        className="absolute max-w-none origin-top-left shadow-none transition-filter duration-300"
                        style={{
                            width: asset.crop ? `${(1 / (asset.crop.width || 1)) * 100}%` : '100%',
                            height: asset.crop ? `${(1 / (asset.crop.height || 1)) * 100}%` : '100%',
                            left: asset.crop ? `-${(asset.crop.x || 0) * (asset.crop.width ? 1 / asset.crop.width : 1) * 100}%` : '0',
                            top: asset.crop ? `-${(asset.crop.y || 0) * (asset.crop.height ? 1 / asset.crop.height : 1) * 100}%` : '0',
                            objectFit: asset.crop ? 'fill' : (asset.fitMode === 'fit' ? 'contain' : ((asset.fitMode as any) === 'stretch' ? 'fill' : 'cover')),
                            ...getFilterStyle(asset),
                        }}
                        draggable={false}
                    />
                )}

                {asset.isPlaceholder && (
                    <div className="w-full h-full bg-catalog-stone/20 border-2 border-dashed border-catalog-accent/30 flex flex-col items-center justify-center p-4 text-center">
                        <ImageIcon className="w-8 h-8 text-catalog-accent/30 mb-2" />
                        <span className="text-[10px] text-catalog-accent/50 uppercase font-bold tracking-widest">
                            Smart Frame
                        </span>
                    </div>
                )}

                {asset.type === 'video' && asset.url && (
                    <div className="w-full h-full bg-black relative overflow-hidden group">
                        <video
                            src={asset.url}
                            className="w-full h-full object-cover cursor-pointer"
                            style={getFilterStyle(asset)}
                            controls={isSelected}
                            muted
                            loop
                            onClick={(e) => {
                                e.stopPropagation();
                                const video = e.currentTarget;
                                if (video.paused) video.play();
                                else video.pause();
                            }}
                        />
                    </div>
                )}

                {asset.type === 'text' && (
                    <div className="w-full h-full">
                        {isEditing ? (
                            <textarea
                                autoFocus
                                className="w-full h-full p-2 bg-transparent resize-none focus:outline-none text-center"
                                style={{
                                    fontFamily: asset.fontFamily || 'Inter, sans-serif',
                                    fontSize: asset.fontSize || Math.min(asset.width / 5, asset.height / 2),
                                    fontWeight: asset.fontWeight || 'normal',
                                    color: asset.textColor || 'inherit',
                                    textAlign: asset.textAlign || 'center',
                                    textDecoration: asset.textDecoration || 'none',
                                    lineHeight: asset.lineHeight || 1.2,
                                    letterSpacing: (asset.letterSpacing || 0) + 'px',
                                    backgroundColor: asset.textBackgroundColor || 'transparent',
                                    textShadow: asset.textShadow || 'none'
                                }}
                                value={textValue}
                                onChange={(e) => setTextValue(e.target.value)}
                                onBlur={() => {
                                    if (textValue !== asset.content) {
                                        onUpdateText?.(asset.id, textValue);
                                    }
                                    onEditEnd?.();
                                }}
                            />
                        ) : (
                            <div
                                className="w-full h-full flex items-center justify-center p-2 break-words overflow-hidden"
                                style={{
                                    fontFamily: asset.fontFamily || 'Inter, sans-serif',
                                    fontSize: asset.fontSize || Math.min(asset.width / 5, asset.height / 2),
                                    fontWeight: asset.fontWeight || 'normal',
                                    color: asset.textColor || 'inherit',
                                    textAlign: asset.textAlign || 'center',
                                    textDecoration: asset.textDecoration || 'none',
                                    lineHeight: asset.lineHeight || 1.2,
                                    letterSpacing: (asset.letterSpacing || 0) + 'px',
                                    textShadow: asset.textShadow,
                                    backgroundColor: asset.textBackgroundColor
                                }}
                            >
                                {asset.content || 'Double click to edit'}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}, (prev, next) => {
    return (
        prev.asset === next.asset &&
        prev.isSelected === next.isSelected &&
        prev.isEditing === next.isEditing &&
        prev.editorMode === next.editorMode &&
        prev.zoom === next.zoom &&
        prev.side === next.side &&
        prev.pageId === next.pageId
    );
});

const AssetControls = memo(function AssetControls({
    asset, pageId, side, zoom, canvasRef, isDragging
}: {
    asset: Asset;
    pageId: string;
    side: 'left' | 'right' | 'single';
    zoom: number;
    canvasRef: React.RefObject<HTMLDivElement | null>;
    isDragging: boolean;
}) {
    const { updateAsset, album } = useAlbum();

    // Coordinate logic matching AssetRenderer
    const refWidth = 100;
    const refHeight = 100;
    const canvasRefWidth = side === 'single' ? 100 : 200;

    // Correctly calculate position based on side (Same as AssetRenderer)
    const renderX = (side === 'right' ? asset.x + 100 : asset.x);
    const leftPercent = (renderX / canvasRefWidth) * 100;

    // For calculating width percent, we need to consider if it spans 100 or 200 units
    const widthPercent = (asset.width / refWidth) * (side === 'single' ? 100 : 50);
    const topPercent = (asset.y / refHeight) * 100;
    const heightPercent = (asset.height / refHeight) * 100;

    if (isDragging) return null;

    return (
        <div
            className="absolute z-[100]"
            style={{
                left: `${leftPercent}%`,
                top: `${topPercent}%`,
                width: `${widthPercent}%`,
                height: `${heightPercent}%`,
                transformOrigin: `${(asset.pivot?.x ?? 0.5) * 100}% ${(asset.pivot?.y ?? 0.5) * 100}%`,
                transform: `rotate(${asset.rotation || 0}deg) scale(${asset.flipX ? -1 : 1}, ${asset.flipY ? -1 : 1})`,
                pointerEvents: 'none'
            } as React.CSSProperties}
        >
            {/* Control Handles - Pointer Events restored for children */}
            {!asset.isLocked && !album?.config?.isLocked && (
                <>
                    {/* Rotation Handle */}
                    <div
                        className="absolute -top-12 left-1/2 -translate-x-1/2 w-8 h-8 bg-white border-2 border-catalog-accent rounded-full flex items-center justify-center cursor-alias shadow-lg hover:scale-110 transition-transform z-[101] pointer-events-auto"
                        style={{
                            transform: `translate(-50%, 0) scale(${1 / zoom})`
                        }}
                        onMouseDown={(e) => {
                            e.stopPropagation();
                            if (!canvasRef.current) return;
                            // Calculate center based on current screen position of the wrapper
                            const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                            const centerX = rect.left + rect.width / 2;
                            const centerY = rect.top + rect.height / 2;

                            const handleMouseMove = (mv: MouseEvent) => {
                                const angle = Math.atan2(mv.clientY - centerY, mv.clientX - centerX) * (180 / Math.PI) + 90;
                                const finalAngle = mv.shiftKey ? Math.round(angle / 15) * 15 : angle;
                                updateAsset(pageId, asset.id, { rotation: finalAngle });
                            };

                            const handleMouseUp = () => {
                                window.removeEventListener('mousemove', handleMouseMove);
                                window.removeEventListener('mouseup', handleMouseUp);
                            };

                            window.addEventListener('mousemove', handleMouseMove);
                            window.addEventListener('mouseup', handleMouseUp);
                        }}
                    >
                        <RotateCw className="w-4 h-4 text-catalog-accent" />
                    </div>

                    {/* Circular Corner Handles (Proportional Resize) */}
                    {['nw', 'ne', 'sw', 'se'].map((handle) => (
                        <div
                            key={`corner-${handle}`}
                            className={cn(
                                "absolute w-4 h-4 bg-white border-2 border-catalog-accent rounded-full z-[101] pointer-events-auto shadow-md hover:scale-125 transition-transform",
                                handle === 'nw' && "cursor-nw-resize",
                                handle === 'ne' && "cursor-ne-resize",
                                handle === 'sw' && "cursor-sw-resize",
                                handle === 'se' && "cursor-se-resize"
                            )}
                            style={{
                                // Position exactly on corners (centered on the corner point)
                                top: handle.includes('n') ? 0 : 'auto',
                                bottom: handle.includes('s') ? 0 : 'auto',
                                left: handle.includes('w') ? 0 : 'auto',
                                right: handle.includes('e') ? 0 : 'auto',
                                transform: `translate(${handle.includes('w') ? '-50%' : '50%'}, ${handle.includes('n') ? '-50%' : '50%'}) scale(${1 / zoom})`
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                const startX = e.clientX;
                                const startY = e.clientY;
                                const startW = asset.width;
                                const startH = asset.height;
                                const startPosX = asset.x;
                                const startPosY = asset.y;
                                const aspectRatio = asset.aspectRatio || (startW / startH);

                                const handleMouseMove = (mv: MouseEvent) => {
                                    const dx = (mv.clientX - startX) / zoom;
                                    const dy = (mv.clientY - startY) / zoom;

                                    // Calculate the dominant axis for proportional resize
                                    const diagonal = Math.sqrt(dx * dx + dy * dy);
                                    const sign = (handle.includes('e') ? dx : -dx) + (handle.includes('s') ? dy : -dy) > 0 ? 1 : -1;

                                    // Always proportional resize for corner handles
                                    let newW = startW + (diagonal * sign * 0.5);
                                    let newH = newW / aspectRatio;

                                    newW = Math.max(5, newW);
                                    newH = Math.max(5, newH);

                                    // Calculate new position to keep the opposite corner fixed
                                    let newX = startPosX;
                                    let newY = startPosY;

                                    if (handle.includes('w')) {
                                        newX = startPosX + startW - newW;
                                    }
                                    if (handle.includes('n')) {
                                        newY = startPosY + startH - newH;
                                    }

                                    updateAsset(pageId, asset.id, {
                                        width: newW,
                                        height: newH,
                                        x: newX,
                                        y: newY,
                                        aspectRatio: newW / newH
                                    });
                                };

                                const handleMouseUp = () => {
                                    window.removeEventListener('mousemove', handleMouseMove);
                                    window.removeEventListener('mouseup', handleMouseUp);
                                };
                                window.addEventListener('mousemove', handleMouseMove);
                                window.addEventListener('mouseup', handleMouseUp);
                            }}
                        />
                    ))}

                    {/* Bar Side Handles (Stretch - Non-proportional Resize) */}
                    {['n', 's', 'e', 'w'].map((handleSide) => (
                        <div
                            key={`side-${handleSide}`}
                            className={cn(
                                "absolute bg-white border-2 border-catalog-accent z-[100] pointer-events-auto shadow-sm hover:scale-110 transition-transform rounded-full",
                                (handleSide === 'n' || handleSide === 's') && "h-1.5 w-6", // Slightly smaller visual
                                (handleSide === 'e' || handleSide === 'w') && "w-1.5 h-6",
                                handleSide === 'n' && "cursor-n-resize",
                                handleSide === 's' && "cursor-s-resize",
                                handleSide === 'e' && "cursor-e-resize",
                                handleSide === 'w' && "cursor-w-resize"
                            )}
                            style={{
                                // Position exactly on the center of each edge
                                top: handleSide === 'n' ? 0 : handleSide === 's' ? '100%' : '50%',
                                left: handleSide === 'w' ? 0 : handleSide === 'e' ? '100%' : '50%',
                                transform: `translate(-50%, -50%) scale(${1 / zoom})`
                            }}
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                const startX = e.clientX;
                                const startY = e.clientY;
                                const startW = asset.width;
                                const startH = asset.height;
                                const startPosX = asset.x;
                                const startPosY = asset.y;

                                // Helper for page dimensions in screen pixels
                                if (!canvasRef.current) return;
                                const rect = canvasRef.current.getBoundingClientRect();
                                const pageW_px = (canvasRefWidth === 100) ? rect.width : (rect.width / 2);
                                const pageH_px = rect.height;

                                const handleMouseMove = (mv: MouseEvent) => {
                                    const dMx = mv.clientX - startX;
                                    const dMy = mv.clientY - startY;

                                    // Convert to percentage units
                                    const dPctX = (dMx / pageW_px) * 100;
                                    const dPctY = (dMy / pageH_px) * 100;

                                    let newW = startW;
                                    let newH = startH;
                                    let newX = startPosX;
                                    let newY = startPosY;

                                    // Stretch only one dimension, keep opposite edge fixed
                                    if (handleSide === 'e') {
                                        newW = startW + dPctX;
                                    }
                                    if (handleSide === 'w') {
                                        newW = startW - dPctX;
                                        newX = startPosX + dPctX; // Move left edge
                                    }
                                    if (handleSide === 's') {
                                        newH = startH + dPctY;
                                    }
                                    if (handleSide === 'n') {
                                        newH = startH - dPctY;
                                        newY = startPosY + dPctY; // Move top edge
                                    }

                                    newW = Math.max(5, newW);
                                    newH = Math.max(5, newH);

                                    updateAsset(pageId, asset.id, {
                                        width: newW,
                                        height: newH,
                                        x: newX,
                                        y: newY,
                                        // Force stretch mode when using side (stretch) handles
                                        fitMode: 'stretch',
                                        crop: undefined // Reset crop to allow full stretch
                                    });
                                };

                                const handleMouseUp = () => {
                                    window.removeEventListener('mousemove', handleMouseMove);
                                    window.removeEventListener('mouseup', handleMouseUp);
                                };
                                window.addEventListener('mousemove', handleMouseMove);
                                window.addEventListener('mouseup', handleMouseUp);
                            }}
                        />
                    ))}
                </>
            )}

            {/* Visual Border for Selection */}
            {!asset.isLocked && (
                <div
                    className="absolute inset-0 border-2 border-catalog-accent z-[99] pointer-events-none rounded-sm"
                    style={{
                        boxShadow: '0 0 0 1px rgba(194, 65, 12, 0.1), 0 0 8px rgba(194, 65, 12, 0.3)'
                    }}
                />
            )}
        </div>
    );
});

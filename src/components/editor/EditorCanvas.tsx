import React, { useState, memo, useRef, useCallback } from 'react';
import { useAlbum, type Page, type Asset } from '../../contexts/AlbumContext';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';
import { Plus, Grid } from 'lucide-react';
import { ContextMenu } from './ContextMenu';
import { FocalPointEditorModal } from './FocalPointEditorModal';
import { LayoutFrame } from '../shared/LayoutFrame';

interface EditorCanvasProps {
    page: Page;
    nextPage?: Page;
    side?: 'left' | 'right' | 'single';
    showPrintSafe?: boolean;
    zoom: number;
    onPageSelect?: (pageId: string) => void;
    onOpenMapEditor?: (assetId: string) => void;
    onOpenLocationEditor?: (assetId: string) => void;
}

interface AssetRendererProps {
    asset: Asset;
    isSelected: boolean;
    onClick: (e: React.MouseEvent) => void;
    onDoubleClick?: () => void;
    onContextMenu?: (e: React.MouseEvent) => void;
    pageId: string;
    side?: 'left' | 'right' | 'single';
    zoom: number;
    canvasRef: React.RefObject<HTMLDivElement | null>;
    onDrop?: (e: React.DragEvent) => void;
    isInSlot?: boolean;
}

const AssetRenderer = memo(function AssetRenderer({
    asset, isSelected, onClick, onDoubleClick,
    onContextMenu, pageId, side = 'single',
    zoom, canvasRef, onDrop, isInSlot
}: AssetRendererProps) {
    const { updateAsset, album, commitHistory } = useAlbum();
    const [dragPos, setDragPos] = useState<{ x: number, y: number } | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);

    const canvasRefWidth = side === 'single' ? 100 : 200;
    const renderX = (side === 'right' ? asset.x + 100 : asset.x);
    const leftPercent = isInSlot ? asset.x : (renderX / canvasRefWidth) * 100;
    const topPercent = isInSlot ? asset.y : asset.y;
    const widthPercent = isInSlot ? asset.width : (asset.width / (side === 'single' ? 100 : 200)) * 100;
    const heightPercent = isInSlot ? asset.height : asset.height;

    const box = {
        id: asset.id,
        role: asset.type === 'text' ? 'text' : 'slot',
        left: 0,
        top: 0,
        width: 100,
        height: 100,
        zIndex: asset.zIndex || 0,
        content: {
            type: asset.type,
            url: asset.url,
            text: asset.content,
            zoom: asset.crop?.zoom,
            x: asset.crop?.x,
            y: asset.crop?.y,
            rotation: asset.rotation,
            config: asset
        }
    };

    const handlePointerDown = (e: React.PointerEvent, forcedHandleType?: string) => {
        if (asset.isLocked || album?.config?.isLocked) return;
        if (e.button !== 0) return;

        const handleType = forcedHandleType || (e.nativeEvent as any).handleType;
        const isResizing = !!handleType;

        const target = e.currentTarget as HTMLElement;
        const rect = target.getBoundingClientRect();
        const startPos = { x: e.clientX, y: e.clientY };
        const startAsset = { x: asset.x, y: asset.y, w: asset.width, h: asset.height, r: asset.rotation || 0 };

        const canvasRect = canvasRef.current?.getBoundingClientRect();
        if (!canvasRect) return;

        const zoomFactor = zoom || 1;
        const totalWidth_px = (side === 'single' ? canvasRect.width : canvasRect.width / 2) / zoomFactor;
        const totalHeight_px = canvasRect.height / zoomFactor;

        const handlePointerMove = (mv: PointerEvent) => {
            requestAnimationFrame(() => {
                const dx_px = (mv.clientX - startPos.x) / zoomFactor;
                const dy_px = (mv.clientY - startPos.y) / zoomFactor;
                const dx_pct = (dx_px / totalWidth_px) * 100;
                const dy_pct = (dy_px / totalHeight_px) * 100;

                if (isResizing) {
                    if (handleType === 'rotate') {
                        const centerX = rect.left + rect.width / 2;
                        const centerY = rect.top + rect.height / 2;
                        const angle = Math.atan2(mv.clientY - centerY, mv.clientX - centerX) * (180 / Math.PI) + 90;
                        updateAsset(pageId, asset.id, { rotation: angle }, { skipHistory: true });
                    } else {
                        let { x, y, w, h } = { ...startAsset };
                        if (handleType.includes('e')) w = Math.max(2, startAsset.w + dx_pct);
                        if (handleType.includes('w')) {
                            const nextW = Math.max(2, startAsset.w - dx_pct);
                            x = startAsset.x + (startAsset.w - nextW);
                            w = nextW;
                        }
                        if (handleType.includes('s')) h = Math.max(2, startAsset.h + dy_pct);
                        if (handleType.includes('n')) {
                            const nextH = Math.max(2, startAsset.h - dy_pct);
                            y = startAsset.y + (startAsset.h - nextH);
                            h = nextH;
                        }
                        if (mv.shiftKey || asset.lockAspectRatio) {
                            const ratio = asset.aspectRatio || (startAsset.w / startAsset.h);
                            if (handleType === 'e' || handleType === 'w') h = w / ratio;
                            else w = h * ratio;
                        }
                        updateAsset(pageId, asset.id, { x, y, width: w, height: h }, { skipHistory: true });
                    }
                } else {
                    let nx = startAsset.x + dx_pct;
                    let ny = startAsset.y + dy_pct;
                    nx = Math.max(0, Math.min(100 - asset.width, nx));
                    ny = Math.max(0, Math.min(100 - asset.height, ny));
                    updateAsset(pageId, asset.id, { x: nx, y: ny }, { skipHistory: true });
                }
                setDragPos({ x: mv.clientX, y: mv.clientY });
            });
        };

        const handlePointerUp = () => {
            commitHistory();
            setDragPos(null);
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    };

    return (
        <div className="relative contents">
            {dragPos && (
                <div
                    className="fixed z-[9999] pointer-events-none bg-catalog-accent text-white text-[10px] px-2 py-1 rounded shadow-lg font-bold flex flex-col items-center"
                    style={{ left: dragPos.x + 20, top: dragPos.y + 20 }}
                >
                    <div className="flex gap-2">
                        <span>X: {Math.round(asset.x)}%</span>
                        <span>Y: {Math.round(asset.y)}%</span>
                    </div>
                </div>
            )}
            <motion.div
                onDrop={(e) => { setIsDragOver(false); onDrop?.(e); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onPointerDown={(e) => handlePointerDown(e)}
                animate={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    width: `${widthPercent}%`,
                    height: `${heightPercent}%`,
                    rotate: asset.rotation || 0,
                    scaleX: asset.flipX ? -1 : 1,
                    scaleY: asset.flipY ? -1 : 1,
                    opacity: (asset.opacity ?? 100) / 100,
                    zIndex: asset.zIndex || 0,
                }}
                transition={{ type: "tween", duration: 0.1 }}
                className={cn(
                    "absolute cursor-move group/asset",
                    !isSelected && !asset.isHidden && "hover:ring-1 hover:ring-catalog-accent/30",
                    isDragOver && !asset.isPlaceholder && "ring-2 ring-catalog-accent shadow-xl scale-[1.02] z-[100]",
                    asset.isHidden && "opacity-0 pointer-events-none",
                    isSelected && "z-50",
                    asset.isLocked && "cursor-default"
                )}
                style={{ transformOrigin: '0 0' }}
            >
                <LayoutFrame
                    box={box as any}
                    isEditable={true}
                    isSelected={isSelected}
                    zoom={zoom}
                    onClick={onClick}
                    onPointerDown={(e) => {
                        const hType = (e as any).handleType;
                        if (hType) handlePointerDown(e, hType);
                    }}
                    onDoubleClick={onDoubleClick}
                    onContextMenu={onContextMenu}
                />
            </motion.div>
        </div>
    );
}, (prev, next) => {
    return (
        prev.asset === next.asset &&
        prev.isSelected === next.isSelected &&
        prev.zoom === next.zoom &&
        prev.side === next.side &&
        prev.pageId === next.pageId
    );
});

export const EditorCanvas = memo(function EditorCanvas({
    page, nextPage, side = 'single',
    showPrintSafe = true, zoom, onPageSelect, onOpenMapEditor, onOpenLocationEditor
}: EditorCanvasProps) {
    const {
        album, selectedAssetId, setSelectedAssetId, updateAsset,
        removeAsset, duplicateAsset, updateAssetZIndex, addAsset, showLayoutOutlines,
        activeSlot, setActiveSlot
    } = useAlbum();

    const canvasRef = useRef<HTMLDivElement>(null);
    const [dragOverSlot, setDragOverSlot] = useState<{ pageId: string, index: number } | null>(null);
    const [contextMenu, setContextMenu] = useState<{ x: number, y: number, assetId?: string, pageId?: string } | null>(null);
    const [focalEditorAsset, setFocalEditorAsset] = useState<{ asset: Asset; pageId: string } | null>(null);

    const getSizeStyles = () => {
        const { width, height } = album?.config?.dimensions || { width: 1000, height: 700 };
        const totalWidth = nextPage ? width * 2 : width;
        const aspectRatio = totalWidth / height;
        return { width: `${totalWidth}px`, aspectRatio: `${aspectRatio}`, backgroundColor: page.backgroundColor };
    };

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

    const handleAssetClick = useCallback((assetId: string, pageId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        setSelectedAssetId(assetId);
        if (onPageSelect) onPageSelect(pageId);
    }, [onPageSelect, setSelectedAssetId]);

    const handleCanvasClick = useCallback((e: React.MouseEvent) => {
        setSelectedAssetId(null);
        if (nextPage && onPageSelect) {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            if (x > rect.width / 2) onPageSelect(nextPage.id);
            else onPageSelect(page.id);
        } else if (onPageSelect) onPageSelect(page.id);
    }, [nextPage, onPageSelect, page.id, setSelectedAssetId]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (album?.config.isLocked) return;
        const assetData = e.dataTransfer.getData('asset');
        if (!assetData) return;
        try {
            const data = JSON.parse(assetData);
            const rect = e.currentTarget.getBoundingClientRect();
            const zoomFactor = zoom || 1;
            const clickX = e.clientX - rect.left;
            const clickY = e.clientY - rect.top;
            const dropX_Pct = (clickX / (rect.width / zoomFactor)) * (nextPage ? 200 : 100);
            const dropY_Pct = (clickY / (rect.height / zoomFactor)) * 100;
            let targetPageId = page.id;
            let localX = dropX_Pct;
            if (nextPage && dropX_Pct > 100) { targetPageId = nextPage.id; localX = dropX_Pct - 100; }
            const targetPageObj = targetPageId === page.id ? page : nextPage;
            if (targetPageObj) {
                const hitAsset = targetPageObj.assets.filter(a => a.isPlaceholder).sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0)).find(a => localX >= a.x && localX <= (a.x + a.width) && dropY_Pct >= a.y && dropY_Pct <= (a.y + a.height));
                if (hitAsset && (data.type === 'image' || data.type === 'video' || !data.type)) {
                    updateAsset(targetPageId, hitAsset.id, { url: data.url, type: data.type || 'image', isPlaceholder: false, fitMode: 'cover' });
                    return;
                }
            }
            const addWithProportions = (assetType: string, url: string, natW: number, natH: number, category?: string) => {
                const ratio = natW / natH;
                const albumW = album?.config?.dimensions?.width || 1000;
                const albumH = album?.config?.dimensions?.height || 700;
                const isBackground = category === 'backgrounds' || data.category === 'backgrounds';
                const isFrame = assetType === 'frame' || category === 'frames' || data.category === 'frames';
                let w = (isBackground || isFrame) ? 100 : (natW / albumW) * 100;
                let h = (isBackground || isFrame) ? 100 : (natH / albumH) * 100;
                const maxUnit = 60;
                if (!isBackground && !isFrame && (w > maxUnit || h > maxUnit)) {
                    const scale = Math.min(maxUnit / w, maxUnit / h);
                    w *= scale; h *= scale;
                }
                if (!isBackground && !isFrame) h = w / ratio;
                addAsset(targetPageId, { type: isFrame ? 'frame' : (assetType as any), url: url, x: (isBackground || isFrame) ? 0 : Math.max(0, Math.min(100 - w, localX - (w / 2))), y: (isBackground || isFrame) ? 0 : Math.max(0, Math.min(100 - h, dropY_Pct - (h / 2))), width: w, height: h, originalDimensions: { width: natW, height: natH }, rotation: 0, zIndex: isFrame ? 50 : (isBackground ? 0 : (targetPageObj?.assets.length || 0) + 10), aspectRatio: ratio, fitMode: isBackground ? 'cover' : 'fit', lockAspectRatio: true, category: category || data.category } as any);
            };
            if (data.type === 'video') {
                const video = document.createElement('video'); video.src = data.url;
                video.onloadedmetadata = () => addWithProportions('video', data.url, video.videoWidth || 1280, video.videoHeight || 720);
                video.onerror = () => addWithProportions('video', data.url, 1280, 720);
            } else {
                const img = new Image(); img.src = data.url;
                img.onload = () => addWithProportions(data.type || 'image', data.url, img.naturalWidth, img.naturalHeight);
                img.onerror = () => addWithProportions(data.type || 'image', data.url, 800, 600);
            }
        } catch (err) { console.error('Asset drop failed', err); }
    };

    const handleAssetDrop = (assetId: string, pageId: string, e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        if (album?.config.isLocked) return;
        const assetData = e.dataTransfer.getData('asset');
        if (!assetData) return;
        try {
            const data = JSON.parse(assetData);
            if (data.type === 'image' || !data.type) {
                if (assetId.startsWith('slot-')) {
                    const slotIndex = parseInt(assetId.replace('slot-', ''));
                    addAsset(pageId, {
                        type: 'image',
                        url: data.url,
                        x: 0, y: 0, width: 100, height: 100,
                        zIndex: 10,
                        rotation: 0,
                        slotId: slotIndex,
                        isPlaceholder: false,
                        fitMode: 'cover'
                    });
                } else {
                    updateAsset(pageId, assetId, {
                        url: data.url,
                        isPlaceholder: false,
                        fitMode: 'cover'
                    });
                }
            }
        } catch (err) { console.error('[EditorCanvas] Injection failed:', err); }
    };

    const renderPageAssets = (targetPage: Page, targetSide: 'left' | 'right' | 'single') => {
        const layoutCfg = targetPage.layoutConfig || [];
        const textLayers = targetPage.textLayers || [];
        const hasUnifiedData = layoutCfg.length > 0 || textLayers.length > 0;

        if (hasUnifiedData) {
            return (
                <>
                    {/* 1. Layout Slots & Unified Assets */}
                    {layoutCfg.map((box: any, index: number) => {
                        const asset = targetPage.assets.find(a => a.slotId === index);
                        if (box.role === 'slot') {
                            return asset ? (
                                <AssetRenderer
                                    key={`slot-${targetPage.id}-${index}`}
                                    asset={asset} pageId={targetPage.id} side={targetSide} isSelected={selectedAssetId === asset.id}
                                    onClick={(e) => handleAssetClick(asset.id, targetPage.id, e)}
                                    onDoubleClick={() => setFocalEditorAsset({ asset, pageId: targetPage.id })}
                                    onContextMenu={(e) => handleContextMenu(e, asset.id, targetPage.id)}
                                    zoom={zoom} canvasRef={canvasRef}
                                    onDrop={(e) => handleAssetDrop(asset.id, targetPage.id, e)}
                                    isInSlot={true}
                                />
                            ) : (
                                <div
                                    key={`slot-empty-${targetPage.id}-${index}`}
                                    className={cn("absolute group transition-all duration-300", !showLayoutOutlines && "border-transparent", showLayoutOutlines && "border-2 border-dashed border-[#4A90E2] bg-[#4A90E2]/5")}
                                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                                    onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleAssetDrop(`slot-${index}`, targetPage.id, e); }}
                                    style={{
                                        top: `${box.top}%`,
                                        left: `${targetSide === 'right' ? box.left + 100 : box.left}%`,
                                        width: `${(nextPage && !targetPage.isSpreadLayout) ? box.width / 2 : box.width}%`,
                                        height: `${box.height}%`,
                                        zIndex: box.zIndex || 1
                                    }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveSlot({ pageId: targetPage.id, index });
                                    }}
                                >
                                    <div className="w-full h-full flex flex-col items-center justify-center gap-1">
                                        <Plus className="w-6 h-6 opacity-20" />
                                        <span className="text-[10px] opacity-40 uppercase font-bold">Fill</span>
                                    </div>
                                </div>
                            );
                        }

                        // Map Unified Box to Asset format for the renderer
                        const unifiedAsset = {
                            id: box.id,
                            type: box.content?.type || 'image',
                            url: box.content?.url || '',
                            content: box.content?.text,
                            x: box.left,
                            y: box.top,
                            width: box.width,
                            height: box.height,
                            rotation: box.content?.rotation || 0,
                            zIndex: box.zIndex || 10,
                            crop: { zoom: box.content?.zoom || 1, x: box.content?.x || 50, y: box.content?.y || 50, width: 1, height: 1 }
                        } as any;

                        return (
                            <AssetRenderer
                                key={box.id}
                                asset={unifiedAsset}
                                pageId={targetPage.id}
                                side={targetSide}
                                isSelected={selectedAssetId === box.id}
                                zoom={zoom}
                                canvasRef={canvasRef}
                                onClick={(e) => handleAssetClick(box.id, targetPage.id, e)}
                                onContextMenu={(e) => handleContextMenu(e, box.id, targetPage.id)}
                                isInSlot={true}
                            />
                        );
                    })}

                    {/* 2. Text Layers */}
                    {textLayers.map((layer: any) => {
                        const textAsset = {
                            id: layer.id,
                            type: 'text',
                            url: '',
                            content: layer.content?.text,
                            x: layer.left,
                            y: layer.top,
                            width: layer.width,
                            height: layer.height,
                            rotation: layer.content?.rotation || 0,
                            zIndex: layer.zIndex || 50
                        } as any;

                        return (
                            <AssetRenderer
                                key={layer.id}
                                asset={textAsset}
                                pageId={targetPage.id}
                                side={targetSide}
                                isSelected={selectedAssetId === layer.id}
                                zoom={zoom}
                                canvasRef={canvasRef}
                                onClick={(e) => handleAssetClick(layer.id, targetPage.id, e)}
                                onContextMenu={(e) => handleContextMenu(e, layer.id, targetPage.id)}
                                isInSlot={true}
                            />
                        );
                    })}
                </>
            );
        }

        return [...targetPage.assets].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((asset: Asset) => (
            <AssetRenderer
                key={asset.id} asset={asset} pageId={targetPage.id} side={targetSide} isSelected={selectedAssetId === asset.id}
                onClick={(e) => handleAssetClick(asset.id, targetPage.id, e)}
                onDoubleClick={() => {
                    if (asset.type === 'text') { /* Handled in context */ }
                    else if (asset.type === 'map') onOpenMapEditor?.(asset.id);
                    else if (asset.type === 'location') onOpenLocationEditor?.(asset.id);
                    else if (asset.type === 'image' || asset.type === 'frame') setFocalEditorAsset({ asset, pageId: targetPage.id });
                }}
                onContextMenu={(e) => handleContextMenu(e, asset.id, targetPage.id)}
                zoom={zoom} canvasRef={canvasRef}
                onDrop={(e) => handleAssetDrop(asset.id, targetPage.id, e)}
            />
        ));
    };

    return (
        <div onMouseDown={handleCanvasClick} onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} className="relative transition-all duration-300 select-none editor-canvas" data-page-id={page.id} data-side={side} style={getSizeStyles()} ref={canvasRef}>
            {page.backgroundImage && (
                <img src={page.backgroundImage} alt="" className={cn("absolute top-0 bottom-0 object-cover pointer-events-none z-0", nextPage ? "left-0 w-1/2" : "inset-0 w-full h-full")} style={{ opacity: page.backgroundOpacity ?? 1 }} />
            )}
            {nextPage && nextPage.backgroundImage && (
                <img src={nextPage.backgroundImage} alt="" className="absolute top-0 bottom-0 left-1/2 w-1/2 object-cover pointer-events-none z-0" style={{ opacity: nextPage.backgroundOpacity ?? 1 }} />
            )}
            {album?.config?.gridSettings?.visible && (
                <div className="absolute inset-0 pointer-events-none z-0 flex px-0">
                    {Array.from({ length: 12 }).map((_, i) => (
                        <div key={i} className="flex-1 border-r border-catalog-accent/5 h-full last:border-r-0" />
                    ))}
                </div>
            )}
            {showPrintSafe && (
                <div className="absolute inset-0 pointer-events-none z-50">
                    <div className="absolute inset-0 bg-black/10" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%, 0% 0%, 3% 3%, 97% 3%, 97% 97%, 3% 97%, 3% 3%)' }} />
                    <div className="absolute inset-0 border-[1px] border-dashed border-red-500/20" style={{ margin: '3%' }} />
                </div>
            )}
            {contextMenu && <ContextMenu x={contextMenu.x} y={contextMenu.y} onAction={handleContextAction} onClose={() => setContextMenu(null)} />}
            {renderPageAssets(page, nextPage ? 'left' : side)}
            {nextPage && !page.isSpreadLayout && renderPageAssets(nextPage, 'right')}

            {page.assets.length === 0 && page.layoutConfig?.length === 0 && page.textLayers?.length === 0 &&
                (!nextPage || (nextPage.assets.length === 0 && nextPage.layoutConfig?.length === 0 && nextPage.textLayers?.length === 0)) && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center text-catalog-text/40 animate-in fade-in zoom-in duration-700">
                            <Grid className="w-8 h-8 mx-auto mb-4 opacity-20" />
                            <p className="text-lg font-serif italic text-catalog-text/60">Ready to Create?</p>
                            <p className="text-xs mt-2 uppercase tracking-widest font-bold">Pick a Layout from the Sidebar</p>
                            <p className="text-[10px] mt-1 opacity-60 italic">or drop your first image here</p>
                        </div>
                    </div>
                )}
            {focalEditorAsset && (
                <FocalPointEditorModal
                    asset={focalEditorAsset.asset}
                    pageId={focalEditorAsset.pageId}
                    onSave={(updates) => {
                        updateAsset(focalEditorAsset.pageId, focalEditorAsset.asset.id, updates);
                        setFocalEditorAsset(null);
                    }}
                    onClose={() => setFocalEditorAsset(null)}
                />
            )}
        </div>
    );
});

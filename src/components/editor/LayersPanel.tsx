import { useState, useEffect } from 'react';
import { useAlbum, type Asset } from '../../contexts/AlbumContext';
import { Layers, Lock, Unlock, Eye, EyeOff, GripVertical, Type, Image as ImageIcon, Video, Box, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Reorder } from 'framer-motion';

export function LayersPanel({ activePageId }: { activePageId?: string | null }) {
    const {
        album,
        currentPageIndex,
        selectedAssetId,
        setSelectedAssetId,
        updateAsset,
        removeAsset,
        getSpread,
        updatePageAssets
    } = useAlbum();

    const [viewMode, setViewMode] = useState<'spread' | 'page'>('spread');
    const [activeSide, setActiveSide] = useState<'left' | 'right'>('left');

    if (!album) return null;

    const spreadPages = getSpread(currentPageIndex);

    // Sync active side when activePageId changes
    useEffect(() => {
        if (activePageId) {
            const index = spreadPages.findIndex(p => p.id === activePageId);
            if (index !== -1) {
                setActiveSide(index === 0 ? 'left' : 'right');
            }
        }
    }, [activePageId, spreadPages]);


    const toggleLock = (pageId: string, asset: Asset) => {
        updateAsset(pageId, asset.id, { isLocked: !asset.isLocked });
    };

    const toggleHide = (pageId: string, asset: Asset) => {
        updateAsset(pageId, asset.id, { isHidden: !asset.isHidden });
    };

    const handleRename = (pageId: string, asset: Asset, name: string) => {
        updateAsset(pageId, asset.id, { id_name: name });
    };

    return (
        <div className="flex flex-col h-full bg-transparent w-full overflow-hidden">
            <div className="flex items-center gap-4 px-4 py-2 border-b border-catalog-accent/5 bg-catalog-stone/5 h-auto shrink-0">
                <div className="flex flex-col gap-2 shrink-0 pr-4 border-r border-catalog-accent/10">
                    <h3 className="font-serif text-sm text-catalog-text flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5 text-catalog-accent" />
                        Layers
                    </h3>

                    {/* Page Navigation in Spread View */}
                    {viewMode === 'spread' && (
                        <div className="flex gap-1.5 ml-1">
                            <button
                                onClick={() => {
                                    document.getElementById('left-page-column')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                                }}
                                className="flex items-center justify-center w-7 h-7 bg-catalog-accent/10 hover:bg-catalog-accent/20 text-catalog-accent rounded-full transition-all hover:scale-110 active:scale-95"
                                title="Scroll to Left Page"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <button
                                onClick={() => {
                                    document.getElementById('right-page-column')?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
                                }}
                                className="flex items-center justify-center w-7 h-7 bg-catalog-accent/10 hover:bg-catalog-accent/20 text-catalog-accent rounded-full transition-all hover:scale-110 active:scale-95"
                                title="Scroll to Right Page"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}
                </div>

                {/* View Switcher */}
                <div className="flex p-0.5 bg-catalog-stone/20 rounded-md shrink-0">
                    <button
                        onClick={() => setViewMode('spread')}
                        className={cn(
                            "px-3 py-1 text-[8px] font-bold uppercase tracking-widest rounded transition-all",
                            viewMode === 'spread' ? "bg-white shadow-sm text-catalog-accent" : "text-catalog-text/40"
                        )}
                    >
                        Spread
                    </button>
                    <button
                        onClick={() => setViewMode('page')}
                        className={cn(
                            "px-3 py-1 text-[8px] font-bold uppercase tracking-widest rounded transition-all",
                            viewMode === 'page' ? "bg-white shadow-sm text-catalog-accent" : "text-catalog-text/40"
                        )}
                    >
                        Page
                    </button>
                </div>

                {viewMode === 'page' && (
                    <div className="flex gap-1 shrink-0 px-2 border-l border-catalog-accent/10">
                        <button
                            onClick={() => setActiveSide('left')}
                            className={cn(
                                "px-3 py-1 text-[7px] font-bold border rounded transition-all",
                                activeSide === 'left' ? "border-catalog-accent bg-catalog-accent/5 text-catalog-accent" : "border-catalog-accent/10 text-catalog-text/40"
                            )}
                        >
                            Left
                        </button>
                        <button
                            onClick={() => setActiveSide('right')}
                            className={cn(
                                "px-3 py-1 text-[7px] font-bold border rounded transition-all",
                                activeSide === 'right' ? "border-catalog-accent bg-catalog-accent/5 text-catalog-accent" : "border-catalog-accent/10 text-catalog-text/40"
                            )}
                        >
                            Right
                        </button>
                    </div>
                )}

                <div className="flex-1" />

                <p className="text-[8px] text-gray-400 uppercase tracking-[0.2em] italic shrink-0">
                    Drag elements to reorder depth
                </p>
            </div>

            <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 py-2 scrollbar-thin scrollbar-thumb-catalog-accent/20 scrollbar-track-transparent">
                <div className="flex h-full gap-6 items-start min-w-max pb-2">
                    {viewMode === 'spread' ? (
                        <>
                            {spreadPages.map((page, pIdx) => {
                                const sortedAssets = [...page.assets].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));

                                const handleReorder = (newOrder: Asset[]) => {
                                    const updatedWithZ = newOrder.map((asset, idx) => ({
                                        ...asset,
                                        zIndex: newOrder.length - idx
                                    }));
                                    updatePageAssets(page.id, updatedWithZ);
                                };

                                return (
                                    <div
                                        key={page.id}
                                        id={pIdx === 0 ? 'left-page-column' : 'right-page-column'}
                                        className={cn(
                                            "flex flex-col h-full min-w-[240px] w-[280px] border-r border-catalog-accent/10 pr-4 last:border-r-0 shrink-0 transition-colors",
                                            page.id === activePageId && "bg-catalog-accent/5 ring-1 ring-inset ring-catalog-accent/20"
                                        )}
                                    >
                                        <div className="px-2 py-1.5 mb-2 text-[9px] font-bold text-catalog-accent uppercase tracking-widest border-b border-catalog-accent/10 bg-catalog-stone/5 rounded-sm">
                                            {page.layoutTemplate === 'cover-front' ? '📖 Cover' : (pIdx === 0 ? '📄 Left Page' : '📄 Right Page')}
                                        </div>
                                        <Reorder.Group axis="y" values={sortedAssets} onReorder={handleReorder} className="space-y-1.5 overflow-y-auto pr-1 flex-1 content-scrollbar">
                                            {sortedAssets.map((asset) => (
                                                <LayerItem
                                                    key={asset.id}
                                                    asset={asset}
                                                    pageId={page.id}
                                                    isSelected={selectedAssetId === asset.id}
                                                    onSelect={() => setSelectedAssetId(asset.id)}
                                                    onToggleLock={() => toggleLock(page.id, asset)}
                                                    onToggleHide={() => toggleHide(page.id, asset)}
                                                    onRename={(name) => handleRename(page.id, asset, name)}
                                                    onRemove={() => removeAsset(page.id, asset.id)}
                                                />
                                            ))}
                                            {sortedAssets.length === 0 && (
                                                <div className="py-4 text-center text-catalog-text/20 italic text-[10px]">
                                                    No assets
                                                </div>
                                            )}
                                        </Reorder.Group>
                                    </div>
                                );
                            })}
                        </>
                    ) : (
                        <div className="flex h-full">
                            {spreadPages.filter((_, i) => (activeSide === 'left' ? i === 0 : i === 1)).map(page => {
                                const sortedAssets = [...page.assets].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
                                return (
                                    <Reorder.Group key={page.id} axis="y" values={sortedAssets} onReorder={(newOrder) => {
                                        const updatedWithZ = newOrder.map((asset, idx) => ({ ...asset, zIndex: newOrder.length - idx }));
                                        updatePageAssets(page.id, updatedWithZ);
                                    }} className="space-y-1 overflow-y-auto pr-1 flex-1 content-scrollbar min-w-[240px]">
                                        {sortedAssets.map(asset => (
                                            <LayerItem
                                                key={asset.id}
                                                asset={asset}
                                                pageId={page.id}
                                                isSelected={selectedAssetId === asset.id}
                                                onSelect={() => setSelectedAssetId(asset.id)}
                                                onToggleLock={() => toggleLock(page.id, asset)}
                                                onToggleHide={() => toggleHide(page.id, asset)}
                                                onRename={(name) => handleRename(page.id, asset, name)}
                                                onRemove={() => removeAsset(page.id, asset.id)}
                                            />
                                        ))}
                                        {page.assets.length === 0 && (
                                            <div className="py-8 text-center text-catalog-text/20 italic text-[10px]">
                                                Empty side
                                            </div>
                                        )}
                                    </Reorder.Group>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

interface LayerItemProps {
    asset: Asset;
    pageId: string;
    isSelected: boolean;
    onSelect: () => void;
    onToggleLock: () => void;
    onToggleHide: () => void;
    onRename: (name: string) => void;
    onRemove: () => void;
}

function LayerItem({ asset, isSelected, onSelect, onToggleLock, onToggleHide, onRename, onRemove }: LayerItemProps) {
    return (
        <Reorder.Item
            value={asset}
            dragListener={!asset.isLocked}
            onClick={onSelect}
            className={cn(
                "group flex items-center gap-2 p-1.5 rounded-lg border transition-all cursor-pointer bg-white",
                isSelected
                    ? "bg-catalog-accent/5 border-catalog-accent/30 shadow-sm"
                    : "border-transparent hover:bg-gray-50 hover:border-gray-200",
                asset.isLocked && "opacity-75 cursor-default"
            )}
        >
            <GripVertical className={cn(
                "w-3 h-3 text-gray-300 group-hover:text-gray-400",
                asset.isLocked ? "opacity-0" : "cursor-grab active:cursor-grabbing"
            )} />

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {asset.type === 'text' && <Type className="w-3 h-3 text-catalog-text/60" />}
                    {asset.type === 'image' && <ImageIcon className="w-3 h-3 text-catalog-text/60" />}
                    {asset.type === 'video' && <Video className="w-3 h-3 text-catalog-text/60" />}
                    {asset.type === 'frame' && <Box className="w-3 h-3 text-catalog-accent/60" />}
                    {(asset.type === 'sticker' || asset.type === 'shape') && <Box className="w-3 h-3 text-catalog-text/60" />}

                    <input
                        className="bg-transparent border-none p-0 text-[11px] font-medium text-catalog-text focus:ring-0 w-full outline-none"
                        value={asset.id_name || `${asset.type.charAt(0).toUpperCase() + asset.type.slice(1)}`}
                        onChange={(e) => onRename(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        disabled={asset.isLocked}
                    />
                </div>
            </div>

            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleHide(); }}
                    className={cn("p-1 rounded hover:bg-gray-200 transition-colors", asset.isHidden ? "text-red-500 opacity-100" : "text-gray-400")}
                >
                    {asset.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onToggleLock(); }}
                    className={cn("p-1 rounded hover:bg-gray-200 transition-colors", asset.isLocked ? "text-orange-500 opacity-100" : "text-gray-400")}
                >
                    {asset.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); if (confirm('Delete layer?')) onRemove(); }}
                    className="p-1 rounded hover:bg-red-50 text-gray-200 hover:text-red-500 transition-colors"
                >
                    <Trash2 className="w-3 h-3" />
                </button>
            </div>
        </Reorder.Item>
    );
}

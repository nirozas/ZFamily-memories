import React, { useState, useRef } from 'react';
import { ImageIcon, Trash2, Maximize2, Move } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { storageService } from '../../services/storage';

interface EventAsset {
    id: string;
    type: 'image' | 'video';
    url: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

interface EventBodyEditorProps {
    content: any;
    onChange: (content: any) => void;
}

export function EventBodyEditor({ content, onChange }: EventBodyEditorProps) {
    const assets: EventAsset[] = content?.assets || [];
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleAddAsset = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { url, error } = await storageService.uploadFile(file, 'event-assets');
            if (error) throw new Error(error);

            if (url) {
                const newAsset: EventAsset = {
                    id: Math.random().toString(36).substring(2, 9),
                    type,
                    url,
                    x: 50 + Math.random() * 50,
                    y: 50 + Math.random() * 50,
                    width: 200,
                    height: 150,
                };
                onChange({ ...content, assets: [...assets, newAsset] });
            }
        } catch (err) {
            alert('Upload failed');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const updateAsset = (id: string, updates: Partial<EventAsset>) => {
        const newAssets = assets.map(a => a.id === id ? { ...a, ...updates } : a);
        onChange({ ...content, assets: newAssets });
    };

    const removeAsset = (id: string) => {
        const newAssets = assets.filter(a => a.id !== id);
        onChange({ ...content, assets: newAssets });
        if (selectedId === id) setSelectedId(null);
    };

    // Very basic drag-and-drop for the even editor
    const handleDragStart = (e: React.MouseEvent, id: string) => {
        e.preventDefault();
        setSelectedId(id);
        const asset = assets.find(a => a.id === id);
        if (!asset || !containerRef.current) return;

        const startX = e.clientX;
        const startY = e.clientY;
        const initialX = asset.x;
        const initialY = asset.y;

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const dx = moveEvent.clientX - startX;
            const dy = moveEvent.clientY - startY;
            updateAsset(id, { x: initialX + dx, y: initialY + dy });
        };

        const handleMouseUp = () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <input
                    type="file"
                    className="hidden"
                    ref={fileInputRef}
                    accept="image/*,video/*"
                    onChange={(e) => handleAddAsset(e, e.target.files?.[0]?.type.startsWith('video') ? 'video' : 'image')}
                />
                <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    isLoading={isUploading}
                >
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Add Media to Story
                </Button>
            </div>

            <div
                ref={containerRef}
                className="relative w-full h-[400px] bg-gray-50 border border-dashed border-catalog-accent/20 rounded-lg overflow-hidden flex items-center justify-center"
                onClick={() => setSelectedId(null)}
            >
                {assets.length === 0 && !isUploading && (
                    <p className="text-sm text-catalog-text/40 font-serif italic">
                        Arrange your photos and videos here...
                    </p>
                )}

                {assets.map((asset) => (
                    <div
                        key={asset.id}
                        className={cn(
                            "absolute cursor-move group transition-shadow hover:shadow-lg",
                            selectedId === asset.id ? "ring-2 ring-catalog-accent" : ""
                        )}
                        style={{
                            left: asset.x,
                            top: asset.y,
                            width: asset.width,
                            height: asset.height,
                        }}
                        onMouseDown={(e) => handleDragStart(e, asset.id)}
                    >
                        {asset.type === 'image' ? (
                            <img src={asset.url} className="w-full h-full object-cover" alt="" />
                        ) : (
                            <video src={asset.url} className="w-full h-full object-cover" />
                        )}

                        {selectedId === asset.id && (
                            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-white shadow-md rounded-full px-2 py-1 flex items-center gap-1 border border-catalog-accent/10">
                                <button
                                    onClick={(e) => { e.stopPropagation(); removeAsset(asset.id); }}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-full"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <div className="w-px h-3 bg-gray-200" />
                                <div className="p-1 text-catalog-text/40">
                                    <Move className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        )}

                        {/* Simple Resize Handle */}
                        {selectedId === asset.id && (
                            <div
                                className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center text-catalog-accent"
                                onMouseDown={(e) => {
                                    e.stopPropagation();
                                    const startX = e.clientX;
                                    const startWidth = asset.width;
                                    const startHeight = asset.height;

                                    const handleResizeMove = (moveEvent: MouseEvent) => {
                                        const dx = moveEvent.clientX - startX;
                                        const ratio = startHeight / startWidth;
                                        updateAsset(asset.id, {
                                            width: Math.max(50, startWidth + dx),
                                            height: Math.max(50, startHeight + dx * ratio)
                                        });
                                    };

                                    const handleResizeUp = () => {
                                        window.removeEventListener('mousemove', handleResizeMove);
                                        window.removeEventListener('mouseup', handleResizeUp);
                                    };

                                    window.addEventListener('mousemove', handleResizeMove);
                                    window.addEventListener('mouseup', handleResizeUp);
                                }}
                            >
                                <Maximize2 className="w-4 h-4 rotate-90" />
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

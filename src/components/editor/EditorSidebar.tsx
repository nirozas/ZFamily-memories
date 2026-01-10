import { Image, Palette, Sparkles, Shapes, Type, Video, StickyNote, Frame } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useState, useRef } from 'react';

const tabs = [
    { id: 'templates', label: 'Templates', icon: Shapes },
    { id: 'media', label: 'Media', icon: Image },
    { id: 'text', label: 'Text', icon: Type },
    { id: 'decorations', label: 'Decor', icon: Palette },
    { id: 'stamps', label: 'Stamps', icon: StickyNote },
    { id: 'ai', label: 'AI Tools', icon: Sparkles },
] as const;

type TabId = typeof tabs[number]['id'];

const templateLayouts = [
    { id: '1-image', label: '1 Image', slots: 1 },
    { id: '2-image', label: '2 Images', slots: 2 },
    { id: '3-image', label: '3 Images', slots: 3 },
    { id: '4-image', label: '4 Images', slots: 4 },
    { id: '6-image', label: '6 Images', slots: 6 },
    { id: 'freeform', label: 'Freeform', slots: 0 },
];

interface EditorSidebarProps {
    onSelectTemplate?: (templateId: string) => void;
    onAddAsset?: (type: 'image' | 'video' | 'text' | 'ribbon' | 'frame' | 'stamp', url?: string) => void;
    onApplyFilter?: (filter: 'cartoon' | 'pencil' | 'watercolor' | 'portrait' | 'auto-touch') => void;
}

export function EditorSidebar({ onSelectTemplate, onAddAsset, onApplyFilter }: EditorSidebarProps) {
    const [activeTab, setActiveTab] = useState<TabId>('templates');
    const imageInputRef = useRef<HTMLInputElement>(null);
    const videoInputRef = useRef<HTMLInputElement>(null);
    const frameInputRef = useRef<HTMLInputElement>(null);
    const ribbonInputRef = useRef<HTMLInputElement>(null);

    const [isUploading, setIsUploading] = useState(false);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video' | 'frame' | 'ribbon') => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const { storageService } = await import('../../services/storage');
            const { url, error } = await storageService.uploadFile(file, 'album-assets');

            if (error) {
                alert('Upload failed: ' + error);
                return;
            }

            if (url && onAddAsset) {
                onAddAsset(type, url);
            }
        } catch (err) {
            console.error('File selection error:', err);
        } finally {
            setIsUploading(false);
            // Reset input
            e.target.value = '';
        }
    };

    return (
        <aside className="w-64 bg-white border-r border-catalog-accent/20 flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-catalog-accent/20">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "flex-1 py-3 px-2 text-xs font-medium transition-colors flex flex-col items-center gap-1",
                            activeTab === tab.id
                                ? "bg-catalog-accent/10 text-catalog-accent border-b-2 border-catalog-accent"
                                : "text-catalog-text/60 hover:bg-black/5"
                        )}
                    >
                        <tab.icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {activeTab === 'templates' && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-catalog-text uppercase tracking-wide">Page Layouts</h3>
                        <div className="grid grid-cols-2 gap-2">
                            {templateLayouts.map((layout) => (
                                <button
                                    key={layout.id}
                                    onClick={() => onSelectTemplate?.(layout.id)}
                                    className="aspect-[4/3] border border-catalog-accent/30 rounded-sm hover:border-catalog-accent hover:bg-catalog-accent/5 transition-colors flex flex-col items-center justify-center gap-1 p-2"
                                >
                                    <div className="text-lg font-bold text-catalog-accent">{layout.slots || '∞'}</div>
                                    <span className="text-xs text-catalog-text/70">{layout.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'media' && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-catalog-text uppercase tracking-wide">Add Media</h3>

                        <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            ref={imageInputRef}
                            onChange={(e) => handleFileSelect(e, 'image')}
                        />
                        <button
                            onClick={() => imageInputRef.current?.click()}
                            disabled={isUploading}
                            className={cn(
                                "w-full py-6 border-2 border-dashed border-catalog-accent/40 rounded-sm hover:border-catalog-accent hover:bg-catalog-accent/5 transition-colors flex flex-col items-center gap-2",
                                isUploading && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Image className={cn("w-8 h-8 text-catalog-accent", isUploading && "animate-pulse")} />
                            <span className="text-sm text-catalog-text/70">
                                {isUploading ? 'Uploading...' : 'Upload Image'}
                            </span>
                        </button>

                        <input
                            type="file"
                            accept="video/*"
                            className="hidden"
                            ref={videoInputRef}
                            onChange={(e) => handleFileSelect(e, 'video')}
                        />
                        <button
                            onClick={() => videoInputRef.current?.click()}
                            disabled={isUploading}
                            className={cn(
                                "w-full py-6 border-2 border-dashed border-catalog-accent/40 rounded-sm hover:border-catalog-accent hover:bg-catalog-accent/5 transition-colors flex flex-col items-center gap-2",
                                isUploading && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <Video className={cn("w-8 h-8 text-catalog-accent", isUploading && "animate-pulse")} />
                            <span className="text-sm text-catalog-text/70">
                                {isUploading ? 'Uploading...' : 'Upload Video'}
                            </span>
                        </button>
                    </div>
                )}

                {activeTab === 'text' && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-catalog-text uppercase tracking-wide">Text Styles</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => onAddAsset?.('text')}
                                className="w-full text-left p-3 border border-catalog-accent/20 rounded-sm hover:bg-catalog-accent/5 transition-colors"
                            >
                                <span className="text-2xl font-serif">Add Heading</span>
                            </button>
                            <button
                                onClick={() => onAddAsset?.('text')}
                                className="w-full text-left p-3 border border-catalog-accent/20 rounded-sm hover:bg-catalog-accent/5 transition-colors"
                            >
                                <span className="text-lg font-serif italic">Add Subtitle</span>
                            </button>
                            <button
                                onClick={() => onAddAsset?.('text')}
                                className="w-full text-left p-3 border border-catalog-accent/20 rounded-sm hover:bg-catalog-accent/5 transition-colors"
                            >
                                <span className="text-sm font-sans">Add Body Text</span>
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'decorations' && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-catalog-text uppercase tracking-wide">Decorations</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={ribbonInputRef}
                                onChange={(e) => handleFileSelect(e, 'ribbon')}
                            />
                            <button
                                onClick={() => ribbonInputRef.current?.click()}
                                disabled={isUploading}
                                className="aspect-[4/3] border border-catalog-accent/30 rounded-sm hover:border-catalog-accent hover:bg-catalog-accent/5 transition-colors flex flex-col items-center justify-center gap-1 p-2"
                            >
                                <StickyNote className={cn("w-8 h-8 text-red-500", isUploading && "animate-pulse")} />
                                <span className="text-xs text-catalog-text/70">Upload Ribbon</span>
                            </button>

                            <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                ref={frameInputRef}
                                onChange={(e) => handleFileSelect(e, 'frame')}
                            />
                            <button
                                onClick={() => frameInputRef.current?.click()}
                                disabled={isUploading}
                                className="aspect-[4/3] border border-catalog-accent/30 rounded-sm hover:border-catalog-accent hover:bg-catalog-accent/5 transition-colors flex flex-col items-center justify-center gap-1 p-2"
                            >
                                <Frame className={cn("w-8 h-8 text-catalog-accent", isUploading && "animate-pulse")} />
                                <span className="text-xs text-catalog-text/70">Upload Frame</span>
                            </button>
                        </div>
                        <div className="pt-4 border-t border-catalog-accent/10">
                            <button
                                onClick={() => {
                                    const url = prompt('Enter frame image URL:');
                                    if (url) onAddAsset?.('frame', url);
                                }}
                                className="w-full py-3 border border-dashed border-catalog-accent/40 rounded-sm hover:border-catalog-accent hover:bg-catalog-accent/5 transition-colors flex items-center justify-center gap-2"
                            >
                                <Frame className="w-4 h-4 text-catalog-accent" />
                                <span className="text-sm text-catalog-text/70">Upload Custom Frame</span>
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'stamps' && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-catalog-text uppercase tracking-wide">Family Stamps</h3>
                        <p className="text-xs text-catalog-text/60">Decorative archives & symbols</p>
                        <div className="grid grid-cols-3 gap-2">
                            {[
                                { name: 'Heraldry', url: 'https://img.icons8.com/color/96/heraldry.png' },
                                { name: 'Sealing Wax', url: 'https://img.icons8.com/color/96/sealing-wax.png' },
                                { name: 'Old Map', url: 'https://img.icons8.com/color/96/treasure-map.png' },
                                { name: 'Compass', url: 'https://img.icons8.com/color/96/compass.png' },
                                { name: 'Book', url: 'https://img.icons8.com/color/96/book.png' },
                                { name: 'Camera', url: 'https://img.icons8.com/color/96/vintage-camera.png' },
                                { name: 'Tree', url: 'https://img.icons8.com/color/96/family-tree.png' },
                                { name: 'Heart', url: 'https://img.icons8.com/color/96/filled-heart.png' },
                                { name: 'Star', url: 'https://img.icons8.com/color/96/star--v1.png' },
                            ].map((stamp) => (
                                <button
                                    key={stamp.name}
                                    onClick={() => onAddAsset?.('stamp', stamp.url)}
                                    className="aspect-square border border-catalog-accent/10 rounded-sm hover:border-catalog-accent hover:bg-catalog-accent/5 transition-all p-2 flex items-center justify-center group"
                                    title={stamp.name}
                                >
                                    <img src={stamp.url} alt={stamp.name} className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'ai' && (
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-catalog-text uppercase tracking-wide">AI Tools</h3>
                        <div className="grid grid-cols-1 gap-2">
                            <button
                                onClick={() => onApplyFilter?.('auto-touch')}
                                className="w-full text-left p-3 border border-catalog-accent/20 rounded-sm hover:bg-catalog-accent/5 transition-colors group"
                            >
                                <span className="text-sm font-medium flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-purple-500" />
                                    Auto Enhance
                                </span>
                                <p className="text-xs text-catalog-text/60 mt-1 pl-6">Instant color & light correction</p>
                            </button>
                            <button
                                onClick={() => onApplyFilter?.('cartoon')}
                                className="w-full text-left p-3 border border-catalog-accent/20 rounded-sm hover:bg-catalog-accent/5 transition-colors group"
                            >
                                <span className="text-sm font-medium flex items-center gap-2">
                                    <Palette className="w-4 h-4 text-orange-500" />
                                    Cartoonify
                                </span>
                                <p className="text-xs text-catalog-text/60 mt-1 pl-6">Convert photo to cartoon style</p>
                            </button>
                            <button
                                onClick={() => onApplyFilter?.('watercolor')}
                                className="w-full text-left p-3 border border-catalog-accent/20 rounded-sm hover:bg-catalog-accent/5 transition-colors group"
                            >
                                <span className="text-sm font-medium flex items-center gap-2">
                                    <Image className="w-4 h-4 text-blue-500" />
                                    Watercolor
                                </span>
                                <p className="text-xs text-catalog-text/60 mt-1 pl-6">Artistic watercolor effect</p>
                            </button>
                            <button
                                onClick={() => onApplyFilter?.('pencil')}
                                className="w-full text-left p-3 border border-catalog-accent/20 rounded-sm hover:bg-catalog-accent/5 transition-colors group"
                            >
                                <span className="text-sm font-medium flex items-center gap-2">
                                    <Type className="w-4 h-4 text-gray-500" />
                                    Pencil Sketch
                                </span>
                                <p className="text-xs text-catalog-text/60 mt-1 pl-6">Classic charcoal sketch look</p>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
}

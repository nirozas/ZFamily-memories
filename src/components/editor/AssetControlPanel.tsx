import { useAlbum } from '../../contexts/AlbumContext';
import { Slider } from '../ui/Slider';
import {
    Layers,
    Trash2,
    Type,
    Image as ImageIcon,
    Sun,
    Contrast,
    Droplets,
    Box,
    RotateCw,
    ChevronDown,
    ChevronUp,
    Minimize2,
    Maximize2,
    Copy
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { type Asset } from '../../contexts/AlbumContext';
import { useState } from 'react';

interface AssetControlPanelProps {
    editorMode: 'select' | 'mask' | 'pivot';
    setEditorMode: (mode: 'select' | 'mask' | 'pivot') => void;
}

function CollapsibleSection({ title, children, defaultOpen = true, icon: Icon }: { title: string, children: React.ReactNode, defaultOpen?: boolean, icon?: any }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-catalog-accent/5 pb-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between py-2.5 px-1 hover:bg-catalog-stone/5 rounded transition-colors group"
            >
                <div className="flex items-center gap-2">
                    {Icon && <Icon className="w-3 h-3 text-catalog-accent/40 group-hover:text-catalog-accent transition-colors" />}
                    <span className="text-[10px] font-bold text-catalog-accent uppercase tracking-widest">{title}</span>
                </div>
                {isOpen ? <ChevronUp className="w-3 h-3 text-catalog-accent/30" /> : <ChevronDown className="w-3 h-3 text-catalog-accent/30" />}
            </button>
            {isOpen && <div className="space-y-4 pt-1 pb-2 px-1 animate-in fade-in slide-in-from-top-1 duration-200">{children}</div>}
        </div>
    );
}

export function AssetControlPanel({ editorMode, setEditorMode }: AssetControlPanelProps) {
    const { album, selectedAssetId, currentPageIndex, updateAsset, removeAsset, updatePage, syncStyles, updateAssetZIndex, duplicateAsset } = useAlbum();
    const [customDpi, setCustomDpi] = useState<string>('');

    let parentPage = album?.pages[currentPageIndex];
    let asset = parentPage?.assets.find((a: Asset) => a.id === selectedAssetId);

    if (album && selectedAssetId && !asset) {
        for (const p of album.pages) {
            const found = p.assets.find((a: Asset) => a.id === selectedAssetId);
            if (found) {
                parentPage = p;
                asset = found;
                break;
            }
        }
    }

    if (!album || !selectedAssetId || !asset) {
        // Page settings for the current page
        const currentPage = album?.pages[currentPageIndex];
        return (
            <div className="w-64 bg-white border-l border-catalog-accent/10 h-full overflow-y-auto hidden md:block">
                <div className="p-4 border-b border-catalog-accent/10 bg-catalog-stone/10">
                    <h3 className="font-serif text-lg text-catalog-text flex items-center gap-2">
                        Page Settings
                    </h3>
                </div>
                <div className="p-4 space-y-6">
                    {currentPage && (
                        <section className="space-y-4">
                            <label className="text-[10px] font-bold text-catalog-accent uppercase tracking-widest">Page Background</label>

                            <div className="grid grid-cols-4 gap-2">
                                {[
                                    { name: 'White', value: '#ffffff' },
                                    { name: 'Red', value: '#ffadad' },
                                    { name: 'Orange', value: '#ffd6a5' },
                                    { name: 'Yellow', value: '#fdffb6' },
                                    { name: 'Green', value: '#caffbf' },
                                    { name: 'Blue', value: '#9bf6ff' },
                                    { name: 'Indigo', value: '#a0c4ff' },
                                    { name: 'Purple', value: '#bdb2ff' },
                                    { name: 'Pink', value: '#ffc6ff' },
                                    { name: 'Archive', value: '#fdfcfb' },
                                ].map((c) => (
                                    <button
                                        key={c.value}
                                        onClick={() => updatePage(currentPage.id, { backgroundColor: c.value })}
                                        className={cn(
                                            "w-full aspect-square rounded-full border-2 transition-all hover:scale-110 shadow-sm",
                                            currentPage.backgroundColor === c.value ? "border-catalog-accent scale-110 shadow-md" : "border-transparent"
                                        )}
                                        style={{ backgroundColor: c.value }}
                                        title={c.name}
                                    />
                                ))}
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-catalog-text/40 uppercase">Custom Color</label>
                                <input
                                    type="color"
                                    disabled={album.config.isLocked}
                                    value={currentPage.backgroundColor || '#ffffff'}
                                    onChange={(e) => updatePage(currentPage.id, { backgroundColor: e.target.value })}
                                    className="w-full h-8 border rounded p-0.5 cursor-pointer disabled:opacity-50"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between text-xs text-catalog-text/60">
                                    <span>Opacity</span>
                                    <span>{Math.round((currentPage.backgroundOpacity ?? 1) * 100)}%</span>
                                </div>
                                <Slider
                                    disabled={album.config.isLocked}
                                    value={[(currentPage.backgroundOpacity ?? 1) * 100]}
                                    min={0}
                                    max={100}
                                    onValueChange={(v: number[]) => updatePage(currentPage.id, { backgroundOpacity: v[0] / 100 })}
                                />
                            </div>
                            <div className="space-y-4 pt-4 border-t border-catalog-accent/10">
                                <label className="text-[10px] font-bold text-catalog-accent uppercase tracking-widest">Workspace tools</label>
                                <button
                                    disabled={album.config.isLocked}
                                    onClick={() => {
                                        if (confirm('Sync first inner page style to all pages?')) {
                                            syncStyles();
                                        }
                                    }}
                                    className="w-full py-2 bg-catalog-accent text-white rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:grayscale disabled:cursor-not-allowed"
                                >
                                    Style Sync
                                </button>
                                <p className="text-[10px] text-catalog-text/40 text-center italic">
                                    Apply orientation and size to all pages
                                </p>
                            </div>
                        </section>
                    )}

                    <div className="pt-8 border-t border-catalog-accent/10 text-center">
                        <Layers className="w-8 h-8 mx-auto mb-2 opacity-20 text-catalog-text" />
                        <p className="text-xs font-serif italic text-catalog-text/40">Select an element to edit properties</p>
                    </div>
                </div>
            </div>
        );
    }

    // We already found parentPage and asset above
    if (!parentPage || !asset) return null;

    const handleLayerChange = (direction: 'front' | 'back') => {
        updateAssetZIndex(parentPage!.id, asset!.id, direction);
    };

    const handleDelete = () => {
        if (window.confirm('Remove this element?')) {
            removeAsset(parentPage!.id, asset!.id);
        }
    };
    const applyDpi = (targetDpi: number) => {
        const sourceWidth = asset.originalDimensions?.width || asset.width;
        const sourceHeight = asset.originalDimensions?.height || asset.height;

        // Calculate new width: (Original Pixels) / (Target Dots Per Inch / base 96 dpi)
        const newWidth = sourceWidth / (targetDpi / 96);
        const ratio = asset.aspectRatio || (sourceWidth / sourceHeight);

        updateAsset(parentPage!.id, asset!.id, {
            width: newWidth,
            height: newWidth / ratio
        });
    };

    const handleAlign = (type: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom' | 'fit') => {
        const { width: w, height: h } = album?.config?.dimensions || { width: 800, height: 600 };
        const bleed = album?.config?.dimensions?.bleed || 0;

        let newX = asset.x;
        let newY = asset.y;
        let newWidth = asset.width;
        let newHeight = asset.height;

        switch (type) {
            case 'left': newX = bleed; break;
            case 'center': newX = (w - asset.width) / 2; break;
            case 'right': newX = w - asset.width - bleed; break;
            case 'top': newY = bleed; break;
            case 'middle': newY = (h - asset.height) / 2; break;
            case 'bottom': newY = h - asset.height - bleed; break;
            case 'fit':
                newX = 0;
                newY = 0;
                newWidth = w;
                newHeight = h;
                break;
        }

        updateAsset(parentPage!.id, asset!.id, { x: newX, y: newY, width: newWidth, height: newHeight });
    };

    return (
        <div className="w-64 bg-white border-l border-catalog-accent/10 flex flex-col h-full overflow-y-auto content-scrollbar">
            <div className="p-4 border-b border-catalog-accent/10 bg-catalog-stone/10 sticky top-0 z-10 backdrop-blur-sm">
                <h3 className="font-serif text-lg text-catalog-text flex items-center gap-2">
                    {asset.type === 'image' && <ImageIcon className="w-4 h-4" />}
                    {asset.type === 'video' && <ImageIcon className="w-4 h-4" />}
                    {asset.type === 'text' && <Type className="w-4 h-4" />}
                    Properties
                </h3>
            </div>

            <div className="p-4 space-y-2">
                {editorMode !== 'select' && (
                    <div className="p-3 bg-catalog-accent/5 border border-catalog-accent/20 rounded-lg space-y-2 mb-4">
                        <p className="text-[9px] font-bold text-catalog-accent uppercase tracking-widest text-center">
                            Editing {editorMode}
                        </p>
                        <button
                            className="w-full py-2 bg-catalog-accent text-white rounded shadow-sm text-[10px] font-bold uppercase tracking-widest hover:bg-catalog-accent/90 transition-colors"
                            onClick={() => setEditorMode('select')}
                        >
                            Done Editing
                        </button>
                    </div>
                )}

                <button
                    disabled={album.config.isLocked}
                    onClick={() => syncStyles(asset)}
                    className="w-full py-2 bg-catalog-accent/10 border border-catalog-accent/30 text-catalog-accent rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-catalog-accent/20 transition-all flex items-center justify-center gap-2 mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Layers className="w-3 h-3" /> Sync Style Globally
                </button>

                <CollapsibleSection title="Transformation" icon={Box}>
                    <div className="space-y-4">
                        {/* Precise Positioning & Sizing */}
                        <div className="grid grid-cols-2 gap-3 pb-2 border-b border-catalog-accent/5">
                            <div className="space-y-1">
                                <label className="text-[9px] text-gray-400 capitalize">Position X</label>
                                <input
                                    type="number"
                                    disabled={album.config.isLocked}
                                    value={Math.round(asset.x)}
                                    onChange={(e) => updateAsset(parentPage!.id, asset!.id, { x: parseInt(e.target.value) || 0 })}
                                    className="w-full px-2 py-1 text-xs border rounded font-mono disabled:opacity-50"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] text-gray-400 capitalize">Position Y</label>
                                <input
                                    type="number"
                                    disabled={album.config.isLocked}
                                    value={Math.round(asset.y)}
                                    onChange={(e) => updateAsset(parentPage!.id, asset!.id, { y: parseInt(e.target.value) || 0 })}
                                    className="w-full px-2 py-1 text-xs border rounded font-mono disabled:opacity-50"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] text-gray-400 capitalize">Width</label>
                                <input
                                    type="number"
                                    disabled={album.config.isLocked}
                                    value={Math.round(asset.width)}
                                    onChange={(e) => updateAsset(parentPage!.id, asset!.id, { width: parseInt(e.target.value) || 0 })}
                                    className="w-full px-2 py-1 text-xs border rounded font-mono disabled:opacity-50"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[9px] text-gray-400 capitalize">Height</label>
                                <input
                                    type="number"
                                    disabled={album.config.isLocked}
                                    value={Math.round(asset.height)}
                                    onChange={(e) => updateAsset(parentPage!.id, asset!.id, { height: parseInt(e.target.value) || 0 })}
                                    className="w-full px-2 py-1 text-xs border rounded font-mono disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                disabled={album.config.isLocked}
                                onClick={() => updateAsset(parentPage!.id, asset!.id, { flipX: !asset.flipX })}
                                className={cn("p-2 text-xs border rounded hover:bg-gray-50 flex items-center justify-center gap-1 disabled:opacity-50", asset.flipX && "bg-catalog-accent/10 border-catalog-accent")}
                                title="Flip Horizontal"
                            >
                                <span className="scale-x-[-1]">F</span> Flip H
                            </button>
                            <button
                                disabled={album.config.isLocked}
                                onClick={() => updateAsset(parentPage!.id, asset!.id, { flipY: !asset.flipY })}
                                className={cn("p-2 text-xs border rounded hover:bg-gray-50 flex items-center justify-center gap-1 disabled:opacity-50", asset.flipY && "bg-catalog-accent/10 border-catalog-accent")}
                                title="Flip Vertical"
                            >
                                <span className="scale-y-[-1]">F</span> Flip V
                            </button>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-catalog-text/60">
                                <span>Opacity</span>
                                <span>{asset.opacity ?? 100}%</span>
                            </div>
                            <Slider
                                disabled={album.config.isLocked}
                                value={[asset.opacity ?? 100]}
                                min={0}
                                max={100}
                                onValueChange={(v: number[]) => updateAsset(parentPage!.id, asset!.id, { opacity: v[0] })}
                            />
                        </div>

                        <div className="flex gap-2">
                            <button onClick={() => handleLayerChange('back')} className="flex-1 p-2 text-xs border rounded hover:bg-gray-50 uppercase font-bold text-[10px]">Back</button>
                            <button onClick={() => handleLayerChange('front')} className="flex-1 p-2 text-xs border rounded hover:bg-gray-50 uppercase font-bold text-[10px]">Front</button>
                        </div>

                        <button
                            disabled={album.config.isLocked}
                            onClick={() => {
                                if (parentPage && asset) duplicateAsset(parentPage.id, asset.id);
                            }}
                            className="w-full mt-2 p-2 border border-catalog-accent/20 rounded hover:bg-catalog-accent/5 text-[10px] font-bold uppercase tracking-widest text-catalog-accent flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Copy className="w-3.5 h-3.5" /> Duplicate Element
                        </button>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Rotation" icon={RotateCw} defaultOpen={false}>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-bold text-catalog-accent/40 uppercase tracking-widest px-1">Angle</label>
                            <button
                                onClick={() => updateAsset(parentPage!.id, asset!.id, { rotation: 0 })}
                                className="text-[9px] text-catalog-accent hover:underline font-bold"
                            >
                                Reset
                            </button>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <Slider
                                    disabled={album.config.isLocked}
                                    value={[asset.rotation || 0]}
                                    min={0}
                                    max={360}
                                    step={1}
                                    onValueChange={(v: number[]) => updateAsset(parentPage!.id, asset!.id, { rotation: v[0] })}
                                />
                            </div>
                            <div className="w-16 relative">
                                <input
                                    type="number"
                                    disabled={album.config.isLocked}
                                    value={Math.round(asset.rotation || 0)}
                                    onChange={(e) => updateAsset(parentPage!.id, asset!.id, { rotation: parseInt(e.target.value) || 0 })}
                                    className="w-full pl-2 pr-5 py-1 text-xs border rounded focus:ring-1 focus:ring-catalog-accent outline-none font-mono disabled:opacity-50"
                                />
                                <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-catalog-text/40">°</span>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                            {[0, 90, 180, 270].map(deg => (
                                <button
                                    key={deg}
                                    disabled={album.config.isLocked}
                                    onClick={() => updateAsset(parentPage!.id, asset!.id, { rotation: deg })}
                                    className={cn(
                                        "py-1 text-[9px] border rounded hover:bg-gray-50 transition-colors font-bold disabled:opacity-50",
                                        (asset.rotation || 0) === deg && "bg-catalog-accent/5 border-catalog-accent/30 text-catalog-accent"
                                    )}
                                >
                                    {deg}°
                                </button>
                            ))}
                        </div>
                    </div>
                </CollapsibleSection>

                <CollapsibleSection title="Alignment" icon={Maximize2} defaultOpen={false}>
                    <div className="grid grid-cols-3 gap-1">
                        {['left', 'center', 'right', 'top', 'middle', 'bottom'].map((align) => (
                            <button
                                key={align}
                                disabled={album.config.isLocked}
                                onClick={() => handleAlign(align as any)}
                                className="p-1.5 text-[10px] border rounded hover:bg-gray-50 uppercase tracking-tighter font-medium text-catalog-text/70 transition-all hover:border-catalog-accent/30 disabled:opacity-50 disabled:grayscale"
                            >
                                {align}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => handleAlign('fit')}
                        className="w-full mt-2 p-2 bg-catalog-accent/5 border border-catalog-accent/20 rounded text-[10px] font-bold uppercase tracking-widest text-catalog-accent hover:bg-catalog-accent hover:text-white transition-all flex items-center justify-center gap-2"
                    >
                        <Maximize2 className="w-3.5 h-3.5" /> Fit to Full Page
                    </button>
                </CollapsibleSection>

                <CollapsibleSection title="Pivot Point" icon={Box} defaultOpen={false}>
                    <div className="flex gap-4">
                        <div className="flex-1 space-y-1">
                            <span className="text-[8px] text-gray-500 uppercase font-bold">X: {Math.round((asset.pivot?.x ?? 0.5) * 100)}%</span>
                            <Slider
                                disabled={album.config.isLocked}
                                value={[(asset.pivot?.x ?? 0.5) * 100]}
                                min={0} max={100}
                                onValueChange={([v]) => updateAsset(parentPage!.id, asset!.id, { pivot: { ...asset.pivot, x: v / 100, y: asset.pivot?.y ?? 0.5 } })}
                            />
                        </div>
                        <div className="flex-1 space-y-1">
                            <span className="text-[8px] text-gray-500 uppercase font-bold">Y: {Math.round((asset.pivot?.y ?? 0.5) * 100)}%</span>
                            <Slider
                                disabled={album.config.isLocked}
                                value={[(asset.pivot?.y ?? 0.5) * 100]}
                                min={0} max={100}
                                onValueChange={([v]) => updateAsset(parentPage!.id, asset!.id, { pivot: { ...asset.pivot, y: v / 100, x: asset.pivot?.x ?? 0.5 } })}
                            />
                        </div>
                    </div>
                    <button
                        disabled={album.config.isLocked}
                        onClick={() => setEditorMode(editorMode === 'pivot' ? 'select' : 'pivot')}
                        className={cn(
                            "w-full mt-2 p-2 text-[10px] border rounded hover:bg-gray-50 flex items-center justify-center gap-2 font-bold transition-all disabled:opacity-50 disabled:grayscale",
                            editorMode === 'pivot' && "bg-catalog-accent text-white border-catalog-accent"
                        )}
                    >
                        <Box className="w-3 h-3" /> {editorMode === 'pivot' ? 'Cancel Pivot Edit' : 'Set Pivot Manually'}
                    </button>
                </CollapsibleSection>

                <CollapsibleSection title="Image Quality (DPI)" icon={Sun} defaultOpen={false}>
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-[10px] font-bold text-catalog-text/40 uppercase tracking-widest">Resolution</label>
                        {asset.originalDimensions && (
                            <span className={cn(
                                "text-[9px] font-bold px-1.5 py-0.5 rounded",
                                (Math.round((asset.originalDimensions.width || 0) / (asset.width / 96))) < 150 ? "text-red-600 bg-red-50" : "text-green-600 bg-green-50"
                            )}>
                                {Math.round((asset.originalDimensions.width || 0) / (asset.width / 96))} DPI
                            </span>
                        )}
                    </div>

                    <div className="bg-catalog-stone/10 p-2 rounded text-[10px] space-y-1 font-mono mb-3">
                        <div className="flex justify-between">
                            <span className="text-catalog-text/40 lowercase">original:</span>
                            <span>{asset.originalDimensions?.width} × {asset.originalDimensions?.height} px</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-catalog-text/40 lowercase">current:</span>
                            <span>{Math.round(asset.width)} × {Math.round(asset.height)} px</span>
                        </div>
                    </div>

                    <div className="space-y-2 mb-4 p-2 bg-catalog-accent/5 rounded border border-catalog-accent/10">
                        <label className="text-[9px] font-bold text-catalog-accent uppercase tracking-widest">Manual DPI</label>
                        <div className="flex gap-1">
                            <input
                                type="number"
                                value={customDpi}
                                onChange={(e) => setCustomDpi(e.target.value)}
                                placeholder="300"
                                className="flex-1 px-2 py-1 text-xs border rounded outline-none focus:ring-1 focus:ring-catalog-accent"
                            />
                            <button
                                disabled={album.config.isLocked}
                                onClick={() => {
                                    const val = parseInt(customDpi);
                                    if (val > 0) applyDpi(val);
                                }}
                                className="px-3 py-1 bg-catalog-accent text-white rounded text-[10px] font-bold uppercase transition-all hover:shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Apply
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {[300, 600].map(dpi => (
                            <button
                                key={dpi}
                                disabled={album.config.isLocked}
                                onClick={() => applyDpi(dpi)}
                                className="p-2 text-[9px] border border-catalog-accent/20 rounded hover:bg-catalog-accent hover:text-white transition-all uppercase font-bold disabled:opacity-50"
                            >
                                {dpi} DPI
                            </button>
                        ))}
                        <button
                            disabled={album.config.isLocked}
                            onClick={() => updateAsset(parentPage!.id, asset!.id, {
                                width: asset.originalDimensions?.width || asset.width,
                                height: asset.originalDimensions?.height || asset.height
                            })}
                            className="p-2 text-[9px] border border-catalog-accent/20 rounded hover:bg-catalog-accent hover:text-white transition-all uppercase font-bold disabled:opacity-50"
                        >
                            Native Pixels
                        </button>
                        <button
                            disabled={album.config.isLocked}
                            onClick={() => {
                                const pageWidth = album.config.dimensions.width;
                                const ratio = asset.aspectRatio || (asset.width / asset.height);
                                updateAsset(parentPage!.id, asset!.id, { width: pageWidth, height: pageWidth / ratio, x: 0, y: 0 });
                            }}
                            className="p-2 text-[9px] border border-catalog-accent/20 rounded hover:bg-catalog-accent hover:text-white transition-all uppercase font-bold disabled:opacity-50"
                        >
                            Full Width
                        </button>
                    </div>
                </CollapsibleSection>

                {asset.type === 'image' && (
                    <CollapsibleSection title="Crop & Framing" icon={Minimize2} defaultOpen={false}>
                        <div className="space-y-2">
                            <div className="flex justify-between text-[10px] text-catalog-accent font-bold uppercase pb-2 border-b border-catalog-accent/5">
                                <span>Page Coverage</span>
                                <span>{Math.round((asset.width / (album?.config?.dimensions?.width || 1000)) * 100)}%</span>
                            </div>

                            <div className="flex justify-between text-[10px] text-catalog-text/60 font-bold pt-2">
                                <span>Content Zoom</span>
                                <span>{Math.round((1 / (asset.crop?.width || 1)) * 100)}%</span>
                            </div>
                            <Slider
                                value={[Math.round((1 / (asset.crop?.width || 1)) * 100)]}
                                min={100}
                                max={400}
                                onValueChange={([v]) => {
                                    const zoom = v / 100;
                                    const size = 1 / zoom;
                                    const currentCrop = asset.crop || { x: 0, y: 0, width: 1, height: 1, zoom: 1 };
                                    updateAsset(parentPage!.id, asset!.id, {
                                        crop: { ...currentCrop, width: size, height: size, zoom }
                                    });
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <span className="text-[8px] text-gray-500 uppercase font-bold">Shift X</span>
                                <Slider
                                    value={[(asset.crop?.x || 0) * 100]}
                                    min={-100} max={100}
                                    onValueChange={([v]) => {
                                        const currentCrop = asset.crop || { x: 0, y: 0, width: 1, height: 1, zoom: 1 };
                                        updateAsset(parentPage!.id, asset!.id, { crop: { ...currentCrop, x: v / 100 } });
                                    }}
                                />
                            </div>
                            <div className="space-y-1">
                                <span className="text-[8px] text-gray-500 uppercase font-bold">Shift Y</span>
                                <Slider
                                    value={[(asset.crop?.y || 0) * 100]}
                                    min={-100} max={100}
                                    onValueChange={([v]) => {
                                        const currentCrop = asset.crop || { x: 0, y: 0, width: 1, height: 1, zoom: 1 };
                                        updateAsset(parentPage!.id, asset!.id, { crop: { ...currentCrop, y: v / 100 } });
                                    }}
                                />
                            </div>
                        </div>

                        <button
                            onClick={() => updateAsset(parentPage!.id, asset!.id, { crop: undefined })}
                            className="w-full py-1.5 text-[9px] text-catalog-text/40 border border-dotted rounded hover:border-catalog-accent hover:text-catalog-accent transition-colors uppercase font-bold"
                        >
                            Reset Content Crop
                        </button>
                    </CollapsibleSection>
                )}

                {(asset.type === 'image' || asset.type === 'video') && (
                    <CollapsibleSection title="Adjustments" icon={Sun} defaultOpen={false}>
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-catalog-text/60">
                                <span className="flex items-center gap-1"><Sun className="w-3 h-3" /> Brightness</span>
                                <span>{asset.brightness || 100}%</span>
                            </div>
                            <Slider
                                value={[asset.brightness || 100]}
                                min={0} max={200}
                                onValueChange={(v: number[]) => updateAsset(parentPage!.id, asset!.id, { brightness: v[0] })}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-catalog-text/60">
                                <span className="flex items-center gap-1"><Contrast className="w-3 h-3" /> Contrast</span>
                                <span>{asset.contrast || 100}%</span>
                            </div>
                            <Slider
                                value={[asset.contrast || 100]}
                                min={0} max={200}
                                onValueChange={(v: number[]) => updateAsset(parentPage!.id, asset!.id, { contrast: v[0] })}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-catalog-text/60">
                                <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> Saturation</span>
                                <span>{asset.saturate || 100}%</span>
                            </div>
                            <Slider
                                value={[asset.saturate || 100]}
                                min={0} max={200}
                                onValueChange={(v: number[]) => updateAsset(parentPage!.id, asset!.id, { saturate: v[0] })}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-catalog-text/60">
                                <span>Blur</span>
                                <span>{asset.blur || 0}px</span>
                            </div>
                            <Slider
                                value={[asset.blur || 0]}
                                min={0} max={20}
                                onValueChange={(v: number[]) => updateAsset(parentPage!.id, asset!.id, { blur: v[0] })}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-catalog-text/60">
                                <span>Sepia</span>
                                <span>{asset.sepia || 0}%</span>
                            </div>
                            <Slider
                                value={[asset.sepia || 0]}
                                min={0}
                                max={100}
                                onValueChange={(v: number[]) => updateAsset(parentPage!.id, asset!.id, { sepia: v[0] })}
                            />
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-xs text-catalog-text/60">
                                <span>Hue</span>
                                <span>{asset.hue || 0}°</span>
                            </div>
                            <Slider
                                value={[asset.hue || 0]}
                                min={-180}
                                max={180}
                                onValueChange={(v: number[]) => updateAsset(parentPage!.id, asset!.id, { hue: v[0] })}
                            />
                        </div>

                        <button
                            disabled={album.config.isLocked}
                            onClick={() => updateAsset(parentPage!.id, asset!.id, { brightness: 100, contrast: 100, saturate: 100, blur: 0, sepia: 0, hue: 0, filter: 'none' })}
                            className="w-full py-1.5 text-[10px] text-catalog-accent border border-catalog-accent/20 rounded hover:bg-catalog-accent hover:text-white transition-colors uppercase tracking-widest font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Reset Adjustments
                        </button>
                    </CollapsibleSection>
                )}

                <CollapsibleSection title="Filters" icon={Droplets} defaultOpen={false}>
                    <div className="grid grid-cols-3 gap-2">
                        {['none', 'vintage', 'matte', 'portrait', 'film', 'sketch'].map((f: string) => (
                            <button
                                key={f}
                                disabled={album.config.isLocked}
                                onClick={() => updateAsset(parentPage!.id, asset!.id, { filter: f })}
                                className={cn(
                                    "p-2 text-[10px] border rounded capitalize hover:bg-gray-50 transition-all disabled:opacity-50 disabled:grayscale",
                                    asset.filter === f ? "bg-catalog-accent text-white border-catalog-accent" : "text-catalog-text/60"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    {asset.filter !== 'none' && (
                        <div className="space-y-2 pt-2">
                            <div className="flex justify-between text-xs text-catalog-text/60 px-1">
                                <span>Intensity</span>
                                <span>{asset.filterIntensity ?? 100}%</span>
                            </div>
                            <Slider
                                value={[asset.filterIntensity ?? 100]}
                                min={0}
                                max={200}
                                onValueChange={(v: number[]) => updateAsset(parentPage!.id, asset!.id, { filterIntensity: v[0] })}
                            />
                        </div>
                    )}
                </CollapsibleSection>

                {asset.type === 'image' && (
                    <CollapsibleSection title="Vector Mask" icon={Box} defaultOpen={false}>
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] text-catalog-text/40 font-bold uppercase">Points Editor</span>
                            <button
                                onClick={() => setEditorMode(editorMode === 'mask' ? 'select' : 'mask')}
                                className={cn(
                                    "px-3 py-1.5 text-[9px] font-bold rounded border uppercase tracking-widest transition-all",
                                    editorMode === 'mask'
                                        ? "bg-catalog-accent text-white border-catalog-accent shadow-inner"
                                        : "text-catalog-accent border-catalog-accent/20 hover:bg-catalog-accent/5"
                                )}
                            >
                                {editorMode === 'mask' ? 'Exit Mask Mode' : 'Refine Points'}
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => updateAsset(parentPage!.id, asset!.id, {
                                    clipPoints: [{ x: 0, y: 0, type: 'linear' }, { x: 1, y: 0, type: 'linear' }, { x: 1, y: 1, type: 'linear' }, { x: 0, y: 1, type: 'linear' }]
                                })}
                                className="p-2 text-[10px] border rounded hover:bg-gray-50 flex items-center justify-center gap-1 transition-all"
                            >
                                <Box className="w-3 h-3" /> Rectangle (Corner)
                            </button>
                            <button
                                onClick={() => updateAsset(parentPage!.id, asset!.id, {
                                    clipPoints: [{ x: 0, y: 0.5, type: 'linear' }, { x: 0.5, y: 0, type: 'linear' }, { x: 1, y: 0.5, type: 'linear' }, { x: 0.5, y: 1, type: 'linear' }]
                                })}
                                className="p-2 text-[10px] border rounded hover:bg-gray-50 flex items-center justify-center gap-1 transition-all"
                            >
                                <Box className="w-3 h-3" /> Diamond
                            </button>
                            <button
                                onClick={() => {
                                    const points = [];
                                    for (let r = 0; r < 4; r++) {
                                        for (let c = 0; c < 4; c++) { points.push({ x: c / 3, y: r / 3, type: 'linear' as const }); }
                                    }
                                    updateAsset(parentPage!.id, asset!.id, { clipPoints: points });
                                }}
                                className="col-span-2 p-2 text-[10px] border rounded hover:bg-gray-50 flex items-center justify-center gap-1 font-bold transition-all text-catalog-accent"
                            >
                                <Box className="w-3 h-3" /> 16-Pt Precision Grid
                            </button>
                            <button
                                disabled={album.config.isLocked}
                                onClick={() => updateAsset(parentPage!.id, asset!.id, { clipPoints: undefined })}
                                className="col-span-2 p-2 text-[10px] border rounded hover:bg-red-50 text-red-500 font-bold uppercase tracking-widest transition-all disabled:opacity-50 disabled:grayscale"
                            >
                                Remove All Masking
                            </button>
                        </div>
                    </CollapsibleSection>
                )}

                {/* Text Styles */}
                {asset.type === 'text' && (
                    <CollapsibleSection title="Typography" icon={Type}>
                        <div className="space-y-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-catalog-text/40 uppercase">Font Family</label>
                                <select
                                    disabled={album.config.isLocked}
                                    value={asset.fontFamily || 'Inter'}
                                    onChange={(e) => updateAsset(parentPage!.id, asset!.id, { fontFamily: e.target.value })}
                                    className="w-full text-xs border rounded p-1.5 focus:ring-1 focus:ring-catalog-accent outline-none font-medium disabled:opacity-50"
                                >
                                    <option value="Inter">Modern Sans (Inter)</option>
                                    <option value="'Cormorant Garamond'">Classic Serif (Garamond)</option>
                                    <option value="'Playfair Display'">Elegant Serif (Playfair)</option>
                                    <option value="'Dancing Script'">Cursive (Dancing)</option>
                                    <option value="Montserrat">Geometric (Montserrat)</option>
                                    <option value="Outfit">Clean (Outfit)</option>
                                    <option value="cursive">Generic Cursive</option>
                                    <option value="serif">Generic Serif</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-catalog-text/40 uppercase">Size</label>
                                    <input
                                        type="number"
                                        value={asset.fontSize || 24}
                                        onChange={(e) => updateAsset(parentPage!.id, asset!.id, { fontSize: parseInt(e.target.value) })}
                                        className="w-full text-xs border rounded p-1.5 focus:ring-1 focus:ring-catalog-accent outline-none font-bold"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-catalog-text/40 uppercase">Weight</label>
                                    <select
                                        disabled={album.config.isLocked}
                                        value={asset.fontWeight || 'normal'}
                                        onChange={(e) => updateAsset(parentPage!.id, asset!.id, { fontWeight: e.target.value })}
                                        className="w-full text-xs border rounded p-1.5 focus:ring-1 focus:ring-catalog-accent outline-none disabled:opacity-50"
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="bold">Bold</option>
                                        <option value="900">Black</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] text-catalog-text/40 uppercase">Alignment</label>
                                <div className="flex border rounded overflow-hidden">
                                    {['left', 'center', 'right'].map((align) => (
                                        <button
                                            key={align}
                                            disabled={album.config.isLocked}
                                            onClick={() => updateAsset(parentPage!.id, asset!.id, { textAlign: align as any })}
                                            className={cn(
                                                "flex-1 p-1 text-xs hover:bg-gray-50 disabled:opacity-50",
                                                asset.textAlign === align && "bg-catalog-accent/10 font-bold"
                                            )}
                                        >
                                            {align[0].toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] text-catalog-text/40 uppercase">Color</label>
                                    <input
                                        type="color"
                                        value={asset.textColor || '#000000'}
                                        onChange={(e) => updateAsset(parentPage!.id, asset!.id, { textColor: e.target.value })}
                                        className="w-full h-8 border rounded p-0.5 cursor-pointer"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] text-catalog-text/40 uppercase">Tracking</label>
                                    <input
                                        type="number"
                                        value={asset.letterSpacing || 0}
                                        onChange={(e) => updateAsset(parentPage!.id, asset!.id, { letterSpacing: parseInt(e.target.value) })}
                                        className="w-full text-xs border rounded p-0.5 focus:ring-1 focus:ring-catalog-accent outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </CollapsibleSection>
                )}

                <div className="pt-6 border-t border-catalog-accent/10">
                    <button
                        onClick={handleDelete}
                        className="w-full py-2.5 flex items-center justify-center gap-2 text-red-500 hover:bg-red-50 rounded-xl transition-all text-xs font-bold uppercase tracking-widest border border-transparent hover:border-red-100"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remove Element
                    </button>
                </div>
            </div>
        </div>
    );
}

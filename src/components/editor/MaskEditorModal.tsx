import { useState } from 'react';
import { X, Check, Grid3X3, ImageIcon, Box } from 'lucide-react';
import type { Asset } from '../../contexts/AlbumContext';

interface MaskEditorModalProps {
    asset: Asset;
    pageId: string;
    updateAsset: (pageId: string, assetId: string, updates: Partial<Asset>) => void;
    onClose: () => void;
}

export function MaskEditorModal({ asset, pageId, updateAsset, onClose }: MaskEditorModalProps) {
    const [points, setPoints] = useState(() => {
        if (asset.clipPoints && asset.clipPoints.length > 0) return asset.clipPoints;
        // Default to a 16-point border grid for precision cropping
        const borderPoints = [
            { x: 0, y: 0, type: 'linear' as const }, { x: 0.25, y: 0, type: 'linear' as const }, { x: 0.5, y: 0, type: 'linear' as const }, { x: 0.75, y: 0, type: 'linear' as const },
            { x: 1, y: 0, type: 'linear' as const }, { x: 1, y: 0.25, type: 'linear' as const }, { x: 1, y: 0.5, type: 'linear' as const }, { x: 1, y: 0.75, type: 'linear' as const },
            { x: 1, y: 1, type: 'linear' as const }, { x: 0.75, y: 1, type: 'linear' as const }, { x: 0.5, y: 1, type: 'linear' as const }, { x: 0.25, y: 1, type: 'linear' as const },
            { x: 0, y: 1, type: 'linear' as const }, { x: 0, y: 0.75, type: 'linear' as const }, { x: 0, y: 0.5, type: 'linear' as const }, { x: 0, y: 0.25, type: 'linear' as const }
        ];
        return borderPoints;
    });

    const handleSave = () => {
        updateAsset(pageId, asset.id, { clipPoints: points });
        onClose();
    };

    const handleReset = () => {
        const borderPoints = [
            { x: 0, y: 0, type: 'linear' as const }, { x: 0.25, y: 0, type: 'linear' as const }, { x: 0.5, y: 0, type: 'linear' as const }, { x: 0.75, y: 0, type: 'linear' as const },
            { x: 1, y: 0, type: 'linear' as const }, { x: 1, y: 0.25, type: 'linear' as const }, { x: 1, y: 0.5, type: 'linear' as const }, { x: 1, y: 0.75, type: 'linear' as const },
            { x: 1, y: 1, type: 'linear' as const }, { x: 0.75, y: 1, type: 'linear' as const }, { x: 0.5, y: 1, type: 'linear' as const }, { x: 0.25, y: 1, type: 'linear' as const },
            { x: 0, y: 1, type: 'linear' as const }, { x: 0, y: 0.75, type: 'linear' as const }, { x: 0, y: 0.5, type: 'linear' as const }, { x: 0, y: 0.25, type: 'linear' as const }
        ];
        setPoints(borderPoints);
    };

    const generateGrid = () => {
        const borderPoints = [
            { x: 0, y: 0, type: 'linear' as const }, { x: 0.25, y: 0, type: 'linear' as const }, { x: 0.5, y: 0, type: 'linear' as const }, { x: 0.75, y: 0, type: 'linear' as const },
            { x: 1, y: 0, type: 'linear' as const }, { x: 1, y: 0.25, type: 'linear' as const }, { x: 1, y: 0.5, type: 'linear' as const }, { x: 1, y: 0.75, type: 'linear' as const },
            { x: 1, y: 1, type: 'linear' as const }, { x: 0.75, y: 1, type: 'linear' as const }, { x: 0.5, y: 1, type: 'linear' as const }, { x: 0.25, y: 1, type: 'linear' as const },
            { x: 0, y: 1, type: 'linear' as const }, { x: 0, y: 0.75, type: 'linear' as const }, { x: 0, y: 0.5, type: 'linear' as const }, { x: 0, y: 0.25, type: 'linear' as const }
        ];
        setPoints(borderPoints);
    };

    const getClipPath = () => {
        if (points.length < 3) return undefined;
        const pointsStr = points.map((p: any) => `${p.x * 100}% ${p.y * 100}%`).join(', ');
        return `polygon(${pointsStr})`;
    };

    const getSvgPath = () => {
        if (points.length < 2) return "";
        let path = `M ${points[0].x * 100} ${points[0].y * 100}`;
        for (let i = 1; i < points.length; i++) {
            path += ` L ${points[i].x * 100} ${points[i].y * 100}`;
        }
        path += " Z";
        return path;
    };

    const originalAspect = asset.originalDimensions
        ? asset.originalDimensions.width / asset.originalDimensions.height
        : (asset.aspectRatio || 1);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/95 backdrop-blur-2xl p-4 md:p-8 animate-in fade-in zoom-in-95 duration-300">
            <div className="bg-white w-full max-w-[95vw] h-full max-h-[95vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
                {/* Header */}
                <div className="flex items-center justify-between px-10 py-8 border-b border-catalog-accent/10 bg-catalog-stone/5">
                    <div className="flex items-center gap-6">
                        <div className="p-4 bg-catalog-accent/10 rounded-2xl shadow-inner">
                            <Grid3X3 className="w-8 h-8 text-catalog-accent" />
                        </div>
                        <div>
                            <h2 className="font-serif text-3xl text-catalog-text leading-tight">Precision Image Crop & Mask</h2>
                            <p className="text-[10px] text-catalog-text/50 uppercase tracking-[0.3em] font-black mt-1.5 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                16-Point Adaptive Vector System
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        <button
                            onClick={handleReset}
                            className="px-6 py-3 text-[11px] font-black uppercase tracking-[0.2em] text-red-500 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
                        >
                            Reset Grid
                        </button>
                        <button
                            onClick={onClose}
                            className="p-4 hover:bg-catalog-stone/20 rounded-full transition-all active:scale-90 border border-transparent hover:border-catalog-accent/10"
                        >
                            <X className="w-8 h-8 text-catalog-text/40" />
                        </button>
                    </div>
                </div>

                {/* Main Editor Area */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row bg-catalog-stone/10">
                    <div className="flex-1 relative flex items-center justify-center p-8 md:p-12 overflow-hidden bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
                        {/* The Media Container - Forced to original aspect ratio */}
                        <div
                            className="relative shadow-[0_48px_100px_-24px_rgba(0,0,0,0.5)] bg-white overflow-visible"
                            style={{
                                width: originalAspect >= 1 ? 'min(80vh * ' + originalAspect + ', calc(100% - 4rem))' : 'auto',
                                height: originalAspect < 1 ? 'min(80vh, 100%)' : 'auto',
                                aspectRatio: originalAspect,
                                maxHeight: '100%',
                            }}
                        >
                            {/* Base Media (Ghosted Full Dimensions) */}
                            {asset.type === 'video' ? (
                                <video
                                    src={asset.url}
                                    className="absolute inset-0 w-full h-full object-contain opacity-20 filter grayscale blur-[1px]"
                                    muted
                                    playsInline
                                    loop
                                    autoPlay
                                />
                            ) : (
                                <img
                                    src={asset.url}
                                    alt=""
                                    className="absolute inset-0 w-full h-full object-contain opacity-20 filter grayscale blur-[1px]"
                                    draggable={false}
                                />
                            )}

                            {/* Clipped Media (Selection) */}
                            {asset.type === 'video' ? (
                                <video
                                    src={asset.url}
                                    className="relative w-full h-full object-contain transition-opacity duration-300 shadow-2xl z-20"
                                    style={{ clipPath: getClipPath() }}
                                    muted
                                    playsInline
                                    loop
                                    autoPlay
                                />
                            ) : (
                                <img
                                    src={asset.url}
                                    alt=""
                                    className="relative w-full h-full object-contain transition-opacity duration-300 shadow-2xl z-20"
                                    style={{ clipPath: getClipPath() }}
                                    draggable={false}
                                />
                            )}

                            {/* SVG Overlay for decorative lines */}
                            <svg
                                className="absolute inset-0 w-full h-full pointer-events-none overflow-visible z-30 opacity-60"
                                viewBox="0 0 100 100"
                                preserveAspectRatio="none"
                            >
                                {points.length > 2 && (
                                    <path
                                        d={getSvgPath()}
                                        fill="transparent"
                                        stroke="#fbbf24"
                                        strokeWidth="0.3"
                                        strokeDasharray="1,1"
                                    />
                                )}
                            </svg>

                            {/* Control Points Layer */}
                            <div className="absolute inset-0 overflow-visible z-40">
                                {points.map((p: any, i: number) => (
                                    <div
                                        key={i}
                                        className="absolute w-6 h-6 -ml-3 -mt-3 bg-white border-2 border-catalog-accent rounded-full shadow-2xl cursor-move pointer-events-auto hover:scale-125 transition-all flex items-center justify-center active:scale-110 active:bg-catalog-accent hover:ring-8 ring-catalog-accent/20"
                                        style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
                                        onMouseDown={(e) => {
                                            e.preventDefault();
                                            const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
                                            const handleMove = (ev: MouseEvent) => {
                                                const nx = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                                                const ny = Math.max(0, Math.min(1, (ev.clientY - rect.top) / rect.height));
                                                const updated = [...points];
                                                updated[i] = { ...updated[i], x: nx, y: ny };
                                                setPoints(updated);
                                            };
                                            const handleUp = () => {
                                                window.removeEventListener('mousemove', handleMove);
                                                window.removeEventListener('mouseup', handleUp);
                                            };
                                            window.addEventListener('mousemove', handleMove);
                                            window.addEventListener('mouseup', handleUp);
                                        }}
                                    >
                                        <div className="w-1.5 h-1.5 bg-catalog-accent rounded-full group-active:bg-white" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Desktop Sidebar Controls */}
                    <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-catalog-accent/10 bg-white p-8 space-y-10 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.05)] overflow-y-auto">
                        <section className="space-y-4">
                            <h3 className="text-[10px] font-bold text-catalog-accent uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-catalog-accent" />
                                Presets
                            </h3>
                            <div className="space-y-3">
                                <button
                                    onClick={generateGrid}
                                    className="w-full py-4 px-5 bg-catalog-stone/5 border border-catalog-accent/10 rounded-2xl flex items-center gap-4 hover:border-catalog-accent hover:bg-catalog-accent hover:text-white hover:shadow-lg hover:-translate-y-1 transition-all group"
                                >
                                    <div className="p-2 bg-catalog-accent/10 rounded-lg group-hover:bg-white/20">
                                        <Grid3X3 className="w-5 h-5 text-catalog-accent group-hover:text-white" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-bold leading-none">16-Point Grid</div>
                                        <div className="text-[9px] opacity-60 mt-1 uppercase tracking-wider font-medium">Freeform Organics</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setPoints([
                                        { x: 0, y: 0, type: 'linear' }, { x: 1, y: 0, type: 'linear' },
                                        { x: 1, y: 1, type: 'linear' }, { x: 0, y: 1, type: 'linear' }
                                    ])}
                                    className="w-full py-4 px-5 bg-catalog-stone/5 border border-catalog-accent/10 rounded-2xl flex items-center gap-4 hover:border-catalog-accent hover:bg-catalog-accent hover:text-white hover:shadow-lg hover:-translate-y-1 transition-all group"
                                >
                                    <div className="p-2 bg-catalog-accent/10 rounded-lg group-hover:bg-white/20">
                                        <Box className="w-5 h-5 text-catalog-accent group-hover:text-white" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-bold leading-none">Rectangle (Corner)</div>
                                        <div className="text-[9px] opacity-60 mt-1 uppercase tracking-wider font-medium">4-Point Frame</div>
                                    </div>
                                </button>

                                <button
                                    onClick={() => setPoints([
                                        { x: 0, y: 0.5, type: 'linear' }, { x: 0.5, y: 0, type: 'linear' },
                                        { x: 1, y: 0.5, type: 'linear' }, { x: 0.5, y: 1, type: 'linear' }
                                    ])}
                                    className="w-full py-4 px-5 bg-catalog-stone/5 border border-catalog-accent/10 rounded-2xl flex items-center gap-4 hover:border-catalog-accent hover:bg-catalog-accent hover:text-white hover:shadow-lg hover:-translate-y-1 transition-all group"
                                >
                                    <div className="p-2 bg-catalog-accent/10 rounded-lg group-hover:bg-white/20">
                                        <div className="w-5 h-5 border-2 border-catalog-accent rotate-45 group-hover:border-white transition-colors" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs font-bold leading-none">Diamond</div>
                                        <div className="text-[9px] opacity-60 mt-1 uppercase tracking-wider font-medium">Geometric Center</div>
                                    </div>
                                </button>
                            </div>
                        </section>

                        <section className="space-y-4 pt-4">
                            <h3 className="text-[10px] font-bold text-catalog-accent uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-catalog-accent" />
                                Pro Tips
                            </h3>
                            <div className="bg-catalog-stone/5 p-5 rounded-2xl space-y-3 italic border border-catalog-accent/5">
                                <p className="text-[11px] text-catalog-text/60 leading-relaxed">
                                    • Drag corners to define boundary constraints.
                                </p>
                                <p className="text-[11px] text-catalog-text/60 leading-relaxed">
                                    • The internal 16-point grid allows for complex bezier-like curves (linear segment approximation).
                                </p>
                                <p className="text-[11px] text-catalog-text/60 leading-relaxed">
                                    • Reset points if you want to restore the original rectangular frame.
                                </p>
                            </div>
                        </section>

                        <div className="pt-8 border-t border-catalog-accent/10 hidden md:block">
                            <div className="flex items-center gap-3 p-4 bg-catalog-accent/5 rounded-2xl border border-catalog-accent/20">
                                <ImageIcon className="w-5 h-5 text-catalog-accent" />
                                <div className="text-[10px] text-catalog-accent font-bold uppercase tracking-wider">
                                    Canvas-Independent
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-10 py-8 border-t border-catalog-accent/10 bg-catalog-stone/5 flex flex-col md:flex-row justify-end gap-4 sticky bottom-0">
                    <button
                        onClick={onClose}
                        className="w-full md:w-auto px-10 py-3 text-[11px] font-bold uppercase tracking-[0.2em] text-catalog-text/40 hover:text-catalog-text hover:bg-catalog-stone/20 rounded-2xl transition-all"
                    >
                        Discard Changes
                    </button>
                    <button
                        onClick={handleSave}
                        className="w-full md:w-auto px-12 py-3.5 bg-catalog-accent text-white rounded-2xl shadow-xl shadow-catalog-accent/20 hover:shadow-2xl hover:bg-catalog-accent/90 hover:-translate-y-1 transition-all text-xs font-bold uppercase tracking-[0.2em] flex items-center justify-center gap-3 active:scale-95"
                    >
                        <Check className="w-4 h-4" /> Finalize Masking
                    </button>
                </div>
            </div>
        </div>
    );
}

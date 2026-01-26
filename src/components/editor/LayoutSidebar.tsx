import { useState, useEffect, memo } from 'react';
import { supabase } from '../../lib/supabase';
import { useAlbum } from '../../contexts/AlbumContext';
import { Grid, Loader2, Search, Plus, Filter, Layout as LayoutIcon, Eye, EyeOff } from 'lucide-react';
import { cn } from '../../lib/utils';

interface LayoutSelection {
    id: string;
    name: string;
    image_count: number;
    target_ratio: 'portrait' | 'landscape' | 'square';
    config: any;
    category: string;
}

interface LayoutSidebarProps {
    activePageId: string;
}

const LayoutThumbnail = memo(({ layout, viewMode, onClick }: { layout: LayoutSelection, viewMode: 'single' | 'spread', onClick: () => void }) => {
    const config = typeof layout.config === 'string' ? JSON.parse(layout.config) : layout.config;

    return (
        <button
            onClick={onClick}
            className={cn(
                "group relative bg-white border border-catalog-accent/5 rounded-xl overflow-hidden hover:border-catalog-accent/30 hover:shadow-xl transition-all p-2",
                viewMode === 'spread' ? "aspect-[2/1] border-catalog-accent/20" : "aspect-square"
            )}
            title={layout.name}
        >
            {/* Image Count Badge */}
            <div className="absolute top-2 left-2 z-20">
                <span className="text-[7px] font-black text-white uppercase tracking-tighter px-2 py-0.5 bg-catalog-accent/80 rounded-full backdrop-blur-sm shadow-sm opacity-80 group-hover:opacity-100 transition-opacity">
                    {layout.image_count} PICS
                </span>
            </div>

            {/* Wireframe Container */}
            <div className="w-full h-full relative bg-catalog-stone/5 rounded-lg overflow-hidden border border-gray-100/50 group-hover:bg-catalog-stone/10 transition-colors">
                {config.map((slot: any, idx: number) => (
                    <div
                        key={idx}
                        className="absolute bg-[#f5f5f5] border-2 border-[#4A90E2] shadow-[inset_0_0_10px_rgba(0,0,0,0.02)] transition-all group-hover:border-[#333]"
                        style={{
                            top: `${slot.top}%`,
                            left: `${slot.left}%`,
                            width: `${slot.width}%`,
                            height: `${slot.height}%`
                        }}
                    />
                ))}

                {/* Visual Gutter for Spreads */}
                {viewMode === 'spread' && (
                    <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-black/5 z-10 pointer-events-none" />
                )}
            </div>

            {/* Apply Overlay */}
            <div className="absolute inset-0 bg-catalog-accent/5 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1">
                <div className="bg-white rounded-full p-1.5 shadow-lg border border-catalog-accent/10 transform scale-75 group-hover:scale-100 transition-transform duration-300">
                    <Plus className="w-4 h-4 text-catalog-accent" />
                </div>
                <span className="text-[7px] font-black text-catalog-accent uppercase tracking-[0.2em] transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">Apply</span>
            </div>
        </button>
    );
});

const SkeletonThumbnail = ({ viewMode }: { viewMode: 'single' | 'spread' }) => (
    <div className={cn(
        "bg-catalog-stone/5 rounded-xl p-2 animate-pulse border border-transparent",
        viewMode === 'spread' ? "aspect-[2/1]" : "aspect-square"
    )}>
        <div className="w-full h-full bg-catalog-stone/10 rounded-lg overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 translate-x-[-100%] animate-[shimmer_2s_infinite]" />
        </div>
    </div>
);

export function LayoutSidebar({ activePageId }: LayoutSidebarProps) {
    const { album, applyLayout, showLayoutOutlines, toggleLayoutOutlines } = useAlbum();
    const [layouts, setLayouts] = useState<LayoutSelection[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Advanced Filters
    const [filterCount, setFilterCount] = useState<string>('all');
    const [viewMode, setViewMode] = useState<'single' | 'spread'>(
        album?.config.useSpreadView ? 'spread' : 'single'
    );

    useEffect(() => {
        const fetchLayouts = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('album_layouts')
                    .select('*')
                    .eq('is_active', true);

                if (!error && data) {
                    setLayouts(data as LayoutSelection[]);
                }
            } catch (err) {
                console.error('Failed to fetch layouts:', err);
            } finally {
                // Keep loading state for a moment for smooth transition
                setTimeout(() => setLoading(false), 600);
            }
        };

        fetchLayouts();
    }, []);

    const filteredLayouts = layouts.filter(layout => {
        // Search filter
        const matchesSearch = (layout.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (layout.category?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        // View Mode Filter
        if (viewMode === 'spread') {
            if (layout.target_ratio !== 'landscape') return false;
        } else {
            if (layout.target_ratio === 'landscape') return false;
        }

        // Image Count Filter
        if (filterCount !== 'all') {
            const count = layout.image_count;
            if (filterCount === '1' && count !== 1) return false;
            if (filterCount === '2' && count !== 2) return false;
            if (filterCount === '3' && count !== 3) return false;
            if (filterCount === '4' && count !== 4) return false;
            if (filterCount === '5-7' && (count < 5 || count > 7)) return false;
            if (filterCount === '8-10' && (count < 8 || count > 10)) return false;
        }

        return true;
    });

    const handleApply = (layout: LayoutSelection) => {
        if (!activePageId) return;
        applyLayout(activePageId, layout);
    };

    const imageCountOptions = [
        { label: 'All Images', value: 'all' },
        { label: '1 Image', value: '1' },
        { label: '2 Images', value: '2' },
        { label: '3 Images', value: '3' },
        { label: '4 Images', value: '4' },
        { label: '5-7 Images', value: '5-7' },
        { label: '8-10 Images', value: '8-10' },
    ];

    const viewModeOptions = [
        { label: 'Single Page', value: 'single' },
        { label: 'Spread View', value: 'spread' },
    ];

    return (
        <div className="flex flex-col h-full bg-white animate-in fade-in slide-in-from-right-4 duration-300">
            {/* Advanced Navigation Header */}
            <div className="p-4 border-b border-catalog-accent/10 space-y-4 bg-catalog-stone/5">
                <div className="flex items-center justify-between">
                    <h3 className="text-[11px] font-black text-catalog-accent uppercase tracking-[0.2em] flex items-center gap-2">
                        <LayoutIcon className="w-4 h-4" />
                        Editorial Studio
                    </h3>
                    <button
                        onClick={toggleLayoutOutlines}
                        className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all border",
                            showLayoutOutlines
                                ? "bg-catalog-accent text-white border-catalog-accent"
                                : "bg-white text-catalog-text/40 border-catalog-accent/10 hover:border-catalog-accent/30"
                        )}
                        title={showLayoutOutlines ? "Hide Layout Outlines" : "Show Layout Outlines"}
                    >
                        {showLayoutOutlines ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        {showLayoutOutlines ? "Guides On" : "Guides Off"}
                    </button>
                </div>

                {/* Filter Dropdowns */}
                <div className="grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-catalog-accent/40 uppercase tracking-widest px-1 flex items-center gap-1">
                            <Filter className="w-2 h-2" /> Images
                        </label>
                        <select
                            value={filterCount}
                            onChange={(e) => setFilterCount(e.target.value)}
                            className="w-full bg-white border border-catalog-accent/10 rounded-lg py-1.5 px-2 text-[10px] font-bold text-catalog-text focus:outline-none focus:ring-2 focus:ring-catalog-accent/20 appearance-none cursor-pointer"
                        >
                            {imageCountOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[8px] font-black text-catalog-accent/40 uppercase tracking-widest px-1 flex items-center gap-1">
                            <Grid className="w-2 h-2" /> Mode
                        </label>
                        <select
                            value={viewMode}
                            onChange={(e) => setViewMode(e.target.value as any)}
                            className="w-full bg-white border border-catalog-accent/10 rounded-lg py-1.5 px-2 text-[10px] font-bold text-catalog-text focus:outline-none focus:ring-2 focus:ring-catalog-accent/20 appearance-none cursor-pointer"
                        >
                            {viewModeOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-catalog-text/40" />
                    <input
                        type="text"
                        placeholder="Search patterns..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-catalog-accent/10 rounded-full focus:outline-none focus:ring-2 focus:ring-catalog-accent/20 transition-all font-medium"
                    />
                </div>
            </div>

            {/* Layout Grid */}
            <div className="flex-1 overflow-y-auto content-scrollbar p-3">
                <div className={cn(
                    "grid gap-3 pb-8",
                    viewMode === 'spread' ? "grid-cols-1" : "grid-cols-2"
                )}>
                    {/* SPECIAL: Blank Canvas Layout */}
                    {!loading && filterCount === 'all' && searchQuery === '' && (
                        <button
                            onClick={() => handleApply({
                                id: 'freeform',
                                name: 'freeform',
                                image_count: 0,
                                target_ratio: viewMode === 'spread' ? 'landscape' : 'portrait',
                                config: [],
                                category: 'Basic'
                            })}
                            className={cn(
                                "group relative bg-white border border-catalog-accent/20 border-dashed rounded-xl overflow-hidden hover:border-catalog-accent/40 hover:shadow-xl transition-all p-2",
                                viewMode === 'spread' ? "aspect-[2/1]" : "aspect-square"
                            )}
                        >
                            <div className="absolute top-2 left-2 z-20">
                                <span className="text-[7px] font-black text-white px-2 py-0.5 bg-gray-400 rounded-full opacity-80 uppercase tracking-tighter">FREEFORM</span>
                            </div>
                            <div className="w-full h-full relative bg-gray-50/50 rounded-lg flex flex-col items-center justify-center gap-2 border border-dashed border-gray-200">
                                <Plus className="w-5 h-5 text-catalog-accent/30" />
                                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-catalog-text/40">Blank Canvas</span>
                            </div>
                        </button>
                    )}

                    {loading ? (
                        Array.from({ length: 8 }).map((_, i) => (
                            <SkeletonThumbnail key={i} viewMode={viewMode} />
                        ))
                    ) : filteredLayouts.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 gap-3 opacity-30 text-center px-4">
                            <Grid className="w-10 h-10 mb-2" />
                            <span className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                                No patterns found for {viewMode === 'spread' ? 'Spreads' : 'Single Pages'} with {filterCount === 'all' ? 'any' : filterCount} images.
                            </span>
                        </div>
                    ) : (
                        filteredLayouts.map(layout => (
                            <LayoutThumbnail
                                key={layout.id}
                                layout={layout}
                                viewMode={viewMode}
                                onClick={() => handleApply(layout)}
                            />
                        ))
                    )}
                </div>
            </div>

            <div className="p-4 bg-catalog-stone/5 border-t border-catalog-accent/10">
                <p className="text-[8px] text-center text-catalog-text/50 font-black uppercase tracking-[0.2em] leading-relaxed">
                    Editorial Layout Engine v3.5<br />
                    Visual Composition Studio Enabled
                </p>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes shimmer {
                    100% { transform: translateX(100%); }
                }
            `}} />
        </div>
    );
}

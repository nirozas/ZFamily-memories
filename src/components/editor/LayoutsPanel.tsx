import { useState, useEffect } from 'react';
import { useAlbum } from '../../contexts/AlbumContext';
import { Layout, AlertCircle, Database } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { DEFAULT_LAYOUTS, type AlbumLayout } from '../../data/defaultLayouts';

interface LayoutsPanelProps {
    onApplyLayout: (layout: AlbumLayout) => void;
}

export function LayoutsPanel({ onApplyLayout }: LayoutsPanelProps) {
    const { album, currentPageIndex } = useAlbum();
    const [layouts, setLayouts] = useState<AlbumLayout[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedCount, setSelectedCount] = useState<number>(0);
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [showSpreads, setShowSpreads] = useState(false);
    const [targetSide, setTargetSide] = useState<'left' | 'right' | 'spread'>('left');
    const [isSeeding, setIsSeeding] = useState(false);

    // Get current page assets
    const currentPage = album?.pages[currentPageIndex];
    // In spread view, we might have two pages visible
    const nextPage = album?.config.useSpreadView ? album?.pages[currentPageIndex + 1] : null;

    // Calculate asset count based on target
    const currentAssetCount = (() => {
        if (targetSide === 'left') {
            return currentPage?.assets.filter(a => a.type === 'image' || a.type === 'video').length || 0;
        } else if (targetSide === 'right') {
            return nextPage?.assets.filter(a => a.type === 'image' || a.type === 'video').length || 0;
        } else {
            // Spread
            const leftCount = currentPage?.assets.filter(a => a.type === 'image' || a.type === 'video').length || 0;
            const rightCount = nextPage?.assets.filter(a => a.type === 'image' || a.type === 'video').length || 0;
            return leftCount + rightCount;
        }
    })();

    // Auto-select count based on current page
    // Auto-select removed to allow user exploration
    // Default is 0 (All) or user selects manually

    // Update target side when spread mode changes
    useEffect(() => {
        if (showSpreads) {
            setTargetSide('spread');
        } else {
            setTargetSide('left');
        }
    }, [showSpreads]);

    const seedDatabase = async () => {
        setIsSeeding(true);
        try {
            // Check if table exists/is accessible by trying a count
            const { count, error: countError } = await supabase
                .from('album_layouts')
                .select('*', { count: 'exact', head: true });

            if (countError) {
                // Table likely doesn't exist
                alert("The 'album_layouts' table is missing in Supabase. Please run the migration SQL in your Supabase Dashboard.");
                console.error("Missing table:", countError);
                return;
            }

            if (count && count > 0) {
                alert("Database already has layouts. Skipping seed.");
                return;
            }

            // Insert default layouts
            const { error } = await supabase
                .from('album_layouts')
                .insert(DEFAULT_LAYOUTS.map(l => ({
                    name: l.name,
                    category: l.category,
                    image_count: l.image_count,
                    aspect_ratio: l.aspect_ratio,
                    is_spread: l.is_spread,
                    config: l.config,
                    is_active: true
                })) as any);

            if (error) throw error;

            alert("Success! Layouts have been seeded to Supabase.");
            // Trigger refetch
            // We can do this by toggling a state or just reloading, but for now we rely on the next fetch
            window.location.reload();

        } catch (err) {
            console.error("Seeding failed:", err);
            alert("Failed to seed database. Check console for details.");
        } finally {
            setIsSeeding(false);
        }
    };


    // Fetch layouts
    useEffect(() => {
        const fetchLayouts = async () => {
            setLoading(true);
            try {
                let query = supabase
                    .from('album_layouts')
                    .select('*')
                    .order('name');

                if (selectedCount > 0) {
                    query = query.eq('image_count', selectedCount);
                }

                if (selectedCategory !== 'All') {
                    query = query.eq('category', selectedCategory);
                }

                query = query.eq('is_spread', showSpreads);

                const { data, error } = await query;

                if (error || !data || data.length === 0) {
                    // Fallback to local default layouts
                    let defaults = DEFAULT_LAYOUTS;

                    if (selectedCount > 0) {
                        defaults = defaults.filter(l => l.image_count === selectedCount);
                    }
                    if (selectedCategory !== 'All') {
                        defaults = defaults.filter(l => l.category === selectedCategory);
                    }
                    defaults = defaults.filter(l => l.is_spread === showSpreads);

                    setLayouts(defaults.sort((a, b) => a.name.localeCompare(b.name)));
                } else {
                    setLayouts(data);
                }
            } catch (err) {
                console.error('Layout fetch failed, using defaults', err);
                // Same fallback logic on crash
                let defaults = DEFAULT_LAYOUTS;
                if (selectedCount > 0) defaults = defaults.filter(l => l.image_count === selectedCount);
                if (selectedCategory !== 'All') defaults = defaults.filter(l => l.category === selectedCategory);
                defaults = defaults.filter(l => l.is_spread === showSpreads);
                setLayouts(defaults.sort((a, b) => a.name.localeCompare(b.name)));
            } finally {
                setLoading(false);
            }
        };

        fetchLayouts();
    }, [selectedCount, selectedCategory, showSpreads]);

    const applyLayout = (layout: AlbumLayout) => {
        if (onApplyLayout) {
            onApplyLayout(layout);
        }
    };

    if (!album) return null;

    return (
        <div className="flex flex-col h-full bg-white w-64">
            <div className="p-4 border-b border-catalog-accent/10 bg-catalog-stone/10 space-y-3">
                <div className="flex items-center gap-2 text-catalog-text">
                    <Layout className="w-4 h-4" />
                    <h3 className="font-serif text-lg">Layouts</h3>
                </div>

                {/* Filters */}
                <div className="flex gap-2 items-center">
                    <select
                        className="flex-1 bg-white border border-catalog-accent/20 rounded-md text-xs py-1 px-2 focus:ring-1 focus:ring-catalog-accent outline-none"
                        value={selectedCount}
                        onChange={(e) => setSelectedCount(Number(e.target.value))}
                    >
                        <option value={0}>All Layouts (Current: {currentAssetCount})</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                            <option key={n} value={n}>{n} Photo{n > 1 ? 's' : ''}</option>
                        ))}
                    </select>

                    <label className="flex items-center gap-1 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showSpreads}
                            onChange={(e) => setShowSpreads(e.target.checked)}
                            className="rounded border-gray-300 text-catalog-accent focus:ring-catalog-accent w-3 h-3"
                        />
                        <span className="text-[10px] text-catalog-text font-medium select-none">Spread</span>
                    </label>
                </div>

                <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                    {['All', 'Symmetric', 'Asymmetric', 'Negative Space'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={cn(
                                "whitespace-nowrap px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border transition-colors",
                                selectedCategory === cat
                                    ? "bg-catalog-accent text-white border-catalog-accent"
                                    : "bg-white text-catalog-text/50 border-catalog-accent/10 hover:border-catalog-accent/30"
                            )}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <div className="w-6 h-6 border-2 border-catalog-accent border-t-transparent rounded-full animate-spin" />
                    </div>
                ) : layouts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 space-y-4">
                        <div className="text-center text-gray-400 text-sm">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p>No layouts found.</p>
                            <p className="text-[10px] mt-2">Try changing filters or check database.</p>
                        </div>
                        <button
                            onClick={seedDatabase}
                            disabled={isSeeding}
                            className="text-xs flex items-center gap-1.5 px-3 py-1.5 bg-catalog-accent/10 hover:bg-catalog-accent/20 text-catalog-accent rounded-full transition-colors"
                        >
                            <Database className="w-3 h-3" />
                            {isSeeding ? 'Seeding...' : 'Seed to Supabase'}
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {layouts.map(layout => (
                            <button
                                key={layout.id}
                                draggable={true}
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('layout', JSON.stringify(layout));
                                    e.dataTransfer.effectAllowed = 'copy';
                                }}
                                onClick={() => applyLayout(layout)}
                                className={cn(
                                    "group relative bg-gray-50 border border-gray-200 rounded-lg overflow-hidden hover:border-catalog-accent hover:shadow-md transition-all text-left w-full",
                                    layout.is_spread ? "col-span-2" : ""
                                )}
                                style={{ aspectRatio: String(layout.aspect_ratio || '1') }}
                            >
                                {/* Preview */}
                                <div className="absolute inset-2">
                                    {layout.config.map((slot, i) => (
                                        <div
                                            key={i}
                                            className="absolute bg-catalog-stone/20 border border-catalog-stone/40 group-hover:bg-catalog-accent/10 group-hover:border-catalog-accent/30 transition-colors"
                                            style={{
                                                left: layout.is_spread ? `${(slot.x ?? slot.left ?? 0) / 2}%` : `${(slot.x ?? slot.left ?? 0)}%`,
                                                top: `${slot.y ?? slot.top ?? 0}%`,
                                                width: layout.is_spread ? `${slot.width / 2}%` : `${slot.width}%`,
                                                height: `${slot.height}%`,
                                                zIndex: slot.z_index,
                                                transform: slot.rotation ? `rotate(${slot.rotation}deg)` : 'none'
                                            }}
                                        />
                                    ))}
                                    {/* Spread divider line for preview */}
                                    {layout.is_spread && (
                                        <div className="absolute top-0 bottom-0 left-1/2 w-px bg-gray-300 border-l border-dashed border-gray-400 opacity-50" />
                                    )}
                                </div>
                                <div className="absolute inset-x-0 bottom-0 bg-white/90 p-1.5 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-[9px] font-medium truncate text-center text-catalog-text">{layout.name}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// Helper functions moved to layoutUtils.ts

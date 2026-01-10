import { useState, useEffect } from 'react';
import { useAlbum } from '../../contexts/AlbumContext';
import { supabase } from '../../lib/supabase';
import { Bookmark, Loader2, AlertCircle, Plus } from 'lucide-react';

export function RibbonsPanel() {
    const { album, currentPageIndex, addAsset } = useAlbum();
    const [ribbons, setRibbons] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const currentPage = album?.pages[currentPageIndex];

    useEffect(() => {
        const fetchRibbons = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('library_assets')
                    .select('*')
                    .eq('category', 'ribbon');

                if (error) throw error;
                setRibbons(data || []);
            } catch (err) {
                console.error('Error fetching ribbons:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchRibbons();
    }, []);

    const handleAddRibbon = (item: any) => {
        if (!currentPage || !album) return;

        // Default position: top margin of the page
        const pageWidth = album.config.dimensions.width;
        // Ribbons usually go across the top or bottom
        addAsset(currentPage.id, {
            type: 'image',
            url: item.url,
            x: 0,
            y: 50,
            width: pageWidth,
            height: 80, // Default ribbon height
            rotation: 0,
            zIndex: 50, // Usually high Z-index
            isStamp: true, // Treat as decorative element
            pivot: { x: 0.5, y: 0.5 }
        });
    };

    const filteredRibbons = ribbons.filter(r =>
        r.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (!album) return null;

    return (
        <div className="flex flex-col h-full bg-white w-64">
            <div className="p-4 border-b border-catalog-accent/10 bg-catalog-stone/10 space-y-3">
                <div className="flex items-center gap-2 text-catalog-text">
                    <Bookmark className="w-4 h-4" />
                    <h3 className="font-serif text-lg">Ribbons</h3>
                </div>

                <div className="relative">
                    <input
                        type="text"
                        placeholder="Search ribbons..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white border border-catalog-accent/10 rounded-full py-1.5 pl-3 pr-8 text-xs focus:ring-1 focus:ring-catalog-accent outline-none"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 content-scrollbar">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 border-catalog-accent animate-spin" />
                    </div>
                ) : filteredRibbons.length === 0 ? (
                    <div className="text-center p-8 text-catalog-text/40">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        <p className="text-sm italic">No ribbons found</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        {filteredRibbons.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => handleAddRibbon(item)}
                                className="group relative aspect-square bg-gray-50 border border-gray-100 rounded-lg overflow-hidden hover:border-catalog-accent hover:shadow-md transition-all p-2 flex items-center justify-center"
                            >
                                <img
                                    src={item.url}
                                    alt={item.name}
                                    className="max-w-full max-h-full object-contain"
                                />
                                <div className="absolute inset-x-0 bottom-0 bg-white/90 p-1 border-t border-gray-50 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <p className="text-[8px] font-bold text-catalog-accent text-center uppercase truncate">
                                        {item.name}
                                    </p>
                                </div>
                                <div className="absolute inset-0 bg-catalog-accent/10 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                    <Plus className="w-5 h-5 text-catalog-accent" />
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
            <div className="p-4 border-t border-catalog-accent/5 bg-gray-50/50">
                <p className="text-[10px] text-center text-catalog-text/40 italic">
                    Click to add a ribbon to the current page. Decorative elements appear above all photos.
                </p>
            </div>
        </div>
    );
}

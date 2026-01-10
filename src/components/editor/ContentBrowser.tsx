import { useState } from 'react';
import { useAlbum } from '../../contexts/AlbumContext';
import { Palette, Sticker, Frame, Ribbon, Search } from 'lucide-react';
import { cn } from '../../lib/utils';

const CATEGORIES = [
    { id: 'backgrounds', label: 'Backs', icon: Palette },
    { id: 'stickers', label: 'Stickers', icon: Sticker },
    { id: 'frames', label: 'Frames', icon: Frame },
    { id: 'ribbons', label: 'Ribbons', icon: Ribbon },
];

const ASSETS = {
    backgrounds: [
        { id: 'bg1', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400', name: 'Charcoal Texture' },
        { id: 'bg2', url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400', name: 'Canvas' },
        { id: 'bg3', url: 'https://images.unsplash.com/photo-1579546128583-b09e2363158c?w=400', name: 'Vintage Paper' },
    ],
    stickers: [
        { id: 'st1', url: '/assets/stickers/heart.png', name: 'Heart' },
        { id: 'st2', url: '/assets/stickers/star.png', name: 'Star' },
        { id: 'st3', url: '/assets/stickers/flower.png', name: 'Flower' },
    ],
    frames: [
        { id: 'fr1', url: '/assets/frames/vintage.png', name: 'Vintage' },
        { id: 'fr2', url: '/assets/frames/modern.png', name: 'Modern' },
    ],
    ribbons: [
        { id: 'rb1', url: '/assets/ribbons/red.png', name: 'Red Ribbon' },
    ]
};

export function ContentBrowser() {
    const [activeTab, setActiveTab] = useState('backgrounds');
    const { album, updatePage, addAsset, currentPageIndex } = useAlbum();

    if (!album) return null;
    const currentPage = album.pages[currentPageIndex];

    const handleItemClick = (item: any) => {
        if (activeTab === 'backgrounds') {
            updatePage(currentPage.id, { backgroundColor: item.url }); // Simplified - could be image
        } else {
            addAsset(currentPage.id, {
                type: (activeTab === 'stickers' ? 'image' : activeTab === 'ribbons' ? 'ribbon' : 'frame') as any,
                url: item.url,
                x: 100,
                y: 100,
                width: 150,
                height: 150,
                rotation: 0,
                zIndex: 10,
                isStamp: activeTab === 'stickers'
            });
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-catalog-accent/10 w-72">
            <div className="p-4 border-b border-catalog-accent/10">
                <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-catalog-text/30" />
                    <input
                        type="text"
                        placeholder="Search assets..."
                        className="w-full pl-10 pr-4 py-2 bg-catalog-stone/30 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-catalog-accent/20"
                    />
                </div>
                <div className="flex items-center gap-1">
                    {CATEGORIES.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => setActiveTab(cat.id)}
                            className={cn(
                                "flex-1 flex flex-col items-center gap-1 py-2 rounded-lg transition-all",
                                activeTab === cat.id ? "bg-catalog-accent text-white shadow-sm" : "text-catalog-text/50 hover:bg-catalog-stone/50"
                            )}
                        >
                            <cat.icon className="w-4 h-4" />
                            <span className="text-[10px] font-medium tracking-tight whitespace-nowrap">{cat.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 content-scrollbar">
                <div className="grid grid-cols-2 gap-3">
                    {ASSETS[activeTab as keyof typeof ASSETS].map((item: any) => (
                        <div
                            key={item.id}
                            onClick={() => handleItemClick(item)}
                            className="group cursor-pointer space-y-2"
                        >
                            <div className="aspect-square rounded-xl overflow-hidden bg-catalog-stone/30 border border-catalog-accent/5 group-hover:border-catalog-accent/40 transition-all flex items-center justify-center p-2">
                                <img
                                    src={item.url}
                                    alt={item.name}
                                    className={cn(
                                        "max-w-full max-h-full object-contain",
                                        activeTab === 'backgrounds' && "w-full h-full object-cover"
                                    )}
                                />
                            </div>
                            <p className="text-[10px] text-center text-catalog-text/40 truncate">{item.name}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

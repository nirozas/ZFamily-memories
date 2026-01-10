import { useState, useRef, useEffect } from 'react';
import { useAlbum } from '../../contexts/AlbumContext';
import { supabase } from '../../lib/supabase';
import {
    Upload,
    Plus,
    Video,
    Search,
    Palette,
    Sticker,
    Loader2,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    Image as ImageIcon,
    Bookmark
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { type Asset } from '../../contexts/AlbumContext';

// Helper to get assets by category
async function fetchLibraryAssets(category: string, familyId?: string) {
    if (category === 'uploads' && familyId) {
        // Fetch from family_media for user uploads
        const { data, error } = await supabase
            .from('family_media')
            .select('*')
            .eq('family_id', familyId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching uploads:', error);
            return [];
        }
        return (data as any[])?.map(item => ({
            id: item.id,
            url: item.url,
            type: item.type, // Include the type from DB
            category: 'uploads',
            name: item.filename || 'Uploaded Asset',
            folder: item.folder
        })) || [];
    }

    // Fetch from library_assets for system assets
    const { data, error } = await supabase
        .from('library_assets')
        .select('*')
        .eq('category', category);

    if (error) {
        console.error('Error fetching assets:', error);
        return [];
    }
    return data || [];
}

type Tab = 'uploads' | 'backgrounds' | 'stickers' | 'frames' | 'ribbons';

export function AssetLibrary() {
    const { album, uploadMedia, moveFromLibrary, isSaving, addAsset, currentPageIndex, uploadProgress } = useAlbum();
    const [activeTab, setActiveTab] = useState<Tab>('uploads');
    const [libraryAssets, setLibraryAssets] = useState<any[]>([]);
    const [isLoadingAssets, setIsLoadingAssets] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
        curated: false,
        archive: false
    });

    // Filters
    const [mediaFilter, setMediaFilter] = useState<'all' | 'image' | 'video'>('all');
    const [viewMode, setViewMode] = useState<'grid' | 'folders'>('folders');
    const [currentFolder, setCurrentFolder] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const toggleSection = (section: string) => {
        setCollapsedSections(prev => ({
            ...prev,
            [section]: !prev[section]
        }));
    };

    // Fetch assets when tab changes
    useEffect(() => {
        const loadAssets = async () => {
            setIsLoadingAssets(true);
            const categoryMap: Record<string, string> = {
                'uploads': 'uploads', // Now handled explicitly
                'backgrounds': 'background',
                'stickers': 'sticker',
                'frames': 'frame',
                'ribbons': 'ribbon'
            };
            const category = categoryMap[activeTab];

            if (category) {
                // Pass familyId for uploads
                const assets = await fetchLibraryAssets(category, album?.family_id);
                setLibraryAssets(assets);
            }
            setIsLoadingAssets(false);
        };
        loadAssets();
    }, [activeTab, album?.family_id]);

    if (!album) return null;
    const currentPage = album.pages[currentPageIndex];

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await uploadMedia(Array.from(e.target.files));
            e.target.value = '';
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (activeTab === 'uploads') {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (activeTab === 'uploads') {
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                await uploadMedia(Array.from(files));
            }
        }
    };

    const handleAssetClick = (item: any, type: Tab) => {
        if (!currentPage) return;

        if (type === 'uploads') {
            moveFromLibrary(item.id, currentPage.id);
        } else {
            // Stickers / Frames / Ribbons / Backgrounds
            const isBackground = (type as string) === 'backgrounds';
            const isFrame = (type as string) === 'frames';

            // All these decorations and backgrounds are now treated as regular images/assets
            const img = new Image();
            img.src = item.url;
            img.onload = () => {
                const ratio = img.naturalWidth / img.naturalHeight;
                // If it's a background or frame, start it at 100% width but still freely movable
                const w = (isBackground || isFrame) ? 100 : 30;
                const h = w / ratio;

                addAsset(currentPage.id, {
                    type: isFrame ? 'frame' : 'image',
                    url: item.url,
                    x: (isBackground || isFrame) ? 0 : 35,
                    y: (isBackground || isFrame) ? 0 : 35,
                    width: w,
                    height: h,
                    originalDimensions: { width: img.naturalWidth, height: img.naturalHeight },
                    rotation: 0,
                    zIndex: isFrame ? 50 : (isBackground ? 0 : 30),
                    isStamp: true,
                    category: type,
                    fitMode: 'fit',
                    aspectRatio: ratio,
                    isLocked: false
                });
            };
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-r border-catalog-accent/10 w-80">
            {/* Tabs */}
            <div className="flex bg-catalog-stone/10 border-b border-catalog-accent/10 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('uploads')}
                    className={cn("flex-1 py-2 px-3 flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-colors", activeTab === 'uploads' ? "border-catalog-accent text-catalog-accent bg-white" : "border-transparent text-catalog-text/50 hover:bg-white/50")}
                >
                    <ImageIcon className="w-3.5 h-3.5" /> Media
                </button>
                <button
                    onClick={() => setActiveTab('backgrounds')}
                    className={cn("flex-1 py-2 px-3 flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-colors", activeTab === 'backgrounds' ? "border-catalog-accent text-catalog-accent bg-white" : "border-transparent text-catalog-text/50 hover:bg-white/50")}
                >
                    <Palette className="w-3.5 h-3.5" /> Bgs
                </button>
                <button
                    onClick={() => setActiveTab('stickers')}
                    className={cn("flex-1 py-2 px-3 flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-colors", activeTab === 'stickers' ? "border-catalog-accent text-catalog-accent bg-white" : "border-transparent text-catalog-text/50 hover:bg-white/50")}
                >
                    <Sticker className="w-3.5 h-3.5" /> Stickers
                </button>
                <button
                    onClick={() => setActiveTab('frames')}
                    className={cn("flex-1 py-2 px-3 flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-colors", activeTab === 'frames' ? "border-catalog-accent text-catalog-accent bg-white" : "border-transparent text-catalog-text/50 hover:bg-white/50")}
                >
                    <div className="w-3.5 h-3.5 border-[1.5px] border-current rounded-sm" /> Frames
                </button>
                <button
                    onClick={() => setActiveTab('ribbons')}
                    className={cn("flex-1 py-2 px-3 flex flex-col items-center gap-0.5 text-[9px] font-bold uppercase tracking-widest border-b-2 transition-colors", activeTab === 'ribbons' ? "border-catalog-accent text-catalog-accent bg-white" : "border-transparent text-catalog-text/50 hover:bg-white/50")}
                >
                    <Bookmark className="w-3.5 h-3.5" /> Ribbons
                </button>
            </div>

            {/* Content Area */}
            <div
                className="flex-1 overflow-y-auto p-4 content-scrollbar bg-gray-50/50 relative"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Drag Overlay */}
                {isDragging && (
                    <div className="absolute inset-0 z-50 bg-catalog-accent/10 backdrop-blur-[2px] flex flex-col items-center justify-center pointer-events-none border-2 border-dashed border-catalog-accent m-2 rounded-xl animate-in fade-in zoom-in duration-200">
                        <Upload className="w-8 h-8 text-catalog-accent animate-bounce mb-2" />
                        <p className="text-xs font-bold text-catalog-accent uppercase tracking-wider">Drop to upload</p>
                    </div>
                )}

                {/* Search (except uploads) */}
                {activeTab !== 'uploads' && (
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-catalog-text/30" />
                        <input
                            type="text"
                            placeholder={`Search ${activeTab}...`}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-catalog-accent/10 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-catalog-accent/20"
                        />
                    </div>
                )}

                {/* Loading State */}
                {isLoadingAssets && activeTab !== 'uploads' && (
                    <div className="flex items-center justify-center p-8 text-catalog-text/40">
                        <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                )}

                {/* UPLOADS TAB */}
                {activeTab === 'uploads' && (
                    <div className="space-y-4">
                        {/* Upload & Controls */}
                        <div className="flex items-center gap-2">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="flex-1 border border-dashed border-catalog-accent/30 rounded-lg p-3 text-center cursor-pointer hover:bg-catalog-accent/5 transition-all group bg-white"
                            >
                                <Upload className="w-4 h-4 text-catalog-accent/60 mx-auto mb-1 group-hover:text-catalog-accent" />
                                <p className="text-[9px] text-catalog-accent font-bold uppercase tracking-tight">Upload</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    accept="image/*,video/*"
                                    className="hidden"
                                    onChange={handleFileChange}
                                />
                            </div>
                        </div>

                        {/* Filters */}
                        <div className="flex items-center justify-between">
                            <div className="flex bg-gray-100 rounded-md p-0.5">
                                <button
                                    onClick={() => setMediaFilter('all')}
                                    className={cn("px-2 py-1 text-[9px] font-bold uppercase rounded-sm transition-all", mediaFilter === 'all' ? "bg-white shadow text-catalog-accent" : "text-gray-400 hover:text-gray-600")}
                                >All</button>
                                <button
                                    onClick={() => setMediaFilter('image')}
                                    className={cn("px-2 py-1 text-[9px] font-bold uppercase rounded-sm transition-all", mediaFilter === 'image' ? "bg-white shadow text-catalog-accent" : "text-gray-400 hover:text-gray-600")}
                                >Img</button>
                                <button
                                    onClick={() => setMediaFilter('video')}
                                    className={cn("px-2 py-1 text-[9px] font-bold uppercase rounded-sm transition-all", mediaFilter === 'video' ? "bg-white shadow text-catalog-accent" : "text-gray-400 hover:text-gray-600")}
                                >Vid</button>
                            </div>

                            <button
                                onClick={() => {
                                    if (viewMode === 'folders' && currentFolder) {
                                        setCurrentFolder(null); // Go back up
                                    } else {
                                        setViewMode(v => v === 'grid' ? 'folders' : 'grid');
                                        setCurrentFolder(null);
                                    }
                                }}
                                className="text-[9px] font-bold uppercase text-catalog-accent flex items-center gap-1 hover:bg-catalog-accent/5 px-2 py-1 rounded transition-colors"
                            >
                                {viewMode === 'folders' && currentFolder ? <><ChevronLeft className="w-3 h-3" /> Back</> : (viewMode === 'grid' ? 'Show Folders' : 'Show All')}
                            </button>
                        </div>

                        {/* Recent Unplaced Section (Generic Uploads) */}
                        {viewMode === 'grid' && (
                            <div className="space-y-2">
                                <button
                                    onClick={() => toggleSection('curated')}
                                    className="flex items-center justify-between w-full px-1 py-1 hover:bg-catalog-accent/5 rounded transition-colors group cursor-pointer"
                                >
                                    <h4 className="text-[10px] font-bold text-catalog-accent uppercase tracking-widest">Unplaced Media</h4>
                                    {collapsedSections.curated ? <ChevronRight className="w-3 h-3 text-catalog-accent/40" /> : <ChevronDown className="w-3 h-3 text-catalog-accent/40" />}
                                </button>

                                {!collapsedSections.curated && (
                                    <>
                                        {album.unplacedMedia.length > 0 ? (
                                            <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                {album.unplacedMedia
                                                    .filter((asset: Asset) => mediaFilter === 'all' || asset.type === mediaFilter)
                                                    .map((asset: Asset) => (
                                                        <div
                                                            key={asset.id}
                                                            draggable
                                                            onDragStart={(e) => {
                                                                e.dataTransfer.setData('asset', JSON.stringify({
                                                                    url: asset.url,
                                                                    type: asset.type,
                                                                    aspectRatio: asset.aspectRatio,
                                                                    originalDimensions: asset.originalDimensions
                                                                }));
                                                            }}
                                                            onClick={() => handleAssetClick(asset, 'uploads')}
                                                            className="group relative aspect-square rounded-lg overflow-hidden bg-white shadow-sm hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-catalog-accent/30"
                                                        >
                                                            {asset.type === 'image' ? (
                                                                <img src={asset.url} alt="" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <video
                                                                    src={asset.url}
                                                                    className="w-full h-full object-cover"
                                                                    muted
                                                                    playsInline
                                                                    onMouseOver={(e) => e.currentTarget.play()}
                                                                    onMouseOut={(e) => {
                                                                        e.currentTarget.pause();
                                                                        e.currentTarget.currentTime = 0;
                                                                    }}
                                                                />
                                                            )}
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                <Plus className="w-6 h-6 text-white" />
                                                            </div>
                                                            {asset.type === 'video' && <div className="absolute bottom-1 right-1 bg-black/50 text-white p-0.5 rounded"><Video className="w-3 h-3" /></div>}
                                                        </div>
                                                    ))}
                                            </div>
                                        ) : (
                                            <div className="py-8 text-center border border-dashed border-catalog-accent/10 rounded-lg bg-white/50">
                                                <p className="text-[9px] text-catalog-text/30 font-serif italic">No unplaced media found</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {isSaving && (
                            <div className="space-y-3 p-3 bg-white border border-catalog-accent/10 rounded-lg animate-in fade-in slide-in-from-top-1">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] font-bold text-catalog-accent uppercase tracking-widest">Upload Status</span>
                                    <div className="w-3 h-3 border-2 border-catalog-accent border-t-transparent rounded-full animate-spin" />
                                </div>
                                {Object.entries(uploadProgress).map(([fileName, progress]) => (
                                    <div key={fileName} className="space-y-1">
                                        <div className="flex justify-between text-[8px] font-bold text-catalog-text/60 truncate">
                                            <span className="truncate flex-1 pr-2">{fileName}</span>
                                            <span className="shrink-0">{progress}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-catalog-accent transition-all duration-300"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                                {Object.keys(uploadProgress).length === 0 && (
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="w-3 h-3 animate-spin text-catalog-accent" />
                                        <span className="text-[9px] text-catalog-text/50 font-medium">Processing files...</span>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Heritage Gallery Section (Folders / Grid) */}
                        <div className="space-y-2">
                            <button
                                onClick={() => toggleSection('archive')}
                                className="flex items-center justify-between w-full px-1 py-1 hover:bg-catalog-accent/5 rounded transition-colors group cursor-pointer"
                            >
                                <h4 className="text-[10px] font-bold text-catalog-accent uppercase tracking-widest">
                                    {currentFolder ? currentFolder : 'Heritage Archive'}
                                </h4>
                                {collapsedSections.archive ? <ChevronRight className="w-3 h-3 text-catalog-accent/40" /> : <ChevronDown className="w-3 h-3 text-catalog-accent/40" />}
                            </button>

                            {!collapsedSections.archive && (
                                <>
                                    {isLoadingAssets ? (
                                        <div className="flex items-center justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-catalog-accent/20" /></div>
                                    ) : (
                                        <>
                                            {/* Folder View */}
                                            {viewMode === 'folders' && !currentFolder && (
                                                <div className="grid grid-cols-2 gap-2 animate-in fade-in slide-in-from-top-1">
                                                    {/* Compute folders on the fly */}
                                                    {(() => {
                                                        const folders = Array.from(new Set(libraryAssets.filter(a => a.category === 'uploads').map(a => a.folder || 'Unsorted')));
                                                        return folders.map(folder => (
                                                            <div
                                                                key={folder}
                                                                onClick={() => setCurrentFolder(folder)}
                                                                className="flex flex-col items-center gap-2 p-3 bg-white border border-catalog-accent/10 rounded-xl hover:bg-catalog-accent/5 hover:border-catalog-accent/30 transition-all cursor-pointer group shadow-sm"
                                                            >
                                                                <div className="w-12 h-10 bg-catalog-accent/5 rounded-lg flex items-center justify-center group-hover:bg-catalog-accent/10 transition-colors">
                                                                    <div className="relative">
                                                                        <Bookmark className="w-5 h-5 text-catalog-accent" />
                                                                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-catalog-accent rounded-full animate-pulse" />
                                                                    </div>
                                                                </div>
                                                                <span className="text-[10px] font-bold text-catalog-text/70 uppercase tracking-tighter truncate w-full text-center">{folder}</span>
                                                                <span className="text-[8px] text-catalog-accent/40 font-mono">
                                                                    {libraryAssets.filter(a => a.category === 'uploads' && (a.folder || 'Unsorted') === folder).length} items
                                                                </span>
                                                            </div>
                                                        ));
                                                    })()}
                                                </div>
                                            )}

                                            {/* Asset Grid (All OR Inside Folder) */}
                                            {(viewMode === 'grid' || currentFolder) && (
                                                <div className="grid grid-cols-3 gap-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                                                    {libraryAssets
                                                        .filter(a => a.category === 'uploads')
                                                        .filter(a => viewMode === 'grid' ? true : (a.folder || 'Unsorted') === currentFolder)
                                                        .filter(a => mediaFilter === 'all' || (mediaFilter === 'image' ? (!a.type || a.type === 'image') : a.type === 'video'))
                                                        .map((item) => (
                                                            <div
                                                                key={item.id}
                                                                draggable
                                                                onDragStart={(e) => {
                                                                    e.dataTransfer.setData('asset', JSON.stringify({
                                                                        url: item.url,
                                                                        type: item.type || 'image' // Use actual type
                                                                    }));
                                                                }}

                                                                onClick={() => {
                                                                    if (item.type === 'video') {
                                                                        addAsset(currentPage.id, {
                                                                            type: 'video',
                                                                            url: item.url,
                                                                            x: 25, y: 25, width: 50, height: 35,
                                                                            rotation: 0,
                                                                            zIndex: currentPage.assets.length + 1,
                                                                            pivot: { x: 0.5, y: 0.5 }
                                                                        } as any);
                                                                    } else {
                                                                        const img = new Image();
                                                                        img.src = item.url;
                                                                        img.onload = () => {
                                                                            // Use 100 as base for percentages
                                                                            const refWidth = 100;
                                                                            const refHeight = 100;

                                                                            let w = 60; // Default width 60%
                                                                            const ratio = img.naturalWidth / img.naturalHeight;
                                                                            let h = w / ratio;

                                                                            // If height is too large, scale down
                                                                            if (h > 60) {
                                                                                h = 60;
                                                                                w = h * ratio;
                                                                            }

                                                                            const x = (refWidth - w) / 2;
                                                                            const y = (refHeight - h) / 2;

                                                                            addAsset(currentPage.id, {
                                                                                type: 'image',
                                                                                url: item.url,
                                                                                x, y,
                                                                                width: w,
                                                                                height: h,
                                                                                originalDimensions: { width: img.naturalWidth, height: img.naturalHeight },
                                                                                rotation: 0,
                                                                                zIndex: currentPage.assets.length + 1,
                                                                                pivot: { x: 0.5, y: 0.5 }
                                                                            } as any);
                                                                        };
                                                                    }
                                                                }}
                                                                className="aspect-square rounded-md overflow-hidden bg-white border border-gray-100 hover:ring-2 hover:ring-catalog-accent transition-all cursor-pointer group relative"
                                                            >
                                                                {item.type === 'video' ? (
                                                                    <video
                                                                        src={item.url}
                                                                        className="w-full h-full object-cover"
                                                                        muted
                                                                        playsInline
                                                                        onMouseOver={(e) => e.currentTarget.play()}
                                                                        onMouseOut={(e) => {
                                                                            e.currentTarget.pause();
                                                                            e.currentTarget.currentTime = 0;
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                                                                )}
                                                                <div className="absolute inset-0 bg-catalog-accent/20 opacity-0 group-hover:opacity-100 flex items-center justify-center">
                                                                    <Plus className="w-4 h-4 text-white" />
                                                                </div>
                                                                {item.type === 'video' && <div className="absolute bottom-1 right-1 bg-black/50 text-white p-0.5 rounded"><Video className="w-3 h-3" /></div>}
                                                            </div>
                                                        ))}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {/* BACKGROUNDS TAB */}
                {activeTab === 'backgrounds' && !isLoadingAssets && (
                    <div className="grid grid-cols-2 gap-2">
                        {libraryAssets.map((item) => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('asset', JSON.stringify({
                                        url: item.url,
                                        type: 'image', // Backgrounds are images but treated specially in drop
                                        category: 'backgrounds',
                                        name: item.name
                                    }));
                                }}
                                onClick={() => handleAssetClick(item, 'backgrounds')}
                                className="aspect-[4/3] rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-catalog-accent transition-all shadow-sm bg-white"
                                style={{ backgroundColor: item.url.startsWith('#') ? item.url : undefined }}
                            >
                                {!item.url.startsWith('#') && (
                                    <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* STICKERS / FRAMES / RIBBONS TAB */}
                {(activeTab === 'stickers' || activeTab === 'frames' || activeTab === 'ribbons') && !isLoadingAssets && (
                    <div className="grid grid-cols-3 gap-2">
                        {libraryAssets.map((item) => (
                            <div
                                key={item.id}
                                draggable
                                onDragStart={(e) => {
                                    e.dataTransfer.setData('asset', JSON.stringify({
                                        url: item.url,
                                        type: activeTab === 'frames' ? 'frame' : 'image',
                                        category: activeTab,
                                        name: item.name
                                    }));
                                }}
                                onClick={() => handleAssetClick(item, activeTab)}
                                className="aspect-square rounded-lg p-2 bg-white border border-gray-100 hover:border-catalog-accent/30 cursor-pointer flex items-center justify-center transition-all relative group"
                            >
                                <img src={item.url} alt={item.name} className="w-full h-full object-contain" />
                                <div className="absolute inset-x-0 bottom-0 py-1 bg-black/40 text-[8px] text-white text-center opacity-0 group-hover:opacity-100 transition-opacity truncate px-1">
                                    {item.name}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

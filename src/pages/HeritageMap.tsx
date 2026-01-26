// @locked - This file is locked. Do not edit unless requested to unlock.
import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import {
    MapPin,
    Calendar,
    Filter,
    X,
    Tag,
    Book,
    Image as ImageIcon,
    Globe,
    History,
    ChevronRight,
    Loader2
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

// 1. TypeScript Strictness: Clear Interface Definitions
export interface HeritageLocation {
    id: string;
    type: 'event' | 'album';
    title: string;
    location: string;
    country?: string;
    date: string;
    category?: string;
    participants?: string[];
    lat: number;
    lng: number;
    coverImage?: string;
    link: string;
}

// 2. Leaflet Asset Configuration (Optimized)
import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet's default icon paths in Vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIconRetina from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Import CSS for MarkerCluster
import 'react-leaflet-cluster/dist/assets/MarkerCluster.css';
import 'react-leaflet-cluster/dist/assets/MarkerCluster.Default.css';

if (typeof window !== 'undefined') {
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: markerIconRetina,
        iconUrl: markerIcon,
        shadowUrl: markerShadow,
    });
}

const getCountryColor = (country?: string) => {
    const colors = [
        '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF',
        '#E2F0CB', '#FFDAC1', '#FF9AA2', '#E0BBE4', '#957DAD'
    ];
    if (!country) return '#cbd5e1';
    let hash = 0;
    for (let i = 0; i < country.length; i++) {
        hash = country.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
};

// 4. Dynamic Import for Map Components (Requirement 4)
const MapView = lazy(() => import('./HeritageMapView.tsx'));

const MAP_STYLES = {
    realistic: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    streets: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",
    voyager: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
    dark: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
};

export function HeritageMap() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const locationParam = searchParams.get('location');

    const { familyId, user } = useAuth();
    const [items, setItems] = useState<HeritageLocation[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<HeritageLocation | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [showPath, setShowPath] = useState(true);

    // Filters state
    const [yearFilter, setYearFilter] = useState<string>('all');
    const [countryFilter, setCountryFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [mapStyle, setMapStyle] = useState<keyof typeof MAP_STYLES>('realistic');

    const refreshData = async () => {
        if (!familyId) {
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            console.log(`[HeritageMap] Starting sync for family: ${familyId}, user: ${user?.id}`);

            // Fetch Events - Simple family_id filter (select * to match Events.tsx and avoid schema issues)
            const { data: eventsData, error: eventsError } = await (supabase as any)
                .from('events')
                .select('*')
                .eq('family_id', familyId);

            if (eventsError) {
                console.error('[HeritageMap] Error fetching events:', eventsError);
            }
            console.log(`[HeritageMap] Fetched ${eventsData?.length || 0} events for family ${familyId}`);

            // Fetch Albums
            const { data: albumsData, error: albumsError } = await (supabase as any)
                .from('albums')
                .select('id, title, location, country, created_at, category, geotag, config, pages(id, page_number, assets(*))')
                .eq('family_id', familyId);

            if (albumsError) {
                console.error('[HeritageMap] Error fetching albums:', albumsError);
            }
            console.log(`[HeritageMap] Fetched ${albumsData?.length || 0} albums for family ${familyId}`);

            // 2. Normalized Coordinate Parser (Handles geotag, geotags, location_data, lat/lng columns)
            const parseCoords = (item: any) => {
                let lat = NaN;
                let lng = NaN;

                // Priority 1: Check geotag/geotags field (JSON object or string)
                let tag = item.geotag || item.geotags || item.location_data;
                if (typeof tag === 'string') {
                    try { tag = JSON.parse(tag); } catch (e) { tag = null; }
                }

                // Handle array format [lng, lat] (GeoJSON format)
                if (Array.isArray(tag) && tag.length === 2) {
                    lng = parseFloat(tag[0]);
                    lat = parseFloat(tag[1]);
                }
                // Handle object format { lat, lng } or { latitude, longitude }
                else if (tag && typeof tag === 'object') {
                    lat = parseFloat(tag.lat ?? tag.latitude ?? NaN);
                    lng = parseFloat(tag.lng ?? tag.lon ?? tag.longitude ?? NaN);
                }

                // Priority 2: Fallback to root-level latitude/longitude columns
                if ((isNaN(lat) || isNaN(lng)) && item.latitude && item.longitude) {
                    lat = parseFloat(item.latitude);
                    lng = parseFloat(item.longitude);
                }

                return { lat, lng };
            };

            const normalizedEvents: HeritageLocation[] = (eventsData || [])
                .map((e: any, index: number) => {
                    const { lat, lng } = parseCoords(e);

                    // Extract cover image from content.assets
                    let coverUrl = undefined;
                    let content = e.content;
                    if (typeof content === 'string') {
                        try { content = JSON.parse(content); } catch (err) { content = {}; }
                    }

                    if (content?.assets?.length > 0) {
                        const firstAsset = content.assets.find((a: any) => a.type === 'image' || a.type === 'video');
                        if (firstAsset) coverUrl = firstAsset.url;
                    }

                    if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
                        console.log(`[HeritageMap] Event ${index} skipped: missing coordinates`);
                        return null;
                    }

                    return {
                        id: e.id,
                        type: 'event' as const,
                        title: e.title,
                        location: e.location || '',
                        country: e.country,
                        date: e.event_date,
                        category: e.category,
                        participants: e.participants,
                        lat,
                        lng,
                        coverImage: coverUrl,
                        link: `/event/${e.id}/view`
                    };
                })
                .filter((item: any): item is HeritageLocation => item !== null);

            const normalizedAlbums: HeritageLocation[] = [];
            (albumsData || []).forEach((a: any) => {
                let config = a.config || {};
                if (typeof config === 'string') {
                    try { config = JSON.parse(config); } catch (err) { config = {}; }
                }

                let albumTag = a.geotag || config.geotag;
                if (typeof albumTag === 'string') {
                    try { albumTag = JSON.parse(albumTag); } catch (e) { albumTag = null; }
                }

                if (albumTag) {
                    const valLat = parseFloat(albumTag.lat ?? albumTag.latitude ?? NaN);
                    const valLng = parseFloat(albumTag.lng ?? albumTag.lon ?? albumTag.longitude ?? NaN);
                    if (!isNaN(valLat) && !isNaN(valLng) && valLat !== 0 && valLng !== 0) {
                        normalizedAlbums.push({
                            id: a.id,
                            type: 'album',
                            title: a.title,
                            location: a.location || config.location || '',
                            country: a.country || config.country,
                            date: a.created_at,
                            category: a.category || config.category,
                            lat: valLat,
                            lng: valLng,
                            coverImage: config.coverImage || (config.cover && config.cover.url) || undefined,
                            link: `/album/${a.id}`
                        });
                    }
                }

                if (a.pages && Array.isArray(a.pages)) {
                    a.pages.forEach((p: any) => {
                        const assets = p.assets || [];
                        assets.forEach((asset: any) => {
                            let assetConfig = asset.config || {};
                            if (typeof assetConfig === 'string') {
                                try { assetConfig = JSON.parse(assetConfig); } catch (e) { assetConfig = {}; }
                            }
                            const assetType = assetConfig.originalType || asset.asset_type || asset.type;
                            const lat = parseFloat(assetConfig.lat ?? assetConfig.latitude ?? asset.lat ?? NaN);
                            const lng = parseFloat(assetConfig.lng ?? assetConfig.longitude ?? asset.lng ?? NaN);

                            if (assetType === 'location') {
                                if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
                                    normalizedAlbums.push({
                                        id: asset.id || `${a.id}-page-${p.page_number}-loc`,
                                        type: 'album',
                                        title: assetConfig.name || assetConfig.content || assetConfig.address || `${a.title} - Page ${p.page_number}`,
                                        location: assetConfig.content || assetConfig.address || '',
                                        country: '',
                                        date: a.created_at,
                                        category: a.category,
                                        lat,
                                        lng,
                                        coverImage: assetConfig.previewImage || (config.cover && config.cover.url) || undefined,
                                        link: `/album/${a.id}?page=${p.page_number}`
                                    });
                                }
                            }

                            const mapConfig = assetConfig.mapConfig;
                            if (assetType === 'map' && mapConfig?.places && Array.isArray(mapConfig.places)) {
                                mapConfig.places.forEach((place: any, index: number) => {
                                    const pLat = parseFloat(place.lat);
                                    const pLng = parseFloat(place.lng);
                                    if (!isNaN(pLat) && !isNaN(pLng) && pLat !== 0 && pLng !== 0) {
                                        normalizedAlbums.push({
                                            id: `${asset.id}-place-${index}`,
                                            type: 'album',
                                            title: place.name || `${a.title} - Place ${index + 1}`,
                                            location: place.name || '',
                                            country: '',
                                            date: a.created_at,
                                            category: a.category,
                                            lat: pLat,
                                            lng: pLng,
                                            coverImage: assetConfig.previewImage || (config.cover && config.cover.url) || undefined,
                                            link: `/album/${a.id}?page=${p.page_number}`
                                        });
                                    }
                                });
                            }
                        });
                    });
                }
            });

            const allItems = [...normalizedEvents, ...normalizedAlbums]
                .filter(e => !isNaN(e.lat) && !isNaN(e.lng) && e.lat !== 0 && e.lng !== 0)
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

            console.log(`[HeritageMap] Final markers: ${allItems.length} total (${normalizedEvents.length} events + ${normalizedAlbums.length} album locations)`);
            setItems(allItems);
        } catch (error) {
            console.error('Error fetching map items:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshData();
    }, [familyId]);

    const filteredItems = useMemo(() => {
        return items.filter(i => {
            const matchesYear = yearFilter === 'all' || new Date(i.date).getFullYear().toString() === yearFilter;
            const matchesCountry = countryFilter === 'all' || i.country === countryFilter;
            const matchesCategory = categoryFilter === 'all' || i.category === categoryFilter;
            const matchesType = typeFilter === 'all' || i.type === typeFilter;
            return matchesYear && matchesCountry && matchesCategory && matchesType;
        });
    }, [items, yearFilter, countryFilter, categoryFilter, typeFilter]);

    const years = useMemo(() => {
        const yearSet = new Set(items.map(i => new Date(i.date).getFullYear().toString()));
        return ['all', ...Array.from(yearSet).sort().reverse()];
    }, [items]);

    const countriesList = useMemo(() => {
        const countrySet = new Set(items.filter(i => i.country).map(i => i.country!));
        return ['all', ...Array.from(countrySet).sort()];
    }, [items]);

    const categoriesList = useMemo(() => {
        const catSet = new Set(items.filter(i => i.category).map(i => i.category!));
        return ['all', ...Array.from(catSet).sort()];
    }, [items]);

    const createCustomMarkerIcon = useMemo(() => (item: HeritageLocation, count: number = 1) => {
        const color = getCountryColor(item.country);
        const isPhotoPin = count === 1 && item.coverImage;

        const backgroundStyle = isPhotoPin
            ? `background-image: url(${item.coverImage}); background-size: cover; background-position: center; border: 2px solid white;`
            : `background-color: ${color}; border: 4px solid white;`;

        const html = `
            <div class="relative flex items-center justify-center cursor-pointer group">
                <div class="w-10 h-10 rounded-full shadow-lg flex items-center justify-center text-[11px] font-black text-white hover:ring-4 hover:ring-catalog-accent/20 transition-all transform hover:rotate-6" style="${backgroundStyle}">
                    ${!isPhotoPin ? (count > 1 ? `<span>${count}</span>` : '<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.88-2.88 7.19-5 9.88C9.92 16.19 7 11.88 7 9z"/><circle cx="12" cy="9" r="2.5"/></svg>') : ''}
                </div>
            </div>
        `;

        return L.divIcon({
            html,
            className: 'custom-leaflet-marker',
            iconSize: [40, 40],
            iconAnchor: [20, 40],
            popupAnchor: [0, -40]
        });
    }, []);

    useEffect(() => {
        if (!locationParam || items.length === 0) return;
        const decodedMsg = decodeURIComponent(locationParam).toLowerCase();
        const match = items.find(i => i.location.toLowerCase().includes(decodedMsg) || i.title.toLowerCase().includes(decodedMsg));
        if (match) setSelectedItem(match);
    }, [items, locationParam]);

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-catalog-bg animate-fade-in relative overflow-hidden">
            {loading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-catalog-bg/80 backdrop-blur-sm uppercase font-bold tracking-[0.2em] text-[10px] text-catalog-accent">
                    <Loader2 className="w-8 h-8 animate-spin mb-2" />
                    Syncing...
                </div>
            )}

            <div className="absolute top-6 left-6 z-[500] max-w-sm pointer-events-none">
                <Card className="p-6 bg-white/95 backdrop-blur-md border border-catalog-accent/10 shadow-2xl pointer-events-auto rounded-3xl">
                    <div className="flex items-center justify-between mb-4">
                        <div className="space-y-0.5">
                            <h1 className="text-2xl font-serif italic text-catalog-text leading-tight">Heritage Map</h1>
                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-catalog-accent/10 rounded text-[10px] font-black text-catalog-accent uppercase tracking-widest">
                                    <MapPin className="w-3 h-3" /> {items.length} Points
                                </span>
                            </div>
                        </div>
                        <Button
                            variant="glass"
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "h-10 w-10 p-0 rounded-full",
                                showFilters ? "bg-catalog-accent text-white" : "text-catalog-accent"
                            )}
                        >
                            <Filter className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <button
                            onClick={() => setShowPath(!showPath)}
                            className={cn("flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all", showPath ? 'bg-catalog-accent text-white shadow-sm' : 'bg-gray-100 text-gray-500 hover:bg-gray-200')}
                        >
                            <History className="w-3 h-3" /> Timeline Path
                        </button>
                    </div>

                    <div className="flex gap-1 p-1 bg-gray-50 rounded-xl border border-gray-100">
                        {Object.keys(MAP_STYLES).map((key) => (
                            <button
                                key={key}
                                onClick={() => setMapStyle(key as any)}
                                className={cn(
                                    "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all",
                                    mapStyle === key ? "bg-white text-catalog-accent shadow-sm" : "text-gray-400 hover:text-gray-600"
                                )}
                            >
                                {key}
                            </button>
                        ))}
                    </div>

                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Year
                                </label>
                                <select
                                    value={yearFilter}
                                    onChange={(e) => setYearFilter(e.target.value)}
                                    className="w-full bg-gray-50 border-0 rounded-lg px-2 py-1.5 text-[10px] focus:ring-catalog-accent"
                                >
                                    {years.map(y => <option key={y} value={y}>{y === 'all' ? 'All Years' : y}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <Globe className="w-3 h-3" /> Country
                                </label>
                                <select
                                    value={countryFilter}
                                    onChange={(e) => setCountryFilter(e.target.value)}
                                    className="w-full bg-gray-50 border-0 rounded-lg px-2 py-1.5 text-[10px] focus:ring-catalog-accent"
                                >
                                    {countriesList.map(c => <option key={c} value={c}>{c === 'all' ? 'All Countries' : c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <Tag className="w-3 h-3" /> Category
                                </label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="w-full bg-gray-50 border-0 rounded-lg px-2 py-1.5 text-[10px] focus:ring-catalog-accent"
                                >
                                    {categoriesList.map(c => <option key={c} value={c}>{c === 'all' ? 'All' : c}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                                    <Book className="w-3 h-3" /> Type
                                </label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="w-full bg-gray-50 border-0 rounded-lg px-2 py-1.5 text-[10px] focus:ring-catalog-accent"
                                >
                                    <option value="all">All Items</option>
                                    <option value="event">Moments</option>
                                    <option value="album">Albums</option>
                                </select>
                            </div>
                        </div>
                    )}
                </Card>
            </div>

            {selectedItem && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[500] w-full max-w-sm px-6 animate-slide-up pointer-events-none">
                    <Card
                        className="p-4 bg-white shadow-2xl border border-catalog-accent/20 rounded-2xl overflow-hidden relative pointer-events-auto cursor-pointer hover:bg-gray-50 transition-all flex gap-4"
                        onClick={() => navigate(selectedItem.link)}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setSelectedItem(null); }}
                            className="absolute top-2 right-2 p-1 hover:bg-black/5 rounded-full transition-colors z-30"
                        >
                            <X className="w-4 h-4 text-gray-400" />
                        </button>

                        {selectedItem.coverImage && (
                            <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                                <img src={selectedItem.coverImage} className="w-full h-full object-cover" alt="" />
                            </div>
                        )}
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[8px] font-black text-catalog-accent uppercase tracking-widest bg-catalog-accent/5 px-2 py-0.5 rounded">
                                    {selectedItem.type === 'album' ? <Book className="w-2 h-2 inline mr-1" /> : <ImageIcon className="w-2 h-2 inline mr-1" />}
                                    {selectedItem.type}
                                </span>
                            </div>
                            <h3 className="text-lg font-serif italic text-gray-900 leading-tight mb-2 truncate">{selectedItem.title}</h3>
                            <div className="flex flex-col gap-1 text-[9px] text-gray-500 uppercase tracking-wider font-bold">
                                <span className="flex items-center gap-1 truncate"><MapPin className="w-2.5 h-2.5" />{selectedItem.location}</span>
                                <span className="flex items-center gap-1"><Calendar className="w-2.5 h-2.5" />{new Date(selectedItem.date).toLocaleDateString()}</span>
                            </div>
                            <div className="mt-4">
                                <Button className="w-full h-9 text-[10px] font-bold uppercase tracking-widest group rounded-xl">
                                    {selectedItem.type === 'album' ? 'Open Archive' : 'View Moment'}
                                    <ChevronRight className="w-4 h-4 ml-1.5 group-hover:translate-x-1 transition-transform" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                </div>
            )}

            <div className="flex-1 w-full h-full relative block bg-gray-50">
                <Suspense fallback={
                    <div className="w-full h-full flex items-center justify-center">
                        <Loader2 className="w-10 h-10 animate-spin text-catalog-accent/20" />
                    </div>
                }>
                    <MapView
                        items={filteredItems}
                        selectedItem={selectedItem}
                        onMarkerClick={setSelectedItem}
                        mapStyle={MAP_STYLES[mapStyle as keyof typeof MAP_STYLES]}
                        showPath={showPath}
                        createIcon={createCustomMarkerIcon}
                    />
                </Suspense>
            </div>

            <style>{`
                @keyframes slide-up {
                    from { transform: translate(-50%, 40px); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.2, 0.8, 0.2, 1); }
                
                .leaflet-container {
                    cursor: default !important;
                    background: #f8fafc !important;
                }

                .leaflet-bar { border: none !important; box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important; }
                .leaflet-bar a { background-color: white !important; color: #4b5563 !important; }
                .leaflet-bar a:hover { background-color: #f9fafb !important; color: #111827 !important; }

                .custom-leaflet-marker {
                    background: transparent !important;
                    border: none !important;
                }
                
                .marker-cluster-small { background-color: rgba(194, 65, 12, 0.6) !important; }
                .marker-cluster-small div { background-color: rgba(194, 65, 12, 0.8) !important; color: white !important; font-weight: bold !important; }
                .marker-cluster-medium { background-color: rgba(194, 65, 12, 0.6) !important; }
                .marker-cluster-medium div { background-color: rgba(194, 65, 12, 0.9) !important; color: white !important; font-weight: bold !important; }
                .marker-cluster-large { background-color: rgba(194, 65, 12, 0.6) !important; }
                .marker-cluster-large div { background-color: rgba(194, 65, 12, 1) !important; color: white !important; font-weight: bold !important; }
            `}</style>
        </div>
    );
}

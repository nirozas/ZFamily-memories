import { useState, useEffect, useMemo, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { MapPin, Calendar, Filter, X, Tag, Book, Image as ImageIcon, Globe, History, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

interface MapItem {
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
}

const MAP_STYLES: Record<string, any> = {
    streets: "https://tiles.openfreemap.org/styles/liberty",
    positron: "https://tiles.openfreemap.org/styles/positron",
    dark: "https://tiles.openfreemap.org/styles/dark-matter",
    satellite: {
        version: 8,
        sources: {
            'satellite': {
                type: 'raster',
                tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
                tileSize: 256,
                attribution: 'Esri World Imagery'
            }
        },
        layers: [{ id: 'satellite', type: 'raster', source: 'satellite' }]
    }
};
const defaultCenter: [number, number] = [34.7818, 32.0853];

export function HeritageMap() {
    const navigate = useNavigate();
    const { familyId } = useAuth();
    const [items, setItems] = useState<MapItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<MapItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedItem, setSelectedItem] = useState<MapItem | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [showPath, setShowPath] = useState(true);

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);

    // Filters
    const [yearFilter, setYearFilter] = useState<string>('all');
    const [countryFilter, setCountryFilter] = useState<string>('all');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [mapStyle, setMapStyle] = useState<keyof typeof MAP_STYLES>('streets');

    // Manual refresh function
    const refreshData = async () => {
        setLoading(true);
        if (!familyId) {
            setLoading(false);
            return;
        }

        try {
            // Fetch Events
            const { data: eventsData, error: eventsError } = await supabase
                .from('events')
                .select('id, title, location, country, event_date, category, participants, geotag')
                .eq('family_id', familyId);

            if (eventsError) console.error('Error fetching events:', eventsError);

            // Fetch Albums - Now including geotag and location columns
            const { data: albumsData, error: albumsError } = await supabase
                .from('albums')
                .select('id, title, location, country, created_at, category, geotag, config')
                .eq('family_id', familyId);

            if (albumsError) {
                console.error('Error fetching albums:', albumsError);
                // Partial fallback: fetch only guaranteed columns if the table hasn't been updated yet
                const { data: fallbackData } = await supabase
                    .from('albums')
                    .select('id, title, created_at, category, config')
                    .eq('family_id', familyId);
                if (fallbackData) console.log('Retried albums without specific location columns');
            }

            // Combine and normalize
            const normalizedEvents: MapItem[] = (eventsData || [])
                .map((e: any) => {
                    // Check multiple logic paths for coordinates
                    const tag = e.geotag;
                    const lat = tag?.lat ?? tag?.latitude;
                    const lng = tag?.lng ?? tag?.lon ?? tag?.longitude;

                    const parsedLat = typeof lat === 'number' ? lat : parseFloat(lat);
                    const parsedLng = typeof lng === 'number' ? lng : parseFloat(lng);

                    const item = {
                        id: e.id,
                        type: 'event' as const,
                        title: e.title,
                        location: e.location || '',
                        country: e.country,
                        date: e.event_date,
                        category: e.category,
                        participants: e.participants,
                        lat: parsedLat,
                        lng: parsedLng,
                    };
                    if (isNaN(item.lat) || isNaN(item.lng)) {
                        console.warn('Event filtered out (missing or invalid lat/lng):', item.title, { lat: item.lat, lng: item.lng, originalGeotag: tag });
                    }
                    return item;
                })
                .filter(e => !isNaN(e.lat) && !isNaN(e.lng));

            const normalizedAlbums: MapItem[] = (albumsData || [])
                .map((a: any) => {
                    const config = a.config || {};
                    // Priority: Top-level geotag -> Config geotag
                    const tagSource = a.geotag || config.geotag;

                    // Handle lat/lng/latitude/longitude
                    const rawLat = tagSource?.lat ?? tagSource?.latitude;
                    const rawLng = tagSource?.lng ?? tagSource?.lon ?? tagSource?.longitude;

                    const parsedLat = typeof rawLat === 'number' ? rawLat : parseFloat(rawLat);
                    const parsedLng = typeof rawLng === 'number' ? rawLng : parseFloat(rawLng);

                    const item = {
                        id: a.id,
                        type: 'album' as const,
                        title: a.title,
                        location: a.location || config.location || '',
                        country: a.country || config.country,
                        date: a.created_at,
                        category: a.category || config.category,
                        lat: parsedLat,
                        lng: parsedLng,
                    };

                    if (isNaN(item.lat) || isNaN(item.lng)) {
                        console.warn(`Album "${a.title}" filtered out. Coordinates:`, {
                            lat: rawLat,
                            lng: rawLng,
                            source: tagSource,
                            isLatNaN: isNaN(parsedLat),
                            isLngNaN: isNaN(parsedLng)
                        });
                    }
                    return item;
                })
                .filter(a => !isNaN(a.lat) && !isNaN(a.lng));

            const allItems = [...normalizedEvents, ...normalizedAlbums].sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return (isNaN(dateA) ? 0 : dateA) - (isNaN(dateB) ? 0 : dateB);
            });

            console.log('Successfully Normalized Map Items:', allItems.length, allItems);
            setItems(allItems);
        } catch (error) {
            console.error('Error fetching map items:', error);
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        refreshData();
    }, [familyId]);

    // Derived Filter values
    const years = useMemo(() => {
        const yearSet = new Set(items.map(i => new Date(i.date).getFullYear().toString()));
        return ['all', ...Array.from(yearSet).sort().reverse()];
    }, [items]);

    const countries = useMemo(() => {
        const countrySet = new Set(items.filter(i => i.country).map(i => i.country!));
        return ['all', ...Array.from(countrySet).sort()];
    }, [items]);

    const categories = useMemo(() => {
        const catSet = new Set(items.filter(i => i.category).map(i => i.category!));
        return ['all', ...Array.from(catSet).sort()];
    }, [items]);

    // Apply filters
    useEffect(() => {
        let filtered = [...items];

        if (yearFilter !== 'all') {
            filtered = filtered.filter(i => new Date(i.date).getFullYear().toString() === yearFilter);
        }

        if (countryFilter !== 'all') {
            filtered = filtered.filter(i => i.country === countryFilter);
        }

        if (categoryFilter !== 'all') {
            filtered = filtered.filter(i => i.category === categoryFilter);
        }

        if (typeFilter !== 'all') {
            filtered = filtered.filter(i => i.type === typeFilter);
        }

        setFilteredItems(filtered);
    }, [items, yearFilter, countryFilter, categoryFilter, typeFilter]);

    // Initialize Map
    useEffect(() => {
        if (!mapContainerRef.current) return;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: MAP_STYLES[mapStyle],
            center: defaultCenter,
            zoom: 2,
            attributionControl: false
        });

        mapRef.current = map;
        map.addControl(new maplibregl.NavigationControl(), 'top-right');

        map.on('load', () => {
            map.resize();
            // Add 3D buildings if they exist in the tileset
            if (!map.getLayer('3d-buildings')) {
                map.addLayer({
                    'id': '3d-buildings',
                    'source': 'openmaptiles',
                    'source-layer': 'building',
                    'type': 'fill-extrusion',
                    'minzoom': 15,
                    'paint': {
                        'fill-extrusion-color': '#aaa',
                        'fill-extrusion-height': [
                            'interpolate', ['linear'], ['zoom'],
                            15, 0,
                            15.05, ['get', 'render_height']
                        ],
                        'fill-extrusion-base': [
                            'interpolate', ['linear'], ['zoom'],
                            15, 0,
                            15.05, ['get', 'render_min_height']
                        ],
                        'fill-extrusion-opacity': 0.6
                    }
                });
            }
        });

        // Handle container resize
        const resizeObserver = new ResizeObserver(() => {
            map.resize();
        });
        resizeObserver.observe(mapContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            map.remove();
            mapRef.current = null;
        };
    }, [mapStyle]); // Re-init on style change

    // Update Markers and Path
    useEffect(() => {
        if (!mapRef.current) return;
        const map = mapRef.current;

        // Update Path and Markers with style safety
        const redrawMap = () => {
            if (!map.getStyle()) return;

            // Clear existing markers
            markersRef.current.forEach(m => m.remove());
            markersRef.current = [];

            // Add Markers
            filteredItems.forEach((item, index) => {
                const el = document.createElement('div');
                el.className = 'custom-marker';

                const color = item.type === 'album' ? '#9333ea' :
                    item.category === 'wedding' ? '#ffd1dc' :
                        item.category === 'birthday' ? '#fcf6bd' :
                            item.category === 'travel' ? '#b2e2f2' :
                                '#c2410c';

                el.innerHTML = `
                    <div class="relative group cursor-pointer transition-transform duration-300 hover:scale-110 active:scale-95">
                        <div class="flex items-center justify-center relative">
                            <!-- Outer Ring -->
                            <div class="absolute inset-0 rounded-full bg-white/40 blur-sm scale-150 animate-pulse"></div>
                            
                            <!-- Main Marker -->
                            <div class="relative w-10 h-10 flex items-center justify-center">
                                <svg viewBox="0 0 24 24" class="w-full h-full drop-shadow-2xl">
                                    <!-- Pin Path -->
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="white" />
                                    <path d="M12 4C9.24 4 7 6.24 7 9c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5z" style="fill: ${color}" />
                                    <!-- Center Circle -->
                                    <circle cx="12" cy="9" r="2.5" fill="white" />
                                </svg>
                                
                                <!-- Number Bubble -->
                                <div class="absolute -top-1 -right-1 bg-white ring-2 ring-white shadow-lg rounded-full w-5 h-5 flex items-center justify-center">
                                    <span class="text-[8px] font-black text-catalog-text leading-none">
                                        ${index + 1}
                                    </span>
                                </div>
                            </div>

                            <!-- Label Hover -->
                            <div class="absolute -top-8 left-1/2 -translate-x-1/2 bg-white px-2 py-1 rounded-md shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                                <span class="text-[10px] font-bold text-catalog-text">${item.title}</span>
                            </div>
                        </div>
                    </div>
                `;

                const marker = new maplibregl.Marker(el)
                    .setLngLat([item.lng, item.lat])
                    .addTo(map);

                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    setSelectedItem(item);
                });

                markersRef.current.push(marker);
            });

            // Update Path Layer
            const sourceId = 'timeline-path';
            const layerId = 'timeline-path-layer';
            const coordinates = showPath && filteredItems.length > 1
                ? filteredItems.map(item => [item.lng, item.lat])
                : [];

            const geojson: any = {
                'type': 'Feature',
                'properties': {},
                'geometry': { 'type': 'LineString', 'coordinates': coordinates }
            };

            // Check if style is loaded enough to add sources
            try {
                if (map.getSource(sourceId)) {
                    (map.getSource(sourceId) as maplibregl.GeoJSONSource).setData(geojson);
                } else {
                    map.addSource(sourceId, { 'type': 'geojson', 'data': geojson });
                    map.addLayer({
                        'id': layerId,
                        'type': 'line',
                        'source': sourceId,
                        'layout': { 'line-join': 'round', 'line-cap': 'round' },
                        'paint': {
                            'line-color': '#c2410c',
                            'line-width': 3,
                            'line-opacity': 0.6,
                            'line-dasharray': [2, 2]
                        }
                    });
                }
            } catch (e) {
                console.warn("Map style not ready for layers yet", e);
            }

            // Fit bounds
            if (filteredItems.length > 0) {
                const bounds = new maplibregl.LngLatBounds();

                // Logic: If no filters are manually selected, default to zooming on the LATEST YEAR
                let itemsToFit = filteredItems;

                const isDefaultView = yearFilter === 'all' && countryFilter === 'all' && categoryFilter === 'all' && typeFilter === 'all';

                if (isDefaultView) {
                    const years = filteredItems.map(i => new Date(i.date).getFullYear()).filter(y => !isNaN(y));
                    if (years.length > 0) {
                        const maxYear = Math.max(...years);
                        const latestItems = filteredItems.filter(i => new Date(i.date).getFullYear() === maxYear);
                        if (latestItems.length > 0) {
                            itemsToFit = latestItems;
                        }
                    }
                }

                itemsToFit.forEach(item => bounds.extend([item.lng, item.lat]));

                // Use a higher maxZoom (17) to allow "Street View" level details if points are close
                try {
                    map.fitBounds(bounds, { padding: { top: 150, bottom: 50, left: 100, right: 100 }, maxZoom: 17 });
                } catch (e) {
                    console.warn("Could not fit bounds", e);
                }
            }
        };

        if (map.loaded() || map.isStyleLoaded()) {
            redrawMap();
        } else {
            map.once('load', redrawMap);
            map.once('style.load', redrawMap);
        }
    }, [filteredItems, showPath, mapStyle]);

    return (
        <div className="h-[calc(100vh-4rem)] flex flex-col bg-catalog-bg animate-fade-in relative overflow-hidden">
            {/* Loading Overlay */}
            {loading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-catalog-bg/80 backdrop-blur-sm">
                    <div className="text-center">
                        <div className="w-12 h-12 border-4 border-catalog-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-catalog-text/60 font-serif italic">Whispering to the stars for coordinates...</p>
                    </div>
                </div>
            )}

            {/* Overlay Header */}
            <div className="absolute top-6 left-6 z-10 max-w-sm pointer-events-none">
                <Card className="p-6 bg-white/95 backdrop-blur-md border border-catalog-accent/10 shadow-2xl pointer-events-auto">
                    <div className="flex items-center justify-between mb-4">
                        <div className="space-y-0.5">
                            <h1 className="text-2xl font-serif italic text-catalog-text leading-tight">Family History</h1>
                            <div className="flex items-center gap-2">
                                <span className="flex items-center gap-1.5 px-2 py-0.5 bg-catalog-accent/10 rounded text-[10px] font-black text-catalog-accent uppercase tracking-widest">
                                    <MapPin className="w-3 h-3" /> {items.length} Marked
                                </span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={refreshData}
                                    className="h-6 px-2 gap-1 text-[10px] font-black uppercase text-catalog-text/40 hover:text-catalog-accent"
                                >
                                    <History className={cn("w-3 h-3", loading && "animate-spin")} />
                                    Sync
                                </Button>
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
                    <p className="text-sm text-catalog-text/70 leading-relaxed font-sans mb-4">
                        Discover the geographical footprint of your family's journey.
                    </p>

                    <div className="flex flex-wrap items-center gap-3">
                        <span className="flex items-center gap-1.5 px-2 py-1 bg-catalog-accent/10 rounded text-xs font-bold text-catalog-accent uppercase tracking-widest">
                            <MapPin className="w-3 h-3" /> {filteredItems.length} Places
                        </span>
                        <button
                            onClick={() => setShowPath(!showPath)}
                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-bold uppercase tracking-widest transition-colors ${showPath ? 'bg-catalog-accent text-white' : 'bg-catalog-stone/50 text-catalog-text/60'}`}
                        >
                            <History className="w-3 h-3" /> Timeline Path
                        </button>
                    </div>

                    {/* Style Switcher */}
                    <div className="mt-4 flex gap-1 p-1 bg-catalog-stone/5 rounded-lg border border-catalog-accent/5">
                        {Object.entries(MAP_STYLES).map(([key, _]) => (
                            <button
                                key={key}
                                onClick={() => setMapStyle(key as any)}
                                className={cn(
                                    "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all",
                                    mapStyle === key ? "bg-white text-catalog-accent shadow-sm" : "text-catalog-text/40 hover:text-catalog-text"
                                )}
                            >
                                {key}
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Filters Expanded */}
                {showFilters && (
                    <Card className="mt-4 p-4 bg-white/95 backdrop-blur-md border border-catalog-accent/10 shadow-xl pointer-events-auto">
                        <div className="grid grid-cols-2 gap-4">
                            {/* Year Filter */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-catalog-text/40 uppercase tracking-wider flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Year
                                </label>
                                <select
                                    value={yearFilter}
                                    onChange={(e) => setYearFilter(e.target.value)}
                                    className="w-full bg-catalog-stone/10 border-0 rounded-lg px-2 py-1.5 text-xs text-catalog-text focus:ring-2 focus:ring-catalog-accent/30"
                                >
                                    {years.map(year => (
                                        <option key={year} value={year}>{year === 'all' ? 'All Years' : year}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Country Filter */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-catalog-text/40 uppercase tracking-wider flex items-center gap-1">
                                    <Globe className="w-3 h-3" /> Country
                                </label>
                                <select
                                    value={countryFilter}
                                    onChange={(e) => setCountryFilter(e.target.value)}
                                    className="w-full bg-catalog-stone/10 border-0 rounded-lg px-2 py-1.5 text-xs text-catalog-text focus:ring-2 focus:ring-catalog-accent/30"
                                >
                                    {countries.map(country => (
                                        <option key={country} value={country}>{country === 'all' ? 'All Countries' : country}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Category Filter */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-catalog-text/40 uppercase tracking-wider flex items-center gap-1">
                                    <Tag className="w-3 h-3" /> Category
                                </label>
                                <select
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="w-full bg-catalog-stone/10 border-0 rounded-lg px-2 py-1.5 text-xs text-catalog-text focus:ring-2 focus:ring-catalog-accent/30"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat === 'all' ? 'All Categories' : cat}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Type Filter */}
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-catalog-text/40 uppercase tracking-wider flex items-center gap-1">
                                    <ImageIcon className="w-3 h-3" /> Type
                                </label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="w-full bg-catalog-stone/10 border-0 rounded-lg px-2 py-1.5 text-xs text-catalog-text focus:ring-2 focus:ring-catalog-accent/30"
                                >
                                    <option value="all">All Items</option>
                                    <option value="event">Stories Only</option>
                                    <option value="album">Albums Only</option>
                                </select>
                            </div>
                        </div>

                        {(yearFilter !== 'all' || countryFilter !== 'all' || categoryFilter !== 'all' || typeFilter !== 'all') && (
                            <button
                                onClick={() => { setYearFilter('all'); setCountryFilter('all'); setCategoryFilter('all'); setTypeFilter('all'); }}
                                className="mt-4 w-full flex items-center justify-center gap-1 text-[10px] font-bold text-catalog-accent uppercase tracking-widest hover:underline"
                            >
                                <X className="w-3 h-3" /> Clear All Filters
                            </button>
                        )}
                    </Card>
                )}
            </div>

            {/* Map Container */}
            <div ref={mapContainerRef} className="flex-1 w-full h-full relative">
                {items.length === 0 && !loading && (
                    <div className="absolute inset-0 z-20 flex items-center justify-center bg-catalog-stone/5 backdrop-blur-[2px]">
                        <div className="text-center p-8 max-w-sm bg-white/80 rounded-3xl shadow-xl border border-catalog-accent/10">
                            <div className="p-4 bg-catalog-accent/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                                <MapPin className="w-8 h-8 text-catalog-accent" />
                            </div>
                            <h3 className="text-xl font-serif italic text-catalog-text mb-2">The Map is Waiting...</h3>
                            <p className="text-sm text-catalog-text/50 font-sans leading-relaxed">
                                Curate your family's journey by adding locations to your Moments or Albums. Use the <b>Location Picker</b> in the editor to drop pins here.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Custom InfoWindow (Popup) */}
            {selectedItem && (
                <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20 w-full max-w-sm px-6 animate-slide-up">
                    <Card className="p-4 bg-white shadow-2xl border border-catalog-accent/20 overflow-hidden relative pointer-events-auto">
                        <button
                            onClick={() => setSelectedItem(null)}
                            className="absolute top-2 right-2 p-1 hover:bg-black/5 rounded-full transition-colors"
                        >
                            <X className="w-4 h-4 text-catalog-text/40" />
                        </button>

                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-bold text-catalog-accent uppercase tracking-widest bg-catalog-accent/5 px-1.5 py-0.5 rounded flex items-center gap-1">
                                {selectedItem.type === 'album' ? <Book className="w-2.5 h-2.5" /> : <ImageIcon className="w-2.5 h-2.5" />}
                                {selectedItem.type === 'album' ? 'Digital Album' : 'Story'}
                            </span>
                            {selectedItem.category && (
                                <span className="text-[9px] text-catalog-text/40 font-bold uppercase tracking-widest">
                                    {selectedItem.category}
                                </span>
                            )}
                        </div>

                        <h3 className="text-xl font-serif italic text-catalog-text mb-1 leading-tight">{selectedItem.title}</h3>

                        <div className="space-y-1 mb-4">
                            <div className="flex items-center gap-1.5 text-[10px] text-catalog-text/60">
                                <MapPin className="w-3 h-3 text-catalog-accent/50" />
                                {selectedItem.location}{selectedItem.country ? `, ${selectedItem.country}` : ''}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-catalog-text/60">
                                <Calendar className="w-3 h-3 text-catalog-accent/50" />
                                {new Date(selectedItem.date).toLocaleDateString('en-US', {
                                    day: 'numeric',
                                    month: 'long',
                                    year: 'numeric'
                                })}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <Button
                                onClick={() => navigate(selectedItem.type === 'album' ? `/album/${selectedItem.id}` : `/event/${selectedItem.id}/view`)}
                                className="flex-1 text-[10px] font-bold uppercase tracking-widest h-10 group"
                            >
                                {selectedItem.type === 'album' ? 'Open Album' : 'Read Full Story'}
                                <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </div>
                    </Card>
                </div>
            )}

            <style>{`
                .maplibregl-ctrl-logo, .maplibregl-ctrl-attrib { display: none !important; }
                @keyframes slide-up {
                    from { transform: translate(-50%, 100%); opacity: 0; }
                    to { transform: translate(-50%, 0); opacity: 1; }
                }
                .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.2, 0.8, 0.2, 1); }
            `}</style>
        </div>
    );
}

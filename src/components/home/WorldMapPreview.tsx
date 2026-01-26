import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { supabase } from '../../lib/supabase';
import { Globe, ArrowRight, Loader2 } from 'lucide-react';
import { Card } from '../ui/Card';

interface LocationData {
    id: string;
    type: 'album' | 'event';
    title: string;
    lat: number;
    lng: number;
    location: string;
    country?: string;
    coverImage?: string;
    date?: string;
    link?: string;
}

interface WorldMapPreviewProps {
    familyId: string;
}

export function WorldMapPreview({ familyId }: WorldMapPreviewProps) {
    const navigate = useNavigate();
    const [locations, setLocations] = useState<LocationData[]>([]);
    const [loading, setLoading] = useState(true);

    // Map Styles Definition
    const MAP_STYLES: Record<string, any> = {
        streets: "https://tiles.openfreemap.org/styles/liberty",
        realistic: {
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
        },
        light: "https://tiles.openfreemap.org/styles/positron",
        dark: "https://tiles.openfreemap.org/styles/dark-matter",
    };

    const [currentStyle, setCurrentStyle] = useState<string>('realistic');

    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);

    useEffect(() => {
        async function fetchLocations() {
            if (!familyId) {
                setLoading(false);
                return;
            }

            try {
                // Fetch Albums with pages and assets using correct table relationship
                const { data: albumsData, error: albumsError } = await supabase
                    .from('albums')
                    .select('id, title, location, country, geotag, config, created_at, cover_image_url, pages(page_number, assets(*))')
                    .eq('family_id', String(familyId));  // Explicit string cast to prevent UUID mismatch

                if (albumsError) console.error('Albums fetch error:', albumsError);

                // Fetch Events - Use select('*') to match HeritageMap fix
                const { data: eventsData, error: eventsError } = await (supabase as any)
                    .from('events')
                    .select('*')
                    .eq('family_id', String(familyId));

                if (eventsError) console.error('Events fetch error:', eventsError);

                const normalizedAlbums: LocationData[] = [];

                // 2. Optimized Coordinate Parser (Shared logic with HeritageMap)
                const parseCoords = (item: any) => {
                    let lat = NaN;
                    let lng = NaN;
                    let tag = item.geotag || item.geotags || item.location_data;
                    if (typeof tag === 'string') {
                        try { tag = JSON.parse(tag); } catch (e) { tag = null; }
                    }
                    if (Array.isArray(tag) && tag.length === 2) {
                        lng = parseFloat(tag[0]);
                        lat = parseFloat(tag[1]);
                    } else if (tag && typeof tag === 'object') {
                        lat = parseFloat(tag.lat ?? tag.latitude ?? NaN);
                        lng = parseFloat(tag.lng ?? tag.lon ?? tag.longitude ?? NaN);
                    }
                    if ((isNaN(lat) || isNaN(lng)) && item.latitude && item.longitude) {
                        lat = parseFloat(item.latitude);
                        lng = parseFloat(item.longitude);
                    }
                    return { lat, lng };
                };

                // Process Albums
                (albumsData || []).forEach((a: any) => {
                    let config = a.config || {};
                    if (typeof config === 'string') {
                        try { config = JSON.parse(config); } catch (e) { config = {}; }
                    }
                    const cover = a.cover_image_url || (config.cover && config.cover.url) || undefined;

                    // 1. Album-level
                    const albumCoords = parseCoords(a);
                    if (!isNaN(albumCoords.lat) && !isNaN(albumCoords.lng) && albumCoords.lat !== 0 && albumCoords.lng !== 0) {
                        normalizedAlbums.push({
                            id: a.id,
                            type: 'album',
                            title: a.title,
                            location: a.location || config.location || '',
                            country: a.country || config.country,
                            lat: albumCoords.lat,
                            lng: albumCoords.lng,
                            coverImage: cover,
                            date: a.created_at,
                            link: `/album/${a.id}`
                        });
                    }

                    // 2. Page-level assets
                    if (a.pages && Array.isArray(a.pages)) {
                        a.pages.forEach((p: any) => {
                            const assets = p.assets || [];
                            assets.forEach((asset: any) => {
                                let assetConfig = asset.config || {};
                                if (typeof assetConfig === 'string') {
                                    try { assetConfig = JSON.parse(assetConfig); } catch (e) { assetConfig = {}; }
                                }
                                const assetType = assetConfig.originalType || asset.asset_type || asset.type;
                                const assetCoords = parseCoords({ ...asset, geotag: assetConfig });

                                if (assetType === 'location') {
                                    if (!isNaN(assetCoords.lat) && !isNaN(assetCoords.lng) && assetCoords.lat !== 0 && assetCoords.lng !== 0) {
                                        normalizedAlbums.push({
                                            id: asset.id || `${a.id}-p${p.page_number}-loc`,
                                            type: 'album',
                                            title: assetConfig.name || assetConfig.content || assetConfig.address || `${a.title} - Page ${p.page_number}`,
                                            location: assetConfig.content || assetConfig.address || '',
                                            country: '',
                                            lat: assetCoords.lat,
                                            lng: assetCoords.lng,
                                            coverImage: assetConfig.previewImage || cover,
                                            date: a.created_at,
                                            link: `/album/${a.id}?page=${p.page_number}`
                                        });
                                    }
                                }

                                const mapConfig = assetConfig.mapConfig;
                                if (assetType === 'map' && mapConfig?.places && Array.isArray(mapConfig.places)) {
                                    mapConfig.places.forEach((place: any, idx: number) => {
                                        const pLat = parseFloat(place.lat);
                                        const pLng = parseFloat(place.lng);
                                        if (!isNaN(pLat) && !isNaN(pLng) && pLat !== 0 && pLng !== 0) {
                                            normalizedAlbums.push({
                                                id: `${asset.id}-place-${idx}`,
                                                type: 'album',
                                                title: place.name || `${a.title} - Page ${p.page_number}`,
                                                location: place.name || '',
                                                country: '',
                                                lat: pLat,
                                                lng: pLng,
                                                coverImage: assetConfig.previewImage || cover,
                                                date: a.created_at,
                                                link: `/album/${a.id}?page=${p.page_number}`
                                            });
                                        }
                                    });
                                }
                            });
                        });
                    }
                });

                // Process Events
                const normalizedEvents: LocationData[] = (eventsData || [])
                    .map((e: any) => {
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

                        if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return null;

                        return {
                            id: e.id,
                            type: 'event' as const,
                            title: e.title,
                            location: e.location || '',
                            country: e.country,
                            lat,
                            lng,
                            coverImage: coverUrl,
                            date: e.event_date,
                            link: `/event/${e.id}/view`
                        };
                    })
                    .filter((item: any) => item !== null) as LocationData[];

                setLocations([...normalizedAlbums, ...normalizedEvents]);
            } catch (error) {
                console.error('Error fetching world map markers:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchLocations();
    }, [familyId]);

    const countriesVisitedCount = useMemo(() => {
        const countries = new Set(locations.filter(l => l.country).map(l => l.country));
        return countries.size;
    }, [locations]);

    // Pastel Color Generator
    const getCountryColor = (country?: string) => {
        const colors = [
            '#FFB3BA', '#FFDFBA', '#FFFFBA', '#BAFFC9', '#BAE1FF',
            '#E2F0CB', '#FFDAC1', '#FF9AA2', '#E0BBE4', '#957DAD'
        ];
        if (!country) return '#cbd5e1'; // Slate-300 for unknown
        let hash = 0;
        for (let i = 0; i < country.length; i++) {
            hash = country.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    // Robust Map Initialization
    useEffect(() => {
        if (!mapContainerRef.current || loading) return;

        const map = new maplibregl.Map({
            container: mapContainerRef.current,
            style: MAP_STYLES['realistic'],  // Use new default immediately
            center: [0, 20],
            zoom: 1.2,
            pitch: 0, // Flattened map as requested
            attributionControl: false,
            interactive: true,
            renderWorldCopies: false,
            scrollZoom: false,
        });

        // Add zoom controls
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-left');

        mapRef.current = map;

        const setupMap = () => {
            if (!map.getStyle()) return;
            map.resize();

            // Group items by exact coordinates
            const groupedLocations: Record<string, LocationData[]> = {};
            locations.forEach(loc => {
                const key = `${loc.lat},${loc.lng}`;
                if (!groupedLocations[key]) groupedLocations[key] = [];
                groupedLocations[key].push(loc);
            });

            if (Object.keys(groupedLocations).length > 0) {
                Object.entries(groupedLocations).forEach(([key, locsAtPlace]) => {
                    const [lat, lng] = key.split(',').map(Number);
                    const el = document.createElement('div');
                    const count = locsAtPlace.length;
                    const representativeLoc = locsAtPlace[0];
                    const hasImage = representativeLoc.coverImage;

                    // Marker styling synchronized with Heritage Map photo pins
                    el.className = 'custom-world-marker w-8 h-8 rounded-full shadow-lg cursor-pointer transform hover:scale-125 transition-all border-2 border-white flex items-center justify-center overflow-hidden bg-white';

                    if (hasImage) {
                        el.style.backgroundImage = `url(${representativeLoc.coverImage})`;
                        el.style.backgroundSize = 'cover';
                        el.style.backgroundPosition = 'center';
                    } else {
                        el.style.backgroundColor = getCountryColor(representativeLoc.country);
                    }

                    el.innerHTML = count > 1
                        ? `<div class="bg-black/40 backdrop-blur-sm w-full h-full flex items-center justify-center font-black text-white text-[10px] drop-shadow-sm">${count}</div>`
                        : (hasImage ? '' : `<div class="text-white"><svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zM7 9c0-2.76 2.24-5 5-5s5 2.24 5 5c0 2.88-2.88 7.19-5 9.88C9.92 16.19 7 11.88 7 9z"/><circle cx="12" cy="9" r="2.5"/></svg></div>`);

                    // Create Rich Popup Content with multiple "windows"
                    const popupContent = document.createElement('div');
                    popupContent.className = 'min-w-[280px] max-h-[350px] overflow-y-auto font-sans p-1 scrollbar-thin';

                    let innerItems = locsAtPlace.map(loc => `
                        <div class="group/win relative rounded-xl overflow-hidden mb-3 border border-catalog-accent/5 hover:border-catalog-accent/30 shadow-sm transition-all cursor-pointer bg-white" onclick="window.location.href='${loc.link}'">
                            <div class="relative h-20 bg-gray-50 flex items-center justify-center overflow-hidden">
                                 ${loc.coverImage
                            ? `<img src="${loc.coverImage}" class="w-full h-full object-cover transition-transform duration-500 group-hover/win:scale-110" />`
                            : `<div class="text-catalog-accent/10"><svg class="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg></div>`
                        }
                                 <div class="absolute top-2 left-2 bg-black/40 backdrop-blur-sm text-white text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest shadow-sm">
                                    ${loc.type === 'album' ? 'Archive' : 'Moment'}
                                 </div>
                            </div>
                            <div class="p-3">
                                <h4 class="font-bold text-gray-800 text-[11px] mb-0.5 leading-tight line-clamp-1 group-hover/win:text-catalog-accent transition-colors">${loc.title}</h4>
                                <div class="flex items-center justify-between text-[8px] text-gray-400">
                                    <span class="truncate pr-2">${loc.location}</span>
                                    ${loc.date ? `<span class="whitespace-nowrap font-bold text-catalog-accent/60">${new Date(loc.date).getFullYear()}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `).join('');

                    popupContent.innerHTML = `
                        <div class="px-2 py-3 border-b border-gray-100 mb-3 sticky top-0 bg-white/95 backdrop-blur-md z-10 flex items-baseline justify-between">
                            <h3 class="text-[9px] font-black text-catalog-accent uppercase tracking-widest">${locsAtPlace[0].location || 'Destinations'}</h3>
                            <span class="text-[8px] text-gray-400 font-medium">${count} chapters</span>
                        </div>
                        <div class="px-1">
                            ${innerItems}
                        </div>
                    `;

                    const popup = new maplibregl.Popup({
                        offset: 12,
                        closeButton: false,
                        className: 'custom-world-popup',
                        maxWidth: '300px'
                    }).setDOMContent(popupContent);

                    const marker = new maplibregl.Marker({ element: el })
                        .setLngLat([lng, lat])
                        .addTo(map);

                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        popup.addTo(map);
                        map.easeTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 4) });
                    });

                    markersRef.current.push(marker);
                });
            }
        };

        if (map.loaded()) {
            setupMap();
            // Fix "Invisible Map": Force resize check after render
            setTimeout(() => {
                map.resize();
            }, 200);
        } else {
            map.once('load', () => {
                setTimeout(() => {
                    setupMap();
                    map.resize();
                }, 150);
            });
        }

        // Handle Style Changes dynamically (some markers might need re-adding if layer context clears, though usually markers are DOM)
        map.on('style.load', () => {
            setupMap();
        });

        const resizeObserver = new ResizeObserver(() => map.resize());
        resizeObserver.observe(mapContainerRef.current);

        return () => {
            resizeObserver.disconnect();
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, [loading, locations]);

    // Effect for changing style
    useEffect(() => {
        if (mapRef.current) {
            mapRef.current.setStyle(MAP_STYLES[currentStyle]);
        }
    }, [currentStyle]);

    if (loading) {
        return (
            <div className="relative w-full h-[500px] rounded-2xl overflow-hidden bg-catalog-stone/5 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-catalog-accent animate-spin" />
            </div>
        );
    }

    if (locations.length === 0) {
        return (
            <div
                className="relative w-full h-[500px] rounded-2xl overflow-hidden bg-catalog-stone/5 border border-catalog-accent/10 flex items-center justify-center cursor-pointer group hover:border-catalog-accent/30 transition-all"
                onClick={() => navigate('/map')}
            >
                <div className="text-center p-8 max-w-sm">
                    <div className="p-4 bg-catalog-accent/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                        <Globe className="w-8 h-8 text-catalog-accent" />
                    </div>
                    <h3 className="text-xl font-serif italic text-catalog-text mb-2">Our World Map</h3>
                    <p className="text-sm text-catalog-text/50 font-sans leading-relaxed">
                        Your family's geographical footprint is waiting to be discovered. Add locations to your moments to see them here.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <section className="space-y-6">
            <div className="flex items-center justify-between border-b-2 border-rainbow pb-4">
                <div className="space-y-1">
                    <h2 className="text-3xl font-sans font-bold text-catalog-text">Our Family Footprint</h2>
                    <p className="text-sm text-catalog-text/50">Across {countriesVisitedCount} countries and {locations.length} special places.</p>
                </div>
                <button
                    onClick={() => navigate('/map')}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-catalog-accent/10 text-xs font-bold uppercase tracking-widest text-catalog-accent hover:bg-catalog-accent hover:text-white transition-all group"
                >
                    Expand Map <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
            </div>

            <Card
                className="p-0 overflow-hidden relative group h-[650px]"
            >
                <div ref={mapContainerRef} className="w-full h-full" />

                {/* Visual Overlay */}
                <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-black/5 rounded-2xl" />

                {/* Stats Overlay */}
                <div className="absolute top-4 right-12 flex gap-2 z-10">
                    <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-catalog-accent/10 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                        <span className="text-[10px] font-bold text-catalog-text uppercase tracking-widest">Digital Albums</span>
                    </div>
                    <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-catalog-accent/10 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-orange-600"></div>
                        <span className="text-[10px] font-bold text-catalog-text uppercase tracking-widest">Moments</span>
                    </div>
                </div>

                {/* Style Switcher (Stop Propagation to prevent Navigation) */}
                <div
                    className="absolute bottom-4 right-4 flex gap-1 p-1 bg-white/90 backdrop-blur-md rounded-lg border border-gray-200 shadow-lg pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                >
                    {Object.keys(MAP_STYLES).map((style) => (
                        <button
                            key={style}
                            onClick={() => setCurrentStyle(style)}
                            className={`
                                px-2 py-1 text-[9px] font-black uppercase tracking-widest rounded-md transition-all
                                ${currentStyle === style
                                    ? "bg-catalog-accent text-white shadow-sm"
                                    : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}
                            `}
                        >
                            {style.charAt(0).toUpperCase() + style.slice(1)}
                        </button>
                    ))}
                </div>

                {/* MapLibre Global Styles for Popups */}
                <style>{`
                    .maplibregl-popup-content {
                        background: transparent;
                        box-shadow: none;
                        padding: 0;
                        border-radius: 8px;
                    }
                    .custom-map-popup-window .maplibregl-popup-content {
                         box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
                    }
                    .maplibregl-popup-tip {
                        border-top-color: rgba(255, 255, 255, 0.9);
                    }
                `}</style>
            </Card>
        </section>
    );
}

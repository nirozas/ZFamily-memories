import { useState, useEffect, useRef, useMemo } from 'react';
import { X, MapPin, Search, Loader2, Map, Plus, Check, Image as ImageIcon } from 'lucide-react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Button } from './Button';
import type { Asset } from '../../contexts/AlbumContext';

interface MapAssetModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddMap: (center: { lat: number; lng: number }, zoom: number, places: { name: string; lat: number; lng: number }[]) => void;
    onAddSnapshot?: (dataUrl: string) => void;
    existingLocations: Asset[]; // Location assets already in the album
    initialConfig?: {
        center: { lat: number; lng: number };
        zoom: number;
        places: { name: string; lat: number; lng: number }[];
    };
}

const MAP_STYLE = "https://tiles.openfreemap.org/styles/positron";

export function MapAssetModal({ isOpen, onClose, onAddMap, onAddSnapshot, existingLocations, initialConfig }: MapAssetModalProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);

    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedPlaces, setSelectedPlaces] = useState<{ name: string; lat: number; lng: number }[]>(initialConfig?.places || []);
    const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>(initialConfig?.center || { lat: 30, lng: 20 });
    const [mapZoom, setMapZoom] = useState(initialConfig?.zoom || 2);
    const [isMapReady, setIsMapReady] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);

    // Extract existing location places from album
    const albumLocations = useMemo(() => {
        return existingLocations
            .filter(a => a.type === 'location' && a.lat !== undefined && a.lng !== undefined)
            .map(a => ({
                name: a.content || 'Unknown',
                lat: a.lat!,
                lng: a.lng!
            }));
    }, [existingLocations]);

    // Initialize with filtered locations for THIS album
    useEffect(() => {
        if (initialConfig && initialConfig.places.length > 0) {
            // EDIT MODE: Use explicitly saved places
            setSelectedPlaces(initialConfig.places);
            setMapCenter(initialConfig.center);
            setMapZoom(initialConfig.zoom);
        } else {
            // NEW MODE: Default to existing album locations
            if (albumLocations.length > 0) {
                // Populate with existing locations
                setSelectedPlaces(albumLocations);

                // Center on the first location
                setMapCenter({ lat: albumLocations[0].lat, lng: albumLocations[0].lng });
                setMapZoom(4);
            } else {
                // No locations found? Start with empty list 
                setSelectedPlaces([]);
            }

            // Optional: If we want to be helpful, we could try to find one location to center on
            if (albumLocations.length > 0) {
                setMapCenter({ lat: albumLocations[0].lat, lng: albumLocations[0].lng });
                setMapZoom(4);
            }
        }
    }, [initialConfig, albumLocations]);

    // Initialize Map
    useEffect(() => {
        if (!isOpen || !mapContainerRef.current) return;

        // Small delay to ensure modal is visible
        const timer = setTimeout(() => {
            if (!mapContainerRef.current) return;

            const map = new maplibregl.Map({
                container: mapContainerRef.current,
                style: MAP_STYLE,
                center: [mapCenter.lng, mapCenter.lat],
                zoom: mapZoom,
                attributionControl: false,
            });

            map.addControl(new maplibregl.NavigationControl(), 'top-right');
            mapRef.current = map;

            map.on('load', () => {
                setIsMapReady(true);
                map.resize();
            });

            map.on('moveend', () => {
                const center = map.getCenter();
                setMapCenter({ lat: center.lat, lng: center.lng });
                setMapZoom(map.getZoom());
            });
        }, 100);

        return () => {
            clearTimeout(timer);
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
                setIsMapReady(false);
            }
        };
    }, [isOpen]);

    // Update markers when places change
    useEffect(() => {
        if (!mapRef.current || !isMapReady) return;
        const map = mapRef.current;

        // Clear existing markers
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        // Add markers for each place
        selectedPlaces.forEach((place, idx) => {
            const el = document.createElement('div');
            el.className = 'map-asset-marker';
            el.innerHTML = `
                <div class="relative flex flex-col items-center">
                    <div class="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center shadow-lg border-2 border-white text-white text-xs font-bold">
                        ${idx + 1}
                    </div>
                    <div class="w-2 h-2 bg-purple-600 rotate-45 -mt-1"></div>
                </div>
            `;

            const popup = new maplibregl.Popup({ offset: 25 }).setHTML(`
                <div class="p-2">
                    <strong class="text-sm">${place.name.split(',')[0]}</strong>
                    <p class="text-xs text-gray-500">${place.name.split(',').slice(1, 3).join(',').trim()}</p>
                </div>
            `);

            const marker = new maplibregl.Marker(el)
                .setLngLat([place.lng, place.lat])
                .setPopup(popup)
                .addTo(map);

            markersRef.current.push(marker);
        });

        // Fit bounds if we have places
        if (selectedPlaces.length > 0) {
            const bounds = new maplibregl.LngLatBounds();
            selectedPlaces.forEach(p => bounds.extend([p.lng, p.lat]));
            try {
                map.fitBounds(bounds, { padding: 50, maxZoom: 10 });
            } catch (e) {
                // Ignore errors for single point
            }
        }
    }, [selectedPlaces, isMapReady]);

    const searchLocation = async (text: string) => {
        if (text.length < 3) {
            setSuggestions([]);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(text)}&limit=5`);
            const data = await response.json();
            setSuggestions(data);
        } catch (error) {
            console.error('Geocoding error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPlace = (item: any) => {
        const name = item.display_name;
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);

        // Don't add duplicates
        if (!selectedPlaces.some(p => Math.abs(p.lat - lat) < 0.001 && Math.abs(p.lng - lng) < 0.001)) {
            setSelectedPlaces(prev => [...prev, { name, lat, lng }]);
        }

        setQuery('');
        setSuggestions([]);

        // Fly to the new location
        if (mapRef.current) {
            mapRef.current.flyTo({ center: [lng, lat], zoom: 8 });
        }
    };

    const handleRemovePlace = (idx: number) => {
        setSelectedPlaces(prev => prev.filter((_, i) => i !== idx));
    };

    const handleConfirm = () => {
        if (selectedPlaces.length === 0) return;
        onAddMap(mapCenter, mapZoom, selectedPlaces);
        onClose();
    };

    const handleSnapshot = () => {
        if (selectedPlaces.length === 0 || !mapRef.current || !onAddSnapshot) return;
        setIsCapturing(true);

        // Slight delay to ensure any pending renders (like markers) are fully painted
        setTimeout(() => {
            try {
                const mapCanvas = mapRef.current?.getCanvas();
                if (mapCanvas) {
                    const dataUrl = mapCanvas.toDataURL('image/png');
                    onAddSnapshot(dataUrl);
                    onClose();
                }
            } catch (err) {
                console.error("Snapshot failed:", err);
            } finally {
                setIsCapturing(false);
            }
        }, 200);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full overflow-hidden animate-in slide-in-from-bottom-4 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                                <Map className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold">Add Interactive Map</h3>
                                <p className="text-white/70 text-sm">Pin your journey on an interactive map</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white/10 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 min-h-0">
                    {/* Sidebar */}
                    <div className="w-72 border-r border-gray-200 flex flex-col shrink-0">
                        {/* Search */}
                        <div className="p-4 border-b border-gray-100">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="Search for a place..."
                                    value={query}
                                    onChange={(e) => {
                                        setQuery(e.target.value);
                                        searchLocation(e.target.value);
                                    }}
                                    className="w-full px-4 py-2.5 pl-10 bg-gray-100 border-0 rounded-lg text-sm text-catalog-text placeholder:text-catalog-text/40 focus:outline-none focus:ring-2 focus:ring-purple-500/30 transition-all"
                                />
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-catalog-text/40" />
                                {loading && (
                                    <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-purple-600 animate-spin" />
                                )}
                            </div>

                            {/* Suggestions */}
                            {suggestions.length > 0 && (
                                <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                                    {suggestions.map((item, idx) => (
                                        <button
                                            key={idx}
                                            className="w-full text-left px-3 py-2 hover:bg-purple-50 transition-colors border-b border-gray-100 last:border-0 flex items-center gap-2 group"
                                            onClick={() => handleAddPlace(item)}
                                        >
                                            <Plus className="w-4 h-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-catalog-text truncate">
                                                    {item.display_name.split(',')[0]}
                                                </p>
                                                <p className="text-[10px] text-catalog-text/40 truncate">
                                                    {item.display_name.split(',').slice(1, 3).join(',').trim()}
                                                </p>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Selected Places */}
                        <div className="flex-1 overflow-y-auto p-4">
                            <h4 className="text-[10px] font-bold text-catalog-text/50 uppercase tracking-widest mb-3">
                                Places on Map ({selectedPlaces.length})
                            </h4>
                            {selectedPlaces.length === 0 ? (
                                <div className="text-center py-6 text-catalog-text/30">
                                    <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-xs">No places added yet</p>
                                    <p className="text-[10px] mt-1">Search and add places above</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedPlaces.map((place, idx) => (
                                        <div
                                            key={idx}
                                            className="flex items-center gap-2 p-2 bg-purple-50 rounded-lg group"
                                        >
                                            <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-medium text-catalog-text truncate">
                                                    {place.name.split(',')[0]}
                                                </p>
                                                <p className="text-[10px] text-catalog-text/40 truncate">
                                                    {place.name.split(',').slice(1, 2).join(',').trim()}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleRemovePlace(idx)}
                                                className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Map */}
                    <div className="flex-1 relative min-h-[400px]">
                        <div ref={mapContainerRef} className="absolute inset-0" />
                        {!isMapReady ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                                <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                            </div>
                        ) : isCapturing && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/50 z-20">
                                <div className="text-center">
                                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto mb-2" />
                                    <p className="text-sm font-bold text-indigo-800">Capturing Snapshot...</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between shrink-0">
                    <p className="text-xs text-catalog-text/50">
                        {selectedPlaces.length > 0
                            ? `${selectedPlaces.length} place${selectedPlaces.length > 1 ? 's' : ''} will be shown on the map`
                            : 'Add at least one place to create a map'
                        }
                    </p>
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={onClose}>
                            Cancel
                        </Button>

                        {onAddSnapshot && (
                            <Button
                                variant="secondary"
                                onClick={handleSnapshot}
                                disabled={selectedPlaces.length === 0 || isCapturing}
                                className="gap-2"
                            >
                                <ImageIcon className="w-4 h-4" />
                                Add as Image
                            </Button>
                        )}

                        <Button
                            variant="primary"
                            onClick={handleConfirm}
                            disabled={selectedPlaces.length === 0 || isCapturing}
                            className="gap-2 bg-purple-600 hover:bg-purple-700"
                        >
                            <Check className="w-4 h-4" />
                            Add Map to Page
                        </Button>
                    </div>
                </div>

                <style>{`
                    .map-asset-marker {
                        cursor: pointer;
                    }
                    .maplibregl-popup-content {
                        padding: 0;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                    }
                    .maplibregl-popup-close-button {
                        font-size: 16px;
                        padding: 4px 8px;
                    }
                `}</style>
            </div>
        </div>
    );
}

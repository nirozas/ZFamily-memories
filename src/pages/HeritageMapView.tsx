// @locked - This file is locked. Do not edit unless requested to unlock.
import { useEffect, useMemo } from 'react';
import {
    MapContainer,
    TileLayer,
    Marker,
    Polyline,
    useMap
} from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import * as L from 'leaflet';
import { type HeritageLocation } from './HeritageMap';

interface HeritageMapViewProps {
    items: HeritageLocation[];
    selectedItem: HeritageLocation | null;
    onMarkerClick: (item: HeritageLocation) => void;
    mapStyle: string;
    showPath: boolean;
    createIcon: (item: HeritageLocation, count?: number) => L.DivIcon;
}

// Helper Component for "Fly To" Behavior
function MapController({ selectedItem, items }: { selectedItem: HeritageLocation | null, items: HeritageLocation[] }) {
    const map = useMap();

    useEffect(() => {
        if (selectedItem) {
            map.flyTo([selectedItem.lat, selectedItem.lng], Math.max(map.getZoom(), 12), {
                duration: 1.5,
                easeLinearity: 0.25
            });
        }
    }, [selectedItem, map]);

    // Initial bounds fitting
    useEffect(() => {
        if (items.length > 0) {
            const bounds = L.latLngBounds(items.map(i => [i.lat, i.lng]));
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
        }
    }, [items, map]);

    return null;
}

const HeritageMapView = ({
    items,
    selectedItem,
    onMarkerClick,
    mapStyle,
    showPath,
    createIcon
}: HeritageMapViewProps) => {

    const pathCoordinates = useMemo(() => {
        return items.map(i => [i.lat, i.lng] as [number, number]);
    }, [items]);

    return (
        <MapContainer
            center={[32.0853, 34.7818]}
            zoom={3}
            className="w-full h-full"
            zoomControl={false}
            scrollWheelZoom={true}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url={mapStyle}
            />

            <MapController selectedItem={selectedItem} items={items} />

            <MarkerClusterGroup
                chunkedLoading={true}
                maxClusterRadius={40}
                showCoverageOnHover={false}
                zoomToBoundsOnClick={true}
            >
                {items.map((item) => (
                    <Marker
                        key={item.id}
                        position={[item.lat, item.lng]}
                        icon={createIcon(item)}
                        eventHandlers={{
                            click: () => onMarkerClick(item)
                        }}
                    />
                ))}
            </MarkerClusterGroup>

            {showPath && pathCoordinates.length > 1 && (
                <Polyline
                    positions={pathCoordinates}
                    pathOptions={{
                        color: '#c2410c',
                        weight: 2,
                        opacity: 0.4,
                        dashArray: '10, 10',
                        lineJoin: 'round'
                    }}
                />
            )}
        </MapContainer>
    );
};

export default HeritageMapView;

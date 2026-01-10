import { useRef, useEffect } from 'react';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';
import { Input } from './Input';
import { MapPin } from 'lucide-react';

const libraries: ("places")[] = ["places"];

interface GoogleLocationPickerProps {
    value: string;
    onChange: (address: string, lat?: number, lng?: number) => void;
    placeholder?: string;
    label?: string;
}

export function GoogleLocationPicker({ value, onChange, placeholder = "Search for a location...", label = "Location" }: GoogleLocationPickerProps) {
    const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
        libraries
    });

    const onLoad = (autocomplete: google.maps.places.Autocomplete) => {
        autocompleteRef.current = autocomplete;
    };

    const onPlaceChanged = () => {
        if (autocompleteRef.current !== null) {
            const place = autocompleteRef.current.getPlace();
            if (place.formatted_address || place.name) {
                const address = place.formatted_address || place.name || '';
                const lat = place.geometry?.location?.lat();
                const lng = place.geometry?.location?.lng();
                onChange(address, lat, lng);
            }
        }
    };

    if (!isLoaded) return <Input label={label} value={value} readOnly placeholder="Loading map..." />;

    return (
        <div className="space-y-1.5 relative">
            <label className="text-xs font-semibold text-catalog-text/50 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {label}
            </label>
            <Autocomplete
                onLoad={onLoad}
                onPlaceChanged={onPlaceChanged}
            >
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className="w-full bg-white border border-catalog-accent/20 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-catalog-accent/30 transition-all font-sans"
                />
            </Autocomplete>
        </div>
    );
}

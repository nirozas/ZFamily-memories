import { useState, useEffect, useRef } from 'react';
import { Input } from './Input';
import { MapPin, Search, Loader2 } from 'lucide-react';

interface LocationPickerProps {
    value: string;
    onChange: (address: string, lat?: number, lng?: number) => void;
    placeholder?: string;
    label?: string;
}

export function LocationPicker({ value, onChange, placeholder = "Search for a location...", label = "Location" }: LocationPickerProps) {
    const [query, setQuery] = useState(value);
    const [suggestions, setSuggestions] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setQuery(value);
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
            setShowSuggestions(true);
        } catch (error) {
            console.error('Geocoding error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (item: any) => {
        const address = item.display_name;
        const lat = parseFloat(item.lat);
        const lng = parseFloat(item.lon);
        onChange(address, lat, lng);
        setQuery(address);
        setShowSuggestions(false);
    };

    return (
        <div className="space-y-1.5 relative" ref={wrapperRef}>
            <label className="text-xs font-semibold text-catalog-text/50 uppercase tracking-wider flex items-center gap-1">
                <MapPin className="w-3 h-3 text-catalog-accent/60" /> {label}
            </label>
            <div className="relative">
                <Input
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        const text = e.target.value;
                        setQuery(text);
                        onChange(text); // Update parent state even without coords
                        searchLocation(text);
                    }}
                    onFocus={() => {
                        if (suggestions.length > 0) setShowSuggestions(true);
                    }}
                    className="pr-10"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {loading ? (
                        <Loader2 className="w-4 h-4 text-catalog-accent animate-spin" />
                    ) : (
                        <Search className="w-4 h-4 text-catalog-text/20" />
                    )}
                </div>
            </div>

            {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-catalog-accent/10 rounded-lg shadow-xl overflow-hidden animate-fade-in">
                    {suggestions.map((item, idx) => (
                        <button
                            key={idx}
                            className="w-full text-left px-4 py-3 hover:bg-catalog-accent/5 transition-colors border-b border-catalog-accent/5 last:border-0 flex items-start gap-3 group"
                            onClick={() => handleSelect(item)}
                        >
                            <MapPin className="w-4 h-4 mt-0.5 text-catalog-text/20 group-hover:text-catalog-accent transition-colors" />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-catalog-text font-medium truncate">
                                    {item.display_name.split(',')[0]}
                                </p>
                                <p className="text-[10px] text-catalog-text/40 truncate">
                                    {item.display_name.split(',').slice(1).join(',').trim()}
                                </p>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

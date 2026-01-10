import { useState } from 'react';
import { Search, Calendar, Tag, X, MapPin } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface FilterState {
    query: string;
    category: string;
    year: string;
    location: string;
}

interface FilterBarProps {
    filters: FilterState;
    onFilterChange: (filters: FilterState) => void;
    categories: string[];
    years: string[];
    locations: string[];
    className?: string;
}

export function FilterBar({ filters, onFilterChange, categories, years, locations, className }: FilterBarProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    const hasActiveFilters = filters.category !== 'all' || filters.year !== 'all' || filters.location !== 'all';

    const handleClear = () => {
        onFilterChange({ query: '', category: 'all', year: 'all', location: 'all' });
    };

    return (
        <div className={cn("space-y-4", className)}>
            <div className="flex items-center gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-catalog-text/40" />
                    <input
                        type="text"
                        placeholder="Search moments, stories, legacy..."
                        value={filters.query}
                        onChange={(e) => onFilterChange({ ...filters, query: e.target.value })}
                        className="w-full pl-10 pr-4 py-3 bg-white border border-catalog-accent/10 rounded-full text-sm font-sans focus:outline-none focus:ring-2 focus:ring-catalog-accent/20 transition-all shadow-sm"
                    />
                </div>
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={cn(
                        "px-4 py-3 rounded-full border transition-all flex items-center gap-2 text-sm font-bold uppercase tracking-widest",
                        isExpanded || hasActiveFilters
                            ? "bg-catalog-accent text-white border-catalog-accent shadow-md"
                            : "bg-white text-catalog-text/60 border-catalog-accent/10 hover:border-catalog-accent/30"
                    )}
                >
                    Filters
                    {hasActiveFilters && (
                        <span className="w-5 h-5 bg-white text-catalog-accent rounded-full flex items-center justify-center text-[10px]">
                            !
                        </span>
                    )}
                </button>
            </div>

            {isExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-white/50 backdrop-blur-sm rounded-2xl border border-catalog-accent/10 animate-slide-down">
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-catalog-text/40 uppercase tracking-widest flex items-center gap-1.5 px-1">
                            <MapPin className="w-3 h-3" /> Location
                        </label>
                        <select
                            value={filters.location}
                            onChange={(e) => onFilterChange({ ...filters, location: e.target.value })}
                            className="w-full bg-white border border-catalog-accent/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-catalog-accent/20"
                        >
                            <option value="all">All Locations</option>
                            {locations.map(loc => (
                                <option key={loc} value={loc}>{loc}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-catalog-text/40 uppercase tracking-widest flex items-center gap-1.5 px-1">
                            <Calendar className="w-3 h-3" /> Year
                        </label>
                        <select
                            value={filters.year}
                            onChange={(e) => onFilterChange({ ...filters, year: e.target.value })}
                            className="w-full bg-white border border-catalog-accent/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-catalog-accent/20"
                        >
                            <option value="all">All Time</option>
                            {years.map(year => (
                                <option key={year} value={year}>{year}</option>
                            ))}
                        </select>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-catalog-text/40 uppercase tracking-widest flex items-center gap-1.5 px-1">
                            <Tag className="w-3 h-3" /> Category
                        </label>
                        <select
                            value={filters.category}
                            onChange={(e) => onFilterChange({ ...filters, category: e.target.value })}
                            className="w-full bg-white border border-catalog-accent/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-catalog-accent/20"
                        >
                            <option value="all">All Categories</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    {(hasActiveFilters || filters.query) && (
                        <div className="sm:col-span-3 flex justify-center pt-2">
                            <button
                                onClick={handleClear}
                                className="text-[10px] font-bold text-catalog-accent uppercase tracking-widest flex items-center gap-1 hover:text-catalog-accent/70 transition-colors"
                            >
                                <X className="w-3 h-3" /> Clear All Filters
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

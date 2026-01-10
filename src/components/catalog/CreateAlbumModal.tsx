import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, BookOpen, Calendar, Tag, Layout, MapPin } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { LocationPicker } from '../ui/LocationPicker';
import type { Event } from '../../types/supabase';

interface CreateAlbumModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CreateAlbumModal({ isOpen, onClose }: CreateAlbumModalProps) {
    const { user, familyId } = useAuth();
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [category, setCategory] = useState('');
    const [eventId, setEventId] = useState<string>('');
    const [size, setSize] = useState('A4-landscape');
    const [locationAddress, setLocationAddress] = useState('');
    const [locationLat, setLocationLat] = useState<number | undefined>();
    const [locationLng, setLocationLng] = useState<number | undefined>();
    const [events, setEvents] = useState<Event[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen && familyId) {
            fetchEvents();
        }
    }, [isOpen, familyId]);

    async function fetchEvents() {
        const { data } = await supabase
            .from('events')
            .select('*')
            .eq('family_id', familyId as any)
            .order('event_date', { ascending: false } as any);
        if (data) setEvents(data);
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!user) {
            alert('You must be logged in to create an album.');
            return;
        }
        if (!familyId) {
            alert('You must be part of a family group to create an album.');
            return;
        }

        setIsLoading(true);
        console.log('Attempting to create album:', { title, category, familyId, userId: user.id });

        try {
            const { data, error } = await supabase
                .from('albums')
                .insert([{
                    title: title.trim(),
                    category: (category || 'General') as any,
                    family_id: familyId,
                    creator_id: user.id,
                    event_id: eventId ? eventId : null,
                    is_published: false,
                    location: locationAddress || '',
                    country: locationAddress ? locationAddress.split(',').pop()?.trim() : '',
                    geotag: (locationLat && locationLng) ? { lat: locationLat, lng: locationLng } : null,
                    config: {
                        theme: 'classic',
                        size,
                        dimensions: (() => {
                            switch (size) {
                                case 'A4-landscape': return { width: 1000, height: 707 };
                                case 'A4-portrait': return { width: 707, height: 1000 };
                                case 'Square': return { width: 1000, height: 1000 };
                                case 'A5-landscape': return { width: 800, height: 566 };
                                case 'A3-landscape': return { width: 1414, height: 1000 };
                                default: return { width: 1000, height: 700 };
                            }
                        })()
                    }
                }] as any)
                .select()
                .single();

            if (error) {
                console.error('Supabase error creating album:', error);
                throw error;
            }

            if (data) {
                console.log('Album created successfully:', data);
                onClose();
                navigate(`/album/${(data as any).id}/edit`);
            }
        } catch (error: any) {
            console.error('Error creating album:', error);
            alert(`Failed to create album: ${error.message || 'Unknown error'}`);
            setIsLoading(false);
        } finally {
            // onClose is called only on success now to allow user to retry
        }
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-lg shadow-2xl max-w-lg w-full overflow-hidden animate-slide-up">
                <div className="p-6 border-b border-catalog-accent/20 flex items-center justify-between bg-catalog-bg/50">
                    <h2 className="text-2xl font-serif text-catalog-text flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-catalog-accent" />
                        Create New Album
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-catalog-text/40" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="space-y-4">
                        {/* Title */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-catalog-accent uppercase tracking-widest flex items-center gap-2">
                                <BookOpen className="w-3 h-3" /> Album Title
                            </label>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="e.g. Summer Memories 2025"
                                className="w-full px-4 py-3 border border-catalog-accent/20 rounded-sm focus:outline-none focus:ring-2 focus:ring-catalog-accent/50 bg-white"
                                required
                            />
                        </div>

                        {/* Category */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-catalog-accent uppercase tracking-widest flex items-center gap-2">
                                <Tag className="w-3 h-3" /> Category
                            </label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full px-4 py-3 border border-catalog-accent/20 rounded-sm focus:outline-none focus:ring-2 focus:ring-catalog-accent/50 bg-white appearance-none"
                            >
                                <option value="">Select Category (Optional)</option>
                                <option value="Gathering">Gathering</option>
                                <option value="Wedding">Wedding</option>
                                <option value="Holiday">Holiday</option>
                                <option value="Vacation">Vacation</option>
                                <option value="Birthday">Birthday</option>
                                <option value="Anniversary">Anniversary</option>
                            </select>
                        </div>

                        {/* Event Link */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-catalog-accent uppercase tracking-widest flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> Link to Event
                            </label>
                            <select
                                value={eventId}
                                onChange={(e) => setEventId(e.target.value)}
                                className="w-full px-4 py-3 border border-catalog-accent/20 rounded-sm focus:outline-none focus:ring-2 focus:ring-catalog-accent/50 bg-white appearance-none"
                            >
                                <option value="">None (Standalone Album)</option>
                                {events.map((event) => (
                                    <option key={event.id} value={event.id}>
                                        {event.title} ({new Date(event.event_date).getFullYear()})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-catalog-text/40 italic">Linking an event helps organize your family's timeline.</p>
                        </div>

                        {/* Location */}
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-catalog-accent uppercase tracking-widest flex items-center gap-2">
                                <MapPin className="w-3 h-3" /> Location
                            </label>
                            <LocationPicker
                                value={locationAddress}
                                onChange={(address, lat, lng) => {
                                    setLocationAddress(address);
                                    setLocationLat(lat);
                                    setLocationLng(lng);
                                }}
                                placeholder="Where was this album created?"
                            />
                            <p className="text-[10px] text-catalog-text/40 italic">Location helps display your albums on the family map.</p>
                        </div>

                        {/* Size Selection */}
                        <div className="space-y-2">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-catalog-accent uppercase tracking-widest flex items-center gap-2">
                                    <Layout className="w-3 h-3" /> Album Size
                                </label>
                                <select
                                    value={size}
                                    onChange={(e) => setSize(e.target.value)}
                                    className="w-full px-4 py-3 border border-catalog-accent/20 rounded-sm focus:outline-none focus:ring-2 focus:ring-catalog-accent/50 bg-white appearance-none"
                                >
                                    <option value="A4-landscape">A4 Landscape (297 x 210 mm)</option>
                                    <option value="A4-portrait">A4 Portrait (210 x 297 mm)</option>
                                    <option value="Square">Square (210 x 210 mm)</option>
                                    <option value="A5-landscape">A5 Landscape (210 x 148 mm)</option>
                                    <option value="A3-landscape">A3 Landscape (420 x 297 mm)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-catalog-accent/10">
                        <Button type="button" variant="ghost" className="flex-1" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1" isLoading={isLoading} disabled={!title.trim()}>
                            Begin Recording
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

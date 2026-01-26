// @locked - This file is locked. Do not edit unless requested to unlock.
import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Calendar, Plus, Loader2, Edit } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { Event } from '../types/supabase';
import { ActionToolbar } from '../components/ui/ActionToolbar';
import { SharingDialog } from '../components/sharing/SharingDialog';
import { FilterBar, type FilterState } from '../components/ui/FilterBar';
import { motion } from 'framer-motion';
import { storageService } from '../services/storage';
import { GooglePhotosService } from '../services/googlePhotos';
import { GooglePhotosSelector } from '../components/media/GooglePhotosSelector';
import type { GoogleMediaItem } from '../services/googlePhotos';
import { UrlInputModal } from '../components/media/UrlInputModal';
import { Image, Link as LinkIcon, Upload, FolderOpen } from 'lucide-react';
import { ImageCropper } from '../components/ui/ImageCropper';
import { MediaPickerModal } from '../components/media/MediaPickerModal';

export function Events() {
    const { familyId, userRole, googleAccessToken } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState<any[]>([]);
    const [linkedAlbums, setLinkedAlbums] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [creatingAlbumFor, setCreatingAlbumFor] = useState<string | null>(null);
    const [sharingEventId, setSharingEventId] = useState<string | null>(null);
    const [filters, setFilters] = useState<FilterState>({ query: '', category: 'all', year: 'all', location: 'all' });
    const [categories, setCategories] = useState<string[]>([]);
    const [years, setYears] = useState<string[]>([]);
    const [locations, setLocations] = useState<string[]>([]);
    const [searchParams] = useSearchParams();

    const isAdmin = userRole === 'admin';
    const [isUpdatingCover, setIsUpdatingCover] = useState<string | null>(null);
    const eventCoverInputRef = useRef<HTMLInputElement>(null);
    const activeEventIdRef = useRef<string | null>(null);

    const [showSourceModal, setShowSourceModal] = useState<string | null>(null); // eventId
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [showGooglePhotos, setShowGooglePhotos] = useState(false);
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [showCropper, setShowCropper] = useState<{ src: string } | null>(null);

    const handleSourceSelect = (source: 'upload' | 'google' | 'url' | 'library') => {
        const eventId = showSourceModal;
        if (!eventId) return;

        setShowSourceModal(null);
        activeEventIdRef.current = eventId;

        if (source === 'upload') {
            eventCoverInputRef.current?.click();
        } else if (source === 'google') {
            setShowGooglePhotos(true);
        } else if (source === 'url') {
            setShowUrlInput(true);
        } else if (source === 'library') {
            setShowMediaPicker(true);
        }
    };

    const handleUrlSubmit = async (url: string) => {
        const eventId = activeEventIdRef.current;
        if (!eventId || !url) return;

        setShowUrlInput(false);
        await processCoverUpdate(eventId, url, undefined, 'url');
    };

    const handleGooglePhotosSelect = async (items: GoogleMediaItem[]) => {
        const eventId = activeEventIdRef.current;
        if (!eventId || items.length === 0) return;

        setShowGooglePhotos(false);
        const item = items[0];
        const url = item.mediaFile?.baseUrl || item.baseUrl || '';
        await processCoverUpdate(eventId, url, item.id, 'google');
    };

    const handleMediaPickerSelect = async (item: any) => {
        setShowMediaPicker(false);
        if (!item || !activeEventIdRef.current) return;
        setShowCropper({ src: item.url });
    };

    const handleCropComplete = async (croppedImageUrl: string) => {
        const eventId = activeEventIdRef.current;
        if (!eventId) return;

        setShowCropper(null);
        try {
            const response = await fetch(croppedImageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'cropped_cover.jpg', { type: 'image/jpeg' });
            await processCoverUpdate(eventId, file, undefined, 'file');
        } catch (e) {
            console.error("Crop processing failed", e);
        }
    };

    const processCoverUpdate = async (eventId: string, sourceUrlOrFile: string | File, googleId?: string, type: 'file' | 'url' | 'google' = 'file') => {
        if (!familyId) return;
        setIsUpdatingCover(eventId);

        try {
            let finalUrl: string | null = null;
            let googlePhotoId: string | undefined = googleId;

            if (type === 'file') {
                const file = sourceUrlOrFile as File;

                // Workflow #1: Upload to Google Photos
                if (googleAccessToken) {
                    try {
                        const photosService = new GooglePhotosService(googleAccessToken);
                        const mediaItem = await photosService.uploadMedia(file, `Event Cover: ${eventId}`);
                        // Prioritize preserving the original ID
                        googlePhotoId = mediaItem.id;
                    } catch (err) {
                        console.error('Google Photos upload failed:', err);
                    }
                }

                // Workflow #2: Interior Storage
                const { url: storageUrl } = await storageService.uploadFile(file, 'album-assets', `events/${eventId}/cover/`);
                if (storageUrl) finalUrl = storageUrl;

            } else if (type === 'url') {
                const url = sourceUrlOrFile as string;
                // Currently direct URL use. Future: could fetch and re-upload to storage for permanence.
                finalUrl = url;
            } else if (type === 'google') {
                const url = sourceUrlOrFile as string;
                // For Google Picker items, we might want to check if we can get a permanent URL
                // or download and re-upload. For now, use the URL provided (which might expiry if not processed)
                // But since we have "SecureThumbnail" logic elsewhere, maybe acceptable.
                // BETTER: Download and re-upload to storage to prevent expiry
                try {
                    if (googleAccessToken) {
                        const photosService = new GooglePhotosService(googleAccessToken);
                        const blob = await photosService.downloadMediaItem(url);
                        const file = new File([blob], `google_import_${eventId}.jpg`, { type: 'image/jpeg' });
                        const { url: storageUrl } = await storageService.uploadFile(file, 'album-assets', `events/${eventId}/cover/`);
                        if (storageUrl) finalUrl = storageUrl;
                    } else {
                        finalUrl = url; // Fallback
                    }
                } catch (err) {
                    console.error('Failed to process Google Photo for persistent storage:', err);
                    finalUrl = url; // Fallback to raw URL
                }
            }

            if (finalUrl) {
                // Fetch current event to get latest content
                const { data: event } = await (supabase as any)
                    .from('events')
                    .select('content')
                    .eq('id', eventId)
                    .single();

                let content = (event as any)?.content || {};
                if (typeof content === 'string') {
                    try { content = JSON.parse(content); } catch (e) { content = {}; }
                }

                const updatedContent = {
                    ...content,
                    presentationUrl: finalUrl,
                    googlePhotoId: googlePhotoId || content.googlePhotoId
                };

                const { data: updatedRows, error: updateError } = await (supabase.from('events') as any)
                    .update({ content: updatedContent })
                    .eq('id', eventId)
                    .select();

                if (updateError) throw updateError;
                if (!updatedRows || updatedRows.length === 0) {
                    throw new Error('Permission denied: Unable to update this event. You may not be the creator.');
                }

                // Update local state
                setEvents((prev: any[]) => prev.map((ev: any) =>
                    ev.id === eventId ? ({ ...ev, content: updatedContent }) : ev
                ));

                // Log to media library
                const { data: userData } = await supabase.auth.getUser();
                await supabase.from('family_media').insert({
                    family_id: familyId,
                    url: finalUrl,
                    type: 'image',
                    category: 'event',
                    folder: 'Event Covers',
                    filename: type === 'file' ? (sourceUrlOrFile as File).name :
                        type === 'google' && googleId ? `google_import_${eventId}.jpg` :
                            'imported_image.jpg',
                    size: 0,
                    uploaded_by: userData.user?.id,
                    metadata: googlePhotoId ? { googlePhotoId } : undefined
                } as any);

            } else {
                throw new Error("Failed to generate a valid image URL.");
            }
        } catch (err: any) {
            console.error('Error updating event cover:', err);
            alert(`Failed to update cover image: ${err.message}`);
        } finally {
            setIsUpdatingCover(null);
            activeEventIdRef.current = null;
            if (eventCoverInputRef.current) eventCoverInputRef.current.value = '';
        }
    };

    const handleUpdateEventCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const eventId = activeEventIdRef.current;
        if (!file || !familyId || !eventId) return;

        // Show cropper
        const reader = new FileReader();
        reader.onload = () => {
            setShowCropper({ src: reader.result as string });
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    useEffect(() => {
        if (familyId) {
            fetchEventsAndAlbums();
        }
    }, [familyId]);

    useEffect(() => {
        const locationParam = searchParams.get('location');
        if (locationParam) {
            setFilters(prev => ({ ...prev, location: locationParam }));
        }
    }, [searchParams]);

    const fetchEventsAndAlbums = async () => {
        if (!familyId) {
            setLoading(false);
            return;
        }
        try {
            const { data: eventsData, error: eventsError } = await supabase
                .from('events')
                .select('*')
                .eq('family_id', familyId)
                .order('event_date', { ascending: false });

            if (eventsError) throw eventsError;
            const fetchedEvents = (eventsData || []) as any[];
            setEvents(fetchedEvents);

            const { data: albumsData, error: albumsError } = await supabase
                .from('albums')
                .select('id, event_id')
                .eq('family_id', familyId)
                .not('event_id', 'is', null);

            if (albumsError) throw albumsError;

            const albumMap: Record<string, string> = {};
            if (albumsData) {
                ((albumsData as unknown) as { id: string; event_id: string }[]).forEach(album => {
                    if (album.event_id) {
                        albumMap[album.event_id] = album.id;
                    }
                });
            }
            setLinkedAlbums(albumMap);

            // Extract unique categories, years, and locations
            const cats = Array.from(new Set(fetchedEvents.map(e => e.category).filter(Boolean))) as string[];
            const yrs = Array.from(new Set(fetchedEvents.map(e => new Date(e.event_date).getFullYear().toString()))) as string[];
            const locs = Array.from(new Set(fetchedEvents.map(e => e.location).filter(Boolean))) as string[];

            setCategories(cats.sort());
            setYears(yrs.sort((a, b) => b.localeCompare(a)));
            setLocations(locs.sort());
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this moment? This will also disconnect any linked albums.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setEvents((prev) => prev.filter(e => e.id !== id));
        } catch (error) {
            console.error('Error deleting event:', error);
            alert('Failed to delete event');
        }
    };

    const handleShareEvent = (id: string) => {
        setSharingEventId(id);
    };

    const handlePrintEvent = async (event: Event) => {
        try {
            const doc = new Blob([`
                <html>
                    <body style="font-family: serif; padding: 40px; line-height: 1.6;">
                        <h1 style="color: #2d2a26;">${event.title}</h1>
                        <p style="color: #999;">${new Date(event.event_date).toLocaleDateString()}</p>
                        ${event.category ? `<p><strong>Category:</strong> ${event.category}</p>` : ''}
                        ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <div style="font-size: 1.1rem;">${event.description || ''}</div>
                    </body>
                </html>
            `], { type: 'text/html' });

            const url = URL.createObjectURL(doc);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${event.title.replace(/\s+/g, '_')}_Moment.html`;
            a.click();
        } catch (error) {
            console.error('Error printing event:', error);
        }
    };

    const handleCreateAlbum = async (event: Event) => {
        if (!familyId || creatingAlbumFor) return;
        setCreatingAlbumFor(event.id);

        try {
            const { data, error } = await supabase
                .from('albums')
                .insert({
                    family_id: familyId,
                    event_id: event.id,
                    title: event.title,
                    description: event.description,
                    category: event.category,
                    is_published: false
                } as any)
                .select()
                .single();

            if (error) throw error;
            navigate(`/album/${(data as any).id}/edit`);
        } catch (error) {
            console.error('Error creating album:', error);
            setCreatingAlbumFor(null);
        }
    };

    const filteredEvents = events.filter(event => {
        const matchesQuery = !filters.query ||
            event.title.toLowerCase().includes(filters.query.toLowerCase()) ||
            (event.description && event.description.toLowerCase().includes(filters.query.toLowerCase()));

        const matchesCategory = filters.category === 'all' || event.category === filters.category;
        const matchesYear = filters.year === 'all' || new Date(event.event_date).getFullYear().toString() === filters.year;
        const matchesLocation = filters.location === 'all' ||
            (event.location?.trim() === filters.location?.trim());

        return matchesQuery && matchesCategory && matchesYear && matchesLocation;
    });



    const groupedEvents = filteredEvents.reduce((groups: Record<string, Event[]>, event) => {
        const year = new Date(event.event_date).getFullYear().toString();
        if (!groups[year]) groups[year] = [];
        groups[year].push(event);
        return groups;
    }, {});

    const sortedYears = Object.keys(groupedEvents).sort((a, b) => b.localeCompare(a));

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="w-12 h-12 border-4 border-catalog-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!familyId) {
        return (
            <div className="container-fluid max-w-wide py-20 text-center">
                <Card className="max-w-md mx-auto p-12 space-y-6">
                    <div className="w-20 h-20 bg-catalog-accent/5 rounded-full flex items-center justify-center mx-auto">
                        <Calendar className="w-10 h-10 text-catalog-accent" />
                    </div>
                    <h2 className="text-3xl font-serif text-catalog-text">The Hearth is Quiet</h2>
                    <p className="text-catalog-text/60">
                        Join your family group to see the timeline of shared moments and create your own records.
                    </p>
                    <Button onClick={() => navigate('/settings')} variant="primary" className="w-full">
                        Join Family
                    </Button>
                </Card>
            </div>
        );
    }

    const canCreate = userRole === 'admin' || userRole === 'creator';

    return (
        <div className="space-y-12 animate-fade-in w-full px-6 lg:px-12 pb-20">
            <input
                ref={eventCoverInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpdateEventCover}
            />
            <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-5xl font-serif italic text-catalog-text mb-3">The Hearth</h1>
                    <p className="text-lg font-sans text-catalog-text/70 max-w-xl leading-relaxed">
                        The heartbeat of your family's legacy. A chronological journey through the moments that matter most.
                    </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-4">
                    <FilterBar
                        filters={filters}
                        onFilterChange={setFilters}
                        categories={categories}
                        years={years}
                        locations={locations}
                        className="w-full sm:w-auto min-w-[300px]"
                    />
                    {canCreate && (
                        <Button
                            variant="primary"
                            onClick={() => navigate('/event/new')}
                            className="shadow-md hover:shadow-lg transition-all w-full sm:w-auto h-12"
                        >
                            <Plus className="w-5 h-5 mr-2" />
                            Record Moment
                        </Button>
                    )}
                </div>
            </section>

            {events.length === 0 ? (
                <div className="text-center py-20 bg-white/30 rounded-lg border border-catalog-accent/5">
                    <div className="w-20 h-20 bg-catalog-accent/5 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar className="w-8 h-8 text-catalog-accent" />
                    </div>
                    <h3 className="text-2xl font-serif mb-3 text-catalog-text">Your Timeline is Empty</h3>
                    <p className="text-catalog-text/60 max-w-md mx-auto mb-8 font-sans">
                        Every family has a story. Start capturing yours by recording your first significant memory or milestone.
                    </p>
                    {canCreate && (
                        <Button variant="secondary" onClick={() => navigate('/event/new')}>
                            Begin the Journey
                        </Button>
                    )}
                </div>
            ) : (
                <div className="relative space-y-16">
                    {/* Vertical Line */}
                    <div className="absolute left-[20px] top-0 bottom-0 w-px bg-gradient-to-b from-catalog-accent/40 via-catalog-accent/20 to-transparent hidden md:block" />

                    {sortedYears.map((year, yearIndex) => {
                        const YEAR_COLORS = ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#a0c4ff', '#bdb2ff', '#ffc6ff'];
                        const yearColor = YEAR_COLORS[yearIndex % YEAR_COLORS.length];

                        return (
                            <div key={year} className="relative space-y-8">
                                {/* Year Indicator */}
                                <div className="flex items-center gap-4 relative z-10">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-serif italic shadow-lg transition-transform hover:scale-110"
                                        style={{ backgroundColor: yearColor }}
                                    >
                                        {year.slice(-2)}
                                    </div>
                                    <h2 className="text-3xl font-serif italic text-catalog-text">{year}</h2>
                                    <div className="flex-1 h-px bg-catalog-accent/10" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-8 md:pl-14">
                                    {groupedEvents[year].map((event, index) => {
                                        const linkedAlbumId = linkedAlbums[event.id];
                                        const titleColor = YEAR_COLORS[(event.title.length + index + yearIndex) % YEAR_COLORS.length];

                                        // PICK PRESENTATION IMAGE
                                        let currentContent: any = event.content;
                                        if (typeof currentContent === 'string') {
                                            try { currentContent = JSON.parse(currentContent); } catch (e) { currentContent = {}; }
                                        }

                                        const assets = currentContent?.assets || [];
                                        let presentationImage = currentContent?.presentationUrl || assets.find((a: any) => a.type === 'image')?.url;

                                        if (!presentationImage && event.description) {
                                            const imgMatch = event.description.match(/<img[^>]+src="([^">]+)"/);
                                            if (imgMatch) presentationImage = imgMatch[1];
                                        }

                                        // High-quality heritage fallbacks
                                        if (!presentationImage) {
                                            const fallbacks = [
                                                'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80',
                                                'https://images.unsplash.com/photo-1526749837599-b4eba9fd855e?auto=format&fit=crop&w=800&q=80',
                                                'https://images.unsplash.com/photo-1544376798-89aa6b82c6cd?auto=format&fit=crop&w=800&q=80',
                                                'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=800&q=80',
                                                'https://images.unsplash.com/photo-1582234372722-50d7ccc30ebd?auto=format&fit=crop&w=800&q=80',
                                                'https://images.unsplash.com/photo-1473625247510-8ceb1760943f?auto=format&fit=crop&w=800&q=80'
                                            ];
                                            presentationImage = fallbacks[event.id.charCodeAt(0) % fallbacks.length];
                                        }

                                        return (
                                            <motion.div
                                                key={event.id}
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ duration: 0.4 }}
                                            >
                                                {/* CodePen Card Implementation with Tailwind */}
                                                <div className="bg-white rounded shadow-[0_20px_40px_-14px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden hover:shadow-2xl transition-all duration-300 group h-full border-2 border-catalog-accent/5 hover:border-catalog-accent/20 relative">
                                                    {/* Card Image */}
                                                    <div
                                                        className="relative overflow-hidden filter contrast-[0.7] transition-all duration-500 group-hover:contrast-100 bg-[#ececec] cursor-pointer"
                                                        onClick={() => navigate(`/event/${event.id}/view`)}
                                                    >
                                                        <div
                                                            className="w-full bg-cover bg-center bg-no-repeat pt-[56.25%] sm:pt-[66.6%]"
                                                            style={{ backgroundImage: `url(${presentationImage})` }}
                                                        />

                                                        {/* Edit Overlay */}
                                                        {isAdmin && (
                                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        e.stopPropagation();
                                                                        setShowSourceModal(event.id);
                                                                    }}
                                                                    className="p-3 bg-white rounded-full shadow-lg hover:scale-110 transition-transform"
                                                                    title="Change Cover Image"
                                                                >
                                                                    {isUpdatingCover === event.id ? (
                                                                        <Loader2 className="w-5 h-5 animate-spin text-catalog-accent" />
                                                                    ) : (
                                                                        <Edit className="w-5 h-5 text-catalog-accent" />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        )}

                                                        {event.category && (
                                                            <div className="absolute top-2 right-2 px-2 py-1 bg-white/90 text-[#696969] text-[0.6rem] uppercase tracking-widest font-bold border border-[#cccccc] z-10">
                                                                {event.category}
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Card Content */}
                                                    <div className="flex flex-1 flex-col p-6 relative">
                                                        {/* Hover Rainbow Line */}
                                                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-rainbow opacity-0 group-hover:opacity-100 transition-opacity" />

                                                        <div className="cursor-pointer flex-1 flex flex-col" onClick={() => window.open(`/event/${event.id}/view`, '_blank')}>
                                                            <h3
                                                                className="text-2xl font-serif font-medium tracking-wide mb-3 capitalize"
                                                                style={{ color: titleColor }}
                                                            >
                                                                {event.title}
                                                            </h3>

                                                            <div className="text-xs text-[#999999] font-serif italic mb-4 flex flex-wrap items-center gap-2">
                                                                <span className="font-sans font-bold uppercase tracking-widest text-[0.65rem]">
                                                                    {new Date(event.event_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                                                                </span>
                                                                {event.location && (
                                                                    <>
                                                                        <span className="not-italic opacity-50">•</span>
                                                                        <button
                                                                            className="hover:text-[#696969] hover:underline transition-colors text-left"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                // Assuming /map or /family-map exists, query param location
                                                                                navigate(`/map?location=${encodeURIComponent(event.location || '')}`);
                                                                            }}
                                                                        >
                                                                            {event.location}
                                                                        </button>
                                                                    </>
                                                                )}
                                                            </div>

                                                            <div className="flex-1 text-[0.95rem] leading-[1.8] mb-6 text-[#999999] line-clamp-3 font-serif">
                                                                {event.description ? (
                                                                    <div dangerouslySetInnerHTML={{ __html: event.description.replace(/<[^>]+>/g, ' ').substring(0, 150) + (event.description.length > 150 ? '...' : '') }} />
                                                                ) : (
                                                                    <span className="italic opacity-50">No description provided.</span>
                                                                )}
                                                            </div>

                                                        </div>
                                                        {/* Buttons / Actions */}
                                                        <div className="mt-auto pt-4 border-t border-[#f0f0f0] flex items-center justify-between" onClick={(e) => e.stopPropagation()}>

                                                            {/* Left Side: Create/Open Album */}
                                                            <div>
                                                                {linkedAlbumId ? (
                                                                    <button
                                                                        onClick={() => navigate(`/album/${linkedAlbumId}`)}
                                                                        className="text-[0.7rem] bg-[#f8f8f8] hover:bg-[#ececec] text-[#696969] px-3 py-1.5 rounded-sm uppercase tracking-widest font-bold border border-[#e0e0e0] transition-colors"
                                                                    >
                                                                        Open Album
                                                                    </button>
                                                                ) : (
                                                                    canCreate && (
                                                                        <button
                                                                            onClick={() => handleCreateAlbum(event)}
                                                                            disabled={creatingAlbumFor === event.id}
                                                                            className="text-[0.7rem] hover:bg-catalog-accent/10 text-[#999999] hover:text-catalog-accent px-3 py-1.5 rounded-sm uppercase tracking-widest font-bold border border-transparent hover:border-catalog-accent/20 transition-all flex items-center gap-1.5"
                                                                        >
                                                                            {creatingAlbumFor === event.id ? (
                                                                                <span>Creating...</span>
                                                                            ) : (
                                                                                <>
                                                                                    <Plus className="w-3 h-3" />
                                                                                    <span>Create Album</span>
                                                                                </>
                                                                            )}
                                                                        </button>
                                                                    )
                                                                )}
                                                            </div>

                                                            {/* Right Side: Toolbar */}
                                                            <div className="opacity-60 hover:opacity-100 transition-opacity">
                                                                <ActionToolbar
                                                                    onEdit={canCreate ? () => navigate(`/event/${event.id}/edit`) : undefined}
                                                                    onDelete={canCreate ? () => handleDeleteEvent(event.id) : undefined}
                                                                    onShare={() => handleShareEvent(event.id)}
                                                                    onPrint={() => handlePrintEvent(event)}
                                                                    className="transform scale-90 origin-right"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {sharingEventId && (
                <SharingDialog
                    eventId={sharingEventId}
                    title={events.find(e => e.id === sharingEventId)?.title || 'Event'}
                    onClose={() => setSharingEventId(null)}
                />
            )}

            {/* Source Selection Modal */}
            {showSourceModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowSourceModal(null)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-serif italic text-catalog-text">Update Moment Cover</h3>
                            <button onClick={() => setShowSourceModal(null)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                                <Plus className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                        <div className="p-2">
                            <button
                                onClick={() => handleSourceSelect('upload')}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors group"
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900 text-sm">Upload File</div>
                                    <div className="text-xs text-gray-500">From your computer</div>
                                </div>
                            </button>
                            <button
                                onClick={() => handleSourceSelect('library')}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors group"
                            >
                                <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FolderOpen className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900 text-sm">Media Library</div>
                                    <div className="text-xs text-gray-500">Select from uploads</div>
                                </div>
                            </button>
                            <button
                                onClick={() => handleSourceSelect('google')}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors group"
                            >
                                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <Image className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900 text-sm">Google Photos</div>
                                    <div className="text-xs text-gray-500">Import from your library</div>
                                </div>
                            </button>
                            <button
                                onClick={() => handleSourceSelect('url')}
                                className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors group"
                            >
                                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <LinkIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="font-bold text-gray-900 text-sm">Image Link</div>
                                    <div className="text-xs text-gray-500">Paste a direct URL</div>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showGooglePhotos && (
                <GooglePhotosSelector
                    isOpen={showGooglePhotos}
                    onClose={() => setShowGooglePhotos(false)}
                    onSelect={handleGooglePhotosSelect}
                    folders={['Events']}
                    googleAccessToken={googleAccessToken || ''}
                />
            )}

            {showUrlInput && (
                <UrlInputModal
                    isOpen={showUrlInput}
                    onClose={() => setShowUrlInput(false)}
                    onSubmit={handleUrlSubmit}
                />
            )}

            {showMediaPicker && (
                <MediaPickerModal
                    isOpen={showMediaPicker}
                    onClose={() => setShowMediaPicker(false)}
                    onSelect={handleMediaPickerSelect}
                    allowedTypes={['image']}
                />
            )}

            {showCropper && (
                <ImageCropper
                    src={showCropper.src}
                    onCropComplete={handleCropComplete}
                    onCancel={() => {
                        setShowCropper(null);
                        if (eventCoverInputRef.current) eventCoverInputRef.current.value = '';
                    }}
                />
            )}
        </div>
    );
}

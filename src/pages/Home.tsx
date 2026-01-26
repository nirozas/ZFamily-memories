// @locked - This file is locked. Do not edit unless requested to unlock.
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import '../HomeCarousel.css';
import { CreateAlbumModal } from '../components/catalog/CreateAlbumModal';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { storageService } from '../services/storage';
import { GooglePhotosService } from '../services/googlePhotos';
import { WorldMapPreview } from '../components/home/WorldMapPreview';
import { ImageCropper } from '../components/ui/ImageCropper';
import { MediaPickerModal } from '../components/media/MediaPickerModal';
import { Calendar, Plus, User, PlusCircle, Camera, MapPin, Image as ImageIcon, Edit, Loader2, FolderOpen, Upload } from 'lucide-react';
import type { Event, Profile } from '../types/supabase';

const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=2070&auto=format&fit=crop';

export function Home() {
    const { familyId, userRole, googleAccessToken, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [recentEvents, setRecentEvents] = useState<Event[]>([]);
    const [recentAlbums, setRecentAlbums] = useState<any[]>([]);
    const [familyMembers, setFamilyMembers] = useState<Profile[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [heroImageUrl, setHeroImageUrl] = useState(DEFAULT_HERO_IMAGE);
    const [isUploadingHero, setIsUploadingHero] = useState(false);
    const [showCropper, setShowCropper] = useState<{ src: string } | null>(null);
    const heroInputRef = useRef<HTMLInputElement>(null);

    // Media Picker State
    const [showMediaPicker, setShowMediaPicker] = useState(false);
    const [showSourceModal, setShowSourceModal] = useState(false);
    const [activeTarget, setActiveTarget] = useState<'hero' | string | null>(null); // 'hero' or eventId

    const isAdmin = userRole === 'admin';

    // Load hero image from localStorage on mount
    useEffect(() => {
        const savedHeroImage = localStorage.getItem(`family_hero_${familyId}`);
        if (savedHeroImage) {
            setHeroImageUrl(savedHeroImage);
        }
    }, [familyId]);

    const handleHeroImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !familyId) return;

        // Show cropper first
        const reader = new FileReader();
        reader.onload = () => {
            setShowCropper({ src: reader.result as string });
        };
        reader.readAsDataURL(file);
    };

    // Unified Handler for Hero Update
    const processHeroUpdate = async (url: string | File, type: 'file' | 'url' = 'url') => {
        if (!familyId) return;
        setIsUploadingHero(true);

        try {
            let finalUrl: string | null = null;
            let googlePhotoId: string | undefined;

            if (type === 'file') {
                const file = url as File;
                // Workflow #1: Upload to Google Photos if connected
                if (googleAccessToken) {
                    try {
                        const photosService = new GooglePhotosService(googleAccessToken);
                        const mediaItem = await photosService.uploadMedia(file, 'Family Archive Hero Image');
                        finalUrl = mediaItem.baseUrl || null;
                        googlePhotoId = mediaItem.id;
                    } catch (err) {
                        console.error('Google Photos hero upload failed, falling back to local storage:', err);
                    }
                }

                // Workflow #2: Fallback/Dual-save to Supabase Storage
                const { url: storageUrl, error } = await storageService.uploadFile(
                    file,
                    'album-assets',
                    `hero/${familyId}/${Date.now()}/`
                );
                if (storageUrl) finalUrl = storageUrl;
            } else {
                finalUrl = url as string;
            }

            if (finalUrl) {
                localStorage.setItem(`family_hero_${familyId}`, finalUrl);
                setHeroImageUrl(finalUrl);

                // Optional: Register in media library too if it's a new upload or change
                const { data: userData } = await supabase.auth.getUser();
                await supabase.from('family_media').insert({
                    family_id: familyId,
                    url: finalUrl,
                    type: 'image',
                    category: 'hero',
                    folder: 'Archive Settings',
                    filename: type === 'file' ? (url as File).name : 'hero_image.jpg',
                    size: type === 'file' ? (url as File).size : 0,
                    uploaded_by: userData.user?.id,
                    metadata: googlePhotoId ? { googlePhotoId } : undefined
                } as any);

            } else {
                alert('Failed to update hero image');
            }
        } catch (err) {
            console.error('Error uploading hero image:', err);
        } finally {
            setIsUploadingHero(false);
        }
    };

    const handleCropComplete = async (croppedImageUrl: string) => {
        setShowCropper(null);
        try {
            const response = await fetch(croppedImageUrl);
            const blob = await response.blob();
            const file = new File([blob], 'cropped_image.jpg', { type: 'image/jpeg' });

            if (activeTarget === 'hero') {
                await processHeroUpdate(file, 'file');
            } else if (activeTarget) {
                // Event Cover Update
                await processEventCoverUpdate(activeTarget, file, undefined, 'file');
            }
        } catch (e) {
            console.error("Crop processing failed", e);
        }
    };

    const handleSourceSelect = (source: 'upload' | 'library') => {
        setShowSourceModal(false);
        if (source === 'upload') {
            if (activeTarget === 'hero') {
                heroInputRef.current?.click();
            } else if (activeTarget) {
                activeEventIdRef.current = activeTarget;
                eventCoverInputRef.current?.click();
            }
        } else if (source === 'library') {
            setShowMediaPicker(true);
        }
    };

    const handleMediaPickerSelect = async (item: any) => {
        setShowMediaPicker(false);
        if (!item || !activeTarget) return;

        // Open cropper with the selected URL
        // Note: For Google Photos or external URLs without CORS, this might fail on the canvas step.
        // We rely on the user selecting internal library assets or proxyable URLs.
        setShowCropper({ src: item.url });
    };

    // Refactored Event Cover Update to shared function
    const processEventCoverUpdate = async (eventId: string, source: string | File, googleId?: string, type: 'file' | 'url' = 'file') => {
        let finalUrl: string | null = null;
        let googlePhotoId: string | undefined = googleId;

        if (type === 'file') {
            const file = source as File;
            setIsUpdatingCover(eventId);
            try {
                // Workflow #1: Upload to Google Photos if connected
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

                // Workflow #2: Internal Storage
                const { url: storageUrl } = await storageService.uploadFile(
                    file,
                    'album-assets',
                    `events/${eventId}/cover/`
                );

                if (storageUrl) {
                    finalUrl = storageUrl;

                    // Log to media library
                    const { data: userData } = await supabase.auth.getUser();
                    await supabase.from('family_media').insert({
                        family_id: familyId,
                        url: finalUrl,
                        type: 'image',
                        category: 'event',
                        folder: 'Event Covers',
                        filename: file.name,
                        size: file.size,
                        uploaded_by: userData.user?.id,
                        metadata: googlePhotoId ? { googlePhotoId } : undefined
                    } as any);
                }
            } catch (e) {
                console.error("Event cover upload failed", e);
            } finally {
                setIsUpdatingCover(null);
            }
        } else {
            finalUrl = source as string;
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

            const { data: updatedRows, error: updateError } = await (supabase as any)
                .from('events')
                .update({ content: updatedContent })
                .eq('id', eventId)
                .select();

            if (updateError) throw updateError;

            // Update local state
            setRecentEvents((prev: any[]) => prev.map((ev: any) =>
                ev.id === eventId ? { ...ev, content: updatedContent } : ev
            ));
        }
    };

    // We will only show real profiles from the database

    const [isUpdatingCover, setIsUpdatingCover] = useState<string | null>(null);
    const eventCoverInputRef = useRef<HTMLInputElement>(null);
    const activeEventIdRef = useRef<string | null>(null);

    const handleUpdateEventCover = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const eventId = activeEventIdRef.current;
        if (!file || !familyId || !eventId) return;

        // Show cropper for uploaded file too
        const reader = new FileReader();
        reader.onload = () => {
            setShowCropper({ src: reader.result as string });
        };
        reader.readAsDataURL(file);

        // Clear input so same file can be selected again
        e.target.value = '';
    };

    useEffect(() => {
        async function fetchData() {
            if (!familyId) {
                setLoading(false);
                return;
            }

            try {
                // Fetch recent events
                const { data: events } = await supabase
                    .from('events')
                    .select('*')
                    .eq('family_id', familyId)
                    .order('event_date', { ascending: false })
                    .limit(6);

                if (events) setRecentEvents(events);

                // Fetch recent albums
                const { data: albums } = await supabase
                    .from('albums')
                    .select(`
                        *,
                        pages (
                            id,
                            page_number,
                            template_id,
                            assets (
                                id,
                                url,
                                asset_type
                            )
                        )
                    `)
                    .eq('family_id', familyId)
                    .order('created_at', { ascending: false })


                if (albums) {
                    const formatted = (albums || []).map((album: any) => ({
                        ...album,
                        cover_url: album.cover_image_url,
                        pages: album.pages?.map((page: any) => ({
                            ...page,
                            layoutTemplate: page.template_id,
                            assets: page.assets?.map((asset: any) => ({
                                ...asset,
                                type: asset.asset_type
                            }))
                        })).sort((a: any, b: any) => a.page_number - b.page_number)
                    }));
                    setRecentAlbums(formatted);
                }

                // Fetch family members
                const { data: profiles } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('family_id', familyId);

                if (profiles) setFamilyMembers(profiles);

            } catch (error) {
                console.error('Error fetching home data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, [familyId]);

    const handleAddMember = async () => {
        if (!familyId || !newMemberName.trim()) return;

        try {
            const { data, error } = await supabase
                .from('profiles')
                .insert({
                    family_id: familyId,
                    full_name: newMemberName,
                    role: 'viewer', // Default role for invited members
                } as any)
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setFamilyMembers([...familyMembers, data as any]);
                setShowAddModal(false);
                setNewMemberName('');
            }
        } catch (error) {
            console.error('Error adding member:', error);
            alert('Failed to add member');
        }
    };

    const displayMembers = familyMembers;

    if (loading || authLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-catalog-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!familyId) {
        return (
            <div className="space-y-12 pb-12">
                <section className="relative h-[40vh] bg-catalog-stone/20 flex flex-col items-center justify-center text-center p-8">
                    <h1 className="text-4xl md:text-5xl font-serif italic text-catalog-text mb-4">Welcome to Your Archive</h1>
                    <p className="text-lg text-catalog-text/60 max-w-xl">
                        To begin preserving your family's legacy, please join a family group using an invite code or create a new group.
                    </p>
                    <div className="mt-8">
                        <Link to="/settings">
                            <Button variant="primary" size="lg">
                                Get Started
                            </Button>
                        </Link>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="space-y-12 pb-12">
            {/* 1. Hero Section */}
            <section className="relative h-[50vh] w-full overflow-hidden group">
                <div className="absolute inset-0 bg-black/40 z-10" />
                <img
                    src={heroImageUrl}
                    alt="Family Archive"
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-4">
                    <h1 className="text-4xl md:text-5xl font-sans font-black text-white mb-4 drop-shadow-lg tracking-tight uppercase">
                        The <span className="text-rainbow brightness-125">Family</span> Archive
                    </h1>
                    <p className="text-lg md:text-xl text-white/90 font-light max-w-2xl drop-shadow-md">
                        Preserving our legacy, one story at a time.
                    </p>
                </div>

                {/* Admin Edit Hero Button */}
                {isAdmin && (
                    <>
                        <input
                            ref={heroInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleHeroImageChange}
                        />
                        <button
                            onClick={() => {
                                setActiveTarget('hero');
                                setShowSourceModal(true);
                            }}
                            disabled={isUploadingHero}
                            className="absolute bottom-6 right-6 z-30 flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white text-catalog-text rounded-full shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-105"
                        >
                            {isUploadingHero ? (
                                <div className="w-5 h-5 border-2 border-catalog-accent border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Camera className="w-5 h-5 text-catalog-accent" />
                            )}
                            <span className="text-sm font-medium">
                                {isUploadingHero ? 'Uploading...' : 'Change Cover'}
                            </span>
                        </button>
                    </>
                )}
            </section>

            <div className="container-fluid max-w-wide space-y-16">

                {/* 2. Highlights Section (Recent Events) */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between border-b-2 border-rainbow pb-4">
                        <h2 className="text-3xl font-sans font-bold text-catalog-text">Recent Highlights</h2>
                        <Link to="/events" className="text-pastel-indigo hover:text-pastel-indigo/80 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            View Calendar <Calendar className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        <input
                            ref={eventCoverInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleUpdateEventCover}
                        />
                        {recentEvents.length > 0 ? (
                            recentEvents.map(event => {
                                const presentationImages = [
                                    'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=800&q=80',
                                    'https://images.unsplash.com/photo-1526749837599-b4eba9fd855e?auto=format&fit=crop&w=800&q=80',
                                    'https://images.unsplash.com/photo-1544376798-89aa6b82c6cd?auto=format&fit=crop&w=800&q=80',
                                    'https://images.unsplash.com/photo-1516733725897-1aa73b87c8e8?auto=format&fit=crop&w=800&q=80',
                                    'https://images.unsplash.com/photo-1582234372722-50d7ccc30ebd?auto=format&fit=crop&w=800&q=80',
                                    'https://images.unsplash.com/photo-1473625247510-8ceb1760943f?auto=format&fit=crop&w=800&q=80'
                                ];

                                // Pick a stable random image based on ID
                                const fallbackImage = presentationImages[event.id.charCodeAt(0) % presentationImages.length];

                                let content = event.content;
                                if (typeof content === 'string') {
                                    try { content = JSON.parse(content); } catch (e) { content = {}; }
                                }
                                const firstImg = content?.assets?.find((a: any) => a.type === 'image' || a.type === 'video');
                                const displayUrl = content?.presentationUrl || firstImg?.url || fallbackImage;

                                return (
                                    <Link key={event.id} to={`/event/${event.id}/view`} className="block h-full relative group/card">
                                        <Card variant="interactive" className="h-full flex flex-col group border-l-2 border-pastel-green overflow-hidden p-0 relative">
                                            {/* 1. Image (fills top portion) */}
                                            <div className="aspect-square w-full bg-gray-100 overflow-hidden relative">
                                                <img
                                                    src={displayUrl}
                                                    className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-500"
                                                    alt={event.title}
                                                />

                                                {/* Edit Hover Overlay */}
                                                {isAdmin && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            e.stopPropagation();
                                                            setActiveTarget(event.id);
                                                            setShowSourceModal(true);
                                                        }}
                                                        className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow-lg opacity-0 group-hover/card:opacity-100 transition-all hover:scale-110 z-20"
                                                        title="Change Cover Image"
                                                    >
                                                        {isUpdatingCover === event.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin text-catalog-accent" />
                                                        ) : (
                                                            <Edit className="w-4 h-4 text-catalog-accent" />
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            {/* 2. Content (Title -> Date -> Location) */}
                                            <div className="p-3 flex-1 flex flex-col">
                                                <h3 className="text-xs font-sans font-black text-catalog-text group-hover:text-pastel-indigo transition-colors line-clamp-2 mb-2 leading-tight uppercase tracking-tight">
                                                    {event.title}
                                                </h3>

                                                <div className="mt-auto space-y-1">
                                                    <div className="flex items-center gap-1.5 text-pastel-indigo text-[9px] font-bold uppercase tracking-wider">
                                                        <Calendar className="w-3 h-3" />
                                                        {new Date(event.event_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>

                                                    {event.location && (
                                                        <div className="flex items-center gap-1.5 text-gray-400 text-[9px] font-medium truncate">
                                                            <MapPin className="w-3 h-3 text-catalog-accent/40" />
                                                            {event.location}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </Card>
                                    </Link>
                                );
                            })
                        ) : (
                            // Placeholder cards if no events (matching new 6-column grid)
                            [1, 2, 3, 4, 5, 6].map(i => (
                                <Card key={i} className="aspect-[3/4] opacity-20 p-0 border-l-2 border-gray-100">
                                    <div className="h-1/2 bg-gray-50 flex items-center justify-center">
                                        <ImageIcon className="w-6 h-6 text-gray-200" />
                                    </div>
                                    <div className="p-3 space-y-2">
                                        <div className="h-2 w-full bg-gray-100 rounded" />
                                        <div className="h-2 w-2/3 bg-gray-100 rounded" />
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </section>

                {/* 3. Recent Albums */}
                {/* 3. Recent Albums - 3D Carousel */}
                <div className="home-carousel-wrapper">
                    <section className="section3">
                        <div className="container">
                            <h2 className="title">Latest Chapters</h2>
                            <div className="subtitle">From the Archives</div>

                            {recentAlbums.length > 0 ? (
                                <div className="loop-images">
                                    <div
                                        className="carousel-track"
                                        style={{
                                            '--total': recentAlbums.length,
                                            '--time': `${Math.max(20, recentAlbums.length * 5)}s`
                                        } as React.CSSProperties}
                                    >
                                        {recentAlbums.map((album, index) => {
                                            // Determine cover image
                                            let coverImage = album.cover_url;
                                            if (!coverImage && album.pages && album.pages.length > 0) {
                                                const firstImg = album.pages[0].assets?.find((a: any) => a.type === 'image');
                                                if (firstImg) coverImage = firstImg.url;
                                            }

                                            return (
                                                <div
                                                    key={`${album.id}-${index}`}
                                                    className="carousel-item"
                                                    style={{ '--i': index + 1 } as React.CSSProperties}
                                                    onClick={() => navigate(`/album/${album.id}`)}
                                                    title={album.title}
                                                >
                                                    <div className="carousel-3d-container">
                                                        <img
                                                            src={coverImage || 'https://images.unsplash.com/photo-1544376798-89aa6b82c6cd?auto=format&fit=crop&w=800&q=80'}
                                                            alt={album.title}
                                                        />
                                                        <h3 className="carousel-title">{album.title}</h3>
                                                        <p className="carousel-date">
                                                            {new Date(album.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                                                        </p>
                                                        {(album.location || (album.config && album.config.location)) && (
                                                            <div className="carousel-location" onClick={(e) => {
                                                                e.stopPropagation();
                                                                const loc = album.location || album.config.location;
                                                                navigate(`/map?location=${encodeURIComponent(loc)}`);
                                                            }}>
                                                                <MapPin size={10} />
                                                                {album.location || album.config.location}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ) : (
                                <div className="py-12 text-center text-white/50 italic text-2xl">
                                    Start your first album to see it here...
                                </div>
                            )}

                            {/* Features Grid from CSS */}
                            <div className="features">
                                <div className="feature" onClick={() => navigate('/library')}>
                                    <div className="feature-icon">📚</div>
                                    <h3>Library</h3>
                                    <p>Browse your complete collection of family memories organized by year.</p>
                                </div>
                                <div className="feature" onClick={() => navigate('/events')}>
                                    <div className="feature-icon">✨</div>
                                    <h3>Events</h3>
                                    <p>Interactive chronological view of every significant milestone.</p>
                                </div>
                                <div className="feature" onClick={() => setShowCreateAlbumModal(true)}>
                                    <div className="feature-icon">🎨</div>
                                    <h3>Create</h3>
                                    <p>Design beautiful new albums with our professional tools.</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* 3.5 World Map Preview */}
                {familyId && (
                    <WorldMapPreview familyId={familyId} />
                )}

                {/* 4. Family Profiles */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between border-b-2 border-rainbow pb-4">
                        <h2 className="text-3xl font-sans font-bold text-catalog-text">The Family</h2>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 py-8">
                        {displayMembers.map((member: any) => (
                            <div key={member.id} className="group relative flex flex-col items-center gap-3">
                                <Link to={`/profile/${member.id}`} className="relative w-24 h-24 md:w-32 md:h-32 rounded-full overflow-hidden border-4 border-white shadow-lg transition-transform group-hover:scale-105 group-hover:border-catalog-accent/30 block">
                                    {member.avatar_url ? (
                                        <img src={member.avatar_url} alt={member.full_name || 'Family Member'} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full bg-catalog-bg flex items-center justify-center text-catalog-accent/30">
                                            <User className="w-12 h-12" />
                                        </div>
                                    )}
                                </Link>
                                <span className="font-serif text-lg text-catalog-text font-medium">{member.full_name || 'Member'}</span>
                            </div>
                        ))}

                        {/* Add Member Button */}
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex flex-col items-center gap-3 group"
                        >
                            <div className="w-24 h-24 md:w-32 md:h-32 rounded-full border-2 border-dashed border-catalog-accent/30 flex items-center justify-center text-catalog-accent/50 group-hover:border-catalog-accent group-hover:text-catalog-accent group-hover:bg-catalog-accent/5 transition-all">
                                <Plus className="w-8 h-8" />
                            </div>
                            <span className="font-sans text-sm font-medium text-catalog-accent/70 uppercase tracking-wider group-hover:text-catalog-accent">Add Member</span>
                        </button>
                    </div>
                </section>

                {/* Add Member Modal */}
                {showAddModal && (
                    <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-8 space-y-6 animate-slide-up">
                            <h3 className="text-3xl font-serif text-catalog-text text-center">Invite a Member</h3>
                            <p className="text-catalog-text/60 text-center font-serif italic">
                                Share the legacy. Enter their name to generate an invite.
                            </p>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-catalog-accent uppercase tracking-widest">Full Name</label>
                                    <input
                                        type="text"
                                        value={newMemberName}
                                        onChange={(e) => setNewMemberName(e.target.value)}
                                        placeholder="e.g. Elias Zoabi"
                                        className="w-full px-4 py-3 border border-catalog-accent/20 rounded-sm focus:outline-none focus:ring-2 focus:ring-catalog-accent/50 bg-white/50"
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        onClick={() => setShowAddModal(false)}
                                        className="flex-1 py-3 text-catalog-text/50 font-medium hover:text-catalog-text transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleAddMember}
                                        className="flex-1 py-3 bg-catalog-accent text-white font-serif italic text-lg rounded-sm shadow-md hover:shadow-lg transition-all"
                                    >
                                        Send Invite
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* Float Action Button for Create Album */}
            <button
                onClick={() => setShowCreateAlbumModal(true)}
                className="fixed bottom-8 right-8 z-40 bg-catalog-accent text-white p-4 rounded-full shadow-2xl hover:scale-110 active:scale-95 transition-all flex items-center gap-2 group"
                title="Create New Album"
            >
                <PlusCircle className="w-6 h-6" />
                <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-500 font-serif italic pr-2">
                    Start a New Chapter
                </span>
            </button>

            {/* Create Album Modal */}
            <CreateAlbumModal
                isOpen={showCreateAlbumModal}
                onClose={() => setShowCreateAlbumModal(false)}
            />
            {/* Image Cropper for Hero and Events */}
            {showCropper && (
                <ImageCropper
                    src={showCropper.src}
                    onCropComplete={handleCropComplete}
                    onCancel={() => {
                        setShowCropper(null);
                        if (heroInputRef.current) heroInputRef.current.value = '';
                        if (eventCoverInputRef.current) eventCoverInputRef.current.value = '';
                    }}
                />
            )}
            {/* Source Selection Modal */}
            {showSourceModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowSourceModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-serif italic text-catalog-text">Change Image</h3>
                            <button onClick={() => setShowSourceModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                                <Plus className="w-5 h-5 rotate-45" />
                            </button>
                        </div>
                        <div className="p-2">
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
                        </div>
                    </div>
                </div>
            )
            }

            {
                showMediaPicker && (
                    <MediaPickerModal
                        isOpen={showMediaPicker}
                        onClose={() => setShowMediaPicker(false)}
                        onSelect={handleMediaPickerSelect}
                        allowedTypes={['image']}
                    />
                )
            }
        </div >
    );
}

import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Calendar, Plus, BookOpen, Clock, User, PlusCircle, Camera } from 'lucide-react';
import { AlbumCard } from '../components/catalog/AlbumCard';
import { CreateAlbumModal } from '../components/catalog/CreateAlbumModal';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { storageService } from '../services/storage';
import type { Event, Profile } from '../types/supabase';

const DEFAULT_HERO_IMAGE = 'https://images.unsplash.com/photo-1511895426328-dc8714191300?q=80&w=2070&auto=format&fit=crop';

export function Home() {
    const { familyId, userRole } = useAuth();
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
    const heroInputRef = useRef<HTMLInputElement>(null);

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

        setIsUploadingHero(true);
        try {
            const { url, error } = await storageService.uploadFile(
                file,
                'album-assets',
                `hero/${familyId}/`
            );
            if (url) {
                setHeroImageUrl(url);
                localStorage.setItem(`family_hero_${familyId}`, url);
            } else if (error) {
                console.error('Error uploading hero image:', error);
                alert('Failed to upload image');
            }
        } catch (err) {
            console.error('Error uploading hero image:', err);
        } finally {
            setIsUploadingHero(false);
        }
    };

    // We will only show real profiles from the database

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
                    .limit(3);

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
                    .limit(3);

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

    if (loading) {
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
            <section className="relative h-[65vh] w-full overflow-hidden group">
                <div className="absolute inset-0 bg-black/40 z-10" />
                <img
                    src={heroImageUrl}
                    alt="Family Archive"
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                />
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-center p-4">
                    <h1 className="text-5xl md:text-7xl font-sans font-black text-white mb-4 drop-shadow-lg tracking-tight uppercase">
                        The <span className="text-rainbow brightness-125">Family</span> Archive
                    </h1>
                    <p className="text-xl md:text-2xl text-white/90 font-light max-w-2xl drop-shadow-md">
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
                            onClick={() => heroInputRef.current?.click()}
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

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {recentEvents.length > 0 ? (
                            recentEvents.map(event => (
                                <Link key={event.id} to={`/event/${event.id}/view`} target="_blank" className="block h-full">
                                    <Card variant="interactive" className="h-full flex flex-col justify-between group border-l-4 border-pastel-green">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-2 text-pastel-indigo text-sm font-bold">
                                                <Calendar className="w-4 h-4" />
                                                {new Date(event.event_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                                            </div>
                                            <h3 className="text-xl font-sans font-bold text-catalog-text group-hover:text-pastel-indigo transition-colors">
                                                {event.title}
                                            </h3>
                                            <p className="text-catalog-text/70 line-clamp-3 text-sm">
                                                {event.description || 'No description provided.'}
                                            </p>
                                        </div>
                                    </Card>
                                </Link>
                            ))
                        ) : (
                            // Placeholder cards if no events
                            [1, 2, 3].map(i => (
                                <Card key={i} className="h-full opacity-60">
                                    <div className="h-40 bg-catalog-accent/5 mb-4 rounded-sm flex items-center justify-center">
                                        <Calendar className="w-8 h-8 text-catalog-accent/20" />
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-4 w-24 bg-catalog-text/10 rounded" />
                                        <div className="h-6 w-3/4 bg-catalog-text/10 rounded" />
                                        <div className="h-12 w-full bg-catalog-text/5 rounded" />
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </section>

                {/* 3. Recent Albums */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between border-b-2 border-rainbow pb-4">
                        <h2 className="text-3xl font-sans font-bold text-catalog-text">Latest Chapters</h2>
                        <Link to="/library" className="text-pastel-indigo hover:text-pastel-indigo/80 text-sm font-bold uppercase tracking-widest flex items-center gap-2">
                            Browse Library <BookOpen className="w-4 h-4" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {recentAlbums.length > 0 ? (
                            recentAlbums.map(album => (
                                <AlbumCard
                                    key={album.id}
                                    {...album}
                                    onEdit={() => navigate(`/editor/${album.id}`)}
                                    onDelete={() => {
                                        if (window.confirm('Delete this album?')) {
                                            supabase.from('albums').delete().eq('id', album.id).then(() => {
                                                setRecentAlbums(prev => prev.filter(a => a.id !== album.id));
                                            });
                                        }
                                    }}
                                    onShare={() => navigate(`/album/${album.id}`)}
                                // Using navigate for preview/share as common entry points
                                />
                            ))
                        ) : (
                            <div className="col-span-full py-12 text-center bg-white/30 rounded-lg border border-dashed border-catalog-accent/20">
                                <p className="text-catalog-text/40 font-serif italic">No albums created yet. Start a new chapter below!</p>
                            </div>
                        )}
                    </div>
                </section>

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

                {/* 4. Discovery Section (Banners) */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Browse Albums */}
                    <Link to="/library" className="group relative h-64 overflow-hidden rounded-lg shadow-md block">
                        <div className="absolute inset-0 bg-gradient-to-r from-pastel-blue/80 to-pastel-blue/60 mix-blend-multiply z-10" />
                        <img
                            src="https://images.unsplash.com/photo-1531333333324-42cb00dc50ba?q=80&w=2070&auto=format&fit=crop"
                            alt="Photo Albums"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white p-6">
                            <BookOpen className="w-12 h-12 mb-4 opacity-90" />
                            <h3 className="text-3xl font-serif italic mb-2">The Library</h3>
                            <span className="text-sm font-medium uppercase tracking-widest border-b border-white/40 pb-1 group-hover:border-white transition-colors">Browse Albums</span>
                        </div>
                    </Link>

                    {/* View Event Timeline */}
                    <Link to="/events" className="group relative h-64 overflow-hidden rounded-lg shadow-md block">
                        <div className="absolute inset-0 bg-gradient-to-l from-pastel-pink/80 to-pastel-pink/60 mix-blend-multiply z-10" />
                        <img
                            src="https://images.unsplash.com/photo-1549421263-6064833b071b?q=80&w=2670&auto=format&fit=crop"
                            alt="Event Timeline"
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center text-white p-6">
                            <Clock className="w-12 h-12 mb-4 opacity-90" />
                            <h3 className="text-3xl font-serif italic mb-2">The Timeline</h3>
                            <span className="text-sm font-medium uppercase tracking-widest border-b border-white/40 pb-1 group-hover:border-white transition-colors">View Events</span>
                        </div>
                    </Link>
                </section>
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
        </div>
    );
}

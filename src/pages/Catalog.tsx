import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Grid, List, PlusCircle } from 'lucide-react';
import { AlbumCard } from '../components/catalog/AlbumCard';
import { CreateAlbumModal } from '../components/catalog/CreateAlbumModal';
import { SharingDialog } from '../components/sharing/SharingDialog';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { printService } from '../services/printService';

const tabs = [
    { id: 'all', label: 'All Albums' },
    { id: 'events', label: 'Events' },
    { id: 'timeline', label: 'Timeline' },
    { id: 'media', label: 'Media' },
] as const;

type TabId = typeof tabs[number]['id'];

const eventFilters = ['All', 'Wedding', 'Birthday', 'Holiday', 'Vacation', 'Gathering'];

export function Catalog() {
    const { familyId } = useAuth();
    const navigate = useNavigate();
    const [albums, setAlbums] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [eventFilter, setEventFilter] = useState('All');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [sharingAlbumId, setSharingAlbumId] = useState<string | null>(null);

    const fetchAlbums = async () => {
        if (!familyId) {
            setLoading(false);
            return;
        }
        try {
            const { data, error } = await supabase
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
                .eq('family_id', familyId as string)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Map DB structure to UI structure for AlbumCard
            const formattedAlbums = (data || []).map((album: any) => ({
                ...album,
                cover_url: album.cover_image_url,
                pages: album.pages?.map((page: any) => ({
                    ...page,
                    layoutTemplate: page.template_id,
                    assets: page.assets?.map((asset: any) => ({
                        ...asset,
                        type: asset.asset_type
                    }))
                })).sort((a: any, b: any) => a.page_number - b.page_number) // Ensure pages are ordered
            }));

            setAlbums(formattedAlbums);
        } catch (err) {
            console.error('Error fetching albums:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAlbums();
    }, [familyId]);

    const handleEditAlbum = (id: string) => {
        navigate(`/album/${id}/edit`);
    };

    const handleDeleteAlbum = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this album? This action cannot be undone.')) {
            return;
        }

        try {
            const { error } = await supabase
                .from('albums')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setAlbums(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error('Error deleting album:', err);
            alert('Failed to delete album');
        }
    };

    const handleShareAlbum = (id: string) => {
        setSharingAlbumId(id);
    };

    const handlePrintAlbum = async (id: string) => {
        const album = albums.find(a => a.id === id);
        if (album) {
            try {
                // For now, use the demo HTML5 export
                await printService.exportToHTML5(album);
            } catch (err) {
                console.error('Error printing album:', err);
                alert('Failed to generate print version');
            }
        }
    };

    const filteredAlbums = albums.filter(album => {
        const matchesSearch = album.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesEvent = eventFilter === 'All' || album.category === eventFilter;
        return matchesSearch && matchesEvent;
    });

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
                        <Button onClick={() => navigate('/settings')} variant="primary" size="lg">
                            Get Started
                        </Button>
                    </div>
                </section>
            </div>
        );
    }

    if (!familyId) {
        return (
            <div className="container-fluid max-w-wide py-20 text-center">
                <Card className="max-w-md mx-auto p-12 space-y-6">
                    <div className="w-20 h-20 bg-catalog-accent/5 rounded-full flex items-center justify-center mx-auto">
                        <PlusCircle className="w-10 h-10 text-catalog-accent" />
                    </div>
                    <h2 className="text-3xl font-serif text-catalog-text">Welcome to the Library</h2>
                    <p className="text-catalog-text/60">
                        You haven't joined a family group yet. To start creating albums, you'll need to join a family or create a new one in your profile settings.
                    </p>
                    <Button onClick={() => navigate('/settings')} variant="primary" className="w-full">
                        Account Settings
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="container-fluid max-w-wide space-y-8 pb-12">
            {/* Header */}
            <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-4">
                    <h1 className="text-4xl font-serif italic text-catalog-text">The Library</h1>
                    <p className="text-lg font-sans text-catalog-text/70">
                        Explore your family's treasured memories organized by events and time.
                    </p>
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="shrink-0 h-12 flex items-center gap-2 shadow-catalog-accent/20"
                >
                    <PlusCircle className="w-5 h-5" />
                    New Chapter
                </Button>
            </section>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-catalog-accent/20">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "px-6 py-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                            activeTab === tab.id
                                ? "border-catalog-accent text-catalog-accent"
                                : "border-transparent text-catalog-text/60 hover:text-catalog-text"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* All Albums Tab */}
            {activeTab === 'all' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex-1 max-w-md">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-catalog-text/40" />
                                <input
                                    type="text"
                                    placeholder="Search albums..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 border border-catalog-accent/30 rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-catalog-accent font-sans text-sm"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Event Filter */}
                            <div className="flex gap-2">
                                {eventFilters.map((filter) => (
                                    <button
                                        key={filter}
                                        onClick={() => setEventFilter(filter)}
                                        className={cn(
                                            "px-3 py-1.5 text-xs font-medium rounded-sm transition-colors",
                                            eventFilter === filter
                                                ? "bg-catalog-accent text-white"
                                                : "bg-catalog-accent/10 text-catalog-text/70 hover:bg-catalog-accent/20"
                                        )}
                                    >
                                        {filter}
                                    </button>
                                ))}
                            </div>

                            {/* View Toggle */}
                            <div className="flex border border-catalog-accent/30 rounded-sm overflow-hidden">
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn(
                                        "p-2 transition-colors",
                                        viewMode === 'grid' ? "bg-catalog-accent text-white" : "bg-white text-catalog-text/60"
                                    )}
                                >
                                    <Grid className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={cn(
                                        "p-2 transition-colors",
                                        viewMode === 'list' ? "bg-catalog-accent text-white" : "bg-white text-catalog-text/60"
                                    )}
                                >
                                    <List className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Albums Grid */}
                    <div className={cn(
                        viewMode === 'grid'
                            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                            : "space-y-4"
                    )}>
                        {filteredAlbums.map((album) => (
                            <AlbumCard
                                key={album.id}
                                {...album}
                                onEdit={() => handleEditAlbum(album.id)}
                                onDelete={() => handleDeleteAlbum(album.id)}
                                onShare={() => handleShareAlbum(album.id)}
                                onPrint={() => handlePrintAlbum(album.id)}
                            />
                        ))}
                    </div>

                    {filteredAlbums.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-catalog-text/50 font-serif italic">No albums found</p>
                        </div>
                    )}
                </div>
            )}

            {/* Events Tab */}
            {activeTab === 'events' && (
                <div className="space-y-8">
                    {['Wedding', 'Birthday', 'Holiday', 'Vacation', 'Gathering'].map((eventType) => {
                        const eventAlbums = albums.filter(a => a.category === eventType);
                        if (eventAlbums.length === 0) return null;

                        return (
                            <div key={eventType} className="space-y-4">
                                <h2 className="text-2xl font-serif flex items-center gap-3">
                                    <span className="text-catalog-accent">
                                        {eventType === 'Wedding' && '💒'}
                                        {eventType === 'Birthday' && '🎂'}
                                        {eventType === 'Holiday' && '🎄'}
                                        {eventType === 'Vacation' && '🏖️'}
                                        {eventType === 'Gathering' && '👨‍👩‍👧‍👦'}
                                    </span>
                                    {eventType}s
                                </h2>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                    {eventAlbums.map((album) => (
                                        <AlbumCard
                                            key={album.id}
                                            {...album}
                                            onEdit={() => handleEditAlbum(album.id)}
                                            onDelete={() => handleDeleteAlbum(album.id)}
                                            onShare={() => handleShareAlbum(album.id)}
                                            onPrint={() => handlePrintAlbum(album.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && (
                <div className="relative">
                    {/* Timeline Line */}
                    <div className="absolute left-8 top-0 bottom-0 w-px bg-catalog-accent/30" />

                    {/* Year Groups */}
                    {['2025', '2024', '2023'].map((year) => {
                        const yearAlbums = albums.filter(a => a.created_at.includes(year));
                        if (yearAlbums.length === 0) return null;

                        return (
                            <div key={year} className="mb-12 relative">
                                {/* Year Marker */}
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="w-16 h-16 rounded-full bg-catalog-accent text-white flex items-center justify-center font-serif text-xl font-bold shadow-lg">
                                        {year}
                                    </div>
                                    <div className="h-px flex-1 bg-catalog-accent/20" />
                                </div>

                                {/* Albums */}
                                <div className="pl-24 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {yearAlbums.map((album) => (
                                        <AlbumCard
                                            key={album.id}
                                            {...album}
                                            onEdit={() => handleEditAlbum(album.id)}
                                            onDelete={() => handleDeleteAlbum(album.id)}
                                            onShare={() => handleShareAlbum(album.id)}
                                            onPrint={() => handlePrintAlbum(album.id)}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Media Tab */}
            {activeTab === 'media' && (
                <div className="space-y-6">
                    {/* Reuse MediaLibrary component here or build a simple view */}
                    {/* For now, let's redirect them or show a sneak peek of recent uploads */}
                    <div className="text-center py-12 space-y-4">
                        <div className="w-16 h-16 bg-catalog-accent/10 rounded-full flex items-center justify-center mx-auto">
                            <Grid className="w-8 h-8 text-catalog-accent" />
                        </div>
                        <h3 className="text-xl font-serif text-catalog-text">Full Media Library</h3>
                        <p className="text-catalog-text/60 max-w-md mx-auto">
                            Visit the dedicated Media Library to manage, organize, and view all your family's photos and videos.
                        </p>
                        <Button onClick={() => navigate('/media')} variant="primary">
                            Go to Media Library
                        </Button>
                    </div>
                </div>
            )}

            <CreateAlbumModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />

            {sharingAlbumId && (
                <SharingDialog
                    albumId={sharingAlbumId}
                    title={albums.find(a => a.id === sharingAlbumId)?.title || 'Album'}
                    onClose={() => setSharingAlbumId(null)}
                />
            )}
        </div>
    );
}

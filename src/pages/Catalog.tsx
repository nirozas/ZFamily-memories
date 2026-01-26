import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Grid, List, PlusCircle } from 'lucide-react';
import { AlbumsGrid } from '../components/catalog/AlbumsGrid';
import { CreateAlbumModal } from '../components/catalog/CreateAlbumModal';
import { SharingDialog } from '../components/sharing/SharingDialog';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { printService } from '../services/printService';

const eventFilters = ['All', 'Wedding', 'Birthday', 'Holiday', 'Vacation', 'Gathering'];

export function Catalog() {
    const { familyId } = useAuth();
    const navigate = useNavigate();
    const [albums, setAlbums] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
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
            // 1. Fetch All Albums for this Family
            const { data: albumData, error: albumError } = await supabase
                .from('albums')
                .select('*')
                .eq('family_id', familyId as string)
                .order('created_at', { ascending: false });

            if (albumError) {
                console.error('[fetchAlbums] Album load failed:', albumError);
                throw albumError;
            }

            if (!albumData || albumData.length === 0) {
                setAlbums([]);
                return;
            }

            // 2. Fetch All Pages for these Albums to populate covers
            const albumIds = (albumData as any[]).map(a => a.id);

            // [REFRESH 2026-01-24] Using * to handle missing 'id' column gracefully
            const { data: pagesData, error: pagesError } = await (supabase.from('album_pages') as any)
                .select('*')
                .in('album_id', albumIds);

            if (pagesError) {
                console.error('[fetchAlbums] Critical Page Sync Error:', pagesError);
                // Fallback to empty if table fails
            }

            // 3. Merge & Formatted
            const pagesByAlbum = (pagesData || []).reduce((acc: any, page: any) => {
                if (!acc[page.album_id]) acc[page.album_id] = [];
                acc[page.album_id].push(page);
                return acc;
            }, {});

            const formattedAlbums = albumData.map((album: any) => ({
                ...album,
                cover_url: album.cover_image_url,
                pages: (pagesByAlbum[album.id] || []).sort((a: any, b: any) => (a.page_number || 0) - (b.page_number || 0))
            }));

            setAlbums(formattedAlbums);
        } catch (err) {
            console.error('[fetchAlbums] Fatal Error:', err);
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchAlbums();

        // 2. Real-Time Sync: Subscribe to album and page changes
        if (!familyId) return;

        const albumSub = supabase
            .channel('public:albums')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'albums', filter: `family_id=eq.${familyId}` }, () => {
                fetchAlbums();
            })
            .subscribe();

        const pageSub = supabase
            .channel('public:album_pages')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'album_pages' }, () => {
                // We refresh everything to maintain layout consistency
                fetchAlbums();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(albumSub);
            supabase.removeChannel(pageSub);
        };
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

    const handleDuplicateAlbum = async (id: string) => {
        try {
            console.log('[Duplicate] Initiating server-side deep-clone for album:', id);

            // Call the PostgreSQL RPC function (handles schema detection internally)
            const { data, error: rpcError } = await (supabase as any)
                .rpc('duplicate_album_v2', {
                    source_album_id: id,
                    new_title: null // Let RPC auto-generate "Copy of" title
                })
                .single();

            if (rpcError) {
                console.error('[Duplicate] RPC Invocation Error:', rpcError);
                throw new Error(rpcError.message || 'RPC call failed');
            }

            // Validate the RPC response
            if (!data || !data.success) {
                const errorMsg = data?.error_message || 'Unknown duplication failure';
                console.error('[Duplicate] Server-Side Clone Failed:', errorMsg);
                throw new Error(errorMsg);
            }

            console.log('[Duplicate] Success. New Album ID:', data.new_album_id);

            // Refresh the catalog
            await fetchAlbums();
        } catch (err: any) {
            console.error('[Duplicate] Fatal Process Error:', err);
            const msg = err?.message || 'Database rejected the clone operation';
            alert(`Failed to duplicate archive: ${msg}\n\nCheck console for details.`);
        }
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
            {/* Header Section */}
            <div className="space-y-6">
                <div>
                    <h1 className="text-4xl font-serif italic text-catalog-text">The Library</h1>
                    <p className="text-lg font-sans text-catalog-text/70 mt-2">
                        Explore your family's treasured memories.
                    </p>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between bg-white p-4 rounded-lg shadow-sm border border-catalog-accent/10">
                    {/* Search */}
                    <div className="relative flex-1 w-full xl:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-catalog-text/40" />
                        <input
                            type="text"
                            placeholder="Search albums..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-catalog-accent/30 rounded-sm bg-white focus:outline-none focus:ring-2 focus:ring-catalog-accent font-sans text-sm"
                        />
                    </div>

                    {/* Filters & Actions */}
                    <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
                        {/* Event Filters */}
                        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
                            {eventFilters.map((filter) => (
                                <button
                                    key={filter}
                                    onClick={() => setEventFilter(filter)}
                                    className={cn(
                                        "px-3 py-1.5 text-xs font-medium rounded-sm transition-colors whitespace-nowrap",
                                        eventFilter === filter
                                            ? "bg-catalog-accent text-white"
                                            : "bg-catalog-accent/10 text-catalog-text/70 hover:bg-catalog-accent/20"
                                    )}
                                >
                                    {filter}
                                </button>
                            ))}
                        </div>

                        <div className="h-8 w-px bg-gray-200 mx-2 hidden md:block" />

                        {/* View Toggle */}
                        <div className="flex border border-catalog-accent/30 rounded-sm overflow-hidden shrink-0">
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

                        {/* New Chapter Button */}
                        <Button
                            onClick={() => setIsCreateModalOpen(true)}
                            className="shrink-0 h-10 flex items-center gap-2 shadow-catalog-accent/20 ml-auto md:ml-0"
                        >
                            <PlusCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">New Chapter</span>
                            <span className="sm:hidden">New</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Albums Grid Section */}
            <AlbumsGrid
                albums={filteredAlbums}
                viewMode={viewMode}
                onEdit={handleEditAlbum}
                onDelete={handleDeleteAlbum}
                onDuplicate={handleDuplicateAlbum}
                onShare={handleShareAlbum}
                onPrint={handlePrintAlbum}
            />



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

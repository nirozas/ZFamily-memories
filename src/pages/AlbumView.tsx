import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { FlipbookViewer } from '../components/viewer/FlipbookViewer';
import { type Album } from '../contexts/AlbumContext';
import { useAuth } from '../contexts/AuthContext';
import { SharingDialog } from '../components/sharing/SharingDialog';
import { Share2, Edit3, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/Button';

export function AlbumView() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [album, setAlbum] = useState<Album | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showSharing, setShowSharing] = useState(false);
    const { userRole } = useAuth();

    const canEdit = userRole === 'admin' || userRole === 'creator';

    useEffect(() => {
        const fetchAlbum = async () => {
            if (!id) return;
            setLoading(true);
            try {
                // Fetch Album
                const { data: albumData, error: albumError } = await supabase
                    .from('albums')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (albumError || !albumData) throw new Error('Album not found');

                // Fetch Pages
                const { data: pagesData, error: pagesError } = await supabase
                    .from('pages')
                    .select('*, assets(*)')
                    .eq('album_id', id)
                    .order('page_number', { ascending: true });

                if (pagesError) throw new Error('Failed to load pages: ' + pagesError.message);

                // Transform to Album type
                const data = albumData as any;
                const fullAlbum: Album = {
                    id: data.id,
                    family_id: data.family_id,
                    title: data.title,
                    description: data.description,
                    category: data.category,
                    coverUrl: data.cover_image_url,
                    createdAt: new Date(data.created_at),
                    updatedAt: new Date(data.updated_at),
                    isPublished: data.is_published,
                    hashtags: data.hashtags || [],
                    config: data.config || {},
                    unplacedMedia: data.config?.unplacedMedia || [],
                    pages: (pagesData as any[]).map(p => ({
                        id: p.id,
                        pageNumber: p.page_number,
                        layoutTemplate: p.template_id,
                        backgroundColor: p.background_color,
                        assets: (p.assets as any[] || []).map(a => ({
                            id: a.id,
                            type: a.asset_type,
                            url: a.url,
                            x: a.config?.x || 0,
                            y: a.config?.y || 0,
                            width: a.config?.width || 200,
                            height: a.config?.height || 150,
                            rotation: a.config?.rotation || 0,
                            scale: a.config?.scale || 1,
                            zIndex: a.z_index || 0,
                            brightness: a.config?.brightness || 100,
                            contrast: a.config?.contrast || 100,
                            saturate: a.config?.saturate || 100,
                        }))
                    }))
                };

                setAlbum(fullAlbum);
            } catch (err: any) {
                console.error('Error loading album:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAlbum();
    }, [id]);

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-catalog-bg">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-catalog-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="font-serif italic text-catalog-text/70">Opening the archive...</p>
                </div>
            </div>
        );
    }

    if (error || !album) {
        return (
            <div className="h-screen flex items-center justify-center bg-catalog-bg">
                <div className="text-center p-8 bg-white rounded-2xl shadow-xl border border-red-100 max-w-md mx-auto">
                    <p className="text-red-500 font-medium mb-4">{error || 'Album not found'}</p>
                    <Button onClick={() => navigate('/library')}>Return to Library</Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-catalog-bg flex flex-col">
            {/* Header */}
            <div className="bg-white/80 backdrop-blur-md border-b border-catalog-accent/10 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/library')}
                        className="p-2 hover:bg-catalog-stone/50 rounded-full transition-colors text-catalog-text/60 hover:text-catalog-text"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="font-serif text-xl text-catalog-text">{album.title}</h1>
                        <p className="text-xs text-catalog-text/50 uppercase tracking-widest">{album.category}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSharing(true)}
                        className="gap-2"
                    >
                        <Share2 className="w-4 h-4" />
                        Share
                    </Button>
                    {canEdit && (
                        <Button
                            size="sm"
                            onClick={() => navigate(`/editor/${album.id}`)}
                            className="gap-2"
                        >
                            <Edit3 className="w-4 h-4" />
                            Edit Album
                        </Button>
                    )}
                </div>
            </div>

            {/* Viewer - No longer wrapped in constrained div as it is fixed/full-screen */}
            <FlipbookViewer
                pages={album.pages}
                album={album}
                onClose={() => navigate('/library')}
            />

            {showSharing && (
                <SharingDialog
                    albumId={album.id}
                    title={album.title}
                    onClose={() => setShowSharing(false)}
                />
            )}
        </div>
    );
}

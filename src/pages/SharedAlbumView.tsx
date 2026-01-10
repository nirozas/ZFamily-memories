import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FlipbookViewer } from '../components/viewer/FlipbookViewer';
import { validateShareLink } from '../services/sharing';
import { supabase } from '../lib/supabase';
import { type Album } from '../contexts/AlbumContext';

export function SharedAlbumView() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const [album, setAlbum] = useState<Album | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSharedAlbum = async () => {
            if (!token) return;

            // 1. Validate Token
            const { valid, albumId, error: validationError } = await validateShareLink(token);

            if (!valid || !albumId) {
                setError(validationError || 'Invalid or expired shared link');
                setLoading(false);
                return;
            }

            // 2. Fetch Album Data
            // We need to bypass RLS here if the user is anonymous. 
            // In a production app, we would use a secure RPC function like 'get_shared_album(token)'.
            // For now, we will try to fetch expecting the RLS to allow "public" reading if there's a token?
            // Actually, the simplest implementation for now is to rely on 'is_published' or similar,
            // OR we assume the user is just a 'viewer'.
            // However, since we haven't implemented 'get_shared_album', we might hit RLS issues if we are not logged in.
            // Let's assume for this step that we are fetching normally. If RLS blocks it, we know what to fix later.

            try {
                // Fetch Album
                const { data: albumData, error: albumError } = await supabase
                    .from('albums')
                    .select('*')
                    .eq('id', albumId)
                    .single();

                if (albumError || !albumData) {
                    throw new Error('Album not found');
                }

                // Fetch Pages
                const { data: pagesData, error: pagesError } = await supabase
                    .from('pages')
                    .select('*, assets(*)')
                    .eq('album_id', albumId)
                    .order('page_number', { ascending: true });

                if (pagesError) {
                    throw new Error('Failed to load pages');
                }

                // Transform to Album type
                const album = albumData as any;
                const fullAlbum: Album = {
                    id: album.id,
                    title: album.title,
                    family_id: album.family_id,
                    description: album.description || undefined,
                    category: album.category || undefined,
                    coverUrl: album.cover_image_url || undefined,
                    createdAt: new Date(album.created_at),
                    updatedAt: new Date(album.updated_at),
                    isPublished: album.is_published,
                    hashtags: album.hashtags || [],
                    unplacedMedia: album.config?.unplacedMedia || [],
                    config: album.config || {},
                    pages: (pagesData as any[]).map((p: any) => ({
                        id: p.id,
                        pageNumber: p.page_number,
                        layoutTemplate: (p.template_id || 'freeform') as any,
                        backgroundColor: p.background_color,
                        assets: (p.assets as any[] || []).map((a: any) => ({
                            id: a.id,
                            type: a.asset_type,
                            url: a.url,
                            x: a.config?.x || 0,
                            y: a.config?.y || 0,
                            width: a.config?.width || 100,
                            height: a.config?.height || 100,
                            rotation: a.config?.rotation || 0,
                            scale: a.config?.scale,
                            zIndex: a.z_index,
                            filter: a.config?.filter,
                            content: a.config?.content || '',
                        })),
                    })),
                };

                setAlbum(fullAlbum);
            } catch (err: any) {
                console.error('Error loading shared album:', err);
                setError(err.message || 'Failed to load album');
            } finally {
                setLoading(false);
            }
        };

        fetchSharedAlbum();
    }, [token]);

    const handleClose = () => {
        // For shared view, close might just redirect to home or login
        navigate('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-catalog-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="font-serif italic text-white/70">Opening shared album...</p>
                </div>
            </div>
        );
    }

    if (error || !album) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center text-white max-w-md p-6">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl">⚠️</span>
                    </div>
                    <h2 className="text-xl font-serif mb-2">Access Denied</h2>
                    <p className="text-white/60 mb-6">{error || 'This link may have expired or is invalid.'}</p>
                    <button
                        onClick={() => navigate('/')}
                        className="px-6 py-2 bg-catalog-accent text-white rounded-sm hover:bg-catalog-accent/90 transition-colors"
                    >
                        Go to Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <FlipbookViewer
                pages={album.pages}
                album={album}
                onClose={handleClose}
            />
        </div>
    );
}

import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Calendar, Eye } from 'lucide-react';
import { ActionToolbar } from '../ui/ActionToolbar';

interface AlbumCardProps {
    id: string;
    title: string;
    cover_url?: string;
    category?: string;
    created_at: string;
    pages?: any[];
    onEdit?: () => void;
    onDelete?: () => void;
    onShare?: () => void;
    onPrint?: () => void;
}

export function AlbumCard(props: AlbumCardProps) {
    const { id, title, cover_url, category, created_at, pages, onEdit, onDelete, onShare, onPrint } = props;

    // Derive cover image: use explicit cover, or first image from first page
    const coverUrl = cover_url || (() => {
        if (!pages || pages.length === 0) return undefined;

        // Priority 1: Check for explicit front cover page
        const frontCoverPage = pages.find(p => p.layoutTemplate === 'cover-front');
        if (frontCoverPage) {
            const coverImage = frontCoverPage.assets?.find((a: any) => (a.asset_type === 'image' || a.type === 'image') && a.url);
            if (coverImage) return coverImage.url;
        }

        // Priority 2: Use first image from the first page (common fallback)
        const firstPage = pages[0];
        const firstImage = firstPage.assets?.find((a: any) => (a.asset_type === 'image' || a.type === 'image') && a.url);
        if (firstImage) return firstImage.url;

        // Priority 3: Try second page if first is empty (e.g. empty cover page)
        if (pages.length > 1) {
            const secondPage = pages[1];
            const secondImage = secondPage.assets?.find((a: any) => (a.asset_type === 'image' || a.type === 'image') && a.url);
            return secondImage?.url;
        }
        return undefined;
    })();
    const dateStr = new Date(created_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
    const pageCount = pages?.length || 0;
    const albumCategory = category || 'Memory';

    return (
        <div className="relative group">
            <Link to={`/album/${id}`}>
                <Card variant="interactive" className="overflow-hidden p-0 h-full">
                    {/* Cover Image */}
                    <div className="relative aspect-[4/3] bg-gradient-to-br from-catalog-accent/20 to-catalog-accent/5 overflow-hidden">
                        {coverUrl ? (
                            <img
                                src={coverUrl}
                                alt={title}
                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center">
                                <span className="text-6xl opacity-30">📖</span>
                            </div>
                        )}

                        {/* Event Badge */}
                        {albumCategory && (
                            <span className="absolute top-3 left-3 px-2 py-1 bg-white/90 text-[10px] font-bold text-catalog-accent rounded-sm uppercase tracking-widest shadow-sm">
                                {albumCategory}
                            </span>
                        )}

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <div className="flex items-center gap-2 text-white bg-black/40 px-4 py-2 rounded-full backdrop-blur-sm">
                                <Eye className="w-4 h-4" />
                                <span className="text-xs font-medium">View Album</span>
                            </div>
                        </div>
                    </div>

                    {/* Info */}
                    <div className="p-4 space-y-3">
                        <h3 className="font-serif text-lg leading-tight group-hover:text-catalog-accent transition-colors truncate">{title}</h3>

                        <div className="flex items-center justify-between text-[11px] text-catalog-text/50 uppercase tracking-wider font-medium">
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{dateStr}</span>
                            </div>
                            <span>{pageCount} pages</span>
                        </div>
                    </div>
                </Card>
            </Link>

            {/* Quick Actions Toolbar */}
            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0 z-20">
                <ActionToolbar
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onShare={onShare}
                    onPrint={onPrint}
                    className="bg-white/90 backdrop-blur-sm shadow-xl rounded-full px-2 py-1 border border-catalog-accent/10"
                />
            </div>
        </div>
    );
}

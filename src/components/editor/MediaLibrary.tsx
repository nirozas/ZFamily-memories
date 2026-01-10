import React, { useRef } from 'react';
import { useAlbum } from '../../contexts/AlbumContext';
import { Upload, Plus, Image as ImageIcon, Video, Link as LinkIcon } from 'lucide-react';

export function MediaLibrary() {
    const { album, uploadMedia, moveFromLibrary, addMediaByUrl, isSaving } = useAlbum();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            await uploadMedia(Array.from(e.target.files));
        }
    };

    if (!album) return null;

    return (
        <div className="flex flex-col h-full bg-white border-r border-catalog-accent/10 w-64">
            <div className="p-4 border-b border-catalog-accent/10 bg-catalog-stone/10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-serif text-lg text-catalog-text">Album Gallery</h3>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => {
                                const url = window.prompt('Enter Image or Video URL:');
                                if (url) {
                                    const type = url.match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image';
                                    addMediaByUrl(url, type);
                                }
                            }}
                            className="p-2 hover:bg-catalog-accent/10 rounded-full transition-colors text-catalog-accent"
                            title="Add by URL"
                        >
                            <LinkIcon className="w-4 h-4" />
                        </button>
                        <label className="cursor-pointer p-2 hover:bg-catalog-accent/10 rounded-full transition-colors">
                            <Upload className="w-4 h-4 text-catalog-accent" />
                            <input
                                type="file"
                                multiple
                                accept="image/*,video/*"
                                className="hidden"
                                onChange={handleFileChange}
                                ref={fileInputRef}
                            />
                        </label>
                    </div>
                </div>
                <p className="text-xs text-catalog-text/50 uppercase tracking-widest">
                    Your collection ({album.unplacedMedia.length + album.pages.reduce((acc, p) => acc + p.assets.length, 0)})
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Unplaced Media */}
                <section>
                    <h4 className="text-[10px] font-bold text-catalog-text/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Plus className="w-3 h-3" />
                        Unplaced Items
                    </h4>
                    {album.unplacedMedia.length === 0 ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-catalog-accent/10 rounded-xl p-8 text-center cursor-pointer hover:border-catalog-accent/30 transition-all group"
                        >
                            <Upload className="w-8 h-8 text-catalog-accent/20 mx-auto mb-2 group-hover:text-catalog-accent/40" />
                            <p className="text-xs text-catalog-text/40 italic">Bulk upload to pool</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-2">
                            {album.unplacedMedia.map((asset) => (
                                <div
                                    key={asset.id}
                                    className="group relative aspect-square rounded-lg overflow-hidden border border-catalog-accent/5 bg-catalog-stone/20 hover:border-catalog-accent/40 transition-all cursor-pointer"
                                    onClick={() => moveFromLibrary(asset.id, album.pages[0].id)} // Default to current page in future
                                >
                                    {asset.type === 'image' ? (
                                        <img src={asset.url} alt="" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gray-900">
                                            <Video className="w-6 h-6 text-white" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-catalog-accent/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                        <Plus className="w-6 h-6 text-white" />
                                    </div>
                                </div>
                            ))}
                            {isSaving && (
                                <div className="aspect-square rounded-lg bg-catalog-stone/10 flex items-center justify-center">
                                    <div className="w-4 h-4 border-2 border-catalog-accent border-t-transparent rounded-full animate-spin" />
                                </div>
                            )}
                        </div>
                    )}
                </section>

                {/* All Album Content (Read Only) */}
                <section>
                    <h4 className="text-[10px] font-bold text-catalog-text/40 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <ImageIcon className="w-3 h-3" />
                        On Pages
                    </h4>
                    <div className="grid grid-cols-2 gap-2 opacity-60">
                        {album.pages.flatMap(p => p.assets).map(asset => (
                            <div key={asset.id} className="aspect-square rounded-lg overflow-hidden border border-catalog-accent/5">
                                <img src={asset.url} alt="" className="w-full h-full object-cover grayscale" />
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

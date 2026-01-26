import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
    Folder,
    Camera,
    Image as ImageIcon,
    Video,
    Upload,
    Trash2,
    Search,
    Loader2,
    Grid,
    List,
    Edit2,
    X,
    Check,
    Palette,
    Sticker,
    Square,
    CheckSquare,
    FolderPlus,
    Link as LinkIcon,
    Filter,
    ArrowUpDown
} from 'lucide-react';
import { UrlInputModal } from '../components/media/UrlInputModal';
import { GooglePhotosService } from '../services/googlePhotos';
import { GooglePhotosSelector } from '../components/media/GooglePhotosSelector';
import { cn } from '../lib/utils';

interface MediaItem {
    id: string;
    url: string;
    type: 'image' | 'video';
    filename: string;
    folder: string;
    category: string;
    created_at: string;
    size: number;
    tags?: string[];
    isSystemAsset?: boolean;
    usageCount?: number;
    metadata?: any;
}

type LibraryTab = 'uploads' | 'system';
type SystemCategory = 'background' | 'sticker' | 'frame' | 'ribbon';

import { useGooglePhotosUrl } from '../hooks/useGooglePhotosUrl';

function MediaGridItem({ item, viewMode, selectedItems, onToggleSelect, editingItem, editName, setEditName, handleRename, handleUpdateTags, handleDelete, isAdmin, activeTab }: any) {
    const { url: resolvedUrl } = useGooglePhotosUrl(item.metadata?.googlePhotoId, item.url);
    const displayUrl = resolvedUrl || item.url;
    const isGoogle = !!item.metadata?.googlePhotoId;

    return (
        <div key={item.id} className={cn("group relative bg-white border rounded-xl overflow-hidden transition-all duration-200", viewMode === 'list' ? "flex items-center p-3 gap-4 h-20 hover:border-catalog-accent/50" : "aspect-[10/11] hover:shadow-lg hover:-translate-y-1 hover:border-catalog-accent/50", selectedItems.has(item.id) ? "ring-2 ring-catalog-accent border-catalog-accent bg-catalog-accent/5" : "border-gray-200")} onClick={(e) => {
            if (!(e.target as HTMLElement).closest('.action-btn')) {
                onToggleSelect(item.id);
            }
        }}>
            <div className={cn("bg-gray-100 overflow-hidden relative", viewMode === 'list' ? "w-14 h-14 rounded-lg flex-shrink-0" : "h-[75%]")}>
                {item.type === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <Video className="w-8 h-8 text-white/50" />
                    </div>
                ) : (
                    <div className="w-full h-full relative">
                        {item.category === 'background' && item.url.startsWith('#') ? (
                            <div className="w-full h-full" style={{ backgroundColor: item.url }} />
                        ) : (
                            <img
                                src={(displayUrl && (displayUrl.includes('googleusercontent.com') || displayUrl.includes('photoslibrary.googleapis.com')))
                                    ? `${displayUrl}=w400-h400-c`
                                    : displayUrl}
                                alt={item.filename}
                                className={cn("w-full h-full", item.category === 'sticker' || item.category === 'frame' ? "object-contain p-2" : "object-cover")}
                                referrerPolicy="no-referrer"
                            />
                        )}
                    </div>
                )}
                {isGoogle && (
                    <div className="absolute top-2 right-2 z-10">
                        <Camera className="w-3 h-3 text-white drop-shadow-md" />
                    </div>
                )}
                <div className={cn("absolute inset-0 bg-black/40 transition-opacity flex items-center justify-center opacity-0 group-hover:opacity-100", selectedItems.has(item.id) && "opacity-100 bg-catalog-accent/20")}>
                    <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", selectedItems.has(item.id) ? "bg-catalog-accent border-catalog-accent scale-110" : "border-white bg-transparent")}>
                        {selectedItems.has(item.id) && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                </div>
                {/* Usage Count Badge */}
                <div className={cn(
                    "absolute top-2 left-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold shadow-sm",
                    (item.usageCount || 0) > 0
                        ? "bg-purple-500 text-white"
                        : "bg-gray-200 text-gray-500"
                )}>
                    {item.usageCount || 0}
                </div>
            </div>

            <div className={cn("flex-1 min-w-0", viewMode === 'grid' ? "p-3 bg-white" : "")}>
                {editingItem === item.id ? (
                    <div className="flex items-center gap-1">
                        <input autoFocus type="text" value={editName} onChange={(e) => setEditName(e.target.value)} onClick={(e) => e.stopPropagation()} className="w-full px-1 py-0.5 text-xs border rounded focus:border-catalog-accent outline-none" onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(item.id, editName);
                            if (e.key === 'Escape') {
                                // setEditingItem(null) - will be handled by parent logic
                            }
                        }} />
                        <button onClick={(e) => { e.stopPropagation(); handleRename(item.id, editName); }} className="action-btn p-0.5 text-green-600"><Check className="w-3 h-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); /* setEditingItem(null) */ }} className="action-btn p-0.5 text-red-500"><X className="w-3 h-3" /></button>
                    </div>
                ) : (
                    <div className="flex items-center justify-between group/info">
                        <div className="truncate">
                            <p className="text-sm font-medium text-gray-700 truncate" title={item.filename}>{item.filename}</p>
                            {item.size > 0 && <p className="text-xs text-gray-400 mt-0.5">{(item.size / 1024 / 1024).toFixed(1)} MB</p>}
                            <div className="flex flex-wrap gap-1 mt-1">
                                {(item.tags || []).map((tag: string) => <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-full">#{tag}</span>)}
                                {(!item.tags || item.tags.length === 0) && <span className="text-[10px] text-gray-300 italic">No tags</span>}
                            </div>
                        </div>
                        {(activeTab === 'uploads' || isAdmin) && (
                            <div className="flex items-center gap-1 opacity-0 group-hover/info:opacity-100 transition-all">
                                <button className="action-btn p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600" onClick={(e) => {
                                    e.stopPropagation();
                                    const newTagsString = prompt("Edit tags (comma separated):", (item.tags || []).join(", "));
                                    if (newTagsString !== null) {
                                        const newTags = newTagsString.split(',').map((t: string) => t.trim()).filter(Boolean);
                                        handleUpdateTags(item.id, newTags);
                                    }
                                }} title="Edit Tags">
                                    <Edit2 className="w-3 h-3" />
                                </button>
                                <button className="action-btn p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-600" onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete([item.id]);
                                }} title="Delete Item">
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export function MediaLibrary() {
    const { familyId, user, userRole, googleAccessToken, signInWithGoogle } = useAuth();
    const isAdmin = userRole === 'admin';
    const [activeTab, setActiveTab] = useState<LibraryTab>('uploads');
    const [systemCategory, setSystemCategory] = useState<SystemCategory>('background');

    const [media, setMedia] = useState<MediaItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentFolder, setCurrentFolder] = useState<string>('All');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [sortBy, setSortBy] = useState<'date' | 'name' | 'size'>('date');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [filterType, setFilterType] = useState<'all' | 'image' | 'video'>('all');
    const [editingItem, setEditingItem] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [uploadProgress, setUploadProgress] = useState<{ current: number, total: number } | null>(null);
    const [uploadFolder, setUploadFolder] = useState<string>('/');
    const [showFolderPicker, setShowFolderPicker] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [isGoogleSelectorOpen, setIsGoogleSelectorOpen] = useState(false);
    const [showSourceModal, setShowSourceModal] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSourceSelect = (source: 'upload' | 'google' | 'url') => {
        setShowSourceModal(false);
        if (source === 'upload') {
            handleUploadClick();
        } else if (source === 'google') {
            setIsGoogleSelectorOpen(true);
        } else if (source === 'url') {
            setShowUrlInput(true);
        }
    };

    const handleUrlImport = async (url: string) => {
        if (!url) return;
        setShowUrlInput(false);
        setUploadProgress({ current: 0, total: 1 });

        try {
            // Download as blob
            const response = await fetch(url);
            const blob = await response.blob();
            // Try to guess mime type or default
            const mimeType = blob.type || 'image/jpeg';
            const ext = mimeType.split('/')[1] || 'jpg';
            const filename = `imported-url-${Date.now()}.${ext}`;
            const file = new File([blob], filename, { type: mimeType });

            await performUpload([file]);

        } catch (error: any) {
            console.error('URL Import failed:', error);
            alert(`Failed to import from URL: ${error.message}`);
        } finally {
            setUploadProgress(null);
        }
    };

    async function handleGooglePhotosImport(items: any[], targetFolder: string) {
        if (!familyId || items.length === 0) return;

        setIsGoogleSelectorOpen(false);
        setUploadProgress({ current: 0, total: items.length });

        const { storageService } = await import('../services/storage');
        const photosService = new GooglePhotosService(googleAccessToken);

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            setUploadProgress({ current: i + 1, total: items.length });

            try {
                // Workflow #1: Pull from Google Photos to Website
                const baseUrl = item.mediaFile?.baseUrl || item.baseUrl;
                const mimeType = item.mediaFile?.mimeType || item.mimeType || 'image/jpeg';
                const filename = item.filename || `google-photo-${item.id}.${mimeType.split('/')[1]}`;

                const blob = await photosService.downloadMediaItem(baseUrl);
                const file = new File([blob], filename, { type: mimeType });

                const { url: storageUrl, error: uploadError } = await storageService.uploadFile(
                    file,
                    'album-assets',
                    `family/${familyId}/`
                );

                if (uploadError) {
                    throw new Error(`Cloud storage upload failed: ${uploadError}`);
                }

                if (storageUrl) {
                    console.log(`[Import] Uploaded to storage: ${storageUrl}`);
                    const { error: insertError } = await supabase.from('family_media').insert({
                        family_id: familyId,
                        url: storageUrl,
                        type: mimeType.startsWith('video') ? 'video' : 'image',
                        filename: filename,
                        size: blob.size,
                        folder: targetFolder,
                        category: 'general',
                        uploaded_by: user?.id,
                        metadata: {
                            googlePhotoId: item.id,
                            importedAt: new Date().toISOString()
                        }
                    } as any);

                    if (insertError) {
                        throw new Error(`Database record creation failed: ${insertError.message}`);
                    }

                    console.log(`[Import] Successfully saved ${filename} to database.`);
                }
            } catch (err: any) {
                console.error(`Failed to import item ${item.id}:`, err);
                alert(`Import failed for item: ${err.message}`);
            }
        }

        setUploadProgress(null);
        await fetchMedia();
    }

    useEffect(() => {
        if (!familyId) return;
        fetchMedia();
        setSelectedItems(new Set());
    }, [familyId, activeTab, systemCategory]);


    async function fetchMedia() {
        setIsLoading(true);
        let data: any[] = [];

        if (activeTab === 'uploads') {
            const result = await supabase
                .from('family_media')
                .select('id, family_id, url, type, category, folder, filename, size, tags, uploaded_by, created_at, metadata')
                .eq('family_id', familyId!)
                .order('created_at', { ascending: false });

            if (result.error) {
                console.error('Error fetching family media:', result.error);
            }
            data = result.data || [];
        } else {
            const result = await supabase
                .from('library_assets')
                .select('*')
                .eq('category', systemCategory)
                .order('created_at', { ascending: false });

            if (result.data) {
                data = result.data.map((item: any) => ({
                    id: item.id,
                    url: item.url,
                    type: 'image',
                    filename: item.name,
                    folder: 'System Library',
                    category: item.category,
                    created_at: item.created_at,
                    size: 0,
                    tags: item.tags || [],
                    isSystemAsset: true
                }));
            }
        }

        // Usage Counting Logic
        // 1. Fetch all potential usage sources
        // Note: For large datasets, this should be done via an RPC function or separate tailored queries.
        // For now, we fetch skeletal data to compute usage client-side or use existing queries.

        const usageMap: Record<string, number> = {};

        // A. Albums (Pages Assets)
        // We look at 'pages' table (legacy) or 'album_pages' (unified). The 'assets' table stores page elements.
        const { data: assetUsage } = await supabase
            .from('assets')
            .select('url');

        assetUsage?.forEach((asset: any) => {
            if (asset.url) usageMap[asset.url] = (usageMap[asset.url] || 0) + 1;
        });

        // B. Events (Presentation URL + Content Assets)
        const { data: eventUsage } = await supabase
            .from('events')
            .select('content');

        eventUsage?.forEach((evt: any) => {
            const content = typeof evt.content === 'string' ? JSON.parse(evt.content) : evt.content;
            if (!content) return;

            // Presentation URL
            if (content.presentationUrl) {
                usageMap[content.presentationUrl] = (usageMap[content.presentationUrl] || 0) + 1;
            }

            // Gallery/Story Assets
            if (Array.isArray(content.assets)) {
                content.assets.forEach((a: any) => {
                    if (a.url) usageMap[a.url] = (usageMap[a.url] || 0) + 1;
                });
            }

            // Rich Text Story Images (Regex find)
            if (content.description && typeof content.description === 'string') {
                const imgRegex = /src="([^"]+)"/g;
                let match;
                while ((match = imgRegex.exec(content.description)) !== null) {
                    if (match[1]) usageMap[match[1]] = (usageMap[match[1]] || 0) + 1;
                }
            }
        });

        // C. Home / Hero Image
        // We check the local storage configuration for the current family hero
        if (typeof window !== 'undefined' && familyId) {
            const heroUrl = localStorage.getItem(`family_hero_${familyId}`);
            if (heroUrl) {
                usageMap[heroUrl] = (usageMap[heroUrl] || 0) + 1;
            }
        }

        // D. Albums (Cover Images)
        const { data: albumUsage } = await supabase
            .from('albums')
            .select('config');

        albumUsage?.forEach((alb: any) => {
            let config = alb.config || {};
            if (typeof config === 'string') {
                try { config = JSON.parse(config); } catch (e) { config = {}; }
            }
            const coverUrl = config.coverImage || (config.cover && config.cover.url);
            if (coverUrl) {
                usageMap[coverUrl] = (usageMap[coverUrl] || 0) + 1;
            }
        });

        // D. Profiles (Avatars)
        const { data: profileUsage } = await supabase
            .from('profiles')
            .select('avatar_url');

        profileUsage?.forEach((p: any) => {
            if (p.avatar_url) usageMap[p.avatar_url] = (usageMap[p.avatar_url] || 0) + 1;
        });


        // Add usage count to media items
        // Normalizing URLs can be tricky (parameters etc). We attempt exact match or base match.
        const mediaWithUsage = data.map(item => {
            // Simple normalization (ignore query params for matching?)
            // Many URLs in DB might have params or not.
            // For robustness, check exact match first.
            let count = usageMap[item.url] || 0;

            // If 0, try matching without query params if item.url has them
            if (count === 0 && item.url.includes('?')) {
                const base = item.url.split('?')[0];
                // usageMap might keys might also have params or not. 
                // This is expensive O(N) lookup without better structure, let's keep it simple for now.
            }
            return { ...item, usageCount: count };
        });

        setMedia(mediaWithUsage as MediaItem[]);
        setIsLoading(false);
    }

    function handleUploadClick() {
        if (activeTab === 'uploads') {
            setShowFolderPicker(true);
        } else {
            fileInputRef.current?.click();
        }
    }

    function handleFolderSelection(folder: string) {
        if (folder === '__new__') {
            const newFolder = prompt('Enter new folder name:');
            if (newFolder && newFolder.trim()) {
                setUploadFolder(newFolder.trim());
            }
        } else {
            setUploadFolder(folder);
        }
        setShowFolderPicker(false);
        fileInputRef.current?.click();
    }

    async function performUpload(files: FileList | File[]) {
        if (!files || files.length === 0) return;

        if (activeTab === 'system' && !isAdmin) {
            alert("Only admins can add to System Assets.");
            return;
        }

        let uploadTags: string[] = [];
        if (activeTab === 'system') {
            const tagsInput = prompt("Add hashtags for these assets (comma separated, optional):");
            if (tagsInput) {
                uploadTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
            }
        }

        const { storageService } = await import('../services/storage');
        setUploadProgress({ current: 0, total: files.length });

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setUploadProgress({ current: i + 1, total: files.length });

            let bucket: 'event-assets' | 'album-assets' | 'system-assets';
            let path = '';

            if (activeTab === 'system') {
                bucket = 'system-assets';
                path = `${systemCategory}/`;
            } else {
                bucket = 'album-assets';
                path = `family/${familyId}/`;
            }

            let storageUrl: string | null = null;
            let googlePhotoId: string | undefined;

            // Step 1: Upload to Supabase (Website Storage) - Always required
            const { url: supabaseUrl, error: storageError } = await storageService.uploadFile(file, bucket, path);
            storageUrl = supabaseUrl;

            if (storageError) {
                console.error('Internal storage upload failed:', storageError);
                continue; // Skip if internal upload fails
            }

            // Step 2: Workflow #2 - Parallel Sync to Google Photos if connected
            if (activeTab === 'uploads' && googleAccessToken) {
                try {
                    const photosService = new GooglePhotosService(googleAccessToken);
                    const mediaItem = await photosService.uploadMedia(file, file.name);
                    googlePhotoId = mediaItem.id;
                } catch (err) {
                    console.error('Google Photos sync failed:', err);
                    // We continue anyway since we have the internal storage URL
                }
            }

            if (storageUrl) {
                if (activeTab === 'uploads' && familyId) {
                    await supabase.from('family_media').insert({
                        family_id: familyId,
                        url: storageUrl,
                        type: file.type.startsWith('video') ? 'video' : 'image',
                        filename: file.name,
                        size: file.size,
                        folder: uploadFolder,
                        category: 'general',
                        uploaded_by: user?.id,
                        metadata: googlePhotoId ? { googlePhotoId, syncedToGoogle: true } : undefined
                    } as any);
                }
                else if (activeTab === 'system' && isAdmin) {
                    await supabase.from('library_assets').insert({
                        category: systemCategory,
                        url: storageUrl,
                        name: file.name,
                        tags: uploadTags,
                        is_premium: false
                    } as any);
                }
            }
        }

        setUploadProgress(null);
        await fetchMedia();
    }

    async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files) {
            await performUpload(e.target.files);
            e.target.value = '';
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (activeTab === 'uploads' || isAdmin) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        if (activeTab === 'uploads' || isAdmin) {
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                await performUpload(files);
            }
        }
    };

    async function handleBulkEditTags() {
        if (selectedItems.size === 0) return;

        const tagsInput = prompt(`Edit tags for ${selectedItems.size} items (comma separated):`);
        if (tagsInput === null) return;

        const newTags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
        const table = activeTab === 'uploads' ? 'family_media' : 'library_assets';

        setIsLoading(true);
        for (const id of Array.from(selectedItems)) {
            await (supabase.from(table as any) as any).update({ tags: newTags }).eq('id', id);
        }
        setMedia(prev => prev.map(m => selectedItems.has(m.id) ? { ...m, tags: newTags } : m));
        setIsLoading(false);
    }

    async function handleDelete(ids: string[]) {
        const itemsToDelete = media.filter(m => ids.includes(m.id));

        // Strict Usage Check
        const usedItems = itemsToDelete.filter(m => (m.usageCount || 0) > 0);

        if (usedItems.length > 0) {
            alert(`Unable to delete ${usedItems.length} item(s) because they are currently used in albums, events, or profiles.\n\nPlease remove them from the specific pages/events first.`);
            return;
        }

        const confirmMessage = `Delete ${ids.length} item${ids.length !== 1 ? 's' : ''}? This action cannot be undone.`;

        if (!confirm(confirmMessage)) return;

        if (activeTab === 'system' && !isAdmin) {
            alert("Only admins can delete System Assets.");
            return;
        }

        setIsLoading(true);

        const { storageService } = await import('../services/storage');

        // Delete from Cloud Storage first (best effort)
        for (const item of itemsToDelete) {
            try {
                // We attempt to delete, but don't block if it fails (e.g. no credentials)
                await storageService.deleteFile(item.url);
            } catch (e) {
                console.warn("Failed to delete from cloud:", e);
            }
        }

        // Delete from DB
        const table = activeTab === 'uploads' ? 'family_media' : 'library_assets';
        await (supabase.from(table as any) as any).delete().in('id', ids);

        setSelectedItems(new Set());
        await fetchMedia();
        setIsLoading(false);
    }

    async function handleUpdateTags(id: string, newTags: string[]) {
        if (activeTab === 'system' && !isAdmin) return;
        const table = activeTab === 'uploads' ? 'family_media' : 'library_assets';
        await (supabase.from(table as any) as any).update({ tags: newTags }).eq('id', id);
        setMedia(prev => prev.map(m => m.id === id ? { ...m, tags: newTags } : m));
    }

    async function handleRename(id: string, newName: string) {
        if (!newName.trim() || (activeTab === 'system' && !isAdmin)) return;
        const table = activeTab === 'uploads' ? 'family_media' : 'library_assets';
        const field = activeTab === 'uploads' ? 'filename' : 'name';
        await (supabase.from(table as any) as any).update({ [field]: newName }).eq('id', id);
        setMedia(prev => prev.map(m => m.id === id ? { ...m, filename: newName } : m));
        setEditingItem(null);
    }

    const folders = activeTab === 'uploads'
        ? Array.from(new Set(media.map(m => m.folder || '/'))).sort()
        : [];

    const displayedItems = media.filter(item => {
        const matchesFolder = activeTab === 'system' || currentFolder === 'All' || (item.folder || '/') === currentFolder;
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch = item.filename?.toLowerCase().includes(searchLower) || (item.tags || []).some(t => t.toLowerCase().includes(searchLower));
        const matchesType = filterType === 'all' || item.type === filterType;
        return matchesFolder && matchesSearch && matchesType;
    }).sort((a, b) => {
        const multiplier = sortOrder === 'asc' ? 1 : -1;
        if (sortBy === 'name') return (a.filename || '').localeCompare(b.filename || '') * multiplier;
        if (sortBy === 'size') return ((a.size || 0) - (b.size || 0)) * multiplier;
        // Default to date
        return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * multiplier;
    });

    const toggleSelectAll = () => {
        if (selectedItems.size === displayedItems.length && displayedItems.length > 0) {
            setSelectedItems(new Set());
        } else {
            setSelectedItems(new Set(displayedItems.map(i => i.id)));
        }
    };

    return (
        <div className="flex h-[calc(100vh-64px)] bg-gray-50">
            <div className="w-64 bg-white border-r border-gray-200 flex flex-col shadow-sm z-10">
                <div className="p-4 border-b border-gray-100 space-y-4">
                    <h2 className="font-serif text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Folder className="w-5 h-5 text-catalog-accent" />
                        Library
                    </h2>

                    <div className="flex p-1 bg-gray-100 rounded-lg">
                        <button onClick={() => { setActiveTab('uploads'); setCurrentFolder('All'); }} className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-all", activeTab === 'uploads' ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-900")}>
                            My Uploads
                        </button>
                        <button onClick={() => setActiveTab('system')} className={cn("flex-1 py-1.5 text-xs font-medium rounded-md transition-all", activeTab === 'system' ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-900")}>
                            System Assets
                        </button>
                    </div>

                    {activeTab === 'system' && (
                        <div className="flex flex-col gap-1">
                            <button onClick={() => setSystemCategory('background')} className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors", systemCategory === 'background' ? "bg-catalog-accent/10 text-catalog-accent font-medium" : "text-gray-600 hover:bg-gray-50")}>
                                <Palette className="w-4 h-4" /> Backgrounds
                            </button>
                            <button onClick={() => setSystemCategory('sticker')} className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors", systemCategory === 'sticker' ? "bg-catalog-accent/10 text-catalog-accent font-medium" : "text-gray-600 hover:bg-gray-50")}>
                                <Sticker className="w-4 h-4" /> Stickers
                            </button>
                            <button onClick={() => setSystemCategory('frame')} className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors", systemCategory === 'frame' ? "bg-catalog-accent/10 text-catalog-accent font-medium" : "text-gray-600 hover:bg-gray-50")}>
                                <Square className="w-4 h-4" /> Frames
                            </button>
                            <button onClick={() => setSystemCategory('ribbon')} className={cn("flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors", systemCategory === 'ribbon' ? "bg-catalog-accent/10 text-catalog-accent font-medium" : "text-gray-600 hover:bg-gray-50")}>
                                <ImageIcon className="w-4 h-4" /> Ribbons
                            </button>
                        </div>
                    )}

                    {(activeTab === 'uploads' || isAdmin) && (
                        <div className="space-y-2">
                            <button onClick={() => setShowSourceModal(true)} className="w-full flex items-center justify-center gap-2 bg-catalog-accent text-white py-2.5 rounded-lg hover:bg-catalog-accent/90 transition-all shadow-sm font-medium text-sm">
                                <Upload className="w-4 h-4" />
                                {activeTab === 'system' ? 'Add Asset' : 'Add Media'}
                            </button>

                            {/* Google Photos Connector */}
                            {activeTab === 'uploads' && !googleAccessToken && (
                                <button
                                    onClick={() => signInWithGoogle()}
                                    className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50 transition-all shadow-sm font-medium text-[10px] uppercase tracking-wider"
                                >
                                    <span className="w-4 h-4 flex items-center justify-center font-bold text-blue-600 bg-blue-50 rounded">G</span>
                                    Connect Google Photos
                                </button>
                            )}

                            {activeTab === 'uploads' && googleAccessToken && (
                                <div className="space-y-2 pt-2">
                                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-100">
                                        <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                        <span className="text-[9px] font-black text-green-700 uppercase tracking-widest">Photos Connected</span>
                                    </div>
                                    <button
                                        onClick={() => setIsGoogleSelectorOpen(true)}
                                        className="w-full flex items-center justify-center gap-2 bg-blue-50 text-blue-700 py-2.5 rounded-lg hover:bg-blue-100 transition-all font-medium text-[10px] uppercase tracking-wider border border-blue-200"
                                    >
                                        <Camera className="w-4 h-4" />
                                        Browse & Import
                                    </button>
                                </div>
                            )}

                            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleUpload} />
                        </div>
                    )}
                </div>

                {activeTab === 'uploads' && (
                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                        <button onClick={() => setCurrentFolder('All')} className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all", currentFolder === 'All' ? "bg-catalog-accent/10 text-catalog-accent font-semibold" : "text-gray-600 hover:bg-gray-50")}>
                            <Grid className="w-4 h-4" /> All Media
                        </button>

                        <div className="flex items-center justify-between pt-4 pb-2 px-3">
                            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Folders</span>
                            <button
                                onClick={() => handleFolderSelection('__new__')}
                                className="p-1 hover:bg-gray-100 rounded-md text-gray-500 hover:text-catalog-accent transition-colors"
                                title="New Folder"
                            >
                                <FolderPlus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        {folders.map(folder => {
                            const folderItems = media.filter(m => (m.folder || '/') === folder);

                            return (
                                <div key={folder} className="group/folder flex items-center">
                                    <button
                                        onClick={() => setCurrentFolder(folder)}
                                        className={cn(
                                            "flex-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all truncate",
                                            currentFolder === folder
                                                ? "bg-catalog-accent/5 text-catalog-accent font-medium border border-catalog-accent/20"
                                                : "text-gray-600 hover:bg-gray-50 border border-transparent"
                                        )}
                                    >
                                        <Folder className={cn("w-4 h-4 flex-shrink-0", currentFolder === folder ? "fill-catalog-accent/20" : "text-gray-400")} />
                                        <span className="truncate">{folder === '/' ? 'Unsorted' : folder}</span>
                                        <span className="ml-auto text-xs opacity-50 bg-gray-100 px-1.5 rounded-full">{folderItems.length}</span>
                                    </button>
                                    {/* Delete folder button */}
                                    {folder !== '/' && !folderItems.some(m => (m.usageCount || 0) > 0) && (
                                        <button
                                            onClick={async (e) => {
                                                e.stopPropagation();
                                                if (!confirm(`Delete folder "${folder}" and all ${folderItems.length} items inside?`)) return;

                                                // Use handleDelete to ensure cloud deletion logic is shared
                                                await handleDelete(folderItems.map(i => i.id));

                                                if (currentFolder === folder) setCurrentFolder('All');
                                            }}
                                            className="opacity-0 group-hover/folder:opacity-100 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                                            title={`Delete folder "${folder}"`}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {folder !== '/' && folderItems.some(m => (m.usageCount || 0) > 0) && (
                                        <div
                                            className="opacity-0 group-hover/folder:opacity-50 p-1.5 text-gray-300 cursor-not-allowed"
                                            title={`Cannot delete: Folder contains items currently in use`}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div
                className="flex-1 flex flex-col bg-gray-50/50 relative"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {/* Drag Overlay */}
                {isDragging && (
                    <div className="absolute inset-0 z-50 bg-catalog-accent/20 backdrop-blur-sm flex items-center justify-center pointer-events-none border-4 border-dashed border-catalog-accent m-4 rounded-2xl animate-in fade-in zoom-in duration-200">
                        <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center gap-4">
                            <div className="w-16 h-16 bg-catalog-accent/10 rounded-full flex items-center justify-center">
                                <Upload className="w-8 h-8 text-catalog-accent animate-bounce" />
                            </div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-gray-900">Drop files to upload</h3>
                                <p className="text-sm text-gray-500">Add them to your {uploadFolder === '/' ? 'Library' : `"${uploadFolder}" folder`}</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="h-14 border-b border-gray-200 bg-white px-6 flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                        <button onClick={toggleSelectAll} className="flex items-center gap-2 hover:text-gray-900 transition-colors">
                            {selectedItems.size === displayedItems.length && displayedItems.length > 0 ? <CheckSquare className="w-5 h-5 text-catalog-accent" /> : <Square className="w-5 h-5 text-gray-300" />}
                            <span className="font-medium">Select All</span>
                        </button>
                        <div className="h-4 w-px bg-gray-300" />
                        <span className="font-medium text-gray-900">{displayedItems.length}</span> items
                        {selectedItems.size > 0 && <span className="px-2 py-0.5 bg-catalog-accent/10 text-catalog-accent rounded-full text-xs font-medium">{selectedItems.size} selected</span>}
                    </div>

                    <div className="flex items-center gap-3">
                        {selectedItems.size > 0 && (activeTab === 'uploads' || isAdmin) && (
                            <>
                                <button onClick={handleBulkEditTags} className="flex items-center gap-1.5 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                                    <Edit2 className="w-4 h-4" /> Edit Tags ({selectedItems.size})
                                </button>
                                <button onClick={() => handleDelete(Array.from(selectedItems))} className="flex items-center gap-1.5 text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors">
                                    <Trash2 className="w-4 h-4" /> Delete ({selectedItems.size})
                                </button>
                            </>
                        )}
                        <div className="relative group">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 group-focus-within:text-catalog-accent transition-colors" />
                            <input type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 pr-4 py-1.5 w-48 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-catalog-accent/20 focus:border-catalog-accent focus:bg-white transition-all" />
                        </div>

                        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-0.5">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                className="text-xs bg-transparent border-none focus:ring-0 text-gray-600 font-medium py-1 pl-2 pr-6 cursor-pointer hover:bg-gray-50 rounded-md"
                            >
                                <option value="all">All Types</option>
                                <option value="image">Images</option>
                                <option value="video">Videos</option>
                            </select>
                            <div className="w-px h-4 bg-gray-200 mx-1" />
                            <select
                                value={`${sortBy}-${sortOrder}`}
                                onChange={(e) => {
                                    const [field, order] = e.target.value.split('-');
                                    setSortBy(field as any);
                                    setSortOrder(order as any);
                                }}
                                className="text-xs bg-transparent border-none focus:ring-0 text-gray-600 font-medium py-1 pl-2 pr-6 cursor-pointer hover:bg-gray-50 rounded-md"
                            >
                                <option value="date-desc">Newest</option>
                                <option value="date-asc">Oldest</option>
                                <option value="name-asc">A-Z</option>
                                <option value="name-desc">Z-A</option>
                                <option value="size-desc">Largest</option>
                                <option value="size-asc">Smallest</option>
                            </select>
                        </div>
                        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                            <button onClick={() => setViewMode('grid')} className={cn("p-1.5 rounded-md transition-all", viewMode === 'grid' ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600")}>
                                <Grid className="w-4 h-4" />
                            </button>
                            <button onClick={() => setViewMode('list')} className={cn("p-1.5 rounded-md transition-all", viewMode === 'list' ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-600")}>
                                <List className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {uploadProgress && (
                    <div className="px-6 py-3 bg-blue-50 border-b border-blue-200">
                        <div className="flex items-center justify-between text-sm text-blue-900 mb-2">
                            <span>Uploading {uploadProgress.current} of {uploadProgress.total} files...</span>
                            <span>{Math.round((uploadProgress.current / uploadProgress.total) * 100)}%</span>
                        </div>
                        <div className="w-full bg-blue-200 rounded-full h-2">
                            <div className="bg-blue-600 h-2 rounded-full transition-all" style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}></div>
                        </div>
                    </div>
                )}
                {/* Grid / Content Area */}
                <div className="flex-1 overflow-y-auto p-6 content-scrollbar">

                    {isLoading ? (
                        <div className="flex h-full items-center justify-center">
                            <Loader2 className="w-8 h-8 animate-spin text-catalog-accent/30" />
                        </div>
                    ) : (
                        <div className={cn("grid gap-6", viewMode === 'grid' ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6" : "grid-cols-1")}>
                            {displayedItems.map(item => (
                                <MediaGridItem
                                    key={item.id}
                                    item={item}
                                    viewMode={viewMode}
                                    selectedItems={selectedItems}
                                    onToggleSelect={(id: string) => {
                                        const newSet = new Set(selectedItems);
                                        if (newSet.has(id)) newSet.delete(id);
                                        else newSet.add(id);
                                        setSelectedItems(newSet);
                                    }}
                                    editingItem={editingItem}
                                    editName={editName}
                                    setEditName={setEditName}
                                    handleRename={handleRename}
                                    handleUpdateTags={handleUpdateTags}
                                    handleDelete={handleDelete}
                                    isAdmin={isAdmin}
                                    activeTab={activeTab}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {showFolderPicker && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowFolderPicker(false)}>
                    <div className="bg-white rounded-lg p-6 w-96 max-h-[80vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-bold mb-4">Select Upload Folder</h3>
                        <div className="space-y-2">
                            <button onClick={() => handleFolderSelection('__new__')} className="w-full flex items-center gap-2 px-4 py-3 border-2 border-dashed border-catalog-accent text-catalog-accent rounded-lg hover:bg-catalog-accent/5 transition-colors">
                                <FolderPlus className="w-5 h-5" />
                                <span className="font-medium">Create New Folder</span>
                            </button>
                            {folders.map(folder => (
                                <button key={folder} onClick={() => handleFolderSelection(folder)} className="w-full flex items-center gap-2 px-4 py-3 border border-gray-200 rounded-lg hover:border-catalog-accent hover:bg-catalog-accent/5 transition-colors">
                                    <Folder className="w-5 h-5 text-gray-400" />
                                    <span>{folder === '/' ? 'Unsorted' : folder}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
            {googleAccessToken && (
                <GooglePhotosSelector
                    isOpen={isGoogleSelectorOpen}
                    googleAccessToken={googleAccessToken}
                    onClose={() => setIsGoogleSelectorOpen(false)}
                    onSelect={handleGooglePhotosImport}
                    folders={folders}
                    onReauth={signInWithGoogle}
                />
            )}

            {showUrlInput && (
                <UrlInputModal
                    isOpen={showUrlInput}
                    onClose={() => setShowUrlInput(false)}
                    onSubmit={handleUrlImport}
                />
            )}

            {/* Source Selection Modal */}
            {showSourceModal && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in" onClick={() => setShowSourceModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-lg font-serif italic text-catalog-text">
                                Add to {activeTab === 'system' ? 'System Assets' : uploadFolder === '/' ? 'Library' : uploadFolder}
                            </h3>
                            <button onClick={() => setShowSourceModal(false)} className="p-1 hover:bg-gray-100 rounded-full text-gray-400">
                                <X className="w-5 h-5" />
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
                                    <div className="font-bold text-gray-900 text-sm">Upload Files</div>
                                    <div className="text-xs text-gray-500">From your computer</div>
                                </div>
                            </button>
                            {activeTab === 'uploads' && (
                                <>
                                    <button
                                        onClick={() => handleSourceSelect('google')}
                                        className="w-full text-left px-4 py-3 hover:bg-gray-50 rounded-lg flex items-center gap-3 transition-colors group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Camera className="w-5 h-5" />
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
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

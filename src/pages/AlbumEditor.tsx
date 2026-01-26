import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
    ArrowLeft, Save, Share, X, Copy, Check, Settings as SettingsIcon, Tag,
    ChevronDown, ChevronRight, ChevronLeft, ChevronUp,
    Layers, Bold, Underline, Pencil, Trash2,
    Lock, Unlock, Eye, Plus, Undo, Redo, Maximize, MapPin, Image as ImageIcon
} from 'lucide-react';
import { MediaPickerModal } from '../components/media/MediaPickerModal';
import { useAlbum } from '../contexts/AlbumContext';
import { EditorCanvas } from '../components/editor/EditorCanvas';
import { AssetControlPanel } from '../components/editor/AssetControlPanel';
import { Filmstrip } from '../components/editor/Filmstrip';
import { Button } from '../components/ui/Button';
import { HashtagInput } from '../components/ui/HashtagInput';
import { generateShareLink } from '../services/sharing';
import { cn } from '../lib/utils';
import { AnimatePresence, motion } from 'framer-motion';

import { useAlbumAutoSave } from '../hooks/useAlbumAutoSave';
import { AssetLibrary } from '../components/editor/AssetLibrary';
import { LayersPanel } from '../components/editor/LayersPanel';
import { FlipbookViewer } from '../components/viewer/FlipbookViewer';
import { ImageEditorModal } from '../components/editor/ImageEditorModal';
import { MaskEditorModal } from '../components/editor/MaskEditorModal';
import { LocationPicker } from '../components/ui/LocationPicker';
import { LocationPickerModal } from '../components/ui/LocationPickerModal';
import { MapAssetModal } from '../components/ui/MapAssetModal';
import { LayoutSidebar } from '../components/editor/LayoutSidebar';

import { TextEditorModal } from '../components/editor/TextEditorModal';

function AlbumEditorContent() {
    const { id } = useParams<{ id: string }>();
    const {
        album,
        setAlbum,
        currentPageIndex,
        setCurrentPageIndex,
        selectedAssetId,
        setSelectedAssetId,
        addAsset,
        removeAsset,
        updateAsset,
        duplicateAsset,
        updateAssetZIndex,
        saveAlbum,
        fetchAlbum,
        getSpread,
        toggleSpreadView,
        updateConfig,
        undo,
        redo,
        isSaving: isManualSaving,
        isLoading,
        toggleLock,
        canUndo,
        canRedo
    } = useAlbum();

    // --- STUDIO SYNCHRONIZATION HOOK ---
    // Force the Studio to load the saved state if id is present.
    useEffect(() => {
        if (id) {
            console.log(`[AlbumEditor] Initializing Studio with Album ID: ${id}`);
            fetchAlbum(id).catch(err => {
                console.error("[AlbumEditor] Initialization Crash:", err);
                setLoadError(err.message || "Failed to load archive data");
            });
        }
    }, [id]);

    // Autosave Hook
    const autoSave = useAlbumAutoSave();

    const [isSharing, setIsSharing] = useState(false);
    const [shareUrl, setShareUrl] = useState<string | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [hasCopied, setHasCopied] = useState(false);
    const [activeSidebarTab, setActiveSidebarTab] = useState<'properties' | 'layers' | 'layouts'>('properties');

    // Editor State
    const [proTextAssetId, setProTextAssetId] = useState<string | null>(null);
    // Navigation State
    const [zoom, setZoom] = useState(0.5); // Start zoomed out to see full spread
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [navigationDirection, setNavigationDirection] = useState<'next' | 'prev'>('next');
    const [activePageId, setActivePageId] = useState<string | null>(null);

    // --- PROFESSIONAL LOCAL BACKUP SYSTEM ---
    const [hasLocalBackup, setHasLocalBackup] = useState(false);

    // 1. Monitor for changes and mirror to localStorage
    useEffect(() => {
        if (album && !isLoading && album.pages.length > 0) {
            const backupKey = `album_backup_${album.id}`;
            localStorage.setItem(backupKey, JSON.stringify({
                album,
                timestamp: Date.now()
            }));
        }
    }, [album, isLoading]);

    // 2. Check for existing backup on mount
    useEffect(() => {
        if (id) {
            const backup = localStorage.getItem(`album_backup_${id}`);
            if (backup) {
                try {
                    const parsed = JSON.parse(backup);
                    // Only flag as backup if it's valid and contains pages
                    if (parsed && parsed.album && Array.isArray(parsed.album.pages)) {
                        setHasLocalBackup(true);
                        console.log(`[BackupSystem] Local safety copy found for album ${id}`);
                    }
                } catch (e) {
                    localStorage.removeItem(`album_backup_${id}`);
                }
            }
        }
    }, [id]);

    const restoreBackup = () => {
        if (id) {
            const backup = localStorage.getItem(`album_backup_${id}`);
            if (backup) {
                const { album: backedUpAlbum } = JSON.parse(backup);
                setAlbum(backedUpAlbum);
                setHasLocalBackup(false);
                alert("Restored from local backup. Please save immediately to sync with cloud.");
            }
        }
    };

    // Sync activePageId when page changes
    useEffect(() => {
        if (album && album.pages[currentPageIndex]) {
            const current = album.pages[currentPageIndex];
            if (current) {
                setActivePageId(current.id);
            }
        }
    }, [currentPageIndex, album?.id]); // Only sync when page or album changes, not on every asset update

    // Layout logic removed
    const [editorMode, setEditorMode] = useState<'select' | 'mask' | 'pivot' | 'studio'>('select');
    const [showLocationModal, setShowLocationModal] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const [showCoverPicker, setShowCoverPicker] = useState(false);
    const showPrintSafe = true;
    const workspaceRef = useRef<HTMLDivElement>(null);

    const fitToWorkspace = useCallback(() => {
        if (!workspaceRef.current || !album) return;

        const workspaceRect = workspaceRef.current.getBoundingClientRect();
        const padding = 60; // Margin around the canvas
        const topToolbarH = 48; // Quick toolbar height

        const availableW = workspaceRect.width - (padding * 2);
        const availableH = workspaceRect.height - (padding * 2) - topToolbarH;

        const { width, height } = album.config.dimensions;
        const isSpread = album.config.useSpreadView && album.pages[currentPageIndex].layoutTemplate !== 'cover-front';
        const canvasW = isSpread ? width * 2 : width;
        const canvasH = height;

        const zoomW = availableW / canvasW;
        const zoomH = availableH / canvasH;
        const idealZoom = Math.min(zoomW, zoomH, 1.2); // Limit max auto-zoom to 1.2x

        setZoom(Number(idealZoom.toFixed(2)));
        setPan({ x: 0, y: 0 }); // Reset pan when fitting
    }, [album, currentPageIndex]);

    const handleOpenMapEditor = (assetId: string) => {
        setSelectedAssetId(assetId);
        setShowMapModal(true);
    };

    const handleOpenLocationEditor = (assetId: string) => {
        setSelectedAssetId(assetId);
        setShowLocationModal(true);
    };

    // Global Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if in input/textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    redo();
                } else {
                    undo();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo]);

    // Update zoom when album loads or spread view changes
    useEffect(() => {
        if (album && !isLoading) {
            // Slight delay to ensure DOM is settled
            const timer = setTimeout(fitToWorkspace, 100);
            return () => clearTimeout(timer);
        }
    }, [album?.id, album?.config.useSpreadView]);

    // Handle Delete Key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                if (!selectedAssetId || !album || album.config.isLocked) return;

                // Ignore if user is typing in an input
                const target = e.target as HTMLElement;
                if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

                const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAssetId))?.id;
                if (pageId) {
                    removeAsset(pageId, selectedAssetId);
                    setSelectedAssetId(null);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedAssetId, album, removeAsset, setSelectedAssetId]);
    const [showPreview, setShowPreview] = useState(false);

    const selectedAsset = album?.pages.flatMap(p => p.assets).find(a => a.id === selectedAssetId);
    const activePage = album?.pages.find(p => p.assets.some(a => a.id === selectedAssetId)) || album?.pages[currentPageIndex];

    const [loadError, setLoadError] = useState<string | null>(null);

    // Sync active page and sidebar with selection
    useEffect(() => {
        if (selectedAssetId && album) {
            const page = album.pages.find(p => p.assets.some(a => a.id === selectedAssetId));
            if (page) {
                if (page.id !== activePageId) setActivePageId(page.id);
                // Auto-open properties for images
                const asset = page.assets.find(a => a.id === selectedAssetId);
                if (asset && (asset.type === 'image' || asset.type === 'video' || asset.type === 'frame')) {
                    setActiveSidebarTab('properties');
                }
            }
        }
    }, [selectedAssetId, album]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            const isMod = e.ctrlKey || e.metaKey;

            if (isMod && e.key === 'z') {
                e.preventDefault();
                if (e.shiftKey) redo();
                else undo();
            }
            if (isMod && e.key === 'y') {
                e.preventDefault();
                redo();
            }

            if (selectedAssetId && (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key))) {
                e.preventDefault();
                const step = e.shiftKey ? 10 : 1;
                const currentPage = album?.pages[currentPageIndex];
                const asset = currentPage?.assets.find(a => a.id === selectedAssetId);

                if (asset && currentPage) {
                    let newX = asset.x;
                    let newY = asset.y;

                    if (e.key === 'ArrowUp') newY -= step;
                    if (e.key === 'ArrowDown') newY += step;
                    if (e.key === 'ArrowLeft') newX -= step;
                    if (e.key === 'ArrowRight') newX += step;

                    updateAsset(currentPage.id, asset.id, { x: newX, y: newY });
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, selectedAssetId, album, currentPageIndex, updateAsset]);

    // Load real album data
    useEffect(() => {
        const load = async () => {
            if (id && (!album || album.id !== id)) {
                const { success, error } = await fetchAlbum(id);
                if (!success) {
                    setLoadError(error || 'Failed to load album');
                }
            }
        };
        load();
    }, [id, fetchAlbum, album]);

    // Safety timeout
    useEffect(() => {
        if (isLoading) {
            const timer = setTimeout(() => {
                if (isLoading) {
                    setLoadError('Loading is taking longer than expected. Please refresh.');
                }
            }, 10000);
            return () => clearTimeout(timer);
        }
    }, [isLoading]);

    const handleShare = async () => {
        if (!album) return;
        setIsSharing(true);
        // Reset previous state
        setShareUrl(null);
        setHasCopied(false);

        try {
            const { link, error } = await generateShareLink(album.id);
            if (link) {
                setShareUrl(link);
                setShowShareModal(true);
            } else {
                console.error(error);
                alert('Failed to generate share link');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsSharing(false);
        }
    };

    const copyToClipboard = () => {
        if (shareUrl) {
            navigator.clipboard.writeText(shareUrl);
            setHasCopied(true);
            setTimeout(() => setHasCopied(false), 2000);
        }
    };

    const currentPage = album?.pages[currentPageIndex];

    if (loadError) {
        return (
            <div className="h-screen flex items-center justify-center bg-catalog-bg">
                <div className="text-center max-w-md p-8 bg-white rounded-2xl shadow-xl border border-red-100">
                    <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                        <X className="w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-serif text-catalog-text mb-2">Something went wrong</h2>
                    <p className="text-catalog-text/60 mb-8">{loadError}</p>
                    <div className="flex flex-col gap-3">
                        <Button variant="primary" onClick={() => window.location.reload()}>
                            Try Again
                        </Button>
                        <Link to="/library" className="text-sm font-bold text-catalog-accent hover:underline uppercase tracking-widest">
                            Return to Library
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading || !album || !currentPage) {
        return (
            <div className="h-screen flex items-center justify-center bg-catalog-bg">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-catalog-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="font-serif italic text-catalog-text/70">{isLoading ? 'Loading archive...' : 'Setting up your studio...'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50 relative">
            {/* --- BACKUP RECOVERY BANNER --- */}
            <AnimatePresence>
                {hasLocalBackup && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="bg-catalog-accent text-white px-6 py-2 flex items-center justify-between text-xs font-bold uppercase tracking-widest z-[70]"
                    >
                        <div className="flex items-center gap-2">
                            <Layers className="w-4 h-4 animate-pulse" />
                            <span>Unsaved Local Backup Found (Recovering your session)</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <button onClick={restoreBackup} className="hover:underline bg-white/20 px-3 py-1 rounded-sm">Restore Progress</button>
                            <button onClick={() => setHasLocalBackup(false)} className="opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Share Modal Overlay */}
            {showShareModal && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-serif text-catalog-text">Share Album</h3>
                            <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <p className="text-sm text-gray-500">
                                Share this temporary link with family. It will expire automatically in 48 hours.
                            </p>
                            <div className="flex items-center gap-2">
                                <input
                                    readOnly
                                    value={shareUrl || ''}
                                    className="flex-1 bg-gray-50 border border-gray-200 rounded px-3 py-2 text-sm font-mono text-gray-600 focus:outline-none focus:border-catalog-accent"
                                />
                                <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={copyToClipboard}
                                    className={cn("min-w-[80px]", hasCopied && "bg-green-50 text-green-600 border-green-200")}
                                >
                                    {hasCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {hasCopied ? 'Copied' : 'Copy'}
                                </Button>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <Button variant="ghost" onClick={() => setShowShareModal(false)}>
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 animate-slide-up">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xl font-serif text-catalog-text">Album Settings</h3>
                            <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-catalog-text/70 uppercase tracking-widest">Title</label>
                                <input
                                    value={album.title}
                                    onChange={(e) => setAlbum({ ...album, title: e.target.value })}
                                    className="w-full bg-catalog-stone/10 border-0 rounded-lg px-3 py-2 text-sm text-catalog-text focus:ring-2 focus:ring-catalog-accent/30"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-catalog-text/70 uppercase tracking-widest">Description</label>
                                <textarea
                                    value={album.description || ''}
                                    onChange={(e) => setAlbum({ ...album, description: e.target.value })}
                                    rows={3}
                                    className="w-full bg-catalog-stone/10 border-0 rounded-lg px-3 py-2 text-sm text-catalog-text focus:ring-2 focus:ring-catalog-accent/30"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-catalog-text/70 uppercase tracking-widest">Cover Image</label>
                                <div className="flex items-center gap-3">
                                    <div className="relative w-16 h-16 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
                                        {album.coverUrl ? (
                                            <img src={album.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                <ImageIcon className="w-8 h-8 opacity-50" />
                                            </div>
                                        )}
                                    </div>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => setShowCoverPicker(true)}
                                    >
                                        Change Cover
                                    </Button>
                                    {album.coverUrl && (
                                        <button
                                            onClick={() => setAlbum({ ...album, coverUrl: null })}
                                            className="text-xs text-red-500 hover:underline"
                                        >
                                            Remove
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-catalog-text/70 uppercase tracking-widest flex items-center gap-1">
                                    <Tag className="w-3.5 h-3.5" /> Hashtags
                                </label>
                                <HashtagInput
                                    tags={album.hashtags || []}
                                    onChange={(tags) => setAlbum({ ...album, hashtags: tags })}
                                    suggestions={['vacation', 'wedding', 'birthday', 'recipe', 'history']}
                                />
                            </div>
                            <div className="space-y-1">
                                <LocationPicker
                                    label="Location"
                                    value={album.location || ''}
                                    onChange={(address, lat, lng) => {
                                        if (album.config.isLocked) return;
                                        const updates: any = { location: address };
                                        // Support 0 as a valid coordinate
                                        if (typeof lat === 'number' && typeof lng === 'number') {
                                            updates.geotag = { lat, lng };
                                        } else if (!address) {
                                            updates.geotag = null;
                                        }
                                        setAlbum({ ...album, ...updates });
                                    }}
                                />
                            </div>
                        </div>

                        <div className="pt-4 flex justify-end">
                            <Button variant="primary" onClick={() => { saveAlbum(); setShowSettings(false); }}>
                                Done
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Top Bar */}
            <header className="h-16 bg-white border-b border-catalog-accent/20 flex items-center justify-between px-6 sticky top-0 z-[60] shadow-sm">
                <div className="flex items-center gap-6">
                    <Link
                        to="/library"
                        className="p-2 hover:bg-catalog-stone/50 rounded-full transition-colors text-catalog-text/60 hover:text-catalog-text"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="font-serif text-xl text-catalog-text">{album.title}</h1>
                            {/* Autosave Status */}
                            <span className={cn(
                                "text-[10px] uppercase tracking-widest font-medium transition-colors",
                                autoSave.status === 'saving' ? "text-catalog-accent" :
                                    autoSave.status === 'unsaved' ? "text-orange-400" :
                                        "text-gray-400"
                            )}>
                                {autoSave.status === 'saving' ? 'Saving...' :
                                    autoSave.status === 'unsaved' ? 'Unsaved' :
                                        'Saved'}
                            </span>
                        </div>

                        <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-catalog-text/40 uppercase tracking-widest bg-catalog-stone/50 px-2 py-0.5 rounded">
                                {(currentPage.layoutTemplate || 'freeform').replace('-', ' ')}
                            </span>
                            <div className="flex items-center bg-catalog-stone/50 rounded overflow-hidden">
                                <button className="px-2 py-0.5 hover:bg-white/50 text-[10px]" onClick={() => setZoom(z => Math.max(0.2, z - 0.1))}>-</button>
                                <input
                                    type="number"
                                    min="20"
                                    max="200"
                                    value={Math.round(zoom * 100)}
                                    onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val) && val >= 10 && val <= 300) {
                                            setZoom(val / 100);
                                        }
                                    }}
                                    className="w-8 text-[10px] text-center bg-transparent border-none p-0 text-catalog-text/60 font-medium focus:ring-0 appearance-none m-0"
                                />
                                <span className="text-[8px] text-catalog-text/40">%</span>
                                <button className="px-2 py-0.5 hover:bg-white/50 text-[10px]" onClick={() => setZoom(z => Math.min(2.0, z + 0.1))}>+</button>
                            </div>
                            <span className="text-[10px] text-catalog-text/40 uppercase tracking-widest italic">
                                {album.config.useSpreadView && currentPage.layoutTemplate !== 'cover-front'
                                    ? `Pages ${currentPage.pageNumber} -${Math.min(currentPage.pageNumber + 1, album.pages.length)} `
                                    : `Page ${currentPage.pageNumber} `}
                                {` of ${album.pages.length} `}
                            </span>
                            <div className="w-[1px] h-3 bg-catalog-accent/10" />
                            <span className="text-[10px] text-catalog-accent/60 font-medium uppercase tracking-tighter">
                                {album.config.dimensions.width} × {album.config.dimensions.height} {album.config.dimensions.unit || 'px'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white/50 rounded-lg p-0.5 border border-catalog-accent/10 mr-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={!canUndo}
                            onClick={undo}
                            className="h-7 w-7 p-0"
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={!canRedo}
                            onClick={redo}
                            className="h-7 w-7 p-0"
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    <div className="flex items-center bg-catalog-stone/30 rounded-full p-1 mr-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "rounded-full text-[10px] h-7 px-3",
                                album.config.useSpreadView && "bg-white shadow-sm text-catalog-accent"
                            )}
                            onClick={() => toggleSpreadView()}
                        >
                            Spread View
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "rounded-full text-[10px] h-7 px-3",
                                !album.config.useSpreadView && "bg-white shadow-sm text-catalog-accent"
                            )}
                            onClick={() => updateConfig({ useSpreadView: false })}
                        >
                            Single Page
                        </Button>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleLock()}
                        className={cn(
                            "gap-2 transition-all mr-2",
                            album.config.isLocked ? "bg-red-50 text-red-600 hover:bg-red-100" : "text-catalog-text hover:bg-catalog-accent/5",
                            !album.config.isLocked && "border border-catalog-accent/20"
                        )}
                        title={album.config.isLocked ? "Unlock Editing" : "Finalize Album"}
                    >
                        {album.config.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                        <span className="hidden sm:inline">{album.config.isLocked ? "Unlock Editing" : "Finalize Album"}</span>
                    </Button>

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleShare}
                        isLoading={isSharing}
                        className="gap-2"
                        title="Share Album"
                    >
                        <Share className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSettings(true)}
                        className="gap-2"
                        title="Album Settings"
                    >
                        <SettingsIcon className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={async () => {
                            const { success, error } = await saveAlbum();
                            if (success) {
                                // Show a subtle toast or brief indication
                            } else {
                                alert('Failed to save: ' + error);
                            }
                        }}
                        isLoading={isManualSaving || autoSave.status === 'saving'}
                        className="gap-2 shadow-md hover:shadow-lg transition-all"
                    >
                        {isManualSaving || autoSave.status === 'saving' ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save
                    </Button>
                    <Button
                        variant="glass"
                        size="sm"
                        onClick={() => setShowPreview(true)}
                        className="bg-catalog-accent/10 border-catalog-accent/20 text-catalog-accent hover:bg-catalog-accent/20 gap-2"
                    >
                        <Eye className="w-4 h-4" />
                        Preview
                    </Button>

                </div>
            </header>

            {/* Studio Workspace */}
            <div className="flex-1 flex overflow-hidden bg-catalog-bg/40">
                {/* Left Sidebar: Assets & Media */}
                <AssetLibrary />

                {/* Center Canvas Area */}
                <main
                    ref={workspaceRef}
                    className="flex-1 flex flex-col min-w-0 overflow-hidden relative"
                    onClick={() => setSelectedAssetId(null)}
                    onWheel={(e) => {
                        if (e.ctrlKey || e.metaKey) {
                            e.preventDefault();
                            const delta = e.deltaY > 0 ? -0.1 : 0.1;
                            setZoom(z => Math.max(0.2, Math.min(2.0, z + delta)));
                        } else {
                            // Pan on wheel
                            setPan(p => ({ x: p.x - e.deltaX, y: p.y - e.deltaY }));
                        }
                    }}
                    onMouseDown={(e) => {
                        // Middle click or Shift+Click to pan
                        if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
                            e.preventDefault(); // Prevent default scroll
                            const startX = e.clientX;
                            const startY = e.clientY;
                            const startPan = { ...pan };

                            const onMouseMove = (moveEvent: MouseEvent) => {
                                setPan({
                                    x: startPan.x + (moveEvent.clientX - startX),
                                    y: startPan.y + (moveEvent.clientY - startY)
                                });
                            };

                            const onMouseUp = () => {
                                window.removeEventListener('mousemove', onMouseMove);
                                window.removeEventListener('mouseup', onMouseUp);
                            };

                            window.addEventListener('mousemove', onMouseMove);
                            window.addEventListener('mouseup', onMouseUp);
                        }
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="h-12 border-b border-catalog-accent/5 bg-white/80 backdrop-blur-sm z-30 shrink-0 overflow-hidden flex items-center px-4 relative justify-between"
                    >
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (album.config.isLocked) return;
                                    // Use active clicked page or fallback to current left page
                                    const targetPageId = activePageId || album.pages[currentPageIndex]?.id;

                                    if (targetPageId) {
                                        addAsset(targetPageId, {
                                            type: 'text',
                                            content: 'Click to edit text',
                                            x: 35,
                                            y: 35,
                                            width: 30,
                                            height: 10,
                                            rotation: 0,
                                            zIndex: 20,
                                            fontFamily: 'Inter',
                                            fontSize: 32,
                                            fontWeight: 'normal',
                                            textAlign: 'center',
                                            textColor: '#000000'
                                        } as any);
                                    }
                                }}
                                disabled={album.config.isLocked}
                                className={cn(
                                    "h-8 gap-2 bg-catalog-accent/5 text-catalog-accent hover:bg-catalog-accent hover:text-white transition-all border border-catalog-accent/10",
                                    album.config.isLocked && "opacity-50 cursor-not-allowed grayscale"
                                )}
                            >
                                <Plus className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Add Text</span>
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (album.config.isLocked) return;
                                    setShowLocationModal(true);
                                }}
                                disabled={album.config.isLocked}
                                className={cn(
                                    "h-8 gap-2 bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white transition-all border border-purple-200",
                                    album.config.isLocked && "opacity-50 cursor-not-allowed grayscale"
                                )}
                            >
                                <MapPin className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-bold uppercase tracking-wider">Add Location</span>
                            </Button>

                            <div className="w-[1px] h-4 bg-catalog-accent/10 mx-2" />

                            {selectedAsset && !album.config.isLocked ? (
                                <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-1">
                                    <span className="text-[10px] font-bold text-catalog-accent/40 uppercase tracking-widest mr-2">Selection:</span>

                                    {selectedAsset.type === 'text' && (
                                        <div className="flex items-center gap-2 px-2 py-0.5 bg-catalog-stone/5 rounded-md border border-catalog-accent/5 mr-2">
                                            <select
                                                disabled={album.config.isLocked || selectedAsset.isLocked}
                                                value={selectedAsset.fontFamily || 'Inter'}
                                                onChange={(e) => {
                                                    if (album.config.isLocked || selectedAsset.isLocked) return;
                                                    const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAsset.id))?.id;
                                                    if (pageId) updateAsset(pageId, selectedAsset.id, { fontFamily: e.target.value });
                                                }}
                                                className="text-[10px] font-bold bg-transparent border-none focus:ring-0 cursor-pointer text-catalog-accent py-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <option value="Inter">INTER</option>
                                                <option value="'Cormorant Garamond'">GARAMOND</option>
                                                <option value="'Playfair Display'">PLAYFAIR</option>
                                                <option value="'Dancing Script'">DANCING</option>
                                                <option value="Montserrat">MONTSERRAT</option>
                                            </select>

                                            <div className="w-[1px] h-3 bg-catalog-accent/10" />

                                            <div className="flex items-center gap-0.5">
                                                <input
                                                    type="number"
                                                    min="6"
                                                    max="200"
                                                    disabled={album.config.isLocked || selectedAsset.isLocked}
                                                    value={selectedAsset.fontSize || 32}
                                                    onChange={(e) => {
                                                        if (album.config.isLocked || selectedAsset.isLocked) return;
                                                        const val = parseInt(e.target.value);
                                                        const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAsset.id))?.id;
                                                        if (pageId && !isNaN(val)) updateAsset(pageId, selectedAsset.id, { fontSize: val });
                                                    }}
                                                    className="w-8 bg-transparent border-none text-[10px] font-bold text-catalog-accent focus:ring-0 text-center p-0 disabled:opacity-50"
                                                />
                                                <span className="text-[8px] text-catalog-text/40 font-bold select-none">pt</span>
                                            </div>

                                            <div className="w-[1px] h-3 bg-catalog-accent/10" />

                                            <button
                                                disabled={album.config.isLocked || selectedAsset.isLocked}
                                                onClick={() => {
                                                    if (album.config.isLocked || selectedAsset.isLocked) return;
                                                    const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAsset.id))?.id;
                                                    if (pageId) updateAsset(pageId, selectedAsset.id, { fontWeight: selectedAsset.fontWeight === 'bold' ? 'normal' : 'bold' });
                                                }}
                                                className={cn("p-1 rounded transition-colors", selectedAsset.fontWeight === 'bold' ? "text-catalog-accent bg-catalog-accent/10" : "text-catalog-text/40 hover:text-catalog-accent", (album.config.isLocked || selectedAsset.isLocked) && "opacity-50 cursor-not-allowed")}
                                            >
                                                <Bold className="w-3 h-3" />
                                            </button>

                                            <button
                                                disabled={album.config.isLocked || selectedAsset.isLocked}
                                                onClick={() => {
                                                    if (album.config.isLocked || selectedAsset.isLocked) return;
                                                    const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAsset.id))?.id;
                                                    if (pageId) updateAsset(pageId, selectedAsset.id, { textDecoration: selectedAsset.textDecoration === 'underline' ? 'none' : 'underline' } as any);
                                                }}
                                                className={cn("p-1 rounded transition-colors", selectedAsset.textDecoration === 'underline' ? "text-catalog-accent bg-catalog-accent/10" : "text-catalog-text/40 hover:text-catalog-accent", (album.config.isLocked || selectedAsset.isLocked) && "opacity-50 cursor-not-allowed")}
                                            >
                                                <Underline className="w-3 h-3" />
                                            </button>

                                            <div className={cn("relative w-4 h-4 rounded-full overflow-hidden border border-catalog-accent/20 cursor-pointer", (album.config.isLocked || selectedAsset.isLocked) && "opacity-50 cursor-not-allowed")}>
                                                <input
                                                    type="color"
                                                    disabled={album.config.isLocked || selectedAsset.isLocked}
                                                    value={selectedAsset.textColor || '#000000'}
                                                    onChange={(e) => {
                                                        if (album.config.isLocked || selectedAsset.isLocked) return;
                                                        const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAsset.id))?.id;
                                                        if (pageId) updateAsset(pageId, selectedAsset.id, { textColor: e.target.value });
                                                    }}
                                                    className="absolute inset-0 w-full h-full scale-150 cursor-pointer border-none p-0 disabled:opacity-50"
                                                />
                                            </div>
                                        </div>
                                    )}



                                    <div className="flex items-center gap-1.5 mr-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={album.config.isLocked || selectedAsset.isLocked}
                                            onClick={() => {
                                                if (album.config.isLocked || selectedAsset.isLocked) return;
                                                setEditorMode(selectedAsset.type === 'text' ? 'select' : 'mask');
                                            }}
                                            className="h-8 gap-2 hover:bg-catalog-accent/5"
                                        >
                                            <Pencil className="w-3.5 h-3.5 text-catalog-accent/60" />
                                            <span className="text-[10px] font-bold uppercase">{selectedAsset.type === 'text' ? 'Edit' : 'Crop'}</span>
                                        </Button>

                                        <div className="w-[1px] h-4 bg-catalog-accent/10 mx-1" />

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={album.config.isLocked || selectedAsset.isLocked}
                                            onClick={() => {
                                                if (album.config.isLocked || selectedAsset.isLocked) return;
                                                const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAsset.id))?.id;
                                                if (pageId) updateAssetZIndex(pageId, selectedAsset.id, 'front');
                                            }}
                                            title="Bring to Front"
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronUp className="w-4 h-4 text-catalog-accent font-bold" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={album.config.isLocked || selectedAsset.isLocked}
                                            onClick={() => {
                                                if (album.config.isLocked || selectedAsset.isLocked) return;
                                                const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAsset.id))?.id;
                                                if (pageId) updateAssetZIndex(pageId, selectedAsset.id, 'forward');
                                            }}
                                            title="Move Forward"
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5 rotate-[-90deg] text-catalog-accent/60" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={album.config.isLocked || selectedAsset.isLocked}
                                            onClick={() => {
                                                if (album.config.isLocked || selectedAsset.isLocked) return;
                                                const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAsset.id))?.id;
                                                if (pageId) updateAssetZIndex(pageId, selectedAsset.id, 'backward');
                                            }}
                                            title="Move Backward"
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronRight className="w-3.5 h-3.5 rotate-[90deg] text-catalog-accent/60" />
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={album.config.isLocked || selectedAsset.isLocked}
                                            onClick={() => {
                                                if (album.config.isLocked || selectedAsset.isLocked) return;
                                                const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAsset.id))?.id;
                                                if (pageId) updateAssetZIndex(pageId, selectedAsset.id, 'back');
                                            }}
                                            title="Send to Back"
                                            className="h-8 w-8 p-0"
                                        >
                                            <ChevronDown className="w-4 h-4 text-catalog-accent font-bold" />
                                        </Button>
                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-catalog-stone/5 rounded-md border border-catalog-accent/5 mr-1">
                                            <span className="text-[9px] font-bold text-catalog-text/40 uppercase tracking-tighter">Ratio Size</span>
                                            <input
                                                type="number"
                                                disabled={album.config.isLocked || selectedAsset.isLocked}
                                                value={Math.round(selectedAsset.width)}
                                                onChange={(e) => {
                                                    if (album.config.isLocked || selectedAsset.isLocked) return;
                                                    const val = parseFloat(e.target.value);
                                                    const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAsset.id))?.id;
                                                    if (pageId && !isNaN(val) && val > 0) {
                                                        const aspectRatio = selectedAsset.aspectRatio || (selectedAsset.width / selectedAsset.height);
                                                        updateAsset(pageId, selectedAsset.id, {
                                                            width: val,
                                                            height: val / aspectRatio
                                                        });
                                                    }
                                                }}
                                                className="w-8 bg-transparent border-none text-[10px] font-bold text-catalog-accent focus:ring-0 text-center p-0 disabled:opacity-50"
                                            />
                                            <span className="text-[8px] text-catalog-text/40 font-bold select-none">%</span>
                                        </div>

                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-catalog-stone/5 rounded-md border border-catalog-accent/5 mr-1">
                                            <span className="text-[9px] font-bold text-catalog-text/40 uppercase tracking-tighter">W</span>
                                            <input
                                                type="number"
                                                disabled={album.config.isLocked || selectedAsset.isLocked}
                                                value={Math.round(selectedAsset.width)}
                                                onChange={(e) => {
                                                    if (album.config.isLocked || selectedAsset.isLocked) return;
                                                    const val = parseFloat(e.target.value);
                                                    const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAsset.id))?.id;
                                                    if (pageId && !isNaN(val)) {
                                                        updateAsset(pageId, selectedAsset.id, { width: val });
                                                    }
                                                }}
                                                className="w-8 bg-transparent border-none text-[10px] font-bold text-catalog-accent focus:ring-0 text-center p-0 disabled:opacity-50"
                                            />
                                            <span className="text-[8px] text-catalog-text/40 font-bold select-none">%</span>
                                        </div>

                                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-catalog-stone/5 rounded-md border border-catalog-accent/5 mr-1">
                                            <span className="text-[9px] font-bold text-catalog-text/40 uppercase tracking-tighter">H</span>
                                            <input
                                                type="number"
                                                disabled={album.config.isLocked || selectedAsset.isLocked}
                                                value={Math.round(selectedAsset.height)}
                                                onChange={(e) => {
                                                    if (album.config.isLocked || selectedAsset.isLocked) return;
                                                    const val = parseFloat(e.target.value);
                                                    const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAsset.id))?.id;
                                                    if (pageId && !isNaN(val)) {
                                                        updateAsset(pageId, selectedAsset.id, { height: val });
                                                    }
                                                }}
                                                className="w-8 bg-transparent border-none text-[10px] font-bold text-catalog-accent focus:ring-0 text-center p-0 disabled:opacity-50"
                                            />
                                            <span className="text-[8px] text-catalog-text/40 font-bold select-none">%</span>
                                        </div>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={album.config.isLocked}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (album.config.isLocked) return;
                                                const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAsset.id))?.id;
                                                if (pageId) {
                                                    updateAsset(pageId, selectedAsset.id, { isLocked: !selectedAsset.isLocked });
                                                }
                                            }}
                                            className={cn("h-8 gap-2", selectedAsset.isLocked ? "bg-orange-50 text-orange-600 border-orange-200" : "text-catalog-accent/60")}
                                            title={selectedAsset.isLocked ? "Unlock Element" : "Lock Element"}
                                        >
                                            {selectedAsset.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                                            <span className="text-[10px] font-bold uppercase">{selectedAsset.isLocked ? 'Unlock' : 'Lock'}</span>
                                        </Button>

                                        <div className="w-[1px] h-4 bg-catalog-accent/10 mx-1" />

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={album.config.isLocked || selectedAsset.isLocked}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (album.config.isLocked) return;
                                                const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAsset.id))?.id;
                                                if (pageId) {
                                                    duplicateAsset(pageId, selectedAsset.id);
                                                }
                                            }}
                                            title="Duplicate Asset"
                                            className="h-8 gap-2"
                                        >
                                            <Copy className="w-3.5 h-3.5 text-catalog-accent/60" />
                                            <span className="text-[10px] font-bold">DUPLICATE</span>
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={album.config.isLocked || selectedAsset.isLocked}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (album.config.isLocked) return;
                                                const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAsset.id))?.id;
                                                if (pageId) {
                                                    // Calculate Fit logic
                                                    const pageW = album.config.dimensions.width;
                                                    const pageH = album.config.dimensions.height;
                                                    const assetRatio = selectedAsset.aspectRatio ||
                                                        (selectedAsset.originalDimensions ? selectedAsset.originalDimensions.width / selectedAsset.originalDimensions.height :
                                                            (selectedAsset.width / selectedAsset.height));

                                                    const newHeight = (100 * pageW) / (pageH * assetRatio);

                                                    updateAsset(pageId, selectedAsset.id, {
                                                        x: 0,
                                                        y: 0,
                                                        width: 100,
                                                        height: newHeight,
                                                        rotation: 0
                                                    });
                                                }
                                            }}
                                            title="Fit to Page Width (Cover)"
                                            className="h-8 gap-2"
                                        >
                                            <Maximize className="w-3.5 h-3.5 text-catalog-accent/60" />
                                            <span className="text-[10px] font-bold">FIT</span>
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            disabled={album.config.isLocked || selectedAsset.isLocked}
                                            className="h-8 text-red-400 hover:text-red-500 hover:bg-red-50 gap-2 border border-transparent hover:border-red-100 disabled:opacity-30"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (album.config.isLocked || selectedAsset.isLocked) return;
                                                const pageId = album.pages.find(p => p.assets.some(a => a.id === selectedAsset.id))?.id;
                                                if (pageId) {
                                                    removeAsset(pageId, selectedAsset.id);
                                                    setSelectedAssetId(null);
                                                }
                                            }} title="Delete"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            <span className="text-[10px] font-bold uppercase">Delete</span>
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-catalog-text/30 italic animate-in fade-in duration-500">
                                    <Layers className="w-3.5 h-3.5" />
                                    <span className="text-[10px] uppercase tracking-widest font-bold">Select an element to edit</span>
                                </div>
                            )}
                        </div>

                        {/* Right side of bar could have page navigation or zoom info if needed, or just be empty */}
                        <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-catalog-stone/5 rounded-full border border-catalog-accent/5">
                                <span className="text-[9px] font-bold text-catalog-accent/40 uppercase tracking-tighter">Zoom</span>
                                <span className="text-[10px] font-mono font-bold text-catalog-accent">{Math.round(zoom * 100)}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 relative flex flex-col items-center justify-center bg-catalog-stone/5 p-8 overflow-hidden cursor-grab active:cursor-grabbing">
                        {/* Panning Container */}
                        <div style={{ transform: `translate(${pan.x}px, ${pan.y}px)`, transition: 'transform 0.1s ease-out' }} className="flex items-center justify-center w-full h-full">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={currentPageIndex}
                                    style={{ scale: zoom, originX: 0.5, originY: 0.5 }}
                                    initial={{ x: navigationDirection === 'next' ? 50 : -50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    exit={{ x: navigationDirection === 'next' ? -50 : 50, opacity: 0 }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                    className={cn(
                                        "relative flex transition-all duration-500",
                                        album.config.useSpreadView ? "gap-0" : "gap-8"
                                    )}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    {(() => {
                                        const spread = getSpread(currentPageIndex);
                                        const isSpreadView = album.config.useSpreadView;

                                        if (isSpreadView && spread.length > 1) {
                                            // Unified Spread View: One canvas for both pages or placeholder
                                            return (
                                                <div className="relative shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-white rounded-sm select-none">
                                                    <EditorCanvas
                                                        page={spread[0]}
                                                        nextPage={spread[1]}
                                                        side="left" // Signifies this is the start of a spread
                                                        showPrintSafe={showPrintSafe}
                                                        zoom={zoom}
                                                        onPageSelect={setActivePageId}
                                                        onOpenMapEditor={handleOpenMapEditor}
                                                        onOpenLocationEditor={handleOpenLocationEditor}
                                                    />
                                                    {/* Gutter Guide */}
                                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-full z-10 pointer-events-none flex">
                                                        <div className="flex-1 bg-gradient-to-r from-black/10 to-transparent" />
                                                        <div className="flex-1 bg-gradient-to-l from-black/10 to-transparent" />
                                                    </div>
                                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1px] h-full bg-black/5 z-20 pointer-events-none" />
                                                </div>
                                            );
                                        }

                                        // Single Page View
                                        return spread.map((page) => {
                                            // Covers are always treated as 'single' when they appear alone
                                            const side: 'left' | 'right' | 'single' = 'single';

                                            return (
                                                <div
                                                    key={page.id}
                                                    className="relative shadow-[0_20px_50px_rgba(0,0,0,0.3)] bg-white rounded-sm"
                                                >
                                                    <EditorCanvas
                                                        page={page}
                                                        side={side}
                                                        showPrintSafe={showPrintSafe}
                                                        zoom={zoom}
                                                        onPageSelect={setActivePageId}
                                                        onOpenMapEditor={handleOpenMapEditor}
                                                        onOpenLocationEditor={handleOpenLocationEditor}
                                                    />
                                                </div>
                                            );
                                        });
                                    })()}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                        {/* Navigation Arrows */}
                        <div className="absolute inset-x-8 bottom-6 flex justify-between pointer-events-none z-50">
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-10 h-10 rounded-full bg-white/50 backdrop-blur-md shadow-xl pointer-events-auto border border-white/50 hover:bg-white hover:scale-110 transition-all",
                                    currentPageIndex === 0 && "opacity-0 pointer-events-none"
                                )}
                                onClick={() => {
                                    // If we are moving back FROM a spread start, we might need a step of 2
                                    // But it's easier to check the PREVIOUS spread
                                    const prevPageIndex = Math.max(0, currentPageIndex - 1);
                                    const prevSpread = getSpread(prevPageIndex);
                                    const step = (album.config.useSpreadView && prevSpread.length > 1) ? 2 : 1;

                                    setNavigationDirection('prev');
                                    setCurrentPageIndex(Math.max(0, currentPageIndex - step));
                                }}
                            >
                                <ChevronLeft className="w-6 h-6 text-catalog-accent" />
                            </Button>
                            <Button
                                variant="ghost"
                                className={cn(
                                    "w-10 h-10 rounded-full bg-white/50 backdrop-blur-md shadow-xl pointer-events-auto border border-white/50 hover:bg-white hover:scale-110 transition-all",
                                    currentPageIndex >= album.pages.length - 1 && "opacity-0 pointer-events-none"
                                )}
                                onClick={() => {
                                    const spread = getSpread(currentPageIndex);
                                    const step = (album.config.useSpreadView && spread.length > 1) ? 2 : 1;

                                    setNavigationDirection('next');
                                    setCurrentPageIndex(Math.min(album.pages.length - 1, currentPageIndex + step));
                                }}
                            >
                                <ChevronRight className="w-6 h-6 text-catalog-accent" />
                            </Button>
                        </div>
                    </div>
                </main>

                {/* Right Sidebar: Properties & Layouts */}
                <aside className="w-64 flex flex-col border-l border-catalog-accent/10 bg-white">
                    <div className="flex border-b border-catalog-accent/10">
                        {['layouts', 'properties', 'layers'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveSidebarTab(tab as any)}
                                className={cn(
                                    "flex-1 py-3 text-[10px] font-bold uppercase tracking-widest transition-colors flex flex-col items-center gap-1",
                                    activeSidebarTab === tab
                                        ? "text-catalog-accent border-b-2 border-catalog-accent bg-catalog-accent/5"
                                        : "text-catalog-text/40 hover:text-catalog-text"
                                )}
                            >
                                <span className="capitalize">{tab}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-hidden">
                        {activeSidebarTab === 'properties' && (
                            <AssetControlPanel
                                editorMode={editorMode}
                                setEditorMode={setEditorMode}
                            />
                        )}
                        {activeSidebarTab === 'layers' && <LayersPanel activePageId={activePageId} />}
                        {activeSidebarTab === 'layouts' && <LayoutSidebar activePageId={activePageId || ''} />}
                    </div>
                </aside>
            </div>

            {/* Filmstrip */}
            <Filmstrip />

            {/* Preview Modal */}
            <AnimatePresence>
                {
                    showPreview && (
                        <FlipbookViewer
                            pages={album.pages}
                            album={album}
                            onClose={() => setShowPreview(false)}
                        />
                    )
                }
            </AnimatePresence>

            {/* Advanced Mask Modal */}
            {
                editorMode === 'mask' && selectedAsset && activePage && (
                    <MaskEditorModal
                        asset={selectedAsset}
                        pageId={activePage.id}
                        updateAsset={updateAsset}
                        onClose={() => setEditorMode('select')}
                    />
                )
            }

            {/* Pro Image Studio Modal */}
            {
                editorMode === 'studio' && selectedAsset && activePage && (
                    <ImageEditorModal
                        asset={selectedAsset}
                        pageId={activePage.id}
                        updateAsset={updateAsset}
                        onClose={() => setEditorMode('select')}
                    />
                )
            }

            {/* Location Picker Modal */}
            <LocationPickerModal
                isOpen={showLocationModal}
                onClose={() => setShowLocationModal(false)}
                onSelect={(address, lat, lng) => {
                    const targetPageId = activePageId || album.pages[currentPageIndex]?.id;
                    if (targetPageId) {
                        const existingAsset = selectedAsset?.type === 'location' ? selectedAsset : null;
                        if (existingAsset) {
                            updateAsset(targetPageId, existingAsset.id, {
                                content: address,
                                lat,
                                lng
                            });
                        } else {
                            addAsset(targetPageId, {
                                type: 'location',
                                content: address,
                                x: 30,
                                y: 85,
                                width: 40,
                                height: 8,
                                rotation: 0,
                                zIndex: 25,
                                lat,
                                lng,
                                fontFamily: 'Inter',
                                fontSize: 14,
                                fontWeight: 'normal',
                                textAlign: 'left',
                                textColor: '#6b7280'
                            } as any);
                        }
                    }
                    setShowLocationModal(false);
                }}
            />

            <MapAssetModal
                isOpen={showMapModal}
                onClose={() => setShowMapModal(false)}
                existingLocations={album?.pages.flatMap(p => p.assets) || []}
                initialConfig={selectedAsset?.type === 'map' ? selectedAsset.mapConfig : undefined}
                onAddSnapshot={async (dataUrl) => {
                    const targetPageId = activePageId || album.pages[currentPageIndex]?.id;
                    if (targetPageId && album.family_id) {
                        try {
                            const res = await fetch(dataUrl);
                            const blob = await res.blob();
                            const file = new File([blob], `map-snapshot-${Date.now()}.png`, { type: 'image/png' });

                            // Dynamic import to use storage service
                            const { storageService } = await import('../services/storage');
                            const { url, error } = await storageService.uploadFile(
                                file,
                                'album-assets',
                                `maps/${file.name}`,
                                () => { }
                            );

                            if (url) {
                                // Add to family_media table
                                const { error: dbError } = await supabase.from('family_media').insert({
                                    family_id: album.family_id,
                                    url: url,
                                    type: 'image',
                                    filename: file.name,
                                    folder: 'Map Snapshots', // Dedicated folder
                                    size: file.size,
                                    mime_type: file.type
                                } as any);

                                if (dbError) throw dbError;

                                // Optionally add to the page
                                // Note: uploadMedia logic in context usually handles this, but here we did it manually
                                // so we could specify the folder and effectively "place" it if we wanted.
                                // For now, we'll just add it to library as requested, but also placing it on the page is nice.
                            } else {
                                console.error('Failed to upload map snapshot:', error);
                            }
                        } catch (e) {
                            console.error("Failed to process map snapshot", e);
                        }
                    }
                    setShowMapModal(false);
                }}
                onAddMap={(center, zoom, places) => {
                    const targetPageId = activePageId || album.pages[currentPageIndex]?.id;
                    if (targetPageId) {
                        const existingAsset = selectedAsset?.type === 'map' ? selectedAsset : null;
                        if (existingAsset) {
                            updateAsset(targetPageId, existingAsset.id, {
                                mapConfig: { center, zoom, places }
                            });
                        } else {
                            addAsset(targetPageId, {
                                type: 'map',
                                url: '',
                                x: 10,
                                y: 10,
                                width: 80,
                                height: 60,
                                rotation: 0,
                                zIndex: 30,
                                mapConfig: { center, zoom, places }
                            } as any);
                        }
                    }
                    setShowMapModal(false);
                }}
            />

            {/* Pro Text Editor Modal (Pop-out) */}
            {proTextAssetId && (
                <TextEditorModal
                    isOpen={true}
                    onClose={() => setProTextAssetId(null)}
                    initialContent={(() => {
                        const pId = activePageId || album.pages[currentPageIndex]?.id;
                        const asset = album.pages.find(p => p.id === pId)?.assets.find(a => a.id === proTextAssetId);
                        return asset?.content || '';
                    })()}
                    onSave={(newContent) => {
                        const pId = activePageId || album.pages[currentPageIndex]?.id;
                        if (pId && proTextAssetId) {
                            updateAsset(pId, proTextAssetId, { content: newContent });
                        }
                    }}
                />
            )}

            {showCoverPicker && (
                <MediaPickerModal
                    isOpen={showCoverPicker}
                    onClose={() => setShowCoverPicker(false)}
                    onSelect={(item) => {
                        if (album) {
                            setAlbum({ ...album, coverUrl: item.url });
                        }
                        setShowCoverPicker(false);
                    }}
                    allowedTypes={['image']}
                />
            )}


        </div>
    );
}

export function AlbumEditor() {
    return <AlbumEditorContent />;
}

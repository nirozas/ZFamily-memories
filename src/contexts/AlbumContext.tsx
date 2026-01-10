import React, { createContext, useContext, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface Asset {
    id: string;
    type: 'image' | 'video' | 'ribbon' | 'frame' | 'text' | 'sticker' | 'shape';
    url: string;
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scale?: number;
    zIndex: number;
    slotId?: number;

    // Transform
    flipX?: boolean;
    flipY?: boolean;
    opacity?: number;
    aspectRatio?: number;
    lockAspectRatio?: boolean;
    pivot?: { x: number; y: number }; // Relative focal point (0-1) for scaling/rotation

    // Clipping / Masking
    clipPoints?: {
        x: number;
        y: number;
        c1x?: number; // Control point 1 x
        c1y?: number; // Control point 1 y
        c2x?: number; // Control point 2 x
        c2y?: number; // Control point 2 y
        type: 'linear' | 'bezier';
    }[];

    // Smart Frames & Placeholders
    isPlaceholder?: boolean;
    fitMode?: 'fit' | 'fill' | 'original' | 'cover' | 'stretch';
    originalDimensions?: { width: number; height: number };

    // Visual Adjustments
    filter?: string;
    filterIntensity?: number;
    brightness?: number;
    contrast?: number;
    saturate?: number;
    hue?: number;
    sepia?: number;
    blur?: number;
    exposure?: number;
    highlights?: number;
    shadows?: number;
    warmth?: number;
    sharpness?: number;

    // Text Properties
    content?: string;
    fontFamily?: string;
    fontSize?: number;
    fontWeight?: string | number;
    lineHeight?: number;
    letterSpacing?: number;
    textAlign?: 'left' | 'center' | 'right' | 'justify';
    textDecoration?: 'none' | 'underline' | 'line-through';
    textColor?: string;
    textBackgroundColor?: string;
    textShadow?: string;
    color?: string; // Unified color property

    // Borders & Appearance
    borderRadius?: number;
    borderColor?: string;
    borderWidth?: number;

    // AI Effects
    isRemovingBackground?: boolean;
    aiEffect?: string;
    aiEffectReference?: string;

    // Crop
    crop?: {
        x: number;
        y: number;
        width: number;
        height: number;
        zoom: number;
    };

    // Layer Management
    id_name?: string;
    isLocked?: boolean;
    isHidden?: boolean;
    isStamp?: boolean;
    category?: string;
}

export interface AlbumConfig {
    dimensions: {
        width: number;
        height: number;
        unit: 'px' | 'in' | 'cm';
        bleed: number;
        gutter: number;
    };
    useSpreadView: boolean;
    gridSettings: {
        size: number;
        snap: boolean;
        visible: boolean;
    };
    styleSync?: boolean;
    isLocked?: boolean;
}

export interface Page {
    id: string;
    pageNumber: number;
    layoutTemplate: string;
    assets: Asset[];
    backgroundColor: string;
    backgroundOpacity?: number;
    backgroundImage?: string;
    name?: string;
}

export interface Album {
    id: string;
    family_id: string;
    title: string;
    description?: string;
    category?: string;
    coverUrl?: string;
    pages: Page[];
    unplacedMedia: Asset[];
    hashtags: string[];
    config: AlbumConfig;
    createdAt: Date;
    updatedAt: Date;
    isPublished: boolean;
    location?: string;
    country?: string;
    geotag?: { lat: number; lng: number };
}

interface AlbumContextType {
    album: Album | null;
    currentPageIndex: number;
    selectedAssetId: string | null;
    setAlbum: (album: Album) => void;
    setCurrentPageIndex: (index: number) => void;
    setSelectedAssetId: (id: string | null) => void;
    addPage: (template?: Page['layoutTemplate']) => void;
    removePage: (pageId: string) => void;
    updatePage: (pageId: string, updates: Partial<Page>) => void;
    addAsset: (pageId: string, asset: Omit<Asset, 'id'>) => void;
    updateAsset: (pageId: string, assetId: string, updates: Partial<Asset>) => void;
    removeAsset: (pageId: string, assetId: string) => void;
    duplicateAsset: (pageId: string, assetId: string) => void;
    updateAssetZIndex: (pageId: string, assetId: string, direction: 'front' | 'back') => void;
    uploadMedia: (files: File[], category?: string) => Promise<void>;
    addMediaByUrl: (url: string, type: 'image' | 'video', category?: string) => void;
    applyLayout: (pageId: string, template: Page['layoutTemplate']) => void;
    moveFromLibrary: (assetId: string, pageId: string) => void;
    duplicatePage: (pageId: string) => void;
    movePage: (pageId: string, direction: 'left' | 'right') => void;
    reorderPages: (fromIndex: number, toIndex: number) => void;
    saveAlbum: () => Promise<{ success: boolean; error?: string }>;
    toggleLock: () => Promise<void>;
    fetchAlbum: (albumId: string) => Promise<{ success: boolean; error?: string }>;
    updateConfig: (updates: Partial<AlbumConfig>) => void;
    toggleSpreadView: () => void;
    getSpread: (pageIndex: number) => Page[];
    syncStyles: (sourceAsset?: Asset) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    isSaving: boolean;
    isLoading: boolean;
    uploadProgress: Record<string, number>;
    updatePageAssets: (pageId: string, assets: Asset[]) => void;
    moveAssetToPage: (assetId: string, fromPageId: string, toPageId: string, newX: number, newY: number) => void;
}

const AlbumContext = createContext<AlbumContextType | undefined>(undefined);

function generateId() {
    return crypto.randomUUID();
}

const DEFAULT_CONFIG: AlbumConfig = {
    dimensions: {
        width: 1000,
        height: 700,
        unit: 'px',
        bleed: 25,
        gutter: 40,
    },
    useSpreadView: true,
    gridSettings: {
        size: 20,
        snap: true,
        visible: false,
    }
};

export function AlbumProvider({ children }: { children: React.ReactNode }) {
    const [album, setAlbumInternal] = useState<Album | null>(null);
    const [history, setHistory] = useState<Album[]>([]);
    const [redoStack, setRedoStack] = useState<Album[]>([]);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

    const setAlbum = useCallback((newAlbum: Album | null | ((prev: Album | null) => Album | null)) => {
        setAlbumInternal(prev => {
            const resolved = typeof newAlbum === 'function' ? newAlbum(prev) : newAlbum;
            if (prev && resolved && prev !== resolved) {
                setHistory(h => [...h.slice(-19), prev]); // Limit to 20 states
                setRedoStack([]);
            }
            return resolved;
        });
    }, []);

    const undo = useCallback(() => {
        setHistory(h => {
            if (h.length === 0) return h;
            const previous = h[h.length - 1];
            setAlbumInternal(current => {
                if (current) setRedoStack(r => [...r, current]);
                return previous;
            });
            return h.slice(0, -1);
        });
    }, []);

    const redo = useCallback(() => {
        setRedoStack(r => {
            if (r.length === 0) return r;
            const next = r[r.length - 1];
            setAlbumInternal(current => {
                if (current) setHistory(h => [...h, current]);
                return next;
            });
            return r.slice(0, -1);
        });
    }, []);

    const addPage = useCallback((template: Page['layoutTemplate'] = 'freeform') => {
        if (!album || album.config.isLocked) return;

        // Find back cover index
        const backCoverIndex = album.pages.findIndex(p => p.layoutTemplate === 'cover-back');
        const insertIndex = backCoverIndex !== -1 ? backCoverIndex : album.pages.length;

        const newPage1: Page = {
            id: generateId(),
            pageNumber: insertIndex + 1,
            layoutTemplate: template,
            assets: [],
            backgroundColor: '#ffffff',
        };
        const newPage2: Page = {
            id: generateId(),
            pageNumber: insertIndex + 2,
            layoutTemplate: template,
            assets: [],
            backgroundColor: '#ffffff',
        };

        const newPages = [...album.pages];
        newPages.splice(insertIndex, 0, newPage1, newPage2);

        setAlbum({
            ...album,
            pages: newPages.map((p, i) => ({ ...p, pageNumber: i + 1 })),
            updatedAt: new Date(),
        });
        setCurrentPageIndex(insertIndex);
    }, [album]);

    const removePage = useCallback((pageId: string) => {
        if (!album || album.pages.length <= 1 || album.config.isLocked) return;
        const newPages = album.pages.filter(p => p.id !== pageId);
        setAlbum({
            ...album,
            pages: newPages.map((p, i) => ({ ...p, pageNumber: i + 1 })),
            updatedAt: new Date(),
        });
        setCurrentPageIndex(Math.max(0, currentPageIndex - 1));
    }, [album, currentPageIndex]);

    const updatePage = useCallback((pageId: string, updates: Partial<Page>) => {
        if (!album || album.config.isLocked) return;
        setAlbum({
            ...album,
            pages: album.pages.map(p => p.id === pageId ? { ...p, ...updates } : p),
            updatedAt: new Date(),
        });
    }, [album]);

    const addAsset = useCallback((pageId: string, asset: Omit<Asset, 'id'>) => {
        if (!album || album.config.isLocked) return;
        const newAsset: Asset = { ...asset, id: generateId() };
        setAlbum({
            ...album,
            pages: album.pages.map(p =>
                p.id === pageId ? { ...p, assets: [...p.assets, newAsset] } : p
            ),
            updatedAt: new Date(),
        });
        setSelectedAssetId(newAsset.id);
    }, [album]);

    const updateAsset = useCallback((pageId: string, assetId: string, updates: Partial<Asset>) => {
        if (!album || album.config.isLocked) return;
        setAlbum({
            ...album,
            pages: album.pages.map(p =>
                p.id === pageId
                    ? { ...p, assets: p.assets.map(a => a.id === assetId ? { ...a, ...updates } : a) }
                    : p
            ),
            updatedAt: new Date(),
        });
    }, [album]);

    const removeAsset = useCallback((pageId: string, assetId: string) => {
        if (!album || album.config.isLocked) return;
        setAlbum({
            ...album,
            pages: album.pages.map(p =>
                p.id === pageId ? { ...p, assets: p.assets.filter(a => a.id !== assetId) } : p
            ),
            updatedAt: new Date(),
        });
        if (selectedAssetId === assetId) setSelectedAssetId(null);
    }, [album, selectedAssetId]);

    const duplicateAsset = useCallback((pageId: string, assetId: string) => {
        if (!album || album.config.isLocked) return;
        const page = album.pages.find(p => p.id === pageId);
        const sourceAsset = page?.assets.find(a => a.id === assetId);
        if (!sourceAsset) return;

        const newAsset: Asset = {
            ...sourceAsset,
            id: generateId(),
            x: sourceAsset.x + 20, // Offset slightly
            y: sourceAsset.y + 20,
            zIndex: (sourceAsset.zIndex || 0) + 1
        };

        setAlbum({
            ...album,
            pages: album.pages.map(p =>
                p.id === pageId ? { ...p, assets: [...p.assets, newAsset] } : p
            ),
            updatedAt: new Date(),
        });
        setSelectedAssetId(newAsset.id);
    }, [album]);

    const updateAssetZIndex = useCallback((pageId: string, assetId: string, direction: 'front' | 'back') => {
        if (!album || album.config.isLocked) return;

        const page = album.pages.find(p => p.id === pageId);
        if (!page) return;

        const asset = page.assets.find(a => a.id === assetId);
        if (!asset) return;

        const maxZ = Math.max(...page.assets.map(a => a.zIndex), 0);
        const minZ = Math.min(...page.assets.map(a => a.zIndex), 0);

        const newZIndex = direction === 'front' ? maxZ + 1 : minZ - 1;
        updateAsset(pageId, assetId, { zIndex: newZIndex });
    }, [album, updateAsset]);

    const uploadMedia = useCallback(async (files: File[], category: string = 'general') => {
        if (!album || album.config.isLocked) return;
        const { storageService } = await import('../services/storage');
        const { supabase } = await import('../lib/supabase');
        const { mediaService } = await import('../services/mediaService');

        setIsSaving(true);
        try {
            const uploadedAssets: Asset[] = [];
            for (const file of files) {
                let fileToUpload = file;

                // Apply compression for images and videos to keep within 50MB and improve performance
                // Quality threshold: > 2MB for images, > 5MB for videos
                try {
                    if (file.type.startsWith('image/') && file.size > 2 * 1024 * 1024) {
                        fileToUpload = await mediaService.compressImage(file);
                    } else if (file.type.startsWith('video/') && file.size > 5 * 1024 * 1024) {
                        fileToUpload = await mediaService.compressVideo(file, (p) => {
                            setUploadProgress(prev => ({
                                ...prev,
                                [file.name]: Math.round(p * 100)
                            }));
                        });
                        // Reset progress for the actual upload after compression
                        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
                    }
                } catch (err) {
                    console.warn(`Compression failed for ${file.name}, attempting original upload:`, err);
                    fileToUpload = file;
                }

                const { url, error } = await storageService.uploadFile(
                    fileToUpload,
                    'album-assets',
                    `albums/${album.title}/`,
                    (progress) => {
                        const percent = Math.round((progress.loaded / progress.total) * 100);
                        setUploadProgress(prev => ({
                            ...prev,
                            [file.name]: percent
                        }));
                    }
                );
                if (url) {
                    // Load image to get dimensions
                    let dimensions = { width: 400, height: 300 };
                    let originalDimensions = { width: 400, height: 300 };
                    let aspectRatio = 4 / 3;

                    if (fileToUpload.type.startsWith('image/')) {
                        const img = new Image();
                        img.src = url;
                        await new Promise((resolve) => {
                            img.onload = () => {
                                // For the standard image (unplaced)
                                originalDimensions = { width: img.width, height: img.height };
                                aspectRatio = img.width / img.height;

                                // Initial placement size: scale down while preserving ratio
                                const maxDim = 600;
                                if (img.width > img.height) {
                                    dimensions = { width: maxDim, height: maxDim / aspectRatio };
                                } else {
                                    dimensions = { width: maxDim * aspectRatio, height: maxDim };
                                }
                                resolve(null);
                            };
                        });
                    }

                    uploadedAssets.push({
                        id: generateId(),
                        type: fileToUpload.type.startsWith('video/') ? 'video' : 'image',
                        url,
                        x: 0,
                        y: 0,
                        ...dimensions,
                        originalDimensions,
                        aspectRatio,
                        lockAspectRatio: true,
                        rotation: 0,
                        zIndex: 1,
                        pivot: { x: 0.5, y: 0.5 }, // Default to center
                    });

                    if (album.family_id) {
                        const { error: dbError } = await supabase
                            .from('family_media')
                            .insert({
                                family_id: album.family_id,
                                url: url,
                                type: fileToUpload.type.startsWith('video/') ? 'video' : 'image',
                                category: category,
                                folder: album.title,
                                filename: fileToUpload.name,
                                size: fileToUpload.size,
                                uploaded_by: (await supabase.auth.getUser()).data.user?.id
                            } as any);
                        if (dbError) console.error('Error logging to family_media:', dbError);
                    }

                } else if (error) {
                    console.error('Upload error for file:', file.name, error);
                }
            }

            setAlbum(prev => prev ? {
                ...prev,
                unplacedMedia: [...prev.unplacedMedia, ...uploadedAssets],
                updatedAt: new Date(),
            } : null);

            // Clear progress after short delay
            setTimeout(() => {
                setUploadProgress({});
            }, 2000);
        } catch (error) {
            console.error('Bulk upload failed:', error);
        } finally {
            setIsSaving(false);
        }
    }, [album]);

    const addMediaByUrl = useCallback(async (url: string, type: 'image' | 'video', category: string = 'general') => {
        if (!album || album.config.isLocked) return;

        const newAsset: Asset = {
            id: generateId(),
            type,
            url,
            x: 0,
            y: 0,
            width: 400,
            height: 300,
            rotation: 0,
            zIndex: 1,
        };
        setAlbum(prev => prev ? {
            ...prev,
            unplacedMedia: [...prev.unplacedMedia, newAsset],
            updatedAt: new Date(),
        } : null);

        if (album.family_id) {
            const { supabase } = await import('../lib/supabase');
            const { error: dbError } = await supabase
                .from('family_media')
                .insert({
                    family_id: album.family_id,
                    url: url,
                    type: type,
                    category: category,
                    filename: 'URL Asset',
                    uploaded_by: (await supabase.auth.getUser()).data.user?.id
                } as any);
            if (dbError) console.error('Error logging to family_media:', dbError);
        }
    }, [album]);

    const moveFromLibrary = useCallback((assetId: string, pageId: string) => {
        if (!album || album.config.isLocked) return;
        const asset = album.unplacedMedia.find(a => a.id === assetId);
        if (!asset) return;

        setAlbum({
            ...album,
            unplacedMedia: album.unplacedMedia.filter(a => a.id !== assetId),
            pages: album.pages.map(p => p.id === pageId ? {
                ...p,
                assets: [...p.assets, { ...asset, x: 50, y: 50 }]
            } : p),
            updatedAt: new Date(),
        });
    }, [album]);

    const applyLayout = useCallback((pageId: string, template: Page['layoutTemplate']) => {
        if (!album || album.config.isLocked) return;
        setAlbum({
            ...album,
            pages: album.pages.map(p => p.id === pageId ? { ...p, layoutTemplate: template } : p),
            updatedAt: new Date(),
        });
    }, [album]);

    const duplicatePage = useCallback((pageId: string) => {
        if (!album || album.config.isLocked) return;
        const pageToDuplicate = album.pages.find(p => p.id === pageId);
        if (!pageToDuplicate) return;

        const newPage: Page = {
            ...pageToDuplicate,
            id: generateId(),
            pageNumber: album.pages.length + 1,
            assets: pageToDuplicate.assets.map(asset => ({ ...asset, id: generateId() }))
        };

        const pageIndex = album.pages.findIndex(p => p.id === pageId);
        const newPages = [...album.pages];
        newPages.splice(pageIndex + 1, 0, newPage);

        setAlbum({
            ...album,
            pages: newPages.map((p, i) => ({ ...p, pageNumber: i + 1 })),
            updatedAt: new Date(),
        });
        setCurrentPageIndex(pageIndex + 1);
    }, [album]);

    const movePage = useCallback((pageId: string, direction: 'left' | 'right') => {
        if (!album || album.config.isLocked) return;
        const currentIndex = album.pages.findIndex(p => p.id === pageId);
        if (currentIndex === -1) return;

        // Front cover (0) and Back cover (last) cannot be moved manually
        if (currentIndex === 0 || currentIndex === album.pages.length - 1) return;

        const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;

        // Cannot move into front cover slot (0) or back cover slot
        if (newIndex <= 0 || newIndex >= album.pages.length - 1) return;

        const newPages = [...album.pages];
        const [movedPage] = newPages.splice(currentIndex, 1);
        newPages.splice(newIndex, 0, movedPage);

        setAlbum({
            ...album,
            pages: newPages.map((p, i) => ({ ...p, pageNumber: i + 1 })),
            updatedAt: new Date(),
        });
        setCurrentPageIndex(newIndex);
    }, [album]);

    const reorderPages = useCallback((fromIndex: number, toIndex: number) => {
        if (!album || album.config.isLocked) return;

        // Prevent moving covers
        if (fromIndex === 0 || fromIndex === album.pages.length - 1) return;

        // Prevent moving into cover slots
        let safeToIndex = toIndex;
        if (safeToIndex <= 0) safeToIndex = 1;
        if (safeToIndex >= album.pages.length - 1) safeToIndex = album.pages.length - 2;

        const pages = [...album.pages];
        const [movedPage] = pages.splice(fromIndex, 1);
        pages.splice(safeToIndex, 0, movedPage);

        setAlbum({
            ...album,
            pages: pages.map((p, i) => ({ ...p, pageNumber: i + 1 })),
            updatedAt: new Date(),
        });
    }, [album]);

    const updateConfig = useCallback((updates: Partial<AlbumConfig>) => {
        if (!album || album.config.isLocked) return;
        setAlbum({
            ...album,
            config: { ...album.config, ...updates },
            updatedAt: new Date(),
        });
    }, [album]);

    const updatePageAssets = useCallback((pageId: string, newAssets: Asset[]) => {
        setAlbum(prev => {
            if (!prev || prev.config.isLocked) return prev;
            return {
                ...prev,
                pages: prev.pages.map(p => p.id === pageId ? { ...p, assets: newAssets } : p),
                updatedAt: new Date(),
            };
        });
    }, [setAlbum]);

    const moveAssetToPage = useCallback((assetId: string, fromPageId: string, toPageId: string, newX: number, newY: number) => {
        setAlbum(prev => {
            if (!prev || prev.config.isLocked) return prev;
            const fromPage = prev.pages.find(p => p.id === fromPageId);
            const asset = fromPage?.assets.find(a => a.id === assetId);
            if (!asset) return prev;

            return {
                ...prev,
                pages: prev.pages.map(p => {
                    if (p.id === fromPageId) {
                        return { ...p, assets: p.assets.filter(a => a.id !== assetId) };
                    }
                    if (p.id === toPageId) {
                        return { ...p, assets: [...p.assets, { ...asset, x: newX, y: newY }] };
                    }
                    return p;
                }),
                updatedAt: new Date(),
            };
        });
    }, [setAlbum]);

    const toggleSpreadView = useCallback(() => {
        if (!album) return;
        updateConfig({ useSpreadView: !album.config.useSpreadView });
    }, [album, updateConfig]);

    const syncStyles = useCallback((sourceAsset?: Asset) => {
        if (!album || album.config.isLocked) return;

        let targetStyles: Partial<Asset> = {};
        if (sourceAsset) {
            // If syncing from a specific asset, take its key visual properties
            targetStyles = {
                borderRadius: sourceAsset.borderRadius,
                borderColor: sourceAsset.borderColor,
                borderWidth: sourceAsset.borderWidth,
                filter: sourceAsset.filter,
                filterIntensity: sourceAsset.filterIntensity,
                fontFamily: sourceAsset.fontFamily,
                fontSize: sourceAsset.fontSize,
                fontWeight: sourceAsset.fontWeight,
                color: sourceAsset.color,
                opacity: sourceAsset.opacity
            };
        }

        setAlbum(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                pages: prev.pages.map(p => ({
                    ...p,
                    assets: p.assets.map(a => {
                        // Apply to matching types (text or image)
                        if (a.type === sourceAsset?.type) {
                            return { ...a, ...targetStyles };
                        }
                        return a;
                    })
                })),
                updatedAt: new Date(),
            };
        });
    }, [album]);

    const getSpread = useCallback((pageIndex: number): Page[] => {
        if (!album) return [];
        const page = album.pages[pageIndex];
        if (!page) return [];

        if (!album.config.useSpreadView) return [page];

        // Cover is always single
        if (page.layoutTemplate === 'cover-front') return [page];
        if (page.layoutTemplate === 'cover-back') return [page];

        // Ensure we always return the same pair for both page indices in a spread
        // The first internal page (index 1) starts the first spread
        // Even index (2, 4, 6...) is the "right" page of a spread
        // Odd index (1, 3, 5...) is the "left" page of a spread
        const isLeftIdx = pageIndex % 2 === 1;

        if (isLeftIdx) {
            const nextPage = album.pages[pageIndex + 1];
            // Only pair if next isn't cover-back
            return (nextPage && nextPage.layoutTemplate !== 'cover-back') ? [page, nextPage] : [page];
        } else {
            const prevPage = album.pages[pageIndex - 1];
            // Only pair if prev isn't cover-front
            return (prevPage && prevPage.layoutTemplate !== 'cover-front') ? [prevPage, page] : [page];
        }
    }, [album]);

    const fetchAlbum = useCallback(async (albumId: string) => {
        setIsLoading(true);
        try {
            const { supabase } = await import('../lib/supabase');
            const { data: albumData, error: albumError } = await supabase
                .from('albums')
                .select('*')
                .eq('id', albumId)
                .single();

            if (albumError) throw albumError;

            const { data: pagesData, error: pagesError } = await supabase
                .from('pages')
                .select(`*, assets(*)`)
                .eq('album_id', albumId)
                .order('page_number', { ascending: true });

            if (pagesError) throw pagesError;

            const data = albumData as any;
            // Sort by page_number and normalize to 1-based index (Self-healing for potential gaps or temporary shifts)
            const sortedPages = (pagesData as any[] || []).sort((a, b) => a.page_number - b.page_number);

            let pages = sortedPages.map((p, i) => ({
                id: p.id,
                pageNumber: i + 1,
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
                    filter: a.config?.filter,
                    filterIntensity: a.config?.filterIntensity,
                    content: a.config?.content,
                    brightness: a.config?.brightness || 100,
                    contrast: a.config?.contrast || 100,
                    saturate: a.config?.saturate || 100,
                    isRemovingBackground: a.config?.isRemovingBackground,
                    isStamp: a.config?.isStamp
                }))
            }));

            if (pages.length === 0) {
                pages = [
                    {
                        id: generateId(),
                        pageNumber: 1,
                        layoutTemplate: 'cover-front',
                        assets: [],
                        backgroundColor: '#ffffff'
                    },
                    {
                        id: generateId(),
                        pageNumber: 2,
                        layoutTemplate: 'freeform',
                        assets: [],
                        backgroundColor: '#ffffff'
                    },
                    {
                        id: generateId(),
                        pageNumber: 3,
                        layoutTemplate: 'freeform',
                        assets: [],
                        backgroundColor: '#ffffff'
                    },
                    {
                        id: generateId(),
                        pageNumber: 4,
                        layoutTemplate: 'cover-back',
                        assets: [],
                        backgroundColor: '#ffffff'
                    }
                ];
            }

            const fullAlbum: Album = {
                id: data.id,
                family_id: data.family_id,
                title: data.title,
                description: data.description,
                category: data.category,
                location: data.location,
                country: data.country,
                geotag: data.geotag,
                coverUrl: data.cover_image_url,
                isPublished: data.is_published,
                hashtags: data.hashtags || [],
                unplacedMedia: data.config?.unplacedMedia || [],
                createdAt: new Date(data.created_at),
                updatedAt: new Date(data.updated_at),
                pages: pages,
                config: {
                    ...DEFAULT_CONFIG,
                    ...(data.config || {})
                }
            };

            setAlbum(fullAlbum);
            return { success: true };
        } catch (error: any) {
            console.error('[fetchAlbum] Error:', error);
            return { success: false, error: error.message };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveAlbum = useCallback(async () => {
        if (!album) return { success: false, error: 'No album to save' };
        setIsSaving(true);
        try {
            // 1. Update Album Metadata
            const { error: albumError } = await (supabase.from('albums') as any)
                .update({
                    title: album.title,
                    description: album.description,
                    category: album.category,
                    is_published: album.isPublished,
                    hashtags: album.hashtags || [],
                    location: album.location,
                    country: album.country,
                    geotag: album.geotag,
                    config: {
                        ...album.config,
                        unplacedMedia: album.unplacedMedia,
                        geotag: album.geotag, // Double-save for fallback
                        location: album.location
                    },
                    updated_at: new Date().toISOString()
                })
                .eq('id', album.id);

            if (albumError) throw albumError;

            // 2. Prepare Payloads
            const pagesPayload = album.pages.map(page => ({
                id: page.id,
                album_id: album.id,
                page_number: page.pageNumber,
                template_id: page.layoutTemplate,
                background_color: page.backgroundColor,
                updated_at: new Date().toISOString()
            }));

            const assetsPayload = album.pages.flatMap(page =>
                page.assets.map(asset => ({
                    id: asset.id,
                    page_id: page.id,
                    asset_type: asset.type,
                    url: asset.url,
                    z_index: asset.zIndex || 0,
                    slot_id: asset.slotId || null,
                    config: {
                        x: asset.x,
                        y: asset.y,
                        width: asset.width,
                        height: asset.height,
                        rotation: asset.rotation,
                        scale: asset.scale,
                        flipX: asset.flipX,
                        flipY: asset.flipY,
                        opacity: asset.opacity,
                        aspectRatio: asset.aspectRatio,
                        lockAspectRatio: asset.lockAspectRatio,
                        borderRadius: asset.borderRadius,
                        borderColor: asset.borderColor,
                        borderWidth: asset.borderWidth,
                        filter: asset.filter,
                        filterIntensity: asset.filterIntensity,
                        brightness: asset.brightness,
                        contrast: asset.contrast,
                        saturate: asset.saturate,
                        hue: asset.hue,
                        sepia: asset.sepia,
                        blur: asset.blur,
                        exposure: asset.exposure,
                        highlights: asset.highlights,
                        shadows: asset.shadows,
                        warmth: asset.warmth,
                        sharpness: asset.sharpness,
                        content: asset.content,
                        fontFamily: asset.fontFamily,
                        fontSize: asset.fontSize,
                        fontWeight: asset.fontWeight,
                        lineHeight: asset.lineHeight,
                        letterSpacing: asset.letterSpacing,
                        textAlign: asset.textAlign,
                        textColor: asset.textColor,
                        textBackgroundColor: asset.textBackgroundColor,
                        textShadow: asset.textShadow,
                        color: asset.color,
                        crop: asset.crop,
                        isLocked: asset.isLocked,
                        isHidden: asset.isHidden,
                        isStamp: asset.isStamp,
                        category: asset.category,
                        isPlaceholder: asset.isPlaceholder,
                        fitMode: asset.fitMode,
                        originalDimensions: asset.originalDimensions,
                        clipPoints: asset.clipPoints,
                        isRemovingBackground: asset.isRemovingBackground,
                    } as any,
                    updated_at: new Date().toISOString()
                }))
            );

            // 3. Cleanup Orphans (Pages)
            const { data: dbPages, error: fetchPagesError } = await supabase
                .from('pages')
                .select('id')
                .eq('album_id', album.id);

            if (fetchPagesError) throw fetchPagesError;

            const currentPageIds = new Set(album.pages.map(p => p.id));
            const pagesToDelete = (dbPages as any[])?.filter((p: any) => !currentPageIds.has(p.id)) || [];

            if (pagesToDelete.length > 0) {
                const { error: deletePagesError } = await supabase
                    .from('pages')
                    .delete()
                    .in('id', pagesToDelete.map((p: any) => p.id));
                if (deletePagesError) throw deletePagesError;
            }

            // 4. Cleanup Orphans (Assets)
            // Fetch assets for current pages to detect deletions within pages
            const { data: dbAssets, error: fetchAssetsError } = await supabase
                .from('assets')
                .select('id')
                .in('page_id', Array.from(currentPageIds));

            if (fetchAssetsError) throw fetchAssetsError;

            const currentAssetIds = new Set(assetsPayload.map(a => a.id));
            const assetsToDelete = (dbAssets as any[])?.filter((a: any) => !currentAssetIds.has(a.id)) || [];

            if (assetsToDelete.length > 0) {
                const { error: deleteAssetsError } = await supabase
                    .from('assets')
                    .delete()
                    .in('id', assetsToDelete.map((a: any) => a.id));
                if (deleteAssetsError) throw deleteAssetsError;
            }

            // 5. Batch Upsert Pages
            if (pagesPayload.length > 0) {
                // 5a. First pass: Shift page numbers to temporary range (10000+) to avoid unique constraint violations during reordering
                const shiftPayload = pagesPayload.map(p => ({
                    id: p.id,
                    page_number: (p.page_number || 0) + 10000,
                    album_id: p.album_id // Ensure album_id is present for the constraint
                }));

                const { error: shiftError } = await (supabase.from('pages') as any)
                    .upsert(shiftPayload);
                if (shiftError) throw shiftError;

                // 5b. Second pass: Set correct page numbers and full data
                const { error: upsertPagesError } = await (supabase.from('pages') as any)
                    .upsert(pagesPayload);
                if (upsertPagesError) throw upsertPagesError;
            }

            // 6. Batch Upsert Assets
            if (assetsPayload.length > 0) {
                const { error: upsertAssetsError } = await (supabase.from('assets') as any)
                    .upsert(assetsPayload);
                if (upsertAssetsError) throw upsertAssetsError;
            }

            return { success: true };
        } catch (error: any) {
            console.error('Save error:', error);
            return { success: false, error: error.message };
        } finally {
            setIsSaving(false);
        }
    }, [album]);
    const toggleLock = useCallback(async () => {
        if (!album) return;
        const newLockedState = !album.config.isLocked;
        console.log("Toggling lock to:", newLockedState);

        // Optimistic update
        setAlbum(prev => prev ? ({
            ...prev,
            config: {
                ...prev.config,
                isLocked: newLockedState
            },
            updatedAt: new Date()
        }) : null);

        const { supabase } = await import('../lib/supabase');
        const { error } = await (supabase.from('albums') as any)
            .update({
                config: {
                    ...album.config,
                    isLocked: newLockedState
                }
            })
            .eq('id', album.id);

        if (error) console.error("Error toggling lock:", error);
    }, [album]);

    const value: AlbumContextType = {
        album,
        currentPageIndex,
        selectedAssetId,
        setAlbum,
        setCurrentPageIndex,
        setSelectedAssetId,
        addPage,
        removePage,
        updatePage,
        addAsset,
        updateAsset,
        removeAsset,
        updateAssetZIndex,
        uploadMedia,
        applyLayout,
        moveFromLibrary,
        addMediaByUrl,
        saveAlbum,
        fetchAlbum,
        isSaving,
        isLoading,
        uploadProgress, // Added uploadProgress
        duplicateAsset,
        duplicatePage,
        movePage,
        reorderPages,
        updateConfig,
        toggleSpreadView,
        getSpread,
        syncStyles,
        undo,
        redo,
        canUndo: history.length > 0,
        canRedo: redoStack.length > 0,
        updatePageAssets,
        moveAssetToPage,
        toggleLock
    };

    return (
        <AlbumContext.Provider value={value}>
            {children}
        </AlbumContext.Provider>
    );
}

export function useAlbum() {
    const context = useContext(AlbumContext);
    if (!context) {
        throw new Error('useAlbum must be used within an AlbumProvider');
    }
    return context;
}

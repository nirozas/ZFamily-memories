import { useState, useEffect } from 'react';
import { GooglePhotosService, type GoogleMediaItem } from '../../services/googlePhotos';
import {
    X,
    Check,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Camera
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

// Helper component for secure authenticated images
function SecureThumbnail({ url, alt, className, accessToken }: { url: string, alt: string, className?: string, accessToken: string }) {
    const [objectUrl, setObjectUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;

        async function loadImage() {
            try {
                // If it's a public photoslibrary URL, try direct first (optimization)
                // BUT if it fails, we should fall back. For now, assume Picker URLs need auth.
                const isPicker = !url.includes('photoslibrary.googleapis.com');

                if (!isPicker) {
                    setObjectUrl(url); // Try direct for library items
                    setLoading(false);
                    return;
                }

                const response = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${accessToken}` },
                    referrerPolicy: 'no-referrer'
                });

                if (response.ok) {
                    const blob = await response.blob();
                    if (active) {
                        setObjectUrl(URL.createObjectURL(blob));
                        setLoading(false);
                    }
                } else {
                    console.warn('Failed to load thumb:', response.status);
                    setLoading(false);
                }
            } catch (err) {
                console.error('Error loading thumb:', err);
                setLoading(false);
            }
        }

        loadImage();

        return () => {
            active = false;
            // Revoke URL to prevent memory leaks, but only if it's a blob
            if (objectUrl && objectUrl.startsWith('blob:')) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [url, accessToken]);

    if (loading) {
        return <div className={`bg-gray-100 animate-pulse ${className}`} />;
    }

    return (
        <img
            src={objectUrl || url}
            alt={alt}
            className={className}
            referrerPolicy="no-referrer"
            onError={(e) => {
                // Fallback for broken images
                (e.target as HTMLImageElement).style.opacity = '0.5';
            }}
        />
    );
}

interface GooglePhotosSelectorProps {
    googleAccessToken: string;
    isOpen: boolean;
    onClose: () => void;
    onSelect: (items: GoogleMediaItem[], targetFolder: string) => void;
    folders: string[];
    onReauth?: () => void;
}

export function GooglePhotosSelector({ googleAccessToken, isOpen, onClose, onSelect, folders, onReauth }: GooglePhotosSelectorProps) {
    const [mediaItems, setMediaItems] = useState<GoogleMediaItem[]>([]);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(true);
    const [pageToken, setPageToken] = useState<string | undefined>();
    const [nextPageToken, setNextPageToken] = useState<string | undefined>();
    const [prevTokens, setPrevTokens] = useState<string[]>([]);

    const [targetFolder, setTargetFolder] = useState<string>('/');
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState('');

    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Only auto-fetch if we have an active session
        if (isOpen && googleAccessToken && activeSessionId) {
            fetchMedia();
        } else if (isOpen && googleAccessToken && !activeSessionId) {
            // If open but no session, clear list and stop loading
            setMediaItems([]);
            setIsLoading(false);
        }
    }, [isOpen, googleAccessToken, pageToken, activeSessionId]);

    // Handle internal visibility changes (return to tab)
    useEffect(() => {
        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'visible' && isOpen && activeSessionId && mediaItems.length === 0) {
                // Silently try to refresh
                try {
                    const service = new GooglePhotosService(googleAccessToken);
                    const response = await service.listMediaItems(activeSessionId, 48);
                    if (response.mediaItems && response.mediaItems.length > 0) {
                        setMediaItems(response.mediaItems);
                        setError(null);
                    }
                } catch (e) {
                    // Ignore 400s during auto-refresh
                }
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, [isOpen, activeSessionId]);

    const handleStartPicking = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const service = new GooglePhotosService(googleAccessToken);
            const session = await service.createPickerSession();

            // 1. Open the Google Picker UI in a new window/tab
            window.open(session.pickerUri, '_blank');

            // 2. Save sessionId to state
            setActiveSessionId(session.id);

            // We'll wait a bit then fetch, or let the user click "Refresh"
        } catch (err: any) {
            console.error('Error starting Google Picker:', err);
            setError(err.message || 'Failed to start selection session');
            setIsLoading(false);
        }
    };

    const fetchMedia = async () => {
        if (!googleAccessToken || !activeSessionId) return;

        setIsLoading(true);
        setError(null);
        try {
            const service = new GooglePhotosService(googleAccessToken);
            const response = await service.listMediaItems(activeSessionId, 48, pageToken);

            if (response.mediaItems) {
                setMediaItems(response.mediaItems);
            } else {
                setMediaItems([]);
            }

            setNextPageToken(response.nextPageToken);
        } catch (err: any) {
            if (err.message.includes('USER_NOT_FINISHED')) {
                // Not an "error", just a state
                setError('USER_NOT_FINISHED');
                // Keep mediaItems as empty so the "Awaiting Selection" banner shows
                setMediaItems([]);
            } else {
                console.error('Error fetching Google Photos:', err);
                setError(err.message || 'Failed to connect to Google Photos library');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleNextPage = () => {
        if (nextPageToken && activeSessionId) {
            setPrevTokens([...prevTokens, pageToken || '']);
            setPageToken(nextPageToken);
        }
    };

    const handlePrevPage = () => {
        const lastToken = prevTokens[prevTokens.length - 1];
        setPrevTokens(prevTokens.slice(0, -1));
        setPageToken(lastToken || undefined);
    };

    const toggleSelect = (id: string) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedItems(newSet);
    };

    const handleConfirmSelection = () => {
        const selected = mediaItems.filter(item => selectedItems.has(item.id));
        const finalFolder = isCreatingFolder && newFolderName.trim() ? newFolderName.trim() : targetFolder;
        onSelect(selected, finalFolder);
        setSelectedItems(new Set());
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white z-10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <Camera className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-serif italic text-catalog-text">Google Photos</h2>
                            <p className="text-xs text-gray-400 font-sans uppercase tracking-widest font-black">Secure Browse & Import</p>
                        </div>
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                {/* Sub-header / Actions */}
                <div className="px-6 py-3 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-6">
                        <div className="text-sm text-gray-500 font-medium whitespace-nowrap">
                            {selectedItems.size > 0 ? (
                                <span className="text-catalog-accent font-bold uppercase tracking-wider text-xs">
                                    {selectedItems.size} items selected
                                </span>
                            ) : (
                                "Choose photos to import"
                            )}
                        </div>

                        {/* Folder Target Selector */}
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">Import To:</span>
                            {isCreatingFolder ? (
                                <div className="flex items-center gap-1">
                                    <input
                                        type="text"
                                        placeholder="New folder name..."
                                        className="h-8 px-2 text-xs border border-catalog-accent/30 rounded focus:border-catalog-accent outline-none font-medium"
                                        value={newFolderName}
                                        onChange={(e) => setNewFolderName(e.target.value)}
                                        autoFocus
                                    />
                                    <Button variant="glass" size="sm" onClick={() => setIsCreatingFolder(false)} className="h-8 w-8 p-0">
                                        <X className="w-3 h-3" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-1">
                                    <select
                                        className="h-8 pl-2 pr-8 text-xs bg-white border border-gray-200 rounded outline-none focus:border-catalog-accent font-medium min-w-[120px] appearance-none cursor-pointer"
                                        value={targetFolder}
                                        onChange={(e) => setTargetFolder(e.target.value)}
                                    >
                                        {folders.map(f => (
                                            <option key={f} value={f}>{f === '/' ? 'Root Library' : f}</option>
                                        ))}
                                    </select>
                                    <Button variant="glass" size="sm" onClick={() => setIsCreatingFolder(true)} className="h-8 w-8 p-0" title="Create New Folder">
                                        <span className="text-blue-600 font-bold">+</span>
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="glass"
                                size="sm"
                                onClick={handlePrevPage}
                                disabled={prevTokens.length === 0 || isLoading || !activeSessionId}
                                className="h-8 w-8 p-0 rounded-lg"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="glass"
                                size="sm"
                                onClick={handleNextPage}
                                disabled={!nextPageToken || isLoading || !activeSessionId}
                                className="h-8 w-8 p-0 rounded-lg"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>

                        <div className="h-6 w-px bg-gray-200 mx-2" />

                        <Button
                            onClick={handleConfirmSelection}
                            disabled={selectedItems.size === 0 || (isCreatingFolder && !newFolderName.trim())}
                            className="h-9 px-6 font-bold uppercase tracking-widest text-[10px]"
                        >
                            Import Selection
                        </Button>
                    </div>
                </div>

                {/* Grid / Content Area */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                    {/* Active Session Refresh Tip */}
                    {activeSessionId && !isLoading && !error && mediaItems.length === 0 && (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                    <Camera className="w-4 h-4" />
                                </div>
                                <p className="text-sm text-blue-800 font-medium">Have you finished selecting your photos?</p>
                            </div>
                            <Button onClick={() => fetchMedia()} variant="glass" size="sm" className="bg-white border-blue-200 text-blue-700 shadow-sm font-bold text-[10px] uppercase tracking-widest px-4">
                                Refresh Selection
                            </Button>
                        </div>
                    )}

                    {isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center gap-4 text-gray-400">
                            <Loader2 className="w-12 h-12 animate-spin opacity-20" />
                            <p className="font-serif italic text-lg animate-pulse">Communicating with Google...</p>
                        </div>
                    ) : error ? (
                        <div className="h-full flex flex-col items-center justify-center text-center gap-4 max-w-md mx-auto px-6">
                            <div className={cn(
                                "w-16 h-16 rounded-full flex items-center justify-center",
                                error.includes('INSUFFICIENT_PERMISSIONS') ? "bg-amber-50" : "bg-red-50"
                            )}>
                                {error.includes('INSUFFICIENT_PERMISSIONS') ? (
                                    <Camera className="w-8 h-8 text-amber-500" />
                                ) : (
                                    <X className="w-8 h-8 text-red-500" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">
                                    {error.includes('INSUFFICIENT_PERMISSIONS') ? "Permission Required" : (error === 'USER_NOT_FINISHED' ? "Waiting for Selection" : "Connection Error")}
                                </h3>
                                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                    {error === 'USER_NOT_FINISHED'
                                        ? "Please finish picking photos in the Google window and click 'Done' before returning here."
                                        : (error.includes('INSUFFICIENT_PERMISSIONS') ? "Photos access was not granted. Re-authorize to continue." : error)}
                                </p>
                                <div className="flex flex-col gap-2">
                                    {error === 'USER_NOT_FINISHED' ? (
                                        <Button onClick={() => fetchMedia()} className="px-8 font-black uppercase tracking-widest text-[10px] bg-blue-600">
                                            I've Selected My Photos - Refresh
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => error.includes('INSUFFICIENT_PERMISSIONS') && onReauth ? onReauth() : handleStartPicking()}
                                            className={cn(
                                                "px-8 font-black uppercase tracking-widest text-[10px]",
                                                error.includes('INSUFFICIENT_PERMISSIONS') ? "bg-amber-600 hover:bg-amber-700" : ""
                                            )}
                                        >
                                            {error.includes('INSUFFICIENT_PERMISSIONS') ? "Fix Permissions Now" : "Restart Selection"}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : !activeSessionId ? (
                        <div className="h-full flex flex-col items-center justify-center text-center gap-6 max-w-sm mx-auto">
                            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center transform -rotate-6 shadow-indigo-100 shadow-xl">
                                <Camera className="w-10 h-10 text-blue-500" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-serif italic text-gray-900 mb-2">Connect Your Library</h3>
                                <p className="text-sm text-gray-500 mb-8 font-serif italic leading-relaxed">
                                    Select the heritage photos you want to preserve from your Google account. A secure window will open for your selection.
                                </p>
                                <Button onClick={handleStartPicking} className="w-full h-12 font-black uppercase tracking-widest text-[11px] shadow-lg shadow-catalog-accent/20">
                                    Choose From Google Photos
                                </Button>
                            </div>
                        </div>
                    ) : mediaItems.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
                            {mediaItems.map((item) => {
                                const isSelected = selectedItems.has(item.id);
                                const baseUrl = item.mediaFile?.baseUrl || item.baseUrl || '';
                                const separator = baseUrl.includes('?') ? '&' : '?';
                                const thumbUrl = baseUrl.includes('photoslibrary')
                                    ? `${baseUrl}=w300-h300-c`
                                    : (baseUrl ? `${baseUrl}${separator}w=300&h=300` : '');

                                return (
                                    <div
                                        key={item.id}
                                        className={cn(
                                            "relative aspect-square rounded-xl overflow-hidden cursor-pointer group transition-all",
                                            isSelected ? "ring-4 ring-catalog-accent ring-offset-2" : "hover:scale-95 shadow-sm border border-gray-100"
                                        )}
                                        onClick={() => toggleSelect(item.id)}
                                    >
                                        <SecureThumbnail
                                            url={thumbUrl}
                                            alt={item.id}
                                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                            accessToken={googleAccessToken || ''}
                                        />

                                        {/* Selection Overlay */}
                                        <div className={cn(
                                            "absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity",
                                            isSelected ? "opacity-100 bg-catalog-accent/40" : "opacity-0 group-hover:opacity-100"
                                        )}>
                                            <div className={cn(
                                                "w-8 h-8 rounded-full flex items-center justify-center border-2 shadow-lg transition-transform",
                                                isSelected ? "bg-white border-white scale-110" : "border-white bg-transparent scale-90"
                                            )}>
                                                {isSelected && <Check className="w-5 h-5 text-catalog-accent font-black" />}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center gap-4 max-w-sm mx-auto">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
                                <Camera className="w-8 h-8 text-blue-200" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Items not yet ready</h3>
                                <p className="text-sm text-gray-500 mb-6 font-serif italic">Please finish choosing your items in the Google window, then click Refresh.</p>
                                <Button variant="glass" onClick={() => fetchMedia()} className="px-8 font-black uppercase tracking-widest text-[10px] text-catalog-accent">
                                    Refresh Selection
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

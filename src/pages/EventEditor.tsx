import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save, Sparkles, ImagePlus, Calendar, Tag, Users, Layout, Sliders, Plus, Undo, Redo } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { RichTextEditor } from '../components/events/RichTextEditor';
import type { RichTextEditorRef } from '../components/events/RichTextEditor';
import { storageService } from '../services/storage';
import type { Event } from '../types/supabase';
import { HashtagInput } from '../components/ui/HashtagInput';
import { ImageCropper } from '../components/ui/ImageCropper';
import { LocationPicker } from '../components/ui/LocationPicker';


import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, rectSortingStrategy } from '@dnd-kit/sortable';
import { SortableAsset } from '../components/ui/SortableAsset';

import { videoCompressionService } from '../services/videoCompression';
import { Loader2 } from 'lucide-react';

export function EventEditor() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { familyId } = useAuth();
    const editorRef = useRef<RichTextEditorRef>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [compressionProgress, setCompressionProgress] = useState<number | null>(null);

    const [eventData, setEventData] = useState<Partial<Event>>({
        title: '',
        description: '',
        event_date: new Date().toISOString().split('T')[0],
        location: '',
        category: '',
        hashtags: [],
        participants: [],
        geotag: null,
        content: { assets: [], galleryMode: 'cards' }
    });

    const [croppingImage, setCroppingImage] = useState<{ src: string, file: File, target: 'story' | 'gallery' } | null>(null);
    const [uploadTarget, setUploadTarget] = useState<'story' | 'gallery'>('story');

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handleDragEnd(event: any) {
        const { active, over } = event;

        if (active.id !== over.id) {
            updateEventData((currentData) => {
                const assets = currentData.content?.assets || [];
                const oldIndex = assets.findIndex((asset: { url: string }) => asset.url === active.id);
                const newIndex = assets.findIndex((asset: { url: string }) => asset.url === over.id);

                const newAssets = arrayMove(assets, oldIndex, newIndex);
                return { ...currentData, content: { ...currentData.content, assets: newAssets } };
            });
        }
    }


    const isNew = !id || id === 'new';

    useEffect(() => {
        if (!isNew && id) {
            fetchEvent(id);
        } else {
            setLoading(false);
        }
    }, [id, isNew]);

    const fetchEvent = async (eventId: string) => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (error) throw error;
            if (data) {
                const fetchedEvent = data as Event;
                setEventData({
                    ...fetchedEvent,
                    content: fetchedEvent.content || { assets: [], galleryMode: 'cards' }
                });
            }
        } catch (error) {
            console.error('Error fetching event:', error);
            alert('Failed to load moment');
            navigate('/events');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!familyId || !eventData.title || !eventData.event_date) {
            alert('Please fill in required fields (Title and Date)');
            return;
        }

        setIsSaving(true);
        try {
            const payload = {
                family_id: familyId,
                title: eventData.title,
                description: eventData.description,
                event_date: eventData.event_date,
                location: eventData.location,
                category: eventData.category,
                hashtags: eventData.hashtags || [],
                participants: eventData.participants || [],
                geotag: eventData.geotag || null,
                content: eventData.content || { assets: [], galleryMode: 'cards' },
            };

            if (isNew) {
                const { error } = await (supabase.from('events') as any)
                    .insert(payload as any);
                if (error) throw error;
            } else {
                const { error } = await (supabase.from('events') as any)
                    .update(payload as any)
                    .eq('id', id as string);
                if (error) throw error;
            }
            navigate('/events');
        } catch (error: any) {
            console.error('Error saving event:', error);
            alert(`Failed to save moment: ${error.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-catalog-bg">
                <div className="w-12 h-12 border-4 border-catalog-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    const [history, setHistory] = useState<Partial<Event>[]>([]);
    const [redoStack, setRedoStack] = useState<Partial<Event>[]>([]);

    const updateEventData = (newData: Partial<Event> | ((prev: Partial<Event>) => Partial<Event>)) => {
        setEventData(prev => {
            const resolved = typeof newData === 'function' ? newData(prev) : newData;
            if (prev !== resolved) {
                setHistory(h => [...h.slice(-19), prev]); // Keep last 20 states
                setRedoStack([]);
            }
            return resolved;
        });
    };

    const undo = () => {
        setHistory(h => {
            if (h.length === 0) return h;
            const previous = h[h.length - 1];
            setEventData(current => {
                setRedoStack(r => [...r, current]);
                return previous;
            });
            return h.slice(0, -1);
        });
    };

    const redo = () => {
        setRedoStack(r => {
            if (r.length === 0) return r;
            const next = r[r.length - 1];
            setEventData(current => {
                setHistory(h => [...h, current]);
                return next;
            });
            return r.slice(0, -1);
        });
    };

    // Keyboard Shortcuts
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
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [history, redoStack]); // Re-bind when history changes to capture latest closures

    // ... (rest of component) ...

    return (
        <div className="min-h-screen bg-catalog-bg flex flex-col">
            {/* Top Bar */}
            <header className="h-16 bg-white border-b border-catalog-accent/20 flex items-center justify-between px-6 sticky top-0 z-50">
                <div className="flex items-center gap-4">
                    <Link to="/events" className="p-2 hover:bg-catalog-stone/50 rounded-full transition-colors text-catalog-text/60">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-serif text-xl text-catalog-text">
                        {isNew ? 'Record New Moment' : `Editing: ${eventData.title}`}
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 bg-catalog-stone/10 rounded-lg p-0.5 mr-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={history.length === 0}
                            onClick={undo}
                            className="h-8 w-8 p-0"
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            disabled={redoStack.length === 0}
                            onClick={redo}
                            className="h-8 w-8 p-0"
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo className="w-4 h-4" />
                        </Button>
                    </div>

                    <Button variant="ghost" onClick={() => navigate('/events')}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSave}
                        isLoading={isSaving}
                        className="shadow-md"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {isNew ? 'Save to Timeline' : 'Save Changes'}
                    </Button>
                </div>
            </header>

            <main className="flex-1 overflow-auto p-8">
                <div className="max-w-[95%] mx-auto space-y-8 pb-12">
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Left: Metadata (Compact) */}
                        <div className="lg:col-span-1 space-y-6">
                            <Card className="p-6 space-y-6 bg-white/80 backdrop-blur-sm">
                                <h2 className="text-sm font-bold text-catalog-accent uppercase tracking-widest border-b border-catalog-accent/10 pb-2">
                                    Details
                                </h2>
                                <Input
                                    label="Title"
                                    value={eventData.title}
                                    onChange={(e) => updateEventData({ ...eventData, title: e.target.value })}
                                    required
                                    className="font-serif text-lg"
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="relative">
                                        <div className="flex items-center gap-1 mb-1">
                                            <Calendar className="w-3.5 h-3.5 text-catalog-accent" />
                                            <label className="text-xs font-medium text-catalog-text/70">Date</label>
                                        </div>
                                        <input
                                            type="date"
                                            value={eventData.event_date}
                                            onChange={(e) => updateEventData({ ...eventData, event_date: e.target.value })}
                                            required
                                            className="w-full px-3 py-2 border border-catalog-accent/20 rounded-md bg-white text-catalog-text focus:outline-none focus:ring-2 focus:ring-catalog-accent/30 text-sm"
                                        />
                                    </div>
                                    <Input
                                        label="Category"
                                        value={eventData.category || ''}
                                        onChange={(e) => updateEventData({ ...eventData, category: e.target.value })}
                                        placeholder="Tradition, Vacation..."
                                    />
                                </div>
                                <LocationPicker
                                    value={eventData.location || ''}
                                    onChange={(address, lat, lng) => {
                                        updateEventData({
                                            ...eventData,
                                            location: address,
                                            geotag: lat && lng ? { lat, lng } : null
                                        });
                                    }}
                                />
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-catalog-text/70 uppercase tracking-widest flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5" /> Participants
                                    </label>
                                    <HashtagInput
                                        tags={eventData.participants || []}
                                        onChange={(tags) => updateEventData({ ...eventData, participants: tags })}
                                        placeholder="Add people..."
                                        suggestions={['Father', 'Mother', 'Grandfather', 'Grandmother', 'Son', 'Daughter']}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-catalog-text/70 uppercase tracking-widest flex items-center gap-1">
                                        <Tag className="w-3.5 h-3.5" /> Hashtags
                                    </label>
                                    <HashtagInput
                                        tags={eventData.hashtags || []}
                                        onChange={(tags) => updateEventData({ ...eventData, hashtags: tags })}
                                        suggestions={['tradition', 'vacation', 'holiday', 'birthday', 'wedding']}
                                    />
                                </div>
                            </Card>
                        </div>

                        {/* Right: Rich Text Editor (Wider) */}
                        <div className="lg:col-span-3">
                            <Card className="p-8 min-h-[700px] flex flex-col bg-white shadow-2xl relative overflow-hidden group/editor">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover/editor:opacity-30 transition-opacity">
                                    <Sparkles className="w-12 h-12 text-catalog-accent" />
                                </div>
                                <div className="flex items-center justify-between mb-6">
                                    <label className="flex items-center gap-2 text-sm font-bold text-catalog-accent uppercase tracking-widest">
                                        <Sparkles className="w-4 h-4" /> The Story
                                    </label>
                                    <div className="flex items-center gap-4">
                                        <div className="flex bg-catalog-stone/10 p-1 rounded-lg">
                                            <button
                                                type="button"
                                                onClick={() => setUploadTarget('story')}
                                                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${uploadTarget === 'story' ? 'bg-white text-catalog-accent shadow-sm' : 'text-catalog-text/40 hover:text-catalog-text/60'}`}
                                            >
                                                Story
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setUploadTarget('gallery')}
                                                className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${uploadTarget === 'gallery' ? 'bg-white text-catalog-accent shadow-sm' : 'text-catalog-text/40 hover:text-catalog-text/60'}`}
                                            >
                                                Gallery
                                            </button>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="p-2 bg-catalog-accent/10 hover:bg-catalog-accent/20 text-catalog-accent rounded-md transition-colors"
                                            title="Add Image"
                                        >
                                        </Button>
                                    </div>
                                    {/* Upload/Compression Indicator */}
                                    {(uploading || compressionProgress !== null) && (
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/90 px-4 py-2 rounded-lg shadow-lg z-50 flex items-center gap-2">
                                            <Loader2 className="w-4 h-4 animate-spin text-catalog-accent" />
                                            <span className="text-xs font-bold text-catalog-text">
                                                {compressionProgress !== null ? `Compressing Video ${compressionProgress}%...` : 'Uploading...'}
                                            </span>
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*,video/*"
                                        multiple
                                        onChange={async (e) => {
                                            const files = Array.from(e.target.files || []);
                                            if (files.length === 0) return;

                                            // Determine if we need to compress videos
                                            const videoFiles = files.filter(f => f.type.startsWith('video/'));
                                            const imageFiles = files.filter(f => f.type.startsWith('image/'));

                                            // If inserting single image into story, go to cropper
                                            if (uploadTarget === 'story' && imageFiles.length === 1 && videoFiles.length === 0) {
                                                const file = imageFiles[0];
                                                const reader = new FileReader();
                                                reader.onload = (event) => {
                                                    if (event.target?.result) {
                                                        setCroppingImage({
                                                            src: event.target.result as string,
                                                            file,
                                                            target: uploadTarget
                                                        });
                                                    }
                                                };
                                                reader.readAsDataURL(file);
                                                return;
                                            }

                                            // Otherwise do bulk upload with compression
                                            setUploading(true);
                                            try {
                                                const newAssets = [...(eventData.content?.assets || [])];

                                                // Process Videos
                                                for (const file of videoFiles) {
                                                    try {
                                                        setCompressionProgress(0);
                                                        const compressedFile = await videoCompressionService.compressVideo(file, (progress) => {
                                                            setCompressionProgress(progress);
                                                        });
                                                        setCompressionProgress(null);

                                                        const { url, error: uploadError } = await storageService.uploadFile(compressedFile, 'event-assets', `events/${eventData.title}/`);
                                                        if (uploadError) throw uploadError;
                                                        if (url) {
                                                            if (uploadTarget === 'story') {
                                                                // Insert video into story (as link or video tag? Tiptap image extension handles images. For video support we might need extension-video or just link.
                                                                // For now, let's treat it as an asset if targeted for story but insert as link?)
                                                                // Actually, let's force videos to Gallery for now or just insert as asset.
                                                                // If story, maybe just alert user? Or add to gallery anyway.
                                                                // Let's add directly to gallery assets even if target is story, because story rich text might not support video embedding easily yet.
                                                                newAssets.push({ url, type: 'video', caption: file.name });
                                                            } else {
                                                                newAssets.push({ url, type: 'video', caption: file.name });
                                                            }
                                                        }
                                                    } catch (err) {
                                                        console.error('Video processing failed', err);
                                                        setCompressionProgress(null);
                                                    }
                                                }

                                                // Process Images
                                                for (const file of imageFiles) {
                                                    const { url, error: uploadError } = await storageService.uploadFile(file, 'event-assets', `events/${eventData.title}/`);
                                                    if (uploadError) console.error('Bulk upload error:', uploadError);
                                                    // Log to family_media
                                                    if (familyId) {
                                                        await supabase.from('family_media').insert({
                                                            family_id: familyId,
                                                            url: url,
                                                            type: file.type.startsWith('image/') ? 'image' : 'video',
                                                            category: 'event',
                                                            folder: eventData.title || 'Events',
                                                            filename: file.name,
                                                            size: file.size,
                                                            uploaded_by: (await supabase.auth.getUser()).data.user?.id
                                                        } as any);
                                                    }
                                                    if (url) {
                                                        if (uploadTarget === 'story') {
                                                            editorRef.current?.insertImage(url);
                                                        } else {
                                                            newAssets.push({ url, type: 'image' });
                                                        }
                                                    }
                                                }

                                                // Update gallery assets if we added any (videos always go here effectively for now)
                                                if (newAssets.length !== (eventData.content?.assets?.length || 0)) {
                                                    updateEventData(prev => ({ ...prev, content: { ...prev.content, assets: newAssets } }));
                                                }

                                            } catch (error) {
                                                console.error('Upload process failed:', error);
                                                alert('Failed to upload some files');
                                            } finally {
                                                setUploading(false);
                                                setCompressionProgress(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }
                                        }}
                                        disabled={uploading}
                                    />
                                </div>
                                <div className="flex-1">
                                    <RichTextEditor
                                        ref={editorRef}
                                        value={eventData.description || ''}
                                        folderName={eventData.title}
                                        onChange={(html) => updateEventData({ ...eventData, description: html })}
                                    />
                                </div>
                            </Card>

                            {/* Gallery Management Section */}
                            <Card className="p-8 mt-8 bg-white/50 backdrop-blur-sm border-dashed border-2 border-catalog-accent/10">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="flex items-center gap-2 text-sm font-bold text-catalog-text/60 uppercase tracking-widest">
                                        <Layout className="w-4 h-4" /> Gallery Content
                                    </h3>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold uppercase text-catalog-text/40 mr-2 flex items-center gap-1">
                                            <Sliders className="w-3 h-3" /> Layout:
                                        </span>
                                        {(['cards', 'carousel', 'grid', 'masonry', 'polaroid'] as const).map(mode => (
                                            <button
                                                key={mode}
                                                type="button"
                                                onClick={() => updateEventData({
                                                    ...eventData,
                                                    content: { ...eventData.content, galleryMode: mode }
                                                })}
                                                className={`px-3 py-1 text-[10px] font-bold uppercase rounded border transition-all ${eventData.content?.galleryMode === mode ? 'bg-catalog-accent border-catalog-accent text-white' : 'border-catalog-accent/20 text-catalog-text/60 hover:bg-catalog-accent/5'}`}
                                            >
                                                {mode}
                                            </button>
                                        ))}
                                    </div>
                                </div>



                                {(!eventData.content?.assets || eventData.content.assets.length === 0) ? (
                                    <div className="py-12 flex flex-col items-center justify-center border-2 border-dashed border-catalog-accent/5 rounded-xl bg-catalog-stone/5">
                                        <ImagePlus className="w-8 h-8 text-catalog-accent/20 mb-3" />
                                        <p className="text-sm text-catalog-text/40 italic">No gallery images added yet.</p>
                                        <button
                                            type="button"
                                            onClick={() => { setUploadTarget('gallery'); fileInputRef.current?.click(); }}
                                            className="mt-4 text-[10px] font-bold uppercase text-catalog-accent hover:underline"
                                        >
                                            Add to Gallery
                                        </button>
                                    </div>
                                ) : (
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={(eventData.content?.assets || []).map((a: { url: string }) => a.url)}
                                            strategy={rectSortingStrategy}
                                        >
                                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
                                                {eventData.content.assets.map((asset: { url: string; type: string; caption?: string }) => (
                                                    <SortableAsset
                                                        key={asset.url}
                                                        id={asset.url}
                                                        asset={asset}
                                                        onRemove={() => {
                                                            const newAssets = eventData.content?.assets?.filter((a: { url: string }) => a.url !== asset.url);
                                                            updateEventData({ ...eventData, content: { ...eventData.content, assets: newAssets } });
                                                        }}
                                                    />
                                                ))}
                                                <button
                                                    type="button"
                                                    onClick={() => { setUploadTarget('gallery'); fileInputRef.current?.click(); }}
                                                    className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-catalog-accent/20 rounded-lg hover:bg-catalog-accent/5 transition-colors group"
                                                >
                                                    <Plus className="w-6 h-6 text-catalog-accent/40 group-hover:text-catalog-accent transition-colors" />
                                                    <span className="text-[10px] font-bold uppercase text-catalog-accent/40 mt-1">Add More</span>
                                                </button>
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Cropper Overlay */}
                {croppingImage && (
                    <ImageCropper
                        src={croppingImage.src}
                        onCancel={() => setCroppingImage(null)}
                        onCropComplete={async (croppedUrl) => {
                            setCroppingImage(null);
                            setUploading(true);
                            try {
                                const response = await fetch(croppedUrl);
                                const blob = await response.blob();
                                const file = new File([blob], croppingImage.file.name, { type: 'image/jpeg' });

                                const { url, error } = await storageService.uploadFile(file, 'event-assets', `events/${eventData.title}/`);
                                if (error) throw error;
                                if (url) {
                                    // Log to family_media
                                    if (familyId) {
                                        await supabase.from('family_media').insert({
                                            family_id: familyId,
                                            url: url,
                                            type: 'image',
                                            category: 'event',
                                            folder: eventData.title || 'Events',
                                            filename: file.name,
                                            size: file.size,
                                            uploaded_by: (await supabase.auth.getUser()).data.user?.id
                                        } as any);
                                    }

                                    if (croppingImage.target === 'story') {
                                        editorRef.current?.insertImage(url);
                                    } else {
                                        const newAssets = [...(eventData.content?.assets || [])];
                                        newAssets.push({ url, type: 'image' });
                                        updateEventData({ ...eventData, content: { ...eventData.content, assets: newAssets } });
                                    }
                                }
                            } catch (error) {
                                console.error('Error uploading cropped image:', error);
                                alert('Failed to upload image');
                            } finally {
                                setUploading(false);
                            }
                        }}
                    />
                )}
            </main>
        </div>
    );
}

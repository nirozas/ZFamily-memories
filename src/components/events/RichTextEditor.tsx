import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import {
    Bold, Italic, List, ListOrdered, Quote,
    AlignLeft, AlignCenter, AlignRight,
    Type, Trash2, Palette, Highlighter,
    Sun, Contrast, Droplets, X, Crop, Link as LinkIcon,
    BoxSelect, Maximize2, Square, Circle, Sparkles, Layers, ArrowUpDown,
    Image as ImageIcon
} from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { ImageCropper } from '../ui/ImageCropper';
import { storageService } from '../../services/storage';

interface RichTextEditorProps {
    value: string;
    onChange: (html: string) => void;
    folderName?: string;
}

export interface RichTextEditorRef {
    insertImage: (url: string) => void;
}

const COLORS = [
    '#000000', '#374151', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db',
    '#ef4444', '#f87171', '#fca5a5', '#dc2626', '#991b1b', '#7f1d1d',
    '#f97316', '#fb923c', '#fdba74', '#ea580c', '#c2410c', '#9a3412',
    '#eab308', '#facc15', '#fde047', '#ca8a04', '#a16207', '#854d0e',
    '#22c55e', '#4ade80', '#86efac', '#16a34a', '#15803d', '#14532d',
    '#3b82f6', '#60a5fa', '#93c5fd', '#2563eb', '#1d4ed8', '#1e3a8a',
    '#8b5cf6', '#a78bfa', '#c4b5fd', '#7c3aed', '#6d28d9', '#4c1d95',
    '#ec4899', '#f472b6', '#f9a8d4', '#db2777', '#be185d', '#831843',
    'var(--color-catalog-accent)', '#d4c2a1', '#e6dbc6', '#a68a52', '#8c703b', '#6b542a'
];

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({ value, onChange, folderName }, ref) => {
    const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showHighlightPicker, setShowHighlightPicker] = useState(false);
    const [imageFilters, setImageFilters] = useState({
        brightness: 100,
        contrast: 100,
        saturate: 100,
        grayscale: 0,
        sepia: 0,
        blur: 0,
        hueRotate: 0,
        opacity: 100
    });
    const [imageStyling, setImageStyling] = useState({
        borderRadius: '0.5rem',
        boxShadow: 'none',
        borderWidth: '0px',
        borderColor: 'transparent'
    });
    const [showImageEnhance, setShowImageEnhance] = useState(false);
    const [croppingImage, setCroppingImage] = useState<{ src: string } | null>(null);
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const colorInputRef = useRef<HTMLInputElement>(null);
    const highlightInputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Image.configure({
                HTMLAttributes: {
                    class: 'rounded-lg max-w-full h-auto cursor-pointer border-2 border-transparent hover:border-catalog-accent/50 transition-all m-2',
                    draggable: 'true',
                },
                allowBase64: true,
            }).extend({
                addAttributes() {
                    return {
                        src: { default: null },
                        alt: { default: null },
                        title: { default: null },
                        style: {
                            default: 'width: 100%; height: auto; display: block; resize: both;',
                            parseHTML: element => element.getAttribute('style'),
                            renderHTML: attributes => ({ style: attributes.style })
                        },
                        class: { default: 'rounded-lg max-w-full h-auto cursor-pointer border-2 border-transparent hover:border-catalog-accent/50 transition-all m-2 resize' }
                    };
                }
            }),
            TextAlign.configure({
                types: ['heading', 'paragraph'],
            }),
            TextStyle,
            Color,
            Highlight.configure({
                multicolor: true,
            }),
            FontFamily,
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: 'text-catalog-accent underline underline-offset-4'
                }
            }),
        ],
        content: value,
        onUpdate: ({ editor }) => {
            onChange(editor.getHTML());
        },
        editorProps: {
            attributes: {
                class: 'prose prose-lg prose-catalog focus:outline-none max-w-none min-h-[500px] p-4',
            },
            handleClick: (_view, _pos, event) => {
                const target = event.target as HTMLElement;
                if (target.tagName === 'IMG') {
                    const img = target as HTMLImageElement;
                    setSelectedImage(img);
                    setShowImageEnhance(false);

                    // Parse existing filter values from style
                    const style = img.getAttribute('style') || '';

                    const getFilterVal = (regex: RegExp, fallback: number) => {
                        const match = style.match(regex);
                        return match ? parseInt(match[1]) : fallback;
                    };

                    setImageFilters({
                        brightness: getFilterVal(/brightness\((\d+)%\)/, 100),
                        contrast: getFilterVal(/contrast\((\d+)%\)/, 100),
                        saturate: getFilterVal(/saturate\((\d+)%\)/, 100),
                        grayscale: getFilterVal(/grayscale\((\d+)%\)/, 0),
                        sepia: getFilterVal(/sepia\((\d+)%\)/, 0),
                        blur: getFilterVal(/blur\((\d+)px\)/, 0),
                        hueRotate: getFilterVal(/hue-rotate\((\d+)deg\)/, 0),
                        opacity: getFilterVal(/opacity\((\d+)%\)/, 100),
                    });

                    setImageStyling({
                        borderRadius: style.match(/border-radius:\s*([^;]+)/)?.[1] || '0.5rem',
                        boxShadow: style.match(/box-shadow:\s*([^;]+)/)?.[1] || 'none',
                        borderWidth: style.match(/border-width:\s*([^;]+)/)?.[1] || '0px',
                        borderColor: style.match(/border-color:\s*([^;]+)/)?.[1] || 'transparent'
                    });

                    // Toolbar position logic removed for sticky behavior
                    return true;
                }
                setSelectedImage(null);
                setShowColorPicker(false);
                setShowHighlightPicker(false);
                return false;
            }
        },
    });

    useImperativeHandle(ref, () => ({
        insertImage: (url: string) => {
            if (editor) {
                editor.chain().focus().setImage({ src: url }).run();
            }
        }
    }));

    useEffect(() => {
        if (editor && value !== editor.getHTML()) {
            editor.commands.setContent(value);
        }
    }, [value, editor]);

    const updateImageStyle = (updates: Record<string, string>) => {
        if (!editor || !selectedImage) return;

        // Get current attributes from the direct image node
        const attributes = editor.getAttributes('image');
        const currentStyle = attributes.style || selectedImage.getAttribute('style') || '';

        const styles = currentStyle.split(';').reduce((acc: Record<string, string>, s: string) => {
            const [k, v] = s.split(':').map(str => str.trim());
            if (k && v) acc[k] = v;
            return acc;
        }, {});

        Object.assign(styles, updates);

        const newStyle = Object.entries(styles)
            .filter(([k, v]) => k && v)
            .map(([k, v]) => `${k}: ${v}`)
            .join('; ') + ';';

        editor.chain().focus().updateAttributes('image', { style: newStyle }).run();
    };

    const updateImageSize = (size: string | number) => {
        if (typeof size === 'number') {
            updateImageStyle({ width: `${size}px`, height: 'auto' });
        } else if (size.endsWith('%') || size.endsWith('px')) {
            updateImageStyle({ width: size, height: 'auto' });
        } else {
            const width = size === 'small' ? '25%' : size === 'medium' ? '50%' : '100%';
            updateImageStyle({ width, height: 'auto' });
        }
    };

    const updateImageFloat = (align: 'left' | 'right' | 'center' | 'full') => {
        if (align === 'full') {
            updateImageStyle({ float: 'none', margin: '1.5rem 0', display: 'block', width: '100%', height: 'auto' });
        } else {
            const float = align === 'center' ? 'none' : align;
            const margin = align === 'center' ? '1.5rem auto' : align === 'left' ? '0 1.5rem 1rem 0' : '0 0 1rem 1.5rem';
            const display = align === 'center' ? 'block' : 'inline-block';
            updateImageStyle({ float, margin, display });
        }
    };

    const updateImageFilters = (filters: typeof imageFilters) => {
        setImageFilters(filters);
        const filterStyle = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturate}%) grayscale(${filters.grayscale}%) sepia(${filters.sepia}%) blur(${filters.blur}px) hue-rotate(${filters.hueRotate}deg) opacity(${filters.opacity}%)`;
        updateImageStyle({ filter: filterStyle });
    };

    const updateImageStyling = (styling: Partial<typeof imageStyling>) => {
        setImageStyling(prev => ({ ...prev, ...styling }));
        const styleUpdates: Record<string, string> = {};
        if (styling.borderRadius) styleUpdates['border-radius'] = styling.borderRadius;
        if (styling.boxShadow) styleUpdates['box-shadow'] = styling.boxShadow;
        if (styling.borderWidth) styleUpdates['border-width'] = styling.borderWidth;
        if (styling.borderColor) styleUpdates['border-color'] = styling.borderColor;
        updateImageStyle(styleUpdates);
    };

    const { familyId } = useAuth(); // Get familyId from context

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const { url, error } = await storageService.uploadFile(file, 'event-assets');
            if (error) throw error;
            if (url && editor) {
                editor.chain().focus().setImage({ src: url }).run();

                // Log to family_media
                if (familyId) {
                    const { error: dbError } = await supabase
                        .from('family_media')
                        .insert({
                            family_id: familyId,
                            url: url,
                            type: 'image',
                            folder: folderName || 'Events',
                            filename: file.name,
                            size: file.size,
                            uploaded_by: (await supabase.auth.getUser()).data.user?.id
                        } as any);
                    if (dbError) console.error('Error logging to family_media:', dbError);
                }
            }
        } catch (error) {
            console.error('Error uploading image:', error);
            alert('Failed to upload image');
        } finally {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };


    if (!editor) return null;

    return (
        <div ref={editorContainerRef} className="relative w-full">
            {/* Sticky Header Container */}
            <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md rounded-t-lg border-b border-catalog-accent/10 transition-all">
                {/* Main Toolbar */}
                <div className="flex flex-wrap items-center gap-1 p-2">
                    {/* Heading */}
                    <div className="flex items-center border-r border-catalog-accent/10 px-2 mr-1">
                        <button
                            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
                            className={`p-2 rounded hover:bg-catalog-accent/10 transition-colors ${editor.isActive('heading', { level: 1 }) ? 'text-catalog-accent bg-catalog-accent/5 shadow-sm' : 'text-catalog-text/60'}`}
                            title="Heading"
                        >
                            <Type className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Text Formatting */}
                    <button
                        onClick={() => editor.chain().focus().toggleBold().run()}
                        className={`p-2 rounded hover:bg-catalog-accent/10 transition-colors ${editor.isActive('bold') ? 'text-catalog-accent bg-catalog-accent/5 shadow-sm' : 'text-catalog-text/60'}`}
                        title="Bold"
                    >
                        <Bold className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleItalic().run()}
                        className={`p-2 rounded hover:bg-catalog-accent/10 transition-colors ${editor.isActive('italic') ? 'text-catalog-accent bg-catalog-accent/5 shadow-sm' : 'text-catalog-text/60'}`}
                        title="Italic"
                    >
                        <Italic className="w-4 h-4" />
                    </button>

                    <div className="w-px h-6 bg-catalog-accent/10 mx-1" />

                    {/* Font Color */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowColorPicker(!showColorPicker); setShowHighlightPicker(false); }}
                            className={`p-2 rounded hover:bg-catalog-accent/10 transition-colors ${showColorPicker ? 'text-catalog-accent bg-catalog-accent/5 shadow-sm' : 'text-catalog-text/60'}`}
                            title="Text Color"
                        >
                            <Palette className="w-4 h-4" />
                        </button>
                        {showColorPicker && (
                            <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-xl border border-catalog-accent/20 z-50 w-64">
                                <div className="grid grid-cols-6 gap-1 mb-2">
                                    {COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => { editor.chain().focus().setColor(color).run(); setShowColorPicker(false); }}
                                            className="w-8 h-8 rounded border border-gray-100 hover:scale-110 shadow-sm transition-transform"
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                                <button
                                    onClick={() => colorInputRef.current?.click()}
                                    className="w-full py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-catalog-text/60 border border-dashed border-catalog-accent/30 rounded hover:bg-catalog-accent/5 hover:text-catalog-accent transition-colors flex items-center justify-center gap-2"
                                >
                                    <Droplets className="w-3 h-3" /> Custom Color
                                </button>
                                <input
                                    type="color"
                                    ref={colorInputRef}
                                    className="sr-only"
                                    onChange={(e) => {
                                        editor.chain().focus().setColor(e.target.value).run();
                                        setShowColorPicker(false);
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    {/* Highlight */}
                    <div className="relative">
                        <button
                            onClick={() => { setShowHighlightPicker(!showHighlightPicker); setShowColorPicker(false); }}
                            className={`p-2 rounded hover:bg-catalog-accent/10 transition-colors ${showHighlightPicker ? 'text-catalog-accent bg-catalog-accent/5 shadow-sm' : 'text-catalog-text/60'}`}
                            title="Highlight"
                        >
                            <Highlighter className="w-4 h-4" />
                        </button>
                        {showHighlightPicker && (
                            <div className="absolute top-full left-0 mt-1 p-2 bg-white rounded-lg shadow-xl border border-catalog-accent/20 z-50 w-64">
                                <div className="grid grid-cols-6 gap-1 mb-2">
                                    {['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#e9d5ff', '#fed7aa', '#f3f4f6', 'transparent'].map(color => (
                                        <button
                                            key={color}
                                            onClick={() => {
                                                if (color === 'transparent') {
                                                    editor.chain().focus().unsetHighlight().run();
                                                } else {
                                                    editor.chain().focus().toggleHighlight({ color }).run();
                                                }
                                                setShowHighlightPicker(false);
                                            }}
                                            className="w-8 h-8 rounded border border-gray-100 hover:scale-110 shadow-sm transition-transform flex items-center justify-center"
                                            style={{ backgroundColor: color === 'transparent' ? '#fff' : color }}
                                            title={color === 'transparent' ? 'Remove highlight' : color}
                                        >
                                            {color === 'transparent' && <X className="w-4 h-4 text-gray-400" />}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => highlightInputRef.current?.click()}
                                    className="w-full py-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-catalog-text/60 border border-dashed border-catalog-accent/30 rounded hover:bg-catalog-accent/5 hover:text-catalog-accent transition-colors flex items-center justify-center gap-2"
                                >
                                    <Highlighter className="w-3 h-3" /> Custom Highlight
                                </button>
                                <input
                                    type="color"
                                    ref={highlightInputRef}
                                    className="sr-only"
                                    onChange={(e) => {
                                        editor.chain().focus().toggleHighlight({ color: e.target.value }).run();
                                        setShowHighlightPicker(false);
                                    }}
                                />
                            </div>
                        )}
                    </div>

                    <div className="w-px h-6 bg-catalog-accent/10 mx-1" />

                    {/* Lists */}
                    <button
                        onClick={() => editor.chain().focus().toggleBulletList().run()}
                        className={`p-2 rounded hover:bg-catalog-accent/10 transition-colors ${editor.isActive('bulletList') ? 'text-catalog-accent bg-catalog-accent/5 shadow-sm' : 'text-catalog-text/60'}`}
                        title="Bullet List"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleOrderedList().run()}
                        className={`p-2 rounded hover:bg-catalog-accent/10 transition-colors ${editor.isActive('orderedList') ? 'text-catalog-accent bg-catalog-accent/5 shadow-sm' : 'text-catalog-text/60'}`}
                        title="Numbered List"
                    >
                        <ListOrdered className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().toggleBlockquote().run()}
                        className={`p-2 rounded hover:bg-catalog-accent/10 transition-colors ${editor.isActive('blockquote') ? 'text-catalog-accent bg-catalog-accent/5 shadow-sm' : 'text-catalog-text/60'}`}
                        title="Quote"
                    >
                        <Quote className="w-4 h-4" />
                    </button>

                    <div className="w-px h-6 bg-catalog-accent/10 mx-1" />

                    {/* Alignment */}
                    <button
                        onClick={() => editor.chain().focus().setTextAlign('left').run()}
                        className={`p-2 rounded hover:bg-catalog-accent/10 transition-colors ${editor.isActive({ textAlign: 'left' }) ? 'text-catalog-accent bg-catalog-accent/5 shadow-sm' : 'text-catalog-text/60'}`}
                        title="Align Left"
                    >
                        <AlignLeft className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().setTextAlign('center').run()}
                        className={`p-2 rounded hover:bg-catalog-accent/10 transition-colors ${editor.isActive({ textAlign: 'center' }) ? 'text-catalog-accent bg-catalog-accent/5 shadow-sm' : 'text-catalog-text/60'}`}
                        title="Align Center"
                    >
                        <AlignCenter className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => editor.chain().focus().setTextAlign('right').run()}
                        className={`p-2 rounded hover:bg-catalog-accent/10 transition-colors ${editor.isActive({ textAlign: 'right' }) ? 'text-catalog-accent bg-catalog-accent/5 shadow-sm' : 'text-catalog-text/60'}`}
                        title="Align Right"
                    >
                        <AlignRight className="w-4 h-4" />
                    </button>

                    <div className="w-px h-6 bg-catalog-accent/10 mx-1" />

                    {/* Insert Image */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 rounded hover:bg-catalog-accent/10 transition-colors text-catalog-text/60"
                        title="Upload Image"
                    >
                        <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => {
                            const url = window.prompt('Enter image URL:');
                            if (url) {
                                editor.chain().focus().setImage({ src: url }).run();
                            }
                        }}
                        className="p-2 rounded hover:bg-catalog-accent/10 transition-colors text-catalog-text/60"
                        title="Insert Image by URL"
                    >
                        <LinkIcon className="w-4 h-4" />
                    </button>
                </div>

                {/* Contextual Image Toolbar - Moved Here */}
                <AnimatePresence>
                    {selectedImage && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="border-t border-catalog-accent/10 bg-catalog-accent/[0.02]"
                        >
                            <div className="flex flex-wrap items-center gap-1 p-2 mx-2">
                                <span className="text-[10px] font-bold uppercase text-catalog-text/40 mr-2 flex items-center gap-1">
                                    <Maximize2 className="w-3 h-3" /> Image:
                                </span>

                                {/* Size Controls */}
                                <div className="flex items-center gap-0.5 border-r border-catalog-accent/10 pr-2 mr-1">
                                    <button onClick={() => updateImageSize('small')} className="px-2 py-1 text-[10px] uppercase tracking-tighter hover:bg-catalog-accent/10 rounded font-bold transition-colors" title="25% width">S</button>
                                    <button onClick={() => updateImageSize('medium')} className="px-2 py-1 text-[10px] uppercase tracking-tighter hover:bg-catalog-accent/10 rounded font-bold transition-colors" title="50% width">M</button>
                                    <button onClick={() => updateImageSize('lg')} className="px-2 py-1 text-[10px] uppercase tracking-tighter hover:bg-catalog-accent/10 rounded font-bold transition-colors" title="100% width">L</button>
                                    <button onClick={() => updateImageSize(300)} className="px-2 py-1 text-[10px] uppercase tracking-tighter hover:bg-catalog-accent/10 rounded font-bold transition-colors" title="300px width">300</button>
                                    <button onClick={() => updateImageSize(600)} className="px-2 py-1 text-[10px] uppercase tracking-tighter hover:bg-catalog-accent/10 rounded font-bold transition-colors" title="600px width">600</button>
                                </div>

                                {/* Position Controls */}
                                <button onClick={() => updateImageFloat('left')} className="p-1.5 hover:bg-catalog-accent/10 rounded transition-colors" title="Float left"><AlignLeft className="w-4 h-4" /></button>
                                <button onClick={() => updateImageFloat('center')} className="p-1.5 hover:bg-catalog-accent/10 rounded transition-colors" title="Center"><AlignCenter className="w-4 h-4" /></button>
                                <button onClick={() => updateImageFloat('right')} className="p-1.5 hover:bg-catalog-accent/10 rounded transition-colors" title="Float right"><AlignRight className="w-4 h-4" /></button>
                                <button onClick={() => updateImageFloat('full')} className="px-2 py-1 text-[10px] uppercase font-bold hover:bg-catalog-accent/10 rounded transition-colors" title="Full Width">Full</button>

                                <span className="text-[10px] text-catalog-text/40">%</span>

                                {/* Numerical Width with px/percent support */}
                                <input
                                    type="text"
                                    // Use editor attributes for source of truth if available, falling back to 100%
                                    value={(() => {
                                        const style = editor?.getAttributes('image')?.style as string | undefined;
                                        if (!style) return '100%';
                                        const widthMatch = style.match(/width:\s*([^;]+)/);
                                        return widthMatch ? widthMatch[1].trim() : '100%';
                                    })()}
                                    onChange={(e) => updateImageSize(e.target.value)}
                                    className="w-16 bg-catalog-stone/10 border-none text-[10px] font-mono text-center focus:ring-1 focus:ring-catalog-accent rounded"
                                    title="Width (e.g. 100% or 300px)"
                                    placeholder="Width"
                                />

                                {/* Height Control */}
                                <div className="flex items-center gap-1 border-l border-catalog-accent/10 pl-2 ml-1">
                                    <ArrowUpDown className="w-3 h-3 text-catalog-text/40" />
                                    <input
                                        type="text"
                                        value={(() => {
                                            const style = editor?.getAttributes('image')?.style as string | undefined;
                                            if (!style) return 'auto';
                                            const heightMatch = style.match(/height:\s*([^;]+)/);
                                            return heightMatch ? heightMatch[1].trim() : 'auto';
                                        })()}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            updateImageStyle({ height: val || 'auto' });
                                        }}
                                        className="w-16 bg-catalog-stone/10 border-none text-[10px] font-mono text-center focus:ring-1 focus:ring-catalog-accent rounded"
                                        title="Height (e.g. auto, 200px, 50%)"
                                        placeholder="Height"
                                    />
                                </div>

                                <div className="w-px h-5 bg-catalog-accent/10 mx-1" />

                                {/* Enhance Button - With Relative Container for Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowImageEnhance(!showImageEnhance)}
                                        className={`p-1.5 rounded transition-colors ${showImageEnhance ? 'bg-catalog-accent/20 text-catalog-accent' : 'hover:bg-catalog-accent/10'}`}
                                        title="Enhance Image"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                    </button>

                                    {/* Image Enhancer Panel */}
                                    {showImageEnhance && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-catalog-accent/10 p-4 min-w-[320px] z-[60]"
                                        >
                                            <div className="space-y-4">
                                                {/* Brightness */}
                                                <div className="flex items-center gap-2">
                                                    <Sun className="w-4 h-4 text-catalog-text/60" />
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="200"
                                                        value={imageFilters.brightness}
                                                        onChange={(e) => updateImageFilters({ ...imageFilters, brightness: parseInt(e.target.value) })}
                                                        className="flex-1 h-1.5 bg-catalog-stone/20 rounded-lg appearance-none cursor-pointer accent-catalog-accent"
                                                    />
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="200"
                                                        value={imageFilters.brightness}
                                                        onChange={(e) => updateImageFilters({ ...imageFilters, brightness: parseInt(e.target.value) })}
                                                        className="w-12 text-[10px] font-mono text-right border border-catalog-accent/20 rounded px-1 py-0.5"
                                                    />
                                                    <span className="text-[10px] text-catalog-text/40 w-4">%</span>
                                                </div>

                                                {/* Contrast */}
                                                <div className="flex items-center gap-2">
                                                    <Contrast className="w-4 h-4 text-catalog-text/60" />
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="200"
                                                        value={imageFilters.contrast}
                                                        onChange={(e) => updateImageFilters({ ...imageFilters, contrast: parseInt(e.target.value) })}
                                                        className="flex-1 h-1.5 bg-catalog-stone/20 rounded-lg appearance-none cursor-pointer accent-catalog-accent"
                                                    />
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="200"
                                                        value={imageFilters.contrast}
                                                        onChange={(e) => updateImageFilters({ ...imageFilters, contrast: parseInt(e.target.value) })}
                                                        className="w-12 text-[10px] font-mono text-right border border-catalog-accent/20 rounded px-1 py-0.5"
                                                    />
                                                    <span className="text-[10px] text-catalog-text/40 w-4">%</span>
                                                </div>

                                                {/* Saturation */}
                                                <div className="flex items-center gap-2">
                                                    <Droplets className="w-4 h-4 text-catalog-text/60" />
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="200"
                                                        value={imageFilters.saturate}
                                                        onChange={(e) => updateImageFilters({ ...imageFilters, saturate: parseInt(e.target.value) })}
                                                        className="flex-1 h-1.5 bg-catalog-stone/20 rounded-lg appearance-none cursor-pointer accent-catalog-accent"
                                                    />
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="200"
                                                        value={imageFilters.saturate}
                                                        onChange={(e) => updateImageFilters({ ...imageFilters, saturate: parseInt(e.target.value) })}
                                                        className="w-12 text-[10px] font-mono text-right border border-catalog-accent/20 rounded px-1 py-0.5"
                                                    />
                                                    <span className="text-[10px] text-catalog-text/40 w-4">%</span>
                                                </div>

                                                {/* Blur */}
                                                <div className="flex items-center gap-2">
                                                    <Layers className="w-4 h-4 text-catalog-text/60" />
                                                    <input
                                                        type="range"
                                                        min="0"
                                                        max="20"
                                                        value={imageFilters.blur}
                                                        onChange={(e) => updateImageFilters({ ...imageFilters, blur: parseInt(e.target.value) })}
                                                        className="flex-1 h-1.5 bg-catalog-stone/20 rounded-lg appearance-none cursor-pointer accent-catalog-accent"
                                                    />
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max="20"
                                                        value={imageFilters.blur}
                                                        onChange={(e) => updateImageFilters({ ...imageFilters, blur: parseInt(e.target.value) })}
                                                        className="w-12 text-[10px] font-mono text-right border border-catalog-accent/20 rounded px-1 py-0.5"
                                                    />
                                                    <span className="text-[10px] text-catalog-text/40 w-4">px</span>
                                                </div>

                                                <button
                                                    onClick={() => updateImageFilters({
                                                        brightness: 100,
                                                        contrast: 100,
                                                        saturate: 100,
                                                        grayscale: 0,
                                                        sepia: 0,
                                                        blur: 0,
                                                        hueRotate: 0,
                                                        opacity: 100
                                                    })}
                                                    className="w-full text-[10px] text-catalog-text/60 hover:text-catalog-accent py-1 transition-colors"
                                                >
                                                    Reset to Default
                                                </button>
                                            </div>
                                        </motion.div>
                                    )}
                                </div>

                                {/* Styling Button */}
                                <div className="relative group/styling">
                                    <button
                                        className="p-1.5 rounded hover:bg-catalog-accent/10 transition-colors"
                                        title="Border & Shadow"
                                    >
                                        <BoxSelect className="w-4 h-4" />
                                    </button>
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 p-2 bg-white border border-catalog-accent/20 rounded-lg shadow-xl hidden group-hover/styling:grid grid-cols-2 gap-2 min-w-[200px] z-50">
                                        <div className="col-span-2 text-[10px] font-bold text-catalog-text/40 uppercase mb-1">Corners</div>
                                        <button onClick={() => updateImageStyling({ borderRadius: '0px' })} className="p-1 hover:bg-catalog-accent/5 rounded flex items-center justify-center border border-gray-100"><Square className="w-4 h-4" /></button>
                                        <button onClick={() => updateImageStyling({ borderRadius: '0.5rem' })} className="p-1 hover:bg-catalog-accent/5 rounded flex items-center justify-center border border-gray-100"><div className="w-4 h-4 border-2 border-current rounded-sm" /></button>
                                        <button onClick={() => updateImageStyling({ borderRadius: '1.5rem' })} className="p-1 hover:bg-catalog-accent/5 rounded flex items-center justify-center border border-gray-100"><div className="w-4 h-4 border-2 border-current rounded-lg" /></button>
                                        <button onClick={() => updateImageStyling({ borderRadius: '9999px' })} className="p-1 hover:bg-catalog-accent/5 rounded flex items-center justify-center border border-gray-100"><Circle className="w-4 h-4" /></button>

                                        <div className="col-span-2 text-[10px] font-bold text-catalog-text/40 uppercase mt-2 mb-1">Shadows</div>
                                        <button onClick={() => updateImageStyling({ boxShadow: 'none' })} className="text-[10px] p-1 border border-gray-100 rounded">None</button>
                                        <button onClick={() => updateImageStyling({ boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' })} className="text-[10px] p-1 border border-gray-100 rounded shadow-sm">Soft</button>
                                        <button onClick={() => updateImageStyling({ boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' })} className="text-[10px] p-1 border border-gray-100 rounded shadow-md">Mid</button>
                                        <button onClick={() => updateImageStyling({ boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' })} className="text-[10px] p-1 border border-gray-100 rounded shadow-lg">Deep</button>
                                    </div>
                                </div>

                                {/* Crop Button */}
                                <button
                                    onClick={() => {
                                        const src = selectedImage?.getAttribute('src');
                                        if (src) setCroppingImage({ src });
                                    }}
                                    className="p-1.5 rounded hover:bg-catalog-accent/10 transition-colors"
                                    title="Crop Image"
                                >
                                    <Crop className="w-4 h-4" />
                                </button>

                                <div className="w-px h-5 bg-catalog-accent/10 mx-1" />

                                {/* Delete */}
                                <button
                                    onClick={() => {
                                        editor.chain().focus().deleteSelection().run();
                                        setSelectedImage(null);
                                    }}
                                    className="p-1.5 hover:bg-red-50 text-red-500 rounded transition-colors"
                                    title="Delete image"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            <EditorContent editor={editor} />

            {/* Hidden File Input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
            />

            {
                croppingImage && (
                    <ImageCropper
                        src={croppingImage.src}
                        onCancel={() => setCroppingImage(null)}
                        onCropComplete={async (croppedUrl) => {
                            setCroppingImage(null);
                            try {
                                const response = await fetch(croppedUrl);
                                const blob = await response.blob();
                                const file = new File([blob], 'cropped-image.jpg', { type: 'image/jpeg' });

                                const { url, error } = await storageService.uploadFile(file, 'event-assets');
                                if (error) throw error;
                                if (url && editor && selectedImage) {
                                    editor.chain().focus().updateAttributes('image', { src: url }).run();
                                }
                            } catch (error) {
                                console.error('Error uploading cropped image:', error);
                                alert('Failed to update image');
                            }
                        }}
                    />
                )
            }
        </div >
    );
});

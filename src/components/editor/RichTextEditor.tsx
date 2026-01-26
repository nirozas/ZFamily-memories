import React, { useRef, useState, useEffect } from 'react';
import { Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, Maximize2, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

interface RichTextEditorProps {
    content: string;
    onChange: (content: string) => void;
    onBlur?: () => void;
    style?: React.CSSProperties;
    className?: string;
    autoFocus?: boolean;
    onOpenProEditor?: () => void;
}

const FONTS = [
    { name: 'Playfair Display', family: "'Playfair Display', serif" },
    { name: 'Cormorant', family: "'Cormorant Garamond', serif" },
    { name: 'EB Garamond', family: "'EB Garamond', serif" },
    { name: 'Cinzel', family: "'Cinzel', serif" },
    { name: 'Libre Baskerville', family: "'Libre Baskerville', serif" },
    { name: 'Inter', family: "'Inter', sans-serif" },
    { name: 'Montserrat', family: "'Montserrat', sans-serif" },
    { name: 'Outfit', family: "'Outfit', sans-serif" },
    { name: 'Space Grotesk', family: "'Space Grotesk', sans-serif" },
    { name: 'Plus Jakarta', family: "'Plus Jakarta Sans', sans-serif" }
];

export function RichTextEditor({ content, onChange, onBlur, style, className, autoFocus, onOpenProEditor }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [toolbarPos, setToolbarPos] = useState<{ top: number, left: number } | null>(null);
    const [showToolbar, setShowToolbar] = useState(false);
    const [showFontMenu, setShowFontMenu] = useState(false);

    // Initial content population
    useEffect(() => {
        if (editorRef.current && content !== editorRef.current.innerHTML) {
            if (editorRef.current.innerHTML === '') {
                editorRef.current.innerHTML = content;
            }
        }
    }, []);

    useEffect(() => {
        if (autoFocus && editorRef.current) {
            editorRef.current.focus();
            const range = document.createRange();
            range.selectNodeContents(editorRef.current);
            const sel = window.getSelection();
            sel?.removeAllRanges();
            sel?.addRange(range);
        }
    }, [autoFocus]);

    // Handle Selection for Bubble Menu
    useEffect(() => {
        const handleSelectionChange = () => {
            if (!editorRef.current) return;

            const selection = window.getSelection();
            if (selection && !selection.isCollapsed && editorRef.current.contains(selection.anchorNode)) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();

                setToolbarPos({
                    top: rect.top - 50,
                    left: rect.left + (rect.width / 2)
                });
                setShowToolbar(true);
            } else {
                setShowToolbar(false);
                setShowFontMenu(false);
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        return () => document.removeEventListener('selectionchange', handleSelectionChange);
    }, []);

    const exec = (command: string, value: string = '') => {
        document.execCommand(command, false, value);
        if (editorRef.current) {
            onChange(editorRef.current.innerHTML);
        }
    };

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        onChange(e.currentTarget.innerHTML);
    };

    return (
        <div className="relative w-full h-full group/editor">
            {showToolbar && toolbarPos && (
                <div
                    className="fixed z-[99999] flex items-center gap-0.5 bg-gray-900 border border-white/10 text-white backdrop-blur-xl rounded-xl shadow-2xl p-1 animate-in fade-in slide-in-from-bottom-2 duration-200"
                    style={{ top: toolbarPos.top, left: toolbarPos.left, transform: 'translateX(-50%)' }}
                    onMouseDown={(e) => e.preventDefault()}
                >
                    {/* Font Family Selector */}
                    <div className="relative">
                        <button
                            onClick={() => setShowFontMenu(!showFontMenu)}
                            className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-white/10 rounded-lg text-[11px] font-medium transition-colors"
                        >
                            Font <ChevronDown className="w-3 h-3" />
                        </button>

                        {showFontMenu && (
                            <div className="absolute bottom-full mb-2 left-0 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-2xl p-1 max-h-60 overflow-y-auto overflow-x-hidden">
                                {FONTS.map(font => (
                                    <button
                                        key={font.name}
                                        onClick={() => {
                                            exec('fontName', font.family);
                                            setShowFontMenu(false);
                                        }}
                                        className="w-full text-left px-3 py-2 hover:bg-white/10 rounded-lg text-xs transition-colors"
                                        style={{ fontFamily: font.family }}
                                    >
                                        {font.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="w-px h-4 bg-white/10 mx-1" />

                    <button onClick={() => exec('bold')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Bold"><Bold className="w-4 h-4" /></button>
                    <button onClick={() => exec('italic')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Italic"><Italic className="w-4 h-4" /></button>
                    <button onClick={() => exec('underline')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Underline"><Underline className="w-4 h-4" /></button>

                    <div className="w-px h-4 bg-white/10 mx-1" />

                    <button onClick={() => exec('justifyLeft')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Align Left"><AlignLeft className="w-4 h-4" /></button>
                    <button onClick={() => exec('justifyCenter')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Align Center"><AlignCenter className="w-4 h-4" /></button>
                    <button onClick={() => exec('justifyRight')} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Align Right"><AlignRight className="w-4 h-4" /></button>

                    {onOpenProEditor && (
                        <>
                            <div className="w-px h-4 bg-white/10 mx-1" />
                            <button onClick={onOpenProEditor} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-catalog-accent" title="Detailed Editor"><Maximize2 className="w-4 h-4" /></button>
                        </>
                    )}
                </div>
            )}

            <div
                ref={editorRef}
                contentEditable
                spellCheck={true}
                onInput={handleInput}
                onBlur={onBlur}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
                className={cn(
                    "w-full h-full outline-none empty:before:content-[attr(placeholder)] empty:before:text-gray-400 cursor-text",
                    "selection:bg-catalog-accent/30 selection:text-catalog-text",
                    className
                )}
                style={{
                    ...style,
                    whiteSpace: 'pre-wrap',
                    overflowWrap: 'break-word',
                    outline: 'none'
                }}
            />
        </div>
    );
}

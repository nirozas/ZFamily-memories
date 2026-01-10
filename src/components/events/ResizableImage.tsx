import { useState, useRef, useCallback } from 'react';
import { Trash2, Move, ZoomIn, ZoomOut, RotateCw, Crop, X } from 'lucide-react';

interface ResizableImageProps {
    src: string;
    onDelete: () => void;
    onInsert: () => void;
}

export function ResizableImage({ src, onDelete, onInsert }: ResizableImageProps) {
    const [isSelected, setIsSelected] = useState(false);
    const [size, setSize] = useState({ width: 100, height: 100 });
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const startPos = useRef({ x: 0, y: 0, width: 0, height: 0 });

    const handleMouseDown = useCallback((e: React.MouseEvent, corner: string) => {
        e.preventDefault();
        e.stopPropagation();
        setIsResizing(true);
        startPos.current = {
            x: e.clientX,
            y: e.clientY,
            width: size.width,
            height: size.height
        };

        const handleMouseMove = (moveEvent: MouseEvent) => {
            const deltaX = moveEvent.clientX - startPos.current.x;
            const deltaY = moveEvent.clientY - startPos.current.y;

            let newWidth = startPos.current.width;
            let newHeight = startPos.current.height;

            if (corner.includes('e')) newWidth += deltaX;
            if (corner.includes('w')) newWidth -= deltaX;
            if (corner.includes('s')) newHeight += deltaY;
            if (corner.includes('n')) newHeight -= deltaY;

            // Maintain aspect ratio and min size
            newWidth = Math.max(60, newWidth);
            newHeight = Math.max(60, newHeight);

            setSize({ width: newWidth, height: newHeight });
        };

        const handleMouseUp = () => {
            setIsResizing(false);
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    }, [size]);

    return (
        <div
            ref={containerRef}
            className="relative group"
            style={{ width: `${size.width}%`, height: 'auto' }}
        >
            {/* Image Container */}
            <div
                className={`
                    relative overflow-hidden rounded-lg transition-all duration-200
                    ${isSelected ? 'ring-2 ring-catalog-accent ring-offset-2' : 'hover:ring-1 hover:ring-catalog-accent/30'}
                `}
                onClick={() => setIsSelected(!isSelected)}
            >
                <img
                    src={src}
                    alt=""
                    className="w-full h-auto object-cover cursor-pointer"
                    draggable={false}
                />

                {/* Ribbon Toolbar - Shows when selected */}
                {isSelected && (
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white rounded-lg shadow-xl border border-catalog-accent/20 p-1.5 z-20 animate-slide-down">
                        <button
                            onClick={(e) => { e.stopPropagation(); onInsert(); }}
                            className="p-2 hover:bg-catalog-accent/10 rounded-md transition-colors group/btn"
                            title="Insert into story"
                        >
                            <Move className="w-4 h-4 text-catalog-accent" />
                        </button>
                        <div className="w-px h-6 bg-catalog-accent/10" />
                        <button
                            onClick={(e) => { e.stopPropagation(); setSize(s => ({ ...s, width: Math.min(100, s.width + 10) })); }}
                            className="p-2 hover:bg-catalog-accent/10 rounded-md transition-colors"
                            title="Increase size"
                        >
                            <ZoomIn className="w-4 h-4 text-catalog-text/60" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setSize(s => ({ ...s, width: Math.max(30, s.width - 10) })); }}
                            className="p-2 hover:bg-catalog-accent/10 rounded-md transition-colors"
                            title="Decrease size"
                        >
                            <ZoomOut className="w-4 h-4 text-catalog-text/60" />
                        </button>
                        <div className="w-px h-6 bg-catalog-accent/10" />
                        <button
                            onClick={(e) => { e.stopPropagation(); /* Future: rotate */ }}
                            className="p-2 hover:bg-catalog-accent/10 rounded-md transition-colors opacity-40 cursor-not-allowed"
                            title="Rotate (coming soon)"
                        >
                            <RotateCw className="w-4 h-4 text-catalog-text/60" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); /* Future: crop */ }}
                            className="p-2 hover:bg-catalog-accent/10 rounded-md transition-colors opacity-40 cursor-not-allowed"
                            title="Crop (coming soon)"
                        >
                            <Crop className="w-4 h-4 text-catalog-text/60" />
                        </button>
                        <div className="w-px h-6 bg-catalog-accent/10" />
                        <button
                            onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            className="p-2 hover:bg-red-50 rounded-md transition-colors"
                            title="Delete image"
                        >
                            <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); setIsSelected(false); }}
                            className="p-2 hover:bg-catalog-stone/20 rounded-md transition-colors ml-1"
                            title="Close"
                        >
                            <X className="w-4 h-4 text-catalog-text/40" />
                        </button>
                    </div>
                )}

                {/* Resize Handles - Show on hover or when selected */}
                <div className={`absolute inset-0 pointer-events-none ${isSelected || isResizing ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                    {/* Corner handles */}
                    <div
                        className="absolute -top-1 -left-1 w-3 h-3 bg-white border-2 border-catalog-accent rounded-sm cursor-nw-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform"
                        onMouseDown={(e) => handleMouseDown(e, 'nw')}
                    />
                    <div
                        className="absolute -top-1 -right-1 w-3 h-3 bg-white border-2 border-catalog-accent rounded-sm cursor-ne-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform"
                        onMouseDown={(e) => handleMouseDown(e, 'ne')}
                    />
                    <div
                        className="absolute -bottom-1 -left-1 w-3 h-3 bg-white border-2 border-catalog-accent rounded-sm cursor-sw-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform"
                        onMouseDown={(e) => handleMouseDown(e, 'sw')}
                    />
                    <div
                        className="absolute -bottom-1 -right-1 w-3 h-3 bg-white border-2 border-catalog-accent rounded-sm cursor-se-resize pointer-events-auto shadow-sm hover:scale-125 transition-transform"
                        onMouseDown={(e) => handleMouseDown(e, 'se')}
                    />
                </div>

                {/* Quick action hint on hover when not selected */}
                {!isSelected && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 text-white text-xs font-medium bg-black/60 px-2 py-1 rounded transition-opacity">
                            Click to edit
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
}

import { Button } from '../ui/Button';
import { Copy, Trash2, Layers, Pencil } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FloatingToolbarProps {
    onAction: (action: string) => void;
    isVisible: boolean;
    type: 'image' | 'text' | 'video';
    className?: string;
    width?: number;
    pageWidth?: number;
    onResize?: (delta: number) => void;
}

export function FloatingToolbar({ onAction, isVisible, type, className, width, pageWidth, onResize }: FloatingToolbarProps) {
    if (!isVisible) return null;

    const percentage = width && pageWidth ? Math.round((width / pageWidth) * 100) : 0;

    return (
        <div
            className={cn(
                "absolute -top-12 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-white rounded-lg shadow-2xl border border-catalog-accent/20 p-1 z-[100] animate-in fade-in slide-in-from-bottom-2 duration-200",
                className
            )}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Size Controls */}
            {onResize && percentage > 0 && (
                <>
                    <div className="flex items-center bg-catalog-accent/5 rounded px-2 py-0.5 gap-2 mr-1">
                        <button
                            onClick={() => onResize(-0.1)}
                            className="text-xs font-bold hover:text-catalog-accent transition-colors w-4"
                            title="Descrease size 10%"
                        >
                            -
                        </button>
                        <span className="text-[9px] font-bold text-catalog-accent min-w-[24px] text-center">
                            {percentage}%
                        </span>
                        <button
                            onClick={() => onResize(0.1)}
                            className="text-xs font-bold hover:text-catalog-accent transition-colors w-4"
                            title="Increase size 10%"
                        >
                            +
                        </button>
                    </div>
                    <div className="w-px h-4 bg-catalog-accent/10 mx-0.5" />
                </>
            )}

            <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction('duplicate')}
                className="h-8 w-8 p-0 hover:bg-catalog-accent/5 text-catalog-text"
                title="Duplicate"
            >
                <Copy className="w-4 h-4" />
            </Button>

            <div className="w-px h-4 bg-catalog-accent/10 mx-0.5" />

            <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction('mask')}
                className="h-8 px-2 hover:bg-catalog-accent/5 text-catalog-text text-[10px] font-bold uppercase tracking-wider gap-2"
            >
                {type === 'text' ? <Pencil className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
                {type === 'text' ? 'Edit' : 'Crop'}
            </Button>

            <div className="w-px h-4 bg-catalog-accent/10 mx-0.5" />

            <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction('front')}
                className="h-8 w-8 p-0 hover:bg-catalog-accent/5 text-catalog-text"
                title="Bring to Front"
            >
                <Layers className="w-4 h-4" />
            </Button>

            <div className="w-px h-4 bg-catalog-accent/10 mx-0.5" />

            <Button
                variant="ghost"
                size="sm"
                onClick={() => onAction('delete')}
                className="h-8 w-8 p-0 hover:bg-red-50 text-red-500"
                title="Delete"
            >
                <Trash2 className="w-4 h-4" />
            </Button>
        </div>
    );
}

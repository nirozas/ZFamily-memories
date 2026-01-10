import { Copy, Trash2, Maximize2, Minimize2 } from 'lucide-react';

interface ContextMenuProps {
    x: number;
    y: number;
    onAction: (action: string) => void;
    onClose: () => void;
}

export function ContextMenu({ x, y, onAction, onClose }: ContextMenuProps) {
    return (
        <div
            className="fixed z-[9999] bg-white border border-catalog-accent/20 rounded-lg shadow-xl py-1 min-w-[160px] animate-in fade-in zoom-in duration-100"
            style={{ left: x, top: y }}
            onMouseLeave={onClose}
        >
            <button
                onClick={() => { onAction('duplicate'); onClose(); }}
                className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-catalog-accent/5 text-catalog-text"
            >
                <Copy className="w-3.5 h-3.5" /> Duplicate
            </button>

            <div className="h-px bg-catalog-accent/10 my-1" />

            <button
                onClick={() => { onAction('front'); onClose(); }}
                className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-catalog-accent/5 text-catalog-text"
            >
                <Maximize2 className="w-3.5 h-3.5" /> Bring to Front
            </button>
            <button
                onClick={() => { onAction('back'); onClose(); }}
                className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-catalog-accent/5 text-catalog-text"
            >
                <Minimize2 className="w-3.5 h-3.5" /> Send to Back
            </button>

            <div className="h-px bg-catalog-accent/10 my-1" />

            <button
                onClick={() => { onAction('delete'); onClose(); }}
                className="w-full px-3 py-2 text-xs flex items-center gap-2 hover:bg-red-50 text-red-600"
            >
                <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
        </div>
    );
}

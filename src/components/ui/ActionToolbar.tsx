import { Edit3, Trash2, Share2, Printer } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ActionToolbarProps {
    onEdit?: () => void;
    onDelete?: () => void;
    onShare?: () => void;
    onPrint?: () => void;
    className?: string;
    variant?: 'dark' | 'light';
    showLabels?: boolean;
}

export function ActionToolbar({
    onEdit,
    onDelete,
    onShare,
    onPrint,
    className,
    variant = 'light',
    showLabels = false
}: ActionToolbarProps) {
    const baseIconClass = cn(
        "p-2 rounded-full transition-all duration-200 flex items-center gap-2",
        variant === 'light'
            ? "hover:bg-catalog-accent/10 text-catalog-text/60 hover:text-catalog-accent"
            : "hover:bg-white/10 text-white/60 hover:text-white"
    );

    const handleAction = (e: React.MouseEvent, action?: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        action?.();
    };

    return (
        <div className={cn("flex items-center gap-1", className)}>
            {onEdit && (
                <button
                    onClick={(e) => handleAction(e, onEdit)}
                    className={baseIconClass}
                    title="Edit"
                >
                    <Edit3 className="w-4 h-4" />
                    {showLabels && <span className="text-xs font-medium">Edit</span>}
                </button>
            )}
            {onShare && (
                <button
                    onClick={(e) => handleAction(e, onShare)}
                    className={baseIconClass}
                    title="Share"
                >
                    <Share2 className="w-4 h-4" />
                    {showLabels && <span className="text-xs font-medium">Share</span>}
                </button>
            )}
            {onPrint && (
                <button
                    onClick={(e) => handleAction(e, onPrint)}
                    className={baseIconClass}
                    title="Print"
                >
                    <Printer className="w-4 h-4" />
                    {showLabels && <span className="text-xs font-medium">Print</span>}
                </button>
            )}
            <div className="w-px h-4 bg-catalog-accent/10 mx-1" />
            {onDelete && (
                <button
                    onClick={(e) => handleAction(e, onDelete)}
                    className={cn(baseIconClass, "hover:bg-red-50 text-red-400 hover:text-red-500")}
                    title="Delete"
                >
                    <Trash2 className="w-4 h-4" />
                    {showLabels && <span className="text-xs font-medium">Delete</span>}
                </button>
            )}
        </div>
    );
}

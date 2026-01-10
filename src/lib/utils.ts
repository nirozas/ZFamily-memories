import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getFilterStyle(filterType?: string) {
    if (!filterType) return {};
    switch (filterType) {
        case 'cartoon': return { filter: 'saturate(200%) contrast(120%) brightness(110%)' };
        case 'pencil': return { filter: 'grayscale(100%) contrast(150%) brightness(120%)' };
        case 'watercolor': return { filter: 'saturate(150%) blur(1px) contrast(110%)' };
        case 'portrait': return { filter: 'brightness(105%) contrast(105%) sepia(10%)' };
        case 'auto-touch': return { filter: 'contrast(110%) brightness(105%)' };
        default: return {};
    }
}

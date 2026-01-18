import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { Image as ImageIcon } from 'lucide-react';

// Layout configuration types
interface LayoutFrame {
    left: number;
    top: number;
    width: number;
    height: number;
    rotation?: number;
    z_index: number;
}

interface AlbumLayout {
    id: string;
    name: string;
    category: string;
    image_count: number;
    aspect_ratio: string;
    dimension_type: string;
    is_spread: boolean;
    backgroundImage?: string;
    config: LayoutFrame[];
}

interface DynamicLayoutRendererProps {
    layoutId?: string;
    layout?: AlbumLayout;
    pageSize: 'A4-Portrait' | 'A4-Landscape' | 'Square' | 'A3-Landscape';
    onDropAsset?: (slotIndex: number, asset: any) => void;
    className?: string;
}

/**
 * DynamicLayoutRenderer
 * 
 * Implements a unit-agnostic layout rendering system using percentage-based positioning.
 * Treats the album page as a relative container and image frames as absolute children.
 */
export const DynamicLayoutRenderer: React.FC<DynamicLayoutRendererProps> = ({
    layoutId,
    layout: initialLayout,
    pageSize,
    onDropAsset,
    className
}) => {
    const [layout, setLayout] = useState<AlbumLayout | null>(initialLayout || null);
    const [loading, setLoading] = useState(!initialLayout && !!layoutId);

    useEffect(() => {
        if (initialLayout) {
            setLayout(initialLayout);
            return;
        }

        if (!layoutId) return;

        const fetchLayout = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('album_layouts')
                    .select('*')
                    .eq('id', layoutId)
                    .single();

                if (data && !error) {
                    setLayout(data as unknown as AlbumLayout);
                }
            } catch (err) {
                console.error("Failed to fetch layout:", err);
            } finally {
                setLoading(true);
            }
        };
        fetchLayout();
    }, [layoutId, initialLayout]);

    // Aspect Ratio mapping based on A-series and Square standards
    const getAspectRatio = () => {
        switch (pageSize) {
            case 'A4-Portrait': return '1 / 1.414';
            case 'A4-Landscape': return '1.414 / 1';
            case 'Square': return '1 / 1';
            case 'A3-Landscape': return '1.414 / 1';
            default: return '1 / 1';
        }
    };

    if (loading) {
        return (
            <div className="w-full aspect-square bg-gray-50 animate-pulse flex items-center justify-center rounded-lg">
                <div className="w-8 h-8 border-2 border-catalog-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!layout) {
        return (
            <div className="w-full aspect-square bg-gray-50 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-200">
                <span className="text-xs text-gray-400">No Layout Selected</span>
            </div>
        );
    }

    return (
        <div
            className={cn(
                "dynamic-layout-container shadow-2xl bg-white transition-all duration-500",
                className
            )}
            style={{
                position: 'relative',
                width: '100%',
                aspectRatio: getAspectRatio(),
                overflow: 'hidden'
            }}
        >
            {layout.config.map((frame, index) => (
                <div
                    key={index}
                    className="layout-frame group transition-all duration-300 hover:z-10"
                    style={{
                        position: 'absolute',
                        top: `${frame.top}%`,
                        left: `${frame.left}%`,
                        width: `${frame.width}%`,
                        height: `${frame.height}%`,
                        zIndex: frame.z_index,
                        backgroundColor: 'rgba(241, 245, 249, 0.8)',
                        border: '1px dashed rgba(203, 213, 225, 1)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        transform: frame.rotation ? `rotate(${frame.rotation}deg)` : 'none'
                    }}
                    onDragOver={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.backgroundColor = 'rgba(var(--catalog-accent-rgb), 0.05)';
                        e.currentTarget.style.borderColor = 'var(--catalog-accent)';
                    }}
                    onDragLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'rgba(241, 245, 249, 0.8)';
                        e.currentTarget.style.borderColor = 'rgba(203, 213, 225, 1)';
                    }}
                    onDrop={(e) => {
                        e.preventDefault();
                        e.currentTarget.style.backgroundColor = 'rgba(241, 245, 249, 0.8)';
                        const assetData = e.dataTransfer.getData('asset');
                        if (assetData && onDropAsset) {
                            try {
                                onDropAsset(index, JSON.parse(assetData));
                            } catch (err) {
                                console.error("Drop error:", err);
                            }
                        }
                    }}
                >
                    {/* Placeholder Content */}
                    <div className="flex flex-col items-center gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
                        <ImageIcon className="w-4 h-4" />
                        <span className="text-[8px] font-bold uppercase tracking-tighter">Slot {index + 1}</span>
                    </div>

                    {/* Interactive Overlay */}
                    <div className="absolute inset-0 bg-catalog-accent/0 group-hover:bg-catalog-accent/5 transition-colors pointer-events-none" />
                </div>
            ))}

            {/* Bleed Guide Simulation */}
            <div className="absolute inset-0 border-[3mm] border-dotted border-red-500/10 pointer-events-none z-[100]" />
        </div>
    );
};

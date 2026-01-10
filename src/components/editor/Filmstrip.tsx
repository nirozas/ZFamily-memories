import { Plus, GripVertical } from 'lucide-react';
import { useAlbum, type Page } from '../../contexts/AlbumContext';
import { cn } from '../../lib/utils';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
    SortableContext,
    sortableKeyboardCoordinates,
    horizontalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortablePageProps {
    page: Page;
    index: number;
    isSelected: boolean;
    isSpreadView: boolean;
    spread: Page[];
    onPageSelect: (index: number) => void;
}

function SortablePageThumbnail({ page, index, isSelected, isSpreadView, spread, onPageSelect }: SortablePageProps) {
    const isCover = page.layoutTemplate === 'cover-front' || page.layoutTemplate === 'cover-back';

    const { album } = useAlbum();
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({
        id: page.id,
        disabled: isCover || album?.config.isLocked // Disable dragging for covers or if locked
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 50 : 'auto',
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex flex-col gap-1 items-center group relative"
        >
            <div
                className={cn(
                    "flex items-center transition-all",
                    isSpreadView && spread.length > 1 ? "gap-0.5" : ""
                )}
            >
                {spread.map((spreadPage, idx) => (
                    <div
                        key={spreadPage.id}
                        onClick={(e) => {
                            e.stopPropagation();
                            // Select the specific page index
                            // index is the start of the spread, idx is 0 or 1
                            onPageSelect(index + idx);
                        }}
                        className={cn(
                            "relative flex-shrink-0 w-20 h-12 bg-white border-2 cursor-pointer transition-all",
                            isSelected
                                ? "border-catalog-accent shadow-lg z-10 scale-105"
                                : "border-catalog-accent/20 hover:border-catalog-accent/50",
                            isSpreadView && spread.length > 1 && idx === 0 && "rounded-l-sm",
                            isSpreadView && spread.length > 1 && idx === 1 && "rounded-r-sm",
                            (!isSpreadView || spread.length === 1) && "rounded-sm"
                        )}
                        style={{ backgroundColor: spreadPage.backgroundColor }}
                    >
                        {/* Page Number */}
                        <div className="absolute bottom-1 left-1 text-[9px] font-bold text-catalog-accent bg-white/90 px-1 py-0.5 rounded shadow-sm border border-catalog-accent/10">
                            {spreadPage.pageNumber}
                        </div>

                        {/* Mini Preview */}
                        {spreadPage.assets.slice(0, 3).map((asset, i) => (
                            <div
                                key={asset.id}
                                className="absolute w-5 h-5 bg-catalog-accent/10 rounded-xs"
                                style={{
                                    left: `${20 + i * 15}%`,
                                    top: `${30 + i * 10}%`,
                                }}
                            />
                        ))}

                        {/* Drag Handle for regular pages */}
                        {!isCover && !album?.config.isLocked && (
                            <div
                                className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing p-1"
                                {...attributes}
                                {...listeners}
                            >
                                <GripVertical className="w-3 h-3 text-catalog-accent/30" />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <span className={cn(
                "text-[9px] font-bold uppercase tracking-widest",
                isSelected ? "text-catalog-accent" : "text-catalog-text/40"
            )}>
                {isSpreadView && spread.length > 1
                    ? `Spread ${Math.floor(index / 2) + 1}`
                    : page.layoutTemplate === 'cover-front' ? 'Front' : page.layoutTemplate === 'cover-back' ? 'Back' : 'Page ' + page.pageNumber}
            </span>
        </div>
    );
}

export function Filmstrip() {
    const {
        album,
        currentPageIndex,
        setCurrentPageIndex,
        addPage,
        getSpread,
        reorderPages
    } = useAlbum();

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

    if (!album) return null;

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = album.pages.findIndex((p) => p.id === active.id);
            const newIndex = album.pages.findIndex((p) => p.id === over.id);

            reorderPages(oldIndex, newIndex);
        }
    };

    return (
        <div className="h-24 bg-white border-t border-catalog-accent/20 flex items-center px-4 gap-4">
            {/* Page Thumbnails */}
            <div className="flex-1 flex items-center gap-4 overflow-x-auto py-2 px-4 no-scrollbar">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={album.pages.map(p => p.id)}
                        strategy={horizontalListSortingStrategy}
                    >
                        {album.pages.map((page, index) => {
                            const isSpreadView = album.config.useSpreadView;
                            const spread = getSpread(index);
                            const isFirstInSpread = spread[0].id === page.id;
                            const isSelected = spread.some(p => album.pages[currentPageIndex]?.id === p.id);

                            // If in spread view, only render the first page of each spread as a container
                            if (isSpreadView && !isFirstInSpread) return null;

                            return (
                                <SortablePageThumbnail
                                    key={page.id}
                                    page={page}
                                    index={index}
                                    isSelected={isSelected}
                                    isSpreadView={isSpreadView}
                                    spread={spread}
                                    // Pass direct function to allow child to calculate index
                                    onPageSelect={(idx: number) => setCurrentPageIndex(idx)}
                                />
                            );
                        })}
                    </SortableContext>
                </DndContext>
            </div>

            {/* Add Page Button */}
            <button
                disabled={album.config.isLocked}
                onClick={() => addPage()}
                className={cn(
                    "flex-shrink-0 w-20 h-16 border-2 border-dashed border-catalog-accent/40 rounded-sm flex flex-col items-center justify-center gap-1 text-catalog-accent/60 hover:border-catalog-accent hover:text-catalog-accent hover:bg-catalog-accent/5 transition-colors",
                    album.config.isLocked && "opacity-50 cursor-not-allowed grayscale"
                )}
            >
                <Plus className="w-5 h-5" />
                <span className="text-[10px]">Add</span>
            </button>
        </div>
    );
}


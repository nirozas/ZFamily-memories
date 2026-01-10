import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import HTMLFlipBook from 'react-pageflip';
import { ChevronLeft, ChevronRight, X, Maximize2, Minimize2, Download, FileText, Globe } from 'lucide-react';
import { cn } from '../../lib/utils';
import { type Album, type Page, type Asset } from '../../contexts/AlbumContext';
import { printService } from '../../services/printService';
import { motion, AnimatePresence } from 'framer-motion';

interface FlipbookViewerProps {
    pages: Page[];
    album?: Album;
    onClose: () => void;
}

export function FlipbookViewer({ pages, album, onClose }: FlipbookViewerProps) {
    // const [isFlipping, setIsFlipping] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportDpi, setExportDpi] = useState<300 | 450 | 600>(300);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const [zoom, setZoom] = useState(1);

    // Check if we have odd or even pages to determine back cover handling
    // If we want a dedicated back cover single page, total pages should be even?
    // With showCover: true:
    // Page 0: Cover (Right)
    // Page 1: Left - Page 2: Right
    // ...
    // If last page is even index (e.g. 0, ... 4), it's a cover? No, typical logic:
    // If showCover is true, the first item is single.
    // If the total count is even, the last item is single (Back Cover).
    // If total count is odd, the last item is 'Left' side of a spread with empty right?
    // User requested: "Back Cover" layout. Usually implies distinct back cover.

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const bookRef = useRef<any>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const pageRefs = useRef<(HTMLElement | null)[]>([]);

    const title = album?.title || 'Untitled Album';
    const dimensions = album?.config?.dimensions || { width: 1000, height: 700 };

    // Auto-fit initial zoom and recalculate on resize
    useEffect(() => {
        const calculateFitZoom = () => {
            const container = document.getElementById('flipbook-container');
            if (!container) return;

            const { width: containerW, height: containerH } = container.getBoundingClientRect();

            // For spread view on desktop, we show 2 pages side by side
            // For mobile, we show single pages
            // With showCover and desktop, it usually takes width * 2 space centered.
            const bookW = isMobile ? dimensions.width : dimensions.width * 2;
            const bookH = dimensions.height;

            // Calculate zoom to fit both dimensions, with some padding
            const zoomW = (containerW - 100) / bookW;
            const zoomH = (containerH - 100) / bookH;

            // Use the smaller zoom to ensure everything fits
            // Limit between 0.2 (20%) and 1.5 (150%) for reasonable viewing
            const initialZoom = Math.max(0.2, Math.min(zoomW, zoomH, 1.5));

            setZoom(initialZoom);
        };

        // Initial calculation with small delay to ensure container is rendered
        const timer = setTimeout(calculateFitZoom, 200);

        // Recalculate on window resize
        window.addEventListener('resize', calculateFitZoom);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', calculateFitZoom);
        };
    }, [isMobile, dimensions.width, dimensions.height, isFullscreen]);

    useEffect(() => {
        // Pre-load the sound
        const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3');
        // Or user provided: https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3
        audio.volume = 0.4;
        audioRef.current = audio;
    }, []);

    const playFlipSound = useCallback(() => {
        if (audioRef.current) {
            const sound = audioRef.current.cloneNode() as HTMLAudioElement;
            sound.volume = 0.5; // Increased volume
            sound.play().catch((e) => console.log('Audio play failed', e));
        }
    }, []);

    const onFlip = useCallback((e: any) => {
        setCurrentPageIndex(e.data);
    }, []);

    const onChangeState = useCallback((e: any) => {
        if (e.data === 'flipping') {
            playFlipSound();
        }
    }, [playFlipSound]);

    const goToNext = () => {
        if (bookRef.current) {
            bookRef.current.pageFlip().flipNext();
        }
    };

    const goToPrev = () => {
        if (bookRef.current) {
            bookRef.current.pageFlip().flipPrev();
        }
    };

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') goToNext();
            if (e.key === 'ArrowLeft') goToPrev();
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className={cn(
            "fixed inset-0 z-[100] flex flex-col transition-all duration-500",
            // Use black background for the stage as requested
            "bg-[#000000]",
            isFullscreen ? "p-0" : "p-4 md:p-8"
        )}>
            {/* Header */}
            <header className="flex items-center justify-between h-16 px-6 text-white z-[110] bg-black/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div>
                        <h2 className="font-serif text-xl tracking-tight leading-none mb-1 text-gray-100">{title}</h2>
                        {/* Calculate spread info approximately */}
                        <p className="text-[10px] uppercase tracking-[0.2em] text-white/40 font-sans">
                            Page {currentPageIndex + 1} of {pages.length}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Button
                            variant="primary"
                            size="sm"
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            className="bg-catalog-accent hover:bg-catalog-accent/90 gap-2 shadow-lg shadow-catalog-accent/20 border border-white/10"
                        >
                            <Download className="w-4 h-4" />
                            {isExporting ? 'Exporting...' : 'Export'}
                        </Button>

                        <AnimatePresence>
                            {showExportMenu && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                    className="absolute right-0 mt-2 w-56 bg-zinc-900 rounded-xl shadow-2xl border border-white/10 py-2 overflow-hidden z-[120]"
                                >
                                    <div className="px-4 py-2 border-b border-white/5 mb-2">
                                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest">Select Quality</p>
                                    </div>
                                    <div className="flex px-2 gap-1 mb-2">
                                        {[300, 450, 600].map((dpi) => (
                                            <button
                                                key={dpi}
                                                onClick={() => setExportDpi(dpi as any)}
                                                className={cn(
                                                    "flex-1 py-1 text-[10px] font-bold rounded-md transition-all",
                                                    exportDpi === dpi ? "bg-catalog-accent text-white" : "hover:bg-white/10 text-white/60"
                                                )}
                                            >
                                                {dpi}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        disabled={isExporting}
                                        onClick={async () => {
                                            setShowExportMenu(false);
                                            setIsExporting(true);
                                            const validRefs = pageRefs.current.filter(Boolean) as HTMLElement[];
                                            const scaleFactor = exportDpi === 300 ? 4 : exportDpi === 450 ? 6 : 8;
                                            await printService.exportToPDF(validRefs, title || 'Family_Album', scaleFactor);
                                            setIsExporting(false);
                                        }}
                                        className="w-full px-4 py-2 hover:bg-white/5 flex items-center gap-3 text-white text-left transition-colors"
                                    >
                                        <FileText className="w-4 h-4 text-red-400" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">Interactive PDF</span>
                                            <span className="text-[10px] text-white/40">Visual fidelity</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={async () => {
                                            setShowExportMenu(false);
                                            await printService.exportToHTML5({ title, pages });
                                        }}
                                        className="w-full px-4 py-2 hover:bg-white/5 flex items-center gap-3 text-white text-left transition-colors"
                                    >
                                        <Globe className="w-4 h-4 text-blue-400" />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium">HTML5 Bundle</span>
                                            <span className="text-[10px] text-white/40">Offline interactive</span>
                                        </div>
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    <button
                        onClick={() => setIsFullscreen(!isFullscreen)}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
                    >
                        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                    </button>
                </div>
            </header>

            {/* Book Container with Zoom */}
            <div id="flipbook-container" className="flex-1 flex items-center justify-center p-4 overflow-hidden relative">
                <div
                    style={{
                        transform: `scale(${zoom})`,
                        transformOrigin: 'center center',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                >
                    <HTMLFlipBook
                        width={dimensions.width}
                        height={dimensions.height}
                        size="fixed"
                        minWidth={dimensions.width}
                        maxWidth={dimensions.width}
                        minHeight={dimensions.height}
                        maxHeight={dimensions.height}
                        showCover={true} // Key: First and last page are treated as covers
                        usePortrait={isMobile} // Force spread view on desktop, single on mobile
                        mobileScrollSupport={false} // Prevents glitchy scrolling on touch
                        onFlip={onFlip}
                        onChangeState={onChangeState}
                        className="shadow-[0_0_100px_rgba(0,0,0,0.8)]" // Depth shadow on black bg
                        style={{ margin: '0 auto' }}
                        ref={bookRef}
                        flippingTime={800} // Slightly slower/smoother flip
                        useMouseEvents={true}
                        swipeDistance={30}
                        showPageCorners={true}
                        disableFlipByClick={false}
                        drawShadow={true}
                        maxShadowOpacity={0.5} // Realistic shadow intensity
                        autoSize={false} // Disable auto-resizing of pages
                        clickEventForward={true}
                    >
                        {pages.map((page, index) => {
                            const isFrontCover = index === 0;
                            const isBackCover = index === pages.length - 1;
                            const isCover = isFrontCover || isBackCover;

                            // Density: 'hard' for covers, 'soft' for inner pages
                            const density = isCover ? 'hard' : 'soft';

                            // Side Calculation:
                            // With showCover=true:
                            // index 0 -> Cover (displayed alone, acts like recto/right)
                            // index 1 -> Left (Verso)
                            // index 2 -> Right (Recto)
                            // index 3 -> Left
                            // index 4 -> Right
                            // ...

                            // For inner pages (index > 0):
                            // odd index -> Left
                            // even index -> Right
                            let side: 'left' | 'right';
                            if (isFrontCover) {
                                side = 'right'; // Conventionally cover is on the right of specific spine
                            } else if (isBackCover) {
                                side = 'left'; // Back cover is on left when closed? No, usually single page view.
                                // In react-pageflip, standard is Spread.
                                // Just pass correct side for asset rendering logic.
                                // If index is even, it's typically Right. If odd, Left.
                                // BUT index 0 is special.
                                // Let's stick to: index % 2 !== 0 ? 'left' : 'right'
                                side = index % 2 !== 0 ? 'left' : 'right';
                            } else {
                                side = index % 2 !== 0 ? 'left' : 'right';
                            }

                            // Spillover Logic
                            let otherPage: Page | undefined;
                            if (!isCover) {
                                if (side === 'left' && pages[index + 1]) {
                                    otherPage = pages[index + 1];
                                } else if (side === 'right' && pages[index - 1]) {
                                    otherPage = pages[index - 1];
                                }
                            }

                            return (
                                <PageContent
                                    key={page.id}
                                    page={page}
                                    otherPage={otherPage}
                                    side={side}
                                    dimensions={dimensions}
                                    density={density}
                                    isCover={isCover}
                                    ref={(el: HTMLDivElement | null) => { pageRefs.current[index] = el; }}
                                />
                            );
                        })}
                    </HTMLFlipBook>
                </div>
            </div>

            {/* Compact Footer Navigation & Zoom */}
            <div className="h-14 flex items-center justify-between px-6 text-white/60 bg-black/20 backdrop-blur-sm border-t border-white/5">
                <div className="flex items-center gap-4">
                    <button
                        onClick={goToPrev}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all hover:scale-110 active:scale-95"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-200" />
                    </button>

                    <div className="flex items-center bg-white/5 rounded-full px-4 py-1.5 gap-3 border border-white/5">
                        <button
                            onClick={() => setZoom(z => Math.max(0.3, z - 0.1))}
                            className="text-lg font-bold hover:text-white transition-colors w-6"
                        >
                            -
                        </button>
                        <span className="text-sm font-bold tracking-wider min-w-[50px] text-center text-white">
                            {Math.round(zoom * 100)}%
                        </span>
                        <button
                            onClick={() => setZoom(z => Math.min(2.5, z + 0.1))}
                            className="text-lg font-bold hover:text-white transition-colors w-6"
                        >
                            +
                        </button>
                    </div>

                    <button
                        onClick={goToNext}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-all hover:scale-110 active:scale-95"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-200" />
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => {
                            const container = document.getElementById('flipbook-container');
                            if (!container) return;
                            const { width: containerW, height: containerH } = container.getBoundingClientRect();
                            const bookW = isMobile ? dimensions.width : dimensions.width * 2;
                            const bookH = dimensions.height;
                            const zoomW = (containerW - 100) / bookW;
                            const zoomH = (containerH - 100) / bookH;
                            const fitZoom = Math.max(0.2, Math.min(zoomW, zoomH, 1.5));
                            setZoom(fitZoom);
                        }}
                        className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest bg-white/5 hover:bg-white/10 rounded-full transition-colors text-gray-300"
                    >
                        Fit to Screen
                    </button>

                    <div className="hidden md:block text-[9px] font-medium tracking-[0.2em] uppercase opacity-40 text-gray-400">
                        Arrows to Flip • +/- to Zoom
                    </div>
                </div>
            </div>
        </div>
    );
}

const PageContent = forwardRef<HTMLDivElement, {
    page: Page;
    otherPage?: Page;
    side: 'left' | 'right';
    dimensions?: any;
    density?: 'hard' | 'soft';
    isCover?: boolean;
}>(({ page, otherPage, side, dimensions, density, isCover }, ref) => {

    const pageWidth = dimensions?.width || 1000;
    const pageHeight = dimensions?.height || 700;

    return (
        <div
            ref={ref}
            data-density={density}
            className={cn(
                "relative overflow-hidden select-none w-full h-full",
                "bg-[#fdfdfd]",
                // Only show inner crease shadow if NOT hard cover
                density !== 'hard' && "shadow-[inset_3px_0_20px_-7px_rgba(0,0,0,0.2)]"
            )}
            style={{
                width: `${pageWidth}px`,
                height: `${pageHeight}px`,
                backgroundColor: page.backgroundColor || '#fdfdfd',
                backgroundImage: page.layoutTemplate.includes('cover') ? 'linear-gradient(to bottom, rgba(0,0,0,0.05), transparent)' : undefined,
                border: '1px solid rgba(0,0,0,0.05)'
            }}
        >
            {/* Spillover Assets (Only for spreads/soft pages) */}
            {otherPage && density !== 'hard' && [...otherPage.assets].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((asset) => (
                <AssetDisplay
                    key={`${asset.id}-spill`}
                    asset={asset}
                    offsetX={side === 'left' ? 100 : -100}
                    dimensions={{ width: pageWidth, height: pageHeight }}
                />
            ))}

            {/* Primary Assets */}
            {[...page.assets].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0)).map((asset) => (
                <AssetDisplay
                    key={asset.id}
                    asset={asset}
                    dimensions={{ width: pageWidth, height: pageHeight }}
                />
            ))}

            {/* Page Number - Hide on covers */}
            {!isCover && (
                <div className={cn(
                    "absolute bottom-6 text-[10px] font-sans tracking-[0.3em] uppercase opacity-30",
                    side === 'left' ? "left-8" : "right-8"
                )}>
                    {page.pageNumber}
                </div>
            )}

            {/* Spine Gradient - Crease Shadow Gutter (hidden on covers) */}
            {!isCover && density !== 'hard' && (
                <div className={cn(
                    "absolute inset-y-0 w-16 pointer-events-none transition-opacity duration-500",
                    side === 'left' ? "right-0 bg-gradient-to-l from-black/20 via-black/5 to-transparent" : "left-0 bg-gradient-to-r from-black/20 via-black/5 to-transparent",
                    "opacity-100"
                )} />
            )}

            {/* Subtle "Paper" texture overlay */}
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[url('https://www.transparenttextures.com/patterns/paper.png')]" />
        </div>
    );
});

PageContent.displayName = 'PageContent';

function AssetDisplay({ asset, offsetX = 0, dimensions }: { asset: Asset; offsetX?: number; dimensions: { width: number; height: number } }) {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Calculate exact pixels to avoid percentage rounding jitter during 3D transforms
    const leftPx = ((asset.x + offsetX) / 100) * dimensions.width;
    const topPx = (asset.y / 100) * dimensions.height;
    const widthPx = (asset.width / 100) * dimensions.width;
    const heightPx = (asset.height / 100) * dimensions.height;

    const style: React.CSSProperties = {
        position: 'absolute',
        left: `${leftPx}px`,
        top: `${topPx}px`,
        width: `${widthPx}px`,
        height: `${heightPx}px`,
        transform: `rotate(${asset.rotation || 0}deg) scale(${asset.flipX ? -1 : 1}, ${asset.flipY ? -1 : 1})`,
        transformOrigin: `${(asset.pivot?.x ?? 0.5) * 100}% ${(asset.pivot?.y ?? 0.5) * 100}%`,
        zIndex: asset.zIndex || 0,
        filter: asset.filter,
        opacity: (asset.opacity ?? 100) / 100,
        willChange: 'transform', // optimizing for movement/flip
        backfaceVisibility: 'hidden', // prevent flickering
    };

    if (asset.type === 'image' || asset.type === 'frame') {
        const crop = asset.crop;
        return (
            <div style={{ ...style, overflow: 'hidden' }}>
                <img
                    src={asset.url}
                    alt=""
                    className="absolute max-w-none shadow-none"
                    style={{
                        width: crop ? `${(1 / (crop.width || 1)) * 100}%` : '100%',
                        height: crop ? `${(1 / (crop.height || 1)) * 100}%` : '100%',
                        left: crop ? `-${(crop.x || 0) * (crop.width ? 1 / crop.width : 1) * 100}%` : '0',
                        top: crop ? `-${(crop.y || 0) * (crop.height ? 1 / crop.height : 1) * 100}%` : '0',
                        objectFit: crop ? 'fill' : (asset.fitMode === 'fit' ? 'contain' : ((asset.fitMode as any) === 'stretch' ? 'fill' : 'cover')),
                        display: 'block'
                    }}
                    draggable={false}
                />
            </div>
        );
    }

    if (asset.type === 'video') {
        return (
            <video
                ref={videoRef}
                src={asset.url}
                style={{ ...style, transform: `${style.transform} translateZ(0)` }}
                playsInline
                className="object-cover pointer-events-auto cursor-pointer stPageFlip-ignore"
                controls
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
            />
        );
    }

    if (asset.type === 'text') {
        return (
            <div style={{
                ...style,
                fontSize: (asset.fontSize || 16),
                fontFamily: asset.fontFamily,
                color: asset.textColor,
                textAlign: asset.textAlign as any,
                fontWeight: asset.fontWeight,
                lineHeight: asset.lineHeight,
                whiteSpace: 'pre-wrap',
            }}
                className="pointer-events-none select-none"
            >
                {asset.content}
            </div>
        );
    }

    return null;
}

const Button = ({ variant, size, onClick, className, children, ...props }: any) => (
    <button
        onClick={onClick}
        className={cn(
            "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
            variant === 'primary' ? "bg-primary text-primary-foreground hover:bg-primary/90" : "hover:bg-accent hover:text-accent-foreground",
            size === 'sm' ? "h-9 px-3 rounded-md" : "h-11 px-8 rounded-md",
            className
        )}
        {...props}
    >
        {children}
    </button>
);

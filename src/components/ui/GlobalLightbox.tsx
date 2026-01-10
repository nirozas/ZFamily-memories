import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ZoomIn, ZoomOut, Download, Minimize2, Maximize2, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';

interface GlobalLightboxContextType {
    openLightbox: (index: number, images: Array<{ src: string; alt?: string }>) => void;
    closeLightbox: () => void;
}

const GlobalLightboxContext = createContext<GlobalLightboxContextType | undefined>(undefined);

export function useGlobalLightbox() {
    const context = useContext(GlobalLightboxContext);
    if (!context) {
        throw new Error('useGlobalLightbox must be used within a GlobalLightboxProvider');
    }
    return context;
}

interface GlobalLightboxProviderProps {
    children: ReactNode;
}

export function GlobalLightboxProvider({ children }: GlobalLightboxProviderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [images, setImages] = useState<Array<{ src: string; alt?: string }>>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [scale, setScale] = useState(1);
    const [isFullscreen, setIsFullscreen] = useState(false);

    const openLightbox = useCallback((index: number, allImages: Array<{ src: string; alt?: string }>) => {
        setImages(allImages);
        setCurrentIndex(index);
        setIsOpen(true);
        setScale(1);
    }, []);

    const closeLightbox = useCallback(() => {
        setIsOpen(false);
        setTimeout(() => setImages([]), 300);
        if (document.fullscreenElement) {
            document.exitFullscreen().catch(() => { });
        }
        setIsFullscreen(false);
    }, []);

    const nextImage = useCallback(() => {
        setCurrentIndex(prev => (prev + 1) % images.length);
        setScale(1);
    }, [images.length]);

    const prevImage = useCallback(() => {
        setCurrentIndex(prev => (prev - 1 + images.length) % images.length);
        setScale(1);
    }, [images.length]);

    const toggleFullscreen = useCallback(async () => {
        if (!document.fullscreenElement) {
            try {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            } catch (e) {
                console.error('Fullscreen denied:', e);
            }
        } else {
            await document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    const handleDownload = useCallback(async () => {
        const currentImage = images[currentIndex];
        if (!currentImage?.src) return;
        try {
            const response = await fetch(currentImage.src);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `zoabi-archive-${Date.now()}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            window.open(currentImage.src, '_blank');
        }
    }, [images, currentIndex]);

    // Handle Keyboard
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowRight') nextImage();
            if (e.key === 'ArrowLeft') prevImage();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, closeLightbox, nextImage, prevImage]);

    return (
        <GlobalLightboxContext.Provider value={{ openLightbox, closeLightbox }}>
            {children}
            {createPortal(
                <AnimatePresence>
                    {isOpen && images[currentIndex] && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-md flex items-center justify-center overflow-hidden"
                            onClick={closeLightbox}
                        >
                            {/* Controls */}
                            <motion.div
                                initial={{ y: -20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="absolute top-0 inset-x-0 p-4 flex justify-between items-start z-50 bg-gradient-to-b from-black/60 to-transparent pointer-events-none"
                            >
                                {/* Left Controls */}
                                <div className="flex gap-2 pointer-events-auto">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setScale(s => Math.min(s + 0.5, 3)); }}
                                        className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-all shadow-lg border border-white/10"
                                        title="Zoom In"
                                    >
                                        <ZoomIn className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setScale(s => Math.max(s - 0.5, 1)); }}
                                        className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-all shadow-lg border border-white/10"
                                        title="Zoom Out"
                                    >
                                        <ZoomOut className="w-5 h-5" />
                                    </button>
                                </div>

                                {/* Right Controls */}
                                <div className="flex gap-2 pointer-events-auto">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                                        className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-all shadow-lg border border-white/10"
                                        title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                                    >
                                        {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDownload(); }}
                                        className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-all shadow-lg border border-white/10"
                                        title="Download Original"
                                    >
                                        <Download className="w-5 h-5" />
                                    </button>
                                    <button
                                        onClick={closeLightbox}
                                        className="p-2.5 bg-white/10 hover:bg-red-500/20 text-white hover:text-red-200 rounded-full backdrop-blur-sm transition-all shadow-lg border border-white/10"
                                        title="Close"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </motion.div>

                            {/* Navigation Arrows */}
                            {images.length > 1 && (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); prevImage(); }}
                                        className="absolute left-4 z-50 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-all shadow-lg border border-white/10 hover:border-white/30"
                                    >
                                        <ChevronLeft className="w-8 h-8" />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); nextImage(); }}
                                        className="absolute right-4 z-50 p-3 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-all shadow-lg border border-white/10 hover:border-white/30"
                                    >
                                        <ChevronRight className="w-8 h-8" />
                                    </button>
                                </>
                            )}

                            {/* Image Container */}
                            <motion.div
                                key={currentIndex}
                                className="relative w-full h-full flex items-center justify-center p-4 md:p-8"
                                onClick={(e) => e.stopPropagation()}
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <motion.img
                                    src={images[currentIndex].src}
                                    alt={images[currentIndex].alt || 'Full screen view'}
                                    className="max-w-full max-h-full object-contain shadow-2xl user-select-none"
                                    animate={{
                                        scale: scale,
                                        transition: { type: "spring", stiffness: 300, damping: 30 }
                                    }}
                                    drag
                                    dragConstraints={{ left: -100 * scale, right: 100 * scale, top: -100 * scale, bottom: 100 * scale }}
                                    dragElastic={0.1}
                                    whileTap={{ cursor: "grabbing" }}
                                    style={{ cursor: scale > 1 ? "grab" : "default" }}
                                />
                            </motion.div>

                            {/* Caption if available */}
                            {images[currentIndex].alt && (
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.3 }}
                                    className="absolute bottom-6 left-0 right-0 text-center pointer-events-none"
                                >
                                    <span className="inline-block px-6 py-3 bg-black/40 backdrop-blur-md text-white/90 font-serif italic text-lg rounded-full border border-white/10 shadow-xl max-w-4xl mx-auto truncate">
                                        {images[currentIndex].alt}
                                    </span>
                                </motion.div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </GlobalLightboxContext.Provider>
    );
}

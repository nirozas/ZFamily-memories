import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { X, Check, RotateCcw } from 'lucide-react';

interface ImageCropperProps {
    src: string;
    onCropComplete: (croppedImageUrl: string) => void;
    onCancel: () => void;
}

function centerAspectCrop(mediaWidth: number, mediaHeight: number, aspect: number) {
    return centerCrop(
        makeAspectCrop(
            {
                unit: '%',
                width: 90,
            },
            aspect,
            mediaWidth,
            mediaHeight
        ),
        mediaWidth,
        mediaHeight
    );
}

export function ImageCropper({ src, onCropComplete, onCancel }: ImageCropperProps) {
    const [crop, setCrop] = useState<Crop>();
    const [completedCrop, setCompletedCrop] = useState<Crop>();
    const [aspect, setAspect] = useState<number | undefined>(undefined);
    const imgRef = useRef<HTMLImageElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
        const { width, height } = e.currentTarget;
        // Start with free-form crop
        setCrop(centerAspectCrop(width, height, 1));
    }, []);

    const handleCropComplete = useCallback(async () => {
        if (!completedCrop || !imgRef.current || !canvasRef.current) return;

        const image = imgRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const scaleX = image.naturalWidth / image.width;
        const scaleY = image.naturalHeight / image.height;

        const cropX = completedCrop.x * scaleX;
        const cropY = completedCrop.y * scaleY;
        const cropWidth = completedCrop.width * scaleX;
        const cropHeight = completedCrop.height * scaleY;

        canvas.width = cropWidth;
        canvas.height = cropHeight;

        ctx.drawImage(
            image,
            cropX,
            cropY,
            cropWidth,
            cropHeight,
            0,
            0,
            cropWidth,
            cropHeight
        );

        // Convert to blob and create URL
        canvas.toBlob((blob) => {
            if (blob) {
                const croppedUrl = URL.createObjectURL(blob);
                onCropComplete(croppedUrl);
            }
        }, 'image/jpeg', 0.95);
    }, [completedCrop, onCropComplete]);

    const aspectPresets = [
        { label: 'Free', value: undefined },
        { label: '1:1', value: 1 },
        { label: '4:3', value: 4 / 3 },
        { label: '16:9', value: 16 / 9 },
        { label: '3:2', value: 3 / 2 },
    ];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="font-serif text-lg text-catalog-text">Crop Image</h3>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onCancel}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Cancel"
                        >
                            <X className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>
                </div>

                {/* Aspect Ratio Presets */}
                <div className="flex items-center gap-2 p-4 border-b border-gray-100 bg-gray-50/50">
                    <span className="text-xs font-medium text-gray-500 mr-2">Aspect:</span>
                    {aspectPresets.map((preset) => (
                        <button
                            key={preset.label}
                            onClick={() => setAspect(preset.value)}
                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${aspect === preset.value
                                ? 'bg-catalog-accent text-white'
                                : 'bg-white border border-gray-200 text-gray-600 hover:border-catalog-accent'
                                }`}
                        >
                            {preset.label}
                        </button>
                    ))}
                    <button
                        onClick={() => setCrop(undefined)}
                        className="ml-auto p-1.5 hover:bg-white rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                        title="Reset crop"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>

                {/* Crop Area */}
                <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-gray-100">
                    <ReactCrop
                        crop={crop}
                        onChange={(c) => setCrop(c)}
                        onComplete={(c) => setCompletedCrop(c)}
                        aspect={aspect}
                        className="max-w-full max-h-full"
                    >
                        <img
                            ref={imgRef}
                            src={src}
                            alt="Crop preview"
                            onLoad={onImageLoad}
                            className="max-w-full max-h-[60vh] object-contain"
                            crossOrigin="anonymous"
                        />
                    </ReactCrop>
                </div>

                {/* Hidden canvas for cropping */}
                <canvas ref={canvasRef} className="hidden" />

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleCropComplete}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-catalog-accent hover:bg-catalog-accent/90 rounded-lg transition-colors"
                    >
                        <Check className="w-4 h-4" />
                        Apply Crop
                    </button>
                </div>
            </div>
        </div>
    );
}

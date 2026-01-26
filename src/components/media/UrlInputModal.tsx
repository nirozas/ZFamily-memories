import { useState } from 'react';
import { X, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface UrlInputModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (url: string) => void;
}

export function UrlInputModal({ isOpen, onClose, onSubmit }: UrlInputModalProps) {
    const [url, setUrl] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!url.trim()) {
            setError('Please enter a valid URL');
            return;
        }

        try {
            new URL(url); // Basic validation
            onSubmit(url);
        } catch {
            setError('Please enter a valid URL (e.g., https://example.com/image.jpg)');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-xl font-serif italic text-catalog-text flex items-center gap-2">
                        <LinkIcon className="w-5 h-5 text-gray-400" />
                        Import from Link
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">
                            Image URL
                        </label>
                        <input
                            type="url"
                            value={url}
                            onChange={(e) => {
                                setUrl(e.target.value);
                                setError(null);
                            }}
                            placeholder="https://..."
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-sans"
                            autoFocus
                        />
                        {error && (
                            <div className="flex items-center gap-2 text-red-500 text-xs mt-2 animate-pulse">
                                <AlertCircle className="w-3 h-3" />
                                {error}
                            </div>
                        )}
                        <p className="text-xs text-gray-400 italic">
                            Paste a direct link to an image (ending in .jpg, .png, etc.)
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={onClose} className="flex-1">
                            Cancel
                        </Button>
                        <Button type="submit" variant="primary" className="flex-1">
                            Import Image
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}

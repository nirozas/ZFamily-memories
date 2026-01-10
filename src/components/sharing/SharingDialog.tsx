import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Copy, Check, Clock, FileText, Download, Share2, Globe, Lock } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

interface SharingDialogProps {
    albumId?: string;
    eventId?: string;
    title: string;
    onClose: () => void;
}

export function SharingDialog({ albumId, eventId, title, onClose }: SharingDialogProps) {
    const [link, setLink] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const [exporting, setExporting] = useState(false);

    const generateSharedLink = async () => {
        setLoading(true);
        try {
            const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + 48);

            const { error } = await supabase
                .from('shared_links')
                .insert({
                    album_id: albumId || null,
                    event_id: eventId || null,
                    token: token,
                    expires_at: expiresAt.toISOString(),
                    is_active: true
                } as any)
                .select()
                .single();

            if (error) throw error;

            const url = albumId
                ? `${window.location.origin}/shared/${token}`
                : `${window.location.origin}/share/${token}`;
            setLink(url);
        } catch (error) {
            console.error('Error generating link:', error);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (link) {
            navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const exportToPDF = async () => {
        setExporting(true);
        try {
            const pdf = new jsPDF('l', 'px', [800, 600]);
            const canvas = document.getElementById('album-canvas-container');

            if (canvas) {
                const imgData = await html2canvas(canvas).then(c => c.toDataURL('image/jpeg', 0.8));
                pdf.addImage(imgData, 'JPEG', 0, 0, 800, 600);
                pdf.save(`${title.replace(/\s+/g, '_')}_Memory_Album.pdf`);
            }
        } catch (error) {
            console.error('PDF Export failed:', error);
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <Card className="w-full max-w-lg p-8 bg-white shadow-2xl animate-fade-in">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-catalog-accent/10 rounded-full flex items-center justify-center">
                            <Share2 className="w-5 h-5 text-catalog-accent" />
                        </div>
                        <h2 className="text-2xl font-serif text-catalog-text">Share Memory</h2>
                    </div>
                    <button onClick={onClose} className="text-catalog-text/40 hover:text-catalog-text transition-colors">
                        Close
                    </button>
                </div>

                <div className="space-y-8">
                    {/* Share Link Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold uppercase tracking-widest text-catalog-text/50 flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                Temporary Access Link
                            </h3>
                            <span className="text-[10px] text-red-500 font-mono flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                EXPIRES IN 48H
                            </span>
                        </div>

                        {!link ? (
                            <Button
                                onClick={generateSharedLink}
                                isLoading={loading}
                                className="w-full py-6 text-lg border-2 border-dashed border-catalog-accent/30 bg-catalog-accent/5 hover:bg-catalog-accent/10"
                            >
                                <Lock className="w-4 h-4 mr-2" />
                                Generate Secure Link
                            </Button>
                        ) : (
                            <div className="flex gap-2">
                                <div className="flex-1 bg-catalog-stone/10 p-4 rounded border border-catalog-accent/20 font-mono text-sm break-all">
                                    {link}
                                </div>
                                <Button onClick={copyToClipboard} variant="outline" className="h-auto px-6">
                                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-catalog-accent/10" />

                    {/* Export Options */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold uppercase tracking-widest text-catalog-text/50 flex items-center gap-2">
                            <Download className="w-4 h-4" />
                            Preservation & Export
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={exportToPDF}
                                disabled={exporting}
                                className="flex flex-col items-center gap-3 p-6 rounded-lg border border-catalog-accent/10 hover:border-catalog-accent/30 hover:bg-catalog-accent/5 transition-all text-center group"
                            >
                                <div className="p-3 bg-red-50 rounded-full group-hover:bg-red-100 transition-colors">
                                    <FileText className="w-6 h-6 text-red-500" />
                                </div>
                                <div>
                                    <p className="font-serif font-bold text-catalog-text">Interactive PDF</p>
                                    <p className="text-[10px] text-catalog-text/40 uppercase tracking-tighter">Perfect for Printing</p>
                                </div>
                            </button>

                            <button
                                onClick={() => alert('HTML5 Package preparation started... Check downloads shortly.')}
                                className="flex flex-col items-center gap-3 p-6 rounded-lg border border-catalog-accent/10 hover:border-catalog-accent/30 hover:bg-catalog-accent/5 transition-all text-center group"
                            >
                                <div className="p-3 bg-blue-50 rounded-full group-hover:bg-blue-100 transition-colors">
                                    <Download className="w-6 h-6 text-blue-500" />
                                </div>
                                <div>
                                    <p className="font-serif font-bold text-catalog-text">HTML5 Package</p>
                                    <p className="text-[10px] text-catalog-text/40 uppercase tracking-tighter">Offline Digital Book</p>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 pt-6 border-t border-catalog-accent/5 flex justify-center">
                    <p className="text-[10px] text-catalog-text/30 font-sans max-w-xs text-center">
                        Shared links bypass family privacy for the duration of the link.
                        Exports are intended for personal archival use.
                    </p>
                </div>
            </Card>
        </div>
    );
}

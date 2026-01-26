import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calendar, MapPin, ArrowLeft, Printer, Heart } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { EventReviews } from '../components/events/EventReviews';
import { EventMediaGallery } from '../components/events/EventMediaGallery';
import { GlobalLightboxProvider, useGlobalLightbox } from '../components/ui/GlobalLightbox';
import type { Event } from '../types/supabase';

const EventContent = ({ event }: { event: Event }) => {
    const { openLightbox } = useGlobalLightbox();

    return (
        <article className="space-y-12">
            <header className="space-y-8 text-center">
                <div className="space-y-4">
                    {event.category && (
                        <span className="inline-block px-4 py-1 text-xs font-bold tracking-[0.3em] text-catalog-accent uppercase bg-catalog-accent/5 rounded-full">
                            {event.category}
                        </span>
                    )}
                    <h1 className="text-5xl md:text-7xl font-serif text-catalog-text leading-tight">
                        {event.title}
                    </h1>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-6 text-catalog-text/50 font-sans text-sm tracking-wide">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-catalog-accent" />
                        {new Date(event.event_date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                    </div>
                    {event.location && (
                        <Link
                            to={`/map?location=${encodeURIComponent(event.location)}`}
                            className="flex items-center gap-2 hover:text-catalog-accent transition-colors cursor-pointer group"
                            title="View on Map"
                        >
                            <MapPin className="w-4 h-4 text-catalog-accent group-hover:scale-110 transition-transform" />
                            <span className="border-b border-transparent group-hover:border-catalog-accent/50">
                                {event.location}
                            </span>
                        </Link>
                    )}
                </div>

                <div className="w-24 h-px bg-catalog-accent/20 mx-auto" />
            </header>

            <div
                className="prose prose-lg md:prose-xl prose-catalog max-w-none font-serif leading-relaxed text-catalog-text/80 selection:bg-catalog-accent/20"
                dangerouslySetInnerHTML={{ __html: event.description || '' }}
                onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.tagName === 'IMG') {
                        const img = target as HTMLImageElement;
                        openLightbox(0, [{ src: img.src, alt: img.alt }]);
                    }
                }}
            />

            {/* Media Gallery */}
            {event.content?.assets && event.content.assets.length > 0 && (
                <EventMediaGallery
                    assets={event.content.assets}
                    mode={event.content.galleryMode || 'cards'}
                />
            )}

            {/* Review Section */}
            <EventReviews eventId={event.id} />

            {/* Footer / Signature */}
            <footer className="pt-16 mt-16 border-t border-catalog-stone/20 text-center space-y-8">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 bg-catalog-accent/10 rounded-full flex items-center justify-center">
                        <Heart className="w-6 h-6 text-catalog-accent animate-pulse" />
                    </div>
                    <p className="font-serif italic text-xl text-catalog-text/60">
                        This moment is part of our family's living legacy.
                    </p>
                </div>
            </footer>
        </article>
    );
};

export function EventView() {
    const { id } = useParams<{ id: string }>();
    const [event, setEvent] = useState<Event | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) fetchEvent(id);
    }, [id]);

    const fetchEvent = async (eventId: string) => {
        try {
            const { data, error } = await supabase
                .from('events')
                .select('*')
                .eq('id', eventId)
                .single();

            if (error) throw error;
            setEvent(data);
        } catch (error) {
            console.error('Error fetching event:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-catalog-bg">
                <div className="w-12 h-12 border-4 border-catalog-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="h-screen flex flex-col items-center justify-center bg-catalog-bg text-catalog-text">
                <h1 className="text-4xl font-serif mb-4">Story Not Found</h1>
                <Link to="/events">
                    <Button variant="primary">Return to Timeline</Button>
                </Link>
            </div>
        );
    }

    return (
        <GlobalLightboxProvider>
            <div className="min-h-screen bg-white theme-peach theme-rainbow bg-pattern-diverse">
                {/* Minimal Header */}
                <header className="h-16 border-b border-catalog-stone/20 flex items-center justify-between px-6 sticky top-0 bg-white/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-4">
                        <Link to="/events" className="p-2 hover:bg-catalog-stone/50 rounded-full transition-colors text-catalog-text/60">
                            <ArrowLeft className="w-5 h-5" />
                        </Link>
                        <span className="text-sm font-sans uppercase tracking-[0.2em] text-catalog-text/40 font-bold">The Family Archive</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" onClick={() => window.print()}>
                            <Printer className="w-4 h-4 mr-2" /> Print
                        </Button>
                    </div>
                </header>

                <main className="max-w-4xl mx-auto px-6 py-16 md:py-24">
                    <EventContent event={event} />
                </main>
            </div>
        </GlobalLightboxProvider>
    );
}

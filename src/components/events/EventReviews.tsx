import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Star, Send, User, MessageSquare } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

interface Review {
    id: string;
    event_id: string;
    user_id: string;
    rating: number;
    comment: string;
    created_at: string;
    profiles?: {
        full_name: string;
        avatar_url: string | null;
    };
}

interface EventReviewsProps {
    eventId: string;
}

export function EventReviews({ eventId }: EventReviewsProps) {
    const { user } = useAuth();
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchReviews();
    }, [eventId]);

    const fetchReviews = async () => {
        try {
            const { data, error } = await supabase
                .from('event_reviews')
                .select(`
                    *,
                    profiles:user_id (full_name, avatar_url)
                `)
                .eq('event_id', eventId)
                .order('created_at', { ascending: false } as any);

            if (error) {
                // If table doesn't exist yet, we'll just show empty state
                if (error.code === '42P01') {
                    console.warn('event_reviews table not found. Please create it in Supabase.');
                    setReviews([]);
                } else {
                    throw error;
                }
            } else {
                setReviews(data || []);
            }
        } catch (error) {
            console.error('Error fetching reviews:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !comment.trim() || submitting) return;

        setSubmitting(true);
        try {
            const { error } = await supabase
                .from('event_reviews')
                .insert({
                    event_id: eventId,
                    user_id: user.id,
                    rating,
                    comment: comment.trim()
                } as any);

            if (error) throw error;

            setComment('');
            setRating(5);
            fetchReviews();
        } catch (error) {
            console.error('Error submitting review:', error);
            alert('Failed to post review. Is the event_reviews table created?');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <section className="mt-20 pt-16 border-t border-catalog-stone/20 max-w-2xl mx-auto px-6 pb-20">
            <div className="flex items-center gap-3 mb-12">
                <div className="p-3 bg-catalog-accent/5 rounded-full">
                    <MessageSquare className="w-6 h-6 text-catalog-accent" />
                </div>
                <h2 className="text-3xl font-serif text-catalog-text">Family Reflections</h2>
            </div>

            {/* Post Review */}
            <Card className="p-8 mb-12 bg-catalog-bg/30 border-dashed border-catalog-accent/20">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex items-center gap-4 mb-2">
                        <span className="text-sm font-bold uppercase tracking-widest text-catalog-text/40">Your Rating:</span>
                        <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => setRating(s)}
                                    className="p-1 transition-transform hover:scale-110"
                                >
                                    <Star className={`w-5 h-5 ${s <= rating ? 'fill-catalog-accent text-catalog-accent' : 'text-catalog-text/20'}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <textarea
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        placeholder="Share a thought or memory about this moment..."
                        className="w-full h-32 p-4 bg-white border border-catalog-accent/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-catalog-accent/20 font-serif text-lg resize-none"
                    />

                    <div className="flex justify-end">
                        <Button type="submit" isLoading={submitting} disabled={!comment.trim()} variant="primary">
                            <Send className="w-4 h-4 mr-2" /> Share Reflection
                        </Button>
                    </div>
                </form>
            </Card>

            {/* Reviews List */}
            <div className="space-y-8">
                {loading ? (
                    <div className="animate-pulse space-y-4">
                        <div className="h-20 bg-catalog-stone/10 rounded-lg w-full" />
                        <div className="h-20 bg-catalog-stone/10 rounded-lg w-full" />
                    </div>
                ) : reviews.length > 0 ? (
                    reviews.map((review) => (
                        <div key={review.id} className="group relative pl-16 border-l border-catalog-accent/10 py-2">
                            <div className="absolute left-0 top-0 -translate-x-1/2 w-12 h-12 rounded-full border-4 border-white overflow-hidden shadow-sm bg-catalog-stone/20">
                                {review.profiles?.avatar_url ? (
                                    <img src={review.profiles.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-catalog-text/20">
                                        <User className="w-6 h-6" />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-serif font-bold text-catalog-text">
                                        {review.profiles?.full_name || 'Family Member'}
                                    </h4>
                                    <span className="text-[10px] uppercase tracking-widest text-catalog-text/30 font-bold">
                                        {new Date(review.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                                <div className="flex gap-0.5 mb-2">
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star key={s} className={`w-3 h-3 ${s <= review.rating ? 'fill-catalog-accent text-catalog-accent' : 'text-catalog-text/10'}`} />
                                    ))}
                                </div>
                                <p className="font-serif text-catalog-text/70 leading-relaxed italic">
                                    "{review.comment}"
                                </p>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-catalog-text/30 font-serif italic">
                        No reflections shared yet. Be the first to add a thought.
                    </div>
                )}
            </div>
        </section>
    );
}

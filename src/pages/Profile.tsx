import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { cn } from '../lib/utils';
import { BookOpen, Calendar, Clock, Award, User as UserIcon } from 'lucide-react';
import { FamilyManagement } from '../components/profile/FamilyManagement';
import { motion } from 'framer-motion';

export function Profile() {
    const { user, userRole: authRole } = useAuth();
    const [stats, setStats] = useState({
        albumsCount: 0,
        eventsCount: 0,
        timelineItems: [] as any[]
    });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'stats' | 'family'>('stats');

    useEffect(() => {
        async function fetchProfileData() {
            if (!user) return;

            try {
                // 1. Fetch Album Count
                const { count: albumsCount } = await supabase
                    .from('albums')
                    .select('*', { count: 'exact', head: true })
                    .eq('creator_id', user.id);

                // 2. Fetch Event Count
                const { count: eventsCount } = await supabase
                    .from('events')
                    .select('*', { count: 'exact', head: true })
                    .eq('created_by', user.id);

                // 3. Fetch Recent Activity (Timeline)
                const { data: recentAlbums } = await supabase
                    .from('albums')
                    .select('id, title, created_at, type:id')
                    .eq('creator_id', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                const { data: recentEvents } = await supabase
                    .from('events')
                    .select('id, title, created_at, type:id')
                    .eq('created_by', user.id)
                    .order('created_at', { ascending: false })
                    .limit(5);

                // Combine and sort activity
                const activity = [
                    ...((recentAlbums as any[])?.map(a => ({ id: a.id, title: a.title, created_at: a.created_at, type: 'album' as const })) || []),
                    ...((recentEvents as any[])?.map(e => ({ id: e.id, title: e.title, created_at: e.created_at, type: 'event' as const })) || [])
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                setStats({
                    albumsCount: albumsCount || 0,
                    eventsCount: eventsCount || 0,
                    timelineItems: activity
                });

            } catch (error) {
                console.error('Error fetching profile data:', error);
            } finally {
                setLoading(false);
            }
        }

        fetchProfileData();
    }, [user]);

    const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
    const userEmail = user?.email;

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-12 h-12 border-4 border-catalog-accent border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
            {/* Header Section */}
            <section className="bg-white rounded-lg shadow-sm border border-catalog-accent/10 p-8 flex flex-col md:flex-row items-center gap-8">
                <div className="w-32 h-32 rounded-full bg-catalog-accent/10 border-4 border-white shadow-md flex items-center justify-center shrink-0">
                    <UserIcon className="w-16 h-16 text-catalog-accent/40" />
                </div>
                <div className="text-center md:text-left space-y-2">
                    <h1 className="text-4xl font-serif text-catalog-text">{userName}</h1>
                    <p className="text-catalog-text/60 font-sans tracking-tight">{userEmail}</p>
                    <div className="inline-block px-3 py-1 bg-catalog-accent/10 text-catalog-accent text-xs font-bold uppercase tracking-widest rounded-full">
                        {authRole || 'Member'}
                    </div>
                </div>
            </section>

            {/* Tabs */}
            <div className="flex border-b border-catalog-accent/10">
                <button
                    onClick={() => setActiveTab('stats')}
                    className={cn(
                        "px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all relative",
                        activeTab === 'stats' ? "text-catalog-accent" : "text-catalog-text/40 hover:text-catalog-text/60"
                    )}
                >
                    Contributions
                    {activeTab === 'stats' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-catalog-accent" />}
                </button>
                <button
                    onClick={() => setActiveTab('family')}
                    className={cn(
                        "px-6 py-3 text-sm font-bold uppercase tracking-widest transition-all relative",
                        activeTab === 'family' ? "text-catalog-accent" : "text-catalog-text/40 hover:text-catalog-text/60"
                    )}
                >
                    Family Heritage
                    {activeTab === 'family' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-catalog-accent" />}
                </button>
            </div>

            {activeTab === 'stats' ? (
                <>
                    {/* Stats Grid */}
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-6 flex items-center gap-6">
                            <div className="p-4 bg-blue-50 rounded-lg text-blue-500">
                                <BookOpen className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm text-catalog-text/50 uppercase tracking-wider font-semibold">Albums Created</p>
                                <p className="text-3xl font-serif text-catalog-text leading-none">{stats.albumsCount}</p>
                            </div>
                        </Card>
                        <Card className="p-6 flex items-center gap-6">
                            <div className="p-4 bg-orange-50 rounded-lg text-orange-500">
                                <Calendar className="w-8 h-8" />
                            </div>
                            <div>
                                <p className="text-sm text-catalog-text/50 uppercase tracking-wider font-semibold">Events Recorded</p>
                                <p className="text-3xl font-serif text-catalog-text leading-none">{stats.eventsCount}</p>
                            </div>
                        </Card>
                    </section>

                    {/* Recent Contributions */}
                    <section className="space-y-6">
                        <h2 className="text-2xl font-serif text-catalog-text border-b border-catalog-accent/20 pb-4 flex items-center gap-3">
                            <Clock className="w-6 h-6 text-catalog-accent" />
                            Recent Contributions
                        </h2>
                        <div className="space-y-4">
                            {stats.timelineItems.length > 0 ? (
                                stats.timelineItems.map((item, idx) => (
                                    <div key={`${item.type}-${item.id}`} className="flex gap-4 group">
                                        <div className="flex flex-col items-center">
                                            <div className={cn(
                                                "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors",
                                                item.type === 'album' ? "bg-blue-50 border-blue-100 text-blue-500" : "bg-orange-50 border-orange-100 text-orange-500"
                                            )}>
                                                {item.type === 'album' ? <BookOpen className="w-5 h-5" /> : <Calendar className="w-5 h-5" />}
                                            </div>
                                            {idx !== stats.timelineItems.length - 1 && (
                                                <div className="flex-1 w-px bg-catalog-accent/10 my-1" />
                                            )}
                                        </div>
                                        <div className="flex-1 pb-6">
                                            <p className="text-catalog-text font-serif text-lg leading-tight group-hover:text-catalog-accent transition-colors">
                                                {item.type === 'album' ? 'Created an album: ' : 'Recorded an event: '}
                                                <span className="italic">"{item.title}"</span>
                                            </p>
                                            <p className="text-sm text-catalog-text/40 mt-1">
                                                {new Date(item.created_at).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-12 bg-white/50 rounded-lg border border-dashed border-catalog-accent/30">
                                    <Award className="w-12 h-12 text-catalog-accent/20 mx-auto mb-4" />
                                    <p className="text-catalog-text/50 font-serif italic">No contributions yet. Start by recording a moment!</p>
                                </div>
                            )}
                        </div>
                    </section>
                </>
            ) : (
                <FamilyManagement />
            )}
        </div>
    );
}

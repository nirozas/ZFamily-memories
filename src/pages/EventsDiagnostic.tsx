import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';

export function EventsDiagnostic() {
    const { familyId, user } = useAuth();
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEvents = async () => {
            if (!familyId) return;

            let query = supabase
                .from('events')
                .select('*');

            if (user?.id) {
                query = query.or(`family_id.eq.${familyId},creator_id.eq.${user.id}`);
            } else {
                query = query.eq('family_id', String(familyId));
            }

            const { data, error } = await query;
            console.log('[Diagnostic] Raw events data:', data);
            console.log('[Diagnostic] Error:', error);

            setEvents(data || []);
            setLoading(false);
        };

        fetchEvents();
    }, [familyId, user]);

    if (loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="p-8 space-y-4 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6">Events Diagnostic Tool</h1>

            <Card className="p-4 bg-blue-50">
                <h2 className="font-bold mb-2">Summary</h2>
                <p>Total events found: <strong>{events.length}</strong></p>
                <p>Family ID: <strong>{familyId}</strong></p>
            </Card>

            {events.map((event, i) => (
                <Card key={event.id} className="p-6">
                    <h3 className="text-xl font-bold mb-4">Event {i + 1}: {event.title}</h3>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="font-semibold">ID:</p>
                            <p className="font-mono text-xs">{event.id}</p>
                        </div>

                        <div>
                            <p className="font-semibold">Location (text):</p>
                            <p>{event.location || <em className="text-gray-400">Not set</em>}</p>
                        </div>

                        <div>
                            <p className="font-semibold">Country:</p>
                            <p>{event.country || <em className="text-gray-400">Not set</em>}</p>
                        </div>

                        <div>
                            <p className="font-semibold">Date:</p>
                            <p>{event.event_date}</p>
                        </div>

                        <div className="col-span-2 border-t pt-3 mt-2">
                            <p className="font-semibold text-purple-700 mb-2">Coordinate Data:</p>

                            <div className="grid grid-cols-3 gap-3">
                                <div className={`p-2 rounded ${event.geotag ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <p className="font-semibold text-xs">geotag:</p>
                                    <pre className="text-xs font-mono mt-1 overflow-auto">
                                        {event.geotag ? JSON.stringify(event.geotag, null, 2) : '❌ NULL'}
                                    </pre>
                                </div>

                                <div className={`p-2 rounded ${event.latitude ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <p className="font-semibold text-xs">latitude:</p>
                                    <p className="text-xs font-mono mt-1">{event.latitude || '❌ NULL'}</p>
                                </div>

                                <div className={`p-2 rounded ${event.longitude ? 'bg-green-100' : 'bg-red-100'}`}>
                                    <p className="font-semibold text-xs">longitude:</p>
                                    <p className="text-xs font-mono mt-1">{event.longitude || '❌ NULL'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="col-span-2 border-t pt-3 mt-2">
                            <p className="font-semibold mb-1">Will show on map?</p>
                            {(() => {
                                let hasCoords = false;
                                let reason = '';

                                // Check geotag
                                if (event.geotag) {
                                    const tag = typeof event.geotag === 'string' ? JSON.parse(event.geotag) : event.geotag;
                                    if (tag?.lat && tag?.lng) {
                                        hasCoords = true;
                                        reason = `Yes - geotag found (${tag.lat}, ${tag.lng})`;
                                    }
                                }

                                // Check columns
                                if (!hasCoords && event.latitude && event.longitude) {
                                    hasCoords = true;
                                    reason = `Yes - lat/lng columns found (${event.latitude}, ${event.longitude})`;
                                }

                                if (!hasCoords) {
                                    reason = '❌ NO - Missing coordinates';
                                }

                                return (
                                    <p className={`font-bold ${hasCoords ? 'text-green-700' : 'text-red-700'}`}>
                                        {reason}
                                    </p>
                                );
                            })()}
                        </div>
                    </div>
                </Card>
            ))}

            {events.length === 0 && (
                <Card className="p-8 text-center text-gray-500">
                    <p>No events found for this family.</p>
                    <p className="text-sm mt-2">Check RLS policies in Supabase.</p>
                </Card>
            )}
        </div>
    );
}

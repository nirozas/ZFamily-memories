import { supabase } from '../lib/supabase';
import type { SharedLink } from '../types/supabase';

/**
 * Generate a temporary share link for an album
 * Link expires after 48 hours (2 days)
 */
export async function generateShareLink(albumId?: string, eventId?: string): Promise<{ link: string | null; error?: string }> {
    if (!albumId && !eventId) return { link: null, error: 'Either albumId or eventId is required' };

    try {
        // Generate a unique token
        const token = crypto.randomUUID();

        // Calculate expiration date (48 hours from now)
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
            } as any);

        if (error) {
            console.error('Error creating share link:', error);
            return { link: null, error: error.message };
        }

        // Construct the full URL
        const baseUrl = window.location.origin;
        const shareUrl = `${baseUrl}/shared/${token}`;

        return { link: shareUrl };
    } catch (error) {
        console.error('Error in generateShareLink:', error);
        return { link: null, error: 'Failed to generate share link' };
    }
}

/**
 * Validate a share link and check if it's still active
 */
export async function validateShareLink(token: string): Promise<{
    valid: boolean;
    albumId?: string;
    eventId?: string;
    error?: string
}> {
    try {
        const { data, error } = await supabase
            .from('shared_links')
            .select('*')
            .eq('token', token)
            .eq('is_active', true)
            .maybeSingle();

        if (error || !data) {
            return { valid: false, error: 'Invalid share link' };
        }

        const linkData = data as any;

        // Check if link has expired
        const expiresAt = new Date(linkData.expires_at);
        if (expiresAt < new Date()) {
            return { valid: false, error: 'This share link has expired (48 hours)' };
        }

        return {
            valid: true,
            albumId: linkData.album_id,
            eventId: linkData.event_id
        };
    } catch (error) {
        console.error('Error validating share link:', error);
        return { valid: false, error: 'Error validating share link' };
    }
}

/**
 * Delete a share link (revoke access)
 */
export async function deleteShareLink(token: string): Promise<{ success: boolean; error?: string }> {
    try {
        const { error } = await (supabase
            .from('shared_links') as any)
            .update({ is_active: false })
            .eq('token', token);

        if (error) {
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Error deleting share link:', error);
        return { success: false, error: 'Failed to delete link' };
    }
}

/**
 * Get all share links for an album
 */
export async function getAlbumShareLinks(albumId: string): Promise<{
    links: SharedLink[];
    error?: string
}> {
    try {
        const { data, error } = await supabase
            .from('shared_links')
            .select('*')
            .eq('album_id', albumId)
            .eq('is_active', true)
            .order('expires_at', { ascending: false });

        if (error) {
            return { links: [], error: error.message };
        }

        return { links: (data as any[]) || [] };
    } catch (error) {
        console.error('Error fetching share links:', error);
        return { links: [], error: 'Failed to fetch links' };
    }
}

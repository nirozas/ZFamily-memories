import { supabase } from '../lib/supabase';

export const storageService = {
    async uploadFile(
        file: File,
        bucket: 'event-assets' | 'album-assets' | 'system-assets',
        pathPrefix: string = '',
        onProgress?: (progress: { loaded: number; total: number }) => void
    ): Promise<{ url: string | null; error: string | null }> {
        try {
            // Clean up the prefix and generate a unique filename
            const cleanPrefix = pathPrefix.replace(/\/+$/, '').replace(/^\/+/, '');
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 8);
            const fileName = `${timestamp}-${randomString}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const filePath = cleanPrefix ? `${cleanPrefix}/${fileName}` : fileName;

            // Map buckets if necessary (e.g. if they have different names in Supabase)
            // But based on BUCKET_SETUP.md, they are the same.

            const { error } = await supabase.storage
                .from(bucket)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                throw error;
            }

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            // Simulate progress since Supabase standard upload doesn't provide it easily
            if (onProgress) {
                onProgress({ loaded: file.size, total: file.size });
            }

            return { url: publicUrl, error: null };
        } catch (error: any) {
            console.error('Upload error:', error);
            return { url: null, error: error.message };
        }
    },

    async deleteFile(url: string): Promise<{ success: boolean; error: string | null }> {
        try {
            if (!url) return { success: false, error: 'No URL provided' };

            // 1. Handle Cloudinary (Legacy)
            if (url.includes('cloudinary.com')) {
                const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
                const apiKey = import.meta.env.VITE_CLOUDINARY_API_KEY;
                const apiSecret = import.meta.env.VITE_CLOUDINARY_API_SECRET;

                if (!cloudName || !apiKey || !apiSecret) {
                    console.warn('Cloudinary credentials missing for legacy deletion.');
                    return { success: false, error: 'Cloudinary credentials missing' };
                }

                const regex = /\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/;
                const match = url.match(regex);
                if (!match) return { success: false, error: 'Invalid Cloudinary URL' };
                const publicId = match[1];

                const timestamp = Math.round(new Date().getTime() / 1000);
                const paramsToSign = `public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
                const msgBuffer = new TextEncoder().encode(paramsToSign);
                const hashBuffer = await crypto.subtle.digest('SHA-1', msgBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

                const formData = new FormData();
                formData.append('public_id', publicId);
                formData.append('api_key', apiKey);
                formData.append('timestamp', timestamp.toString());
                formData.append('signature', signature);

                const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                return { success: data.result === 'ok', error: data.result === 'ok' ? null : (data.error?.message || 'Cloudinary deletion failed') };
            }

            // 2. Handle Supabase (New)
            if (url.includes('supabase.co')) {
                const urlObj = new URL(url);
                const pathParts = urlObj.pathname.split('/public/');
                if (pathParts.length >= 2) {
                    const fullPath = pathParts[1];
                    const bucketMatch = fullPath.match(/^([^/]+)\/(.+)$/);
                    if (bucketMatch) {
                        const bucket = bucketMatch[1];
                        const filePath = bucketMatch[2];
                        const { error } = await supabase.storage.from(bucket).remove([filePath]);
                        return { success: !error, error: error ? error.message : null };
                    }
                }
            }

            return { success: false, error: 'Unsupported storage URL format' };
        } catch (error: any) {
            console.error('Delete error:', error);
            return { success: false, error: error.message };
        }
    }
};

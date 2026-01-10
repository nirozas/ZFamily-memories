import { supabase } from '../lib/supabase';

export const storageService = {
    async uploadFile(
        file: File,
        bucket: 'event-assets' | 'album-assets' | 'system-assets',
        pathPrefix: string = '',
        onProgress?: (progress: { loaded: number; total: number }) => void
    ): Promise<{ url: string | null; error: string | null }> {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${pathPrefix}${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file, {
                    onUploadProgress: (progress: any) => {
                        if (onProgress) onProgress(progress);
                    }
                } as any);

            if (uploadError) {
                throw uploadError;
            }

            const { data } = supabase.storage
                .from(bucket)
                .getPublicUrl(filePath);

            return { url: data.publicUrl, error: null };
        } catch (error: any) {
            console.error('Upload error:', error);
            return { url: null, error: error.message };
        }
    }
};


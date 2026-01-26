import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export function useGooglePhotosUrl(googlePhotoId?: string, initialUrl?: string) {
    const { googleAccessToken } = useAuth();
    const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(initialUrl);

    useEffect(() => {
        if (!googlePhotoId || !googleAccessToken) {
            setResolvedUrl(initialUrl);
            return;
        }

        // For now, we rely on the initialUrl for the session duration.
        // Direct getMediaItem calls from the frontend are blocked by CORS policy.
        setResolvedUrl(initialUrl);

        // FUTURE: If we need a refresh, it must be done through a backend proxy 
        // or by creating a new Picker session.
    }, [googlePhotoId, googleAccessToken, initialUrl]);

    return { url: resolvedUrl };
}

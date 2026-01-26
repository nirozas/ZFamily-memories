export interface GoogleMediaItem {
    id: string;
    type: 'PHOTO' | 'VIDEO';
    mediaFile: {
        baseUrl: string;
        mimeType: string;
    };
    creationTime: string;
    // For compatibility with Library API during uploads
    baseUrl?: string;
    mimeType?: string;
    filename?: string;
}

export interface GooglePhotosSearchResponse {
    mediaItems?: GoogleMediaItem[];
    nextPageToken?: string;
}

export class GooglePhotosService {
    private accessToken: string | null = null;
    private pickerBaseUrl = 'https://photospicker.googleapis.com/v1';
    private libraryBaseUrl = 'https://photoslibrary.googleapis.com/v1';

    constructor(accessToken: string | null) {
        this.accessToken = accessToken;
    }

    private async fetchWithAuth(endpoint: string, options: RequestInit = {}, api: 'picker' | 'library' = 'picker') {
        if (!this.accessToken) {
            throw new Error('Google access token is missing. Please sign in with Google.');
        }

        const baseUrl = api === 'picker' ? this.pickerBaseUrl : this.libraryBaseUrl;
        const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

        // Professional Header Handling: Only set Content-Type for requests with bodies
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.accessToken}`,
            ...((options.method && options.method !== 'GET') ? { 'Content-Type': 'application/json' } : {}),
            ...(options.headers as Record<string, string> || {}),
        };

        const response = await fetch(url, {
            ...options,
            headers,
        });

        if (response.status === 401) {
            throw new Error('Google session expired. Please sign in again.');
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const message = errorData.error?.message || response.statusText;
            const status = errorData.error?.status;

            // Log detailed violations for 400/403 errors
            if (response.status === 400 || response.status === 403) {
                console.error(`[GooglePhotos] ${api.toUpperCase()} API ERROR DETAILS:`, JSON.stringify(errorData, null, 2));
            }

            if (status === 'FAILED_PRECONDITION' || message.includes('PENDING_USER_ACTION')) {
                throw new Error('USER_NOT_FINISHED');
            }

            if (response.status === 403) {
                throw new Error(`INSUFFICIENT_PERMISSIONS: ${message}`);
            }

            throw new Error(message || `Google Photos ${api} API error: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Step 1: Create a Picker Session
     */
    async createPickerSession() {
        return this.fetchWithAuth('/sessions', {
            method: 'POST',
            body: JSON.stringify({
                pollingConfig: { timeoutIn: '600s' }
            })
        }, 'picker');
    }

    /**
     * Step 2: List items from a specific session
     */
    async listMediaItems(sessionId: string, pageSize = 50, pageToken?: string): Promise<GooglePhotosSearchResponse> {
        let url = `/mediaItems?sessionId=${sessionId}&pageSize=${pageSize}`;
        if (pageToken) url += `&pageToken=${pageToken}`;

        return this.fetchWithAuth(url, {}, 'picker');
    }

    /**
     * Search media items (Uses Picker API)
     */
    async searchMediaItems(params: {
        filters?: any;
        pageSize?: number;
        pageToken?: string;
    }): Promise<GooglePhotosSearchResponse> {
        return this.fetchWithAuth('/mediaItems:search', {
            method: 'POST',
            body: JSON.stringify(params),
        }, 'picker');
    }

    /**
     * Get a single media item by ID
     */
    async getMediaItem(itemId: string): Promise<GoogleMediaItem> {
        return this.fetchWithAuth(`/mediaItems/${itemId}`, {}, 'picker');
    }

    /**
     * Batch get media items
     */
    async batchGetMediaItems(itemIds: string[]): Promise<{ mediaItemResults: { mediaItem: GoogleMediaItem }[] }> {
        const ids = itemIds.map(id => `mediaItemIds=${id}`).join('&');
        return this.fetchWithAuth(`/mediaItems:batchGet?${ids}`, {}, 'picker');
    }

    /**
     * Upload a file to Google Photos (Uses Library API)
     * 1. Upload bytes to get an uploadToken
     * 2. Create the media item using the token
     */
    async uploadMedia(file: File, description?: string): Promise<GoogleMediaItem> {
        if (!this.accessToken) throw new Error('Not authenticated');

        // 1. Upload bytes (Library API)
        const uploadResponse = await fetch(`${this.libraryBaseUrl}/uploads`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.accessToken}`,
                'Content-type': 'application/octet-stream',
                'X-Goog-Upload-Protocol': 'raw',
                'X-Goog-Upload-File-Name': file.name,
            },
            body: file,
        });

        if (!uploadResponse.ok) {
            throw new Error('Failed to upload bytes to Google Photos');
        }

        const uploadToken = await uploadResponse.text();

        // 2. Create media item (Library API)
        const createResponse = await this.fetchWithAuth('/mediaItems:batchCreate', {
            method: 'POST',
            body: JSON.stringify({
                newMediaItems: [
                    {
                        description: description || file.name,
                        simpleMediaItem: {
                            uploadToken: uploadToken,
                        },
                    },
                ],
            }),
        }, 'library');

        const result = createResponse.newMediaItemResults[0];
        if (result.status.code !== 0 && result.status.code !== undefined) {
            throw new Error(result.status.message || 'Failed to create media item in Google Photos');
        }

        return result.mediaItem;
    }

    /**
     * Download a media item as a blob
     */
    async downloadMediaItem(baseUrl: string): Promise<Blob> {
        // Picker API URLs (lh3.googleusercontent.com) usually support =d for download.
        // Some might support ?download=true, but =d is safer for image CDN URLs.

        const constructUrls = (base: string) => {
            const isLibrary = base.includes('photoslibrary.googleapis.com');

            // Strategy 1: Standard 'download' param equivalent
            const primary = isLibrary ? `${base}=d` : `${base}=d`;

            // Strategy 2: High-res fetch
            const highRes = isLibrary ? `${base}=w9999-h9999` : `${base}=w9999-h9999`;

            // Strategy 3: Raw Base URL (sometimes just works for lh3 if public)
            const raw = base;

            return { primary, highRes, raw };
        };

        const { primary, highRes, raw } = constructUrls(baseUrl);

        const validateResponse = (res: Response) => {
            const type = res.headers.get('content-type');
            if (!res.ok) return false;
            // Reject HTML/JSON responses
            if (type && (type.includes('text/html') || type.includes('application/json'))) {
                return false;
            }
            return true;
        };

        const fetchOptions: RequestInit = {
            mode: 'cors',
            referrerPolicy: 'no-referrer'
        };

        const tryFetch = async (url: string, useAuth = false) => {
            const opts = { ...fetchOptions };
            if (useAuth && this.accessToken) {
                opts.headers = { 'Authorization': `Bearer ${this.accessToken}` };
            }
            try {
                const res = await fetch(url, opts);
                if (validateResponse(res)) {
                    const blob = await res.blob();
                    if (blob.size > 0) return blob;
                }
            } catch (e) { /* ignore */ }
            return null;
        };

        try {
            // Sequence of attempts:
            // 1. Primary (public)
            let blob = await tryFetch(primary);
            if (blob) return blob;

            // 2. High Res (public)
            blob = await tryFetch(highRes);
            if (blob) return blob;

            // 3. Raw (public)
            blob = await tryFetch(raw);
            if (blob) return blob;

            // 4. Primary (Auth) - Only if we have token
            if (this.accessToken) {
                console.warn('[GooglePhotos] Public attempts failed. Retrying with Auth...');
                blob = await tryFetch(primary, true);
                if (blob) return blob;

                // 5. Raw (Auth)
                blob = await tryFetch(raw, true);
                if (blob) return blob;
            }

            throw new Error('All download attempts failed to retrieve a valid media blob.');

        } catch (error) {
            console.error('[GooglePhotos] Download failed:', error);
            throw new Error('Failed to download media item from Google');
        }
    }
}

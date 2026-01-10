import { useEffect, useRef, useState, useCallback } from 'react';
import { useAlbum } from '../contexts/AlbumContext';
import _ from 'lodash';

export function useAlbumAutoSave() {
    const { album, saveAlbum, isSaving } = useAlbum();
    const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
    const [status, setStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

    // Store the last update timestamp to compare for changes
    const lastUpdatedAtRef = useRef<number>(album?.updatedAt?.getTime() || 0);

    const debouncedSave = useCallback(
        _.debounce(async () => {
            console.log('[AutoSave] Triggering save...');
            setStatus('saving');
            const result = await saveAlbum();
            if (result.success) {
                setLastSavedTime(new Date());
                setStatus('saved');
                console.log('[AutoSave] Save successful');
            } else {
                setStatus('unsaved');
                console.error('[AutoSave] Save failed', result.error);
            }
        }, 1500), // Reduced slightly for better responsiveness
        [saveAlbum]
    );

    useEffect(() => {
        if (!album) return;

        const currentUpdate = album.updatedAt?.getTime() || 0;
        if (currentUpdate > lastUpdatedAtRef.current) {
            // It has changed
            setStatus('unsaved');
            lastUpdatedAtRef.current = currentUpdate;
            debouncedSave();
        }

        // 2-minute periodic autosave fallback
        const periodicSave = setInterval(() => {
            if (status === 'unsaved') {
                console.log('[AutoSave] Periodic 2-min save trigger');
                debouncedSave();
                debouncedSave.flush(); // Execute immediately
            }
        }, 120000);

        // Cleanup
        return () => {
            debouncedSave.cancel();
            clearInterval(periodicSave);
        };
    }, [album, debouncedSave, status]);

    return {
        status,
        lastSavedTime
    };
}

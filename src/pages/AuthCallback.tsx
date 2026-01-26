import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
    const navigate = useNavigate();

    useEffect(() => {
        const handleAuthCallback = async () => {
            const { error } = await supabase.auth.getSession();
            if (error) {
                console.error('Error in auth callback:', error);
                navigate('/login?error=auth_callback_failed');
            } else {
                navigate('/');
            }
        };

        handleAuthCallback();
    }, [navigate]);

    return (
        <div className="min-h-screen bg-catalog-bg flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-catalog-accent border-t-transparent rounded-full animate-spin" />
                <p className="text-catalog-text/70 font-sans animate-pulse">Completing authentication...</p>
            </div>
        </div>
    );
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import { type User, type Session, type AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { UserRole, Profile } from '../types/supabase';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    profile: Profile | null;
    userRole: UserRole | null;
    familyId: string | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signUp: (email: string, password: string, fullName?: string) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<void>;
    useInviteCode: (code: string) => Promise<{ success: boolean; error?: string }>;
    validateInviteCode: (code: string) => Promise<{ valid: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [familyId, setFamilyId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Check if Supabase is properly configured
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    // Fetch user profile
    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error('Error fetching profile:', error);
                return;
            }

            if (data) {
                const profileData = data as any;
                setProfile(profileData);
                setUserRole(profileData.role);
                setFamilyId(profileData.family_id);
            }
        } catch (error) {
            console.error('Error in fetchProfile:', error);
        }
    };

    useEffect(() => {
        if (!supabaseUrl || !supabaseAnonKey) {
            console.error("Missing Supabase configuration");
            setLoading(false);
            return;
        }

        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            }
            setLoading(false);
        }).catch(() => {
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.user) {
                    fetchProfile(session.user.id);
                } else {
                    setProfile(null);
                    setUserRole(null);
                    setFamilyId(null);
                }
                setLoading(false);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    const validateInviteCode = async (code: string): Promise<{ valid: boolean; error?: string }> => {
        try {
            const { data, error } = await supabase
                .from('invite_codes')
                .select('*')
                .eq('code', code)
                .eq('is_active', true)
                .maybeSingle();

            if (error || !data) {
                return { valid: false, error: 'Invalid invite code' };
            }

            const inviteData = data as any;
            // Check if code has expired
            if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
                return { valid: false, error: 'Invite code has expired' };
            }

            // Check if code has reached max uses
            if (inviteData.current_uses >= inviteData.max_uses) {
                return { valid: false, error: 'Invite code has been fully used' };
            }

            return { valid: true };
        } catch (error) {
            console.error('Error validating invite code:', error);
            return { valid: false, error: 'Error validating invite code' };
        }
    };

    const useInviteCode = async (code: string): Promise<{ success: boolean; error?: string }> => {
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        try {
            const { data, error } = await supabase.rpc('use_invite_code', {
                code_param: code,
                user_id_param: user.id
            } as any);

            if (error) {
                return { success: false, error: error.message };
            }

            const result = data as { success: boolean; error?: string; family_id?: string; role?: UserRole };

            if (result.success) {
                // Refresh profile to get updated family and role
                await fetchProfile(user.id);
            }

            return result;
        } catch (error) {
            console.error('Error using invite code:', error);
            return { success: false, error: 'Failed to use invite code' };
        }
    };

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
    };

    const signUp = async (email: string, password: string, fullName?: string) => {
        // Sign up the user
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName
                }
            }
        });

        if (signUpError || !authData.user) {
            return { error: signUpError };
        }

        // Profile will be created automatically by the database trigger
        // User needs to use an invite code to join a family and get proper role
        return { error: null };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setProfile(null);
        setUserRole(null);
        setFamilyId(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            session,
            profile,
            userRole,
            familyId,
            loading,
            signIn,
            signUp,
            signOut,
            useInviteCode,
            validateInviteCode
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

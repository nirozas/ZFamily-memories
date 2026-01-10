export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type UserRole = 'admin' | 'creator' | 'member' | 'external_viewer';

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: {
                    id: string;
                    full_name: string | null;
                    avatar_url: string | null;
                    role: UserRole;
                    family_id: string | null;
                    created_at: string;
                    updated_at: string;
                }
                Insert: {
                    id: string;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    role?: UserRole;
                    family_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                }
                Update: {
                    id?: string;
                    full_name?: string | null;
                    avatar_url?: string | null;
                    role?: UserRole;
                    family_id?: string | null;
                    created_at?: string;
                    updated_at?: string;
                }
            }
            family_groups: {
                Row: {
                    id: string;
                    name: string;
                    created_at: string;
                    updated_at: string;
                }
                Insert: {
                    id?: string;
                    name: string;
                    created_at?: string;
                    updated_at?: string;
                }
                Update: {
                    id?: string;
                    name?: string;
                    created_at?: string;
                    updated_at?: string;
                }
            }
            invite_codes: {
                Row: {
                    id: string;
                    code: string;
                    family_id: string;
                    created_by: string | null;
                    role: UserRole;
                    max_uses: number;
                    current_uses: number;
                    expires_at: string | null;
                    created_at: string;
                    is_active: boolean;
                }
                Insert: {
                    id?: string;
                    code: string;
                    family_id: string;
                    created_by?: string | null;
                    role?: UserRole;
                    max_uses?: number;
                    current_uses?: number;
                    expires_at?: string | null;
                    created_at?: string;
                    is_active?: boolean;
                }
                Update: {
                    id?: string;
                    code?: string;
                    family_id?: string;
                    created_by?: string | null;
                    role?: UserRole;
                    max_uses?: number;
                    current_uses?: number;
                    expires_at?: string | null;
                    created_at?: string;
                    is_active?: boolean;
                }
            }
            events: {
                Row: {
                    id: string;
                    family_id: string;
                    title: string;
                    description: string | null;
                    event_date: string;
                    location: string | null;
                    geotag: Json | null;
                    category: string | null;
                    content: Json; // New field for rich media support
                    hashtags: string[] | null;
                    participants: string[] | null;
                    created_by: string | null;
                    created_at: string;
                    updated_at: string;
                }
                Insert: {
                    id?: string;
                    family_id: string;
                    title: string;
                    description?: string | null;
                    event_date: string;
                    location?: string | null;
                    geotag?: Json | null;
                    category?: string | null;
                    content?: Json;
                    hashtags?: string[] | null;
                    participants?: string[] | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                }
                Update: {
                    id?: string;
                    family_id?: string;
                    title?: string;
                    description?: string | null;
                    event_date?: string;
                    location?: string | null;
                    geotag?: Json | null;
                    category?: string | null;
                    content?: Json;
                    hashtags?: string[] | null;
                    participants?: string[] | null;
                    created_by?: string | null;
                    created_at?: string;
                    updated_at?: string;
                }
            }
            albums: {
                Row: {
                    id: string;
                    creator_id: string | null;
                    family_id: string;
                    event_id: string | null;
                    title: string;
                    description: string | null;
                    category: string | null;
                    cover_image_url: string | null;
                    config: Json;
                    location: string | null;
                    country: string | null;
                    geotag: Json | null;
                    is_published: boolean;
                    hashtags: string[] | null;
                    created_at: string;
                    updated_at: string;
                }
                Insert: {
                    id?: string;
                    creator_id?: string | null;
                    family_id: string;
                    event_id?: string | null;
                    title: string;
                    description?: string | null;
                    category?: string | null;
                    cover_image_url?: string | null;
                    config?: Json;
                    location?: string | null;
                    country?: string | null;
                    geotag?: Json | null;
                    is_published?: boolean;
                    hashtags?: string[] | null;
                    created_at?: string;
                    updated_at?: string;
                }
                Update: {
                    id?: string;
                    creator_id?: string | null;
                    family_id?: string;
                    event_id?: string | null;
                    title?: string;
                    description?: string | null;
                    category?: string | null;
                    cover_image_url?: string | null;
                    config?: Json;
                    location?: string | null;
                    country?: string | null;
                    geotag?: Json | null;
                    is_published?: boolean;
                    hashtags?: string[] | null;
                    created_at?: string;
                    updated_at?: string;
                }
            }
            pages: {
                Row: {
                    id: string;
                    album_id: string;
                    page_number: number;
                    template_id: string;
                    background_color: string;
                    background_image: string | null;
                    created_at: string;
                    updated_at: string;
                }
                Insert: {
                    id?: string;
                    album_id: string;
                    page_number: number;
                    template_id: string;
                    background_color?: string;
                    background_image?: string | null;
                    created_at?: string;
                    updated_at?: string;
                }
                Update: {
                    id?: string;
                    album_id?: string;
                    page_number?: number;
                    template_id?: string;
                    background_color?: string;
                    background_image?: string | null;
                    created_at?: string;
                    updated_at?: string;
                }
            }
            assets: {
                Row: {
                    id: string;
                    page_id: string;
                    url: string;
                    asset_type: 'image' | 'video' | 'ribbon' | 'frame' | 'text';
                    config: Json;
                    z_index: number;
                    slot_id: number | null;
                    created_at: string;
                    updated_at: string;
                }
                Insert: {
                    id?: string;
                    page_id: string;
                    url: string;
                    asset_type: 'image' | 'video' | 'ribbon' | 'frame' | 'text';
                    config?: Json;
                    z_index?: number;
                    slot_id?: number | null;
                    created_at?: string;
                    updated_at?: string;
                }
                Update: {
                    id?: string;
                    page_id?: string;
                    url?: string;
                    asset_type?: 'image' | 'video' | 'ribbon' | 'frame' | 'text';
                    config?: Json;
                    z_index?: number;
                    slot_id?: number | null;
                    created_at?: string;
                    updated_at?: string;
                }
            }
            shared_links: {
                Row: {
                    id: string;
                    album_id: string | null;
                    event_id: string | null; // Added event_id
                    token: string;
                    created_by: string | null;
                    created_at: string;
                    expires_at: string;
                    is_active: boolean;
                }
                Insert: {
                    id?: string;
                    album_id?: string | null;
                    event_id?: string | null;
                    token: string;
                    created_by?: string | null;
                    created_at?: string;
                    expires_at?: string;
                    is_active?: boolean;
                }
                Update: {
                    id?: string;
                    album_id?: string | null;
                    event_id?: string | null;
                    token?: string;
                    created_by?: string | null;
                    created_at?: string;
                    expires_at?: string;
                    is_active?: boolean;
                }
            }
            keywords: {
                Row: {
                    id: number
                }
                Insert: {
                    id?: never
                }
                Update: {
                    id?: never
                }
            }
            library_assets: {
                Row: {
                    id: string
                    category: 'background' | 'sticker' | 'frame'
                    url: string
                    name: string
                    tags: string[]
                    is_premium: boolean
                    created_at: string
                }
                Insert: {
                    id?: string
                    category: 'background' | 'sticker' | 'frame'
                    url: string
                    name: string
                    tags?: string[]
                    is_premium?: boolean
                    created_at?: string
                }
                Update: {
                    id?: string
                    category?: 'background' | 'sticker' | 'frame'
                    url?: string
                    name?: string
                    tags?: string[]
                    is_premium?: boolean
                    created_at?: string
                }
            }
            family_media: {
                Row: {
                    id: string
                    family_id: string
                    url: string
                    type: 'image' | 'video'
                    category: string | null
                    folder: string | null // Added folder
                    filename: string | null
                    size: number | null
                    uploaded_by: string | null
                    created_at: string
                    updated_at: string
                }
                Insert: {
                    id?: string
                    family_id: string
                    url: string
                    type: 'image' | 'video'
                    category?: string | null
                    folder?: string | null // Added folder
                    filename?: string | null
                    size?: number | null
                    uploaded_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
                Update: {
                    id?: string
                    family_id?: string
                    url?: string
                    type?: 'image' | 'video'
                    category?: string | null
                    folder?: string | null // Added folder
                    filename?: string | null
                    size?: number | null
                    uploaded_by?: string | null
                    created_at?: string
                    updated_at?: string
                }
            }
        }
        Views: {}
        Functions: {
            use_invite_code: {
                Args: { code_param: string; user_id_param: string }
                Returns: Json
            }
            is_share_link_valid: {
                Args: { token_param: string }
                Returns: boolean
            }
        }
    }
}

// Helper types for application use
export interface Profile {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: UserRole;
    family_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface FamilyGroup {
    id: string;
    name: string;
    created_at: string;
    updated_at: string;
}

export interface InviteCode {
    id: string;
    code: string;
    family_id: string;
    created_by: string | null;
    role: UserRole;
    max_uses: number;
    current_uses: number;
    expires_at: string | null;
    created_at: string;
    is_active: boolean;
}

export interface Event {
    id: string;
    family_id: string;
    title: string;
    description: string | null;
    event_date: string;
    location: string | null;
    geotag: { lat: number; lng: number } | null;
    category: string | null;
    content: any; // New field
    hashtags: string[] | null;
    participants: string[] | null;
    created_by: string | null;
    created_at: string;
    updated_at: string;
}

export interface Album {
    id: string;
    creator_id: string | null;
    family_id: string;
    event_id: string | null;
    title: string;
    description: string | null;
    category: string | null;
    cover_image_url: string | null;
    config: {
        theme?: string;
        background?: string;
        [key: string]: any;
    };
    is_published: boolean;
    location?: string;
    country?: string;
    geotag?: { lat: number; lng: number } | null;
    created_at: string;
    updated_at: string;
}

export interface Page {
    id: string;
    album_id: string;
    page_number: number;
    template_id: string;
    background_color: string;
    background_image: string | null;
    created_at: string;
    updated_at: string;
}

export interface Asset {
    id: string;
    page_id: string;
    url: string;
    asset_type: 'image' | 'video' | 'ribbon' | 'frame' | 'text';
    config: {
        // Transform data
        x?: number;
        y?: number;
        width?: number;
        height?: number;
        rotation?: number;
        scale?: number;
        // Filter data
        filter?: 'cartoon' | 'pencil' | 'watercolor' | 'portrait' | 'auto-touch';
        filterIntensity?: number;
        // AI prompts
        aiPrompt?: string;
        // Text content (for text assets)
        content?: string;
        [key: string]: any;
    };
    z_index: number;
    slot_id: number | null;
    created_at: string;
    updated_at: string;
}

export interface SharedLink {
    id: string;
    album_id: string | null;
    event_id: string | null; // Added event_id
    token: string;
    created_by: string | null;
    created_at: string;
    expires_at: string;
    is_active: boolean;
}


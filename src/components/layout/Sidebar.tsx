import { Flame, BookOpen, Settings, User, Calendar, Image } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export function Sidebar() {
    const { user } = useAuth();

    const navItems = [
        { icon: Flame, label: 'The Hearth', href: '/', color: 'bg-pastel-red/30' },
        { icon: BookOpen, label: 'The Library', href: '/library', color: 'bg-pastel-orange/30' },
        { icon: Image, label: 'Media', href: '/media', color: 'bg-pastel-yellow/30' },
        { icon: Calendar, label: 'Events', href: '/events', color: 'bg-pastel-green/30' },
        { icon: User, label: 'Profile', href: '/profile', color: 'bg-pastel-purple/30' },
        { icon: Settings, label: 'Settings', href: '/settings', color: 'bg-pastel-pink/30' },
    ];

    // Get user initials
    const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
    const userInitial = userName.charAt(0).toUpperCase();

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-catalog-accent/20 shadow-sm transition-transform">
            <div className="absolute top-0 right-0 h-full w-[2px] bg-rainbow opacity-50" />
            <div className="flex h-full flex-col">
                {/* Logo Area */}
                <div className="flex h-20 items-center justify-center border-b border-catalog-accent/20">
                    <h1 className="text-2xl font-serif italic text-catalog-text">
                        <span className="text-catalog-accent">Zoabi</span>-Family
                    </h1>
                </div>

                {/* Navigation */}
                <nav className="flex-1 space-y-2 p-4">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.href}
                            to={item.href}
                            className={({ isActive }) =>
                                cn(
                                    "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors rounded-sm",
                                    isActive
                                        ? `${item.color} text-catalog-text shadow-sm`
                                        : "text-catalog-text/70 hover:bg-black/5 hover:text-catalog-text"
                                )
                            }
                        >
                            <item.icon className="h-5 w-5" />
                            <span className="font-sans tracking-wide">{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                {/* Footer - User info */}
                <div className="border-t border-catalog-accent/20 p-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-catalog-accent/20 border border-catalog-accent flex items-center justify-center">
                            <span className="font-serif italic text-catalog-accent font-bold">{userInitial}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-sm font-medium">{userName}</span>
                            <span className="text-xs text-catalog-text/60">
                                {user?.app_metadata?.role === 'admin' ? 'Admin' : 'Member'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}

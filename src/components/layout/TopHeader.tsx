import { useState, useRef, useEffect } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { Flame, BookOpen, Settings, User, Calendar, ChevronDown, LogOut, MapPin, Image as ImageIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export function TopHeader() {
    const { user, signOut } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const userDropdownRef = useRef<HTMLDivElement>(null);

    interface NavItem {
        icon: React.ElementType;
        label: string;
        href: string;
    }

    const navItems: (NavItem & { color: string })[] = [
        { icon: Flame, label: 'Home', href: '/', color: 'bg-pastel-red/30' },
        { icon: Calendar, label: 'Events', href: '/events', color: 'bg-pastel-indigo/30' },
        { icon: BookOpen, label: 'Albums', href: '/library', color: 'bg-pastel-orange/30' },
        { icon: ImageIcon, label: 'Media', href: '/media', color: 'bg-pastel-yellow/30' },
        { icon: MapPin, label: 'Traveling Map', href: '/map', color: 'bg-pastel-green/30' },
    ];

    const userName = user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
    const userInitial = userName.charAt(0).toUpperCase();

    // Close dropdowns on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
            if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
                setIsUserMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-catalog-accent/20 h-16">
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-rainbow shadow-[0_1px_10px_rgba(160,196,255,0.4)]" />
            <div className="max-w-wide h-full px-4 sm:px-6 lg:px-8 flex items-center justify-between">
                {/* Logo & Dropdown Trigger */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="flex items-center gap-2 group focus:outline-none"
                    >
                        <h1 className="text-2xl font-serif italic text-catalog-text transition-colors group-hover:text-catalog-accent">
                            <span className="text-catalog-accent">Zoabi</span>-Family
                        </h1>
                        <ChevronDown className={cn(
                            "w-5 h-5 text-catalog-accent transition-transform duration-300",
                            isOpen && "rotate-180"
                        )} />
                    </button>

                    {/* Pull-down Menu */}
                    {isOpen && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-md shadow-xl border border-catalog-accent/20 overflow-hidden animate-slide-up origin-top-left">
                            <div className="py-2">
                                {navItems.map((item) => (
                                    <NavLink
                                        key={item.href}
                                        to={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={({ isActive }) =>
                                            cn(
                                                "flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors",
                                                isActive
                                                    ? `${item.color} text-catalog-text`
                                                    : "text-catalog-text/70 hover:bg-black/5 hover:text-catalog-text"
                                            )
                                        }
                                    >
                                        <item.icon className="h-5 w-5" />
                                        <span className="font-sans tracking-wide">{item.label}</span>
                                    </NavLink>
                                ))}
                                <div className="border-t border-catalog-accent/10 my-1" />
                                <button
                                    onClick={() => {
                                        setIsOpen(false);
                                        signOut();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut className="h-5 w-5" />
                                    <span className="font-sans tracking-wide">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side - User Profile Quick Info */}
                <div className="relative" ref={userDropdownRef}>
                    <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="flex items-center gap-3 p-1 rounded-full hover:bg-black/5 transition-colors focus:outline-none"
                    >
                        <div className="hidden sm:flex items-center gap-4 mr-3">
                            <div className="flex flex-col items-end">
                                <span className="text-sm font-sans font-bold text-catalog-text leading-tight">{userName}</span>
                                <span className="text-[10px] text-catalog-accent uppercase tracking-widest font-bold">
                                    {user?.app_metadata?.role || 'Member'}
                                </span>
                            </div>
                            <div
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    signOut();
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        signOut();
                                    }
                                }}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors flex items-center justify-center border border-red-100/50 cursor-pointer"
                                title="Sign Out"
                            >
                                <LogOut className="h-4 w-4" />
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-catalog-accent/10 border border-catalog-accent/30 flex items-center justify-center">
                            <span className="font-serif italic text-catalog-accent font-bold">{userInitial}</span>
                        </div>
                    </button>

                    {/* User Dropdown Menu */}
                    {isUserMenuOpen && (
                        <div className="absolute top-full right-0 mt-2 w-56 bg-white rounded-md shadow-xl border border-catalog-accent/20 overflow-hidden animate-slide-up origin-top-right">
                            <div className="py-2">
                                <Link
                                    to="/profile"
                                    onClick={() => setIsUserMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-catalog-text/70 hover:bg-black/5 hover:text-catalog-text transition-colors"
                                >
                                    <User className="h-5 w-5" />
                                    <span className="font-sans tracking-wide">Profile</span>
                                </Link>
                                <Link
                                    to="/settings"
                                    onClick={() => setIsUserMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-catalog-text/70 hover:bg-black/5 hover:text-catalog-text transition-colors"
                                >
                                    <Settings className="h-5 w-5" />
                                    <span className="font-sans tracking-wide">Settings</span>
                                </Link>
                                <div className="border-t border-catalog-accent/10 my-1" />
                                <button
                                    onClick={() => {
                                        setIsUserMenuOpen(false);
                                        signOut();
                                    }}
                                    className="sm:hidden w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut className="h-5 w-5" />
                                    <span className="font-sans tracking-wide">Sign Out</span>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}

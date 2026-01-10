import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { User, Shield, Lock, Trash2, Edit2 } from 'lucide-react';

export function Settings() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'admin'>('profile');

    // Password change state
    const [passwordData, setPasswordData] = useState({ newPassword: '', confirmPassword: '' });
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    // Admin state
    const [users, setUsers] = useState<any[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);

    useEffect(() => {
        if (user?.app_metadata?.role === 'admin') {
            setIsAdmin(true);
            fetchUsers();
        }
    }, [user]);

    async function fetchUsers() {
        setLoadingUsers(true);
        try {
            const { data } = await supabase.from('profiles').select('*');
            if (data) setUsers(data);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoadingUsers(false);
        }
    }

    async function handleUpdatePassword(e: React.FormEvent) {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            alert("Passwords don't match");
            return;
        }
        setIsUpdatingPassword(true);
        const { error } = await supabase.auth.updateUser({ password: passwordData.newPassword });
        setIsUpdatingPassword(false);
        if (error) alert(error.message);
        else {
            alert("Password updated successfully");
            setPasswordData({ newPassword: '', confirmPassword: '' });
        }
    }

    async function handleDeleteUser(userId: string) {
        if (!window.confirm("Are you sure you want to delete this user profile?")) return;
        const { error } = await supabase.from('profiles').delete().eq('id', userId);
        if (error) alert(error.message);
        else fetchUsers();
    }

    const tabs = [
        { id: 'profile', label: 'My Identity', icon: User },
        { id: 'security', label: 'Access & Key', icon: Lock },
        ...(isAdmin ? [{ id: 'admin', label: 'The Council (Admin)', icon: Shield }] : [])
    ];

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            <h1 className="text-4xl font-serif text-catalog-text border-b border-catalog-accent/20 pb-4">Settings</h1>

            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar Tabs */}
                <div className="md:w-64 space-y-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all rounded-sm ${activeTab === tab.id
                                    ? "bg-catalog-accent text-white shadow-md shadow-catalog-accent/20"
                                    : "text-catalog-text/60 hover:bg-black/5 hover:text-catalog-text"
                                }`}
                        >
                            <tab.icon className="w-5 h-5" />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content Area */}
                <div className="flex-1">
                    {activeTab === 'profile' && (
                        <Card className="p-8 space-y-8 animate-fade-in">
                            <h2 className="text-2xl font-serif text-catalog-text">Identity Settings</h2>
                            <div className="space-y-4 max-w-md">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-catalog-accent uppercase tracking-widest">Public Name</label>
                                    <input
                                        type="text"
                                        defaultValue={user?.user_metadata?.name}
                                        className="w-full px-4 py-2 border border-catalog-accent/20 rounded-sm bg-gray-50"
                                        disabled
                                    />
                                    <p className="text-xs text-catalog-text/40 italic">Managed by the family administrator.</p>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-catalog-accent uppercase tracking-widest">Email Address</label>
                                    <input
                                        type="email"
                                        defaultValue={user?.email}
                                        className="w-full px-4 py-2 border border-catalog-accent/20 rounded-sm bg-gray-50"
                                        disabled
                                    />
                                </div>
                            </div>
                        </Card>
                    )}

                    {activeTab === 'security' && (
                        <Card className="p-8 space-y-8 animate-fade-in">
                            <h2 className="text-2xl font-serif text-catalog-text">Security & Access</h2>
                            <form onSubmit={handleUpdatePassword} className="space-y-6 max-w-md">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-catalog-accent uppercase tracking-widest">New Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                            className="w-full px-4 py-2 border border-catalog-accent/20 rounded-sm focus:outline-none focus:ring-2 focus:ring-catalog-accent/50"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-catalog-accent uppercase tracking-widest">Confirm Password</label>
                                        <input
                                            type="password"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                            className="w-full px-4 py-2 border border-catalog-accent/20 rounded-sm focus:outline-none focus:ring-2 focus:ring-catalog-accent/50"
                                            required
                                        />
                                    </div>
                                </div>
                                <Button type="submit" isLoading={isUpdatingPassword} variant="primary">
                                    Refresh Security Key
                                </Button>
                            </form>
                        </Card>
                    )}

                    {activeTab === 'admin' && isAdmin && (
                        <Card className="p-8 space-y-8 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <h2 className="text-2xl font-serif text-catalog-text">The Council (User Management)</h2>
                                <Button variant="secondary" size="sm" onClick={fetchUsers} isLoading={loadingUsers}>
                                    Reload Pulse
                                </Button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-catalog-accent/10">
                                            <th className="py-4 px-2 text-xs font-bold text-catalog-accent uppercase tracking-widest">Member</th>
                                            <th className="py-4 px-2 text-xs font-bold text-catalog-accent uppercase tracking-widest">Role</th>
                                            <th className="py-4 px-2 text-xs font-bold text-catalog-accent uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-catalog-accent/5">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-black/5 transition-colors">
                                                <td className="py-4 px-2">
                                                    <div className="font-serif italic font-medium">{u.full_name}</div>
                                                    <div className="text-xs text-catalog-text/40">{u.id}</div>
                                                </td>
                                                <td className="py-4 px-2 uppercase tracking-tight text-xs font-bold text-catalog-text/70">{u.role}</td>
                                                <td className="py-4 px-2 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button variant="ghost" size="sm" className="p-2 h-auto">
                                                            <Edit2 className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="p-2 h-auto text-red-500 hover:text-red-600 hover:bg-red-50"
                                                            onClick={() => handleDeleteUser(u.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Input } from '../ui/Input';
import { Users, UserPlus, Shield, Copy, Check, Trash2, Mail, Edit3, Save, X, BookOpen, Calendar } from 'lucide-react';
import { emailService } from '../../services/emailService';

export function FamilyManagement() {
    const { user, familyId, userRole } = useAuth();
    const [members, setMembers] = useState<any[]>([]);
    const [memberStats, setMemberStats] = useState<Record<string, { albums: number; events: number }>>({});
    const [inviteCodes, setInviteCodes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [editingMember, setEditingMember] = useState<string | null>(null);
    const [editRole, setEditRole] = useState<'member' | 'creator' | 'admin'>('member');

    // Manual Add State
    const [manualEmail, setManualEmail] = useState('');
    const [manualRole, setManualRole] = useState<'member' | 'creator' | 'admin'>('member');

    const isAdmin = userRole === 'admin';

    useEffect(() => {
        if (familyId) {
            fetchFamilyData();
        }
    }, [familyId]);

    const fetchFamilyData = async () => {
        setLoading(true);
        try {
            // Fetch Members
            const { data: memberData } = await (supabase
                .from('profiles') as any)
                .select('*')
                .eq('family_id' as any, familyId as any);

            setMembers(memberData || []);

            // Fetch Stats for each member
            if (memberData) {
                const stats: Record<string, { albums: number; events: number }> = {};
                for (const member of memberData) {
                    const { count: albums } = await supabase
                        .from('albums')
                        .select('*', { count: 'exact', head: true })
                        .eq('creator_id', member.id);

                    const { count: events } = await supabase
                        .from('events')
                        .select('*', { count: 'exact', head: true })
                        .eq('created_by', member.id);

                    stats[member.id] = { albums: albums || 0, events: events || 0 };
                }
                setMemberStats(stats);
            }

            // Fetch Active Invite Codes
            if (isAdmin) {
                const { data: codeData } = await (supabase
                    .from('invite_codes') as any)
                    .select('*')
                    .eq('family_id' as any, familyId as any)
                    .eq('is_active' as any, true)
                    .gt('expires_at' as any, new Date().toISOString());

                setInviteCodes(codeData || []);
            }
        } catch (error) {
            console.error('Error fetching family data:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateInviteCode = async (email?: string) => {
        if (!familyId || !user) return;
        setGenerating(true);
        try {
            const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
            const baseCode = email
                ? `INVITE-${email.split('@')[0].toUpperCase()}-${randomSuffix}`
                : `JOIN-ZOABI-${randomSuffix}`;

            const { error } = await (supabase
                .from('invite_codes') as any)
                .insert({
                    code: baseCode,
                    family_id: familyId,
                    created_by: user.id,
                    role: email ? manualRole : 'member',
                    max_uses: 1,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
                } as any);

            if (error) throw error;
            fetchFamilyData();
            if (email) {
                setManualEmail('');
                emailService.sendInviteEmail(email, baseCode);
            }
        } catch (error: any) {
            alert(`Failed to generate code: ${error.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(text);
        setTimeout(() => setCopied(null), 2000);
    };

    const deleteInvite = async (id: string) => {
        if (!confirm('Cancel this invitation?')) return;
        try {
            await (supabase.from('invite_codes') as any).delete().eq('id' as any, id as any);
            fetchFamilyData();
        } catch (error) {
            console.error('Error deleting invite:', error);
        }
    };

    const updateMemberRole = async (memberId: string, newRole: string) => {
        try {
            const { error } = await (supabase.from('profiles') as any)
                .update({ role: newRole })
                .eq('id', memberId);

            if (error) throw error;
            setEditingMember(null);
            fetchFamilyData();
        } catch (error: any) {
            alert(`Failed to update role: ${error.message}`);
        }
    };

    const removeMember = async (memberId: string) => {
        if (!confirm('Are you sure you want to remove this member from the family? They will no longer have access to family records.')) return;
        try {
            const { error } = await (supabase.from('profiles') as any)
                .update({ family_id: null, role: 'member' })
                .eq('id', memberId);

            if (error) throw error;
            fetchFamilyData();
        } catch (error: any) {
            alert(`Failed to remove member: ${error.message}`);
        }
    };

    if (loading) return (
        <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-catalog-accent border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Family Members */}
            <section className="space-y-4">
                <h3 className="text-xl font-serif text-catalog-text flex items-center gap-2">
                    <Users className="w-5 h-5 text-catalog-accent" />
                    Family Members
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {members.map((member) => (
                        <Card key={member.id} className="p-4 flex items-center justify-between bg-white/50 backdrop-blur-sm">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-catalog-accent/10 flex items-center justify-center border border-catalog-accent/20">
                                    <span className="font-serif italic text-catalog-accent font-bold">
                                        {(member.full_name || 'U').charAt(0).toUpperCase()}
                                    </span>
                                </div>
                                <div>
                                    <p className="font-medium text-catalog-text">{member.full_name || 'Anonymous'}</p>
                                    <div className="flex items-center gap-2">
                                        {editingMember === member.id ? (
                                            <div className="flex items-center gap-1">
                                                <select
                                                    value={editRole}
                                                    onChange={(e) => setEditRole(e.target.value as any)}
                                                    className="text-xs bg-white border border-catalog-accent/20 rounded px-1.5 py-0.5 focus:outline-none"
                                                >
                                                    <option value="member">Member</option>
                                                    <option value="creator">Creator</option>
                                                    <option value="admin">Admin</option>
                                                </select>
                                                <button
                                                    onClick={() => updateMemberRole(member.id, editRole)}
                                                    className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                >
                                                    <Save className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                    onClick={() => setEditingMember(null)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <p className="text-xs text-catalog-text/50 capitalize flex items-center gap-1">
                                                {member.role === 'admin' && <Shield className="w-3 h-3" />}
                                                {member.role}
                                                {isAdmin && member.id !== user?.id && (
                                                    <button
                                                        onClick={() => { setEditingMember(member.id); setEditRole(member.role); }}
                                                        className="p-1 hover:bg-catalog-accent/10 rounded ml-1 transition-colors"
                                                    >
                                                        <Edit3 className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1.5 pt-1.5 border-t border-catalog-accent/5">
                                        <span className="text-[10px] text-catalog-text/40 bg-blue-50/50 px-1.5 py-0.5 rounded flex items-center gap-1" title="Albums">
                                            <BookOpen className="w-2.5 h-2.5" />
                                            {memberStats[member.id]?.albums || 0}
                                        </span>
                                        <span className="text-[10px] text-catalog-text/40 bg-orange-50/50 px-1.5 py-0.5 rounded flex items-center gap-1" title="Events">
                                            <Calendar className="w-2.5 h-2.5" />
                                            {memberStats[member.id]?.events || 0}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {isAdmin && member.id !== user?.id && !editingMember && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-400 hover:text-red-500 hover:bg-red-50"
                                    onClick={() => removeMember(member.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            )}
                        </Card>
                    ))}
                </div>
            </section>

            {isAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 border-t border-catalog-accent/10">
                    {/* Active Invitations */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-serif text-catalog-text flex items-center gap-2">
                            <Mail className="w-4 h-4 text-catalog-accent" />
                            Pending Invitations
                        </h3>
                        <div className="space-y-3">
                            {inviteCodes.length === 0 ? (
                                <p className="text-sm text-catalog-text/40 italic">No active invite codes.</p>
                            ) : (
                                inviteCodes.map((code) => (
                                    <div key={code.id} className="flex flex-col p-3 bg-white border border-catalog-accent/10 rounded-lg group">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-mono text-sm font-bold text-catalog-accent">{code.code}</span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => copyToClipboard(code.code)}
                                                    className="p-1.5 hover:bg-catalog-accent/10 rounded transition-colors text-catalog-accent"
                                                    title="Copy Code"
                                                >
                                                    {copied === code.code ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                                </button>
                                                <button
                                                    onClick={() => deleteInvite(code.id)}
                                                    className="p-1.5 hover:bg-red-50 rounded transition-colors text-red-400"
                                                    title="Cancel Invite"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] text-catalog-text/40 uppercase tracking-widest font-bold">
                                            <span>Role: {code.role}</span>
                                            <span>Expires: {new Date(code.expires_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                            <Button
                                variant="outline"
                                className="w-full border-dashed"
                                onClick={() => generateInviteCode()}
                                isLoading={generating}
                            >
                                <UserPlus className="w-4 h-4 mr-2" />
                                Quick Invite Code
                            </Button>
                        </div>
                    </section>

                    {/* Manual Add / Detailed Invite */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-serif text-catalog-text flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-catalog-accent" />
                            Add Member Manually
                        </h3>
                        <Card className="p-4 space-y-4 bg-catalog-stone/5">
                            <Input
                                label="Member Email"
                                placeholder="name@email.com"
                                value={manualEmail}
                                onChange={(e) => setManualEmail(e.target.value)}
                            />
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-catalog-text/50 uppercase tracking-wider">Role</label>
                                <select
                                    className="w-full bg-white border border-catalog-accent/20 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-catalog-accent/30"
                                    value={manualRole}
                                    onChange={(e) => setManualRole(e.target.value as any)}
                                >
                                    <option value="member">Member (View & Review)</option>
                                    <option value="creator">Creator (Edit Events/Albums)</option>
                                    <option value="admin">Administrator (Full Control)</option>
                                </select>
                            </div>
                            <Button
                                variant="primary"
                                className="w-full"
                                onClick={() => generateInviteCode(manualEmail)}
                                disabled={!manualEmail || generating}
                                isLoading={generating}
                            >
                                Generate Specific Invite
                            </Button>
                            <p className="text-[10px] text-catalog-text/50 leading-relaxed">
                                Note: This generates a unique invite code. Provide this code to the user during their signup process.
                            </p>
                        </Card>
                    </section>
                </div>
            )}
        </div>
    );
}

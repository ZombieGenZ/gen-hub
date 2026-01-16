'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    userManagementApi,
    rolesApi,
    permissionsApi,
    UserDetail,
    UserWarningItem,
    UserSession,
    UserRolesAndPermissions,
    Role,
    PermissionWithAssignment,
} from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
    ArrowLeft,
    RefreshCw,
    Loader2,
    ShieldCheck,
    ShieldX,
    Clock,
    Mail,
    Calendar,
    AlertTriangle,
    Ban,
    CheckCircle2,
    XCircle,
    Monitor,
    Globe,
    LogOut,
    Shield,
    Key,
    Trash2,
    Plus,
} from 'lucide-react';

type TabType = 'info' | 'warnings' | 'sessions' | 'roles';

export default function UserDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const { t } = useLanguage();

    const [user, setUser] = useState<UserDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('info');

    // Warnings state
    const [warnings, setWarnings] = useState<UserWarningItem[]>([]);
    const [warningsLoading, setWarningsLoading] = useState(false);

    // Sessions state
    const [sessions, setSessions] = useState<UserSession[]>([]);
    const [sessionsLoading, setSessionsLoading] = useState(false);

    // Roles & Permissions state
    const [userRolesPermissions, setUserRolesPermissions] = useState<UserRolesAndPermissions | null>(null);
    const [allRoles, setAllRoles] = useState<Role[]>([]);
    const [allPermissions, setAllPermissions] = useState<PermissionWithAssignment[]>([]);
    const [rolesPermissionsLoading, setRolesPermissionsLoading] = useState(false);
    const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
    const [isSavingRoles, setIsSavingRoles] = useState(false);

    // Ban modal state
    const [showBanModal, setShowBanModal] = useState(false);
    const [banReason, setBanReason] = useState('');
    const [banIsPermanent, setBanIsPermanent] = useState(false);
    const [banEndDate, setBanEndDate] = useState('');
    const [isBanning, setIsBanning] = useState(false);

    // Unban modal state
    const [showUnbanModal, setShowUnbanModal] = useState(false);
    const [unbanNote, setUnbanNote] = useState('');
    const [isUnbanning, setIsUnbanning] = useState(false);

    const fetchUser = useCallback(async () => {
        if (!id) return;
        setIsLoading(true);
        try {
            const data = await userManagementApi.getUserById(id as string);
            setUser(data);
        } catch (error) {
            console.error('Failed to fetch user:', error);
            toast.error(t('common.error') || 'Failed to load user');
        } finally {
            setIsLoading(false);
        }
    }, [id, t]);

    const fetchWarnings = useCallback(async () => {
        if (!id) return;
        setWarningsLoading(true);
        try {
            const data = await userManagementApi.getUserWarnings(id as string, { limit: 100 });
            setWarnings(data.items);
        } catch (error) {
            console.error('Failed to fetch warnings:', error);
        } finally {
            setWarningsLoading(false);
        }
    }, [id]);

    const fetchSessions = useCallback(async () => {
        if (!id) return;
        setSessionsLoading(true);
        try {
            const data = await userManagementApi.getUserSessions(id as string, { limit: 100 });
            setSessions(data.items);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setSessionsLoading(false);
        }
    }, [id]);

    const fetchRolesPermissions = useCallback(async () => {
        if (!id) return;
        setRolesPermissionsLoading(true);
        try {
            // Fetch user's current roles and permissions
            const userRolesPerms = await userManagementApi.getUserRolesAndPermissions(id as string);
            setUserRolesPermissions(userRolesPerms);

            // Initialize selected IDs
            setSelectedRoleIds(new Set(userRolesPerms.roles.map(r => r.id)));
            setSelectedPermissionIds(new Set(
                userRolesPerms.permissions
                    .filter(p => p.source === 'direct')
                    .map(p => p.id)
            ));

            // Fetch all available roles
            const rolesData = await rolesApi.getRoles({ limit: '1000', status: 'ACTIVE' });
            setAllRoles(rolesData.data);

            // Fetch all permissions with assignment status for this user
            const permsData = await permissionsApi.getPermissions({
                limit: '1000',
                status: 'ACTIVE',
                type: 'user',
                id: id as string
            });
            setAllPermissions((permsData as { data: PermissionWithAssignment[] }).data);
        } catch (error) {
            console.error('Failed to fetch roles/permissions:', error);
        } finally {
            setRolesPermissionsLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    useEffect(() => {
        if (activeTab === 'warnings') {
            fetchWarnings();
        } else if (activeTab === 'sessions') {
            fetchSessions();
        } else if (activeTab === 'roles') {
            fetchRolesPermissions();
        }
    }, [activeTab, fetchWarnings, fetchSessions, fetchRolesPermissions]);

    const handleBanUser = async () => {
        if (!id || !banReason.trim()) return;
        setIsBanning(true);
        try {
            const result = await userManagementApi.banUser(id as string, {
                reason: banReason,
                is_permanent: banIsPermanent,
                banned_end: banIsPermanent ? undefined : banEndDate || undefined,
            });
            setUser(result);
            setShowBanModal(false);
            setBanReason('');
            setBanIsPermanent(false);
            setBanEndDate('');
            toast.success(t('userManagement.banSuccess') || 'User banned successfully');
        } catch (error) {
            console.error('Failed to ban user:', error);
            toast.error(t('userManagement.banError') || 'Failed to ban user');
        } finally {
            setIsBanning(false);
        }
    };

    const handleUnbanUser = async () => {
        if (!id) return;
        setIsUnbanning(true);
        try {
            const result = await userManagementApi.unbanUser(id as string, { note: unbanNote });
            setUser(result);
            setShowUnbanModal(false);
            setUnbanNote('');
            toast.success(t('userManagement.unbanSuccess') || 'User unbanned successfully');
        } catch (error) {
            console.error('Failed to unban user:', error);
            toast.error(t('userManagement.unbanError') || 'Failed to unban user');
        } finally {
            setIsUnbanning(false);
        }
    };

    const handleRevokeSession = async (sessionId: string) => {
        if (!id) return;
        try {
            await userManagementApi.revokeSession(id as string, sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            toast.success(t('userManagement.sessionRevoked') || 'Session revoked');
        } catch (error) {
            console.error('Failed to revoke session:', error);
            toast.error(t('common.error') || 'Failed to revoke session');
        }
    };

    const handleRevokeAllSessions = async () => {
        if (!id) return;
        try {
            await userManagementApi.revokeAllSessions(id as string);
            setSessions([]);
            toast.success(t('userManagement.allSessionsRevoked') || 'All sessions revoked');
        } catch (error) {
            console.error('Failed to revoke all sessions:', error);
            toast.error(t('common.error') || 'Failed to revoke sessions');
        }
    };

    const handleSaveRolesPermissions = async () => {
        if (!id) return;
        setIsSavingRoles(true);
        try {
            const result = await userManagementApi.assignUserRolesPermissions(id as string, {
                role_ids: Array.from(selectedRoleIds),
                permission_ids: Array.from(selectedPermissionIds),
            });
            setUserRolesPermissions(result);
            toast.success(t('userManagement.rolesPermissionsSaved') || 'Roles & Permissions saved');
        } catch (error) {
            console.error('Failed to save roles/permissions:', error);
            toast.error(t('common.error') || 'Failed to save');
        } finally {
            setIsSavingRoles(false);
        }
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-[var(--text-muted)]">
                <XCircle className="w-12 h-12 mb-4" />
                <p>{t('userManagement.userNotFound') || 'User not found'}</p>
                <button
                    onClick={() => router.back()}
                    className="mt-4 px-4 py-2 text-[var(--accent-primary)] hover:underline"
                >
                    {t('common.back') || 'Go back'}
                </button>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-8">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-[var(--text-muted)] hover:text-white mb-4 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    {t('userManagement.backToList') || 'Back to Users'}
                </button>

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{user.name}</h1>
                        <div className="flex items-center gap-4 text-[var(--text-secondary)]">
                            <span className="flex items-center gap-1">
                                <Mail className="w-4 h-4" />
                                {user.email || '-'}
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {formatDate(user.created_at)}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchUser()}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--background-tertiary)] hover:bg-[var(--border-primary)] text-white rounded-lg transition-colors"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            {t('common.refresh') || 'Refresh'}
                        </button>
                        {user.is_banned ? (
                            <button
                                onClick={() => setShowUnbanModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                {t('userManagement.unban') || 'Unban'}
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowBanModal(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                            >
                                <Ban className="w-4 h-4" />
                                {t('userManagement.ban') || 'Ban'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* User Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${user.is_banned ? 'bg-red-500/20' : user.is_verified ? 'bg-green-500/20' : 'bg-yellow-500/20'}`}>
                            {user.is_banned ? (
                                <ShieldX className="w-6 h-6 text-red-400" />
                            ) : user.is_verified ? (
                                <ShieldCheck className="w-6 h-6 text-green-400" />
                            ) : (
                                <Clock className="w-6 h-6 text-yellow-400" />
                            )}
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('userManagement.status.label') || 'Status'}</p>
                            <p className={`text-lg font-bold ${user.is_banned ? 'text-red-400' : user.is_verified ? 'text-green-400' : 'text-yellow-400'}`}>
                                {user.is_banned ? (t('userManagement.status.banned') || 'Banned') :
                                    user.is_verified ? (t('userManagement.status.verified') || 'Verified') :
                                        (t('userManagement.status.unverified') || 'Unverified')}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${user.is_online ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                            <Globe className={`w-6 h-6 ${user.is_online ? 'text-green-400' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('userManagement.onlineStatus') || 'Online Status'}</p>
                            <p className={`text-lg font-bold ${user.is_online ? 'text-green-400' : 'text-gray-400'}`}>
                                {user.is_online ? (t('userManagement.online') || 'Online') : (t('userManagement.offline') || 'Offline')}
                            </p>
                        </div>
                    </div>
                </div>
                <div className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-lg ${(user.warning_count ?? 0) > 0 ? 'bg-yellow-500/20' : 'bg-gray-500/20'}`}>
                            <AlertTriangle className={`w-6 h-6 ${(user.warning_count ?? 0) > 0 ? 'text-yellow-400' : 'text-gray-400'}`} />
                        </div>
                        <div>
                            <p className="text-[var(--text-muted)] text-sm">{t('userManagement.warnings') || 'Warnings'}</p>
                            <p className={`text-lg font-bold ${(user.warning_count ?? 0) > 0 ? 'text-yellow-400' : 'text-white'}`}>
                                {user.warning_count ?? 0}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-[var(--background-secondary)] rounded-xl border border-[var(--border-primary)] overflow-hidden">
                <div className="flex border-b border-[var(--border-primary)]">
                    {(['info', 'warnings', 'sessions', 'roles'] as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-4 font-medium transition-colors ${activeTab === tab
                                    ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)] bg-[var(--accent-primary-muted)]'
                                    : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--background-tertiary)]'
                                }`}
                        >
                            {tab === 'info' && (t('userManagement.tabs.info') || 'Info')}
                            {tab === 'warnings' && (t('userManagement.tabs.warnings') || 'Warnings')}
                            {tab === 'sessions' && (t('userManagement.tabs.sessions') || 'Sessions')}
                            {tab === 'roles' && (t('userManagement.tabs.roles') || 'Roles & Permissions')}
                        </button>
                    ))}
                </div>

                <div className="p-6">
                    {/* Info Tab */}
                    {activeTab === 'info' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <h3 className="text-lg font-semibold text-white mb-4">{t('userManagement.userInfo') || 'User Information'}</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between py-2 border-b border-[var(--border-primary)]">
                                        <span className="text-[var(--text-muted)]">ID</span>
                                        <span className="text-white font-mono text-sm">{user.id}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-[var(--border-primary)]">
                                        <span className="text-[var(--text-muted)]">{t('userManagement.name') || 'Name'}</span>
                                        <span className="text-white">{user.name}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-[var(--border-primary)]">
                                        <span className="text-[var(--text-muted)]">{t('userManagement.email') || 'Email'}</span>
                                        <span className="text-white">{user.email || '-'}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-[var(--border-primary)]">
                                        <span className="text-[var(--text-muted)]">{t('userManagement.emailConfirmed') || 'Email Confirmed'}</span>
                                        <span className={user.email_confirmed ? 'text-green-400' : 'text-red-400'}>
                                            {user.email_confirmed ? (t('common.yes') || 'Yes') : (t('common.no') || 'No')}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-[var(--border-primary)]">
                                        <span className="text-[var(--text-muted)]">{t('userManagement.createdAt') || 'Created At'}</span>
                                        <span className="text-white">{formatDate(user.created_at)}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-[var(--border-primary)]">
                                        <span className="text-[var(--text-muted)]">{t('userManagement.lastOnline') || 'Last Online'}</span>
                                        <span className="text-white">{formatDate(user.last_online)}</span>
                                    </div>
                                </div>
                            </div>

                            {user.is_banned && (
                                <div>
                                    <h3 className="text-lg font-semibold text-red-400 mb-4">{t('userManagement.banInfo') || 'Ban Information'}</h3>
                                    <div className="space-y-3 p-4 bg-red-500/10 rounded-lg border border-red-500/20">
                                        <div className="flex justify-between py-2 border-b border-red-500/20">
                                            <span className="text-red-300">{t('userManagement.bannedAt') || 'Banned At'}</span>
                                            <span className="text-white">{formatDate(user.banned_start)}</span>
                                        </div>
                                        <div className="flex justify-between py-2 border-b border-red-500/20">
                                            <span className="text-red-300">{t('userManagement.bannedUntil') || 'Banned Until'}</span>
                                            <span className="text-white">{user.banned_end ? formatDate(user.banned_end) : (t('userManagement.permanent') || 'Permanent')}</span>
                                        </div>
                                        {user.banned_reason && (
                                            <div className="py-2">
                                                <span className="text-red-300 block mb-1">{t('userManagement.reason') || 'Reason'}</span>
                                                <span className="text-white">{user.banned_reason}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {user.roles && user.roles.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-white mb-4">{t('userManagement.roles') || 'Roles'}</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {user.roles.map(role => (
                                            <span key={role.id} className="px-3 py-1 bg-[var(--accent-primary-muted)] text-[var(--accent-primary)] rounded-full text-sm">
                                                {role.name}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Warnings Tab */}
                    {activeTab === 'warnings' && (
                        <div>
                            {warningsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-primary)]" />
                                </div>
                            ) : warnings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                                    <AlertTriangle className="w-12 h-12 mb-4 opacity-50" />
                                    <p>{t('userManagement.noWarnings') || 'No warnings'}</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {warnings.map((warning) => (
                                        <div
                                            key={warning.id}
                                            className={`p-4 rounded-lg border ${warning.is_active
                                                    ? 'bg-yellow-500/10 border-yellow-500/20'
                                                    : 'bg-[var(--background-tertiary)] border-[var(--border-primary)] opacity-60'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${warning.is_active ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'
                                                            }`}>
                                                            {warning.category.name}
                                                        </span>
                                                        <span className={`px-2 py-1 rounded text-xs ${warning.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                                            }`}>
                                                            {warning.is_active ? (t('userManagement.active') || 'Active') : (t('userManagement.removed') || 'Removed')}
                                                        </span>
                                                    </div>
                                                    <p className="text-white mb-2">{warning.reason}</p>
                                                    <div className="text-sm text-[var(--text-muted)]">
                                                        <span>{t('userManagement.createdAt') || 'Created'}: {formatDate(warning.created_at)}</span>
                                                        {warning.expires_at && (
                                                            <span className="ml-4">{t('userManagement.expiresAt') || 'Expires'}: {formatDate(warning.expires_at)}</span>
                                                        )}
                                                        {warning.is_permanent && (
                                                            <span className="ml-4 text-red-400">{t('userManagement.permanent') || 'Permanent'}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sessions Tab */}
                    {activeTab === 'sessions' && (
                        <div>
                            <div className="flex justify-end mb-4">
                                <button
                                    onClick={handleRevokeAllSessions}
                                    disabled={sessions.length === 0}
                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    <LogOut className="w-4 h-4" />
                                    {t('userManagement.revokeAllSessions') || 'Revoke All Sessions'}
                                </button>
                            </div>

                            {sessionsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-primary)]" />
                                </div>
                            ) : sessions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                                    <Monitor className="w-12 h-12 mb-4 opacity-50" />
                                    <p>{t('userManagement.noSessions') || 'No active sessions'}</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sessions.map((session) => (
                                        <div key={session.id} className="flex items-center justify-between p-4 bg-[var(--background-tertiary)] rounded-lg border border-[var(--border-primary)]">
                                            <div className="flex items-center gap-4">
                                                <Monitor className="w-8 h-8 text-[var(--text-muted)]" />
                                                <div>
                                                    <p className="text-white font-medium">{session.device || 'Unknown Device'}</p>
                                                    <p className="text-sm text-[var(--text-muted)]">
                                                        {session.os || 'Unknown OS'} • {session.ip || 'Unknown IP'}
                                                        {session.location && ` • ${session.location}`}
                                                    </p>
                                                    <p className="text-xs text-[var(--text-muted)]">
                                                        {t('userManagement.createdAt') || 'Created'}: {formatDate(session.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleRevokeSession(session.id)}
                                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                                title={t('userManagement.revokeSession') || 'Revoke Session'}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Roles & Permissions Tab */}
                    {activeTab === 'roles' && (
                        <div>
                            {rolesPermissionsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-primary)]" />
                                </div>
                            ) : (
                                <div className="space-y-8">
                                    {/* Roles Selection */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                            <Shield className="w-5 h-5" />
                                            {t('userManagement.selectRoles') || 'Select Roles'}
                                        </h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {allRoles.map((role) => (
                                                <label
                                                    key={role.id}
                                                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedRoleIds.has(role.id)
                                                            ? 'bg-[var(--accent-primary-muted)] border-[var(--accent-primary)]'
                                                            : 'bg-[var(--background-tertiary)] border-[var(--border-primary)] hover:border-[var(--accent-primary)]/50'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedRoleIds.has(role.id)}
                                                        onChange={(e) => {
                                                            const newSet = new Set(selectedRoleIds);
                                                            if (e.target.checked) {
                                                                newSet.add(role.id);
                                                            } else {
                                                                newSet.delete(role.id);
                                                            }
                                                            setSelectedRoleIds(newSet);
                                                        }}
                                                        className="sr-only"
                                                    />
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedRoleIds.has(role.id)
                                                            ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                                                            : 'border-[var(--border-primary)]'
                                                        }`}>
                                                        {selectedRoleIds.has(role.id) && (
                                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                                        )}
                                                    </div>
                                                    <div>
                                                        <p className="text-white font-medium">{role.name}</p>
                                                        {role.description && (
                                                            <p className="text-xs text-[var(--text-muted)]">{role.description}</p>
                                                        )}
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Direct Permissions */}
                                    <div>
                                        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                            <Key className="w-5 h-5" />
                                            {t('userManagement.directPermissions') || 'Direct Permissions'}
                                        </h3>
                                        <p className="text-[var(--text-muted)] text-sm mb-4">
                                            {t('userManagement.directPermissionsNote') || 'These permissions are assigned directly to the user, in addition to role-based permissions.'}
                                        </p>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
                                            {allPermissions.map((perm) => (
                                                <label
                                                    key={perm.id}
                                                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${selectedPermissionIds.has(perm.id)
                                                            ? 'bg-[var(--accent-primary-muted)]'
                                                            : 'hover:bg-[var(--background-tertiary)]'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedPermissionIds.has(perm.id)}
                                                        onChange={(e) => {
                                                            const newSet = new Set(selectedPermissionIds);
                                                            if (e.target.checked) {
                                                                newSet.add(perm.id);
                                                            } else {
                                                                newSet.delete(perm.id);
                                                            }
                                                            setSelectedPermissionIds(newSet);
                                                        }}
                                                        className="sr-only"
                                                    />
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedPermissionIds.has(perm.id)
                                                            ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                                                            : 'border-[var(--border-primary)]'
                                                        }`}>
                                                        {selectedPermissionIds.has(perm.id) && (
                                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-white">{perm.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Save Button */}
                                    <div className="flex justify-end pt-4 border-t border-[var(--border-primary)]">
                                        <button
                                            onClick={handleSaveRolesPermissions}
                                            disabled={isSavingRoles}
                                            className="flex items-center gap-2 px-6 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors disabled:opacity-50"
                                        >
                                            {isSavingRoles ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <CheckCircle2 className="w-4 h-4" />
                                            )}
                                            {t('common.save') || 'Save Changes'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Ban Modal */}
            {showBanModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[var(--background-secondary)] rounded-xl p-6 w-full max-w-md border border-[var(--border-primary)]">
                        <h2 className="text-xl font-bold text-white mb-4">{t('userManagement.banUser') || 'Ban User'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-1">{t('userManagement.reason') || 'Reason'} *</label>
                                <textarea
                                    value={banReason}
                                    onChange={(e) => setBanReason(e.target.value)}
                                    className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                                    rows={3}
                                    placeholder={t('userManagement.banReasonPlaceholder') || 'Enter reason for ban...'}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isPermanent"
                                    checked={banIsPermanent}
                                    onChange={(e) => setBanIsPermanent(e.target.checked)}
                                    className="w-4 h-4"
                                />
                                <label htmlFor="isPermanent" className="text-white">{t('userManagement.permanentBan') || 'Permanent ban'}</label>
                            </div>
                            {!banIsPermanent && (
                                <div>
                                    <label className="block text-sm text-[var(--text-muted)] mb-1">{t('userManagement.banUntil') || 'Ban until'}</label>
                                    <input
                                        type="datetime-local"
                                        value={banEndDate}
                                        onChange={(e) => setBanEndDate(e.target.value)}
                                        className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)]"
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowBanModal(false)}
                                className="px-4 py-2 text-[var(--text-muted)] hover:text-white transition-colors"
                            >
                                {t('common.cancel') || 'Cancel'}
                            </button>
                            <button
                                onClick={handleBanUser}
                                disabled={!banReason.trim() || isBanning}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isBanning && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('userManagement.confirmBan') || 'Ban User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unban Modal */}
            {showUnbanModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[var(--background-secondary)] rounded-xl p-6 w-full max-w-md border border-[var(--border-primary)]">
                        <h2 className="text-xl font-bold text-white mb-4">{t('userManagement.unbanUser') || 'Unban User'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-1">{t('userManagement.note') || 'Note'} ({t('common.optional') || 'optional'})</label>
                                <textarea
                                    value={unbanNote}
                                    onChange={(e) => setUnbanNote(e.target.value)}
                                    className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                                    rows={3}
                                    placeholder={t('userManagement.unbanNotePlaceholder') || 'Optional note for unbanning...'}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowUnbanModal(false)}
                                className="px-4 py-2 text-[var(--text-muted)] hover:text-white transition-colors"
                            >
                                {t('common.cancel') || 'Cancel'}
                            </button>
                            <button
                                onClick={handleUnbanUser}
                                disabled={isUnbanning}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isUnbanning && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('userManagement.confirmUnban') || 'Unban User'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

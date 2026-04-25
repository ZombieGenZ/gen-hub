'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    userManagementApi,
    rolesApi,
    permissionsApi,
    warningCategoriesApi,
    UserDetail,
    UserWarningItem,
    UserSession,
    Role,
    PermissionWithAssignment,
    WarningCategory,
    UserNotification,
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
    Bell,
    Send,
    Search,
    AlertCircle,
} from 'lucide-react';
import {
    filterReasonInput,
    filterTitleInput,
    validateBanReason,
    validateUnbanNote,
    validateWarnReason,
    validateWarnCategory,
    validateNotifyTitle,
    validateNotifyContent,
    validateBanDuration,
    hasErrors,
    parseApiErrors,
    type FormErrors,
} from '@/lib/validation.utils';
import { sanitizeDisplayValue } from '@/lib/sanitize.utils';

type DurationUnit = 'minutes' | 'hours' | 'days' | 'weeks' | 'months';

type TabType = 'info' | 'warnings' | 'sessions' | 'roles' | 'notifications';

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
    const [sessionsTotal, setSessionsTotal] = useState(0);
    const [sessionPage, setSessionPage] = useState(1);
    const sessionsPerPage = 10;

    // Roles & Permissions state

    const [allRoles, setAllRoles] = useState<Role[]>([]);
    const [allPermissions, setAllPermissions] = useState<PermissionWithAssignment[]>([]);
    const [rolesPermissionsLoading, setRolesPermissionsLoading] = useState(false);
    const [selectedRoleIds, setSelectedRoleIds] = useState<Set<string>>(new Set());
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());
    const [deniedPermissionIds, setDeniedPermissionIds] = useState<Set<string>>(new Set());
    const [isSavingRoles, setIsSavingRoles] = useState(false);

    // Ban modal state
    const [showBanModal, setShowBanModal] = useState(false);
    const [banReason, setBanReason] = useState('');
    const [banIsPermanent, setBanIsPermanent] = useState(false);
    const [banDurationValue, setBanDurationValue] = useState<number>(1);
    const [banDurationType, setBanDurationType] = useState<DurationUnit>('days');
    const [isBanning, setIsBanning] = useState(false);

    // Unban modal state
    const [showUnbanModal, setShowUnbanModal] = useState(false);
    const [unbanNote, setUnbanNote] = useState('');
    const [isUnbanning, setIsUnbanning] = useState(false);

    // Warn modal state
    const [showWarnModal, setShowWarnModal] = useState(false);
    const [warnCategories, setWarnCategories] = useState<WarningCategory[]>([]);
    const [warnCategoryId, setWarnCategoryId] = useState('');
    const [warnReason, setWarnReason] = useState('');
    const [warnIsPermanent, setWarnIsPermanent] = useState(false);
    const [warnDurationValue, setWarnDurationValue] = useState<number>(1);
    const [warnDurationType, setWarnDurationType] = useState<DurationUnit>('months');
    const [isWarning, setIsWarning] = useState(false);

    // Notifications state
    const [notifications, setNotifications] = useState<UserNotification[]>([]);
    const [notificationsLoading, setNotificationsLoading] = useState(false);
    const [notificationsTotal, setNotificationsTotal] = useState(0);
    const [notificationPage, setNotificationPage] = useState(1);
    const notificationsPerPage = 10;
    const [showSendNotificationModal, setShowSendNotificationModal] = useState(false);
    const [notificationTitle, setNotificationTitle] = useState('');
    const [notificationContent, setNotificationContent] = useState('');
    const [isSendingNotification, setIsSendingNotification] = useState(false);

    // Validation error states
    const [banErrors, setBanErrors] = useState<FormErrors<'reason' | 'duration'>>({});
    const [unbanErrors, setUnbanErrors] = useState<FormErrors<'note'>>({});
    const [warnErrors, setWarnErrors] = useState<FormErrors<'category' | 'reason' | 'duration'>>({});
    const [notifErrors, setNotifErrors] = useState<FormErrors<'title' | 'content'>>({});

    // Confirmation modal states
    const [showClearWarningsConfirm, setShowClearWarningsConfirm] = useState(false);
    const [showRevokeAllSessionsConfirm, setShowRevokeAllSessionsConfirm] = useState(false);
    const [showRevokeSessionConfirm, setShowRevokeSessionConfirm] = useState(false);
    const [sessionToRevoke, setSessionToRevoke] = useState<string | null>(null);

    // Search states
    const [roleSearch, setRoleSearch] = useState('');
    const [permissionSearch, setPermissionSearch] = useState('');

    // Dynamic role permission set - updates when selectedRoleIds changes
    const [rolePermissionSet, setRolePermissionSet] = useState<Set<string>>(new Set());

    // Fetch role permissions when selectedRoleIds changes
    useEffect(() => {
        const fetchRolePermissions = async () => {
            if (selectedRoleIds.size === 0) {
                setRolePermissionSet(new Set());
                return;
            }
            try {
                const permissionIds = await permissionsApi.getByRoleIds(Array.from(selectedRoleIds));
                setRolePermissionSet(new Set(permissionIds));
            } catch (error) {
                console.error('Failed to fetch role permissions:', error);
            }
        };
        fetchRolePermissions();
    }, [selectedRoleIds]);

    // Filtered roles based on search
    const filteredRoles = useMemo(() => {
        if (!roleSearch.trim()) return allRoles;
        const search = roleSearch.toLowerCase();
        return allRoles.filter(role =>
            role.name.toLowerCase().includes(search) ||
            role.description?.toLowerCase().includes(search)
        );
    }, [allRoles, roleSearch]);

    // Filtered permissions based on search
    const filteredPermissions = useMemo(() => {
        if (!permissionSearch.trim()) return allPermissions;
        const search = permissionSearch.toLowerCase();
        return allPermissions.filter(perm =>
            perm.name.toLowerCase().includes(search) ||
            perm.key.toLowerCase().includes(search) ||
            perm.description?.toLowerCase().includes(search)
        );
    }, [allPermissions, permissionSearch]);

    // Group permissions by prefix (e.g., user-management, role, etc.)
    const groupedPermissions = useMemo(() => {
        return filteredPermissions.reduce((acc, perm) => {
            const parts = perm.key.split('.');
            const group = parts[0] || 'other';
            if (!acc[group]) acc[group] = [];
            acc[group].push(perm);
            return acc;
        }, {} as Record<string, PermissionWithAssignment[]>);
    }, [filteredPermissions]);

    // Format group name: "balance-transaction" -> "Balance Transaction"
    const formatGroupName = (group: string) => {
        return group
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    };

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

    const fetchSessions = useCallback(async (page: number = 1) => {
        if (!id) return;
        setSessionsLoading(true);
        try {
            const offset = (page - 1) * sessionsPerPage;
            const data = await userManagementApi.getUserSessions(id as string, {
                limit: sessionsPerPage,
                offset
            });
            setSessions(data.items);
            setSessionsTotal(data.total);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setSessionsLoading(false);
        }
    }, [id, sessionsPerPage]);

    const fetchRolesPermissions = useCallback(async () => {
        if (!id) return;
        setRolesPermissionsLoading(true);
        try {
            // Fetch all data in parallel for better performance
            const [userRolesPerms, rolesData, permsData] = await Promise.all([
                userManagementApi.getUserRolesAndPermissions(id as string),
                rolesApi.getRoles({ limit: '1000', status: 'ACTIVE' }),
                permissionsApi.getPermissions({
                    limit: '1000',
                    status: 'ACTIVE',
                    type: 'user',
                    id: id as string
                })
            ]);


            setAllRoles(rolesData.data);
            setAllPermissions((permsData as { data: PermissionWithAssignment[] }).data);

            // Initialize selected IDs
            setSelectedRoleIds(new Set(userRolesPerms.roles.map(r => r.id)));
            setSelectedPermissionIds(new Set(
                userRolesPerms.permissions
                    .filter(p => p.source === 'direct')
                    .map(p => p.id)
            ));
            setDeniedPermissionIds(new Set(
                userRolesPerms.permissions
                    .filter(p => p.is_denied)
                    .map(p => p.id)
            ));
        } catch (error) {
            console.error('Failed to fetch roles/permissions:', error);
        } finally {
            setRolesPermissionsLoading(false);
        }
    }, [id]);

    const fetchNotifications = useCallback(async (page: number = 1) => {
        if (!id) return;
        setNotificationsLoading(true);
        try {
            const offset = (page - 1) * notificationsPerPage;
            const data = await userManagementApi.getUserNotifications(id as string, {
                limit: notificationsPerPage,
                offset
            });
            setNotifications(data.items);
            setNotificationsTotal(data.total);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
        } finally {
            setNotificationsLoading(false);
        }
    }, [id, notificationsPerPage]);

    const fetchWarnCategories = useCallback(async () => {
        try {
            const data = await warningCategoriesApi.getCategories();
            // Ensure data is an array
            setWarnCategories(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch warning categories:', error);
            setWarnCategories([]);
        }
    }, []);

    useEffect(() => {
        fetchUser();
        fetchWarnCategories();
    }, [fetchUser, fetchWarnCategories]);

    useEffect(() => {
        if (activeTab === 'warnings') {
            fetchWarnings();
        } else if (activeTab === 'sessions') {
            fetchSessions(sessionPage);
        } else if (activeTab === 'roles') {
            fetchRolesPermissions();
        } else if (activeTab === 'notifications') {
            fetchNotifications(notificationPage);
        }
    }, [activeTab, fetchWarnings, fetchSessions, fetchRolesPermissions, fetchNotifications, sessionPage, notificationPage]);

    const handleBanUser = async () => {
        if (!id) return;
        const newErrors: FormErrors<'reason' | 'duration'> = {
            reason: validateBanReason(banReason),
            ...(banIsPermanent ? {} : { duration: validateBanDuration(banDurationValue) }),
        };
        setBanErrors(newErrors);
        if (hasErrors(newErrors)) {
            toast.error(t('common.fixErrors') || 'Vui lòng kiểm tra lại các trường bắt buộc');
            return;
        }
        setIsBanning(true);
        try {
            const result = await userManagementApi.banUser(id as string, {
                reason: banReason,
                is_permanent: banIsPermanent,
                duration_value: banIsPermanent ? undefined : banDurationValue,
                duration_type: banIsPermanent ? undefined : banDurationType,
            });
            setUser(result);
            setShowBanModal(false);
            setBanReason('');
            setBanIsPermanent(false);
            setBanDurationValue(1);
            setBanDurationType('days');
            setBanErrors({});
            toast.success(t('userManagement.banSuccess') || 'Đã cấm người dùng thành công');
        } catch (error) {
            console.error('Failed to ban user:', error);
            const apiErrors = parseApiErrors(error);
            if (Object.keys(apiErrors).length > 0) {
                setBanErrors(apiErrors as FormErrors<'reason' | 'duration'>);
            }
            toast.error(t('userManagement.banError') || 'Không thể cấm người dùng');
        } finally {
            setIsBanning(false);
        }
    };

    const handleUnbanUser = async () => {
        if (!id) return;
        const newErrors: FormErrors<'note'> = { note: validateUnbanNote(unbanNote) };
        setUnbanErrors(newErrors);
        if (hasErrors(newErrors)) {
            toast.error(t('common.fixErrors') || 'Vui lòng kiểm tra lại các trường');
            return;
        }
        setIsUnbanning(true);
        try {
            const result = await userManagementApi.unbanUser(id as string, { note: unbanNote });
            setUser(result);
            setShowUnbanModal(false);
            setUnbanNote('');
            setUnbanErrors({});
            toast.success(t('userManagement.unbanSuccess') || 'Đã bỏ cấm người dùng thành công');
        } catch (error) {
            console.error('Failed to unban user:', error);
            toast.error(t('userManagement.unbanError') || 'Không thể bỏ cấm người dùng');
        } finally {
            setIsUnbanning(false);
        }
    };

    const handleWarnUser = async () => {
        if (!id) return;
        const newErrors: FormErrors<'category' | 'reason' | 'duration'> = {
            category: validateWarnCategory(warnCategoryId),
            reason: validateWarnReason(warnReason),
            ...(warnIsPermanent ? {} : { duration: validateBanDuration(warnDurationValue) }),
        };
        setWarnErrors(newErrors);
        if (hasErrors(newErrors)) {
            toast.error(t('common.fixErrors') || 'Vui lòng kiểm tra lại các trường bắt buộc');
            return;
        }
        setIsWarning(true);
        try {
            await userManagementApi.warnUser(id as string, {
                category_id: warnCategoryId,
                reason: warnReason,
                is_permanent: warnIsPermanent,
                duration_value: warnIsPermanent ? undefined : warnDurationValue,
                duration_type: warnIsPermanent ? undefined : warnDurationType,
            });
            setShowWarnModal(false);
            setWarnCategoryId('');
            setWarnReason('');
            setWarnIsPermanent(false);
            setWarnDurationValue(1);
            setWarnDurationType('months');
            setWarnErrors({});
            toast.success(t('userManagement.warnSuccess') || 'Đã cảnh báo người dùng thành công');
            fetchUser();
            fetchWarnings();
        } catch (error) {
            console.error('Failed to warn user:', error);
            const apiErrors = parseApiErrors(error);
            if (Object.keys(apiErrors).length > 0) {
                setWarnErrors(apiErrors as FormErrors<'category' | 'reason' | 'duration'>);
            }
            toast.error(t('userManagement.warnError') || 'Không thể cảnh báo người dùng');
        } finally {
            setIsWarning(false);
        }
    };

    const handleRemoveWarning = async (warningId: string) => {
        if (!id) return;
        try {
            await userManagementApi.unwarnUser(id as string, warningId);
            setWarnings(prev => prev.map(w => w.id === warningId ? { ...w, is_active: false } : w));
            toast.success(t('userManagement.unwarnSuccess') || 'Warning removed');
            fetchUser();
        } catch (error) {
            console.error('Failed to remove warning:', error);
            toast.error(t('common.error') || 'Failed to remove warning');
        }
    };

    const handleClearAllWarnings = async () => {
        if (!id) return;
        setShowClearWarningsConfirm(false);
        try {
            await userManagementApi.clearAllWarnings(id as string);
            setWarnings(prev => prev.map(w => ({ ...w, is_active: false })));
            toast.success(t('userManagement.clearWarningsSuccess') || 'All warnings cleared');
            fetchUser();
        } catch (error) {
            console.error('Failed to clear warnings:', error);
            toast.error(t('common.error') || 'Failed to clear warnings');
        }
    };

    const handleSendNotification = async () => {
        if (!id) return;
        const newErrors: FormErrors<'title' | 'content'> = {
            title: validateNotifyTitle(notificationTitle),
            content: validateNotifyContent(notificationContent),
        };
        setNotifErrors(newErrors);
        if (hasErrors(newErrors)) {
            toast.error(t('common.fixErrors') || 'Vui lòng kiểm tra lại các trường bắt buộc');
            return;
        }
        setIsSendingNotification(true);
        try {
            await userManagementApi.sendNotification({
                user_id: id as string,
                title: notificationTitle,
                content: notificationContent,
            });
            setShowSendNotificationModal(false);
            setNotificationTitle('');
            setNotificationContent('');
            setNotifErrors({});
            toast.success(t('userManagement.sendNotificationSuccess') || 'Đã gửi thông báo thành công');
            fetchNotifications();
        } catch (error) {
            console.error('Failed to send notification:', error);
            const apiErrors = parseApiErrors(error);
            if (Object.keys(apiErrors).length > 0) {
                setNotifErrors(apiErrors as FormErrors<'title' | 'content'>);
            }
            toast.error(t('common.error') || 'Không thể gửi thông báo');
        } finally {
            setIsSendingNotification(false);
        }
    };

    const handleRevokeSession = async (sessionId: string) => {
        if (!id) return;
        setShowRevokeSessionConfirm(false);
        setSessionToRevoke(null);
        try {
            await userManagementApi.revokeSession(id as string, sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            toast.success(t('userManagement.sessionRevoked') || 'Session revoked');
        } catch (error) {
            console.error('Failed to revoke session:', error);
            toast.error(t('common.error') || 'Failed to revoke session');
        }
    };

    const confirmRevokeSession = (sessionId: string) => {
        setSessionToRevoke(sessionId);
        setShowRevokeSessionConfirm(true);
    };

    const handleRevokeAllSessions = async () => {
        if (!id) return;
        setShowRevokeAllSessionsConfirm(false);
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
            // Filter out permissions that are already inherited from selected roles
            const directPermissionIds = Array.from(selectedPermissionIds).filter(
                permId => !rolePermissionSet.has(permId)
            );

            await userManagementApi.assignUserRolesPermissions(id as string, {
                role_ids: Array.from(selectedRoleIds),
                permission_ids: directPermissionIds,
                denied_permission_ids: Array.from(deniedPermissionIds),
            });
            // setUserRolesPermissions(result);
            toast.success(t('userManagement.rolesPermissionsSaved') || 'Vai trò & Quyền hạn đã lưu');
        } catch (error) {
            console.error('Failed to save roles/permissions:', error);
            toast.error(t('common.error') || 'Lưu thất bại');
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
                        <h1 className="text-3xl font-bold text-white mb-2">{sanitizeDisplayValue(user.name)}</h1>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-[var(--text-secondary)]">
                            <span className="flex items-center gap-1 min-w-0 max-w-full sm:max-w-[200px] md:max-w-[300px]">
                                <Mail className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate">{user.email || '-'}</span>
                            </span>
                            <span className="flex items-center gap-1 whitespace-nowrap">
                                <Calendar className="w-4 h-4 flex-shrink-0" />
                                <span className="text-sm sm:text-base">{formatDate(user.created_at)}</span>
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchUser()}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-[var(--background-tertiary)] hover:bg-[var(--border-primary)] text-white rounded-lg transition-colors"
                            title={t('common.refresh') || 'Refresh'}
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">{t('common.refresh') || 'Refresh'}</span>
                        </button>
                        <button
                            onClick={() => setShowWarnModal(true)}
                            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors"
                            title={t('userManagement.warn') || 'Warn'}
                        >
                            <AlertTriangle className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('userManagement.warn') || 'Warn'}</span>
                        </button>
                        {user.is_banned ? (
                            <button
                                onClick={() => setShowUnbanModal(true)}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors"
                                title={t('userManagement.unban') || 'Unban'}
                            >
                                <CheckCircle2 className="w-4 h-4" />
                                <span className="hidden sm:inline">{t('userManagement.unban') || 'Unban'}</span>
                            </button>
                        ) : (
                            <button
                                onClick={() => setShowBanModal(true)}
                                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                                title={t('userManagement.ban') || 'Ban'}
                            >
                                <Ban className="w-4 h-4" />
                                <span className="hidden sm:inline">{t('userManagement.ban') || 'Ban'}</span>
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
                <div className="flex border-b border-[var(--border-primary)] overflow-x-auto">
                    {(['info', 'warnings', 'sessions', 'roles', 'notifications'] as TabType[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-4 font-medium transition-colors whitespace-nowrap ${activeTab === tab
                                ? 'text-[var(--accent-primary)] border-b-2 border-[var(--accent-primary)] bg-[var(--accent-primary-muted)]'
                                : 'text-[var(--text-muted)] hover:text-white hover:bg-[var(--background-tertiary)]'
                                }`}
                        >
                            {tab === 'info' && (t('userManagement.tabs.info') || 'Info')}
                            {tab === 'warnings' && (t('userManagement.tabs.warnings') || 'Warnings')}
                            {tab === 'sessions' && (t('userManagement.tabs.sessions') || 'Sessions')}
                            {tab === 'roles' && (t('userManagement.tabs.roles') || 'Roles & Permissions')}
                            {tab === 'notifications' && (t('userManagement.tabs.notifications') || 'Notifications')}
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
                                        <span className="text-white">{sanitizeDisplayValue(user.name)}</span>
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
                            <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
                                <div className="text-[var(--text-muted)] text-sm">
                                    {warnings.filter(w => w.is_active).length} {t('userManagement.activeWarnings') || 'active warnings'}
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowWarnModal(true)}
                                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg transition-colors"
                                        title={t('userManagement.addWarning') || 'Add Warning'}
                                    >
                                        <Plus className="w-4 h-4" />
                                        <span className="hidden sm:inline">{t('userManagement.addWarning') || 'Add Warning'}</span>
                                    </button>
                                    <button
                                        onClick={() => setShowClearWarningsConfirm(true)}
                                        disabled={warnings.filter(w => w.is_active).length === 0}
                                        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                                        title={t('userManagement.clearAllWarnings') || 'Clear All'}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="hidden sm:inline">{t('userManagement.clearAllWarnings') || 'Clear All'}</span>
                                    </button>
                                </div>
                            </div>
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
                                                <div className="flex-1">
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
                                                    <p className="text-white mb-2">{sanitizeDisplayValue(warning.reason)}</p>
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
                                                {warning.is_active && (
                                                    <button
                                                        onClick={() => handleRemoveWarning(warning.id)}
                                                        className="flex items-center gap-1 px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors text-sm"
                                                    >
                                                        <XCircle className="w-4 h-4" />
                                                        {t('userManagement.remove') || 'Remove'}
                                                    </button>
                                                )}
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
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                <div className="text-[var(--text-muted)] text-sm">
                                    {sessionsTotal} {t('userManagement.totalSessions') || 'phiên đăng nhập'}
                                </div>
                                <button
                                    onClick={() => setShowRevokeAllSessionsConfirm(true)}
                                    disabled={sessions.length === 0}
                                    className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                                    title={t('userManagement.revokeAllSessions') || 'Thu hồi tất cả phiên'}
                                >
                                    <LogOut className="w-4 h-4 flex-shrink-0" />
                                    <span className="hidden sm:inline">{t('userManagement.revokeAllSessions') || 'Thu hồi tất cả phiên'}</span>
                                    <span className="sm:hidden">{t('userManagement.revokeAll') || 'Thu hồi'}</span>
                                </button>
                            </div>

                            {sessionsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-primary)]" />
                                </div>
                            ) : sessions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                                    <Monitor className="w-12 h-12 mb-4 opacity-50" />
                                    <p>{t('userManagement.noSessions') || 'Không có phiên đăng nhập'}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        {sessions.map((session) => (
                                            <div key={session.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-[var(--background-tertiary)] rounded-lg border border-[var(--border-primary)]">
                                                <div className="flex items-start sm:items-center gap-3 sm:gap-4 min-w-0">
                                                    <Monitor className="w-6 h-6 sm:w-8 sm:h-8 text-[var(--text-muted)] flex-shrink-0 mt-1 sm:mt-0" />
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-white font-medium truncate">{session.device || 'Unknown Device'}</p>
                                                        <p className="text-sm text-[var(--text-muted)] truncate">
                                                            {session.os || 'Unknown OS'} • {session.ip || 'Unknown IP'}
                                                            {session.location && ` • ${session.location}`}
                                                        </p>
                                                        <p className="text-xs text-[var(--text-muted)]">
                                                            {t('userManagement.createdAt') || 'Tạo lúc'}: {formatDate(session.created_at)}
                                                        </p>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => confirmRevokeSession(session.id)}
                                                    className="self-end sm:self-center p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors flex-shrink-0"
                                                    title={t('userManagement.revokeSession') || 'Thu hồi phiên'}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {sessionsTotal > sessionsPerPage && (
                                        <div className="flex flex-wrap items-center justify-center gap-2 mt-6">
                                            <button
                                                onClick={() => setSessionPage(prev => Math.max(1, prev - 1))}
                                                disabled={sessionPage === 1}
                                                className="px-3 py-1.5 bg-[var(--background-tertiary)] hover:bg-[var(--border-primary)] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {t('common.previous') || 'Trước'}
                                            </button>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: Math.ceil(sessionsTotal / sessionsPerPage) }, (_, i) => i + 1)
                                                    .filter(page => {
                                                        const totalPages = Math.ceil(sessionsTotal / sessionsPerPage);
                                                        if (totalPages <= 5) return true;
                                                        if (page === 1 || page === totalPages) return true;
                                                        if (Math.abs(page - sessionPage) <= 1) return true;
                                                        return false;
                                                    })
                                                    .map((page, idx, arr) => (
                                                        <span key={page} className="flex items-center">
                                                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                                                                <span className="px-1 text-[var(--text-muted)]">...</span>
                                                            )}
                                                            <button
                                                                onClick={() => setSessionPage(page)}
                                                                className={`min-w-[32px] px-2 py-1.5 rounded-lg transition-colors ${sessionPage === page
                                                                    ? 'bg-[var(--accent-primary)] text-white'
                                                                    : 'bg-[var(--background-tertiary)] hover:bg-[var(--border-primary)] text-white'
                                                                    }`}
                                                            >
                                                                {page}
                                                            </button>
                                                        </span>
                                                    ))}
                                            </div>
                                            <button
                                                onClick={() => setSessionPage(prev => Math.min(Math.ceil(sessionsTotal / sessionsPerPage), prev + 1))}
                                                disabled={sessionPage >= Math.ceil(sessionsTotal / sessionsPerPage)}
                                                className="px-3 py-1.5 bg-[var(--background-tertiary)] hover:bg-[var(--border-primary)] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {t('common.next') || 'Sau'}
                                            </button>
                                        </div>
                                    )}
                                </>
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
                                <div className="space-y-6">
                                    {/* Roles Selection */}
                                    <div>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                                <Shield className="w-5 h-5" />
                                                {t('userManagement.selectRoles') || 'Vai trò'}
                                            </h3>
                                            <div className="relative">
                                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                                <input
                                                    type="text"
                                                    value={roleSearch}
                                                    onChange={(e) => setRoleSearch(e.target.value)}
                                                    placeholder={t('common.searchRoles') || 'Search roles...'}
                                                    className="w-full sm:w-64 pl-9 pr-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                            {filteredRoles.map((role) => (
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
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${selectedRoleIds.has(role.id)
                                                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                                                        : 'border-[var(--border-primary)]'
                                                        }`}>
                                                        {selectedRoleIds.has(role.id) && (
                                                            <CheckCircle2 className="w-3 h-3 text-white" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-white font-medium truncate">{role.name}</p>
                                                        {role.description && (
                                                            <p className="text-xs text-[var(--text-muted)] truncate">{role.description}</p>
                                                        )}
                                                    </div>
                                                </label>
                                            ))}
                                            {filteredRoles.length === 0 && (
                                                <div className="col-span-full text-center py-4 text-[var(--text-muted)]">
                                                    {t('common.noResults') || 'Không tìm thấy kết quả'}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Permissions */}
                                    <div>
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                            <div>
                                                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                                    <Key className="w-5 h-5" />
                                                    {t('userManagement.permissions') || 'Quyền hạn'}
                                                </h3>
                                                <p className="text-[var(--text-muted)] text-sm mt-1">
                                                    {t('userManagement.permissionsNote') || 'Quyền được đánh dấu màu xanh là quyền kế thừa từ vai trò'}
                                                </p>
                                            </div>
                                            <div className="relative">
                                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                                                <input
                                                    type="text"
                                                    value={permissionSearch}
                                                    onChange={(e) => setPermissionSearch(e.target.value)}
                                                    placeholder={t('common.searchPermissions') || 'Search permissions...'}
                                                    className="w-full sm:w-64 pl-9 pr-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-4">
                                            {Object.keys(groupedPermissions).length === 0 ? (
                                                <div className="text-center py-4 text-[var(--text-muted)]">
                                                    {t('common.noResults') || 'Không tìm thấy kết quả'}
                                                </div>
                                            ) : (
                                                Object.entries(groupedPermissions).map(([group, perms]) => (
                                                    <div key={group} className="border border-[var(--border-primary)] rounded-lg overflow-hidden">
                                                        <div className="bg-[var(--background-tertiary)] px-4 py-3 border-b border-[var(--border-primary)]">
                                                            <h4 className="text-white font-medium">{formatGroupName(group)}</h4>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3">
                                                            {perms.map((perm) => {
                                                                const isInheritedFromRole = rolePermissionSet.has(perm.id);
                                                                const isDirectlySelected = selectedPermissionIds.has(perm.id);
                                                                const isDenied = deniedPermissionIds.has(perm.id);
                                                                const isEffectivelyEnabled = (isDirectlySelected || isInheritedFromRole) && !isDenied;

                                                                let bgClass = 'bg-[var(--background-tertiary)] border border-[var(--border-primary)] hover:bg-[var(--background-tertiary)]/80';
                                                                if (isDenied && isInheritedFromRole) {
                                                                    bgClass = 'bg-red-500/10 border border-red-500/30';
                                                                } else if (isDirectlySelected && !isDenied) {
                                                                    bgClass = 'bg-[var(--accent-primary-muted)] border border-[var(--accent-primary)]';
                                                                } else if (isInheritedFromRole && !isDenied) {
                                                                    bgClass = 'bg-blue-500/10 border border-blue-500/30';
                                                                }

                                                                return (
                                                                    <div
                                                                        key={perm.id}
                                                                        className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${bgClass}`}
                                                                        onClick={() => {
                                                                            if (isInheritedFromRole) {
                                                                                const newDenied = new Set(deniedPermissionIds);
                                                                                if (isDenied) {
                                                                                    newDenied.delete(perm.id);
                                                                                } else {
                                                                                    newDenied.add(perm.id);
                                                                                }
                                                                                setDeniedPermissionIds(newDenied);
                                                                            } else {
                                                                                const newSet = new Set(selectedPermissionIds);
                                                                                if (isDirectlySelected) {
                                                                                    newSet.delete(perm.id);
                                                                                } else {
                                                                                    newSet.add(perm.id);
                                                                                }
                                                                                setSelectedPermissionIds(newSet);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <div className={`w-4 h-4 mt-0.5 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${isDenied
                                                                            ? 'bg-red-500 border-red-500'
                                                                            : isDirectlySelected
                                                                                ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                                                                                : isInheritedFromRole
                                                                                    ? 'bg-blue-500 border-blue-500'
                                                                                    : 'border-[var(--border-primary)]'
                                                                            }`}>
                                                                            {isDenied ? (
                                                                                <XCircle className="w-3 h-3 text-white" />
                                                                            ) : isEffectivelyEnabled ? (
                                                                                <CheckCircle2 className="w-3 h-3 text-white" />
                                                                            ) : null}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="flex flex-wrap items-center gap-2">
                                                                                <span className={`text-sm font-medium ${isDenied ? 'text-red-400 line-through' : 'text-white'}`}>
                                                                                    {perm.name}
                                                                                </span>
                                                                                {isInheritedFromRole && !isDenied && (
                                                                                    <span className="text-xs px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">
                                                                                        {t('userManagement.fromRole') || 'Từ vai trò'}
                                                                                    </span>
                                                                                )}
                                                                                {isDenied && isInheritedFromRole && (
                                                                                    <span className="text-xs px-1.5 py-0.5 bg-red-500/20 text-red-400 rounded">
                                                                                        {t('userManagement.denied') || 'Đã từ chối'}
                                                                                    </span>
                                                                                )}
                                                                                {isDirectlySelected && !isDenied && (
                                                                                    <span className="text-xs px-1.5 py-0.5 bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] rounded">
                                                                                        {t('userManagement.direct') || 'Trực tiếp'}
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                            {perm.description && (
                                                                                <p className={`text-xs mt-1 ${isDenied ? 'text-red-400/50' : 'text-[var(--text-muted)]'}`}>
                                                                                    {perm.description}
                                                                                </p>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
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
                                            {t('common.save') || 'Lưu thay đổi'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <div>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                                <div className="text-[var(--text-muted)] text-sm">
                                    {notificationsTotal} {t('userManagement.totalNotifications') || 'thông báo'}
                                </div>
                                <button
                                    onClick={() => setShowSendNotificationModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                    {t('userManagement.sendNotification') || 'Gửi thông báo'}
                                </button>
                            </div>

                            {notificationsLoading ? (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="w-6 h-6 animate-spin text-[var(--accent-primary)]" />
                                </div>
                            ) : notifications.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
                                    <Bell className="w-12 h-12 mb-4 opacity-50" />
                                    <p>{t('userManagement.noNotifications') || 'Không có thông báo'}</p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        {notifications.map((notification) => (
                                            <div
                                                key={notification.id}
                                                className={`p-4 rounded-lg border ${notification.is_read
                                                    ? 'bg-[var(--background-tertiary)] border-[var(--border-primary)] opacity-70'
                                                    : 'bg-[var(--accent-primary-muted)] border-[var(--accent-primary)]'
                                                    }`}
                                            >
                                                <div className="flex items-start justify-between">
                                                    <div>
                                                        <h4 className="text-white font-medium mb-1">{notification.title}</h4>
                                                        <p className="text-[var(--text-muted)] text-sm">{sanitizeDisplayValue(notification.content)}</p>
                                                        <div className="flex items-center gap-2 mt-2">
                                                            <span className="text-xs text-[var(--text-muted)]">
                                                                {formatDate(notification.created_at)}
                                                            </span>
                                                            {!notification.is_read && (
                                                                <span className="px-2 py-0.5 bg-[var(--accent-primary)] text-white text-xs rounded">
                                                                    {t('userManagement.unread') || 'Chưa đọc'}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {notificationsTotal > notificationsPerPage && (
                                        <div className="flex items-center justify-center gap-2 mt-6">
                                            <button
                                                onClick={() => setNotificationPage(prev => Math.max(1, prev - 1))}
                                                disabled={notificationPage <= 1}
                                                className="px-3 py-1.5 bg-[var(--background-tertiary)] hover:bg-[var(--border-primary)] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {t('common.previous') || 'Trước'}
                                            </button>
                                            <div className="flex items-center gap-1">
                                                {Array.from({ length: Math.ceil(notificationsTotal / notificationsPerPage) }, (_, i) => i + 1)
                                                    .filter(page => {
                                                        const totalPages = Math.ceil(notificationsTotal / notificationsPerPage);
                                                        if (totalPages <= 5) return true;
                                                        if (page === 1 || page === totalPages) return true;
                                                        if (Math.abs(page - notificationPage) <= 1) return true;
                                                        return false;
                                                    })
                                                    .map((page, idx, arr) => (
                                                        <span key={page}>
                                                            {idx > 0 && arr[idx - 1] !== page - 1 && (
                                                                <span className="px-1 text-[var(--text-muted)]">...</span>
                                                            )}
                                                            <button
                                                                onClick={() => setNotificationPage(page)}
                                                                className={`min-w-[32px] px-2 py-1.5 rounded-lg transition-colors ${notificationPage === page
                                                                    ? 'bg-[var(--accent-primary)] text-white'
                                                                    : 'bg-[var(--background-tertiary)] hover:bg-[var(--border-primary)] text-white'
                                                                    }`}
                                                            >
                                                                {page}
                                                            </button>
                                                        </span>
                                                    ))}
                                            </div>
                                            <button
                                                onClick={() => setNotificationPage(prev => Math.min(Math.ceil(notificationsTotal / notificationsPerPage), prev + 1))}
                                                disabled={notificationPage >= Math.ceil(notificationsTotal / notificationsPerPage)}
                                                className="px-3 py-1.5 bg-[var(--background-tertiary)] hover:bg-[var(--border-primary)] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {t('common.next') || 'Sau'}
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Ban Modal */}
            {showBanModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
                    <div className="bg-[var(--background-secondary)] rounded-xl p-6 w-full max-w-md border border-[var(--border-primary)] shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">{t('userManagement.banUser') || 'Cấm người dùng'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-1">{t('userManagement.reason') || 'Lý do'} *</label>
                                <textarea
                                    value={banReason}
                                    onChange={(e) => {
                                        const filtered = filterReasonInput(e.target.value);
                                        setBanReason(filtered);
                                        setBanErrors(prev => ({ ...prev, reason: validateBanReason(filtered) }));
                                    }}
                                    className={`w-full px-3 py-2 bg-[var(--background-tertiary)] border rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none resize-none transition-colors ${
                                        banErrors.reason ? 'border-red-500 focus:border-red-500' : 'border-[var(--border-primary)] focus:border-[var(--accent-primary)]'
                                    }`}
                                    rows={3}
                                    maxLength={1000}
                                    placeholder={t('userManagement.banReasonPlaceholder') || 'Nhập lý do cấm (ít nhất 10 ký tự)...'}
                                />
                                {banErrors.reason && (
                                    <p className="flex items-center gap-1 mt-1 text-xs text-red-400">
                                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                        {banErrors.reason}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-[var(--text-muted)] text-right">{banReason.length}/1000</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="banPermanent"
                                    checked={banIsPermanent}
                                    onChange={(e) => setBanIsPermanent(e.target.checked)}
                                    className="rounded border-[var(--border-primary)] bg-[var(--background-tertiary)]"
                                />
                                <label htmlFor="banPermanent" className="text-white text-sm cursor-pointer select-none">
                                    {t('userManagement.permanentBan') || 'Cấm vĩnh viễn'}
                                </label>
                            </div>
                            {!banIsPermanent && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">
                                            {t('userManagement.duration') || 'Thời hạn'}
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={banDurationValue}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 1;
                                                setBanDurationValue(val);
                                                setBanErrors(prev => ({ ...prev, duration: validateBanDuration(val) }));
                                            }}
                                            className={`w-full px-3 py-2 bg-[var(--background-tertiary)] border rounded-lg text-white focus:outline-none transition-colors ${
                                                banErrors.duration ? 'border-red-500 focus:border-red-500' : 'border-[var(--border-primary)] focus:border-[var(--accent-primary)]'
                                            }`}
                                        />
                                        {banErrors.duration && (
                                            <p className="flex items-center gap-1 mt-1 text-xs text-red-400">
                                                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                                {banErrors.duration}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">
                                            {t('userManagement.unit') || 'Đơn vị'}
                                        </label>
                                        <select
                                            value={banDurationType}
                                            onChange={(e) => setBanDurationType(e.target.value as DurationUnit)}
                                            className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)] appearance-none cursor-pointer"
                                        >
                                            <option value="minutes">{t('common.minutes') || 'Phút'}</option>
                                            <option value="hours">{t('common.hours') || 'Giờ'}</option>
                                            <option value="days">{t('common.days') || 'Ngày'}</option>
                                            <option value="weeks">{t('common.weeks') || 'Tuần'}</option>
                                            <option value="months">{t('common.months') || 'Tháng'}</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => { setShowBanModal(false); setBanErrors({}); }}
                                className="px-4 py-2 text-[var(--text-muted)] hover:text-white transition-colors"
                            >
                                {t('common.cancel') || 'Hủy'}
                            </button>
                            <button
                                onClick={handleBanUser}
                                disabled={isBanning}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isBanning && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('userManagement.confirmBan') || 'Cấm người dùng'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Unban Modal */}
            {showUnbanModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[var(--background-secondary)] rounded-xl p-6 w-full max-w-md border border-[var(--border-primary)]">
                        <h2 className="text-xl font-bold text-white mb-4">{t('userManagement.unbanUser') || 'Bỏ cấm người dùng'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-1">{t('userManagement.note') || 'Ghi chú'} ({t('common.optional') || 'Tùy chọn'})</label>
                                <textarea
                                    value={unbanNote}
                                    onChange={(e) => {
                                        const filtered = filterReasonInput(e.target.value);
                                        setUnbanNote(filtered);
                                        setUnbanErrors(prev => ({ ...prev, note: validateUnbanNote(filtered) }));
                                    }}
                                    className={`w-full px-3 py-2 bg-[var(--background-tertiary)] border rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none resize-none transition-colors ${
                                        unbanErrors.note ? 'border-red-500 focus:border-red-500' : 'border-[var(--border-primary)] focus:border-[var(--accent-primary)]'
                                    }`}
                                    rows={3}
                                    maxLength={500}
                                    placeholder={t('userManagement.unbanNotePlaceholder') || 'Nhập ghi chú...'}
                                />
                                {unbanErrors.note && (
                                    <p className="flex items-center gap-1 mt-1 text-xs text-red-400">
                                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                        {unbanErrors.note}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-[var(--text-muted)] text-right">{unbanNote.length}/500</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => { setShowUnbanModal(false); setUnbanErrors({}); }}
                                className="px-4 py-2 text-[var(--text-muted)] hover:text-white transition-colors"
                            >
                                {t('common.cancel') || 'Hủy'}
                            </button>
                            <button
                                onClick={handleUnbanUser}
                                disabled={isUnbanning}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isUnbanning && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('userManagement.confirmUnban') || 'Bỏ cấm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Warn Modal */}
            {showWarnModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
                    <div className="bg-[var(--background-secondary)] rounded-xl p-6 w-full max-w-md border border-[var(--border-primary)] shadow-2xl">
                        <h2 className="text-xl font-bold text-white mb-4">{t('userManagement.warnUser') || 'Cảnh báo người dùng'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-1">{t('userManagement.category') || 'Danh mục'} *</label>
                                <select
                                    value={warnCategoryId}
                                    onChange={(e) => {
                                        setWarnCategoryId(e.target.value);
                                        setWarnErrors(prev => ({ ...prev, category: validateWarnCategory(e.target.value) }));
                                    }}
                                    className={`w-full px-3 py-2 bg-[var(--background-tertiary)] border rounded-lg text-white focus:outline-none appearance-none cursor-pointer transition-colors ${
                                        warnErrors.category ? 'border-red-500 focus:border-red-500' : 'border-[var(--border-primary)] focus:border-[var(--accent-primary)]'
                                    }`}
                                >
                                    <option value="">{t('userManagement.selectCategory') || 'Chọn danh mục'}</option>
                                    {warnCategories.map((cat) => (
                                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                                    ))}
                                </select>
                                {warnErrors.category && (
                                    <p className="flex items-center gap-1 mt-1 text-xs text-red-400">
                                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                        {warnErrors.category}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-1">{t('userManagement.reason') || 'Lý do'} *</label>
                                <textarea
                                    value={warnReason}
                                    onChange={(e) => {
                                        const filtered = filterReasonInput(e.target.value);
                                        setWarnReason(filtered);
                                        setWarnErrors(prev => ({ ...prev, reason: validateWarnReason(filtered) }));
                                    }}
                                    className={`w-full px-3 py-2 bg-[var(--background-tertiary)] border rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none resize-none transition-colors ${
                                        warnErrors.reason ? 'border-red-500 focus:border-red-500' : 'border-[var(--border-primary)] focus:border-[var(--accent-primary)]'
                                    }`}
                                    rows={3}
                                    maxLength={1000}
                                    placeholder={t('userManagement.warnReasonPlaceholder') || 'Nhập lý do cảnh báo (ít nhất 10 ký tự)...'}
                                />
                                {warnErrors.reason && (
                                    <p className="flex items-center gap-1 mt-1 text-xs text-red-400">
                                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                        {warnErrors.reason}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-[var(--text-muted)] text-right">{warnReason.length}/1000</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="warnPermanent"
                                    checked={warnIsPermanent}
                                    onChange={(e) => setWarnIsPermanent(e.target.checked)}
                                    className="rounded border-[var(--border-primary)] bg-[var(--background-tertiary)]"
                                />
                                <label htmlFor="warnPermanent" className="text-white text-sm cursor-pointer select-none">
                                    {t('userManagement.isPermanent') || 'Cảnh báo vĩnh viễn'}
                                </label>
                            </div>
                            {!warnIsPermanent && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">
                                            {t('userManagement.duration') || 'Thời hạn'}
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={warnDurationValue}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value) || 1;
                                                setWarnDurationValue(val);
                                                setWarnErrors(prev => ({ ...prev, duration: validateBanDuration(val) }));
                                            }}
                                            className={`w-full px-3 py-2 bg-[var(--background-tertiary)] border rounded-lg text-white focus:outline-none transition-colors ${
                                                warnErrors.duration ? 'border-red-500 focus:border-red-500' : 'border-[var(--border-primary)] focus:border-[var(--accent-primary)]'
                                            }`}
                                        />
                                        {warnErrors.duration && (
                                            <p className="flex items-center gap-1 mt-1 text-xs text-red-400">
                                                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                                {warnErrors.duration}
                                            </p>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm text-[var(--text-muted)] mb-1">
                                            {t('userManagement.unit') || 'Đơn vị'}
                                        </label>
                                        <select
                                            value={warnDurationType}
                                            onChange={(e) => setWarnDurationType(e.target.value as DurationUnit)}
                                            className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white focus:outline-none focus:border-[var(--accent-primary)] appearance-none cursor-pointer"
                                        >
                                            <option value="minutes">{t('common.minutes') || 'Phút'}</option>
                                            <option value="hours">{t('common.hours') || 'Giờ'}</option>
                                            <option value="days">{t('common.days') || 'Ngày'}</option>
                                            <option value="weeks">{t('common.weeks') || 'Tuần'}</option>
                                            <option value="months">{t('common.months') || 'Tháng'}</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => { setShowWarnModal(false); setWarnErrors({}); }}
                                className="px-4 py-2 text-[var(--text-muted)] hover:text-white transition-colors"
                            >
                                {t('common.cancel') || 'Hủy'}
                            </button>
                            <button
                                onClick={handleWarnUser}
                                disabled={isWarning}
                                className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isWarning && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('userManagement.confirmWarn') || 'Cảnh báo'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Send Notification Modal */}
            {showSendNotificationModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[var(--background-secondary)] rounded-xl p-6 w-full max-w-md border border-[var(--border-primary)]">
                        <h2 className="text-xl font-bold text-white mb-4">{t('userManagement.sendNotification') || 'Gửi thông báo'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-1">{t('userManagement.notificationTitle') || 'Tiêu đề'} *</label>
                                <input
                                    type="text"
                                    value={notificationTitle}
                                    onChange={(e) => {
                                        const filtered = filterTitleInput(e.target.value);
                                        setNotificationTitle(filtered);
                                        setNotifErrors(prev => ({ ...prev, title: validateNotifyTitle(filtered) }));
                                    }}
                                    maxLength={200}
                                    className={`w-full px-3 py-2 bg-[var(--background-tertiary)] border rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none transition-colors ${
                                        notifErrors.title ? 'border-red-500 focus:border-red-500' : 'border-[var(--border-primary)] focus:border-[var(--accent-primary)]'
                                    }`}
                                    placeholder={t('userManagement.notificationTitlePlaceholder') || 'Tiêu đề thông báo...'}
                                />
                                {notifErrors.title && (
                                    <p className="flex items-center gap-1 mt-1 text-xs text-red-400">
                                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                        {notifErrors.title}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-[var(--text-muted)] text-right">{notificationTitle.length}/200</p>
                            </div>
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-1">{t('userManagement.notificationContent') || 'Nội dung'} *</label>
                                <textarea
                                    value={notificationContent}
                                    onChange={(e) => {
                                        const filtered = filterReasonInput(e.target.value);
                                        setNotificationContent(filtered);
                                        setNotifErrors(prev => ({ ...prev, content: validateNotifyContent(filtered) }));
                                    }}
                                    maxLength={2000}
                                    className={`w-full px-3 py-2 bg-[var(--background-tertiary)] border rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none resize-none transition-colors ${
                                        notifErrors.content ? 'border-red-500 focus:border-red-500' : 'border-[var(--border-primary)] focus:border-[var(--accent-primary)]'
                                    }`}
                                    rows={4}
                                    placeholder={t('userManagement.notificationContentPlaceholder') || 'Nội dung thông báo...'}
                                />
                                {notifErrors.content && (
                                    <p className="flex items-center gap-1 mt-1 text-xs text-red-400">
                                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                        {notifErrors.content}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-[var(--text-muted)] text-right">{notificationContent.length}/2000</p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => { setShowSendNotificationModal(false); setNotifErrors({}); }}
                                className="px-4 py-2 text-[var(--text-muted)] hover:text-white transition-colors"
                            >
                                {t('common.cancel') || 'Hủy'}
                            </button>
                            <button
                                onClick={handleSendNotification}
                                disabled={isSendingNotification}
                                className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isSendingNotification && <Loader2 className="w-4 h-4 animate-spin" />}
                                {t('userManagement.send') || 'Gửi'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Clear All Warnings Confirmation Modal */}
            {showClearWarningsConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[var(--background-secondary)] rounded-xl p-6 w-full max-w-md border border-[var(--border-primary)]">
                        <h2 className="text-xl font-bold text-white mb-4">{t('userManagement.confirmAction') || 'Xác nhận hành động'}</h2>
                        <p className="text-[var(--text-muted)] mb-6">
                            {t('userManagement.confirmClearAllWarnings') || 'Bạn có chắc chắn muốn xóa tất cả cảnh báo của người dùng này?'}
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowClearWarningsConfirm(false)}
                                className="px-4 py-2 text-[var(--text-muted)] hover:text-white transition-colors"
                            >
                                {t('common.cancel') || 'Hủy'}
                            </button>
                            <button
                                onClick={handleClearAllWarnings}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                                {t('userManagement.clearAllWarnings') || 'Xóa tất cả'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Revoke All Sessions Confirmation Modal */}
            {showRevokeAllSessionsConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[var(--background-secondary)] rounded-xl p-6 w-full max-w-md border border-[var(--border-primary)]">
                        <h2 className="text-xl font-bold text-white mb-4">{t('userManagement.confirmAction') || 'Xác nhận hành động'}</h2>
                        <p className="text-[var(--text-muted)] mb-6">
                            {t('userManagement.confirmRevokeAllSessions') || 'Bạn có chắc chắn muốn thu hồi tất cả phiên đăng nhập của người dùng này? Người dùng sẽ bị đăng xuất khỏi tất cả thiết bị.'}
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowRevokeAllSessionsConfirm(false)}
                                className="px-4 py-2 text-[var(--text-muted)] hover:text-white transition-colors"
                            >
                                {t('common.cancel') || 'Hủy'}
                            </button>
                            <button
                                onClick={handleRevokeAllSessions}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                {t('userManagement.revokeAllSessions') || 'Thu hồi tất cả'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Revoke Single Session Confirmation Modal */}
            {showRevokeSessionConfirm && sessionToRevoke && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-[var(--background-secondary)] rounded-xl p-6 w-full max-w-md border border-[var(--border-primary)]">
                        <h2 className="text-xl font-bold text-white mb-4">{t('userManagement.confirmAction') || 'Xác nhận hành động'}</h2>
                        <p className="text-[var(--text-muted)] mb-6">
                            {t('userManagement.confirmRevokeSession') || 'Bạn có chắc chắn muốn thu hồi phiên đăng nhập này? Người dùng sẽ bị đăng xuất khỏi thiết bị này.'}
                        </p>
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => {
                                    setShowRevokeSessionConfirm(false);
                                    setSessionToRevoke(null);
                                }}
                                className="px-4 py-2 text-[var(--text-muted)] hover:text-white transition-colors"
                            >
                                {t('common.cancel') || 'Hủy'}
                            </button>
                            <button
                                onClick={() => handleRevokeSession(sessionToRevoke)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                            >
                                <LogOut className="w-4 h-4" />
                                {t('userManagement.revokeSession') || 'Thu hồi phiên'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

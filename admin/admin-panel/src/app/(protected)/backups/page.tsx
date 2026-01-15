'use client';

import { useState, useEffect, useCallback } from 'react';
import { backupApi, BackupItem } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useRouter } from 'next/navigation';
import {
    DatabaseBackup,
    RefreshCw,
    Loader2,
    Download,
    Play,
    Lock,
    X,
    AlertCircle,
    Check,
    Clock,
    HardDrive,
    User,
} from 'lucide-react';

// Key Modal Component
function KeyModal({
    isOpen,
    onClose,
    onSubmit,
    title,
    description,
    isLoading,
    error,
}: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (key: string) => void;
    title: string;
    description: string;
    isLoading: boolean;
    error: string;
}) {
    const [key, setKey] = useState('');
    const { t } = useLanguage();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (key.trim()) {
            onSubmit(key.trim());
        }
    };

    useEffect(() => {
        if (isOpen) {
            setKey('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="bg-[var(--background-secondary)] rounded-xl border border-[var(--border-primary)] w-full max-w-md animate-fadeIn">
                <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[var(--accent-primary-muted)]">
                            <Lock className="w-5 h-5 text-[var(--accent-primary)]" />
                        </div>
                        <h3 className="text-lg font-semibold text-white">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-[var(--text-muted)] hover:text-white transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <p className="text-[var(--text-secondary)] text-sm mb-4">{description}</p>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-lg bg-[rgba(255,82,82,0.1)] border border-[var(--status-error)] mb-4">
                            <AlertCircle className="w-5 h-5 text-[var(--status-error)]" />
                            <span className="text-sm text-[var(--status-error)]">{error}</span>
                        </div>
                    )}

                    <div className="mb-4">
                        <label className="block text-sm text-[var(--text-secondary)] mb-2">
                            {t('backup.secretKey') || 'Secret Key'}
                        </label>
                        <input
                            type="password"
                            value={key}
                            onChange={(e) => setKey(e.target.value)}
                            placeholder="••••••••"
                            className="w-full px-4 py-3 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
                            disabled={isLoading}
                            autoFocus
                        />
                    </div>

                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg border border-[var(--border-primary)] text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] transition-colors"
                            disabled={isLoading}
                        >
                            {t('common.cancel') || 'Cancel'}
                        </button>
                        <button
                            type="submit"
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white transition-colors disabled:opacity-50"
                            disabled={isLoading || !key.trim()}
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>{t('common.loading') || 'Loading...'}</span>
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    <span>{t('common.confirm') || 'Confirm'}</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default function BackupsPage() {
    const { t } = useLanguage();
    const { hasPermission, isLoading: isAuthLoading } = useAuth();
    const router = useRouter();

    // Permission checks
    const canViewList = hasPermission('backup.admin') || hasPermission('backup.list');
    const canTrigger = hasPermission('backup.admin') || hasPermission('backup.trigger');
    const canDownload = canViewList && (hasPermission('backup.admin') || hasPermission('backup.download'));

    // State
    const [backups, setBackups] = useState<BackupItem[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [storedKey, setStoredKey] = useState<string>('');

    // Modal states
    const [showKeyModal, setShowKeyModal] = useState(false);
    const [modalConfig, setModalConfig] = useState<{
        title: string;
        description: string;
        action: 'list' | 'trigger' | 'download';
        backupId?: string;
    }>({ title: '', description: '', action: 'list' });
    const [modalError, setModalError] = useState('');
    const [modalLoading, setModalLoading] = useState(false);

    // Redirect if no relevant permission
    useEffect(() => {
        if (!isAuthLoading && !canViewList && !canTrigger) {
            router.push('/dashboard');
        }
    }, [canViewList, canTrigger, isAuthLoading, router]);

    // Show initial key modal for list
    useEffect(() => {
        if (!isAuthLoading && canViewList && !isAuthenticated) {
            openKeyModal('list');
        }
    }, [isAuthLoading, canViewList, isAuthenticated]);

    const formatBytes = (bytes: number): string => {
        if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(2)} GB`;
        if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MB`;
        if (bytes >= 1024) return `${(bytes / 1024).toFixed(2)} KB`;
        return `${bytes} B`;
    };

    const formatDate = (dateString: string): string => {
        return new Date(dateString).toLocaleString();
    };

    const getBackupTypeLabel = (type: string): string => {
        switch (type) {
            case 'SCHEDULED': return t('backup.type.scheduled') || 'Scheduled';
            case 'MANUAL_API': return t('backup.type.manualApi') || 'Manual (API)';
            case 'MANUAL_DISCORD': return t('backup.type.manualDiscord') || 'Manual (Discord)';
            default: return type;
        }
    };

    const openKeyModal = (action: 'list' | 'trigger' | 'download', backupId?: string) => {
        const titles = {
            list: t('backup.modal.listTitle') || 'Authenticate to View Backups',
            trigger: t('backup.modal.triggerTitle') || 'Authenticate to Trigger Backup',
            download: t('backup.modal.downloadTitle') || 'Authenticate to Download',
        };
        const descriptions = {
            list: t('backup.modal.listDesc') || 'Enter the backup secret key to view the list of backups.',
            trigger: t('backup.modal.triggerDesc') || 'Enter the backup secret key to create a new backup.',
            download: t('backup.modal.downloadDesc') || 'Enter the backup secret key to download this backup file.',
        };

        setModalConfig({
            title: titles[action],
            description: descriptions[action],
            action,
            backupId,
        });
        setModalError('');
        setShowKeyModal(true);
    };

    const handleKeySubmit = async (key: string) => {
        setModalLoading(true);
        setModalError('');

        try {
            if (modalConfig.action === 'list') {
                const result = await backupApi.listBackups(key);
                setBackups(result.items);
                setTotal(result.total);
                setStoredKey(key);
                setIsAuthenticated(true);
                setShowKeyModal(false);
            } else if (modalConfig.action === 'trigger') {
                await backupApi.triggerBackup(key);
                setShowKeyModal(false);
                // Refresh list
                if (storedKey) {
                    const result = await backupApi.listBackups(storedKey);
                    setBackups(result.items);
                    setTotal(result.total);
                }
            } else if (modalConfig.action === 'download' && modalConfig.backupId) {
                const result = await backupApi.getDownloadUrl(modalConfig.backupId, key);
                setShowKeyModal(false);
                // Open download URL in new tab
                window.open(result.downloadUrl, '_blank');
            }
        } catch (err) {
            const error = err as { response?: { data?: { message?: string } } };
            setModalError(error.response?.data?.message || t('backup.error.invalidKey') || 'Invalid key');
        } finally {
            setModalLoading(false);
        }
    };

    const handleRefresh = async () => {
        if (!storedKey) {
            openKeyModal('list');
            return;
        }

        setIsLoading(true);
        try {
            const result = await backupApi.listBackups(storedKey);
            setBackups(result.items);
            setTotal(result.total);
        } catch {
            // Key might have expired, show modal again
            setIsAuthenticated(false);
            openKeyModal('list');
        } finally {
            setIsLoading(false);
        }
    };

    if (isAuthLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            {/* Header */}
            <div className="mb-8 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {t('backup.title') || 'Backup Manager'}
                    </h1>
                    <p className="text-[var(--text-secondary)]">
                        {t('backup.subtitle') || 'Manage database backups'}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {canTrigger && (
                        <button
                            onClick={() => openKeyModal('trigger')}
                            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                        >
                            <Play className="w-4 h-4" />
                            {t('backup.triggerBackup') || 'Trigger Backup'}
                        </button>
                    )}
                    {canViewList && (
                        <button
                            onClick={handleRefresh}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                            {t('common.refresh') || 'Refresh'}
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            {canViewList && (
                <>
                    {!isAuthenticated ? (
                        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                            <Lock className="w-12 h-12 mb-4" />
                            <p className="mb-4">{t('backup.needAuthentication') || 'Authentication required to view backups'}</p>
                            <button
                                onClick={() => openKeyModal('list')}
                                className="px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors"
                            >
                                {t('backup.authenticate') || 'Authenticate'}
                            </button>
                        </div>
                    ) : isLoading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                        </div>
                    ) : backups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-[var(--text-muted)]">
                            <DatabaseBackup className="w-12 h-12 mb-4" />
                            <p>{t('backup.noBackups') || 'No backups found'}</p>
                        </div>
                    ) : (
                        <>
                            <div className="mb-4 text-sm text-[var(--text-muted)]">
                                {t('backup.totalBackups') || 'Total backups'}: {total}
                            </div>

                            {/* Backup List */}
                            <div className="space-y-4">
                                {backups.map((backup) => (
                                    <div
                                        key={backup.id}
                                        className="bg-[var(--background-secondary)] rounded-xl p-6 border border-[var(--border-primary)] hover:border-[var(--accent-primary)] transition-colors"
                                    >
                                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 rounded-lg bg-[var(--accent-primary-muted)]">
                                                    <DatabaseBackup className="w-6 h-6 text-[var(--accent-primary)]" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-white mb-1">
                                                        {backup.fileName}
                                                    </h3>
                                                    <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-muted)]">
                                                        <span className="flex items-center gap-1">
                                                            <HardDrive className="w-4 h-4" />
                                                            {formatBytes(backup.fileSize)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Clock className="w-4 h-4" />
                                                            {formatDate(backup.createdAt)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <User className="w-4 h-4" />
                                                            {backup.triggeredBy}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded text-xs ${backup.backupType === 'SCHEDULED'
                                                                ? 'bg-blue-500/20 text-blue-400'
                                                                : 'bg-green-500/20 text-green-400'
                                                            }`}>
                                                            {getBackupTypeLabel(backup.backupType)}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {canDownload && (
                                                <button
                                                    onClick={() => openKeyModal('download', backup.id)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-[var(--background-tertiary)] hover:bg-[var(--accent-primary)] text-[var(--text-secondary)] hover:text-white rounded-lg transition-colors"
                                                >
                                                    <Download className="w-4 h-4" />
                                                    {t('backup.download') || 'Download'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </>
            )}

            {/* Trigger Only View (no list permission) */}
            {!canViewList && canTrigger && (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="p-4 rounded-full bg-green-500/20 mb-6">
                        <Play className="w-12 h-12 text-green-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">
                        {t('backup.triggerOnly.title') || 'Trigger Backup'}
                    </h2>
                    <p className="text-[var(--text-muted)] mb-6 text-center max-w-md">
                        {t('backup.triggerOnly.desc') || 'You have permission to trigger backups. Click the button above to create a new backup.'}
                    </p>
                </div>
            )}

            {/* Key Modal */}
            <KeyModal
                isOpen={showKeyModal}
                onClose={() => setShowKeyModal(false)}
                onSubmit={handleKeySubmit}
                title={modalConfig.title}
                description={modalConfig.description}
                isLoading={modalLoading}
                error={modalError}
            />
        </div>
    );
}

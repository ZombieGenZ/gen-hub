'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { rolesApi, permissionsApi, Permission } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
    ArrowLeft,
    Save,
    Loader2,
    Shield,
    Key,
    CheckCircle2,
    Star,
    AlertCircle,
} from 'lucide-react';
import {
    filterNameInput,
    filterReasonInput,
    validateRoleName,
    validateRoleDescription,
    hasErrors,
    parseApiErrors,
    type FormErrors,
} from '@/lib/validation.utils';

export default function NewRolePage() {
    const router = useRouter();
    const { t } = useLanguage();

    const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const [selectedPermissionIds, setSelectedPermissionIds] = useState<Set<string>>(new Set());

    // Validation errors (real-time)
    const [errors, setErrors] = useState<FormErrors<'name' | 'description'>>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});

    // Search for permissions
    const [permissionSearch, setPermissionSearch] = useState('');

    const fetchPermissions = useCallback(async () => {
        setIsLoading(true);
        try {
            const permsData = await permissionsApi.getPermissions({ limit: '1000', status: 'ACTIVE' });
            setAllPermissions((permsData as { data: Permission[] }).data);
        } catch (error) {
            console.error('Failed to fetch permissions:', error);
            toast.error(t('common.error') || 'Failed to load permissions');
        } finally {
            setIsLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    // Validate toàn bộ form, trả về true nếu hợp lệ
    const validateForm = (): boolean => {
        const newErrors: FormErrors<'name' | 'description'> = {
            name: validateRoleName(name),
            description: validateRoleDescription(description),
        };
        setErrors(newErrors);
        return !hasErrors(newErrors);
    };

    // Real-time validate từng field khi người dùng rời khỏi field (blur)
    const handleNameBlur = () => {
        setTouched(prev => ({ ...prev, name: true }));
        setErrors(prev => ({ ...prev, name: validateRoleName(name) }));
    };

    const handleDescriptionBlur = () => {
        setTouched(prev => ({ ...prev, description: true }));
        setErrors(prev => ({ ...prev, description: validateRoleDescription(description) }));
    };

    // Xử lý thay đổi name — lọc ký tự đặc biệt và validate real-time
    const handleNameChange = (value: string) => {
        const filtered = filterNameInput(value);
        setName(filtered);
        if (touched.name) {
            setErrors(prev => ({ ...prev, name: validateRoleName(filtered) }));
        }
    };

    // Xử lý thay đổi description — lọc ký tự nguy hiểm và validate real-time
    const handleDescriptionChange = (value: string) => {
        const filtered = filterReasonInput(value);
        setDescription(filtered);
        if (touched.description) {
            setErrors(prev => ({ ...prev, description: validateRoleDescription(filtered) }));
        }
    };

    const handleSave = async () => {
        // Đánh dấu tất cả fields là đã touched
        setTouched({ name: true, description: true });
        if (!validateForm()) {
            toast.error('Vui lòng kiểm tra lại thông tin nhập vào');
            return;
        }
        setIsSaving(true);
        try {
            await rolesApi.createRole({
                name: name.trim(),
                description: description.trim() || undefined,
                is_default: isDefault,
                permission_ids: Array.from(selectedPermissionIds),
            });
            toast.success(t('roles.createSuccess') || 'Tạo vai trò thành công');
            router.push('/roles');
        } catch (error) {
            console.error('Failed to create role:', error);
            // Echo API validation errors về field-level
            const apiErrors = parseApiErrors(error);
            if (hasErrors(apiErrors)) {
                setErrors(prev => ({ ...prev, ...apiErrors }));
                toast.error('Dữ liệu không hợp lệ, vui lòng kiểm tra lại');
            } else {
                toast.error(t('roles.createError') || 'Tạo vai trò thất bại');
            }
        } finally {
            setIsSaving(false);
        }
    };

    // Filter permissions based on search
    const filteredPermissions = allPermissions.filter(p =>
        !permissionSearch ||
        p.name.toLowerCase().includes(permissionSearch.toLowerCase()) ||
        p.key.toLowerCase().includes(permissionSearch.toLowerCase())
    );

    // Group permissions by prefix
    const groupedPermissions = filteredPermissions.reduce((acc, perm) => {
        const parts = perm.key.split('.');
        const group = parts[0] || 'other';
        if (!acc[group]) acc[group] = [];
        acc[group].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
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
                    {t('roles.backToList') || 'Back to Roles'}
                </button>

                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-white mb-2">{t('roles.createRole') || 'Create Role'}</h1>
                        <p className="text-[var(--text-secondary)]">
                            {t('roles.createRoleDescription') || 'Create a new role with permissions'}
                        </p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !name.trim() || hasErrors(errors)}
                        className="flex items-center gap-2 px-6 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        {t('roles.create') || 'Create Role'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Role Info */}
                <div className="lg:col-span-1">
                    <div className="bg-[var(--background-secondary)] rounded-xl border border-[var(--border-primary)] p-6">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            {t('roles.roleInfo') || 'Role Information'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-1">
                                    {t('roles.name') || 'Name'} *
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    onBlur={handleNameBlur}
                                    maxLength={100}
                                    className={`w-full px-3 py-2 bg-[var(--background-tertiary)] border rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none transition-colors ${
                                        touched.name && errors.name
                                            ? 'border-red-500 focus:border-red-500'
                                            : touched.name && !errors.name && name.trim()
                                            ? 'border-green-500 focus:border-green-500'
                                            : 'border-[var(--border-primary)] focus:border-[var(--accent-primary)]'
                                    }`}
                                    placeholder={t('roles.namePlaceholder') || 'Nhập tên vai trò'}
                                />
                                {touched.name && errors.name && (
                                    <p className="flex items-center gap-1 mt-1 text-xs text-red-400">
                                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                        {errors.name}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-[var(--text-muted)] text-right">{name.length}/100</p>
                            </div>

                            <div>
                                <label className="block text-sm text-[var(--text-muted)] mb-1">
                                    {t('roles.description') || 'Description'}
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => handleDescriptionChange(e.target.value)}
                                    onBlur={handleDescriptionBlur}
                                    rows={3}
                                    maxLength={500}
                                    className={`w-full px-3 py-2 bg-[var(--background-tertiary)] border rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none transition-colors resize-none ${
                                        touched.description && errors.description
                                            ? 'border-red-500 focus:border-red-500'
                                            : 'border-[var(--border-primary)] focus:border-[var(--accent-primary)]'
                                    }`}
                                    placeholder={t('roles.descriptionPlaceholder') || 'Nhập mô tả vai trò'}
                                />
                                {touched.description && errors.description && (
                                    <p className="flex items-center gap-1 mt-1 text-xs text-red-400">
                                        <AlertCircle className="w-3 h-3 flex-shrink-0" />
                                        {errors.description}
                                    </p>
                                )}
                                <p className="mt-1 text-xs text-[var(--text-muted)] text-right">{description.length}/500</p>
                            </div>

                            <div className="flex items-center justify-between py-3 border-t border-[var(--border-primary)]">
                                <div>
                                    <p className="text-white font-medium flex items-center gap-1">
                                        <Star className="w-4 h-4 text-yellow-400" />
                                        {t('roles.default') || 'Default Role'}
                                    </p>
                                    <p className="text-sm text-[var(--text-muted)]">{t('roles.defaultDescription') || 'Assign to new users'}</p>
                                </div>
                                <button
                                    onClick={() => setIsDefault(!isDefault)}
                                    className={`relative w-12 h-6 rounded-full transition-colors ${isDefault ? 'bg-yellow-500' : 'bg-[var(--background-tertiary)]'
                                        }`}
                                >
                                    <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${isDefault ? 'translate-x-6' : ''
                                        }`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Permissions */}
                <div className="lg:col-span-2">
                    <div className="bg-[var(--background-secondary)] rounded-xl border border-[var(--border-primary)] p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <Key className="w-5 h-5" />
                                {t('roles.permissions') || 'Permissions'}
                                <span className="text-sm text-[var(--text-muted)] font-normal">
                                    ({selectedPermissionIds.size} {t('common.selected') || 'selected'})
                                </span>
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSelectedPermissionIds(new Set(allPermissions.map(p => p.id)))}
                                    className="text-sm text-[var(--accent-primary)] hover:underline"
                                >
                                    {t('roles.selectAll') || 'Select All'}
                                </button>
                                <span className="text-[var(--text-muted)]">|</span>
                                <button
                                    onClick={() => setSelectedPermissionIds(new Set())}
                                    className="text-sm text-[var(--text-muted)] hover:text-white"
                                >
                                    {t('roles.clearAll') || 'Clear All'}
                                </button>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="mb-4">
                            <input
                                type="text"
                                placeholder={t('roles.searchPermissions') || 'Search permissions...'}
                                value={permissionSearch}
                                onChange={(e) => setPermissionSearch(e.target.value)}
                                className="w-full px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                            />
                        </div>

                        {/* Permissions Grid by Group */}
                        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
                            {Object.entries(groupedPermissions).map(([group, perms]) => (
                                <div key={group}>
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="text-sm font-medium text-[var(--accent-primary)] uppercase">
                                            {group}
                                        </h3>
                                        <button
                                            onClick={() => {
                                                const groupPermIds = perms.map(p => p.id);
                                                const allSelected = groupPermIds.every(id => selectedPermissionIds.has(id));
                                                const newSet = new Set(selectedPermissionIds);
                                                if (allSelected) {
                                                    groupPermIds.forEach(id => newSet.delete(id));
                                                } else {
                                                    groupPermIds.forEach(id => newSet.add(id));
                                                }
                                                setSelectedPermissionIds(newSet);
                                            }}
                                            className="text-xs text-[var(--text-muted)] hover:text-white"
                                        >
                                            {perms.every(p => selectedPermissionIds.has(p.id)) ?
                                                (t('roles.deselectGroup') || 'Deselect') :
                                                (t('roles.selectGroup') || 'Select All')
                                            }
                                        </button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                        {perms.map((perm) => (
                                            <label
                                                key={perm.id}
                                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedPermissionIds.has(perm.id)
                                                        ? 'bg-[var(--accent-primary-muted)] border border-[var(--accent-primary)]'
                                                        : 'bg-[var(--background-tertiary)] border border-transparent hover:border-[var(--border-primary)]'
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
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedPermissionIds.has(perm.id)
                                                        ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                                                        : 'border-[var(--border-primary)]'
                                                    }`}>
                                                    {selectedPermissionIds.has(perm.id) && (
                                                        <CheckCircle2 className="w-3 h-3 text-white" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-white text-sm font-medium truncate">{perm.name}</p>
                                                    <p className="text-xs text-[var(--text-muted)] truncate">{perm.key}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

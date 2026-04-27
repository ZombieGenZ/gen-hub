'use client';

import { useState, useCallback } from 'react';
import { redisAdminApi, CreateCacheDto } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
    Database,
    Plus,
    Pencil,
    Trash2,
    Loader2,
    AlertTriangle,
    X,
    Layers,
    ChevronDown,
    ChevronUp,
    Zap,
} from 'lucide-react';

// ─── Bulk Row Component ───
function BulkRow({ item, index, onChange, onRemove, t }: {
    item: CreateCacheDto;
    index: number;
    onChange: (i: number, field: string, val: string) => void;
    onRemove: (i: number) => void;
    t: (k: string) => string;
}) {
    return (
        <div className="flex gap-2 items-start animate-fadeIn">
            <input
                type="text"
                placeholder={t('redisAdmin.keyPlaceholder') || 'Key'}
                value={item.key}
                onChange={e => onChange(index, 'key', e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
            <input
                type="text"
                placeholder={t('redisAdmin.valuePlaceholder') || 'Value'}
                value={item.value}
                onChange={e => onChange(index, 'value', e.target.value)}
                className="flex-1 min-w-0 px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
            <input
                type="number"
                placeholder="TTL"
                value={item.ttl ?? ''}
                onChange={e => onChange(index, 'ttl', e.target.value)}
                className="w-24 px-3 py-2 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors"
            />
            <button onClick={() => onRemove(index)} className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0" title={t('redisAdmin.removeRow')}>
                <X className="w-4 h-4" />
            </button>
        </div>
    );
}

// ─── Confirm Modal ───
function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel, isLoading }: {
    title: string; message: string; confirmLabel: string;
    onConfirm: () => void; onCancel: () => void; isLoading: boolean;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onCancel}>
            <div className="bg-[var(--background-secondary)] rounded-2xl border border-[var(--border-primary)] p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-3 rounded-xl bg-red-500/20"><AlertTriangle className="w-6 h-6 text-red-400" /></div>
                    <h3 className="text-lg font-bold text-white">{title}</h3>
                </div>
                <p className="text-[var(--text-secondary)] mb-6 text-sm leading-relaxed">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} disabled={isLoading} className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] transition-colors text-sm">Cancel</button>
                    <button onClick={onConfirm} disabled={isLoading} className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-medium transition-colors disabled:opacity-50 text-sm flex items-center gap-2">
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function RedisPage() {
    const { t } = useLanguage();

    // ─── Single Add ───
    const [addKey, setAddKey] = useState('');
    const [addValue, setAddValue] = useState('');
    const [addTtl, setAddTtl] = useState('');
    const [addLoading, setAddLoading] = useState(false);

    // ─── Single Edit ───
    const [editKey, setEditKey] = useState('');
    const [editValue, setEditValue] = useState('');
    const [editTtl, setEditTtl] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    // ─── Single Delete ───
    const [deleteKey, setDeleteKey] = useState('');
    const [deleteLoading, setDeleteLoading] = useState(false);

    // ─── Bulk ───
    const [bulkTab, setBulkTab] = useState<'add' | 'edit' | 'delete'>('add');
    const [bulkItems, setBulkItems] = useState<CreateCacheDto[]>([{ key: '', value: '', ttl: undefined }]);
    const [bulkDeleteKeys, setBulkDeleteKeys] = useState('');
    const [bulkLoading, setBulkLoading] = useState(false);
    const [bulkOpen, setBulkOpen] = useState(false);

    // ─── Flush ───
    const [showFlushModal, setShowFlushModal] = useState(false);
    const [flushLoading, setFlushLoading] = useState(false);

    const handleError = useCallback((error: unknown) => {
        const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.error(msg || t('redisAdmin.error') || 'Error');
    }, [t]);

    // ─── Handlers ───
    const handleAdd = async () => {
        if (!addKey.trim() || !addValue.trim()) return;
        setAddLoading(true);
        try {
            const dto: CreateCacheDto = { key: addKey.trim(), value: addValue };
            if (addTtl) dto.ttl = parseInt(addTtl);
            await redisAdminApi.addCache(dto);
            toast.success(t('redisAdmin.addSuccess'));
            setAddKey(''); setAddValue(''); setAddTtl('');
        } catch (e) { handleError(e); }
        finally { setAddLoading(false); }
    };

    const handleEdit = async () => {
        if (!editKey.trim() || !editValue.trim()) return;
        setEditLoading(true);
        try {
            const dto: { value: string; ttl?: number } = { value: editValue };
            if (editTtl) dto.ttl = parseInt(editTtl);
            await redisAdminApi.editCache(editKey.trim(), dto);
            toast.success(t('redisAdmin.editSuccess'));
            setEditKey(''); setEditValue(''); setEditTtl('');
        } catch (e) { handleError(e); }
        finally { setEditLoading(false); }
    };

    const handleDelete = async () => {
        if (!deleteKey.trim()) return;
        setDeleteLoading(true);
        try {
            await redisAdminApi.removeCache(deleteKey.trim());
            toast.success(t('redisAdmin.deleteSuccess'));
            setDeleteKey('');
        } catch (e) { handleError(e); }
        finally { setDeleteLoading(false); }
    };

    const handleBulkItemChange = (i: number, field: string, val: string) => {
        setBulkItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: field === 'ttl' ? (val ? parseInt(val) : undefined) : val } : item));
    };

    const handleBulkExecute = async () => {
        setBulkLoading(true);
        try {
            if (bulkTab === 'add') {
                const valid = bulkItems.filter(i => i.key.trim() && i.value.trim());
                if (!valid.length) return;
                await redisAdminApi.addBulkCache(valid);
                toast.success(t('redisAdmin.bulkAddSuccess'));
                setBulkItems([{ key: '', value: '', ttl: undefined }]);
            } else if (bulkTab === 'edit') {
                const valid = bulkItems.filter(i => i.key.trim() && i.value.trim());
                if (!valid.length) return;
                await redisAdminApi.editBulkCache(valid);
                toast.success(t('redisAdmin.bulkEditSuccess'));
                setBulkItems([{ key: '', value: '', ttl: undefined }]);
            } else {
                const keys = bulkDeleteKeys.split('\n').map(k => k.trim()).filter(Boolean);
                if (!keys.length) return;
                await redisAdminApi.removeBulkCache(keys);
                toast.success(t('redisAdmin.bulkDeleteSuccess'));
                setBulkDeleteKeys('');
            }
        } catch (e) { handleError(e); }
        finally { setBulkLoading(false); }
    };

    const handleFlush = async () => {
        setFlushLoading(true);
        try {
            await redisAdminApi.clearAllCache();
            toast.success(t('redisAdmin.flushSuccess'));
            setShowFlushModal(false);
        } catch (e) { handleError(e); }
        finally { setFlushLoading(false); }
    };

    const inputCls = "w-full px-3 py-2.5 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg text-white text-sm placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)] transition-colors";
    const labelCls = "block text-sm font-medium text-[var(--text-secondary)] mb-1.5";
    const cardCls = "bg-[var(--background-secondary)] rounded-xl border border-[var(--border-primary)] p-6";

    return (
        <div className="animate-fadeIn max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">{t('redisAdmin.title') || 'Redis Cache Manager'}</h1>
                <p className="text-[var(--text-secondary)]">{t('redisAdmin.subtitle') || 'Manage Redis cache entries'}</p>
            </div>

            {/* ═══════ Single Operations ═══════ */}
            <div className="mb-6">
                <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-[var(--accent-primary)]" />
                    <h2 className="text-lg font-semibold text-white">{t('redisAdmin.singleOps') || 'Single Operations'}</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* Add Cache */}
                    <div className={cardCls}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 rounded-lg bg-green-500/20"><Plus className="w-4 h-4 text-green-400" /></div>
                            <h3 className="font-semibold text-white">{t('redisAdmin.addCache')}</h3>
                        </div>
                        <div className="space-y-3">
                            <div><label className={labelCls}>{t('redisAdmin.key')}</label><input type="text" placeholder={t('redisAdmin.keyPlaceholder')} value={addKey} onChange={e => setAddKey(e.target.value)} className={inputCls} /></div>
                            <div><label className={labelCls}>{t('redisAdmin.value')}</label><textarea placeholder={t('redisAdmin.valuePlaceholder')} value={addValue} onChange={e => setAddValue(e.target.value)} rows={3} className={inputCls + ' resize-none'} /></div>
                            <div><label className={labelCls}>{t('redisAdmin.ttl')}</label><input type="number" placeholder={t('redisAdmin.ttlPlaceholder')} value={addTtl} onChange={e => setAddTtl(e.target.value)} className={inputCls} /><p className="text-xs text-[var(--text-muted)] mt-1">{t('redisAdmin.ttlHint')}</p></div>
                            <button onClick={handleAdd} disabled={addLoading || !addKey.trim() || !addValue.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm">
                                {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                                {addLoading ? (t('redisAdmin.processing')) : t('redisAdmin.addCache')}
                            </button>
                        </div>
                    </div>

                    {/* Edit Cache */}
                    <div className={cardCls}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 rounded-lg bg-blue-500/20"><Pencil className="w-4 h-4 text-blue-400" /></div>
                            <h3 className="font-semibold text-white">{t('redisAdmin.editCache')}</h3>
                        </div>
                        <div className="space-y-3">
                            <div><label className={labelCls}>{t('redisAdmin.key')}</label><input type="text" placeholder={t('redisAdmin.keyPlaceholder')} value={editKey} onChange={e => setEditKey(e.target.value)} className={inputCls} /></div>
                            <div><label className={labelCls}>{t('redisAdmin.value')}</label><textarea placeholder={t('redisAdmin.valuePlaceholder')} value={editValue} onChange={e => setEditValue(e.target.value)} rows={3} className={inputCls + ' resize-none'} /></div>
                            <div><label className={labelCls}>{t('redisAdmin.ttl')}</label><input type="number" placeholder={t('redisAdmin.ttlPlaceholder')} value={editTtl} onChange={e => setEditTtl(e.target.value)} className={inputCls} /><p className="text-xs text-[var(--text-muted)] mt-1">{t('redisAdmin.ttlHint')}</p></div>
                            <button onClick={handleEdit} disabled={editLoading || !editKey.trim() || !editValue.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm">
                                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
                                {editLoading ? (t('redisAdmin.processing')) : t('redisAdmin.editCache')}
                            </button>
                        </div>
                    </div>

                    {/* Delete Cache */}
                    <div className={cardCls}>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="p-2 rounded-lg bg-red-500/20"><Trash2 className="w-4 h-4 text-red-400" /></div>
                            <h3 className="font-semibold text-white">{t('redisAdmin.deleteCache')}</h3>
                        </div>
                        <div className="space-y-3">
                            <div><label className={labelCls}>{t('redisAdmin.key')}</label><input type="text" placeholder={t('redisAdmin.keyPlaceholder')} value={deleteKey} onChange={e => setDeleteKey(e.target.value)} className={inputCls} /></div>
                            <button onClick={handleDelete} disabled={deleteLoading || !deleteKey.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm">
                                {deleteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                {deleteLoading ? (t('redisAdmin.processing')) : t('redisAdmin.deleteCache')}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* ═══════ Bulk Operations ═══════ */}
            <div className={`${cardCls} mb-6`}>
                <button onClick={() => setBulkOpen(!bulkOpen)} className="w-full flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Layers className="w-5 h-5 text-purple-400" />
                        <h2 className="text-lg font-semibold text-white">{t('redisAdmin.bulkOperations') || 'Bulk Operations'}</h2>
                    </div>
                    {bulkOpen ? <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />}
                </button>

                {bulkOpen && (
                    <div className="mt-6 animate-fadeIn">
                        {/* Tabs */}
                        <div className="flex gap-1 p-1 bg-[var(--background-tertiary)] rounded-lg mb-4 w-fit">
                            {(['add', 'edit', 'delete'] as const).map(tab => (
                                <button key={tab} onClick={() => { setBulkTab(tab); setBulkItems([{ key: '', value: '', ttl: undefined }]); setBulkDeleteKeys(''); }}
                                    className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${bulkTab === tab ? 'bg-[var(--accent-primary)] text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-white'}`}>
                                    {t(`redisAdmin.bulk${tab.charAt(0).toUpperCase() + tab.slice(1)}`)}
                                </button>
                            ))}
                        </div>

                        {bulkTab === 'delete' ? (
                            <div>
                                <label className={labelCls}>Keys</label>
                                <textarea placeholder={t('redisAdmin.keysPlaceholder')} value={bulkDeleteKeys} onChange={e => setBulkDeleteKeys(e.target.value)} rows={6} className={inputCls + ' resize-none font-mono'} />
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {bulkItems.map((item, i) => (
                                    <BulkRow key={i} item={item} index={i} onChange={handleBulkItemChange} onRemove={(idx) => setBulkItems(prev => prev.filter((_, j) => j !== idx))} t={t} />
                                ))}
                                <button onClick={() => setBulkItems(prev => [...prev, { key: '', value: '', ttl: undefined }])} className="flex items-center gap-1 px-3 py-1.5 text-sm text-[var(--accent-primary)] hover:bg-[var(--accent-primary)]/10 rounded-lg transition-colors">
                                    <Plus className="w-3.5 h-3.5" /> {t('redisAdmin.addRow')}
                                </button>
                            </div>
                        )}

                        <button onClick={handleBulkExecute} disabled={bulkLoading} className="mt-4 flex items-center justify-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-sm">
                            {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Layers className="w-4 h-4" />}
                            {bulkLoading ? (t('redisAdmin.processing')) : t('redisAdmin.execute')}
                        </button>
                    </div>
                )}
            </div>

            {/* ═══════ Danger Zone ═══════ */}
            <div className="bg-[var(--background-secondary)] rounded-xl border border-red-500/30 p-6">
                <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <h2 className="text-lg font-semibold text-red-400">{t('redisAdmin.dangerZone') || 'Danger Zone'}</h2>
                </div>
                <p className="text-[var(--text-muted)] text-sm mb-4">{t('redisAdmin.dangerZoneDesc')}</p>
                <button onClick={() => setShowFlushModal(true)} className="flex items-center gap-2 px-4 py-2.5 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 font-medium transition-colors text-sm">
                    <Database className="w-4 h-4" />
                    {t('redisAdmin.flushAll') || 'Flush All'}
                </button>
            </div>

            {/* Flush Confirm Modal */}
            {showFlushModal && (
                <ConfirmModal
                    title={t('redisAdmin.confirmFlush')}
                    message={t('redisAdmin.confirmFlushMessage')}
                    confirmLabel={t('redisAdmin.confirmFlushButton')}
                    onConfirm={handleFlush}
                    onCancel={() => setShowFlushModal(false)}
                    isLoading={flushLoading}
                />
            )}
        </div>
    );
}

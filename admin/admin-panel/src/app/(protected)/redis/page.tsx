'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { redisAdminApi, CreateCacheDto } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import {
    Database,
    Plus,
    Trash2,
    Loader2,
    AlertTriangle,
    X,
    RefreshCw,
    Search,
    Key,
    Clock,
    Copy,
    Check,
    ChevronRight,
    ChevronDown,
    Folder,
    FolderOpen,
    FileText,
    Save,
    Pencil,
    Braces,
    Type as TypeIcon,
} from 'lucide-react';

// ─── Types ───
interface CacheEntry {
    key: string;
    value: string;
    ttl: number;
}

interface NamespaceNode {
    name: string;
    fullPath: string;
    children: Map<string, NamespaceNode>;
    keys: CacheEntry[];
    totalKeyCount: number;
}

// ─── Helper: Build tree from flat keys ───
function buildTree(entries: CacheEntry[]): NamespaceNode {
    const root: NamespaceNode = { name: '', fullPath: '', children: new Map(), keys: [], totalKeyCount: 0 };

    for (const entry of entries) {
        const parts = entry.key.split(':');
        let current = root;

        if (parts.length === 1) {
            current.keys.push(entry);
        } else {
            for (let i = 0; i < parts.length - 1; i++) {
                const part = parts[i];
                const fullPath = parts.slice(0, i + 1).join(':');
                if (!current.children.has(part)) {
                    current.children.set(part, {
                        name: part,
                        fullPath,
                        children: new Map(),
                        keys: [],
                        totalKeyCount: 0,
                    });
                }
                current = current.children.get(part)!;
            }
            current.keys.push(entry);
        }
    }

    // Calculate total key counts
    function countKeys(node: NamespaceNode): number {
        let count = node.keys.length;
        Array.from(node.children.values()).forEach(child => {
            count += countKeys(child);
        });
        node.totalKeyCount = count;
        return count;
    }
    countKeys(root);

    return root;
}

// ─── Helper: Format TTL ───
function formatTTL(ttl: number): string {
    if (ttl === -1) return '∞';
    if (ttl === -2) return 'expired';
    if (ttl < 60) return `${ttl}s`;
    if (ttl < 3600) return `${Math.floor(ttl / 60)}m ${ttl % 60}s`;
    if (ttl < 86400) return `${Math.floor(ttl / 3600)}h ${Math.floor((ttl % 3600) / 60)}m`;
    return `${Math.floor(ttl / 86400)}d ${Math.floor((ttl % 86400) / 3600)}h`;
}

// ─── Helper: Format bytes ───
function formatBytes(str: string): string {
    const bytes = new Blob([str]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Helper: Try parse JSON ───
function tryParseJSON(str: string): { parsed: unknown; isJSON: boolean } {
    try {
        const parsed = JSON.parse(str);
        if (typeof parsed === 'object' && parsed !== null) {
            return { parsed, isJSON: true };
        }
        return { parsed: str, isJSON: false };
    } catch {
        return { parsed: str, isJSON: false };
    }
}

// ─── Confirm Modal Component ───
function ConfirmModal({ title, message, confirmLabel, onConfirm, onCancel, isLoading, variant = 'danger' }: {
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading: boolean;
    variant?: 'danger' | 'warning';
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onCancel}>
            <div className="bg-[#1a1f2e] rounded-xl border border-[var(--border-primary)] p-6 max-w-md w-full mx-4 shadow-2xl animate-scaleIn" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2.5 rounded-lg ${variant === 'danger' ? 'bg-red-500/15' : 'bg-amber-500/15'}`}>
                        <AlertTriangle className={`w-5 h-5 ${variant === 'danger' ? 'text-red-400' : 'text-amber-400'}`} />
                    </div>
                    <h3 className="text-base font-semibold text-white">{title}</h3>
                </div>
                <p className="text-[var(--text-secondary)] mb-6 text-sm leading-relaxed pl-[52px]">{message}</p>
                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} disabled={isLoading}
                        className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] transition-colors text-sm font-medium">
                        Cancel
                    </button>
                    <button onClick={onConfirm} disabled={isLoading}
                        className={`px-4 py-2 rounded-lg text-white font-medium transition-colors disabled:opacity-50 text-sm flex items-center gap-2 ${
                            variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                        }`}>
                        {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Add Key Modal Component ───
function AddKeyModal({ onClose, onSubmit, isLoading, t }: {
    onClose: () => void;
    onSubmit: (dto: CreateCacheDto) => void;
    isLoading: boolean;
    t: (k: string) => string;
}) {
    const [key, setKey] = useState('');
    const [value, setValue] = useState('');
    const [ttl, setTtl] = useState('');

    const handleSubmit = () => {
        if (!key.trim() || !value.trim()) return;
        const dto: CreateCacheDto = { key: key.trim(), value: value.trim() };
        if (ttl) dto.ttl = parseInt(ttl);
        onSubmit(dto);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-[#1a1f2e] rounded-xl border border-[var(--border-primary)] p-6 max-w-lg w-full mx-4 shadow-2xl animate-scaleIn" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-teal-500/15">
                            <Plus className="w-5 h-5 text-teal-400" />
                        </div>
                        <h3 className="text-base font-semibold text-white">{t('redisAdmin.addNewKey')}</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-white hover:bg-[var(--background-tertiary)] transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">{t('redisAdmin.key')}</label>
                        <input
                            type="text"
                            placeholder={t('redisAdmin.keyPlaceholder')}
                            value={key}
                            onChange={e => setKey(e.target.value)}
                            className="w-full px-3 py-2.5 bg-[var(--background-primary)] border border-[var(--border-primary)] rounded-lg text-white text-sm font-mono placeholder-[var(--text-muted)] focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
                            autoFocus
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">{t('redisAdmin.value')}</label>
                        <textarea
                            placeholder={t('redisAdmin.valuePlaceholder')}
                            value={value}
                            onChange={e => setValue(e.target.value)}
                            rows={6}
                            className="w-full px-3 py-2.5 bg-[var(--background-primary)] border border-[var(--border-primary)] rounded-lg text-white text-sm font-mono placeholder-[var(--text-muted)] focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all resize-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">{t('redisAdmin.ttlSeconds')}</label>
                        <input
                            type="number"
                            placeholder={t('redisAdmin.ttlPlaceholder')}
                            value={ttl}
                            onChange={e => setTtl(e.target.value)}
                            className="w-full px-3 py-2.5 bg-[var(--background-primary)] border border-[var(--border-primary)] rounded-lg text-white text-sm font-mono placeholder-[var(--text-muted)] focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all"
                        />
                        <p className="text-xs text-[var(--text-muted)] mt-1">{t('redisAdmin.ttlHint')}</p>
                    </div>
                </div>

                <div className="flex gap-3 justify-end mt-6">
                    <button onClick={onClose} disabled={isLoading}
                        className="px-4 py-2 rounded-lg text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] transition-colors text-sm font-medium">
                        {t('redisAdmin.cancel')}
                    </button>
                    <button onClick={handleSubmit} disabled={isLoading || !key.trim() || !value.trim()}
                        className="px-5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-medium transition-colors disabled:opacity-50 text-sm flex items-center gap-2">
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                        {isLoading ? t('redisAdmin.processing') : t('redisAdmin.addKey')}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Namespace Tree Node Component ───
function TreeNode({ node, depth, selectedKey, onSelectKey, expandedNodes, toggleExpand }: {
    node: NamespaceNode;
    depth: number;
    selectedKey: string | null;
    onSelectKey: (entry: CacheEntry) => void;
    expandedNodes: Set<string>;
    toggleExpand: (path: string) => void;
}) {
    const isExpanded = expandedNodes.has(node.fullPath);
    const hasChildren = node.children.size > 0 || node.keys.length > 0;
    const sortedChildren = useMemo(() => { const arr: NamespaceNode[] = []; node.children.forEach(v => arr.push(v)); return arr.sort((a, b) => a.name.localeCompare(b.name)); }, [node.children]);
    const sortedKeys = useMemo(() => [...node.keys].sort((a, b) => a.key.localeCompare(b.key)), [node.keys]);

    return (
        <div>
            {/* Namespace folder */}
            {node.name && (
                <button
                    onClick={() => toggleExpand(node.fullPath)}
                    className={`w-full flex items-center gap-1.5 px-2 py-[5px] text-left text-sm hover:bg-[var(--background-tertiary)] rounded transition-colors group`}
                    style={{ paddingLeft: `${depth * 16 + 8}px` }}
                >
                    {hasChildren ? (
                        isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] shrink-0" />
                    ) : (
                        <span className="w-3.5 shrink-0" />
                    )}
                    {isExpanded ? (
                        <FolderOpen className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                        <Folder className="w-4 h-4 text-amber-400/70 shrink-0" />
                    )}
                    <span className="text-[var(--text-secondary)] group-hover:text-white truncate transition-colors font-medium">{node.name}</span>
                    <span className="ml-auto text-[10px] text-[var(--text-muted)] bg-[var(--background-primary)] px-1.5 py-0.5 rounded-full font-mono shrink-0">{node.totalKeyCount}</span>
                </button>
            )}

            {/* Children and keys */}
            {(isExpanded || !node.name) && (
                <div>
                    {sortedChildren.map(child => (
                        <TreeNode
                            key={child.fullPath}
                            node={child}
                            depth={node.name ? depth + 1 : depth}
                            selectedKey={selectedKey}
                            onSelectKey={onSelectKey}
                            expandedNodes={expandedNodes}
                            toggleExpand={toggleExpand}
                        />
                    ))}
                    {sortedKeys.map(entry => {
                        const shortName = entry.key.split(':').pop() || entry.key;
                        const isSelected = selectedKey === entry.key;
                        return (
                            <button
                                key={entry.key}
                                onClick={() => onSelectKey(entry)}
                                className={`w-full flex items-center gap-1.5 px-2 py-[5px] text-left text-sm rounded transition-all group ${
                                    isSelected
                                        ? 'bg-teal-500/15 text-teal-300'
                                        : 'hover:bg-[var(--background-tertiary)] text-[var(--text-secondary)]'
                                }`}
                                style={{ paddingLeft: `${(node.name ? depth + 1 : depth) * 16 + 8 + 18}px` }}
                            >
                                <FileText className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-teal-400' : 'text-[var(--text-muted)]'}`} />
                                <span className="truncate group-hover:text-white transition-colors">{shortName}</span>
                                {entry.ttl > 0 && (
                                    <span className="ml-auto text-[10px] text-[var(--text-muted)] font-mono shrink-0">{formatTTL(entry.ttl)}</span>
                                )}
                                {entry.ttl === -1 && (
                                    <span className="ml-auto text-[10px] text-emerald-500 font-mono shrink-0">∞</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── JSON Viewer Component ───
function JsonViewer({ value, isRaw }: { value: string; isRaw: boolean }) {
    const { parsed, isJSON } = tryParseJSON(value);

    if (isRaw || !isJSON) {
        return (
            <pre className="text-sm font-mono text-[var(--text-primary)] whitespace-pre-wrap break-all leading-relaxed p-4 bg-[var(--background-primary)] rounded-lg border border-[var(--border-primary)] overflow-auto max-h-[500px]">
                {value}
            </pre>
        );
    }

    const formatted = JSON.stringify(parsed, null, 2);
    return (
        <pre className="text-sm font-mono whitespace-pre-wrap break-all leading-relaxed p-4 bg-[var(--background-primary)] rounded-lg border border-[var(--border-primary)] overflow-auto max-h-[500px]">
            {formatted.split('\n').map((line, i) => {
                // Simple syntax highlighting
                const colored = line
                    .replace(/"([^"]+)":/g, '<key>"$1"</key>:')
                    .replace(/: "([^"]*)"/g, ': <str>"$1"</str>')
                    .replace(/: (\d+\.?\d*)/g, ': <num>$1</num>')
                    .replace(/: (true|false)/g, ': <bool>$1</bool>')
                    .replace(/: (null)/g, ': <nil>$1</nil>');

                return (
                    <span key={i} className="block">
                        {colored.includes('<key>') || colored.includes('<str>') || colored.includes('<num>') || colored.includes('<bool>') || colored.includes('<nil>') ? (
                            <span dangerouslySetInnerHTML={{
                                __html: colored
                                    .replace(/<key>/g, '<span class="text-purple-400">')
                                    .replace(/<\/key>/g, '</span>')
                                    .replace(/<str>/g, '<span class="text-emerald-400">')
                                    .replace(/<\/str>/g, '</span>')
                                    .replace(/<num>/g, '<span class="text-amber-400">')
                                    .replace(/<\/num>/g, '</span>')
                                    .replace(/<bool>/g, '<span class="text-sky-400">')
                                    .replace(/<\/bool>/g, '</span>')
                                    .replace(/<nil>/g, '<span class="text-rose-400">')
                                    .replace(/<\/nil>/g, '</span>')
                            }} />
                        ) : (
                            <span className="text-[var(--text-secondary)]">{line}</span>
                        )}
                    </span>
                );
            })}
        </pre>
    );
}

// ─── Main Page Component ───
export default function RedisPage() {
    const { t } = useLanguage();

    // ─── State ───
    const [allKeys, setAllKeys] = useState<CacheEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchPattern, setSearchPattern] = useState('');
    const [selectedEntry, setSelectedEntry] = useState<CacheEntry | null>(null);
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

    // Modals
    const [showAddModal, setShowAddModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showFlushModal, setShowFlushModal] = useState(false);
    const [addLoading, setAddLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [flushLoading, setFlushLoading] = useState(false);

    // Edit mode
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [editTtl, setEditTtl] = useState('');
    const [editLoading, setEditLoading] = useState(false);

    // View format
    const [viewFormat, setViewFormat] = useState<'json' | 'raw'>('json');

    // Copy state
    const [copiedKey, setCopiedKey] = useState(false);
    const [copiedValue, setCopiedValue] = useState(false);

    // Search ref
    const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(null);

    // ─── Fetch keys ───
    const fetchKeys = useCallback(async (pattern?: string) => {
        setLoading(true);
        try {
            const data = await redisAdminApi.getAllCache(pattern || undefined);
            setAllKeys(data);
        } catch {
            toast.error(t('redisAdmin.error'));
        } finally {
            setLoading(false);
        }
    }, [t]);

    useEffect(() => {
        fetchKeys();
    }, [fetchKeys]);

    // ─── Debounced search ───
    const handleSearch = useCallback((value: string) => {
        setSearchPattern(value);
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        searchTimeoutRef.current = setTimeout(() => {
            fetchKeys(value || undefined);
        }, 500);
    }, [fetchKeys]);

    // ─── Build tree ───
    const tree = useMemo(() => buildTree(allKeys), [allKeys]);

    // ─── Toggle expand ───
    const toggleExpand = useCallback((path: string) => {
        setExpandedNodes(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    }, []);

    // ─── Expand all / Collapse all ───
    const expandAll = useCallback(() => {
        const allPaths = new Set<string>();
        function collect(node: NamespaceNode) {
            if (node.fullPath) allPaths.add(node.fullPath);
            node.children.forEach(child => collect(child));
        }
        collect(tree);
        setExpandedNodes(allPaths);
    }, [tree]);

    const collapseAll = useCallback(() => {
        setExpandedNodes(new Set());
    }, []);

    // ─── Select key ───
    const handleSelectKey = useCallback((entry: CacheEntry) => {
        setSelectedEntry(entry);
        setIsEditing(false);
        setViewFormat('json');

        // Auto-expand parent namespaces
        const parts = entry.key.split(':');
        if (parts.length > 1) {
            setExpandedNodes(prev => {
                const next = new Set(prev);
                for (let i = 1; i < parts.length; i++) {
                    next.add(parts.slice(0, i).join(':'));
                }
                return next;
            });
        }
    }, []);

    // ─── Handlers ───
    const handleError = useCallback((error: unknown) => {
        const msg = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
        toast.error(msg || t('redisAdmin.error'));
    }, [t]);

    const handleAdd = useCallback(async (dto: CreateCacheDto) => {
        setAddLoading(true);
        try {
            await redisAdminApi.addCache(dto);
            toast.success(t('redisAdmin.addSuccess'));
            setShowAddModal(false);
            await fetchKeys(searchPattern || undefined);
        } catch (e) { handleError(e); }
        finally { setAddLoading(false); }
    }, [t, handleError, fetchKeys, searchPattern]);

    const handleDelete = useCallback(async () => {
        if (!selectedEntry) return;
        setDeleteLoading(true);
        try {
            await redisAdminApi.removeCache(selectedEntry.key);
            toast.success(t('redisAdmin.deleteSuccess'));
            setShowDeleteModal(false);
            setSelectedEntry(null);
            await fetchKeys(searchPattern || undefined);
        } catch (e) { handleError(e); }
        finally { setDeleteLoading(false); }
    }, [selectedEntry, t, handleError, fetchKeys, searchPattern]);

    const handleEdit = useCallback(async () => {
        if (!selectedEntry) return;
        setEditLoading(true);
        try {
            const dto: { value: string; ttl?: number } = { value: editValue };
            if (editTtl) dto.ttl = parseInt(editTtl);
            await redisAdminApi.editCache(selectedEntry.key, dto);
            toast.success(t('redisAdmin.editSuccess'));
            setIsEditing(false);
            // Update local state
            const updated: CacheEntry = { ...selectedEntry, value: editValue, ttl: editTtl ? parseInt(editTtl) : selectedEntry.ttl };
            setSelectedEntry(updated);
            await fetchKeys(searchPattern || undefined);
        } catch (e) { handleError(e); }
        finally { setEditLoading(false); }
    }, [selectedEntry, editValue, editTtl, t, handleError, fetchKeys, searchPattern]);

    const handleFlush = useCallback(async () => {
        setFlushLoading(true);
        try {
            await redisAdminApi.clearAllCache();
            toast.success(t('redisAdmin.flushSuccess'));
            setShowFlushModal(false);
            setSelectedEntry(null);
            setAllKeys([]);
        } catch (e) { handleError(e); }
        finally { setFlushLoading(false); }
    }, [t, handleError]);

    const startEditing = useCallback(() => {
        if (!selectedEntry) return;
        setEditValue(selectedEntry.value);
        setEditTtl(selectedEntry.ttl > 0 ? String(selectedEntry.ttl) : '');
        setIsEditing(true);
    }, [selectedEntry]);

    const handleCopy = useCallback(async (text: string, type: 'key' | 'value') => {
        try {
            await navigator.clipboard.writeText(text);
            if (type === 'key') { setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); }
            else { setCopiedValue(true); setTimeout(() => setCopiedValue(false), 2000); }
            toast.success(t('redisAdmin.copied'));
        } catch { /* ignore */ }
    }, [t]);

    const handleRefresh = useCallback(async () => {
        await fetchKeys(searchPattern || undefined);
        if (selectedEntry) {
            try {
                const refreshed = await redisAdminApi.getCacheByKey(selectedEntry.key);
                if (refreshed) {
                    setSelectedEntry(refreshed);
                } else {
                    setSelectedEntry(null);
                }
            } catch {
                setSelectedEntry(null);
            }
        }
    }, [fetchKeys, searchPattern, selectedEntry]);

    // ─── Render ───
    return (
        <div className="animate-fadeIn h-[calc(100vh-6rem)] flex flex-col">
            {/* ═══════ Header Bar ═══════ */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/20">
                        <Database className="w-6 h-6 text-red-400" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-white">{t('redisAdmin.title')}</h1>
                        <p className="text-xs text-[var(--text-muted)]">{t('redisAdmin.subtitle')}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-3 py-2 bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg text-sm text-[var(--text-secondary)] hover:text-white hover:border-[var(--border-secondary)] transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        {t('redisAdmin.refresh')}
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        {t('redisAdmin.addKey')}
                    </button>
                    <button
                        onClick={() => setShowFlushModal(true)}
                        className="flex items-center gap-1.5 px-3 py-2 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/10 transition-colors"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t('redisAdmin.flushAll')}
                    </button>
                </div>
            </div>

            {/* ═══════ Main Content: Key Browser + Value Viewer ═══════ */}
            <div className="flex-1 flex gap-0 min-h-0 border border-[var(--border-primary)] rounded-xl overflow-hidden bg-[var(--background-secondary)]">

                {/* ─── Left Panel: Key Browser ─── */}
                <div className="w-80 shrink-0 flex flex-col border-r border-[var(--border-primary)] bg-[var(--background-secondary)]">
                    {/* Browser header */}
                    <div className="p-3 border-b border-[var(--border-primary)]">
                        <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                                <Key className="w-4 h-4 text-teal-400" />
                                <span className="text-sm font-semibold text-white">{t('redisAdmin.keyBrowser')}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] font-mono text-[var(--text-muted)] bg-[var(--background-primary)] px-2 py-0.5 rounded-full">
                                    {allKeys.length} keys
                                </span>
                            </div>
                        </div>
                        {/* Search input */}
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                            <input
                                type="text"
                                placeholder={t('redisAdmin.searchKeys')}
                                value={searchPattern}
                                onChange={e => handleSearch(e.target.value)}
                                className="w-full pl-8 pr-3 py-2 bg-[var(--background-primary)] border border-[var(--border-primary)] rounded-lg text-sm text-white placeholder-[var(--text-muted)] focus:outline-none focus:border-teal-500/50 transition-colors"
                            />
                        </div>
                        {/* Expand/Collapse buttons */}
                        <div className="flex items-center gap-1 mt-2">
                            <button onClick={expandAll} className="text-[10px] text-[var(--text-muted)] hover:text-teal-400 transition-colors px-1.5 py-0.5 rounded">
                                {t('redisAdmin.expandAll')}
                            </button>
                            <span className="text-[var(--text-muted)]">·</span>
                            <button onClick={collapseAll} className="text-[10px] text-[var(--text-muted)] hover:text-teal-400 transition-colors px-1.5 py-0.5 rounded">
                                {t('redisAdmin.collapseAll')}
                            </button>
                        </div>
                    </div>

                    {/* Key tree */}
                    <div className="flex-1 overflow-auto py-1">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--text-muted)]">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="text-xs">{t('redisAdmin.loading')}</span>
                            </div>
                        ) : allKeys.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full gap-2 text-[var(--text-muted)] px-4">
                                <Database className="w-8 h-8 opacity-30" />
                                <span className="text-xs text-center">{t('redisAdmin.noKeys')}</span>
                            </div>
                        ) : (
                            <TreeNode
                                node={tree}
                                depth={0}
                                selectedKey={selectedEntry?.key || null}
                                onSelectKey={handleSelectKey}
                                expandedNodes={expandedNodes}
                                toggleExpand={toggleExpand}
                            />
                        )}
                    </div>
                </div>

                {/* ─── Right Panel: Value Viewer/Editor ─── */}
                <div className="flex-1 flex flex-col min-w-0 bg-[var(--background-primary)]">
                    {selectedEntry ? (
                        <>
                            {/* Key info header */}
                            <div className="p-4 border-b border-[var(--border-primary)] bg-[var(--background-secondary)]">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        {/* Key name */}
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{t('redisAdmin.key')}</span>
                                            <button
                                                onClick={() => handleCopy(selectedEntry.key, 'key')}
                                                className="p-1 rounded hover:bg-[var(--background-tertiary)] text-[var(--text-muted)] hover:text-white transition-colors"
                                                title={t('redisAdmin.copyKey')}
                                            >
                                                {copiedKey ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                            </button>
                                        </div>
                                        <p className="text-sm font-mono text-white break-all leading-relaxed">{selectedEntry.key}</p>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1.5 shrink-0">
                                        {!isEditing && (
                                            <button
                                                onClick={startEditing}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[var(--background-tertiary)] text-[var(--text-secondary)] hover:text-white rounded-lg transition-colors border border-[var(--border-primary)] hover:border-[var(--border-secondary)]"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                                {t('redisAdmin.edit')}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowDeleteModal(true)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                            {t('redisAdmin.delete')}
                                        </button>
                                    </div>
                                </div>

                                {/* Meta badges */}
                                <div className="flex items-center gap-3 mt-3">
                                    <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                            <TypeIcon className="w-3 h-3" />
                                            {t('redisAdmin.string')}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs border ${
                                            selectedEntry.ttl === -1
                                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                                : selectedEntry.ttl === -2
                                                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        }`}>
                                            <Clock className="w-3 h-3" />
                                            {selectedEntry.ttl === -1
                                                ? t('redisAdmin.ttlForever')
                                                : selectedEntry.ttl === -2
                                                    ? t('redisAdmin.ttlExpired')
                                                    : formatTTL(selectedEntry.ttl)
                                            }
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[var(--background-tertiary)] text-[var(--text-muted)] text-xs border border-[var(--border-primary)]">
                                            {t('redisAdmin.size')}: {formatBytes(selectedEntry.value)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Value section */}
                            <div className="flex-1 flex flex-col min-h-0 p-4 overflow-auto">
                                {isEditing ? (
                                    /* ─── Edit Mode ─── */
                                    <div className="flex flex-col gap-4 h-full">
                                        <div className="flex-1 flex flex-col">
                                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">{t('redisAdmin.value')}</label>
                                            <textarea
                                                value={editValue}
                                                onChange={e => setEditValue(e.target.value)}
                                                className="flex-1 min-h-[200px] w-full px-3 py-3 bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg text-white text-sm font-mono placeholder-[var(--text-muted)] focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/20 transition-all resize-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1.5 uppercase tracking-wider">{t('redisAdmin.ttlSeconds')}</label>
                                            <input
                                                type="number"
                                                value={editTtl}
                                                onChange={e => setEditTtl(e.target.value)}
                                                placeholder={t('redisAdmin.ttlPlaceholder')}
                                                className="w-48 px-3 py-2 bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg text-white text-sm font-mono placeholder-[var(--text-muted)] focus:outline-none focus:border-teal-500/50 transition-colors"
                                            />
                                            <p className="text-xs text-[var(--text-muted)] mt-1">{t('redisAdmin.ttlHint')}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={handleEdit}
                                                disabled={editLoading || !editValue.trim()}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                            >
                                                {editLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                {editLoading ? t('redisAdmin.processing') : t('redisAdmin.save')}
                                            </button>
                                            <button
                                                onClick={() => setIsEditing(false)}
                                                disabled={editLoading}
                                                className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-white hover:bg-[var(--background-tertiary)] rounded-lg transition-colors"
                                            >
                                                {t('redisAdmin.cancel')}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* ─── View Mode ─── */
                                    <div className="flex flex-col gap-3 h-full">
                                        {/* Format toggle + Copy button */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1 p-0.5 bg-[var(--background-secondary)] rounded-lg border border-[var(--border-primary)]">
                                                <button
                                                    onClick={() => setViewFormat('json')}
                                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                                        viewFormat === 'json'
                                                            ? 'bg-teal-500/20 text-teal-300 shadow-sm'
                                                            : 'text-[var(--text-muted)] hover:text-white'
                                                    }`}
                                                >
                                                    <Braces className="w-3 h-3" />
                                                    {t('redisAdmin.jsonFormat')}
                                                </button>
                                                <button
                                                    onClick={() => setViewFormat('raw')}
                                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                                        viewFormat === 'raw'
                                                            ? 'bg-teal-500/20 text-teal-300 shadow-sm'
                                                            : 'text-[var(--text-muted)] hover:text-white'
                                                    }`}
                                                >
                                                    <TypeIcon className="w-3 h-3" />
                                                    {t('redisAdmin.rawFormat')}
                                                </button>
                                            </div>
                                            <button
                                                onClick={() => handleCopy(selectedEntry.value, 'value')}
                                                className="flex items-center gap-1.5 px-2.5 py-1 text-xs text-[var(--text-muted)] hover:text-white hover:bg-[var(--background-secondary)] rounded-lg transition-colors border border-transparent hover:border-[var(--border-primary)]"
                                            >
                                                {copiedValue ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                                {t('redisAdmin.copyValue')}
                                            </button>
                                        </div>

                                        {/* Value display */}
                                        <div className="flex-1 min-h-0">
                                            <JsonViewer value={selectedEntry.value} isRaw={viewFormat === 'raw'} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        /* ─── No Key Selected ─── */
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                            <div className="p-4 rounded-2xl bg-gradient-to-br from-[var(--background-secondary)] to-[var(--background-tertiary)] border border-[var(--border-primary)] mb-4">
                                <Database className="w-10 h-10 text-[var(--text-muted)] opacity-40" />
                            </div>
                            <h3 className="text-base font-medium text-[var(--text-secondary)] mb-1">{t('redisAdmin.noKeySelected')}</h3>
                            <p className="text-sm text-[var(--text-muted)] max-w-xs">{t('redisAdmin.noKeySelectedHint')}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════ Modals ═══════ */}
            {showAddModal && (
                <AddKeyModal
                    onClose={() => setShowAddModal(false)}
                    onSubmit={handleAdd}
                    isLoading={addLoading}
                    t={t}
                />
            )}

            {showDeleteModal && selectedEntry && (
                <ConfirmModal
                    title={t('redisAdmin.confirmDelete')}
                    message={`${t('redisAdmin.confirmDeleteMessage')}\n\nKey: ${selectedEntry.key}`}
                    confirmLabel={t('redisAdmin.confirmDeleteButton')}
                    onConfirm={handleDelete}
                    onCancel={() => setShowDeleteModal(false)}
                    isLoading={deleteLoading}
                    variant="danger"
                />
            )}

            {showFlushModal && (
                <ConfirmModal
                    title={t('redisAdmin.confirmFlush')}
                    message={t('redisAdmin.confirmFlushMessage')}
                    confirmLabel={t('redisAdmin.confirmFlushButton')}
                    onConfirm={handleFlush}
                    onCancel={() => setShowFlushModal(false)}
                    isLoading={flushLoading}
                    variant="danger"
                />
            )}
        </div>
    );
}

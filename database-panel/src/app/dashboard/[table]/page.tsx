'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { adminApi, FilterCondition } from '@/lib/api';
import { toast } from 'sonner';
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Trash2,
    Loader2,
    RefreshCw,
    Filter,
    X,
    Save,
    Undo2,
    Check,
    Calendar,
    Maximize2,
} from 'lucide-react';
import { format } from 'date-fns';
import { useLanguage } from '@/contexts/LanguageContext';

// Cell values from database are dynamic and can be any type
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CellValue = any;

interface RecordData {
    id: string;
    [key: string]: CellValue;
}

interface Meta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

interface SchemaField {
    name: string;
    type: string;
    isRequired: boolean;
    isId: boolean;
    hasDefaultValue: boolean;
    isRelation: boolean;
}

interface TableSchema {
    tableName: string;
    fields: SchemaField[];
}

interface PendingChange {
    type: 'update' | 'create' | 'delete';
    id: string;
    originalData?: RecordData;
    newData?: RecordData;
    modifiedColumns?: Set<string>;
}

const OPERATORS = [
    { value: 'equals', label: 'equals', symbol: '=' },
    { value: 'not', label: 'not equals', symbol: '<>' },
    { value: 'gt', label: 'greater', symbol: '>' },
    { value: 'gte', label: 'greater or equals', symbol: '>=' },
    { value: 'lt', label: 'less', symbol: '<' },
    { value: 'lte', label: 'less or equals', symbol: '<=' },
    { value: 'contains', label: 'like', symbol: 'LIKE' },
    { value: 'startsWith', label: 'starts with', symbol: 'LIKE%' },
    { value: 'endsWith', label: 'ends with', symbol: '%LIKE' },
    { value: 'in', label: 'in', symbol: 'IN' },
    { value: 'isNull', label: 'is null', symbol: 'IS NULL' },
    { value: 'isNotNull', label: 'is not null', symbol: 'IS NOT NULL' },
];

const DATETIME_TYPES = ['DateTime', 'Date', 'Timestamp'];
// Only id is readonly - allow editing created_at, updated_at, deleted_at
const READONLY_COLUMNS = ['id'];
const PAGE_SIZE_OPTIONS = [25, 50, 75, 100];
const LOCALSTORAGE_PAGE_SIZE_KEY = 'database-panel-page-size';

export default function TablePage() {
    const params = useParams();
    const tableName = params.table as string;
    const { t } = useLanguage();

    // Load page size from localStorage
    const getInitialPageSize = (): number => {
        if (typeof window === 'undefined') return 25;
        const saved = localStorage.getItem(LOCALSTORAGE_PAGE_SIZE_KEY);
        if (saved) {
            const num = parseInt(saved, 10);
            if (!isNaN(num) && num > 0) return num;
        }
        return 25;
    };

    const [records, setRecords] = useState<RecordData[]>([]);
    const [meta, setMeta] = useState<Meta>({ total: 0, page: 1, limit: getInitialPageSize(), totalPages: 1 });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [columns, setColumns] = useState<string[]>([]);
    const [schema, setSchema] = useState<TableSchema | null>(null);

    // Filter state - separate pending (editing) from applied filters
    const [pendingFilters, setPendingFilters] = useState<FilterCondition[]>([]);
    const [appliedFilters, setAppliedFilters] = useState<FilterCondition[]>([]);
    const [showFilterPanel, setShowFilterPanel] = useState(false);
    const [newFilter, setNewFilter] = useState<FilterCondition>({ column: '', operator: 'equals', value: '' });

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // Pending changes state
    const [pendingChanges, setPendingChanges] = useState<Map<string, PendingChange>>(new Map());
    const [editingCell, setEditingCell] = useState<{ id: string; column: string } | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    // Text modal state for text content
    const [textModalOpen, setTextModalOpen] = useState(false);
    const [textModalValue, setTextModalValue] = useState('');
    const [textModalCell, setTextModalCell] = useState<{ id: string; column: string; isNewRow: boolean } | null>(null);

    // DateTime modal state
    const [dateModalOpen, setDateModalOpen] = useState(false);
    const [dateModalValue, setDateModalValue] = useState('');
    const [dateModalCell, setDateModalCell] = useState<{ id: string; column: string; isNewRow: boolean } | null>(null);

    // New row state
    const [newRows, setNewRows] = useState<RecordData[]>([]);

    const hasPendingChanges = pendingChanges.size > 0 || newRows.length > 0;

    // Get field info from schema
    const getFieldInfo = useCallback((columnName: string): SchemaField | undefined => {
        return schema?.fields.find((f) => f.name === columnName);
    }, [schema]);

    const isColumnNullable = useCallback((columnName: string): boolean => {
        const field = getFieldInfo(columnName);
        return field ? !field.isRequired : true;
    }, [getFieldInfo]);

    const isColumnBoolean = useCallback((columnName: string): boolean => {
        const field = getFieldInfo(columnName);
        return field?.type === 'Boolean';
    }, [getFieldInfo]);

    const isColumnDateTime = useCallback((columnName: string): boolean => {
        const field = getFieldInfo(columnName);
        return DATETIME_TYPES.includes(field?.type || '');
    }, [getFieldInfo]);

    const isColumnNumber = useCallback((columnName: string): boolean => {
        const field = getFieldInfo(columnName);
        return field?.type === 'Int' || field?.type === 'Float' || field?.type === 'Decimal';
    }, [getFieldInfo]);

    // fetchSchema is called inline in useEffect, keeping for potential future use
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const fetchSchema = useCallback(async () => {
        try {
            const schemaData = await adminApi.getTableSchema(tableName);
            setSchema(schemaData);
        } catch (error) {
            console.error('Failed to fetch schema:', error);
        }
    }, [tableName]);

    const fetchRecords = useCallback(async (page = 1) => {
        setIsLoading(true);
        try {
            const data = await adminApi.getRecords(tableName, {
                page,
                limit: meta.limit,
                filters: appliedFilters.length > 0 ? appliedFilters : undefined,
            });
            setRecords(data.data);
            setMeta(data.meta);

            // Extract columns from first record or from schema
            if (data.data.length > 0) {
                const allColumns = Object.keys(data.data[0]);
                setColumns(allColumns);
                if (!newFilter.column && allColumns.length > 0) {
                    setNewFilter((prev) => ({ ...prev, column: allColumns[0] }));
                }
            } else if (schema?.fields && schema.fields.length > 0) {
                // No records - use schema fields for columns
                const schemaColumns = schema.fields
                    .filter((f: SchemaField) => !f.isRelation)
                    .map((f: SchemaField) => f.name);
                setColumns(schemaColumns);
                if (!newFilter.column && schemaColumns.length > 0) {
                    setNewFilter((prev) => ({ ...prev, column: schemaColumns[0] }));
                }
            }
        } catch (err) {
            const error = err as { response?: { data?: { message?: string } }; message?: string };
            toast.error('Lỗi khi tải dữ liệu: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tableName, meta.limit, appliedFilters, schema, newFilter.column]);

    useEffect(() => {
        // Reset state when table changes
        setPendingFilters([]);
        setAppliedFilters([]);
        setSelectedIds(new Set());
        setPendingChanges(new Map());
        setNewRows([]);
        setEditingCell(null);
        setSchema(null);
        setColumns([]);

        // Fetch schema first, then records
        const init = async () => {
            try {
                const schemaData = await adminApi.getTableSchema(tableName);
                setSchema(schemaData);

                // Set columns from schema immediately (for empty tables)
                if (schemaData?.fields) {
                    const schemaColumns = schemaData.fields
                        .filter((f: SchemaField) => !f.isRelation)
                        .map((f: SchemaField) => f.name);
                    setColumns(schemaColumns);
                }
            } catch (error) {
                console.error('Failed to fetch schema:', error);
            }

            // Then fetch records
            fetchRecords(1);
        };

        init();
    }, [tableName, fetchRecords]);

    // Handle page size change
    const handlePageSizeChange = (newSize: number) => {
        if (newSize > 0) {
            localStorage.setItem(LOCALSTORAGE_PAGE_SIZE_KEY, newSize.toString());
            setMeta(prev => ({ ...prev, limit: newSize, page: 1 }));
        }
    };

    // Fetch records when limit changes
    useEffect(() => {
        if (tableName) {
            fetchRecords(1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meta.limit]);

    const addFilter = () => {
        // Use first column if newFilter.column is empty
        const columnToUse = newFilter.column || columns[0];
        if (!columnToUse) return;

        // Add filter with current values (value can be empty initially)
        setPendingFilters([...pendingFilters, {
            column: columnToUse,
            operator: 'equals',
            value: ''
        }]);
    };

    const updateFilter = (index: number, field: keyof FilterCondition, value: string) => {
        const updated = [...pendingFilters];
        updated[index] = { ...updated[index], [field]: value };
        setPendingFilters(updated);
    };

    const removeFilter = (index: number) => {
        setPendingFilters(pendingFilters.filter((_, i) => i !== index));
    };

    const clearFilters = () => {
        setPendingFilters([]);
    };

    const applyFilters = () => {
        // Only apply filters that have value (except isNull/isNotNull)
        const validFilters = pendingFilters.filter(f =>
            f.operator === 'isNull' || f.operator === 'isNotNull' || (f.value && String(f.value).trim() !== '')
        );
        setAppliedFilters(validFilters);
        fetchRecords(1);
    };

    // Used by UI button, keeping for reference
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const resetFilters = () => {
        setPendingFilters([]);
        setAppliedFilters([]);
        fetchRecords(1);
    };

    const hasUnappliedChanges = JSON.stringify(pendingFilters) !== JSON.stringify(appliedFilters);

    const toggleSelectAll = () => {
        if (selectedIds.size === records.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(records.map((r) => r.id)));
        }
    };

    const toggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedIds(newSelected);
    };

    const startEdit = (record: RecordData, column: string) => {
        if (READONLY_COLUMNS.includes(column)) return;

        setEditingCell({ id: record.id, column });
        const value = record[column];

        if (isColumnDateTime(column) && value) {
            // Format for datetime-local input
            try {
                const date = new Date(value);
                setEditValue(date.toISOString().slice(0, 16));
            } catch {
                setEditValue('');
            }
        } else if (value === null || value === undefined) {
            setEditValue('__NULL__');
        } else if (typeof value === 'boolean') {
            setEditValue(value ? 'true' : 'false');
        } else {
            setEditValue(String(value));
        }
    };

    const cancelEdit = () => {
        setEditingCell(null);
        setEditValue('');
    };

    const saveEdit = (value?: CellValue) => {
        if (!editingCell) return;

        const { id, column } = editingCell;
        const record = records.find((r) => r.id === id);
        if (!record) return;

        // Get the original value from the pending change if exists, otherwise from record
        const existingChange = pendingChanges.get(id);
        const originalRecord = existingChange?.originalData || record;
        const originalValue = originalRecord[column];

        // Parse value based on column type
        let parsedValue: CellValue = value !== undefined ? value : editValue;

        if (parsedValue === '__NULL__') {
            parsedValue = null;
        } else if (isColumnBoolean(column)) {
            parsedValue = parsedValue === 'true' || parsedValue === true;
        } else if (isColumnNumber(column)) {
            parsedValue = parsedValue === '' ? null : Number(parsedValue);
        } else if (isColumnDateTime(column) && parsedValue) {
            parsedValue = new Date(parsedValue).toISOString();
        } else if (parsedValue === '') {
            parsedValue = isColumnNullable(column) ? null : '';
        }

        // Check if value actually changed from original
        const isUnchanged = parsedValue === originalValue ||
            (parsedValue === null && originalValue === null) ||
            (isColumnDateTime(column) && parsedValue && originalValue &&
                new Date(parsedValue).getTime() === new Date(originalValue).getTime());

        if (isUnchanged) {
            cancelEdit();
            return;
        }

        // Update local record to show new value
        const updatedRecords = records.map((r) => {
            if (r.id === id) {
                return { ...r, [column]: parsedValue };
            }
            return r;
        });
        setRecords(updatedRecords);

        // Track pending change with modified columns
        if (existingChange && existingChange.newData) {
            existingChange.newData = { ...existingChange.newData, [column]: parsedValue } as RecordData;
            existingChange.modifiedColumns = existingChange.modifiedColumns || new Set();
            existingChange.modifiedColumns.add(column);
            setPendingChanges(new Map(pendingChanges));
        } else {
            const newChange: PendingChange = {
                type: 'update',
                id,
                originalData: originalRecord,
                newData: { ...record, [column]: parsedValue },
                modifiedColumns: new Set([column]),
            };
            setPendingChanges(new Map(pendingChanges.set(id, newChange)));
        }

        cancelEdit();
    };

    const addNewRow = () => {
        const emptyRow: RecordData = { id: `new_${Date.now()}` };
        columns.forEach((col) => {
            if (!READONLY_COLUMNS.includes(col)) {
                emptyRow[col] = isColumnBoolean(col) ? false : '';
            }
        });
        setNewRows([...newRows, emptyRow]);
    };

    const updateNewRow = (tempId: string, column: string, value: CellValue) => {
        let parsedValue = value;

        if (value === '__NULL__') {
            parsedValue = null;
        } else if (isColumnBoolean(column)) {
            parsedValue = value === 'true' || value === true;
        } else if (isColumnNumber(column) && value !== '') {
            parsedValue = Number(value);
        }

        setNewRows(newRows.map((row) => {
            if (row.id === tempId) {
                return { ...row, [column]: parsedValue };
            }
            return row;
        }));
    };

    const removeNewRow = (tempId: string) => {
        setNewRows(newRows.filter((row) => row.id !== tempId));
    };

    const markForDelete = (ids: string[]) => {
        ids.forEach((id) => {
            const record = records.find((r) => r.id === id);
            if (record) {
                const change: PendingChange = {
                    type: 'delete',
                    id,
                    originalData: record,
                };
                setPendingChanges(new Map(pendingChanges.set(id, change)));
            }
        });
    };

    const handleDeleteSelected = () => {
        if (selectedIds.size === 0) return;
        markForDelete(Array.from(selectedIds));
        setSelectedIds(new Set());
    };

    const saveChanges = async () => {
        if (!hasPendingChanges) return;

        setIsSaving(true);
        try {
            const created = newRows.map((row) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id: _id, ...data } = row;
                return data;
            });

            const updated = Array.from(pendingChanges.values())
                .filter((c) => c.type === 'update')
                .map((c) => ({
                    id: c.id,
                    data: c.newData!,
                }));

            const deleted = Array.from(pendingChanges.values())
                .filter((c) => c.type === 'delete')
                .map((c) => c.id);

            const result = await adminApi.batchUpdate(tableName, { created, updated, deleted });

            const successCount = result.created.length + result.updated.length + result.deleted.length;
            const errorCount = result.errors?.length || 0;

            if (errorCount > 0) {
                toast.warning(`Hoàn thành với ${errorCount} lỗi`);
            } else {
                toast.success(`Đã lưu ${successCount} thay đổi`);
            }

            // Reset state and refresh
            setPendingChanges(new Map());
            setNewRows([]);
            setSelectedIds(new Set());
            fetchRecords(meta.page);
        } catch (err) {
            const error = err as { response?: { data?: { message?: string } }; message?: string };
            toast.error('Lỗi khi lưu: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsSaving(false);
        }
    };

    const discardChanges = () => {
        setPendingChanges(new Map());
        setNewRows([]);
        setSelectedIds(new Set());
        fetchRecords(meta.page);
    };

    const formatTableName = (name: string) => {
        return name
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, (str) => str.toUpperCase())
            .trim();
    };

    const formatValue = (value: CellValue, column: string): string => {
        if (value === null || value === undefined) return '—';
        if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
        if (isColumnDateTime(column) || (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T/))) {
            try {
                return format(new Date(value), 'dd/MM/yyyy HH:mm');
            } catch {
                return String(value);
            }
        }
        if (typeof value === 'object') return JSON.stringify(value).slice(0, 100) + '...';
        return String(value);
    };

    const isRowDeleted = (id: string) => {
        return pendingChanges.get(id)?.type === 'delete';
    };

    const isRowSelected = (id: string) => {
        return selectedIds.has(id);
    };

    const isCellModified = (id: string, column: string) => {
        const change = pendingChanges.get(id);
        return change?.type === 'update' && change.modifiedColumns?.has(column);
    };

    const getRowClassName = (record: RecordData) => {
        const classes: string[] = [];
        if (isRowDeleted(record.id)) {
            classes.push('row-deleted');
        } else if (isRowSelected(record.id)) {
            classes.push('row-selected-delete');
        }
        return classes.join(' ');
    };

    const getCellClassName = (record: RecordData, column: string) => {
        if (isCellModified(record.id, column)) return 'cell-modified';
        return '';
    };

    const openTextModal = (record: RecordData, column: string, isNewRow: boolean) => {
        const value = record[column];
        setTextModalValue(value === null || value === undefined ? '' : String(value));
        setTextModalCell({ id: record.id, column, isNewRow });
        setTextModalOpen(true);
    };

    const closeTextModal = () => {
        setTextModalOpen(false);
        setTextModalValue('');
        setTextModalCell(null);
    };

    const saveTextModal = () => {
        if (!textModalCell) return;

        const { id, column, isNewRow } = textModalCell;

        if (isNewRow) {
            updateNewRow(id, column, textModalValue || null);
        } else {
            // Find the record and save the change
            const record = records.find((r) => r.id === id);
            if (record) {
                // Get the original value from the pending change if exists, otherwise from record
                const existingChange = pendingChanges.get(id);
                const originalRecord = existingChange?.originalData || record;
                const originalValue = originalRecord[column];

                let parsedValue: CellValue = textModalValue;
                if (parsedValue === '') {
                    parsedValue = isColumnNullable(column) ? null : '';
                }

                // Check if value actually changed from original
                const isUnchanged = parsedValue === originalValue ||
                    (parsedValue === null && originalValue === null);

                if (!isUnchanged) {
                    // Update local record to show new value
                    const updatedRecords = records.map((r) => {
                        if (r.id === id) {
                            return { ...r, [column]: parsedValue };
                        }
                        return r;
                    });
                    setRecords(updatedRecords);

                    // Track pending change with modified columns
                    if (existingChange && existingChange.newData) {
                        existingChange.newData = { ...existingChange.newData, [column]: parsedValue } as RecordData;
                        existingChange.modifiedColumns = existingChange.modifiedColumns || new Set();
                        existingChange.modifiedColumns.add(column);
                        setPendingChanges(new Map(pendingChanges));
                    } else {
                        const newChange: PendingChange = {
                            type: 'update',
                            id,
                            originalData: originalRecord,
                            newData: { ...record, [column]: parsedValue },
                            modifiedColumns: new Set([column]),
                        };
                        setPendingChanges(new Map(pendingChanges.set(id, newChange)));
                    }
                }
            }
        }

        closeTextModal();
    };

    const openDateModal = (record: RecordData, column: string, isNewRow: boolean) => {
        const value = record[column];
        if (value) {
            try {
                const date = new Date(value);
                setDateModalValue(date.toISOString().slice(0, 16));
            } catch {
                setDateModalValue('');
            }
        } else {
            setDateModalValue('');
        }
        setDateModalCell({ id: record.id, column, isNewRow });
        setDateModalOpen(true);
    };

    const closeDateModal = () => {
        setDateModalOpen(false);
        setDateModalValue('');
        setDateModalCell(null);
    };

    const saveDateModal = (valueOverride?: string | null) => {
        if (!dateModalCell) return;

        const { id, column, isNewRow } = dateModalCell;
        const value = valueOverride !== undefined ? valueOverride : dateModalValue;

        let parsedValue: CellValue = value;
        if (value === '' || value === null) {
            parsedValue = isColumnNullable(column) ? null : '';
        } else {
            parsedValue = new Date(value).toISOString();
        }

        if (isNewRow) {
            updateNewRow(id, column, parsedValue);
        } else {
            // Find the record and save the change
            const record = records.find((r) => r.id === id);
            if (record) {
                const existingChange = pendingChanges.get(id);
                const originalRecord = existingChange?.originalData || record;
                const originalValue = originalRecord[column];

                // Check if value actually changed from original
                const isUnchanged = (parsedValue === null && originalValue === null) ||
                    (parsedValue && originalValue && new Date(parsedValue).getTime() === new Date(originalValue).getTime());

                if (!isUnchanged) {
                    // Update local record to show new value
                    const updatedRecords = records.map((r) => {
                        if (r.id === id) {
                            return { ...r, [column]: parsedValue };
                        }
                        return r;
                    });
                    setRecords(updatedRecords);

                    // Track pending change with modified columns
                    if (existingChange && existingChange.newData) {
                        existingChange.newData = { ...existingChange.newData, [column]: parsedValue } as RecordData;
                        existingChange.modifiedColumns = existingChange.modifiedColumns || new Set();
                        existingChange.modifiedColumns.add(column);
                        setPendingChanges(new Map(pendingChanges));
                    } else {
                        const newChange: PendingChange = {
                            type: 'update',
                            id,
                            originalData: originalRecord,
                            newData: { ...record, [column]: parsedValue },
                            modifiedColumns: new Set([column]),
                        };
                        setPendingChanges(new Map(pendingChanges.set(id, newChange)));
                    }
                }
            }
        }

        closeDateModal();
    };

    const renderEditInput = (record: RecordData, column: string, isNewRow = false) => {
        const currentValue = isNewRow ? record[column] : editValue;
        const isNull = currentValue === '__NULL__' || currentValue === null;
        const nullable = isColumnNullable(column);

        // For new rows, handle updates differently
        const handleChange = (value: string) => {
            if (isNewRow) {
                updateNewRow(record.id, column, value);
            } else {
                setEditValue(value);
            }
        };

        // Boolean column
        if (isColumnBoolean(column)) {
            return (
                <select
                    value={isNull ? '__NULL__' : String(currentValue === true || currentValue === 'true')}
                    onChange={(e) => {
                        const val = e.target.value;
                        if (isNewRow) {
                            updateNewRow(record.id, column, val === '__NULL__' ? null : val === 'true');
                        } else {
                            saveEdit(val === '__NULL__' ? null : val === 'true');
                        }
                    }}
                    className="w-full bg-[var(--background-tertiary)] border border-[var(--accent-primary)] rounded px-2 py-0.5 text-sm outline-none"
                    autoFocus={!isNewRow}
                >
                    {nullable && <option value="__NULL__">NULL</option>}
                    <option value="true">TRUE</option>
                    <option value="false">FALSE</option>
                </select>
            );
        }

        // DateTime column - for new rows, show button to open modal
        if (isColumnDateTime(column)) {
            if (isNewRow) {
                return (
                    <div className="flex items-center gap-1">
                        <span className="text-sm text-[var(--text-muted)] flex-1">
                            {currentValue ? format(new Date(currentValue), 'dd/MM/yyyy HH:mm') : '— Chọn ngày —'}
                        </span>
                        <button
                            onClick={() => openDateModal(record, column, true)}
                            className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] p-1 rounded hover:bg-[var(--background-tertiary)]"
                            title="Chọn ngày giờ"
                        >
                            <Calendar className="w-3 h-3" />
                        </button>
                    </div>
                );
            }
            // This case shouldn't happen anymore since datetime opens modal
            return (
                <div className="flex items-center gap-1">
                    <input
                        type="datetime-local"
                        value={isNull ? '' : (typeof currentValue === 'string' ? currentValue : '')}
                        onChange={(e) => handleChange(e.target.value || (nullable ? '__NULL__' : ''))}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') saveEdit();
                            if (e.key === 'Escape') cancelEdit();
                        }}
                        className="w-full bg-[var(--background-tertiary)] border border-[var(--accent-primary)] rounded px-2 py-0.5 text-sm outline-none"
                        autoFocus
                    />
                    {nullable && (
                        <button
                            onClick={() => saveEdit(null)}
                            className="text-xs text-[var(--text-muted)] hover:text-white px-1"
                            title="Set to NULL"
                        >
                            NULL
                        </button>
                    )}
                    <>
                        <button onClick={() => saveEdit()} className="text-green-500 hover:bg-green-500/20 p-1 rounded">
                            <Check className="w-3 h-3" />
                        </button>
                        <button onClick={cancelEdit} className="text-[var(--status-error)] hover:bg-red-500/20 p-1 rounded">
                            <X className="w-3 h-3" />
                        </button>
                    </>
                </div>
            );
        }

        // Number column
        if (isColumnNumber(column)) {
            return (
                <div className="flex items-center gap-1">
                    <input
                        type="number"
                        value={isNull ? '' : currentValue}
                        onChange={(e) => handleChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (!isNewRow) {
                                if (e.key === 'Enter') saveEdit();
                                if (e.key === 'Escape') cancelEdit();
                            }
                        }}
                        placeholder={nullable ? 'NULL' : ''}
                        className="w-full bg-[var(--background-tertiary)] border border-[var(--accent-primary)] rounded px-2 py-0.5 text-sm outline-none"
                        autoFocus={!isNewRow}
                    />
                    {nullable && !isNewRow && (
                        <button
                            onClick={() => saveEdit(null)}
                            className="text-xs text-[var(--text-muted)] hover:text-white px-1"
                            title="Set to NULL"
                        >
                            NULL
                        </button>
                    )}
                    {!isNewRow && (
                        <>
                            <button onClick={() => saveEdit()} className="text-green-500 hover:bg-green-500/20 p-1 rounded">
                                <Check className="w-3 h-3" />
                            </button>
                            <button onClick={cancelEdit} className="text-[var(--status-error)] hover:bg-red-500/20 p-1 rounded">
                                <X className="w-3 h-3" />
                            </button>
                        </>
                    )}
                </div>
            );
        }

        // Default text input - check if content is long
        const hasLongContent = !isNull && typeof currentValue === 'string' && (currentValue.length > 50 || currentValue.includes('\n'));

        // For new rows with potentially long content, show a button to open modal
        if (isNewRow) {
            return (
                <div className="flex items-center gap-1">
                    <input
                        type="text"
                        value={isNull ? '' : currentValue}
                        onChange={(e) => handleChange(e.target.value)}
                        placeholder={nullable ? 'NULL' : 'Enter value...'}
                        className="w-full bg-transparent border-b border-[var(--accent-primary)] rounded px-2 py-0.5 text-sm outline-none"
                    />
                    <button
                        onClick={() => openTextModal(record, column, true)}
                        className="text-[var(--text-muted)] hover:text-[var(--accent-primary)] p-1 rounded hover:bg-[var(--background-tertiary)]"
                        title="Mở trình chỉnh sửa lớn"
                    >
                        <Maximize2 className="w-3 h-3" />
                    </button>
                </div>
            );
        }

        // For inline editing (not new rows), keep the existing behavior - but this case shouldn't happen
        // because long content now opens modal directly
        return (
            <div className={`flex ${hasLongContent ? 'flex-col' : 'items-center'} gap-1`}>
                <input
                    type="text"
                    value={isNull ? '' : currentValue}
                    onChange={(e) => handleChange(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') saveEdit();
                        if (e.key === 'Escape') cancelEdit();
                    }}
                    placeholder={nullable ? 'NULL' : 'Enter value...'}
                    className="w-full bg-[var(--background-tertiary)] border border-[var(--accent-primary)] rounded px-2 py-0.5 text-sm outline-none"
                    autoFocus
                />
                <div className="flex items-center gap-1">
                    {nullable && (
                        <button
                            onClick={() => saveEdit(null)}
                            className="text-xs text-[var(--text-muted)] hover:text-white px-1 whitespace-nowrap"
                            title="Set to NULL"
                        >
                            Set NULL
                        </button>
                    )}
                    <>
                        <button
                            onClick={cancelEdit}
                            className="text-[var(--text-muted)] hover:text-white border border-[var(--border-primary)] hover:border-[var(--border-secondary)] px-2 py-0.5 rounded text-xs"
                        >
                            Cancel <span className="text-[var(--text-muted)]">Esc</span>
                        </button>
                        <button
                            onClick={() => saveEdit()}
                            className="text-white bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] px-2 py-0.5 rounded text-xs"
                        >
                            Save <span className="opacity-70">Enter</span>
                        </button>
                    </>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-fadeIn h-full flex flex-col min-w-0">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-white truncate">{formatTableName(tableName)}</h1>
                    <p className="text-xs sm:text-sm text-[var(--text-secondary)]">
                        {meta.total} {t('table.records')} · {t('table.pagination.page')} {meta.page} / {meta.totalPages}
                    </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    {hasPendingChanges && (
                        <>
                            <button
                                onClick={discardChanges}
                                className="btn btn-secondary text-xs sm:text-sm"
                                disabled={isSaving}
                            >
                                <Undo2 className="w-4 h-4" />
                                <span className="hidden sm:inline">{t('table.actions.discardChanges')}</span>
                            </button>
                            <button
                                onClick={saveChanges}
                                className="btn btn-success text-xs sm:text-sm"
                                disabled={isSaving}
                            >
                                {isSaving ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4" />
                                )}
                                <span className="hidden sm:inline">{t('table.actions.saveChanges')}</span>
                            </button>
                        </>
                    )}
                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleDeleteSelected}
                            className="btn bg-red-500 hover:bg-red-600 text-white text-xs sm:text-sm"
                        >
                            <Trash2 className="w-4 h-4" />
                            <span>{selectedIds.size}</span>
                        </button>
                    )}
                    <button
                        onClick={() => setShowFilterPanel(!showFilterPanel)}
                        className={`btn text-xs sm:text-sm ${appliedFilters.length > 0 ? 'btn-primary' : 'btn-secondary'}`}
                    >
                        <Filter className="w-4 h-4" />
                        <span className="hidden sm:inline">Filters</span>
                        {appliedFilters.length > 0 && <span>({appliedFilters.length})</span>}
                    </button>
                    <button
                        onClick={() => fetchRecords(meta.page)}
                        className="btn btn-secondary"
                        disabled={isLoading}
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={addNewRow} className="btn btn-primary text-xs sm:text-sm">
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">{t('table.actions.addRecord')}</span>
                    </button>
                </div>
            </div>

            {/* Filter Panel - Supabase Style */}
            {showFilterPanel && (
                <div className="mb-4 bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg animate-fadeIn overflow-hidden">
                    {/* Filter Rows */}
                    <div className="divide-y divide-[var(--border-primary)]">
                        {/* Existing Filters - Editable Rows */}
                        {pendingFilters.map((filter: FilterCondition, index: number) => (
                            <div key={index} className="flex flex-wrap items-center gap-2 px-3 py-2 hover:bg-[var(--background-tertiary)]">
                                {/* Remove Button */}
                                <button
                                    onClick={() => removeFilter(index)}
                                    className="text-[var(--text-muted)] hover:text-[var(--status-error)] p-1"
                                >
                                    <X className="w-4 h-4" />
                                </button>

                                {/* Where/And Label */}
                                <span className="text-xs sm:text-sm text-[var(--text-muted)] w-10 sm:w-12">
                                    {index === 0 ? 'where' : 'and'}
                                </span>

                                {/* Column Select */}
                                <select
                                    value={filter.column}
                                    onChange={(e) => updateFilter(index, 'column', e.target.value)}
                                    className="bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-xs sm:text-sm text-white flex-1 min-w-[80px] max-w-[120px]"
                                >
                                    {columns.map((col) => (
                                        <option key={col} value={col}>{col}</option>
                                    ))}
                                </select>

                                {/* Operator Select */}
                                <select
                                    value={filter.operator}
                                    onChange={(e) => updateFilter(index, 'operator', e.target.value)}
                                    className="bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-xs sm:text-sm text-white min-w-[80px]"
                                >
                                    {OPERATORS.map((op) => (
                                        <option key={op.value} value={op.value}>{op.label}</option>
                                    ))}
                                </select>
                                {/* Value Input */}
                                {filter.operator !== 'isNull' && filter.operator !== 'isNotNull' && (
                                    <input
                                        type="text"
                                        value={filter.value !== null && filter.value !== undefined ? String(filter.value) : ''}
                                        onChange={(e) => updateFilter(index, 'value', e.target.value)}
                                        placeholder={t('table.filter.enterValue')}
                                        className="bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded px-2 py-1.5 text-xs sm:text-sm text-white flex-1 min-w-[80px]"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') applyFilters();
                                        }}
                                    />
                                )}
                            </div>
                        ))}

                        {/* Add New Filter Row */}
                        <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-[var(--background-tertiary)]/50">
                            <button
                                onClick={addFilter}
                                className="flex items-center gap-1 text-xs sm:text-sm text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] px-2 py-1"
                            >
                                <Plus className="w-4 h-4" />
                                <span>{t('table.filter.addFilter')}</span>
                            </button>

                            {pendingFilters.length > 0 && (
                                <>
                                    <div className="flex-1" />
                                    <button
                                        onClick={clearFilters}
                                        className="text-xs sm:text-sm text-[var(--text-muted)] hover:text-white px-2 py-1"
                                    >
                                        {t('table.filter.clearFilters')}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Apply Bar */}
                    {hasUnappliedChanges && (
                        <div className="flex items-center justify-between px-3 py-2 bg-yellow-500/10 border-t border-yellow-500/30">
                            <span className="text-xs text-yellow-400">
                                {pendingFilters.length} {t('table.filter.notApplied')}
                            </span>
                            <button
                                onClick={applyFilters}
                                className="btn btn-primary py-1 px-3 text-sm"
                            >
                                <Check className="w-3 h-3" />
                                <span>{t('table.filter.apply')}</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto table-container -mx-4 sm:mx-0 px-4 sm:px-0">
                <table className="data-table w-full min-w-[600px]">
                    <thead className="sticky top-0 z-10">
                        <tr>
                            <th className="w-10">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.size === records.length && records.length > 0}
                                    onChange={toggleSelectAll}
                                    className="custom-checkbox"
                                />
                            </th>
                            {columns.map((col) => (
                                <th key={col}>
                                    <span className="text-xs">{col}</span>
                                    {isColumnBoolean(col) && <span className="text-[var(--text-muted)] ml-1 text-xs">(bool)</span>}
                                    {isColumnDateTime(col) && <span className="text-[var(--text-muted)] ml-1 text-xs">(datetime)</span>}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {isLoading ? (
                            <tr>
                                <td colSpan={columns.length + 1} className="text-center py-8">
                                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[var(--accent-primary)]" />
                                </td>
                            </tr>
                        ) : (
                            <>
                                {/* New Rows */}
                                {newRows.map((row) => (
                                    <tr key={row.id} className="row-new">
                                        <td>
                                            <button
                                                onClick={() => removeNewRow(row.id)}
                                                className="text-[var(--status-error)] hover:bg-red-500/20 p-1 rounded"
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </td>
                                        {columns.map((col) => (
                                            <td key={col}>
                                                {READONLY_COLUMNS.includes(col) ? (
                                                    <span className="text-[var(--text-muted)]">—</span>
                                                ) : (
                                                    renderEditInput(row, col, true)
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}

                                {/* Existing Records */}
                                {records.map((record) => (
                                    <tr key={record.id} className={getRowClassName(record)}>
                                        <td className="text-center">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(record.id)}
                                                onChange={() => toggleSelect(record.id)}
                                                className="custom-checkbox"
                                                disabled={isRowDeleted(record.id)}
                                            />
                                        </td>
                                        {columns.map((col) => (
                                            <td
                                                key={col}
                                                onClick={() => {
                                                    if (isRowDeleted(record.id) || READONLY_COLUMNS.includes(col)) return;

                                                    // DateTime columns - open date modal
                                                    if (isColumnDateTime(col)) {
                                                        openDateModal(record, col, false);
                                                        return;
                                                    }

                                                    // Boolean and Number - inline edit
                                                    if (isColumnBoolean(col) || isColumnNumber(col)) {
                                                        startEdit(record, col);
                                                        return;
                                                    }

                                                    // Text columns - always open text modal
                                                    openTextModal(record, col, false);
                                                }}
                                                className={`${!READONLY_COLUMNS.includes(col) ? 'cursor-pointer' : ''} ${getCellClassName(record, col)}`}
                                            >
                                                {editingCell?.id === record.id && editingCell?.column === col ? (
                                                    renderEditInput(record, col, false)
                                                ) : (
                                                    <span className={col === 'id' ? 'font-mono text-xs' : ''}>
                                                        {formatValue(record[col], col)}
                                                    </span>
                                                )}
                                            </td>
                                        ))}
                                    </tr>
                                ))}

                                {records.length === 0 && newRows.length === 0 && (
                                    <tr>
                                        <td colSpan={columns.length + 1} className="text-center py-8 text-[var(--text-muted)]">
                                            Không có dữ liệu
                                        </td>
                                    </tr>
                                )}
                            </>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-[var(--border-primary)]">
                {/* Page Size Selector */}
                <div className="flex items-center gap-2">
                    <span className="text-xs text-[var(--text-muted)]">Rows:</span>
                    <select
                        value={meta.limit}
                        onChange={(e) => handlePageSizeChange(parseInt(e.target.value, 10))}
                        className="bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded px-2 py-1 text-xs text-white cursor-pointer focus:outline-none focus:border-[var(--accent-primary)]"
                    >
                        {PAGE_SIZE_OPTIONS.map((size) => (
                            <option key={size} value={size}>{size}</option>
                        ))}
                    </select>
                </div>

                {/* Record Info */}
                <p className="text-xs text-[var(--text-secondary)]">
                    {meta.total > 0 ? (
                        <>
                            {(meta.page - 1) * meta.limit + 1} - {Math.min(meta.page * meta.limit, meta.total)} / {meta.total}
                        </>
                    ) : (
                        '0 records'
                    )}
                </p>

                {/* Page Navigation */}
                {meta.totalPages > 1 && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => fetchRecords(meta.page - 1)}
                            disabled={meta.page <= 1 || isLoading}
                            className="btn btn-secondary disabled:opacity-50 px-2 py-1"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <span className="px-2 text-xs text-white">
                            {meta.page} / {meta.totalPages}
                        </span>

                        <button
                            onClick={() => fetchRecords(meta.page + 1)}
                            disabled={meta.page >= meta.totalPages || isLoading}
                            className="btn btn-secondary disabled:opacity-50 px-2 py-1"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>

            {/* Text Edit Modal for Long Content */}
            {textModalOpen && textModalCell && (
                <div
                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fadeIn"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeTextModal();
                    }}
                >
                    <div className="bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg shadow-2xl w-full max-w-2xl mx-4 animate-slideIn">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)]">
                            <h3 className="text-white font-medium">
                                Chỉnh sửa: <span className="text-[var(--accent-primary)]">{textModalCell.column}</span>
                            </h3>
                            <button
                                onClick={closeTextModal}
                                className="text-[var(--text-muted)] hover:text-white p-1 rounded hover:bg-[var(--background-tertiary)]"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4">
                            <textarea
                                value={textModalValue}
                                onChange={(e) => setTextModalValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') closeTextModal();
                                    if (e.key === 'Enter' && e.ctrlKey) saveTextModal();
                                }}
                                placeholder={isColumnNullable(textModalCell.column) ? 'NULL (để trống)' : 'Nhập giá trị...'}
                                className="w-full h-48 bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-[var(--accent-primary)] resize-y font-mono"
                                autoFocus
                            />

                            <p className="text-xs text-[var(--text-muted)] mt-2">
                                Nhấn <kbd className="px-1 py-0.5 rounded bg-[var(--background-tertiary)] text-[var(--text-secondary)]">Ctrl+Enter</kbd> để lưu, <kbd className="px-1 py-0.5 rounded bg-[var(--background-tertiary)] text-[var(--text-secondary)]">Esc</kbd> để hủy
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border-primary)]">
                            {isColumnNullable(textModalCell.column) && (
                                <button
                                    onClick={() => {
                                        setTextModalValue('');
                                        saveTextModal();
                                    }}
                                    className="btn btn-secondary text-sm py-1.5"
                                >
                                    Set NULL
                                </button>
                            )}
                            <button
                                onClick={closeTextModal}
                                className="btn btn-secondary text-sm py-1.5"
                            >
                                Cancel <span className="text-[var(--text-muted)] ml-1">Esc</span>
                            </button>
                            <button
                                onClick={saveTextModal}
                                className="btn btn-primary text-sm py-1.5"
                            >
                                Save <span className="opacity-70 ml-1">Ctrl+Enter</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* DateTime Edit Modal */}
            {dateModalOpen && dateModalCell && (
                <div
                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fadeIn"
                    onClick={(e) => {
                        if (e.target === e.currentTarget) closeDateModal();
                    }}
                >
                    <div className="bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg shadow-2xl w-full max-w-md mx-4 animate-slideIn">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-primary)]">
                            <h3 className="text-white font-medium">
                                Chỉnh sửa: <span className="text-[var(--accent-primary)]">{dateModalCell.column}</span>
                            </h3>
                            <button
                                onClick={closeDateModal}
                                className="text-[var(--text-muted)] hover:text-white p-1 rounded hover:bg-[var(--background-tertiary)]"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="p-4">
                            <input
                                type="datetime-local"
                                value={dateModalValue}
                                onChange={(e) => setDateModalValue(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') closeDateModal();
                                    if (e.key === 'Enter') saveDateModal();
                                }}
                                className="w-full bg-[var(--background-tertiary)] border border-[var(--border-primary)] rounded-lg px-3 py-3 text-white text-base outline-none focus:border-[var(--accent-primary)]"
                                autoFocus
                            />

                            <p className="text-xs text-[var(--text-muted)] mt-2">
                                Nhấn <kbd className="px-1 py-0.5 rounded bg-[var(--background-tertiary)] text-[var(--text-secondary)]">Enter</kbd> để lưu, <kbd className="px-1 py-0.5 rounded bg-[var(--background-tertiary)] text-[var(--text-secondary)]">Esc</kbd> để hủy
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[var(--border-primary)]">
                            {isColumnNullable(dateModalCell.column) && (
                                <button
                                    onClick={() => saveDateModal(null)}
                                    className="btn btn-secondary text-sm py-1.5"
                                >
                                    Set NULL
                                </button>
                            )}
                            <button
                                onClick={closeDateModal}
                                className="btn btn-secondary text-sm py-1.5"
                            >
                                Cancel <span className="text-[var(--text-muted)] ml-1">Esc</span>
                            </button>
                            <button
                                onClick={() => saveDateModal()}
                                className="btn btn-primary text-sm py-1.5"
                            >
                                Save <span className="opacity-70 ml-1">Enter</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

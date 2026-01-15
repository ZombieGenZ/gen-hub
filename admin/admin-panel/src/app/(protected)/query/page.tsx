'use client';

import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import {
    Play,
    Trash2,
    ChevronDown,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Copy,
    Clock,
    Table2,
    Download,
    ChevronLeft,
    ChevronRight,
    Columns,
} from 'lucide-react';
import { adminApi } from '@/lib/api';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTables } from '@/contexts/TablesContext';

// SQL Keywords for autocomplete
const SQL_KEYWORDS = [
    'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN',
    'ORDER BY', 'GROUP BY', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'ON', 'JOIN',
    'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'FULL JOIN',
    'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM',
    'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'TRUNCATE TABLE',
    'ADD COLUMN', 'DROP COLUMN', 'MODIFY COLUMN', 'RENAME COLUMN',
    'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES', 'UNIQUE', 'NOT NULL', 'DEFAULT',
    'INDEX', 'CREATE INDEX', 'DROP INDEX',
    'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'DISTINCT',
    'ASC', 'DESC', 'NULL', 'IS NULL', 'IS NOT NULL',
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
    'CAST', 'CONVERT', 'COALESCE', 'IFNULL', 'NULLIF',
    'VARCHAR', 'INT', 'INTEGER', 'BIGINT', 'BOOLEAN', 'TEXT', 'DATE', 'DATETIME', 'TIMESTAMP',
    'TRUE', 'FALSE',
];

// SQL Templates
const SQL_TEMPLATES = {
    select: `SELECT * FROM table_name
WHERE condition
ORDER BY column_name ASC
LIMIT 10;`,
    insert: `INSERT INTO table_name (column1, column2, column3)
VALUES ('value1', 'value2', 'value3');`,
    update: `UPDATE table_name
SET column1 = 'new_value1', column2 = 'new_value2'
WHERE condition;`,
    delete: `DELETE FROM table_name
WHERE condition;`,
    createTable: `CREATE TABLE table_name (
    id VARCHAR(36) PRIMARY KEY,
    column1 VARCHAR(255) NOT NULL,
    column2 INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`,
    alterTable: `ALTER TABLE table_name
ADD COLUMN new_column VARCHAR(255);

-- Or modify existing column:
-- ALTER TABLE table_name MODIFY COLUMN column_name VARCHAR(500);

-- Or drop column:
-- ALTER TABLE table_name DROP COLUMN column_name;`,
};

interface QueryResult {
    success: boolean;
    data?: Record<string, unknown>[];
    columns?: string[];
    rowsAffected?: number;
    executionTime?: number;
    error?: string;
}

interface CursorCoords {
    top: number;
    left: number;
}

interface SuggestionItem {
    text: string;
    type: 'keyword' | 'table' | 'field';
    tableName?: string; // For fields, which table they belong to
}

interface TableSchema {
    tableName: string;
    fields: { name: string; type: string }[];
}

// Global cache for table schemas to prevent re-fetching
const schemaCache: {
    schemas: TableSchema[];
    loaded: boolean;
    loading: boolean;
    loadingTables: Set<string>;
} = {
    schemas: [],
    loaded: false,
    loading: false,
    loadingTables: new Set()
};

// Helper to get cursor coordinates in textarea
function getCaretCoordinates(element: HTMLTextAreaElement, position: number): CursorCoords {
    const style = getComputedStyle(element);
    const text = element.value.substring(0, position);
    const lines = text.split('\n');
    const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2;
    const currentLine = lines.length - 1;
    const charWidth = parseFloat(style.fontSize) * 0.6;

    return {
        top: (currentLine * lineHeight) + parseFloat(style.paddingTop) - element.scrollTop,
        left: (lines[currentLine]?.length || 0) * charWidth + parseFloat(style.paddingLeft)
    };
}

export default function QueryPage() {
    const { t } = useLanguage();
    const { tables } = useTables();
    const [query, setQuery] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [result, setResult] = useState<QueryResult | null>(null);
    const [showTemplates, setShowTemplates] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const tableContainerRef = useRef<HTMLDivElement>(null);

    // Alt + scroll to scroll horizontally in the table
    useEffect(() => {
        const container = tableContainerRef.current;
        if (!container) return;

        const handleWheel = (e: WheelEvent) => {
            // Check if Alt key is pressed
            if (e.altKey && e.deltaY !== 0) {
                e.preventDefault();
                container.scrollLeft += e.deltaY;
            }
        };

        container.addEventListener('wheel', handleWheel, { passive: false });
        // Clean up
        return () => {
            if (container) {
                container.removeEventListener('wheel', handleWheel);
            }
        };
    }, [result]); // Re-attach listener when result changes (table re-renders)

    // Autocomplete state
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
    const [selectedSuggestion, setSelectedSuggestion] = useState(0);
    const [cursorCoords, setCursorCoords] = useState<CursorCoords>({ top: 0, left: 0 });

    // Store table schemas for field autocomplete (lazy loaded)
    const [tableSchemas, setTableSchemas] = useState<TableSchema[]>(schemaCache.schemas);

    // Pagination for results
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 50;

    // Get table names for autocomplete
    const tableNames = useMemo(() => tables.map(t => t.name), [tables]);

    // Detect table name from query (FROM table_name, etc.)
    const getTableFromQuery = useCallback((text: string): string | null => {
        const patterns = [
            /FROM\s+(\w+)/i,
            /UPDATE\s+(\w+)/i,
            /INSERT\s+INTO\s+(\w+)/i,
            /DELETE\s+FROM\s+(\w+)/i,
            /JOIN\s+(\w+)/i,
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                const tableName = match[1];
                // Check if it's a valid table
                if (tableNames.some(t => t.toLowerCase() === tableName.toLowerCase())) {
                    return tableName.toLowerCase();
                }
            }
        }
        return null;
    }, [tableNames]);

    // Lazy load schema for a specific table
    const loadTableSchema = useCallback(async (tableName: string) => {
        // Check if already in cache
        const existing = schemaCache.schemas.find(s => s.tableName.toLowerCase() === tableName.toLowerCase());
        if (existing) {
            return existing;
        }

        // Check if already loading
        if (schemaCache.loadingTables.has(tableName.toLowerCase())) {
            return null;
        }

        // Mark as loading
        schemaCache.loadingTables.add(tableName.toLowerCase());

        try {
            const schema = await adminApi.getTableSchema(tableName);
            const tableSchema: TableSchema = {
                tableName: tableName,
                fields: schema.fields
                    .filter((f: { isRelation?: boolean }) => !f.isRelation)
                    .map((f: { name: string; type: string }) => ({ name: f.name, type: f.type }))
            };

            // Add to cache
            schemaCache.schemas = [...schemaCache.schemas, tableSchema];
            setTableSchemas(prev => {
                if (prev.some(s => s.tableName === tableName)) return prev;
                return [...prev, tableSchema];
            });

            return tableSchema;
        } catch (error) {
            console.error(`Failed to fetch schema for ${tableName}:`, error);
            return null;
        } finally {
            schemaCache.loadingTables.delete(tableName.toLowerCase());
        }
    }, []);

    // Build all suggestions including keywords and tables (fields added dynamically)
    const allSuggestions = useMemo((): SuggestionItem[] => {
        const items: SuggestionItem[] = [];

        // Add SQL keywords
        SQL_KEYWORDS.forEach(keyword => {
            items.push({ text: keyword, type: 'keyword' });
        });

        // Add table names
        tableNames.forEach(table => {
            items.push({ text: table, type: 'table' });
        });

        return items;
    }, [tableNames]);

    // Get current word being typed
    const getCurrentWord = useCallback((text: string, position: number) => {
        const beforeCursor = text.slice(0, position);
        const match = beforeCursor.match(/[\w_.]+$/);
        return match ? match[0] : '';
    }, []);

    // Update cursor coordinates
    const updateCursorCoords = useCallback(() => {
        if (!textareaRef.current) return;
        const textarea = textareaRef.current;
        const position = textarea.selectionStart;
        const coords = getCaretCoordinates(textarea, position);
        setCursorCoords(coords);
    }, []);

    // Filter suggestions based on current word - context-aware
    const updateSuggestions = useCallback(async (text: string, position: number) => {
        const currentWord = getCurrentWord(text, position);

        if (currentWord.length < 1) {
            setShowSuggestions(false);
            setSuggestions([]);
            return;
        }

        // Detect current table from query
        const currentTable = getTableFromQuery(text);

        // Detect if we're typing after FROM/JOIN (should prioritize table names)
        const textBeforeCursor = text.slice(0, position - currentWord.length).trim().toUpperCase();
        const isAfterTableKeyword = /\b(FROM|JOIN|INTO|UPDATE)\s*$/i.test(textBeforeCursor);

        // Lazy load schema for current table if needed
        if (currentTable) {
            const existingSchema = tableSchemas.find(s =>
                s.tableName.toLowerCase() === currentTable.toLowerCase()
            );
            if (!existingSchema) {
                // Load schema in background (don't await, just trigger load)
                loadTableSchema(currentTable);
            }
        }

        // Check if we're typing table.field format
        const dotIndex = currentWord.lastIndexOf('.');
        let filtered: SuggestionItem[] = [];

        if (dotIndex > 0) {
            // User is typing table.field, filter to that table's fields
            const tablePart = currentWord.substring(0, dotIndex).toLowerCase();
            const fieldPart = currentWord.substring(dotIndex + 1).toLowerCase();

            // Lazy load schema for this table if needed
            const matchingTable = tableSchemas.find(s =>
                s.tableName.toLowerCase() === tablePart
            );

            if (!matchingTable) {
                // Try to load it
                loadTableSchema(tablePart);
            }

            if (matchingTable) {
                filtered = matchingTable.fields
                    .filter(f => f.name.toLowerCase().startsWith(fieldPart))
                    .map(f => ({
                        text: `${matchingTable.tableName}.${f.name}`,
                        type: 'field' as const,
                        tableName: matchingTable.tableName
                    }));
            }
        } else {
            const lowerWord = currentWord.toLowerCase();

            // If we have a current table, prioritize its fields
            if (currentTable) {
                const currentTableSchema = tableSchemas.find(s =>
                    s.tableName.toLowerCase() === currentTable
                );

                if (currentTableSchema) {
                    // Add matching fields from current table first
                    const tableFields = currentTableSchema.fields
                        .filter(f => f.name.toLowerCase().startsWith(lowerWord))
                        .map(f => ({
                            text: f.name,
                            type: 'field' as const,
                            tableName: currentTableSchema.tableName
                        }));
                    filtered.push(...tableFields);
                }
            }

            // Add SQL keywords and table names
            const otherSuggestions = allSuggestions.filter(s => {
                // Skip fields (we already added from current table)
                if (s.type === 'field') return false;
                return s.text.toLowerCase().startsWith(lowerWord) &&
                    s.text.toLowerCase() !== lowerWord;
            });
            filtered.push(...otherSuggestions);

            // Deduplicate
            const seen = new Set<string>();
            filtered = filtered.filter(item => {
                const key = `${item.type}:${item.text}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
        }

        // Sort based on context
        filtered.sort((a, b) => {
            // If after FROM/JOIN/INTO/UPDATE, prioritize tables first
            if (isAfterTableKeyword) {
                if (a.type === 'table' && b.type !== 'table') return -1;
                if (a.type !== 'table' && b.type === 'table') return 1;
            }

            // Current table fields first
            if (currentTable) {
                const aIsCurrent = a.type === 'field' && a.tableName?.toLowerCase() === currentTable;
                const bIsCurrent = b.type === 'field' && b.tableName?.toLowerCase() === currentTable;
                if (aIsCurrent && !bIsCurrent) return -1;
                if (!aIsCurrent && bIsCurrent) return 1;
            }

            // Default order: fields, keywords, tables (when not after FROM)
            const order = { field: 0, keyword: 1, table: 2 };
            return order[a.type] - order[b.type];
        });

        // Limit to 10 suggestions
        filtered = filtered.slice(0, 10);

        if (filtered.length > 0) {
            setSuggestions(filtered);
            setShowSuggestions(true);
            setSelectedSuggestion(0);
            updateCursorCoords();
        } else {
            setShowSuggestions(false);
            setSuggestions([]);
        }
    }, [allSuggestions, getCurrentWord, updateCursorCoords, tableSchemas, getTableFromQuery, loadTableSchema]);

    // Insert suggestion at cursor position
    const insertSuggestion = useCallback((suggestion: SuggestionItem) => {
        if (!textareaRef.current) return;

        const textarea = textareaRef.current;
        const text = textarea.value;
        const position = textarea.selectionStart;
        const currentWord = getCurrentWord(text, position);

        const beforeWord = text.slice(0, position - currentWord.length);
        const afterCursor = text.slice(position);

        const insertText = suggestion.text;
        const newText = beforeWord + insertText + ' ' + afterCursor;
        setQuery(newText);

        // Set cursor position after inserted word
        const newPosition = beforeWord.length + insertText.length + 1;
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(newPosition, newPosition);
        }, 0);

        setShowSuggestions(false);
        setSuggestions([]);
    }, [getCurrentWord]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        const newPosition = e.target.selectionStart;
        setQuery(newValue);
        updateSuggestions(newValue, newPosition);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        // Handle autocomplete navigation
        if (showSuggestions && suggestions.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedSuggestion(prev => (prev + 1) % suggestions.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedSuggestion(prev => (prev - 1 + suggestions.length) % suggestions.length);
                return;
            }
            if (e.key === 'Tab' || e.key === 'Enter') {
                if (showSuggestions) {
                    e.preventDefault();
                    insertSuggestion(suggestions[selectedSuggestion]);
                    return;
                }
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setShowSuggestions(false);
                return;
            }
        }

        // Ctrl/Cmd + Enter to execute
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            executeQuery();
        }

        // Tab for indentation (when no suggestions)
        if (e.key === 'Tab' && !showSuggestions) {
            e.preventDefault();
            const textarea = e.currentTarget;
            const start = textarea.selectionStart;
            const end = textarea.selectionEnd;
            const newValue = query.slice(0, start) + '    ' + query.slice(end);
            setQuery(newValue);
            setTimeout(() => {
                textarea.selectionStart = textarea.selectionEnd = start + 4;
            }, 0);
        }
    };

    const executeQuery = useCallback(async () => {
        if (!query.trim() || isExecuting) return;

        setIsExecuting(true);
        setResult(null);
        setCurrentPage(1);
        setShowSuggestions(false);

        const startTime = performance.now();

        try {
            const response = await adminApi.executeRawQuery(query);
            const executionTime = Math.round(performance.now() - startTime);

            if (response.success) {
                setResult({
                    success: true,
                    data: response.data || [],
                    columns: response.columns || (response.data?.[0] ? Object.keys(response.data[0]) : []),
                    rowsAffected: response.rowsAffected,
                    executionTime: response.executionTime || executionTime,
                });
            } else {
                setResult({
                    success: false,
                    error: response.error,
                    executionTime: response.executionTime || executionTime,
                });
            }
        } catch (error: unknown) {
            const executionTime = Math.round(performance.now() - startTime);
            const errorMessage = error instanceof Error
                ? error.message
                : (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Unknown error occurred';

            setResult({
                success: false,
                error: errorMessage,
                executionTime,
            });
        } finally {
            setIsExecuting(false);
        }
    }, [query, isExecuting]);

    const handleTemplateSelect = (templateKey: keyof typeof SQL_TEMPLATES) => {
        setQuery(SQL_TEMPLATES[templateKey]);
        setShowTemplates(false);
        textareaRef.current?.focus();
    };

    const clearQuery = () => {
        setQuery('');
        setResult(null);
        setShowSuggestions(false);
        textareaRef.current?.focus();
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    const exportToCSV = () => {
        if (!result?.data || !result.columns) return;

        const headers = result.columns.join(',');
        const rows = result.data.map(row =>
            result.columns!.map(col => {
                const value = row[col];
                if (value === null) return '';
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return String(value);
            }).join(',')
        );

        const csv = [headers, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `query_result_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Pagination calculations
    const totalRows = result?.data?.length || 0;
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const paginatedData = useMemo(() => {
        if (!result?.data) return [];
        const start = (currentPage - 1) * rowsPerPage;
        return result.data.slice(start, start + rowsPerPage);
    }, [result?.data, currentPage]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) {
                setShowSuggestions(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    // Close suggestions on scroll
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const handleScroll = () => setShowSuggestions(false);
        textarea.addEventListener('scroll', handleScroll);
        return () => textarea.removeEventListener('scroll', handleScroll);
    }, []);

    // Render suggestion icon based on type
    const renderSuggestionIcon = (item: SuggestionItem) => {
        switch (item.type) {
            case 'table':
                return <Table2 className="w-4 h-4 text-[#4ec9b0] flex-shrink-0" />;
            case 'field':
                return <Columns className="w-4 h-4 text-[#dcdcaa] flex-shrink-0" />;
            default:
                return (
                    <span className="w-4 h-4 flex items-center justify-center text-[9px] font-bold text-[#569cd6] flex-shrink-0 bg-[#569cd6]/20 rounded">
                        SQL
                    </span>
                );
        }
    };

    // Render suggestion text with appropriate color
    const renderSuggestionText = (item: SuggestionItem) => {
        switch (item.type) {
            case 'table':
                return <span className="text-[#4ec9b0]">{item.text}</span>;
            case 'field':
                if (item.text.includes('.')) {
                    const [table, field] = item.text.split('.');
                    return (
                        <span>
                            <span className="text-[#4ec9b0]">{table}</span>
                            <span className="text-[#808080]">.</span>
                            <span className="text-[#dcdcaa]">{field}</span>
                        </span>
                    );
                }
                return (
                    <span>
                        <span className="text-[#dcdcaa]">{item.text}</span>
                        {item.tableName && (
                            <span className="text-[#6e6e8a] ml-2 text-xs">({item.tableName})</span>
                        )}
                    </span>
                );
            default:
                return <span className="text-[#569cd6]">{item.text}</span>;
        }
    };

    return (
        <div className="animate-fadeIn h-full flex flex-col">
            {/* Header */}
            <div className="mb-4 flex-shrink-0">
                <h1 className="text-3xl font-bold text-white mb-2">{t('query.title')}</h1>
                <p className="text-[var(--text-secondary)]">
                    {t('query.subtitle')}
                </p>
            </div>

            {/* Query Editor Section */}
            <div className="card mb-4 flex-shrink-0">
                {/* Toolbar */}
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                        {/* Templates Dropdown */}
                        <div className="relative">
                            <button
                                onClick={() => setShowTemplates(!showTemplates)}
                                className="btn btn-secondary"
                            >
                                <span>{t('query.templates')}</span>
                                <ChevronDown className={`w-4 h-4 transition-transform ${showTemplates ? 'rotate-180' : ''}`} />
                            </button>

                            {showTemplates && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => setShowTemplates(false)}
                                    />
                                    <div className="absolute top-full left-0 mt-2 w-48 bg-[var(--background-secondary)] border border-[var(--border-primary)] rounded-lg shadow-xl z-20 overflow-hidden">
                                        <button onClick={() => handleTemplateSelect('select')} className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white transition-colors">
                                            {t('query.select')}
                                        </button>
                                        <button onClick={() => handleTemplateSelect('insert')} className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white transition-colors">
                                            {t('query.insert')}
                                        </button>
                                        <button onClick={() => handleTemplateSelect('update')} className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white transition-colors">
                                            {t('query.update')}
                                        </button>
                                        <button onClick={() => handleTemplateSelect('delete')} className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white transition-colors">
                                            {t('query.delete')}
                                        </button>
                                        <div className="border-t border-[var(--border-primary)]" />
                                        <button onClick={() => handleTemplateSelect('createTable')} className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white transition-colors">
                                            {t('query.createTable')}
                                        </button>
                                        <button onClick={() => handleTemplateSelect('alterTable')} className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-secondary)] hover:bg-[var(--background-tertiary)] hover:text-white transition-colors">
                                            {t('query.alterTable')}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>

                        <button
                            onClick={clearQuery}
                            className="btn btn-secondary"
                            disabled={!query}
                        >
                            <Trash2 className="w-4 h-4" />
                            <span className="hidden sm:inline">{t('query.clear')}</span>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-[var(--text-muted)] hidden sm:inline">
                            Ctrl + Enter
                        </span>
                        <button
                            onClick={executeQuery}
                            disabled={!query.trim() || isExecuting}
                            className="btn btn-primary"
                        >
                            {isExecuting ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Executing...</span>
                                </>
                            ) : (
                                <>
                                    <Play className="w-4 h-4" />
                                    <span>{t('query.execute')}</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Query Input with VS Code-style Autocomplete */}
                <div ref={containerRef} className="relative">
                    <textarea
                        ref={textareaRef}
                        value={query}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        placeholder={t('query.placeholder')}
                        className="w-full h-48 p-4 bg-[#1a1a2e] border border-[var(--border-primary)] rounded-lg text-white font-mono text-sm resize-y focus:outline-none focus:border-[var(--accent-primary)] transition-colors placeholder-[var(--text-muted)]"
                        style={{ lineHeight: '24px' }}
                        spellCheck={false}
                        autoComplete="off"
                    />

                    {/* VS Code-style autocomplete dropdown at cursor position */}
                    {showSuggestions && suggestions.length > 0 && (
                        <div
                            className="absolute z-50 w-72 bg-[#252536] border border-[#3c3c54] rounded shadow-2xl overflow-hidden"
                            style={{
                                top: `${cursorCoords.top + 28}px`,
                                left: `${Math.min(cursorCoords.left, 280)}px`,
                            }}
                        >
                            {suggestions.map((suggestion, index) => (
                                <button
                                    key={`${suggestion.type}-${suggestion.text}`}
                                    onClick={() => insertSuggestion(suggestion)}
                                    className={`w-full px-3 py-1.5 text-left text-sm font-mono flex items-center gap-2 transition-colors ${index === selectedSuggestion
                                        ? 'bg-[#04395e] text-white'
                                        : 'text-[#cccccc] hover:bg-[#2a2d3e]'
                                        }`}
                                >
                                    {renderSuggestionIcon(suggestion)}
                                    {renderSuggestionText(suggestion)}
                                </button>
                            ))}
                            <div className="px-3 py-1 text-[10px] text-[#6e6e8a] border-t border-[#3c3c54] bg-[#1e1e2e] flex items-center justify-between">
                                <span>↑↓ navigate • Tab insert • Esc close</span>
                                <span>{tableSchemas.length > 0 ? `${tableSchemas.length} tables cached` : ''}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Results Section - pgAdmin style */}
            {result && (
                <div className="card flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Results Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-[var(--border-primary)] flex-shrink-0">
                        <div className="flex items-center gap-3">
                            {result.success ? (
                                <CheckCircle2 className="w-5 h-5 text-[var(--status-success)]" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-[var(--status-error)]" />
                            )}
                            <h2 className="text-base font-semibold text-white">{t('query.results')}</h2>
                            {result.executionTime !== undefined && (
                                <div className="flex items-center gap-1 text-xs text-[var(--text-muted)] bg-[var(--background-tertiary)] px-2 py-1 rounded">
                                    <Clock className="w-3 h-3" />
                                    <span>{result.executionTime}ms</span>
                                </div>
                            )}
                            {result.data && (
                                <span className="text-xs text-[var(--text-muted)] bg-[var(--background-tertiary)] px-2 py-1 rounded">
                                    {totalRows} rows
                                </span>
                            )}
                        </div>

                        {result.success && result.data && result.data.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={exportToCSV}
                                    className="btn btn-secondary text-xs py-1.5"
                                >
                                    <Download className="w-3 h-3" />
                                    <span>CSV</span>
                                </button>
                            </div>
                        )}
                    </div>

                    {result.success ? (
                        <>
                            {result.rowsAffected !== undefined && (
                                <div className="my-3 px-4 py-3 bg-[rgba(0,200,150,0.1)] border border-[var(--status-success)] rounded-lg text-[var(--status-success)] flex-shrink-0">
                                    <span className="font-semibold">{result.rowsAffected}</span> {t('query.rowsAffected')}
                                </div>
                            )}

                            {result.data && result.data.length > 0 ? (
                                <div className="flex-1 flex flex-col min-h-0">
                                    {/* pgAdmin-style table */}
                                    <div ref={tableContainerRef} className="flex-1 overflow-auto border border-[var(--border-primary)] rounded-lg mt-3">
                                        <table className="w-full border-collapse">
                                            <thead className="sticky top-0 z-10">
                                                <tr className="bg-[#252542]">
                                                    <th className="px-2 py-2 text-center text-xs font-semibold text-[var(--text-muted)] border-r border-b border-[var(--border-primary)] w-12 bg-[#252542]">
                                                        #
                                                    </th>
                                                    {result.columns?.map((column) => (
                                                        <th
                                                            key={column}
                                                            className="px-3 py-2 text-left text-xs font-semibold text-[var(--accent-secondary)] border-r border-b border-[var(--border-primary)] whitespace-nowrap bg-[#252542]"
                                                            style={{ minWidth: '100px' }}
                                                        >
                                                            <div className="flex items-center gap-1">
                                                                <span>{column}</span>
                                                            </div>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="bg-[#1a1a2e]">
                                                {paginatedData.map((row, rowIndex) => {
                                                    const actualRowIndex = (currentPage - 1) * rowsPerPage + rowIndex;
                                                    return (
                                                        <tr
                                                            key={rowIndex}
                                                            className="hover:bg-[rgba(99,102,241,0.1)] group"
                                                        >
                                                            <td className="px-2 py-1.5 text-center text-xs text-[var(--text-muted)] border-r border-b border-[var(--border-primary)] bg-[#1e1e36]">
                                                                {actualRowIndex + 1}
                                                            </td>
                                                            {result.columns?.map((column) => (
                                                                <td
                                                                    key={column}
                                                                    className="px-3 py-1.5 text-sm border-r border-b border-[var(--border-primary)] font-mono"
                                                                    style={{ maxWidth: '300px' }}
                                                                >
                                                                    {row[column] === null ? (
                                                                        <span className="text-[var(--text-muted)] italic text-xs bg-[var(--background-tertiary)] px-1.5 py-0.5 rounded">NULL</span>
                                                                    ) : typeof row[column] === 'boolean' ? (
                                                                        <span className={`text-xs px-1.5 py-0.5 rounded ${row[column] ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                                                                            {row[column] ? 'true' : 'false'}
                                                                        </span>
                                                                    ) : typeof row[column] === 'object' ? (
                                                                        <span className="text-xs text-[var(--text-muted)] truncate block">
                                                                            {JSON.stringify(row[column])}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-[var(--text-primary)] truncate block">
                                                                            {String(row[column])}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex items-center justify-between pt-3 flex-shrink-0">
                                            <span className="text-xs text-[var(--text-muted)]">
                                                Showing {(currentPage - 1) * rowsPerPage + 1} - {Math.min(currentPage * rowsPerPage, totalRows)} of {totalRows}
                                            </span>
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                    className="p-1.5 rounded hover:bg-[var(--background-tertiary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <ChevronLeft className="w-4 h-4 text-[var(--text-secondary)]" />
                                                </button>
                                                <span className="px-3 py-1 text-xs text-[var(--text-secondary)]">
                                                    {currentPage} / {totalPages}
                                                </span>
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="p-1.5 rounded hover:bg-[var(--background-tertiary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                >
                                                    <ChevronRight className="w-4 h-4 text-[var(--text-secondary)]" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                !result.rowsAffected && (
                                    <div className="flex-1 flex items-center justify-center text-[var(--text-muted)]">
                                        {t('query.noResults')}
                                    </div>
                                )
                            )}
                        </>
                    ) : (
                        <div className="mt-3 px-4 py-4 bg-[rgba(255,82,82,0.1)] border border-[var(--status-error)] rounded-lg">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <p className="text-[var(--status-error)] font-medium mb-1">{t('query.error')}</p>
                                    <p className="text-sm text-[var(--text-secondary)] font-mono whitespace-pre-wrap">
                                        {result.error}
                                    </p>
                                </div>
                                <button
                                    onClick={() => result.error && copyToClipboard(result.error)}
                                    className="p-2 text-[var(--text-muted)] hover:text-white hover:bg-[var(--background-tertiary)] rounded transition-colors"
                                    title="Copy error"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

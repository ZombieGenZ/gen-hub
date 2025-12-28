'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { adminApi } from '@/lib/api';

interface TableInfo {
    name: string;
    displayName: string;
}

interface TablesContextType {
    tables: TableInfo[];
    isLoading: boolean;
    error: string | null;
    fetchTables: () => Promise<void>;
    refreshTables: () => Promise<void>;
}

const TablesContext = createContext<TablesContextType | undefined>(undefined);

// Convert string to Title Case (capitalize first letter of each word)
// Handles both snake_case and camelCase
const toTitleCase = (str: string): string => {
    return str
        // First handle camelCase: add space before uppercase letters
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        // Then replace underscores with spaces
        .replace(/_/g, ' ')
        // Capitalize first letter of each word
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

export function TablesProvider({ children }: { children: ReactNode }) {
    const [tables, setTables] = useState<TableInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasFetched, setHasFetched] = useState(false);

    const fetchTables = useCallback(async () => {
        // Skip if already fetched and not explicitly refreshing
        if (hasFetched && tables.length > 0) {
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const data = await adminApi.getTables();
            // Format displayName: replace underscores with spaces and capitalize each word
            const formattedTables = data.map((table: TableInfo) => ({
                ...table,
                displayName: toTitleCase(table.displayName)
            }));
            // Sort tables alphabetically
            const sortedTables = formattedTables.sort((a: TableInfo, b: TableInfo) =>
                a.displayName.localeCompare(b.displayName)
            );
            setTables(sortedTables);
            setHasFetched(true);
        } catch (err) {
            console.error('Failed to fetch tables:', err);
            setError('Failed to fetch tables');
        } finally {
            setIsLoading(false);
        }
    }, [hasFetched, tables.length]);

    // Force refresh - bypasses cache
    const refreshTables = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await adminApi.getTables();
            // Format displayName: replace underscores with spaces and capitalize each word
            const formattedTables = data.map((table: TableInfo) => ({
                ...table,
                displayName: toTitleCase(table.displayName)
            }));
            // Sort tables alphabetically
            const sortedTables = formattedTables.sort((a: TableInfo, b: TableInfo) =>
                a.displayName.localeCompare(b.displayName)
            );
            setTables(sortedTables);
            setHasFetched(true);
        } catch (err) {
            console.error('Failed to fetch tables:', err);
            setError('Failed to fetch tables');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch on mount
    useEffect(() => {
        if (!hasFetched) {
            fetchTables();
        }
    }, [hasFetched, fetchTables]);

    return (
        <TablesContext.Provider value={{ tables, isLoading, error, fetchTables, refreshTables }}>
            {children}
        </TablesContext.Provider>
    );
}

export function useTables() {
    const context = useContext(TablesContext);
    if (context === undefined) {
        throw new Error('useTables must be used within a TablesProvider');
    }
    return context;
}

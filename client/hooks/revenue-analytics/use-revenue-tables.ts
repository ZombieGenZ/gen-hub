"use client";

import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { revenueAnalyticsService } from '@/services/revenue-analytics/revenue-analytics.service';
import type { RevenueFilters, TableData } from '@/services/revenue-analytics/revenue-analytics.types';

export function useRevenueTables(
    filters: RevenueFilters & { tab: string; limit: number; offset: number },
) {
    return useQuery<TableData>({
        queryKey: ['revenue-tables', filters],
        queryFn: () => revenueAnalyticsService.getTables(filters),
        staleTime: 30_000,
        placeholderData: keepPreviousData,
    });
}

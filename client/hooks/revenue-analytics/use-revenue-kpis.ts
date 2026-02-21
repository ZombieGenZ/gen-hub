"use client";

import { useQuery } from '@tanstack/react-query';
import { revenueAnalyticsService } from '@/services/revenue-analytics/revenue-analytics.service';
import type { RevenueFilters, KpiData } from '@/services/revenue-analytics/revenue-analytics.types';

export function useRevenueKpis(filters: RevenueFilters) {
    return useQuery<KpiData>({
        queryKey: ['revenue-kpis', filters],
        queryFn: () => revenueAnalyticsService.getKpis(filters),
        staleTime: 30_000,
        refetchInterval: 60_000,
    });
}

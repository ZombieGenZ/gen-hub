"use client";

import { useQuery } from '@tanstack/react-query';
import { revenueAnalyticsService } from '@/services/revenue-analytics/revenue-analytics.service';
import type { RevenueFilters, ChartData } from '@/services/revenue-analytics/revenue-analytics.types';

export function useRevenueCharts(
    filters: RevenueFilters & { granularity?: string; include_coupon_discount?: boolean },
) {
    return useQuery<ChartData>({
        queryKey: ['revenue-charts', filters],
        queryFn: () => revenueAnalyticsService.getCharts(filters),
        staleTime: 30_000,
        refetchInterval: 60_000,
    });
}

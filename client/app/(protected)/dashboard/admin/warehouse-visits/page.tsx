'use client';

import React, { useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { warehouseVisitService } from '@/services/warehouse-visit/warehouse-visit.service';
import { authStorage } from '@/services/auth/auth-storage.service';
import PendingSidebar from './components/PendingSidebar';
import { useWarehouseVisitSocket } from '@/hooks/warehouse-visit/use-warehouse-visit-socket';

const CalendarView = dynamic(() => import('./components/CalendarView'), { ssr: false });
const VisitDetailDrawer = dynamic(() => import('./components/VisitDetailDrawer'), { ssr: false });

export default function WarehouseVisitsPage() {
    const queryClient = useQueryClient();
    const token = authStorage.getAccessToken() || '';
    
    useWarehouseVisitSocket();

    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0).toISOString().split('T')[0];

    // Fetch all applicable bookings (we just get limits for demo because backend may not have date range properly yet, but we will fetch all status without filter to populate calendar)
    const { data: response, isLoading } = useQuery({
        queryKey: ['warehouse-visits', startOfMonth, endOfMonth],
        queryFn: () => warehouseVisitService.getBookings(token, { limit: 500 }),
        enabled: !!token,
    });

    // Fetch pending bookings separately
    const { data: pendingResponse } = useQuery({
        queryKey: ['warehouse-visits', 'pending'],
        queryFn: () => warehouseVisitService.getBookings(token, { status: 'PENDING', limit: 100 }),
        enabled: !!token,
    });

    const events = useMemo(() => {
        if (!response?.data) return [];
        return response.data.map((item: any) => {
            const dateStr = item.visit_date.split('T')[0];
            const start = new Date(`${dateStr}T${item.visit_time_start}:00`);
            const end = new Date(`${dateStr}T${item.visit_time_end}:00`);

            return {
                id: item.id,
                title: `${item.visitor_name} - ${item.warehouse_template?.name || 'Kho'}`,
                start,
                end,
                status: item.status,
                resource: item
            };
        });
    }, [response?.data]);

    const pendingItems = useMemo(() => {
        return pendingResponse?.data || [];
    }, [pendingResponse?.data]);

    const stats = useMemo(() => {
        return events.reduce(
            (acc: { total: number; pending: number; confirmed: number; completed: number }, event: any) => {
                acc.total += 1;
                if (event.status === 'PENDING') acc.pending += 1;
                if (event.status === 'CONFIRMED') acc.confirmed += 1;
                if (event.status === 'COMPLETED') acc.completed += 1;
                return acc;
            },
            { total: 0, pending: 0, confirmed: 0, completed: 0 }
        );
    }, [events]);

    const handleSelectEvent = (event: any) => {
        setSelectedVisitId(event.id);
    };

    const handleActionComplete = () => {
        queryClient.invalidateQueries({ queryKey: ['warehouse-visits'] });
        queryClient.invalidateQueries({ queryKey: ['warehouse-visit'] });
        setSelectedVisitId(null);
    };

    return (
        <div className="-m-2 grid h-[calc(100vh-(--spacing(24)))] grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-linear-to-b from-white to-slate-50/70 shadow-[0_18px_50px_-26px_rgba(15,118,110,0.35)] dark:from-card dark:to-card">
                <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-teal-100/45 to-transparent dark:from-teal-500/10" />
                <div className="relative flex h-full flex-col p-4 md:p-5">
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 className="text-2xl font-semibold tracking-tight text-foreground">Lịch tham quan kho</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Quản lý lịch hẹn theo tuần hoặc tháng với trạng thái trực quan.</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700 dark:border-teal-500/30 dark:bg-teal-500/10 dark:text-teal-400">
                                Tổng {stats.total}
                            </span>
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400">
                                Chờ duyệt {stats.pending}
                            </span>
                            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400">
                                Đã xác nhận {stats.confirmed}
                            </span>
                        </div>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 dark:border-sky-500/30 dark:bg-sky-500/10">● Đã hoàn tất</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 dark:border-amber-500/30 dark:bg-amber-500/10">● Chờ duyệt</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 dark:border-emerald-500/30 dark:bg-emerald-500/10">● Đã xác nhận</span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 dark:border-rose-500/30 dark:bg-rose-500/10">● Đã hủy</span>
                    </div>

                    {isLoading ? (
                        <div className="flex items-center justify-center flex-1">
                            <svg className="animate-spin h-8 w-8 text-teal-600" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                        </div>
                    ) : (
                        <div className="min-h-0 flex-1 rounded-2xl border border-border/60 bg-white/70 p-2 backdrop-blur dark:bg-card/70">
                            <CalendarView
                                events={events}
                                date={currentDate}
                                onNavigate={setCurrentDate}
                                onSelectEvent={handleSelectEvent}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-3xl border border-border/70 bg-card p-4 shadow-[0_18px_44px_-28px_rgba(15,118,110,0.4)]">
                <div className="mb-4 border-b border-border/70 pb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">Hàng chờ xử lý</h3>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                            {pendingItems.length}
                        </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Chọn một lịch hẹn để mở chi tiết và thao tác nhanh.</p>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar -mr-2">
                    <PendingSidebar
                        items={pendingItems}
                        onSelectItem={(id) => setSelectedVisitId(id)}
                        selectedId={selectedVisitId}
                    />
                </div>
            </div>

            <VisitDetailDrawer
                visitId={selectedVisitId}
                onClose={() => setSelectedVisitId(null)}
                onSuccess={handleActionComplete}
            />
        </div>
    );
}

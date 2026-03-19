'use client';

import React, { useState, useMemo } from 'react';
import useSWR from 'swr';
import { api } from '@/lib/api';
import CalendarView from './_components/CalendarView';
import PendingSidebar from './_components/PendingSidebar';
import VisitDetailDrawer from './_components/VisitDetailDrawer';
import type { CalendarVisitEvent, WarehouseVisitListResponse } from './_components/types';
import { Loader2 } from 'lucide-react';

const fetcher = <T,>(url: string) => api.get<{ data: T }>(url).then((res) => res.data?.data);

export default function WarehouseVisitPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);

    // Dùng API list.all để lấy danh sách
    // Vì Calendar cần lấy theo tháng, ta có thể dùng filter start_date, end_date
    // Hoặc lấy limit cao (e.g., 500) để demo (tránh phức tạp pagination cho lịch)
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).toISOString().split('T')[0];

    const queryParams = new URLSearchParams({
        limit: '500', // Đủ cho 1 tháng
        start_date: startOfMonth,
        end_date: endOfMonth,
    }).toString();

    const { data: response, isLoading, mutate } = useSWR<WarehouseVisitListResponse>(`/warehouse-visit?${queryParams}`, fetcher);
    
    // Lấy riêng list pending để làm Queue (hoặc filter từ chung nếu nó thuộc tháng này)
    // Queue cần lấy cả những cái chưa xử lý từ trước
    const { data: pendingResponse, mutate: mutatePending } = useSWR<WarehouseVisitListResponse>(`/warehouse-visit?status=PENDING&limit=100`, fetcher);

    const events = useMemo(() => {
        if (!response?.items) return [];
        return response.items.map((item): CalendarVisitEvent => {
            // Parser visit_date và time
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
    }, [response?.items]);

    const pendingItems = useMemo(() => {
        return pendingResponse?.items || [];
    }, [pendingResponse?.items]);

    const handleSelectEvent = (event: CalendarVisitEvent) => {
        setSelectedVisitId(event.id);
    };

    const handleActionComplete = () => {
        mutate();
        mutatePending();
        setSelectedVisitId(null);
    };

    return (
        <div className="flex h-[calc(100vh-theme(spacing.16))] gap-4 p-4 lg:p-6 overflow-hidden">
            {/* Lịch Tổng */}
            <div className="flex-1 bg-[var(--background-secondary)] rounded-2xl border border-[var(--border-primary)] overflow-hidden flex flex-col p-4 shadow-sm relative">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-white glow-text">Lịch Tham Quan</h2>
                </div>
                {isLoading ? (
                    <div className="flex items-center justify-center flex-1">
                        <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)]" />
                    </div>
                ) : (
                    <div className="flex-1 min-h-0 bg-white/5 rounded-xl p-2 relative">
                        <CalendarView 
                            events={events} 
                            date={currentDate} 
                            onNavigate={setCurrentDate}
                            onSelectEvent={handleSelectEvent}
                        />
                    </div>
                )}
            </div>

            {/* Hàng đợi Cần xử lý */}
            <div className="w-80 shrink-0 bg-[var(--background-secondary)] rounded-2xl border border-[var(--border-primary)] p-4 shadow-sm overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-[var(--border-primary)]">
                    <h3 className="text-lg font-bold text-white">Cần xử lý</h3>
                    <span className="bg-[var(--status-warning)] text-black text-xs font-bold px-2 py-0.5 rounded-full">
                        {pendingItems.length}
                    </span>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    <PendingSidebar 
                        items={pendingItems} 
                        onSelectItem={(id) => setSelectedVisitId(id)} 
                        selectedId={selectedVisitId}
                    />
                </div>
            </div>

            {/* Right Drawer (Chi tiết & Xử lý) */}
            <VisitDetailDrawer 
                visitId={selectedVisitId} 
                onClose={() => setSelectedVisitId(null)} 
                onSuccess={handleActionComplete}
            />
        </div>
    );
}

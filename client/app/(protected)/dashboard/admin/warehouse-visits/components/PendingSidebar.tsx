'use client';

import React from 'react';
import { ClockIcon, MapPinIcon, UserIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { format, parseISO } from 'date-fns';
import { vi } from 'date-fns/locale';

interface PendingSidebarProps {
  items: any[];
  onSelectItem: (id: string) => void;
  selectedId: string | null;
}

export default function PendingSidebar({ items, onSelectItem, selectedId }: PendingSidebarProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border/70 bg-muted/20 py-12 text-center text-muted-foreground">
        <ClockIcon className="mb-4 h-12 w-12 opacity-20" />
        <p className="text-sm font-medium">Không có lịch hẹn cần xử lý</p>
        <p className="mt-1 text-xs">Lịch mới sẽ xuất hiện tại đây.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {items.map((item) => {
        let visitDate = '';
        try {
          visitDate = format(parseISO(item.visit_date), "dd/MM/yyyy", { locale: vi });
        } catch (e) { /* ignore */ }

        const isSelected = selectedId === item.id;

        return (
          <div
            key={item.id}
            onClick={() => onSelectItem(item.id)}
            className={`
              group cursor-pointer rounded-2xl border p-3.5 transition-all
              ${isSelected
                ? 'border-teal-300 bg-teal-50/90 shadow-[0_12px_24px_-18px_rgba(15,118,110,0.65)] dark:border-teal-500/40 dark:bg-teal-500/15'
                : 'border-border/70 bg-card hover:border-teal-200 hover:bg-teal-50/40 dark:hover:border-teal-500/30 dark:hover:bg-teal-500/10'
              }
            `}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-1.5 text-sm font-semibold text-foreground">
                <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-teal-500' : 'bg-amber-500'}`} />
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="max-w-35 truncate">{item.visitor_name}</span>
              </div>
              <ChevronRightIcon className={`h-4 w-4 shrink-0 transition-transform ${isSelected ? 'text-teal-600 translate-x-0.5' : 'text-muted-foreground group-hover:text-foreground'}`} />
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPinIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate" title={item.warehouse_template?.name}>
                  {item.warehouse_template?.name || 'Chưa rõ kho'}
                </span>
              </div>

              <div className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-400">
                <ClockIcon className="h-3.5 w-3.5" />
                <span>{item.visit_time_start} · {visitDate}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

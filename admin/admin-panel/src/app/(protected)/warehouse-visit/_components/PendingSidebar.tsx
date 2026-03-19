'use client';

import React from 'react';
import { Clock, MapPin, User, ChevronRight } from 'lucide-react';
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
      <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)] text-center h-full">
        <Clock className="w-12 h-12 mb-4 opacity-20" />
        <p>Không có lịch hẹn cần xử lý</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        let visitDate = '';
        try {
           visitDate = format(parseISO(item.visit_date), "dd/MM/yyyy", { locale: vi });
        } catch(e) { /* ignore */ }
        
        const isSelected = selectedId === item.id;

        return (
          <div 
            key={item.id}
            onClick={() => onSelectItem(item.id)}
            className={`
              p-3 rounded-xl border cursor-pointer transition-all group
              ${isSelected 
                ? 'bg-[var(--accent-primary-muted)] border-[var(--accent-primary)] shadow-sm' 
                : 'bg-[var(--background-primary)] border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:shadow-md'
              }
            `}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-white">
                <User className="w-4 h-4 text-[var(--text-muted)]" />
                <span className="truncate max-w-[140px]">{item.visitor_name}</span>
              </div>
              <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)] group-hover:text-white'}`} />
            </div>
            
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate" title={item.warehouse_template?.name}>
                  {item.warehouse_template?.name || 'Chưa rõ kho'}
                </span>
              </div>
              
              <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--status-warning)] bg-[rgba(234,179,8,0.1)] px-2 py-1 rounded inline-flex">
                <Clock className="w-3.5 h-3.5" />
                <span>{item.visit_time_start} - {visitDate}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

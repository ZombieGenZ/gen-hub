'use client';

import { fillRateColors, fillRateLabels, FillRateStatus } from '@/types/warehouse';
import { Filter, X } from 'lucide-react';

interface FillRateLegendProps {
  onFilterByStatus?: (status: FillRateStatus | null) => void;
  activeFilter?: FillRateStatus | null;
}

const FillRateLegend = ({ onFilterByStatus, activeFilter }: FillRateLegendProps) => {
  const statuses: FillRateStatus[] = ['empty', 'low', 'medium', 'high', 'full', 'overfilled'];

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 p-3 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
          <Filter className="w-3 h-3" />
          Lọc theo tỷ lệ
        </h4>
        {activeFilter && (
          <button
            onClick={() => onFilterByStatus?.(null)}
            className="text-[10px] text-primary hover:text-primary/80 transition-colors flex items-center gap-0.5"
          >
            <X className="w-3 h-3" />
            Xóa
          </button>
        )}
      </div>
      <div className="space-y-1">
        {statuses.map((status) => {
          const isActive = activeFilter === status;
          return (
            <button
              key={status}
              onClick={() => onFilterByStatus?.(isActive ? null : status)}
              className={`flex items-center gap-2 text-xs w-full text-left px-2 py-1.5 rounded-lg transition-all duration-200 ${
                isActive 
                  ? 'bg-primary/20 text-primary ring-1 ring-primary/30' 
                  : 'hover:bg-muted/70 text-muted-foreground hover:text-foreground'
              }`}
            >
              <div 
                className={`w-3 h-3 rounded-sm transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
                style={{ 
                  backgroundColor: fillRateColors[status],
                  boxShadow: isActive ? `0 0 8px ${fillRateColors[status]}80` : 'none'
                }}
              />
              <span className="flex-1">{fillRateLabels[status]}</span>
              {isActive && <span className="text-[10px] opacity-70">✓</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FillRateLegend;

'use client';

import { WarehouseStats } from '@/types/warehouse';
import { Package, Layers, TrendingUp, Box } from 'lucide-react';

interface StatsOverlayProps {
  stats: WarehouseStats;
}

const StatsOverlay = ({ stats }: StatsOverlayProps) => {
  const fillPercentage = stats.totalCapacity > 0 
    ? Math.round((stats.usedCapacity / stats.totalCapacity) * 100) 
    : 0;

  const getFillColor = (percentage: number) => {
    if (percentage < 30) return '#22c55e';
    if (percentage < 60) return '#eab308';
    if (percentage < 90) return '#f97316';
    return '#ef4444';
  };

  return (
    <div 
      className="p-4 min-w-56"
      style={{
        backgroundColor: '#f8fafb',
        border: '1px solid #e0ede8',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      }}
    >
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2" style={{ color: '#1a2e25' }}>
        <Package className="w-4 h-4" style={{ color: '#2ea87e' }} />
        Thống kê kho
      </h3>
      
      <div className="space-y-3">
        {/* Rack count */}
        <div className="flex items-center justify-between p-2 rounded-lg transition-colors -mx-2 hover:bg-white">
          <div className="flex items-center gap-2" style={{ color: '#4a5568' }}>
            <Layers className="w-4 h-4" />
            <span className="text-sm">Tổng kệ</span>
          </div>
          <span className="font-bold text-lg" style={{ color: '#1a2e25' }}>{stats.totalRacks}</span>
        </div>

        {/* Box count */}
        <div className="flex items-center justify-between p-2 rounded-lg transition-colors -mx-2 hover:bg-white">
          <div className="flex items-center gap-2" style={{ color: '#4a5568' }}>
            <Box className="w-4 h-4" />
            <span className="text-sm">Tổng thùng</span>
          </div>
          <span className="font-bold text-lg" style={{ color: '#1a2e25' }}>{stats.totalBoxes}</span>
        </div>

        {/* Fill rate with progress bar */}
        <div className="p-2 -mx-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2" style={{ color: '#4a5568' }}>
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Tỷ lệ lấp đầy</span>
            </div>
            <span className="font-bold text-lg" style={{ color: getFillColor(fillPercentage) }}>
              {fillPercentage}%
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#e0ede8' }}>
            <div 
              className="h-full transition-all duration-500 ease-out rounded-full"
              style={{ 
                width: `${Math.min(fillPercentage, 100)}%`,
                backgroundColor: getFillColor(fillPercentage)
              }}
            />
          </div>
          
          {/* Capacity numbers */}
          <div className="flex justify-between text-xs mt-1" style={{ color: '#4a5568' }}>
            <span>{stats.usedCapacity} đã dùng</span>
            <span>{stats.totalCapacity} tổng</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsOverlay;

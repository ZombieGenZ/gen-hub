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
    if (percentage < 30) return 'text-green-500';
    if (percentage < 60) return 'text-yellow-500';
    if (percentage < 90) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 p-4 rounded-xl shadow-2xl min-w-56">
      <h3 className="font-bold text-sm mb-3 flex items-center gap-2 text-foreground">
        <Package className="w-4 h-4 text-primary" />
        Thống kê kho
      </h3>
      
      <div className="space-y-3">
        {/* Rack count */}
        <div className="flex items-center justify-between group hover:bg-muted/50 p-2 rounded-lg transition-colors -mx-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Layers className="w-4 h-4" />
            <span className="text-sm">Tổng kệ</span>
          </div>
          <span className="font-bold text-foreground text-lg">{stats.totalRacks}</span>
        </div>

        {/* Box count */}
        <div className="flex items-center justify-between group hover:bg-muted/50 p-2 rounded-lg transition-colors -mx-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Box className="w-4 h-4" />
            <span className="text-sm">Tổng thùng</span>
          </div>
          <span className="font-bold text-foreground text-lg">{stats.totalBoxes}</span>
        </div>

        {/* Fill rate with progress bar */}
        <div className="p-2 -mx-2">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingUp className="w-4 h-4" />
              <span className="text-sm">Tỷ lệ lấp đầy</span>
            </div>
            <span className={`font-bold text-lg ${getFillColor(fillPercentage)}`}>
              {fillPercentage}%
            </span>
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all duration-500 ease-out rounded-full ${
                fillPercentage < 30 ? 'bg-green-500' :
                fillPercentage < 60 ? 'bg-yellow-500' :
                fillPercentage < 90 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: `${Math.min(fillPercentage, 100)}%` }}
            />
          </div>
          
          {/* Capacity numbers */}
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{stats.usedCapacity} đã dùng</span>
            <span>{stats.totalCapacity} tổng</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatsOverlay;

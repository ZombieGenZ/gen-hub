'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, PieChart, TrendingUp, TrendingDown, Package,
  Layers, ArrowUpRight, ArrowDownRight, X, Activity
} from 'lucide-react';
import { CategoryStats, RackUtilization } from '@/types/inventory';
import { WarehouseStats } from '@/types/warehouse';
import { fillRateColors, fillRateLabels, FillRateStatus } from '@/types/warehouse';

interface StatsDashboardProps {
  stats: WarehouseStats;
  categoryStats: CategoryStats[];
  rackUtilization: RackUtilization[];
  transactionSummary: {
    todayIn: number;
    todayOut: number;
    totalTransactions: number;
  };
  isOpen: boolean;
  onClose: () => void;
  onViewRack?: (rackId: string) => void;
}

const StatsDashboard = ({
  stats,
  categoryStats,
  rackUtilization,
  transactionSummary,
  isOpen,
  onClose,
  onViewRack,
}: StatsDashboardProps) => {
  const fillPercentage = stats.totalCapacity > 0 
    ? Math.round((stats.usedCapacity / stats.totalCapacity) * 100) 
    : 0;

  const racksByStatus = useMemo(() => {
    const grouped: Record<FillRateStatus, RackUtilization[]> = {
      low: [],
      medium: [],
      overfilled: [],
    };
    rackUtilization.forEach(rack => {
      grouped[rack.status].push(rack);
    });
    return grouped;
  }, [rackUtilization]);

  if (!isOpen) return null;

  return (
    <div 
      className="absolute top-16 right-4 z-30 w-full max-w-[420px] max-h-[70vh] overflow-hidden animate-in slide-in-from-right-5 duration-300"
      style={{
        backgroundColor: '#f8fafb',
        border: '1px solid #e0ede8',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      }}
    >
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 border-b"
        style={{ borderColor: '#e0ede8' }}
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" style={{ color: '#2ea87e' }} />
          <h2 className="text-lg font-bold" style={{ color: '#1a2e25' }}>Báo cáo & Thống kê</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-4 h-4" style={{ color: '#4a5568' }} />
        </Button>
      </div>

      <ScrollArea className="h-[calc(70vh-60px)] overflow-y-auto">
        <div className="p-4 space-y-4">
          {/* Overview Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#ffffff', border: '1px solid #e0ede8' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: '#4a5568' }}>Tổng kệ</p>
                  <p className="text-2xl font-bold" style={{ color: '#1a2e25' }}>{stats.totalRacks}</p>
                </div>
                <Layers className="w-6 h-6" style={{ color: '#2ea87e' }} />
              </div>
            </div>

            <div className="p-3 rounded-lg" style={{ backgroundColor: '#ffffff', border: '1px solid #e0ede8' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: '#4a5568' }}>Tổng thùng</p>
                  <p className="text-2xl font-bold" style={{ color: '#1a2e25' }}>{stats.totalBoxes}</p>
                </div>
                <Package className="w-6 h-6" style={{ color: '#3b82f6' }} />
              </div>
            </div>

            <div className="p-3 rounded-lg" style={{ backgroundColor: '#ffffff', border: '1px solid #e0ede8' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: '#4a5568' }}>Nhập hôm nay</p>
                  <p className="text-2xl font-bold" style={{ color: '#1a2e25' }}>{transactionSummary.todayIn}</p>
                </div>
                <ArrowDownRight className="w-6 h-6" style={{ color: '#22c55e' }} />
              </div>
            </div>

            <div className="p-3 rounded-lg" style={{ backgroundColor: '#ffffff', border: '1px solid #e0ede8' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs" style={{ color: '#4a5568' }}>Xuất hôm nay</p>
                  <p className="text-2xl font-bold" style={{ color: '#1a2e25' }}>{transactionSummary.todayOut}</p>
                </div>
                <ArrowUpRight className="w-6 h-6" style={{ color: '#f97316' }} />
              </div>
            </div>
          </div>

          {/* Fill Rate & Category Distribution */}
          <div className="grid grid-cols-1 gap-3">
            {/* Overall Fill Rate */}
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#ffffff', border: '1px solid #e0ede8' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-4 h-4" style={{ color: '#2ea87e' }} />
                <span className="text-sm font-medium" style={{ color: '#1a2e25' }}>Tỷ lệ lấp đầy tổng thể</span>
              </div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold" style={{ color: '#1a2e25' }}>{fillPercentage}%</span>
                <span className="text-xs" style={{ color: '#4a5568' }}>
                  {stats.usedCapacity} / {stats.totalCapacity}
                </span>
              </div>
              <Progress value={Math.min(fillPercentage, 100)} className="h-2" />
              
              {/* Status breakdown */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                {(['low', 'medium', 'overfilled'] as FillRateStatus[]).map(status => (
                  <div 
                    key={status}
                    className="p-2 rounded-lg text-center"
                    style={{ backgroundColor: `${fillRateColors[status]}15` }}
                  >
                    <div 
                      className="text-base font-bold"
                      style={{ color: fillRateColors[status] }}
                    >
                      {racksByStatus[status].length}
                    </div>
                    <div className="text-[10px]" style={{ color: '#4a5568' }}>
                      {status === 'low' ? 'Còn chỗ' : status === 'medium' ? 'Vừa phải' : 'Quá tải'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Category Distribution */}
            <div 
              className="p-3 rounded-lg"
              style={{ backgroundColor: '#ffffff', border: '1px solid #e0ede8' }}
            >
              <div className="flex items-center gap-2 mb-2">
                <PieChart className="w-4 h-4" style={{ color: '#2ea87e' }} />
                <span className="text-sm font-medium" style={{ color: '#1a2e25' }}>Phân bố theo loại hàng</span>
              </div>
              {categoryStats.length === 0 ? (
                <div className="text-center py-4 text-sm" style={{ color: '#4a5568' }}>
                  Chưa có dữ liệu
                </div>
              ) : (
                <div className="space-y-2">
                  {categoryStats.map((cat) => (
                    <div key={cat.category} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span style={{ color: '#4a5568' }}>{cat.category}</span>
                        </div>
                        <span className="font-medium" style={{ color: '#1a2e25' }}>{cat.count} ({cat.percentage}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#e0ede8' }}>
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${cat.percentage}%`,
                            backgroundColor: cat.color
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Rack Utilization Table */}
          <div 
            className="p-3 rounded-lg"
            style={{ backgroundColor: '#ffffff', border: '1px solid #e0ede8' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4" style={{ color: '#2ea87e' }} />
              <span className="text-sm font-medium" style={{ color: '#1a2e25' }}>Chi tiết sử dụng kệ</span>
            </div>
            {rackUtilization.length === 0 ? (
              <div className="text-center py-4 text-sm" style={{ color: '#4a5568' }}>
                Chưa có kệ nào
              </div>
            ) : (
              <div className="relative overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ borderBottom: '1px solid #e0ede8' }}>
                      <th className="text-left p-2 font-medium" style={{ color: '#4a5568' }}>Tên kệ</th>
                      <th className="text-center p-2 font-medium" style={{ color: '#4a5568' }}>Đã dùng</th>
                      <th className="text-center p-2 font-medium" style={{ color: '#4a5568' }}>Sức chứa</th>
                      <th className="text-center p-2 font-medium" style={{ color: '#4a5568' }}>Tỷ lệ</th>
                      <th className="text-center p-2 font-medium" style={{ color: '#4a5568' }}>Trạng thái</th>
                      <th className="text-right p-2 font-medium" style={{ color: '#4a5568' }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {rackUtilization.map((rack) => (
                      <tr key={rack.rackId} style={{ borderBottom: '1px solid #e0ede815' }} className="hover:bg-gray-50">
                      <td className="p-2 font-medium" style={{ color: '#1a2e25' }}>{rack.rackName}</td>
                        <td className="p-2 text-center" style={{ color: '#1a2e25' }}>{rack.used}</td>
                        <td className="p-2 text-center" style={{ color: '#1a2e25' }}>{rack.capacity}</td>
                        <td className="p-2 text-center" style={{ color: '#1a2e25' }}>{Math.round(rack.fillRate * 100)}%</td>
                        <td className="p-2 text-center">
                          <span 
                            className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{ 
                              border: `1px solid ${fillRateColors[rack.status]}`,
                              color: fillRateColors[rack.status],
                              backgroundColor: `${fillRateColors[rack.status]}15`
                            }}
                          >
                            {rack.status === 'low' ? 'Còn chỗ' : rack.status === 'medium' ? 'Vừa' : 'Đầy'}
                          </span>
                        </td>
                        <td className="p-2 text-right">
                          {onViewRack && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-xs"
                              style={{ color: '#2ea87e' }}
                              onClick={() => onViewRack(rack.rackId)}
                            >
                              Xem
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

export default StatsDashboard;

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
    <div className="absolute inset-4 z-30 bg-card/98 backdrop-blur-lg border border-border rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold text-foreground">Báo cáo & Thống kê</h2>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <ScrollArea className="h-[calc(100%-60px)]">
        <div className="p-4 space-y-4">
          {/* Overview Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Tổng kệ</p>
                    <p className="text-3xl font-bold text-foreground">{stats.totalRacks}</p>
                  </div>
                  <Layers className="w-8 h-8 text-primary/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Tổng thùng</p>
                    <p className="text-3xl font-bold text-foreground">{stats.totalBoxes}</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Nhập hôm nay</p>
                    <p className="text-3xl font-bold text-foreground">{transactionSummary.todayIn}</p>
                  </div>
                  <ArrowDownRight className="w-8 h-8 text-green-500/50" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-orange-500/10 to-orange-500/5">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Xuất hôm nay</p>
                    <p className="text-3xl font-bold text-foreground">{transactionSummary.todayOut}</p>
                  </div>
                  <ArrowUpRight className="w-8 h-8 text-orange-500/50" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Fill Rate & Category Distribution */}
          <div className="grid grid-cols-2 gap-4">
            {/* Overall Fill Rate */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  Tỷ lệ lấp đầy tổng thể
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-4xl font-bold">{fillPercentage}%</span>
                  <span className="text-sm text-muted-foreground">
                    {stats.usedCapacity} / {stats.totalCapacity}
                  </span>
                </div>
                <Progress value={Math.min(fillPercentage, 100)} className="h-3" />
                
                {/* Status breakdown */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {(['low', 'medium', 'overfilled'] as FillRateStatus[]).map(status => (
                    <div 
                      key={status}
                      className="p-2 rounded-lg text-center"
                      style={{ backgroundColor: `${fillRateColors[status]}20` }}
                    >
                      <div 
                        className="text-lg font-bold"
                        style={{ color: fillRateColors[status] }}
                      >
                        {racksByStatus[status].length}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {status === 'low' ? 'Còn chỗ' : status === 'medium' ? 'Vừa phải' : 'Quá tải'}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Category Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-primary" />
                  Phân bố theo loại hàng
                </CardTitle>
              </CardHeader>
              <CardContent>
                {categoryStats.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Chưa có dữ liệu
                  </div>
                ) : (
                  <div className="space-y-3">
                    {categoryStats.map((cat) => (
                      <div key={cat.category} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cat.color }}
                            />
                            <span>{cat.category}</span>
                          </div>
                          <span className="font-medium">{cat.count} ({cat.percentage}%)</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
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
              </CardContent>
            </Card>
          </div>

          {/* Rack Utilization Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Chi tiết sử dụng kệ
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rackUtilization.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Chưa có kệ nào
                </div>
              ) : (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left p-2 font-medium text-muted-foreground">Tên kệ</th>
                        <th className="text-center p-2 font-medium text-muted-foreground">Đã dùng</th>
                        <th className="text-center p-2 font-medium text-muted-foreground">Sức chứa</th>
                        <th className="text-center p-2 font-medium text-muted-foreground">Tỷ lệ</th>
                        <th className="text-center p-2 font-medium text-muted-foreground">Trạng thái</th>
                        <th className="text-right p-2 font-medium text-muted-foreground"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {rackUtilization.map((rack) => (
                        <tr key={rack.rackId} className="border-b border-border/50 hover:bg-muted/50">
                          <td className="p-2 font-medium">{rack.rackName}</td>
                          <td className="p-2 text-center">{rack.used}</td>
                          <td className="p-2 text-center">{rack.capacity}</td>
                          <td className="p-2 text-center">{Math.round(rack.fillRate * 100)}%</td>
                          <td className="p-2 text-center">
                            <Badge 
                              variant="outline"
                              style={{ 
                                borderColor: fillRateColors[rack.status],
                                color: fillRateColors[rack.status],
                                backgroundColor: `${fillRateColors[rack.status]}15`
                              }}
                            >
                              {rack.status === 'low' ? 'Còn chỗ' : rack.status === 'medium' ? 'Vừa' : 'Đầy'}
                            </Badge>
                          </td>
                          <td className="p-2 text-right">
                            {onViewRack && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-7 text-xs"
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
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
};

export default StatsDashboard;

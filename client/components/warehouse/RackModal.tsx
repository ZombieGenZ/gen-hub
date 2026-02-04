'use client';

import { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  RackConfig, BoxItem, BoxCategory, categoryLabels, categoryColors,
  getFillRateStatus, fillRateColors, fillRateLabels 
} from '@/types/warehouse';
import { Package, Trash2, Copy, RotateCw, MapPin, Layers, Weight } from 'lucide-react';

interface RackModalProps {
  open: boolean;
  onClose: () => void;
  rack: RackConfig | null;
  boxes: BoxItem[];
  onAddBox: (count: number, category: BoxCategory) => void;
  onRemoveBox: (boxId: string) => void;
  onRemoveAllBoxes: () => void;
  onDuplicateBox: (boxId: string) => void;
  onRotateRack: (rackId: string) => void;
  onCloneRack: (rackId: string) => void;
  onDeleteRack: () => void;
}

const RackModal = ({
  open,
  onClose,
  rack,
  boxes,
  onAddBox,
  onRemoveBox,
  onRemoveAllBoxes,
  onDuplicateBox,
  onRotateRack,
  onCloneRack,
  onDeleteRack,
}: RackModalProps) => {
  const rackBoxes = useMemo(() => {
    if (!rack) return [];
    return boxes.filter((b) => b.rackId === rack.id);
  }, [rack, boxes]);

  const stats = useMemo(() => {
    if (!rack) return null;
    const capacity = rack.rows * rack.columns * rack.levels;
    const boxCount = rackBoxes.length;
    const fillRate = capacity > 0 ? boxCount / capacity : 0;
    const status = getFillRateStatus(fillRate);
    
    const categories = rackBoxes.reduce((acc, box) => {
      acc[box.category] = (acc[box.category] || 0) + 1;
      return acc;
    }, {} as Partial<Record<BoxCategory, number>>);
    
    const totalWeight = rackBoxes.reduce((sum, box) => sum + (box.weight || 0), 0);
    
    return { capacity, boxCount, fillRate, status, categories, totalWeight };
  }, [rack, rackBoxes]);

  if (!rack || !stats) return null;

  const categories: BoxCategory[] = ['electronics', 'food', 'clothing', 'fragile', 'heavy', 'standard'];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] backdrop-blur-md bg-card/95 border-border overflow-hidden flex flex-col">
        <DialogHeader className="pb-2 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Package className="w-5 h-5 text-primary" />
            {rack.name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-2 gap-6 mt-4 px-4">
            {/* Stats Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Kích thước: {rack.columns}x{rack.rows}x{rack.levels}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Vị trí: ({rack.position.x.toFixed(1)}, {rack.position.z.toFixed(1)})</span>
              </div>
              <div className="flex items-center gap-2">
                <Weight className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Tổng trọng lượng: {stats.totalWeight} kg</span>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tỷ lệ lấp đầy:</span>
                <Badge 
                  variant="secondary"
                  className="px-2 py-0.5 text-xs"
                  style={{ 
                    backgroundColor: fillRateColors[stats.status],
                    color: stats.status === 'low' || stats.status === 'overfilled' ? '#000' : '#fff'
                  }}
                >
                  {Math.round(stats.fillRate * 100)}% - {fillRateLabels[stats.status]}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Số thùng:</span>
                <span className="text-sm font-medium">{stats.boxCount} / {stats.capacity}</span>
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Category breakdown */}
          <div className="px-4">
            <h4 className="text-sm font-semibold mb-2">Phân loại hàng hóa</h4>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const count = stats.categories[cat] || 0;
                if (count === 0) return null;
                return (
                  <Badge
                    key={cat}
                    variant="outline"
                    className="px-2 py-0.5 text-xs"
                    style={{ borderColor: categoryColors[cat], color: categoryColors[cat] }}
                  >
                    {categoryLabels[cat]}: {count}
                  </Badge>
                );
              })}
              {Object.keys(stats.categories).length === 0 && (
                <span className="text-xs text-muted-foreground">Chưa có hàng</span>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Quick Add Boxes */}
          <div className="px-4">
            <h4 className="text-sm font-semibold mb-2">Thêm nhanh thùng hàng</h4>
            <div className="grid grid-cols-3 gap-3">
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant="outline"
                  size="sm"
                  onClick={() => onAddBox(1, cat)}
                  className="h-9 text-xs font-medium hover:bg-muted/50"
                  style={{ borderColor: categoryColors[cat] }}
                >
                  + {categoryLabels[cat]}
                </Button>
              ))}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Box List */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Danh sách thùng hàng ({rackBoxes.length})</h4>
              {rackBoxes.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive" onClick={onRemoveAllBoxes}>
                  <Trash2 className="w-3 h-3 mr-1" />
                  Xóa tất cả
                </Button>
              )}
            </div>
            <ScrollArea className="h-[180px] rounded-md border border-border p-2 bg-muted/10">
              {rackBoxes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-1">
                  <Package className="w-6 h-6 opacity-20" />
                  <span className="text-xs">Kệ trống - chưa có thùng hàng</span>
                </div>
              ) : (
                <div className="space-y-1">
                  {rackBoxes.map((box) => (
                    <div
                      key={box.id}
                      className="flex items-center justify-between p-2 rounded bg-card border border-border/50 hover:border-border transition-colors shadow-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shadow-sm"
                          style={{ backgroundColor: categoryColors[box.category] }}
                        />
                        <span className="text-xs font-mono font-medium">{box.name}</span>
                        <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground hover:bg-muted">
                          L{box.level + 1} R{box.row + 1} C{box.column + 1}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-background" onClick={() => onDuplicateBox(box.id)}>
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:bg-destructive/10" onClick={() => onRemoveBox(box.id)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Rack Actions */}
        <div className="flex items-center gap-3 px-4 py-3 border-t flex-shrink-0 bg-card/50">
          <Button variant="outline" size="sm" className="h-9" onClick={() => onRotateRack(rack.id)}>
            <RotateCw className="w-3 h-3 mr-2" />
            Xoay
          </Button>
          <Button variant="outline" size="sm" className="h-9" onClick={() => onCloneRack(rack.id)}>
            <Copy className="w-3 h-3 mr-2" />
            Nhân
          </Button>
          <div className="flex-1" />
          <Button variant="destructive" size="sm" className="h-9" onClick={onDeleteRack}>
            <Trash2 className="w-3 h-3 mr-2" />
            Xóa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RackModal;

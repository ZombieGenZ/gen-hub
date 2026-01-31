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
      <DialogContent className="max-w-2xl max-h-[85vh] backdrop-blur-md bg-card/95 border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            {rack.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4 mt-2">
          {/* Stats Section */}
          <div className="space-y-3">
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

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Tỷ lệ lấp đầy:</span>
              <Badge 
                variant="secondary"
                style={{ 
                  backgroundColor: fillRateColors[stats.status],
                  color: stats.status === 'low' || stats.status === 'empty' ? '#000' : '#fff'
                }}
              >
                {Math.round(stats.fillRate * 100)}% - {fillRateLabels[stats.status]}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Số thùng:</span>
              <span className="font-medium">{stats.boxCount} / {stats.capacity}</span>
            </div>
          </div>
        </div>

        <Separator className="my-3" />

        {/* Category breakdown */}
        <div>
          <h4 className="text-sm font-medium mb-2">Phân loại hàng hóa</h4>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const count = stats.categories[cat] || 0;
              if (count === 0) return null;
              return (
                <Badge
                  key={cat}
                  variant="outline"
                  style={{ borderColor: categoryColors[cat], color: categoryColors[cat] }}
                >
                  {categoryLabels[cat]}: {count}
                </Badge>
              );
            })}
            {Object.keys(stats.categories).length === 0 && (
              <span className="text-sm text-muted-foreground">Chưa có hàng</span>
            )}
          </div>
        </div>

        <Separator className="my-3" />

        {/* Quick Add Boxes */}
        <div>
          <h4 className="text-sm font-medium mb-2">Thêm nhanh thùng hàng</h4>
          <div className="grid grid-cols-3 gap-2">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant="outline"
                size="sm"
                onClick={() => onAddBox(1, cat)}
                className="text-xs"
                style={{ borderColor: categoryColors[cat] }}
              >
                + {categoryLabels[cat]}
              </Button>
            ))}
          </div>
        </div>

        <Separator className="my-3" />

        {/* Box List */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium">Danh sách thùng hàng ({rackBoxes.length})</h4>
            {rackBoxes.length > 0 && (
              <Button variant="ghost" size="sm" className="text-destructive text-xs" onClick={onRemoveAllBoxes}>
                <Trash2 className="w-3 h-3 mr-1" />
                Xóa tất cả
              </Button>
            )}
          </div>
          <ScrollArea className="h-40 rounded border border-border p-2">
            {rackBoxes.length === 0 ? (
              <div className="text-center text-muted-foreground text-sm py-8">
                Kệ trống - chưa có thùng hàng
              </div>
            ) : (
              <div className="space-y-1">
                {rackBoxes.map((box) => (
                  <div
                    key={box.id}
                    className="flex items-center justify-between p-2 rounded bg-muted/50 hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: categoryColors[box.category] }}
                      />
                      <span className="text-xs font-mono">{box.name}</span>
                      <Badge variant="outline" className="text-[10px]">
                        L{box.level + 1} R{box.row + 1} C{box.column + 1}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDuplicateBox(box.id)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemoveBox(box.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        <Separator className="my-3" />

        {/* Rack Actions */}
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => onRotateRack(rack.id)}>
            <RotateCw className="w-4 h-4 mr-1" />
            Xoay 90°
          </Button>
          <Button variant="outline" size="sm" onClick={() => onCloneRack(rack.id)}>
            <Copy className="w-4 h-4 mr-1" />
            Nhân đôi
          </Button>
          <div className="flex-1" />
          <Button variant="destructive" size="sm" onClick={onDeleteRack}>
            <Trash2 className="w-4 h-4 mr-1" />
            Xóa kệ
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RackModal;

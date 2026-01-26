'use client';

import { useEffect, useMemo, useRef } from 'react';
import { RackConfig, BoxItem } from '@/types/warehouse';

interface RackTooltipProps {
  rack: RackConfig | null;
  boxes: BoxItem[];
}

const RackTooltip = ({ rack, boxes }: RackTooltipProps) => {
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Track pointer position without re-rendering the whole scene
  const targetPositionRef = useRef({ x: 0, y: 0 });
  const currentPositionRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef<number | undefined>(undefined);

  const rackId = rack?.id ?? null;
  const rackBoxes = useMemo(
    () => (rackId ? boxes.filter((b) => b.rackId === rackId) : []),
    [boxes, rackId]
  );

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      targetPositionRef.current.x = e.clientX + 16;
      targetPositionRef.current.y = e.clientY + 16;
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => window.removeEventListener('pointermove', handlePointerMove);
  }, []);

  useEffect(() => {
    const ease = 0.18;

    const animate = () => {
      const cur = currentPositionRef.current;
      const target = targetPositionRef.current;

      cur.x += (target.x - cur.x) * ease;
      cur.y += (target.y - cur.y) * ease;

      if (tooltipRef.current) {
        tooltipRef.current.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0)`;
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!rack) return null;

  const totalCapacity = rack.rows * rack.columns * rack.levels;
  const usedSlots = rackBoxes.length;
  const fillRate = totalCapacity > 0 ? Math.round((usedSlots / totalCapacity) * 100) : 0;
  const totalWeight = rackBoxes.reduce((sum, b) => sum + (b.weight || 0), 0);

  // Thống kê theo category
  const categoryStats = rackBoxes.reduce((acc, box) => {
    acc[box.category] = (acc[box.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryLabels: Record<string, string> = {
    electronics: 'Điện tử',
    fragile: 'Dễ vỡ',
    heavy: 'Nặng',
    perishable: 'Dễ hỏng',
    standard: 'Tiêu chuẩn',
  };

  return (
    <div
      ref={tooltipRef}
      className="fixed pointer-events-none z-[9999] will-change-transform"
      style={{ left: 0, top: 0 }}
    >
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl p-4 min-w-[240px] max-w-[300px]">
        {/* Header */}
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: rack.color }} />
          <h3 className="font-bold text-foreground text-sm">{rack.name}</h3>
          <span className="ml-auto text-xs text-muted-foreground">ID: {rack.id.slice(0, 6)}</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-xs text-muted-foreground">Kích thước</div>
            <div className="font-semibold text-foreground text-sm">
              {rack.columns} × {rack.rows} × {rack.levels}
            </div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2">
            <div className="text-xs text-muted-foreground">Vị trí</div>
            <div className="font-semibold text-foreground text-sm">
              ({rack.position.x.toFixed(1)}, {rack.position.z.toFixed(1)})
            </div>
          </div>
        </div>

        {/* Capacity Bar */}
        <div className="mb-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Tỷ lệ lấp đầy</span>
            <span className="font-bold text-foreground">{fillRate}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full transition-all duration-300 rounded-full bg-primary"
              style={{ width: `${fillRate}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-1 text-muted-foreground">
            <span>
              {usedSlots} / {totalCapacity} ô
            </span>
            <span>{totalWeight.toFixed(1)} kg</span>
          </div>
        </div>

        {/* Category Distribution */}
        {Object.keys(categoryStats).length > 0 && (
          <div className="border-t border-border pt-2">
            <div className="text-xs text-muted-foreground mb-2">Phân loại hàng</div>
            <div className="flex flex-wrap gap-1">
              {Object.entries(categoryStats).map(([category, count]) => (
                <span
                  key={category}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary"
                >
                  {categoryLabels[category] || category}: {count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {usedSlots === 0 && (
          <div className="text-center py-2 text-xs text-muted-foreground italic">
            Kệ trống - Chưa có hàng
          </div>
        )}
      </div>
    </div>
  );
};

export default RackTooltip;

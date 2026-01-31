'use client';

import { Mouse, ZoomIn, Hand, MousePointerClick, Keyboard } from 'lucide-react';

const ControlsHint = () => {
  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 p-3 rounded-xl shadow-lg text-xs">
      <h4 className="font-semibold mb-2 text-muted-foreground uppercase tracking-wide text-[10px]">
        Điều khiển
      </h4>
      <div className="space-y-1.5 text-muted-foreground">
        <div className="flex items-center gap-2 hover:text-foreground transition-colors">
          <Mouse className="w-3.5 h-3.5 text-primary" />
          <span>Chuột trái: Xoay</span>
        </div>
        <div className="flex items-center gap-2 hover:text-foreground transition-colors">
          <Hand className="w-3.5 h-3.5 text-primary" />
          <span>Chuột phải: Di chuyển</span>
        </div>
        <div className="flex items-center gap-2 hover:text-foreground transition-colors">
          <ZoomIn className="w-3.5 h-3.5 text-primary" />
          <span>Cuộn: Zoom</span>
        </div>
        <div className="flex items-center gap-2 hover:text-foreground transition-colors">
          <MousePointerClick className="w-3.5 h-3.5 text-primary" />
          <span>Click: Chọn kệ/thùng</span>
        </div>
        <div className="flex items-center gap-2 hover:text-foreground transition-colors">
          <MousePointerClick className="w-3.5 h-3.5 text-yellow-500" />
          <span>Double-click: Mở modal</span>
        </div>
        <div className="flex items-center gap-2 hover:text-foreground transition-colors">
          <Keyboard className="w-3.5 h-3.5 text-green-500" />
          <span>Ctrl + Kéo: Di chuyển kệ</span>
        </div>
      </div>
    </div>
  );
};

export default ControlsHint;

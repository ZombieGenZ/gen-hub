'use client';

import { Mouse, Move, ZoomIn, Hand, MousePointerClick, Keyboard } from 'lucide-react';

const ControlsHint = () => {
  return (
    <div className="bg-card/95 backdrop-blur-md border border-border/50 p-3 rounded-xl shadow-lg text-xs">
      <h4 className="font-semibold mb-2 text-muted-foreground uppercase tracking-wide text-[10px]">
        Điều khiển Camera
      </h4>
      <div className="space-y-1.5 text-muted-foreground">
        <div className="flex items-center gap-2 hover:text-foreground transition-colors">
          <Mouse className="w-3.5 h-3.5 text-primary" />
          <span>Chuột trái: Xoay camera</span>
        </div>
        <div className="flex items-center gap-2 hover:text-foreground transition-colors">
          <Hand className="w-3.5 h-3.5 text-primary" />
          <span>Chuột phải: Di chuyển ngang</span>
        </div>
        <div className="flex items-center gap-2 hover:text-foreground transition-colors">
          <ZoomIn className="w-3.5 h-3.5 text-primary" />
          <span>Lăn chuột: Phóng to/thu nhỏ</span>
        </div>
        <div className="flex items-center gap-2 hover:text-foreground transition-colors">
          <Keyboard className="w-3.5 h-3.5 text-blue-400" />
          <span>W/A/S/D: Di chuyển camera</span>
        </div>
        <div className="flex items-center gap-2 hover:text-foreground transition-colors">
          <Keyboard className="w-3.5 h-3.5 text-blue-400" />
          <span>Q/E: Lên/Xuống</span>
        </div>
      </div>
      
      <h4 className="font-semibold mt-3 mb-2 text-muted-foreground uppercase tracking-wide text-[10px]">
        Di chuyển Kệ
      </h4>
      <div className="space-y-1.5 text-muted-foreground">
        <div className="flex items-center gap-2 hover:text-foreground transition-colors">
          <MousePointerClick className="w-3.5 h-3.5 text-green-500" />
          <span>Click: Chọn kệ/thùng</span>
        </div>
        <div className="flex items-center gap-2 hover:text-foreground transition-colors">
          <MousePointerClick className="w-3.5 h-3.5 text-yellow-500" />
          <span>Double-click: Mở quản lý kệ</span>
        </div>
        <div className="flex items-center gap-2 hover:text-foreground transition-colors">
          <Move className="w-3.5 h-3.5 text-orange-500" />
          <span>←↑↓→: Di chuyển kệ đã chọn</span>
        </div>
        <div className="flex items-center gap-2 hover:text-foreground transition-colors">
          <Move className="w-3.5 h-3.5 text-orange-500" />
          <span>Shift + ←↑↓→: Nhanh hơn</span>
        </div>
      </div>
    </div>
  );
};

export default ControlsHint;

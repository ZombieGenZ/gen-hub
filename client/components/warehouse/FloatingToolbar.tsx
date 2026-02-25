'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, ScanBarcode, Users
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingToolbarProps {
  onToggleAI: () => void;
  onToggleBarcode: () => void;
  onToggleRealtime: () => void;
  aiOpen: boolean;
  barcodeOpen: boolean;
  realtimeConnected: boolean;
  realtimeUserCount?: number;
}

const FloatingToolbar = ({
  onToggleAI,
  onToggleBarcode,
  onToggleRealtime,
  aiOpen,
  barcodeOpen,
  realtimeConnected,
  realtimeUserCount = 0,
}: FloatingToolbarProps) => {
  // Glass morphism button style - transparent with blur and subtle glow
  const glassButtonStyle = "bg-white/10 backdrop-blur-xl border border-white/30 text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:bg-white/20 hover:border-white/50 hover:shadow-[0_8px_32px_rgba(255,255,255,0.1)]";
  const activeButtonStyle = "bg-white/25 backdrop-blur-xl border border-white/50 text-white shadow-[0_0_20px_rgba(255,255,255,0.3)] ring-2 ring-white/30";

  return (
    <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-3">
      {/* AI Suggest */}
      <button
        className={cn(
          "h-12 w-12 rounded-full shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center",
          aiOpen ? activeButtonStyle : glassButtonStyle
        )}
        onClick={onToggleAI}
      >
        <Sparkles className="w-5 h-5" />
      </button>

      {/* Barcode Scanner */}
      <button
        className={cn(
          "h-12 w-12 rounded-full shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center",
          barcodeOpen ? activeButtonStyle : glassButtonStyle
        )}
        onClick={onToggleBarcode}
      >
        <ScanBarcode className="w-5 h-5" />
      </button>

      {/* Realtime Collaboration */}
      <button
        className={cn(
          "h-12 w-12 rounded-full shadow-xl hover:scale-110 transition-all duration-200 flex items-center justify-center relative",
          realtimeConnected ? activeButtonStyle : glassButtonStyle
        )}
        onClick={onToggleRealtime}
      >
        <Users className="w-5 h-5" />
        {realtimeConnected && (
          <Badge 
            className="absolute -top-1 -right-1 h-5 min-w-5 p-0 flex items-center justify-center text-[10px] bg-green-500 border-0"
          >
            {realtimeUserCount + 1}
          </Badge>
        )}
      </button>
    </div>
  );
};

export default FloatingToolbar;

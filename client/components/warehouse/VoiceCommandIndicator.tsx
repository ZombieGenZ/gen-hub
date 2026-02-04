'use client';

import { memo } from 'react';
import { Mic } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VoiceCommandIndicatorProps {
  isListening: boolean;
  transcript: string;
}

const VoiceCommandIndicator = memo(({ isListening, transcript }: VoiceCommandIndicatorProps) => {
  if (!isListening) return null;

  return (
    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Listening indicator */}
      <div className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-2 rounded-full shadow-lg">
        <div className="relative">
          <Mic className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </div>
        <span className="text-sm font-medium">Đang lắng nghe...</span>
        
        {/* Audio wave animation */}
        <div className="flex items-center gap-0.5 h-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className={cn(
                "w-1 bg-primary-foreground rounded-full",
                "animate-pulse"
              )}
              style={{
                height: `${Math.random() * 12 + 4}px`,
                animationDelay: `${i * 100}ms`,
                animationDuration: '500ms',
              }}
            />
          ))}
        </div>
      </div>

      {/* Transcript display */}
      {transcript && (
        <div className="bg-card/95 backdrop-blur-md border border-border px-4 py-2 rounded-lg shadow-lg max-w-md">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">&quot;{transcript}&quot;</span>
          </p>
        </div>
      )}

      {/* Help text */}
      <div className="text-xs text-muted-foreground bg-card/80 px-3 py-1 rounded-full">
        Thử nói: &quot;Tìm thùng SP-001&quot; hoặc &quot;Highlight kệ A1&quot;
      </div>
    </div>
  );
});

VoiceCommandIndicator.displayName = 'VoiceCommandIndicator';

export default VoiceCommandIndicator;

'use client';

import { memo, useState, useEffect, useMemo } from 'react';
import { Mic, MicOff, Loader2, HelpCircle, ChevronDown, ChevronUp, Sparkles, Volume2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface VoiceCommand {
  action: string;
  description: string;
  examples: string[];
}

interface VoiceCommandIndicatorProps {
  isListening: boolean;
  transcript: string;
  isProcessing?: boolean;
  lastCommand?: string;
  confidence?: number;
  availableCommands?: VoiceCommand[];
  onExecuteTextCommand?: (text: string) => void;
}

// Categorized command suggestions
const COMMAND_CATEGORIES = [
  {
    name: '🔍 Tìm kiếm',
    commands: [
      { text: 'Tìm thùng SP-001', description: 'Tìm kiếm thùng hàng' },
      { text: 'Chọn kệ A1', description: 'Chọn và highlight kệ' },
      { text: 'Mở kệ B2', description: 'Mở chi tiết kệ' },
    ],
  },
  {
    name: '📦 Quản lý kệ',
    commands: [
      { text: 'Tạo kệ 2x3x4', description: 'Tạo kệ mới' },
      { text: 'Xoay kệ', description: 'Xoay kệ đang chọn' },
      { text: 'Nhân đôi kệ', description: 'Clone kệ' },
      { text: 'Xóa kệ', description: 'Xóa kệ đang chọn' },
    ],
  },
  {
    name: '📋 Thùng hàng',
    commands: [
      { text: 'Thêm 10 thùng', description: 'Thêm thùng tiêu chuẩn' },
      { text: 'Thêm 5 thùng dễ vỡ', description: 'Thêm hàng fragile' },
      { text: 'Thêm thùng điện tử', description: 'Thêm electronics' },
      { text: 'Thêm thùng thực phẩm', description: 'Thêm food' },
      { text: 'Xóa tất cả thùng', description: 'Clear boxes' },
    ],
  },
  {
    name: '👁️ Hiển thị',
    commands: [
      { text: 'Chế độ loại', description: 'View by category' },
      { text: 'Chế độ nhiệt', description: 'Heatmap view' },
      { text: 'Bật lưới', description: 'Toggle grid' },
      { text: 'Bật trục', description: 'Toggle axes' },
      { text: 'Tắt mái', description: 'Hide roof' },
    ],
  },
  {
    name: '📊 Panels',
    commands: [
      { text: 'Mở thống kê', description: 'Stats dashboard' },
      { text: 'Mở cảnh báo', description: 'Alerts panel' },
      { text: 'Mở AI', description: 'AI assistant' },
      { text: 'Quét mã vạch', description: 'Barcode scanner' },
    ],
  },
  {
    name: '⚙️ Cài đặt',
    commands: [
      { text: 'Chế độ hiệu suất', description: 'Performance mode' },
      { text: 'Bật FPS', description: 'Show FPS counter' },
      { text: 'Tải demo', description: 'Load demo data' },
      { text: 'Xuất dữ liệu', description: 'Export data' },
    ],
  },
];

// Audio wave component with realistic animation
const AudioWave = memo(({ isActive }: { isActive: boolean }) => {
  const [heights, setHeights] = useState([4, 8, 12, 8, 4]);

  useEffect(() => {
    if (!isActive) return;

    const interval = setInterval(() => {
      setHeights([
        Math.random() * 12 + 4,
        Math.random() * 16 + 6,
        Math.random() * 20 + 8,
        Math.random() * 16 + 6,
        Math.random() * 12 + 4,
      ]);
    }, 150);

    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex items-center gap-0.5 h-5">
      {heights.map((height, i) => (
        <div
          key={i}
          className={cn(
            'w-1 rounded-full transition-all duration-150',
            isActive ? 'bg-primary-foreground' : 'bg-primary-foreground/50'
          )}
          style={{ height: `${height}px` }}
        />
      ))}
    </div>
  );
});
AudioWave.displayName = 'AudioWave';

// Quick command button
const QuickCommandButton = memo(
  ({
    command,
    onExecute,
  }: {
    command: { text: string; description: string };
    onExecute: (text: string) => void;
  }) => (
    <button
      onClick={() => onExecute(command.text)}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-card/60 hover:bg-card border border-border/50 hover:border-primary/30 transition-all group text-left"
    >
      <Volume2 className="w-3 h-3 text-muted-foreground group-hover:text-primary" />
      <span className="text-xs font-medium text-foreground">{command.text}</span>
      <span className="text-[10px] text-muted-foreground hidden sm:inline">
        - {command.description}
      </span>
    </button>
  )
);
QuickCommandButton.displayName = 'QuickCommandButton';

const VoiceCommandIndicator = memo(
  ({
    isListening,
    transcript,
    isProcessing = false,
    lastCommand = '',
    confidence = 0,
    availableCommands = [],
    onExecuteTextCommand,
  }: VoiceCommandIndicatorProps) => {
    const [showHelp, setShowHelp] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState(0);

    // Rotate through suggestions
    const [suggestionIndex, setSuggestionIndex] = useState(0);
    const allSuggestions = useMemo(
      () => COMMAND_CATEGORIES.flatMap((cat) => cat.commands),
      []
    );

    useEffect(() => {
      if (!isListening) return;

      const interval = setInterval(() => {
        setSuggestionIndex((prev) => (prev + 1) % allSuggestions.length);
      }, 4000);

      return () => clearInterval(interval);
    }, [isListening, allSuggestions.length]);

    const handleQuickCommand = (text: string) => {
      if (onExecuteTextCommand) {
        onExecuteTextCommand(text);
      }
    };

    // Show indicator even when not listening - displays shortcut hint
    const currentSuggestion = allSuggestions[suggestionIndex];

    return (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-md">
        {/* Main listening indicator or shortcut hint */}
        <div 
          className={cn(
            "flex items-center gap-3 px-4 py-2.5 rounded-xl shadow-lg transition-all duration-300",
            isListening 
              ? "bg-[#2ea87e] text-white"
              : "bg-[#f8fafb] border border-[#e0ede8] text-[#1a2e25]"
          )}
          style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.10)' }}
        >
          <div className="relative">
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isListening ? (
              <>
                <Mic className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              </>
            ) : (
              <Mic className="w-5 h-5 text-[#4a5568]" />
            )}
          </div>

          <div className="flex flex-col">
            {isListening ? (
              <>
                <span className="text-sm font-medium">
                  {isProcessing ? 'Đang xử lý...' : 'Đang lắng nghe...'}
                </span>
                {confidence > 0 && (
                  <span className="text-[10px] opacity-70">
                    Độ tin cậy: {Math.round(confidence * 100)}%
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm font-medium">
                Nhấn <kbd className="px-1.5 py-0.5 rounded bg-[#e0ede8] text-[#2ea87e] font-mono text-xs mx-1">Ctrl+M</kbd> để nói
              </span>
            )}
          </div>

          {isListening && <AudioWave isActive={!isProcessing} />}

          {/* Help toggle button */}
          {isListening && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 hover:bg-white/20 rounded-full"
              onClick={() => setShowHelp(!showHelp)}
            >
              {showHelp ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <HelpCircle className="w-4 h-4" />
              )}
            </Button>
          )}
        </div>

        {/* Transcript display */}
        {isListening && transcript && (
          <div 
            className="px-4 py-2.5 rounded-xl shadow-lg max-w-md"
            style={{ 
              background: '#f8fafb', 
              border: '1px solid #e0ede8',
              boxShadow: '0 4px 24px rgba(0,0,0,0.10)' 
            }}
          >
            <p className="text-sm">
              <span style={{ color: '#4a5568' }}>Bạn nói: </span>
              <span className="font-medium" style={{ color: '#1a2e25' }}>&quot;{transcript}&quot;</span>
            </p>
          </div>
        )}

        {/* Last command feedback */}
        {isListening && lastCommand && !transcript && (
          <div 
            className="px-4 py-2 rounded-xl"
            style={{ background: '#dcfce7', border: '1px solid #86efac' }}
          >
            <p className="text-xs text-green-700 flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Đã thực hiện: {lastCommand.replace(/_/g, ' ')}
            </p>
          </div>
        )}

        {/* Dynamic suggestion when listening */}
        {isListening && !showHelp && !transcript && (
          <div className="flex flex-wrap items-center gap-2">
            <span 
              className="text-xs px-3 py-1.5 rounded-full"
              style={{ background: '#f8fafb', border: '1px solid #e0ede8', color: '#4a5568' }}
            >
              💬 Thử nói: &quot;{currentSuggestion.text}&quot;
            </span>
            <button
              onClick={() => setShowHelp(true)}
              className="text-xs px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
              style={{ background: '#e0ede8', color: '#2ea87e' }}
            >
              <ChevronUp className="w-3 h-3" />
              Xem lệnh
            </button>
          </div>
        )}

        {/* Help panel */}
        {isListening && showHelp && (
          <div 
            className="w-full rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-200"
            style={{ 
              background: '#f8fafb', 
              border: '1px solid #e0ede8',
              boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
              maxWidth: '420px',
              maxHeight: '60vh',
              overflowY: 'auto'
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#1a2e25' }}>
                <Sparkles className="w-4 h-4" style={{ color: '#2ea87e' }} />
                Lệnh giọng nói AI
              </h3>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => setShowHelp(false)}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
            </div>

            {/* Category tabs */}
            <div className="flex gap-1 mb-3 overflow-x-auto pb-2 scrollbar-thin">
              {COMMAND_CATEGORIES.map((cat, idx) => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(idx)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs whitespace-nowrap transition-all',
                    selectedCategory === idx
                      ? 'text-white'
                      : 'text-[#4a5568]'
                  )}
                  style={{ 
                    background: selectedCategory === idx ? '#2ea87e' : '#e0ede8',
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Commands grid */}
            <div className="grid grid-cols-1 gap-2">
              {COMMAND_CATEGORIES[selectedCategory].commands.map((cmd) => (
                <QuickCommandButton
                  key={cmd.text}
                  command={cmd}
                  onExecute={handleQuickCommand}
                />
              ))}
            </div>

            <p className="text-[10px] mt-3 text-center" style={{ color: '#4a5568' }}>
              💡 Nhấp vào lệnh hoặc nói trực tiếp để thực hiện
            </p>
          </div>
        )}
      </div>
    );
  }
);

VoiceCommandIndicator.displayName = 'VoiceCommandIndicator';

export default VoiceCommandIndicator;

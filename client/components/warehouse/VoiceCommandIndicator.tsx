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

    if (!isListening) return null;

    const currentSuggestion = allSuggestions[suggestionIndex];

    return (
      <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 max-w-2xl w-full px-4">
        {/* Help panel */}
        {showHelp && (
          <div className="w-full bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
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
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>

            {/* Commands grid */}
            <div className="grid grid-cols-2 gap-2">
              {COMMAND_CATEGORIES[selectedCategory].commands.map((cmd) => (
                <QuickCommandButton
                  key={cmd.text}
                  command={cmd}
                  onExecute={handleQuickCommand}
                />
              ))}
            </div>

            <p className="text-[10px] text-muted-foreground mt-3 text-center">
              💡 Nhấp vào lệnh hoặc nói trực tiếp để thực hiện
            </p>
          </div>
        )}

        {/* Main listening indicator */}
        <div className="flex items-center gap-3 bg-primary text-primary-foreground px-4 py-2.5 rounded-full shadow-lg">
          <div className="relative">
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Mic className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
              </>
            )}
          </div>

          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {isProcessing ? 'Đang xử lý...' : 'Đang lắng nghe...'}
            </span>
            {confidence > 0 && (
              <span className="text-[10px] text-primary-foreground/70">
                Độ tin cậy: {Math.round(confidence * 100)}%
              </span>
            )}
          </div>

          <AudioWave isActive={isListening && !isProcessing} />

          {/* Help toggle button */}
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-primary-foreground/20 rounded-full"
            onClick={() => setShowHelp(!showHelp)}
          >
            {showHelp ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <HelpCircle className="w-4 h-4" />
            )}
          </Button>
        </div>

        {/* Transcript display */}
        {transcript && (
          <div className="bg-card/95 backdrop-blur-md border border-border px-4 py-2.5 rounded-lg shadow-lg max-w-md">
            <p className="text-sm">
              <span className="text-muted-foreground">Bạn nói: </span>
              <span className="font-medium text-foreground">&quot;{transcript}&quot;</span>
            </p>
          </div>
        )}

        {/* Last command feedback */}
        {lastCommand && !transcript && (
          <div className="bg-green-500/10 border border-green-500/30 px-4 py-2 rounded-lg">
            <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-2">
              <Sparkles className="w-3 h-3" />
              Đã thực hiện: {lastCommand.replace(/_/g, ' ')}
            </p>
          </div>
        )}

        {/* Dynamic suggestion */}
        {!showHelp && !transcript && (
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground bg-card/80 px-3 py-1.5 rounded-full">
              💬 Thử nói: &quot;{currentSuggestion.text}&quot;
            </span>
            <button
              onClick={() => setShowHelp(true)}
              className="text-xs text-primary hover:text-primary/80 bg-primary/10 px-3 py-1.5 rounded-full flex items-center gap-1 transition-colors"
            >
              <ChevronUp className="w-3 h-3" />
              Xem tất cả lệnh
            </button>
          </div>
        )}
      </div>
    );
  }
);

VoiceCommandIndicator.displayName = 'VoiceCommandIndicator';

export default VoiceCommandIndicator;

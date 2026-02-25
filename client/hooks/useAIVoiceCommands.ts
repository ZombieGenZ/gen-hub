'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { BoxCategory } from '@/types/warehouse';

// ==================== TYPES ====================
interface VoiceCommandConfig {
  patterns: RegExp[];
  action: string;
  description: string;
  examples: string[];
  extract?: (match: RegExpMatchArray, text: string) => Record<string, any>;
}

interface UseAIVoiceCommandsProps {
  // Search & Navigation
  onSearch: (query: string) => void;
  onHighlightRack: (rackId: string) => void;
  onClearSelection: () => void;
  
  // Rack management
  onCreateRack?: (config: { rows: number; columns: number; levels: number }) => void;
  onRemoveRack?: () => void;
  onRotateRack?: (rackId: string) => void;
  onCloneRack?: (rackId: string) => void;
  onShowOnlyRack?: (rackId: string) => void;
  onShowAllRacks?: () => void;
  onOpenRackModal?: (rackId: string) => void;
  
  // Box management
  onAddBoxes?: (count: number, category: BoxCategory) => void;
  onRemoveAllBoxes?: () => void;
  onRemoveSelectedBox?: () => void;
  onDuplicateBox?: (boxId: string) => void;
  
  // View controls
  onToggleAxes?: () => void;
  onToggleGrid?: () => void;
  onSetViewMode?: (mode: 'default' | 'category' | 'heatmap') => void;
  onFilterCategory?: (category: BoxCategory | 'all') => void;
  
  // Environment
  onCreateBackground?: () => void;
  onRemoveBackground?: () => void;
  onToggleHumans?: () => void;
  onToggleRoof?: () => void;
  onTogglePerformanceMode?: () => void;
  onToggleFPS?: () => void;
  
  // Data
  onLoadDemoData?: () => void;
  onExportData?: () => void;
  onImportData?: () => void;
  
  // Panels
  onToggleSearch?: () => void;
  onToggleAlerts?: () => void;
  onToggleStats?: () => void;
  onToggleTransactions?: () => void;
  onToggleAI?: () => void;
  onToggleBarcode?: () => void;
  onToggleRealtime?: () => void;
  
  // Mode toggles
  onToggleDragMode?: () => void;
  
  // Data references
  racks: { id: string; name: string }[];
  boxes?: { id: string; name: string; rackId: string }[];
  selectedRack?: string | null;
  selectedBox?: string | null;
}

interface UseAIVoiceCommandsReturn {
  isListening: boolean;
  isSupported: boolean;
  isProcessing: boolean;
  transcript: string;
  lastCommand: string;
  confidence: number;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
  availableCommands: VoiceCommandConfig[];
  executeTextCommand: (text: string) => void;
}

// ==================== VOICE COMMANDS CONFIGURATION ====================
const createVoiceCommands = (props: UseAIVoiceCommandsProps): VoiceCommandConfig[] => {
  return [
    // ===== SEARCH COMMANDS =====
    {
      patterns: [
        /(?:tìm|search|tìm kiếm|tim|tim kiem)\s+(?:thùng|hộp|box)?\s*(.+)/i,
        /(?:where|đâu|ở đâu)\s+(?:is|là)?\s*(.+)/i,
      ],
      action: 'search',
      description: 'Tìm kiếm thùng hàng',
      examples: ['tìm thùng SP-001', 'tìm kiếm laptop', 'where is box A'],
      extract: (match) => ({ query: match[1]?.trim() }),
    },

    // ===== RACK NAVIGATION =====
    {
      patterns: [
        /(?:đi đến|đến|go to|navigate|di chuyen den|chọn|chon|select|xem)\s+(?:kệ|rack|ke)\s*(.+)/i,
        /(?:highlight|làm nổi|lam noi)\s+(?:kệ|rack|ke)\s*(.+)/i,
        /(?:kệ|rack|ke)\s+(.+)/i,
      ],
      action: 'highlight_rack',
      description: 'Chọn và highlight kệ',
      examples: ['đi đến kệ A1', 'chọn kệ B2', 'highlight rack C'],
      extract: (match) => ({ rackQuery: match[1]?.trim().toLowerCase() }),
    },

    {
      patterns: [
        /(?:mở|open|xem chi tiết|chi tiet)\s+(?:kệ|rack|ke)\s*(.+)/i,
        /(?:modal|popup)\s+(?:kệ|rack|ke)\s*(.+)/i,
      ],
      action: 'open_rack_modal',
      description: 'Mở modal chi tiết kệ',
      examples: ['mở kệ A1', 'xem chi tiết kệ B'],
      extract: (match) => ({ rackQuery: match[1]?.trim().toLowerCase() }),
    },

    {
      patterns: [
        /(?:chỉ hiện|chi hien|only show|isolate)\s+(?:kệ|rack|ke)\s*(.+)/i,
        /(?:ẩn|an|hide)\s+(?:các|tất cả)?\s*(?:kệ|rack)\s+(?:khác|khac|other)/i,
      ],
      action: 'show_only_rack',
      description: 'Chỉ hiện một kệ',
      examples: ['chỉ hiện kệ A1', 'isolate rack B'],
      extract: (match) => ({ rackQuery: match[1]?.trim().toLowerCase() }),
    },

    {
      patterns: [
        /(?:hiện|hien|show)\s+(?:tất cả|tat ca|all)\s*(?:kệ|rack|ke)?/i,
        /(?:bỏ lọc|bo loc|clear filter|reset)/i,
      ],
      action: 'show_all_racks',
      description: 'Hiển thị tất cả kệ',
      examples: ['hiện tất cả kệ', 'show all racks', 'bỏ lọc'],
    },

    // ===== RACK MANAGEMENT =====
    {
      patterns: [
        /(?:tạo|tao|thêm|them|create|add)\s+(?:kệ|rack|ke)\s*(?:(\d+)\s*(?:x|nhân|×)\s*(\d+)\s*(?:x|nhân|×)\s*(\d+))?/i,
        /(?:kệ|rack)\s+(?:mới|new)/i,
      ],
      action: 'create_rack',
      description: 'Tạo kệ mới',
      examples: ['tạo kệ', 'thêm kệ 2x3x4', 'create rack'],
      extract: (match) => ({
        rows: parseInt(match[1]) || 2,
        columns: parseInt(match[2]) || 3,
        levels: parseInt(match[3]) || 4,
      }),
    },

    {
      patterns: [
        /(?:xóa|xoa|delete|remove)\s+(?:kệ|rack|ke)(?:\s+(?:đang chọn|selected))?/i,
      ],
      action: 'remove_rack',
      description: 'Xóa kệ đang chọn',
      examples: ['xóa kệ', 'delete rack'],
    },

    {
      patterns: [
        /(?:xoay|rotate|quay)\s+(?:kệ|rack|ke)(?:\s*(.+))?/i,
      ],
      action: 'rotate_rack',
      description: 'Xoay kệ',
      examples: ['xoay kệ', 'rotate rack A1'],
      extract: (match) => ({ rackQuery: match[1]?.trim().toLowerCase() }),
    },

    {
      patterns: [
        /(?:nhân đôi|nhan doi|clone|duplicate|copy)\s+(?:kệ|rack|ke)(?:\s*(.+))?/i,
      ],
      action: 'clone_rack',
      description: 'Nhân đôi kệ',
      examples: ['nhân đôi kệ', 'clone rack A1'],
      extract: (match) => ({ rackQuery: match[1]?.trim().toLowerCase() }),
    },

    // ===== BOX MANAGEMENT =====
    {
      patterns: [
        /(?:thêm|them|add)\s+(\d+)?\s*(?:thùng|hộp|box|hop)(?:\s+(?:loại|type|category)\s*(.+))?/i,
        /(?:thêm|them|add)\s+(?:thùng|hộp|box)\s*(.+)?/i,
      ],
      action: 'add_boxes',
      description: 'Thêm thùng hàng',
      examples: ['thêm 10 thùng', 'add 5 box fragile', 'thêm thùng loại điện tử'],
      extract: (match, text) => {
        const count = parseInt(match[1]) || 10;
        const categoryMap: Record<string, BoxCategory> = {
          'tiêu chuẩn': 'standard', 'standard': 'standard', 'thường': 'standard',
          'dễ vỡ': 'fragile', 'fragile': 'fragile', 'mỏng manh': 'fragile',
          'điện tử': 'electronics', 'electronics': 'electronics', 'điện': 'electronics',
          'thực phẩm': 'food', 'food': 'food', 'đồ ăn': 'food',
          'quần áo': 'clothing', 'clothing': 'clothing', 'vải': 'clothing',
          'nặng': 'heavy', 'heavy': 'heavy', 'cồng kềnh': 'heavy',
        };
        
        const categoryText = (match[2] || '').toLowerCase().trim();
        let category: BoxCategory = 'standard';
        
        for (const [key, value] of Object.entries(categoryMap)) {
          if (categoryText.includes(key) || text.toLowerCase().includes(key)) {
            category = value;
            break;
          }
        }
        
        return { count, category };
      },
    },

    {
      patterns: [
        /(?:xóa|xoa|delete|remove)\s+(?:tất cả|all|tat ca)?\s*(?:thùng|hộp|box)/i,
        /(?:dọn|don|clear)\s+(?:thùng|hộp|box)/i,
      ],
      action: 'remove_all_boxes',
      description: 'Xóa tất cả thùng',
      examples: ['xóa tất cả thùng', 'clear boxes'],
    },

    {
      patterns: [
        /(?:xóa|xoa|delete|remove)\s+(?:thùng|hộp|box)\s+(?:đang chọn|selected|này)/i,
      ],
      action: 'remove_selected_box',
      description: 'Xóa thùng đang chọn',
      examples: ['xóa thùng đang chọn', 'delete selected box'],
    },

    // ===== VIEW CONTROLS =====
    {
      patterns: [
        /(?:bật|bat|on|show|hiện|hien)\s+(?:trục|truc|axes|axis)/i,
        /(?:tắt|tat|off|hide|ẩn|an)\s+(?:trục|truc|axes|axis)/i,
        /(?:toggle|chuyển)\s+(?:trục|truc|axes)/i,
      ],
      action: 'toggle_axes',
      description: 'Bật/tắt trục tọa độ',
      examples: ['bật trục', 'tắt axes', 'toggle trục'],
    },

    {
      patterns: [
        /(?:bật|bat|on|show|hiện|hien)\s+(?:lưới|luoi|grid)/i,
        /(?:tắt|tat|off|hide|ẩn|an)\s+(?:lưới|luoi|grid)/i,
        /(?:toggle|chuyển)\s+(?:lưới|luoi|grid)/i,
      ],
      action: 'toggle_grid',
      description: 'Bật/tắt lưới',
      examples: ['bật lưới', 'tắt grid', 'toggle lưới'],
    },

    {
      patterns: [
        /(?:chế độ|che do|mode|view)\s+(?:mặc định|mac dinh|default|bình thường)/i,
      ],
      action: 'view_default',
      description: 'Chế độ xem mặc định',
      examples: ['chế độ mặc định', 'mode default'],
    },

    {
      patterns: [
        /(?:chế độ|che do|mode|view)\s+(?:loại|category|danh mục)/i,
        /(?:hiện|hien|show)\s+(?:theo|by)\s+(?:loại|category)/i,
      ],
      action: 'view_category',
      description: 'Xem theo loại hàng',
      examples: ['chế độ loại', 'view by category'],
    },

    {
      patterns: [
        /(?:chế độ|che do|mode|view)\s+(?:nhiệt|heat|heatmap|nhiet)/i,
        /(?:bản đồ|ban do)\s+(?:nhiệt|nhiet|heat)/i,
      ],
      action: 'view_heatmap',
      description: 'Xem bản đồ nhiệt',
      examples: ['chế độ nhiệt', 'view heatmap'],
    },

    // ===== FILTER BY CATEGORY =====
    {
      patterns: [
        /(?:lọc|loc|filter)\s+(?:theo)?\s*(?:loại|type|category)?\s*(?:tiêu chuẩn|standard|thường)/i,
      ],
      action: 'filter_standard',
      description: 'Lọc hàng tiêu chuẩn',
      examples: ['lọc tiêu chuẩn', 'filter standard'],
    },

    {
      patterns: [
        /(?:lọc|loc|filter)\s+(?:theo)?\s*(?:loại|type|category)?\s*(?:dễ vỡ|fragile)/i,
      ],
      action: 'filter_fragile',
      description: 'Lọc hàng dễ vỡ',
      examples: ['lọc dễ vỡ', 'filter fragile'],
    },

    {
      patterns: [
        /(?:lọc|loc|filter)\s+(?:theo)?\s*(?:loại|type|category)?\s*(?:điện tử|electronics|điện)/i,
      ],
      action: 'filter_electronics',
      description: 'Lọc hàng điện tử',
      examples: ['lọc điện tử', 'filter electronics'],
    },

    {
      patterns: [
        /(?:lọc|loc|filter)\s+(?:theo)?\s*(?:loại|type|category)?\s*(?:thực phẩm|food|đồ ăn)/i,
      ],
      action: 'filter_food',
      description: 'Lọc thực phẩm',
      examples: ['lọc thực phẩm', 'filter food'],
    },

    {
      patterns: [
        /(?:bỏ|bo|xóa|clear)\s+(?:lọc|loc|filter)/i,
        /(?:hiện|show)\s+(?:tất cả|all)\s+(?:loại|type)/i,
      ],
      action: 'filter_all',
      description: 'Bỏ lọc loại hàng',
      examples: ['bỏ lọc', 'hiện tất cả loại'],
    },

    // ===== ENVIRONMENT =====
    {
      patterns: [
        /(?:bật|bat|on|show|hiện|hien|tạo|tao)\s+(?:nền|nen|background|môi trường|environment)/i,
      ],
      action: 'create_background',
      description: 'Hiện nền kho',
      examples: ['bật nền', 'show background'],
    },

    {
      patterns: [
        /(?:tắt|tat|off|hide|ẩn|an|xóa)\s+(?:nền|nen|background|môi trường)/i,
      ],
      action: 'remove_background',
      description: 'Ẩn nền kho',
      examples: ['tắt nền', 'hide background'],
    },

    {
      patterns: [
        /(?:bật|tắt|toggle)\s+(?:người|human|hình người)/i,
        /(?:hiện|ẩn)\s+(?:người|human)/i,
      ],
      action: 'toggle_humans',
      description: 'Bật/tắt người tham chiếu',
      examples: ['bật người', 'tắt hình người'],
    },

    {
      patterns: [
        /(?:bật|tắt|toggle)\s+(?:mái|roof|nóc)/i,
        /(?:hiện|ẩn)\s+(?:mái|roof)/i,
      ],
      action: 'toggle_roof',
      description: 'Bật/tắt mái nhà',
      examples: ['bật mái', 'tắt roof'],
    },

    {
      patterns: [
        /(?:chế độ|mode)\s+(?:hiệu suất|performance|nhanh)/i,
        /(?:bật|tắt)\s+(?:hiệu suất|performance)/i,
      ],
      action: 'toggle_performance',
      description: 'Bật/tắt chế độ hiệu suất',
      examples: ['chế độ hiệu suất', 'toggle performance'],
    },

    {
      patterns: [
        /(?:bật|tắt|toggle|hiện|ẩn)\s+(?:FPS|fps|frame)/i,
      ],
      action: 'toggle_fps',
      description: 'Bật/tắt FPS counter',
      examples: ['bật FPS', 'toggle fps'],
    },

    // ===== DATA =====
    {
      patterns: [
        /(?:tải|tai|load)\s+(?:demo|mẫu|sample)/i,
        /(?:dữ liệu|data)\s+(?:demo|mẫu)/i,
      ],
      action: 'load_demo',
      description: 'Tải dữ liệu demo',
      examples: ['tải demo', 'load demo data'],
    },

    {
      patterns: [
        /(?:xuất|xuat|export)\s+(?:dữ liệu|data)?/i,
        /(?:lưu|save)\s+(?:dữ liệu|data)/i,
      ],
      action: 'export_data',
      description: 'Xuất dữ liệu',
      examples: ['xuất dữ liệu', 'export data'],
    },

    {
      patterns: [
        /(?:nhập|nhap|import)\s+(?:dữ liệu|data)?/i,
      ],
      action: 'import_data',
      description: 'Nhập dữ liệu',
      examples: ['nhập dữ liệu', 'import data'],
    },

    // ===== PANELS =====
    {
      patterns: [
        /(?:mở|mo|open|bật)\s+(?:tìm kiếm|search|panel search)/i,
        /(?:đóng|dong|close|tắt)\s+(?:tìm kiếm|search)/i,
      ],
      action: 'toggle_search_panel',
      description: 'Mở/đóng panel tìm kiếm',
      examples: ['mở tìm kiếm', 'open search'],
    },

    {
      patterns: [
        /(?:mở|mo|open|bật)\s+(?:cảnh báo|alerts|canh bao)/i,
        /(?:đóng|dong|close|tắt)\s+(?:cảnh báo|alerts)/i,
      ],
      action: 'toggle_alerts_panel',
      description: 'Mở/đóng panel cảnh báo',
      examples: ['mở cảnh báo', 'open alerts'],
    },

    {
      patterns: [
        /(?:mở|mo|open|bật)\s+(?:thống kê|stats|statistics|thong ke)/i,
        /(?:đóng|dong|close|tắt)\s+(?:thống kê|stats)/i,
      ],
      action: 'toggle_stats_panel',
      description: 'Mở/đóng panel thống kê',
      examples: ['mở thống kê', 'open stats'],
    },

    {
      patterns: [
        /(?:mở|mo|open|bật)\s+(?:giao dịch|transactions|giao dich)/i,
        /(?:đóng|dong|close|tắt)\s+(?:giao dịch|transactions)/i,
      ],
      action: 'toggle_transactions_panel',
      description: 'Mở/đóng panel giao dịch',
      examples: ['mở giao dịch', 'open transactions'],
    },

    {
      patterns: [
        /(?:mở|mo|open|bật)\s+(?:AI|trợ lý|assistant)/i,
        /(?:đóng|dong|close|tắt)\s+(?:AI|trợ lý)/i,
      ],
      action: 'toggle_ai_panel',
      description: 'Mở/đóng AI assistant',
      examples: ['mở AI', 'open assistant'],
    },

    {
      patterns: [
        /(?:mở|mo|open|bật)\s+(?:barcode|mã vạch|scanner)/i,
        /(?:quét|scan)\s+(?:barcode|mã vạch)/i,
      ],
      action: 'toggle_barcode_panel',
      description: 'Mở barcode scanner',
      examples: ['mở barcode', 'quét mã vạch'],
    },

    // ===== MODE =====
    {
      patterns: [
        /(?:bật|tắt|toggle)\s+(?:chế độ|mode)?\s*(?:di chuyển|drag|kéo thả)/i,
        /(?:di chuyển|move)\s+(?:kệ|rack)/i,
      ],
      action: 'toggle_drag_mode',
      description: 'Bật/tắt chế độ di chuyển kệ',
      examples: ['bật di chuyển', 'toggle drag mode'],
    },

    // ===== CLEAR/CANCEL =====
    {
      patterns: [
        /(?:bỏ|bo|hủy|huy|cancel|clear)\s+(?:chọn|chon|selection)/i,
        /(?:không|khong)\s+(?:chọn|chon)/i,
      ],
      action: 'clear_selection',
      description: 'Bỏ chọn',
      examples: ['bỏ chọn', 'clear selection'],
    },

    // ===== HELP =====
    {
      patterns: [
        /(?:trợ giúp|help|hướng dẫn|huong dan|commands|lệnh)/i,
        /(?:có thể|can)\s+(?:làm gì|do what)/i,
      ],
      action: 'show_help',
      description: 'Hiện trợ giúp',
      examples: ['trợ giúp', 'help', 'hướng dẫn'],
    },
  ];
};

// ==================== MAIN HOOK ====================
export const useAIVoiceCommands = (
  props: UseAIVoiceCommandsProps
): UseAIVoiceCommandsReturn => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [lastCommand, setLastCommand] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [isSupported, setIsSupported] = useState(false);

  const recognitionRef = useRef<any>(null);
  const commandsRef = useRef<VoiceCommandConfig[]>([]);

  // Update commands when props change
  useEffect(() => {
    commandsRef.current = createVoiceCommands(props);
  }, [props]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognitionAPI =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      // Use continuous: false to stop after each command, interimResults: true for real-time feedback
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN';
      recognition.maxAlternatives = 3;

      // Debounce timer for command processing
      let debounceTimer: NodeJS.Timeout | null = null;

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        let maxConfidence = 0;

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const transcriptText = result[0].transcript;
          maxConfidence = Math.max(maxConfidence, result[0].confidence || 0.8);

          if (result.isFinal) {
            finalTranscript += transcriptText;
          } else {
            interimTranscript += transcriptText;
          }
        }

        setTranscript(interimTranscript || finalTranscript);
        setConfidence(maxConfidence);

        if (finalTranscript) {
          // Debounce command processing to avoid duplicate executions
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            processCommand(finalTranscript.toLowerCase().trim());
          }, 300);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Vui lòng cấp quyền microphone để sử dụng voice command');
        } else if (event.error === 'network') {
          toast.error('Lỗi kết nối mạng, vui lòng thử lại');
        } else if (event.error === 'no-speech') {
          // No speech detected, restart listening if still active
          if (isListening) {
            try {
              recognition.start();
            } catch (err) {
              // Silently ignore
            }
          }
          return;
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        // With continuous: false, restart listening after each command if still enabled
        if (isListening) {
          try {
            // Small delay before restarting to prevent rapid restarts
            setTimeout(() => {
              if (isListening && recognitionRef.current) {
                recognition.start();
              }
            }, 500);
          } catch (err) {
            setIsListening(false);
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  // Update recognition restart behavior
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.onend = () => {
        if (isListening) {
          try {
            recognitionRef.current?.start();
          } catch (err) {
            setIsListening(false);
          }
        }
      };
    }
  }, [isListening]);

  // Find matching rack by query
  const findRack = useCallback(
    (query: string) => {
      if (!query) return null;
      return props.racks.find(
        (r) =>
          r.name.toLowerCase().includes(query) ||
          r.id.toLowerCase().includes(query)
      );
    },
    [props.racks]
  );

  // Process voice command
  const processCommand = useCallback(
    (text: string) => {
      setIsProcessing(true);
      console.log('🎤 Voice command:', text);

      const commands = commandsRef.current;

      for (const cmd of commands) {
        for (const pattern of cmd.patterns) {
          const match = text.match(pattern);
          if (match) {
            const params = cmd.extract ? cmd.extract(match, text) : {};
            setLastCommand(cmd.action);

            console.log('✅ Matched command:', cmd.action, params);

            // Execute the command
            executeAction(cmd.action, params);
            setIsProcessing(false);
            return;
          }
        }
      }

      // No command matched
      console.log('❌ Unknown command:', text);
      toast.info(`Không hiểu lệnh: "${text}"\nNói "trợ giúp" để xem các lệnh`, {
        duration: 3000,
      });
      setIsProcessing(false);
    },
    [props]
  );

  // Execute matched action
  const executeAction = useCallback(
    (action: string, params: Record<string, any>) => {
      switch (action) {
        // Search
        case 'search':
          if (params.query) {
            toast.success(`🔍 Đang tìm: "${params.query}"`);
            props.onSearch(params.query);
          }
          break;

        // Rack Navigation
        case 'highlight_rack': {
          const rack = findRack(params.rackQuery);
          if (rack) {
            toast.success(`📍 Đang chọn: ${rack.name}`);
            props.onHighlightRack(rack.id);
          } else {
            toast.error(`Không tìm thấy kệ: "${params.rackQuery}"`);
          }
          break;
        }

        case 'open_rack_modal': {
          const rack = findRack(params.rackQuery);
          if (rack && props.onOpenRackModal) {
            toast.success(`📂 Mở chi tiết: ${rack.name}`);
            props.onOpenRackModal(rack.id);
          } else if (!rack) {
            toast.error(`Không tìm thấy kệ: "${params.rackQuery}"`);
          }
          break;
        }

        case 'show_only_rack': {
          const rack = findRack(params.rackQuery);
          if (rack && props.onShowOnlyRack) {
            toast.success(`🎯 Chỉ hiện: ${rack.name}`);
            props.onShowOnlyRack(rack.id);
          }
          break;
        }

        case 'show_all_racks':
          props.onShowAllRacks?.();
          toast.success('👁️ Hiện tất cả kệ');
          break;

        // Rack Management
        case 'create_rack':
          props.onCreateRack?.({
            rows: params.rows || 2,
            columns: params.columns || 3,
            levels: params.levels || 4,
          });
          toast.success(`✨ Tạo kệ ${params.rows}x${params.columns}x${params.levels}`);
          break;

        case 'remove_rack':
          props.onRemoveRack?.();
          toast.success('🗑️ Đã xóa kệ');
          break;

        case 'rotate_rack': {
          const targetRack = params.rackQuery
            ? findRack(params.rackQuery)
            : props.selectedRack
            ? { id: props.selectedRack }
            : null;
          if (targetRack && props.onRotateRack) {
            props.onRotateRack(targetRack.id);
            toast.success('🔄 Đã xoay kệ');
          } else {
            toast.error('Vui lòng chọn kệ trước');
          }
          break;
        }

        case 'clone_rack': {
          const targetRack = params.rackQuery
            ? findRack(params.rackQuery)
            : props.selectedRack
            ? { id: props.selectedRack }
            : null;
          if (targetRack && props.onCloneRack) {
            props.onCloneRack(targetRack.id);
            toast.success('📋 Đã nhân đôi kệ');
          } else {
            toast.error('Vui lòng chọn kệ trước');
          }
          break;
        }

        // Box Management
        case 'add_boxes':
          props.onAddBoxes?.(params.count || 10, params.category || 'standard');
          toast.success(`📦 Thêm ${params.count || 10} thùng ${params.category || 'standard'}`);
          break;

        case 'remove_all_boxes':
          props.onRemoveAllBoxes?.();
          toast.success('🗑️ Đã xóa tất cả thùng');
          break;

        case 'remove_selected_box':
          props.onRemoveSelectedBox?.();
          toast.success('🗑️ Đã xóa thùng');
          break;

        // View Controls
        case 'toggle_axes':
          props.onToggleAxes?.();
          toast.success('📐 Đã chuyển trục');
          break;

        case 'toggle_grid':
          props.onToggleGrid?.();
          toast.success('📏 Đã chuyển lưới');
          break;

        case 'view_default':
          props.onSetViewMode?.('default');
          toast.success('👁️ Chế độ mặc định');
          break;

        case 'view_category':
          props.onSetViewMode?.('category');
          toast.success('🎨 Chế độ theo loại');
          break;

        case 'view_heatmap':
          props.onSetViewMode?.('heatmap');
          toast.success('🌡️ Chế độ bản đồ nhiệt');
          break;

        // Category Filters
        case 'filter_standard':
          props.onFilterCategory?.('standard');
          toast.success('📦 Lọc: Tiêu chuẩn');
          break;

        case 'filter_fragile':
          props.onFilterCategory?.('fragile');
          toast.success('⚠️ Lọc: Dễ vỡ');
          break;

        case 'filter_electronics':
          props.onFilterCategory?.('electronics');
          toast.success('💻 Lọc: Điện tử');
          break;

        case 'filter_food':
          props.onFilterCategory?.('food');
          toast.success('🍎 Lọc: Thực phẩm');
          break;

        case 'filter_all':
          props.onFilterCategory?.('all');
          toast.success('📋 Hiện tất cả loại');
          break;

        // Environment
        case 'create_background':
          props.onCreateBackground?.();
          toast.success('🏭 Hiện nền kho');
          break;

        case 'remove_background':
          props.onRemoveBackground?.();
          toast.success('🏭 Ẩn nền kho');
          break;

        case 'toggle_humans':
          props.onToggleHumans?.();
          toast.success('👤 Đã chuyển người');
          break;

        case 'toggle_roof':
          props.onToggleRoof?.();
          toast.success('🏠 Đã chuyển mái');
          break;

        case 'toggle_performance':
          props.onTogglePerformanceMode?.();
          toast.success('⚡ Đã chuyển chế độ hiệu suất');
          break;

        case 'toggle_fps':
          props.onToggleFPS?.();
          toast.success('📊 Đã chuyển FPS');
          break;

        // Data
        case 'load_demo':
          props.onLoadDemoData?.();
          toast.success('📂 Đang tải demo...');
          break;

        case 'export_data':
          props.onExportData?.();
          toast.success('💾 Đang xuất dữ liệu...');
          break;

        case 'import_data':
          props.onImportData?.();
          toast.info('📁 Mở dialog nhập dữ liệu');
          break;

        // Panels
        case 'toggle_search_panel':
          props.onToggleSearch?.();
          break;

        case 'toggle_alerts_panel':
          props.onToggleAlerts?.();
          break;

        case 'toggle_stats_panel':
          props.onToggleStats?.();
          break;

        case 'toggle_transactions_panel':
          props.onToggleTransactions?.();
          break;

        case 'toggle_ai_panel':
          props.onToggleAI?.();
          break;

        case 'toggle_barcode_panel':
          props.onToggleBarcode?.();
          break;

        // Mode
        case 'toggle_drag_mode':
          props.onToggleDragMode?.();
          toast.success('✋ Đã chuyển chế độ di chuyển');
          break;

        // Clear
        case 'clear_selection':
          props.onClearSelection();
          toast.success('✅ Đã bỏ chọn');
          break;

        // Help
        case 'show_help':
          const helpCommands = [
            '🔍 "Tìm [tên]" - Tìm thùng',
            '📍 "Chọn kệ [tên]" - Chọn kệ',
            '📂 "Mở kệ [tên]" - Xem chi tiết',
            '✨ "Tạo kệ 2x3x4" - Tạo kệ mới',
            '📦 "Thêm 10 thùng" - Thêm hàng',
            '🎨 "Chế độ loại" - Đổi view',
            '📊 "Mở thống kê" - Xem stats',
            '⚡ "Chế độ hiệu suất" - Tăng FPS',
          ];
          toast.info(helpCommands.join('\n'), { duration: 8000 });
          break;

        default:
          console.log('Unknown action:', action);
      }
    },
    [props, findRack]
  );

  // Execute text command directly
  const executeTextCommand = useCallback(
    (text: string) => {
      processCommand(text.toLowerCase().trim());
    },
    [processCommand]
  );

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error('Trình duyệt không hỗ trợ voice command');
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript('');
      toast.success('🎤 Đang lắng nghe... Nói "trợ giúp" để xem các lệnh', { duration: 3000 });
    } catch (err) {
      console.error('Failed to start recognition:', err);
      toast.error('Không thể bắt đầu voice command');
    }
  }, []);

  // Stop listening
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setTranscript('');
    toast.info('🎤 Đã tắt voice command', { duration: 2000 });
  }, []);

  // Toggle listening
  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    isProcessing,
    transcript,
    lastCommand,
    confidence,
    startListening,
    stopListening,
    toggleListening,
    availableCommands: commandsRef.current,
    executeTextCommand,
  };
};

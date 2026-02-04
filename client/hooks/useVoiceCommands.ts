'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'sonner';

interface VoiceCommand {
  pattern: RegExp;
  action: string;
  extract?: (match: RegExpMatchArray) => Record<string, string>;
}

interface UseVoiceCommandsProps {
  onSearch: (query: string) => void;
  onHighlightRack: (rackId: string) => void;
  onClearSelection: () => void;
  racks: { id: string; name: string }[];
}

interface UseVoiceCommandsReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

export const useVoiceCommands = ({
  onSearch,
  onHighlightRack,
  onClearSelection,
  racks,
}: UseVoiceCommandsProps): UseVoiceCommandsReturn => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  
  const recognitionRef = useRef<any>(null);

  // Check browser support
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognitionAPI);

    if (SpeechRecognitionAPI) {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'vi-VN'; // Vietnamese
      
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptText = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptText;
          } else {
            interimTranscript += transcriptText;
          }
        }

        setTranscript(interimTranscript || finalTranscript);

        if (finalTranscript) {
          processCommand(finalTranscript.toLowerCase().trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          toast.error('Vui lòng cấp quyền microphone để sử dụng voice command');
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        if (isListening) {
          // Restart if still listening
          try {
            recognition.start();
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

  // Update the recognition restart behavior when isListening changes
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

  const processCommand = useCallback((text: string) => {
    console.log('Voice command received:', text);

    // Search commands: "tìm thùng X", "tìm kiếm X", "tìm X"
    const searchPatterns = [
      /tìm thùng (.+)/i,
      /tìm kiếm (.+)/i,
      /tìm (.+)/i,
      /search (.+)/i,
    ];

    for (const pattern of searchPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const query = match[1].trim();
        toast.success(`🔍 Đang tìm: "${query}"`);
        onSearch(query);
        return;
      }
    }

    // Highlight rack commands: "highlight kệ X", "xem kệ X", "mở kệ X"
    const highlightPatterns = [
      /highlight kệ (.+)/i,
      /xem kệ (.+)/i,
      /mở kệ (.+)/i,
      /chọn kệ (.+)/i,
      /kệ (.+)/i,
    ];

    for (const pattern of highlightPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        const rackQuery = match[1].trim().toLowerCase();
        
        // Find matching rack
        const rack = racks.find(r => 
          r.name.toLowerCase().includes(rackQuery) ||
          r.id.toLowerCase().includes(rackQuery)
        );

        if (rack) {
          toast.success(`📍 Đang highlight: ${rack.name}`);
          onHighlightRack(rack.id);
        } else {
          toast.error(`Không tìm thấy kệ: "${rackQuery}"`);
        }
        return;
      }
    }

    // Clear commands
    const clearPatterns = [
      /xóa chọn/i,
      /bỏ chọn/i,
      /clear/i,
      /hủy/i,
    ];

    for (const pattern of clearPatterns) {
      if (pattern.test(text)) {
        toast.success('✅ Đã bỏ chọn');
        onClearSelection();
        return;
      }
    }

    // Help command
    if (/trợ giúp|help|hướng dẫn/i.test(text)) {
      toast.info(
        'Các lệnh hỗ trợ:\n• "Tìm [tên thùng]"\n• "Highlight kệ [tên kệ]"\n• "Xóa chọn"',
        { duration: 5000 }
      );
      return;
    }

    // Unknown command
    console.log('Unknown voice command:', text);
  }, [onSearch, onHighlightRack, onClearSelection, racks]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast.error('Trình duyệt không hỗ trợ voice command');
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
      setTranscript('');
      toast.success('🎤 Đang lắng nghe...', { duration: 2000 });
    } catch (err) {
      console.error('Failed to start recognition:', err);
      toast.error('Không thể bắt đầu voice command');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setTranscript('');
    toast.info('🎤 Đã tắt voice command', { duration: 2000 });
  }, []);

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
    transcript,
    startListening,
    stopListening,
    toggleListening,
  };
};

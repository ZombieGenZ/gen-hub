'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, Camera, CameraOff, Search, MapPin, Loader2 } from 'lucide-react';
import { SearchResult } from '@/types/inventory';
import { cn } from '@/lib/utils';

interface BarcodeScannerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => SearchResult[];
  onLocate: (result: SearchResult) => void;
}

const BarcodeScannerPanel = ({
  isOpen,
  onClose,
  onSearch,
  onLocate,
}: BarcodeScannerPanelProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string>('');
  const [manualInput, setManualInput] = useState('');
  
  const scannerRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop?.().catch(console.error);
      }
    };
  }, []);

  // Stop scanner when panel closes
  useEffect(() => {
    if (!isOpen && isScanning) {
      stopScanning();
    }
  }, [isOpen, isScanning]);

  const startScanning = useCallback(async () => {
    setError('');
    setScanResult('');
    setSearchResults([]);

    try {
      // Dynamic import for html5-qrcode (client-side only)
      // Note: You need to install html5-qrcode: npm install html5-qrcode
      let Html5Qrcode: any;
      try {
        const module = await import('html5-qrcode');
        Html5Qrcode = module.Html5Qrcode;
      } catch {
        setError('Thư viện quét barcode chưa được cài đặt. Chạy: npm install html5-qrcode');
        return;
      }
      
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode('barcode-scanner-container');
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText: string) => {
          // On successful scan
          setScanResult(decodedText);
          handleScanResult(decodedText);
          // Stop after successful scan
          stopScanning();
        },
        () => {
          // Ignore scan errors (no QR code found)
        }
      );

      setIsScanning(true);
    } catch (err) {
      console.error('Failed to start scanner:', err);
      setError('Không thể truy cập camera. Vui lòng cấp quyền camera.');
    }
  }, []);

  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setIsScanning(false);
  }, []);

  const handleScanResult = useCallback((code: string) => {
    const results = onSearch(code);
    setSearchResults(results);
    
    if (results.length === 0) {
      setError(`Không tìm thấy thùng hàng với mã: ${code}`);
    }
  }, [onSearch]);

  const handleManualSearch = useCallback(() => {
    if (!manualInput.trim()) return;
    
    setScanResult(manualInput);
    handleScanResult(manualInput);
  }, [manualInput, handleScanResult]);

  const handleLocate = useCallback((result: SearchResult) => {
    onLocate(result);
    onClose();
  }, [onLocate, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="absolute top-16 right-4 w-80 z-30 animate-in slide-in-from-right-5 duration-300 overflow-hidden"
      style={{
        backgroundColor: '#f8fafb',
        border: '1px solid #e0ede8',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      }}
    >
      <div className="p-4" style={{ borderBottom: '1px solid #e0ede8' }}>
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold flex items-center gap-2" style={{ color: '#1a2e25' }}>
            <Camera className="w-5 h-5" style={{ color: '#2ea87e' }} />
            Quét Barcode/QR
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-4 h-4" style={{ color: '#4a5568' }} />
          </Button>
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {/* Camera Scanner */}
        <div className="relative">
          <div 
            id="barcode-scanner-container" 
            ref={containerRef}
            className={cn(
              "w-full h-48 rounded-lg overflow-hidden flex items-center justify-center",
              isScanning ? "border-2" : ""
            )}
            style={{ 
              backgroundColor: '#e0ede8',
              borderColor: isScanning ? '#2ea87e' : 'transparent'
            }}
          >
            {!isScanning && (
              <div className="text-center p-4">
                <Camera className="w-12 h-12 mx-auto mb-2" style={{ color: '#2ea87e', opacity: 0.5 }} />
                <p className="text-sm" style={{ color: '#4a5568' }}>Nhấn nút bên dưới để bật camera</p>
              </div>
            )}
          </div>
          
          {/* Scanner controls */}
          <div className="flex gap-2 mt-2">
            {!isScanning ? (
              <Button 
                onClick={startScanning} 
                className="flex-1"
                style={{ backgroundColor: '#2ea87e', color: '#ffffff' }}
              >
                <Camera className="w-4 h-4 mr-2" />
                Bật Camera
              </Button>
            ) : (
              <Button 
                onClick={stopScanning} 
                className="flex-1"
                variant="destructive"
              >
                <CameraOff className="w-4 h-4 mr-2" />
                Tắt Camera
              </Button>
            )}
          </div>
        </div>

        {/* Manual input */}
        <div className="space-y-2">
          <p className="text-sm" style={{ color: '#4a5568' }}>Hoặc nhập mã thủ công:</p>
          <div className="flex gap-2">
            <Input
              placeholder="Nhập mã barcode/QR..."
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
              style={{ backgroundColor: '#ffffff', border: '1px solid #e0ede8' }}
            />
            <Button onClick={handleManualSearch} size="icon" style={{ backgroundColor: '#2ea87e', color: '#ffffff' }}>
              <Search className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scan result */}
        {scanResult && (
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#e0ede8' }}>
            <p className="text-xs" style={{ color: '#4a5568' }}>Mã đã quét:</p>
            <p className="font-mono text-sm font-medium" style={{ color: '#1a2e25' }}>{scanResult}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-2 rounded-lg text-sm" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
            {error}
          </div>
        )}

        {/* Search results */}
        {searchResults.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium" style={{ color: '#1a2e25' }}>
              Tìm thấy {searchResults.length} kết quả:
            </p>
            <div className="max-h-40 overflow-y-auto space-y-1">
              {searchResults.map((result) => (
                <div
                  key={result.boxId}
                  className="p-2 rounded-lg flex items-center justify-between gap-2 transition-colors hover:bg-gray-50"
                  style={{ backgroundColor: '#ffffff', border: '1px solid #e0ede8' }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: '#1a2e25' }}>{result.boxName}</p>
                    <p className="text-xs" style={{ color: '#4a5568' }}>
                      {result.rackName} • Tầng {result.level}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleLocate(result)}
                    style={{ backgroundColor: '#2ea87e', color: '#ffffff' }}
                  >
                    <MapPin className="w-3 h-3 mr-1" />
                    Định vị
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BarcodeScannerPanel;

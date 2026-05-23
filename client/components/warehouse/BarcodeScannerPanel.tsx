'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { X, Camera, CameraOff, Search, MapPin, Package, Layers, Weight, AlertTriangle, CheckCircle, AlertCircle, TrendingDown, ChevronDown, ChevronUp } from 'lucide-react';
import { SearchResult, BarcodeScanResult, BarcodeScanLocation } from '@/types/inventory';
import { cn } from '@/lib/utils';

interface BarcodeScannerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSearch: (query: string) => SearchResult[];
  onScanBarcode: (barcode: string) => BarcodeScanResult | null;
  onLocate: (result: SearchResult) => void;
}

// Stock status display configuration
const stockStatusConfig = {
  out_of_stock: {
    label: 'Hết hàng',
    color: '#ef4444',
    bgColor: '#fee2e2',
    icon: AlertCircle,
  },
  low_stock: {
    label: 'Tồn kho thấp',
    color: '#f97316',
    bgColor: '#ffedd5',
    icon: AlertTriangle,
  },
  in_stock: {
    label: 'Còn hàng',
    color: '#22c55e',
    bgColor: '#dcfce7',
    icon: CheckCircle,
  },
  overstocked: {
    label: 'Tồn nhiều',
    color: '#3b82f6',
    bgColor: '#dbeafe',
    icon: TrendingDown,
  },
};

const BarcodeScannerPanel = ({
  isOpen,
  onClose,
  onSearch,
  onScanBarcode,
  onLocate,
}: BarcodeScannerPanelProps) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [inventoryResult, setInventoryResult] = useState<BarcodeScanResult | null>(null);
  const [error, setError] = useState<string>('');
  const [manualInput, setManualInput] = useState('');
  const [hasBarcodeDetector, setHasBarcodeDetector] = useState(false);
  const [expandedRacks, setExpandedRacks] = useState<Set<string>>(new Set());
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);

  // Check if BarcodeDetector is supported
  useEffect(() => {
    isMountedRef.current = true;
    // @ts-ignore - BarcodeDetector may not be in TypeScript types
    if ('BarcodeDetector' in window) {
      setHasBarcodeDetector(true);
    }
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Gắn stream vào <video> SAU KHI nó xuất hiện trong DOM (isScanning → true)
  // Fix màn đen: video chỉ render khi isScanning=true, nhưng applyStream chạy trước khi video có trong DOM
  useEffect(() => {
    if (!isScanning) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!video || !stream) return;
    video.srcObject = stream;
    video.play()
      .then(() => {
        if (!hasBarcodeDetector || !isMountedRef.current) return;
        // @ts-ignore
        detectorRef.current = new BarcodeDetector({
          formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e'],
        });
        detectBarcode();
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScanning]);

  const stopCamera = useCallback(() => {
    // Cancel animation frame
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
    
    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Clear video source
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (isMountedRef.current) {
      setIsScanning(false);
    }
  }, []);

  // Stop camera when panel closes or component unmounts
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      // Reset state when closing
      setScanResult('');
      setSearchResults([]);
      setInventoryResult(null);
      setError('');
      setManualInput('');
      setExpandedRacks(new Set());
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, stopCamera]);

  const processBarcode = useCallback((code: string) => {
    setScanResult(code);
    setError('');
    
    // First try inventory scan
    const invResult = onScanBarcode(code);
    if (invResult) {
      setInventoryResult(invResult);
      setSearchResults([]);
      return true;
    }
    
    // Fallback to simple search
    const results = onSearch(code);
    if (results.length > 0) {
      setSearchResults(results);
      setInventoryResult(null);
      return true;
    }
    
    setError(`Không tìm thấy thùng hàng với mã: ${code}`);
    setInventoryResult(null);
    setSearchResults([]);
    return false;
  }, [onSearch, onScanBarcode]);

  const detectBarcode = useCallback(async () => {
    if (!videoRef.current || !detectorRef.current || !isMountedRef.current) return;
    
    try {
      const barcodes = await detectorRef.current.detect(videoRef.current);
      
      if (barcodes.length > 0 && isMountedRef.current) {
        const code = barcodes[0].rawValue;
        processBarcode(code);
        stopCamera();
        return;
      }
    } catch (err) {
      // Ignore detection errors
    }
    
    // Continue detection loop
    if (isMountedRef.current && streamRef.current) {
      animationRef.current = requestAnimationFrame(detectBarcode);
    }
  }, [processBarcode, stopCamera]);

  const startCamera = useCallback(async () => {
    setError('');
    setScanResult('');
    setSearchResults([]);
    setInventoryResult(null);

    const applyStream = (stream: MediaStream) => {
      if (!isMountedRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = stream;
      // Lưu stream, setIsScanning sau → useEffect sẽ gắn vào <video> sau khi nó render
      setIsScanning(true);
    };

    try {
      // Ưu tiên camera sau nhưng KHÔNG bắt buộc — máy tính sẽ dùng webcam trước
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      await applyStream(stream);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      if (err.name === 'NotAllowedError') {
        setError('Quyền camera bị từ chối. Vui lòng cho phép truy cập camera trong cài đặt trình duyệt.');
        return;
      }
      if (err.name === 'NotFoundError') {
        setError('Không tìm thấy camera. Vui lòng kiểm tra thiết bị.');
        return;
      }
      // OverconstrainedError hoặc lỗi khác — thử không có ràng buộc facing
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        await applyStream(stream);
      } catch {
        if (!isMountedRef.current) return;
        setError('Không thể mở camera. Kiểm tra trình duyệt đang dùng HTTPS và thiết bị có camera.');
      }
    }
  }, [hasBarcodeDetector, detectBarcode]);

  const handleManualSearch = useCallback(() => {
    if (!manualInput.trim()) return;
    processBarcode(manualInput.trim());
  }, [manualInput, processBarcode]);

  const handleLocate = useCallback((result: SearchResult) => {
    stopCamera();
    onLocate(result);
    onClose();
  }, [onLocate, onClose, stopCamera]);

  const handleClose = useCallback(() => {
    stopCamera();
    onClose();
  }, [stopCamera, onClose]);

  const toggleRackExpand = useCallback((rackId: string) => {
    setExpandedRacks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(rackId)) {
        newSet.delete(rackId);
      } else {
        newSet.add(rackId);
      }
      return newSet;
    });
  }, []);

  if (!isOpen) return null;

  const StatusIcon = inventoryResult ? stockStatusConfig[inventoryResult.stockStatus].icon : null;

  return (
    <div 
      className="absolute top-16 right-4 w-96 z-30 animate-in slide-in-from-right-5 duration-300 overflow-hidden max-h-[calc(100vh-100px)]"
      style={{
        backgroundColor: '#f8fafb',
        border: '1px solid #e0ede8',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      }}
    >
      {/* Header */}
      <div className="p-4" style={{ borderBottom: '1px solid #e0ede8' }}>
        <div className="flex items-center justify-between">
          <div className="text-base font-semibold flex items-center gap-2" style={{ color: '#1a2e25' }}>
            <Camera className="w-5 h-5" style={{ color: '#2ea87e' }} />
            Quét Barcode - Kiểm Tồn Kho
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="w-4 h-4" style={{ color: '#4a5568' }} />
          </Button>
        </div>
      </div>
      
      <div className="p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-200px)]">
        {/* Camera Scanner */}
        <div className="relative">
          <div 
            className={cn(
              "w-full h-40 rounded-lg overflow-hidden flex items-center justify-center",
              isScanning ? "border-2" : ""
            )}
            style={{ 
              backgroundColor: '#e0ede8',
              borderColor: isScanning ? '#2ea87e' : 'transparent'
            }}
          >
            {isScanning ? (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                autoPlay
                muted
              />
            ) : (
              <div className="text-center p-4">
                <Camera className="w-10 h-10 mx-auto mb-2" style={{ color: '#2ea87e', opacity: 0.5 }} />
                <p className="text-sm" style={{ color: '#4a5568' }}>
                  {hasBarcodeDetector 
                    ? 'Nhấn nút bên dưới để bật camera' 
                    : 'Camera preview (nhập mã thủ công)'}
                </p>
              </div>
            )}
          </div>
          
          {/* Scanner controls */}
          <div className="flex gap-2 mt-2">
            {!isScanning ? (
              <Button 
                onClick={startCamera} 
                className="flex-1"
                style={{ backgroundColor: '#2ea87e', color: '#ffffff' }}
              >
                <Camera className="w-4 h-4 mr-2" />
                Bật Camera
              </Button>
            ) : (
              <Button 
                onClick={stopCamera} 
                className="flex-1"
                variant="destructive"
              >
                <CameraOff className="w-4 h-4 mr-2" />
                Tắt Camera
              </Button>
            )}
          </div>
          
          {!hasBarcodeDetector && isScanning && (
            <p className="text-xs mt-1 text-center" style={{ color: '#4a5568' }}>
              Trình duyệt không hỗ trợ quét tự động. Vui lòng nhập mã thủ công.
            </p>
          )}
        </div>

        {/* Manual input */}
        <div className="space-y-2">
          <p className="text-sm" style={{ color: '#4a5568' }}>
            {hasBarcodeDetector ? 'Hoặc nhập mã thủ công:' : 'Nhập mã barcode/QR:'}
          </p>
          <div className="flex gap-2">
            <Input
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

        {/* Scan result summary */}
        {scanResult && (
          <div className="p-2 rounded-lg" style={{ backgroundColor: '#e0ede8' }}>
            <p className="text-xs" style={{ color: '#4a5568' }}>Mã đã tìm:</p>
            <p className="font-mono text-sm font-medium" style={{ color: '#1a2e25' }}>{scanResult}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="p-3 rounded-lg text-sm flex items-center gap-2" style={{ backgroundColor: '#fee2e2', color: '#dc2626' }}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Inventory Result - Enhanced View */}
        {inventoryResult && (
          <div className="space-y-3">
            {/* Product Info Header */}
            <div className="p-3 rounded-lg" style={{ backgroundColor: '#ffffff', border: '1px solid #e0ede8' }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate" style={{ color: '#1a2e25' }}>
                    {inventoryResult.productName}
                  </h3>
                  <p className="text-xs" style={{ color: '#4a5568' }}>
                    {inventoryResult.category}
                  </p>
                </div>
                <Badge 
                  className="flex items-center gap-1 text-xs px-2 py-1"
                  style={{ 
                    backgroundColor: stockStatusConfig[inventoryResult.stockStatus].bgColor,
                    color: stockStatusConfig[inventoryResult.stockStatus].color,
                  }}
                >
                  {StatusIcon && <StatusIcon className="w-3 h-3" />}
                  {stockStatusConfig[inventoryResult.stockStatus].label}
                </Badge>
              </div>

              {/* Statistics Grid */}
              <div className="grid grid-cols-3 gap-2 mt-3">
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#f0fdf4' }}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Package className="w-3.5 h-3.5" style={{ color: '#22c55e' }} />
                  </div>
                  <p className="text-lg font-bold" style={{ color: '#166534' }}>
                    {inventoryResult.totalBoxes}
                  </p>
                  <p className="text-[10px]" style={{ color: '#4a5568' }}>Thùng</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#eff6ff' }}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Layers className="w-3.5 h-3.5" style={{ color: '#3b82f6' }} />
                  </div>
                  <p className="text-lg font-bold" style={{ color: '#1e40af' }}>
                    {inventoryResult.totalQuantity}
                  </p>
                  <p className="text-[10px]" style={{ color: '#4a5568' }}>Số lượng</p>
                </div>
                <div className="text-center p-2 rounded-lg" style={{ backgroundColor: '#fefce8' }}>
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Weight className="w-3.5 h-3.5" style={{ color: '#ca8a04' }} />
                  </div>
                  <p className="text-lg font-bold" style={{ color: '#854d0e' }}>
                    {inventoryResult.totalWeight.toFixed(1)}
                  </p>
                  <p className="text-[10px]" style={{ color: '#4a5568' }}>kg</p>
                </div>
              </div>
            </div>

            {/* Location Breakdown */}
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-2" style={{ color: '#1a2e25' }}>
                <MapPin className="w-4 h-4" style={{ color: '#2ea87e' }} />
                Vị trí trong kho ({inventoryResult.locations.length} kệ)
              </p>
              
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {inventoryResult.locations.map((location) => (
                  <div
                    key={location.rackId}
                    className="rounded-lg overflow-hidden"
                    style={{ backgroundColor: '#ffffff', border: '1px solid #e0ede8' }}
                  >
                    {/* Rack Header - Clickable */}
                    <button
                      onClick={() => toggleRackExpand(location.rackId)}
                      className="w-full p-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: location.fillRate > 0.9 
                              ? '#ef4444' 
                              : location.fillRate > 0.5 
                                ? '#eab308' 
                                : '#22c55e'
                          }}
                        />
                        <span className="font-medium text-sm" style={{ color: '#1a2e25' }}>
                          {location.rackName}
                        </span>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#e0ede8', color: '#4a5568' }}>
                          {location.boxCount} thùng
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs" style={{ color: '#4a5568' }}>
                          {Math.round(location.fillRate * 100)}% đầy
                        </span>
                        {expandedRacks.has(location.rackId) 
                          ? <ChevronUp className="w-4 h-4" style={{ color: '#4a5568' }} />
                          : <ChevronDown className="w-4 h-4" style={{ color: '#4a5568' }} />
                        }
                      </div>
                    </button>

                    {/* Expanded Box List */}
                    {expandedRacks.has(location.rackId) && (
                      <div className="px-3 pb-3 space-y-1.5" style={{ borderTop: '1px solid #e0ede8' }}>
                        <div className="pt-2 text-xs flex items-center justify-between" style={{ color: '#4a5568' }}>
                          <span>Tổng: {location.quantity} sản phẩm, {location.weight.toFixed(1)}kg</span>
                        </div>
                        {location.boxes.map((box) => (
                          <div
                            key={box.boxId}
                            className="p-2 rounded flex items-center justify-between gap-2"
                            style={{ backgroundColor: '#f8fafb' }}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate" style={{ color: '#1a2e25' }}>
                                {box.boxName}
                              </p>
                              <p className="text-[10px]" style={{ color: '#4a5568' }}>
                                Hàng {box.row + 1}, Cột {box.column + 1}, Tầng {box.level + 1}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => handleLocate(box)}
                              style={{ color: '#2ea87e' }}
                            >
                              <MapPin className="w-3 h-3 mr-1" />
                              Xem
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (inventoryResult.locations[0]?.boxes[0]) {
                    handleLocate(inventoryResult.locations[0].boxes[0]);
                  }
                }}
              >
                <MapPin className="w-3.5 h-3.5 mr-1" />
                Xem trên 3D
              </Button>
            </div>
          </div>
        )}

        {/* Simple Search results (fallback) */}
        {searchResults.length > 0 && !inventoryResult && (
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
                      {result.rackName} • Tầng {result.level + 1}
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

        {/* Timestamp */}
        {inventoryResult && (
          <p className="text-[10px] text-center" style={{ color: '#9ca3af' }}>
            Cập nhật: {new Date(inventoryResult.lastUpdated).toLocaleString('vi-VN')}
          </p>
        )}
      </div>
    </div>
  );
};

export default BarcodeScannerPanel;

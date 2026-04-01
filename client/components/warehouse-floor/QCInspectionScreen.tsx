'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
    Camera,
    Check,
    X,
    AlertTriangle,
    ChevronDown,
    Package,
    ScanBarcode,
    Shield,
    Navigation,
    ArrowRight,
    PenTool,
    Undo2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBarcodeScan } from '@/hooks/useBarcodeScan';
import { useFloorFeedback } from '@/hooks/useFloorFeedback';
import { FlashOverlay, useFlashOverlay } from '@/components/warehouse-floor/FlashOverlay';

// ── Types ──

interface QCItem {
    id: string;
    product_id: string;
    product_name: string;
    sku: string;
    image_url?: string | null;
    batch_code?: string | null;
    expiry_date?: string | null;
    quantity: number;
    receipt_code: string;
}

type DefectReason =
    | 'TORN_PACKAGING'
    | 'EXPIRED'
    | 'DENTED'
    | 'WET_DAMAGED'
    | 'WRONG_LABEL'
    | 'CONTAMINATED'
    | 'OTHER';

const DEFECT_TAGS: { value: DefectReason; label: string; icon: string }[] = [
    { value: 'TORN_PACKAGING', label: 'Rách bao bì', icon: '📦' },
    { value: 'EXPIRED', label: 'Hết hạn sử dụng', icon: '⏰' },
    { value: 'DENTED', label: 'Móp méo', icon: '💥' },
    { value: 'WET_DAMAGED', label: 'Ẩm ướt', icon: '💧' },
    { value: 'WRONG_LABEL', label: 'Sai nhãn', icon: '🏷️' },
    { value: 'CONTAMINATED', label: 'Nhiễm bẩn', icon: '⚠️' },
    { value: 'OTHER', label: 'Lý do khác', icon: '📝' },
];

interface QCInspectionResult {
    itemId: string;
    passed: boolean;
    defect_reasons?: DefectReason[];
    defect_photos?: string[]; // base64 data URLs
    quarantine_block?: string;
}

interface QCInspectionScreenProps {
    items: QCItem[];
    assignedArea: string; // VD: "Kho A - Dãy 1,2,3"
    quarantineBlockCode: string;
    resolveBarcode: (barcode: string) => string | null;
    onInspectionResult: (result: QCInspectionResult) => void;
    onAllComplete: () => void;
    onBack: () => void;
}

type ScreenState = 'inspect' | 'defect_form' | 'quarantine';

export default function QCInspectionScreen({
    items,
    assignedArea,
    quarantineBlockCode,
    resolveBarcode,
    onInspectionResult,
    onAllComplete,
    onBack,
}: QCInspectionScreenProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [screenState, setScreenState] = useState<ScreenState>('inspect');
    const [selectedReasons, setSelectedReasons] = useState<Set<DefectReason>>(new Set());
    const [photos, setPhotos] = useState<string[]>([]);
    const { trigger } = useFloorFeedback();
    const { flash, triggerFlash } = useFlashOverlay();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const drawingRef = useRef(false);

    const currentItem = items[currentIndex] ?? null;
    const allDone = currentIndex >= items.length;

    // ── Barcode to auto-find item ──
    useBarcodeScan(
        (barcode) => {
            if (screenState !== 'inspect' || allDone) return;
            const productId = resolveBarcode(barcode);
            const idx = items.findIndex((i) => i.product_id === productId);
            if (idx >= 0 && idx !== currentIndex) {
                setCurrentIndex(idx);
                trigger('success');
                triggerFlash('success');
            } else if (idx < 0) {
                trigger('error');
                triggerFlash('error');
            }
        },
        { disabled: screenState !== 'inspect' || allDone },
    );

    // ── PASS ──
    const handlePass = useCallback(() => {
        if (!currentItem) return;
        trigger('success');
        triggerFlash('success');
        onInspectionResult({ itemId: currentItem.id, passed: true });
        setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
        }, 400);
    }, [currentItem, trigger, triggerFlash, onInspectionResult]);

    // ── FAIL → open defect form ──
    const handleFail = useCallback(() => {
        if (!currentItem) return;
        trigger('warning');
        triggerFlash('warning');
        setScreenState('defect_form');
        setSelectedReasons(new Set());
        setPhotos([]);
    }, [currentItem, trigger, triggerFlash]);

    // ── Toggle defect reason ──
    const toggleReason = useCallback((reason: DefectReason) => {
        setSelectedReasons((prev) => {
            const next = new Set(prev);
            if (next.has(reason)) next.delete(reason);
            else next.add(reason);
            return next;
        });
    }, []);

    // ── Camera / Photo ──
    const handleCapturePhoto = useCallback(() => {
        fileInputRef.current?.click();
    }, []);

    const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            if (typeof reader.result === 'string') {
                setPhotos((prev) => [...prev, reader.result as string]);
            }
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    }, []);

    // ── Canvas drawing for marking defects on photo ──
    const startDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return;
        drawingRef.current = true;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        ctx.beginPath();
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        const rect = canvasRef.current.getBoundingClientRect();
        const pos = 'touches' in e
            ? { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
            : { x: e.clientX - rect.left, y: e.clientY - rect.top };
        ctx.moveTo(pos.x, pos.y);
    }, []);

    const draw = useCallback((e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!drawingRef.current || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const pos = 'touches' in e
            ? { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
            : { x: e.clientX - rect.left, y: e.clientY - rect.top };
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
    }, []);

    const endDraw = useCallback(() => {
        drawingRef.current = false;
    }, []);

    const clearCanvas = useCallback(() => {
        if (!canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }, []);

    // ── Submit defect → quarantine ──
    const handleSubmitDefect = useCallback(() => {
        if (!currentItem || selectedReasons.size === 0) return;

        // Get canvas drawing as image if present
        const annotatedPhotos = [...photos];
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            // Only add if something was drawn
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
                const imgData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
                const hasDrawing = imgData.data.some((v, i) => i % 4 === 3 && v > 0);
                if (hasDrawing) annotatedPhotos.push(dataUrl);
            }
        }

        onInspectionResult({
            itemId: currentItem.id,
            passed: false,
            defect_reasons: Array.from(selectedReasons),
            defect_photos: annotatedPhotos,
            quarantine_block: quarantineBlockCode,
        });

        trigger('warning');
        setScreenState('quarantine');
    }, [currentItem, selectedReasons, photos, quarantineBlockCode, onInspectionResult, trigger]);

    // ── Acknowledge quarantine → next item ──
    const handleQuarantineAck = useCallback(() => {
        setScreenState('inspect');
        setSelectedReasons(new Set());
        setPhotos([]);
        setCurrentIndex((prev) => prev + 1);
    }, []);

    // ── ALL DONE ──
    if (allDone) {
        return (
            <div className="h-dvh flex flex-col bg-slate-50 select-none">
                <FlashOverlay flash={flash} />
                <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
                    <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                        <Shield className="w-14 h-14 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Kiểm tra QC hoàn tất!</h2>
                    <p className="text-slate-500 text-center">
                        Đã kiểm tra {items.length} mục hàng.
                    </p>
                    <button
                        className="floor-btn floor-btn-giant bg-teal-600 text-white w-full max-w-sm"
                        onClick={onAllComplete}
                    >
                        <Check className="w-7 h-7" />
                        XÁC NHẬN HOÀN TẤT
                    </button>
                </div>
            </div>
        );
    }

    // ── QUARANTINE REDIRECT SCREEN ──
    if (screenState === 'quarantine' && currentItem) {
        return (
            <div className="h-dvh flex flex-col bg-slate-50 select-none">
                <FlashOverlay flash={flash} />
                <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
                    <div className="w-10" />
                    <div className="text-center flex-1">
                        <p className="text-xs text-red-500 uppercase tracking-wider font-semibold">
                            Hàng Lỗi – Chuyển Biệt Trữ
                        </p>
                    </div>
                    <div className="w-10" />
                </header>

                <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
                    <div className="floor-quarantine-banner w-full max-w-sm text-center flex-col">
                        <AlertTriangle className="w-10 h-10 mx-auto" />
                        <p className="mt-2">MANG SẢN PHẨM ĐẾN Ô CHỜ XỬ LÝ</p>
                    </div>

                    <div className="floor-direction bg-amber-50 text-amber-800 border-2 border-amber-300 w-full max-w-sm">
                        <Navigation className="w-6 h-6 shrink-0" />
                        <div>
                            <p className="text-xs font-medium text-amber-500 uppercase">ĐI ĐẾN</p>
                            <p className="text-lg font-black">
                                Khu Biệt Trữ <ArrowRight className="inline w-5 h-5 mx-1" /> Ô{' '}
                                {quarantineBlockCode}
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-4 border border-slate-200 w-full max-w-sm">
                        <p className="text-sm text-slate-500">Sản phẩm:</p>
                        <p className="font-bold text-slate-800">{currentItem.product_name}</p>
                        <p className="text-sm text-slate-500 mt-2">Lý do từ chối:</p>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                            {Array.from(selectedReasons).map((r) => {
                                const tag = DEFECT_TAGS.find((t) => t.value === r);
                                return (
                                    <span
                                        key={r}
                                        className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg font-medium"
                                    >
                                        {tag?.icon} {tag?.label}
                                    </span>
                                );
                            })}
                        </div>
                    </div>

                    <button
                        className="floor-btn floor-btn-giant bg-amber-500 text-white w-full max-w-sm"
                        onClick={handleQuarantineAck}
                    >
                        <Check className="w-7 h-7" />
                        ĐÃ ĐẶT VÀO KHU BIỆT TRỮ
                    </button>
                </div>
            </div>
        );
    }

    // ── DEFECT FORM (Bottom Sheet) ──
    if (screenState === 'defect_form' && currentItem) {
        return (
            <div className="h-dvh flex flex-col bg-slate-50 select-none">
                <FlashOverlay flash={flash} />
                <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
                    <button
                        onClick={() => setScreenState('inspect')}
                        className="p-2 -ml-2 rounded-xl hover:bg-slate-100"
                        title="Hủy ghi nhận lỗi"
                    >
                        <X className="w-6 h-6 text-slate-500" />
                    </button>
                    <div className="text-center flex-1">
                        <p className="text-xs text-red-500 uppercase tracking-wider font-semibold">
                            Ghi nhận Lỗi
                        </p>
                        <p className="text-base font-bold text-slate-800">{currentItem.product_name}</p>
                    </div>
                    <div className="w-10" />
                </header>

                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
                    {/* Photo section */}
                    <div>
                        <p className="text-sm font-bold text-slate-700 mb-2">📸 Chụp ảnh hư hỏng</p>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                            title="Chọn ảnh"
                        />

                        <div className="flex gap-3 overflow-x-auto pb-2">
                            {photos.map((photo, idx) => (
                                <div key={idx} className="relative shrink-0">
                                    <div className="w-28 h-28 rounded-xl overflow-hidden border-2 border-slate-200 relative">
                                        <Image
                                            src={photo}
                                            alt={`Defect ${idx + 1}`}
                                            fill
                                            className="object-cover"
                                            sizes="112px"
                                            unoptimized
                                        />
                                    </div>
                                    <button
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                                        onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                                        title="Xoá ảnh"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            <button
                                className="w-28 h-28 rounded-xl border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-slate-400 hover:text-slate-500 shrink-0"
                                onClick={handleCapturePhoto}
                            >
                                <Camera className="w-8 h-8" />
                                <span className="text-xs mt-1">Chụp ảnh</span>
                            </button>
                        </div>

                        {/* Drawing canvas overlay on last photo */}
                        {photos.length > 0 && (
                            <div className="mt-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                                        <PenTool className="w-3 h-3" />
                                        Vẽ khoanh vùng lỗi trên ảnh
                                    </p>
                                    <button
                                        className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                                        onClick={clearCanvas}
                                    >
                                        <Undo2 className="w-3 h-3" />
                                        Xoá nét vẽ
                                    </button>
                                </div>
                                <div className="relative rounded-xl overflow-hidden border-2 border-red-200">
                                    {/* eslint-disable-next-line @next/next/no-img-element -- base64 canvas overlay */}
                                    <img
                                        src={photos[photos.length - 1]}
                                        alt="Annotate"
                                        className="w-full max-h-64 object-contain"
                                    />
                                    <canvas
                                        ref={canvasRef}
                                        width={320}
                                        height={240}
                                        className="absolute inset-0 w-full h-full cursor-crosshair"
                                        onMouseDown={startDraw}
                                        onMouseMove={draw}
                                        onMouseUp={endDraw}
                                        onMouseLeave={endDraw}
                                        onTouchStart={startDraw}
                                        onTouchMove={draw}
                                        onTouchEnd={endDraw}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Defect reason tags */}
                    <div>
                        <p className="text-sm font-bold text-slate-700 mb-2">🏷️ Chọn lý do</p>
                        <div className="grid grid-cols-2 gap-2">
                            {DEFECT_TAGS.map((tag) => (
                                <button
                                    key={tag.value}
                                    className={cn(
                                        'floor-defect-tag text-left',
                                        selectedReasons.has(tag.value) && 'selected',
                                    )}
                                    onClick={() => toggleReason(tag.value)}
                                >
                                    <span className="mr-1">{tag.icon}</span>
                                    {tag.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Submit button */}
                <div className="px-4 py-4 bg-white border-t border-slate-200 shrink-0">
                    <button
                        className={cn(
                            'floor-btn floor-btn-giant w-full',
                            selectedReasons.size > 0
                                ? 'bg-red-500 text-white'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed',
                        )}
                        onClick={handleSubmitDefect}
                        disabled={selectedReasons.size === 0}
                    >
                        <AlertTriangle className="w-7 h-7" />
                        XÁC NHẬN LỖI & CHUYỂN BIỆT TRỮ
                    </button>
                </div>
            </div>
        );
    }

    // ── MAIN INSPECTION SCREEN ──
    return (
        <div className="h-dvh flex flex-col bg-slate-50 relative overflow-hidden select-none">
            <FlashOverlay flash={flash} />

            {/* Header */}
            <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
                <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-100" title="Quay lại">
                    <ChevronDown className="w-6 h-6 text-slate-500 rotate-90" />
                </button>
                <div className="text-center flex-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        Kiểm tra QC
                    </p>
                    <p className="text-sm font-medium text-teal-600">{assignedArea}</p>
                </div>
                <span className="text-sm font-bold text-teal-600">
                    {currentIndex + 1}/{items.length}
                </span>
            </header>

            {currentItem && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Product info (top half) */}
                    <div className="flex-1 flex flex-col items-center justify-center px-6 gap-3">
                        {currentItem.image_url ? (
                            <div className="floor-product-image relative">
                                <Image
                                    src={currentItem.image_url}
                                    alt={currentItem.product_name}
                                    fill
                                    className="object-contain"
                                    sizes="160px"
                                    unoptimized
                                />
                            </div>
                        ) : (
                            <div className="floor-product-image flex items-center justify-center bg-slate-100 rounded-2xl">
                                <Package className="w-16 h-16 text-slate-300" />
                            </div>
                        )}
                        <h2 className="text-xl font-bold text-slate-800 text-center">
                            {currentItem.product_name}
                        </h2>
                        <div className="flex gap-2 flex-wrap justify-center">
                            <span className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
                                SKU: {currentItem.sku}
                            </span>
                            <span className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">
                                Phiếu: {currentItem.receipt_code}
                            </span>
                            {currentItem.batch_code && (
                                <span className="text-sm bg-purple-50 text-purple-600 px-3 py-1 rounded-full font-medium">
                                    Lô: {currentItem.batch_code}
                                </span>
                            )}
                            {currentItem.expiry_date && (
                                <span className="text-sm bg-amber-50 text-amber-600 px-3 py-1 rounded-full font-medium">
                                    HSD: {new Date(currentItem.expiry_date).toLocaleDateString('vi-VN')}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-sm mt-2">
                            <ScanBarcode className="w-4 h-4" />
                            <span>Quét mã SP để chuyển nhanh giữa các mục</span>
                        </div>
                    </div>

                    {/* Giant PASS / FAIL buttons (bottom half) */}
                    <div className="bg-white border-t border-slate-200 p-4 grid grid-cols-2 gap-4 shrink-0">
                        <button
                            className="floor-btn floor-btn-giant floor-qc-pass flex-col"
                            onClick={handlePass}
                        >
                            <Check className="w-10 h-10" />
                            <span>ĐẠT</span>
                        </button>
                        <button
                            className="floor-btn floor-btn-giant floor-qc-fail flex-col"
                            onClick={handleFail}
                        >
                            <X className="w-10 h-10" />
                            <span>LỖI</span>
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

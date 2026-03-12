'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import {
    MapPin,
    ScanBarcode,
    Check,
    AlertTriangle,
    ChevronDown,
    Package,
    ArrowRight,
    Navigation,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBarcodeScan } from '@/hooks/useBarcodeScan';
import { useFloorFeedback } from '@/hooks/useFloorFeedback';
import { FlashOverlay, useFlashOverlay } from '@/components/warehouse-floor/FlashOverlay';

// ── Types ──

interface PutawayItem {
    id: string;
    product_id: string;
    product_name: string;
    sku: string;
    image_url?: string | null;
    quantity: number;
    /** Vị trí cất hàng được phân công. Nếu không có → mode tự do chọn ô. */
    target_location?: {
        row_name: string;
        rack_name: string;
        shelf_level: number;
        block_code: string;
        /** Barcode dán trên ô vật lý */
        block_barcode: string;
    };
}

interface PutawayScreenProps {
    items: PutawayItem[];
    receiptCode: string;
    /** Tra cứu barcode → product_id hoặc block_barcode */
    resolveBarcode: (barcode: string) => { type: 'block'; code: string } | { type: 'product'; productId: string } | null;
    onItemComplete: (itemId: string) => void;
    onAllComplete: () => void;
    onBack: () => void;
}

type PutawayStep = 'scan_block' | 'scan_product' | 'done';

export default function PutawayScreen({
    items,
    receiptCode,
    resolveBarcode,
    onItemComplete,
    onAllComplete,
    onBack,
}: PutawayScreenProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [step, setStep] = useState<PutawayStep>('scan_block');
    const [blockVerified, setBlockVerified] = useState(false);
    const [productScanned, setProductScanned] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const { trigger } = useFloorFeedback();
    const { flash, triggerFlash } = useFlashOverlay();

    const currentItem = items[currentIndex] ?? null;
    const allDone = currentIndex >= items.length;

    // ── Handle barcode ──
    const handleScan = useCallback(
        (barcode: string) => {
            if (!currentItem || error) return;

            const result = resolveBarcode(barcode);

            if (step === 'scan_block') {
                // Step 1: Verify block location
                if (currentItem.target_location) {
                    // Pre-assigned block — must match exactly
                    if (result?.type === 'block' && result.code === currentItem.target_location.block_barcode) {
                        trigger('success');
                        triggerFlash('success');
                        setBlockVerified(true);
                        setStep('scan_product');
                    } else {
                        trigger('error');
                        triggerFlash('error');
                        setError('SAI VỊ TRÍ! Đây không phải ô đúng. Kiểm tra lại chỉ đường.');
                    }
                } else {
                    // Free placement — accept any block barcode
                    if (result?.type === 'block') {
                        trigger('success');
                        triggerFlash('success');
                        setBlockVerified(true);
                        setStep('scan_product');
                    } else {
                        trigger('error');
                        triggerFlash('error');
                        setError('Không nhận diện được ô kệ. Hãy quét barcode dán trên ô kệ.');
                    }
                }
                return;
            }

            if (step === 'scan_product') {
                // Step 2: Scan product
                if (result?.type === 'product' && result.productId === currentItem.product_id) {
                    const newCount = productScanned + 1;
                    setProductScanned(newCount);
                    trigger('success');
                    triggerFlash('success');

                    if (newCount >= currentItem.quantity) {
                        // Item complete
                        onItemComplete(currentItem.id);
                        setTimeout(() => {
                            setCurrentIndex((prev) => prev + 1);
                            setStep('scan_block');
                            setBlockVerified(false);
                            setProductScanned(0);
                        }, 800);
                    }
                } else {
                    trigger('error');
                    triggerFlash('error');
                    setError('Sản phẩm không đúng! Vui lòng quét đúng sản phẩm cần cất.');
                }
            }
        },
        [currentItem, step, productScanned, error, resolveBarcode, trigger, triggerFlash, onItemComplete],
    );

    useBarcodeScan(handleScan, { disabled: !!error || allDone });

    const dismissError = useCallback(() => setError(null), []);

    // ── ALL DONE ──
    if (allDone) {
        return (
            <div className="h-dvh flex flex-col bg-slate-50 select-none">
                <FlashOverlay flash={flash} />
                <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
                    <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="w-14 h-14 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Cất hàng hoàn tất!</h2>
                    <p className="text-slate-500 text-center">
                        Tất cả {items.length} mục đã được cất đúng vị trí.
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

    return (
        <div className="h-dvh flex flex-col bg-slate-50 relative overflow-hidden select-none">
            <FlashOverlay flash={flash} />

            {/* ── Error overlay ── */}
            {error && (
                <div className="floor-lockscreen" onClick={dismissError}>
                    <AlertTriangle className="w-20 h-20 text-white animate-pulse" />
                    <p className="text-white text-xl font-bold text-center px-6 max-w-md">{error}</p>
                    <button className="floor-btn mt-4 bg-white text-red-600 font-bold" onClick={dismissError}>
                        BỎ QUA
                    </button>
                </div>
            )}

            {/* ── Header ── */}
            <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
                <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-100" title="Quay lại">
                    <ChevronDown className="w-6 h-6 text-slate-500 rotate-90" />
                </button>
                <div className="text-center flex-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        Cất hàng (Putaway)
                    </p>
                    <p className="text-lg font-bold text-slate-800">{receiptCode}</p>
                </div>
                <span className="text-sm font-bold text-teal-600">
                    {currentIndex + 1}/{items.length}
                </span>
            </header>

            {/* ── Direction / Location ── */}
            {currentItem && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Navigation direction */}
                    <div className="px-4 pt-4">
                        <div className="floor-direction bg-blue-50 text-blue-700 border-2 border-blue-200">
                            <Navigation className="w-6 h-6 shrink-0" />
                            <div className="flex-1">
                                <p className="text-xs font-medium text-blue-500 uppercase">ĐI ĐẾN</p>
                                {currentItem.target_location ? (
                                    <p className="text-lg font-black">
                                        Dãy {currentItem.target_location.row_name}
                                        <ArrowRight className="inline w-5 h-5 mx-1" />
                                        Kệ {currentItem.target_location.rack_name}
                                        <ArrowRight className="inline w-5 h-5 mx-1" />
                                        Tầng {currentItem.target_location.shelf_level}
                                        <ArrowRight className="inline w-5 h-5 mx-1" />
                                        Ô {currentItem.target_location.block_code}
                                    </p>
                                ) : (
                                    <p className="text-lg font-black">Chọn ô kệ trống phù hợp</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Product info */}
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
                        <span className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
                            Cần cất: {currentItem.quantity} đơn vị
                        </span>
                    </div>

                    {/* Verification steps */}
                    <div className="bg-white border-t border-slate-200 px-4 py-5 space-y-3">
                        {/* Step 1: Scan block */}
                        <div
                            className={cn(
                                'floor-step-indicator',
                                step === 'scan_block' && 'step-active',
                                blockVerified && 'step-done',
                            )}
                        >
                            {blockVerified ? (
                                <Check className="w-6 h-6 text-green-500" />
                            ) : (
                                <MapPin className="w-6 h-6" />
                            )}
                            <div className="flex-1">
                                <p className="font-bold">Bước 1: Quét mã ô kệ</p>
                                <p className="text-xs opacity-70">
                                    {currentItem.target_location
                                        ? `Quét barcode dán trên ô ${currentItem.target_location.block_code}`
                                        : 'Quét barcode dán trên ô kệ đang đặt hàng'}
                                </p>
                            </div>
                            {step === 'scan_block' && (
                                <ScanBarcode className="w-6 h-6 animate-pulse" />
                            )}
                        </div>

                        {/* Step 2: Scan product */}
                        <div
                            className={cn(
                                'floor-step-indicator',
                                step === 'scan_product' && 'step-active',
                                !blockVerified && 'step-pending',
                            )}
                        >
                            <Package className="w-6 h-6" />
                            <div className="flex-1">
                                <p className="font-bold">Bước 2: Quét sản phẩm</p>
                                <p className="text-xs opacity-70">
                                    {step === 'scan_product'
                                        ? `Đã quét ${productScanned}/${currentItem.quantity}`
                                        : 'Quét mã sản phẩm để xác nhận cất hàng'}
                                </p>
                            </div>
                            {step === 'scan_product' && (
                                <span className="floor-counter floor-counter-sm text-blue-600">
                                    {productScanned}/{currentItem.quantity}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

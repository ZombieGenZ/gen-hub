'use client';

import { useState, useCallback, useRef } from 'react';
import Image from 'next/image';
import {
    Navigation,
    Check,
    Package,
    ScanBarcode,
    ChevronDown,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBarcodeScan } from '@/hooks/useBarcodeScan';
import { useFloorFeedback } from '@/hooks/useFloorFeedback';
import { FlashOverlay, useFlashOverlay } from '@/components/warehouse-floor/FlashOverlay';

// ── Types ──

interface PickItem {
    id: string;
    product_id: string;
    product_name: string;
    sku: string;
    image_url?: string | null;
    quantity: number;
    location: {
        row_name: string;
        rack_name: string;
        shelf_level: number;
        block_code: string;
        block_barcode: string;
    };
    /** Khoảng cách ước lượng tới điểm tiếp theo (mét, tuỳ chọn) */
    distance_hint?: string;
}

interface PickingScreenProps {
    items: PickItem[];
    exportCode: string;
    resolveBarcode: (barcode: string) => string | null; // barcode → product_id
    onItemPicked: (itemId: string, pickedQty: number) => void;
    onAllComplete: () => void;
    onBack: () => void;
}

export default function PickingScreen({
    items,
    exportCode,
    resolveBarcode,
    onItemPicked,
    onAllComplete,
    onBack,
}: PickingScreenProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [scannedQty, setScannedQty] = useState(0);
    const [swipeState, setSwipeState] = useState<'idle' | 'swiping-right' | 'swiping-left'>('idle');
    const { trigger } = useFloorFeedback();
    const { flash, triggerFlash } = useFlashOverlay();

    // Touch/swipe tracking
    const touchStartRef = useRef({ x: 0, y: 0 });
    const [dragX, setDragX] = useState(0);
    const isDraggingRef = useRef(false);

    const currentItem = items[currentIndex] ?? null;
    const allDone = currentIndex >= items.length;

    const advanceToNext = useCallback(() => {
        setSwipeState('swiping-right');
        setTimeout(() => {
            setCurrentIndex((prev) => prev + 1);
            setScannedQty(0);
            setSwipeState('idle');
            setDragX(0);
        }, 350);
    }, []);

    // ── Barcode scan ──
    const handleScan = useCallback(
        (barcode: string) => {
            if (!currentItem || allDone) return;

            const productId = resolveBarcode(barcode);
            if (productId === currentItem.product_id) {
                const newQty = scannedQty + 1;
                setScannedQty(newQty);
                trigger('success');
                triggerFlash('success');

                if (newQty >= currentItem.quantity) {
                    onItemPicked(currentItem.id, newQty);
                    setTimeout(() => advanceToNext(), 600);
                }
            } else {
                trigger('error');
                triggerFlash('error');
            }
        },
        [currentItem, scannedQty, allDone, resolveBarcode, trigger, triggerFlash, onItemPicked, advanceToNext],
    );

    useBarcodeScan(handleScan, { disabled: allDone });

    // ── Touch handlers for swipe ──
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        isDraggingRef.current = false;
    }, []);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        const dx = e.touches[0].clientX - touchStartRef.current.x;
        if (Math.abs(dx) > 20) {
            isDraggingRef.current = true;
            setDragX(dx);
        }
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (!currentItem) return;
        if (dragX > 100 && scannedQty >= currentItem.quantity) {
            // Swipe right = confirm
            onItemPicked(currentItem.id, scannedQty);
            advanceToNext();
        } else {
            setDragX(0);
        }
        isDraggingRef.current = false;
    }, [dragX, scannedQty, currentItem, onItemPicked, advanceToNext]);

    // ── Manual confirm button ──
    const handleManualConfirm = useCallback(() => {
        if (!currentItem || scannedQty < currentItem.quantity) return;
        onItemPicked(currentItem.id, scannedQty);
        advanceToNext();
    }, [currentItem, scannedQty, onItemPicked, advanceToNext]);

    // ── ALL DONE ──
    if (allDone) {
        return (
            <div className="h-dvh flex flex-col bg-slate-50 select-none">
                <FlashOverlay flash={flash} />
                <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
                    <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="w-14 h-14 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Lấy hàng hoàn tất!</h2>
                    <p className="text-slate-500 text-center">
                        Đã lấy đủ {items.length} mục hàng.
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

            {/* ── Header ── */}
            <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
                <button onClick={onBack} className="p-2 -ml-2 rounded-xl hover:bg-slate-100" title="Quay lại">
                    <ChevronDown className="w-6 h-6 text-slate-500 rotate-90" />
                </button>
                <div className="text-center flex-1">
                    <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">
                        Lấy hàng (Picking)
                    </p>
                    <p className="text-lg font-bold text-slate-800">{exportCode}</p>
                </div>
                <span className="text-sm font-bold text-teal-600">
                    {currentIndex + 1}/{items.length}
                </span>
            </header>

            {/* ── Progress dots ── */}
            <div className="flex justify-center gap-1.5 px-4 py-3 bg-white border-b border-slate-100">
                {items.map((_, idx) => (
                    <div
                        key={idx}
                        className={cn(
                            'h-2 rounded-full transition-all duration-300',
                            idx < currentIndex
                                ? 'w-2 bg-green-400'
                                : idx === currentIndex
                                    ? 'w-8 bg-teal-500'
                                    : 'w-2 bg-slate-200',
                        )}
                    />
                ))}
            </div>

            {/* ── Tinder-like Card ── */}
            {currentItem && (
                <div className="flex-1 flex flex-col px-4 pt-4 pb-4 overflow-hidden">
                    <div
                        className={cn(
                            'floor-pick-card bg-white border-2 border-slate-200 shadow-lg flex-1 flex flex-col',
                            swipeState !== 'idle' && swipeState,
                        )}
                        style={dragX !== 0 && swipeState === 'idle'
                            ? { transform: `translateX(${dragX}px) rotate(${dragX * 0.03}deg)` }
                            : undefined
                        }
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                    >
                        {/* Direction */}
                        <div className="floor-direction bg-indigo-50 text-indigo-700 mb-4">
                            <Navigation className="w-6 h-6 shrink-0" />
                            <div className="flex-1">
                                {currentItem.distance_hint && (
                                    <p className="text-xs font-medium text-indigo-400">
                                        {currentItem.distance_hint}
                                    </p>
                                )}
                                <p className="text-base font-black">
                                    Tới Ô {currentItem.location.block_code}
                                    <span className="font-medium text-sm ml-2 text-indigo-400">
                                        (Dãy {currentItem.location.row_name} / Kệ{' '}
                                        {currentItem.location.rack_name} / Tầng{' '}
                                        {currentItem.location.shelf_level})
                                    </span>
                                </p>
                            </div>
                        </div>

                        {/* Product info */}
                        <div className="flex-1 flex flex-col items-center justify-center gap-3">
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
                            <h3 className="text-xl font-bold text-slate-800 text-center">
                                {currentItem.product_name}
                            </h3>
                        </div>

                        {/* Counter */}
                        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                            <div className="flex items-center gap-2 text-slate-400">
                                <ScanBarcode className="w-5 h-5" />
                                <span className="text-sm">Quét mã hoặc vuốt</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span
                                    className={cn(
                                        'floor-counter floor-counter-sm',
                                        scannedQty >= currentItem.quantity
                                            ? 'text-green-500'
                                            : 'text-slate-800',
                                    )}
                                >
                                    {scannedQty}
                                </span>
                                <span className="text-lg text-slate-300 font-bold">/</span>
                                <span className="text-lg text-slate-400 font-bold">
                                    {currentItem.quantity}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Confirm button (visible when qty met) */}
                    {scannedQty >= currentItem.quantity && (
                        <button
                            className="floor-btn floor-btn-giant bg-green-500 text-white w-full mt-4"
                            onClick={handleManualConfirm}
                        >
                            <ChevronRight className="w-7 h-7" />
                            XÁC NHẬN & TIẾP THEO
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

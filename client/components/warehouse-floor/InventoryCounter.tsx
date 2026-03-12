'use client';

import { useState, useCallback, useMemo } from 'react';
import Image from 'next/image';
import { Package, ScanBarcode, Check, AlertTriangle, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useBarcodeScan } from '@/hooks/useBarcodeScan';
import { useFloorFeedback } from '@/hooks/useFloorFeedback';
import { FlashOverlay, useFlashOverlay } from '@/components/warehouse-floor/FlashOverlay';

// ── Types ──

interface CounterItem {
    id: string;
    product_id: string;
    product_name: string;
    sku: string;
    image_url?: string | null;
    batch_code?: string | null;
    expiry_date?: string | null;
    expected_qty: number;
    actual_qty: number;
}

interface ReceiptInfo {
    id: string;
    code: string;
    type: 'inbound' | 'outbound';
    warehouse_name?: string;
    partner_name?: string;
}

interface InventoryCounterProps {
    receipt: ReceiptInfo;
    items: CounterItem[];
    /** Tra cứu barcode → product_id. Trả null nếu SP không tồn tại */
    resolveBarcode: (barcode: string) => string | null;
    onUpdateQty: (itemId: string, qty: number) => void;
    onComplete: () => void;
    onBack: () => void;
}

// ── Component ──

export default function InventoryCounter({
    receipt,
    items: initialItems,
    resolveBarcode,
    onUpdateQty,
    onComplete,
    onBack,
}: InventoryCounterProps) {
    const [items, setItems] = useState(initialItems);
    const [lockError, setLockError] = useState<string | null>(null);
    const { trigger } = useFloorFeedback();
    const { flash, triggerFlash } = useFlashOverlay();

    // Track which items are completed (for collapse animation)
    const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

    // Sort: incomplete first, completed last
    const sortedItems = useMemo(() => {
        const incomplete = items.filter((i) => !completedIds.has(i.id));
        const complete = items.filter((i) => completedIds.has(i.id));
        return [...incomplete, ...complete];
    }, [items, completedIds]);

    // Current focused item (first incomplete)
    const focusedItem = useMemo(() => {
        return sortedItems.find((i) => !completedIds.has(i.id)) ?? null;
    }, [sortedItems, completedIds]);

    // All done?
    const allDone = useMemo(() => {
        return items.every((i) => i.actual_qty >= i.expected_qty);
    }, [items]);

    // ── Barcode scan handler ──
    const handleScan = useCallback(
        (barcode: string) => {
            if (lockError) return; // Locked

            const productId = resolveBarcode(barcode);

            // Check if product exists in the receipt
            const matchItem = items.find((i) => i.product_id === productId);
            if (!matchItem) {
                // WRONG PRODUCT – lock red
                trigger('error');
                triggerFlash('error');
                setLockError(`Sản phẩm với mã "${barcode}" không có trong phiếu!`);
                return;
            }

            // Check if already completed
            if (matchItem.actual_qty >= matchItem.expected_qty) {
                // Over-scanned
                trigger('error');
                triggerFlash('error');
                setLockError(
                    `"${matchItem.product_name}" đã đếm đủ (${matchItem.expected_qty}/${matchItem.expected_qty}). Quét dư!`,
                );
                return;
            }

            // SUCCESS – increment
            trigger('success');
            triggerFlash('success');

            const newQty = matchItem.actual_qty + 1;
            setItems((prev) =>
                prev.map((i) => (i.id === matchItem.id ? { ...i, actual_qty: newQty } : i)),
            );
            onUpdateQty(matchItem.id, newQty);

            // Check if this item is now complete
            if (newQty >= matchItem.expected_qty) {
                setTimeout(() => {
                    setCompletedIds((prev) => new Set(prev).add(matchItem.id));
                }, 600);
            }
        },
        [items, lockError, resolveBarcode, trigger, triggerFlash, onUpdateQty],
    );

    useBarcodeScan(handleScan, { disabled: !!lockError });

    // Dismiss lock screen
    const dismissLock = useCallback(() => {
        setLockError(null);
    }, []);

    return (
        <div className="h-dvh flex flex-col bg-slate-50 relative overflow-hidden select-none">
            <FlashOverlay flash={flash} />

            {/* ── Lock Screen (wrong scan) ── */}
            {lockError && (
                <div className="floor-lockscreen" onClick={dismissLock}>
                    <AlertTriangle className="w-20 h-20 text-white animate-pulse" />
                    <p className="text-white text-xl font-bold text-center px-6 max-w-md">
                        {lockError}
                    </p>
                    <button
                        className="floor-btn mt-4 bg-white text-red-600 font-bold"
                        onClick={dismissLock}
                    >
                        <X className="w-6 h-6" />
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
                        {receipt.type === 'inbound' ? 'Phiếu Nhập' : 'Phiếu Xuất'}
                    </p>
                    <p className="text-lg font-bold text-slate-800">{receipt.code}</p>
                </div>
                <div className="w-10" />
            </header>

            {/* ── Focus Mode – Current Product ── */}
            {focusedItem && !allDone && (
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Top half: Product info */}
                    <div className="flex-1 flex flex-col items-center justify-center px-6 py-4 gap-3">
                        {focusedItem.image_url ? (
                            <div className="floor-product-image relative">
                                <Image
                                    src={focusedItem.image_url}
                                    alt={focusedItem.product_name}
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
                        <h2 className="text-xl font-bold text-slate-800 text-center leading-tight">
                            {focusedItem.product_name}
                        </h2>
                        <div className="flex gap-3 flex-wrap justify-center">
                            <span className="text-sm bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-medium">
                                SKU: {focusedItem.sku}
                            </span>
                            {focusedItem.batch_code && (
                                <span className="text-sm bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-medium">
                                    Lô: {focusedItem.batch_code}
                                </span>
                            )}
                            {focusedItem.expiry_date && (
                                <span className="text-sm bg-amber-50 text-amber-600 px-3 py-1 rounded-full font-medium">
                                    HSD: {new Date(focusedItem.expiry_date).toLocaleDateString('vi-VN')}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Bottom half: Giant counter */}
                    <div className="bg-white border-t border-slate-200 px-6 py-6 flex flex-col items-center gap-4">
                        <div className="flex items-baseline gap-2">
                            <span
                                className={cn(
                                    'floor-counter floor-counter-lg transition-colors',
                                    focusedItem.actual_qty >= focusedItem.expected_qty
                                        ? 'text-green-500'
                                        : 'text-slate-800',
                                )}
                            >
                                {focusedItem.actual_qty}
                            </span>
                            <span className="floor-counter text-3xl text-slate-300">/</span>
                            <span className="floor-counter text-3xl text-slate-400">
                                {focusedItem.expected_qty}
                            </span>
                        </div>

                        {/* Progress bar */}
                        <div className="w-full max-w-xs h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    'h-full rounded-full transition-all duration-300',
                                    focusedItem.actual_qty >= focusedItem.expected_qty ? 'bg-green-500' : 'bg-teal-500',
                                )}
                                style={{ width: `${Math.min(100, (focusedItem.actual_qty / focusedItem.expected_qty) * 100)}%` }}
                            />
                        </div>

                        <div className="flex items-center gap-2 text-slate-400 text-sm">
                            <ScanBarcode className="w-5 h-5" />
                            <span>Quét mã vạch sản phẩm để đếm</span>
                        </div>
                    </div>

                    {/* Remaining items list (collapsed) */}
                    <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 max-h-48 overflow-y-auto">
                        <p className="text-xs text-slate-400 font-semibold uppercase mb-2">
                            Còn lại ({items.filter((i) => i.actual_qty < i.expected_qty).length - 1} sản phẩm)
                        </p>
                        {sortedItems
                            .filter((i) => i.id !== focusedItem.id && !completedIds.has(i.id))
                            .map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                                >
                                    <span className="text-sm text-slate-600 truncate flex-1">
                                        {item.product_name}
                                    </span>
                                    <span className="text-sm font-bold text-slate-500 ml-2 whitespace-nowrap">
                                        {item.actual_qty}/{item.expected_qty}
                                    </span>
                                </div>
                            ))}

                        {/* Completed items */}
                        {sortedItems.filter((i) => completedIds.has(i.id)).length > 0 && (
                            <>
                                <p className="text-xs text-green-500 font-semibold uppercase mt-3 mb-2">
                                    ✓ Đã đếm đủ
                                </p>
                                {sortedItems
                                    .filter((i) => completedIds.has(i.id))
                                    .map((item) => (
                                        <div
                                            key={item.id}
                                            className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 opacity-50"
                                        >
                                            <span className="text-sm text-slate-500 truncate flex-1 line-through">
                                                {item.product_name}
                                            </span>
                                            <Check className="w-4 h-4 text-green-500 ml-2" />
                                        </div>
                                    ))}
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* ── All Done ── */}
            {allDone && (
                <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
                    <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center">
                        <Check className="w-14 h-14 text-green-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Kiểm đếm hoàn tất!</h2>
                    <p className="text-slate-500 text-center">
                        Tất cả {items.length} sản phẩm đã được đếm đúng số lượng.
                    </p>
                    <button
                        className="floor-btn floor-btn-giant bg-teal-600 text-white w-full max-w-sm"
                        onClick={onComplete}
                    >
                        <Check className="w-7 h-7" />
                        XÁC NHẬN HOÀN TẤT
                    </button>
                </div>
            )}
        </div>
    );
}

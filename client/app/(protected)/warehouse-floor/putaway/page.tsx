'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScanBarcode, PackagePlus, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { useBarcodeScan } from '@/hooks/useBarcodeScan';
import { useFloorFeedback } from '@/hooks/useFloorFeedback';
import { FlashOverlay, useFlashOverlay } from '@/components/warehouse-floor/FlashOverlay';
import PutawayScreen from '@/components/warehouse-floor/PutawayScreen';
import { AuthService } from '@/services/auth/auth.service';
import { InventoryService } from '@/services/inventory/inventory.service';
import { WarehouseManagerInventoryService } from '@/services/inventory/warehouse-manager-inventory.service';
import type { InboundRequest, InboundDetail } from '@/services/inventory/inventory.types';

const authService = new AuthService();
const inventoryService = new InventoryService();
const wmService = new WarehouseManagerInventoryService();

type PageState = 'waiting' | 'loading' | 'putaway' | 'submitting' | 'error';

interface PutawayItem {
    id: string;
    product_id: string;
    product_name: string;
    sku: string;
    image_url?: string | null;
    quantity: number;
}

function mapDetailToItem(d: InboundDetail): PutawayItem {
    return {
        id: d.id,
        product_id: d.product_id,
        product_name: d.product?.name ?? '(Không rõ sản phẩm)',
        sku: d.product?.sku ?? '',
        image_url: d.product?.image_url ?? null,
        quantity: d.actual_qty ?? d.expected_qty,
    };
}

export default function PutawayPage() {
    const router = useRouter();
    const [state, setState] = useState<PageState>('waiting');
    const [receipt, setReceipt] = useState<InboundRequest | null>(null);
    const [items, setItems] = useState<PutawayItem[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const { trigger } = useFloorFeedback();
    const { flash, triggerFlash } = useFlashOverlay();

    const loadReceipt = useCallback(async (barcode: string) => {
        setState('loading');
        try {
            const token = await authService.getValidAccessToken();
            if (!token) throw new Error('Chưa đăng nhập');

            const res = await inventoryService.listInbound(token, { keywords: barcode, limit: 5 });
            const allItems = res?.data?.items ?? [];
            const found = allItems.find((r) => r.status === 'PROCESSING') ?? null;

            if (!found) {
                trigger('error');
                triggerFlash('error');
                setErrorMsg(
                    allItems.length
                        ? `Phiếu ${barcode} chưa hoàn thành kiểm đếm (chưa ở trạng thái sẵn sàng cất hàng)`
                        : `Không tìm thấy phiếu PO cho mã: ${barcode}`,
                );
                setState('error');
                return;
            }

            const detail = await inventoryService.getInboundById(token, found.id);
            const fullReceipt = detail?.data ?? detail as unknown as InboundRequest;

            setReceipt(fullReceipt);
            setItems((fullReceipt.details ?? []).map(mapDetailToItem));
            trigger('success');
            triggerFlash('success');
            setState('putaway');
        } catch (err) {
            trigger('error');
            triggerFlash('error');
            setErrorMsg(err instanceof Error ? err.message : 'Lỗi tải phiếu cất hàng');
            setState('error');
        }
    }, [trigger, triggerFlash]);

    useBarcodeScan(
        useCallback(
            (barcode: string) => {
                if (state !== 'waiting') return;
                loadReceipt(barcode);
            },
            [state, loadReceipt],
        ),
        { disabled: state !== 'waiting' },
    );

    // resolveBarcode: any BLK-* → block; SKU match → product
    const resolveBarcode = useCallback(
        (barcode: string): { type: 'block'; code: string } | { type: 'product'; productId: string } | null => {
            if (barcode.toUpperCase().startsWith('BLK-') || barcode.toUpperCase().startsWith('BLOCK-')) {
                return { type: 'block', code: barcode };
            }
            const item = items.find((i) => i.sku === barcode);
            if (item) return { type: 'product', productId: item.product_id };
            return null;
        },
        [items],
    );

    const handleAllComplete = useCallback(async () => {
        if (!receipt) return;
        setState('submitting');
        try {
            const token = await authService.getValidAccessToken();
            if (!token) throw new Error('Chưa đăng nhập');
            await wmService.confirmPutaway(token, receipt.id);
            router.push('/warehouse-floor');
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Lỗi xác nhận cất hàng');
            setState('error');
        }
    }, [receipt, router]);

    if (state === 'loading' || state === 'submitting') {
        return (
            <div className="h-dvh flex flex-col items-center justify-center gap-4 bg-slate-50">
                <Loader2 className="w-12 h-12 text-teal-500 animate-spin" />
                <p className="text-slate-600 font-medium">
                    {state === 'loading' ? 'Đang tải phiếu cất hàng...' : 'Đang xác nhận...'}
                </p>
            </div>
        );
    }

    if (state === 'error') {
        return (
            <div className="h-dvh flex flex-col items-center justify-center gap-5 px-6 bg-slate-50">
                <FlashOverlay flash={flash} />
                <AlertCircle className="w-16 h-16 text-red-400" />
                <p className="text-xl font-bold text-slate-800 text-center">Có lỗi xảy ra</p>
                <p className="text-slate-500 text-center">{errorMsg}</p>
                <button
                    className="floor-btn bg-teal-600 text-white"
                    onClick={() => { setErrorMsg(null); setState('waiting'); }}
                >
                    Thử lại
                </button>
            </div>
        );
    }

    if (state === 'putaway' && receipt) {
        return (
            <PutawayScreen
                items={items}
                receiptCode={receipt.code}
                resolveBarcode={resolveBarcode}
                onItemComplete={() => {/* items tracked inside component */ }}
                onAllComplete={handleAllComplete}
                onBack={() => setState('waiting')}
            />
        );
    }

    return (
        <div className="h-dvh flex flex-col bg-slate-50 select-none">
            <FlashOverlay flash={flash} />
            <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
                <button onClick={() => router.push('/warehouse-floor')} className="p-2 -ml-2 rounded-xl hover:bg-slate-100" title="Quay lại">
                    <ChevronDown className="w-6 h-6 text-slate-500 rotate-90" />
                </button>
                <div className="text-center flex-1">
                    <p className="text-lg font-bold text-slate-800">Cất hàng (Putaway)</p>
                </div>
                <div className="w-10" />
            </header>
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
                <div className="w-24 h-24 rounded-full bg-teal-50 flex items-center justify-center">
                    <PackagePlus className="w-14 h-14 text-teal-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 text-center">
                    Quét Mã Phiếu PO
                </h2>
                <p className="text-slate-500 text-center max-w-xs">
                    Quét phiếu đã hoàn thành kiểm đếm để bắt đầu cất hàng vào kệ
                </p>
                <div className="flex items-center gap-3 text-slate-400">
                    <ScanBarcode className="w-8 h-8 animate-pulse" />
                    <span className="text-sm font-medium">Đang chờ quét...</span>
                </div>
            </div>
        </div>
    );
}



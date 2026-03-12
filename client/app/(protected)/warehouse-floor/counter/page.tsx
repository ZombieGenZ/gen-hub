'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ScanBarcode, ClipboardCheck, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { useBarcodeScan } from '@/hooks/useBarcodeScan';
import { useFloorFeedback } from '@/hooks/useFloorFeedback';
import { FlashOverlay, useFlashOverlay } from '@/components/warehouse-floor/FlashOverlay';
import InventoryCounter from '@/components/warehouse-floor/InventoryCounter';
import { AuthService } from '@/services/auth/auth.service';
import { InventoryService } from '@/services/inventory/inventory.service';
import { WarehouseManagerInventoryService } from '@/services/inventory/warehouse-manager-inventory.service';
import type { InboundRequest, InboundDetail } from '@/services/inventory/inventory.types';

const authService = new AuthService();
const inventoryService = new InventoryService();
const wmService = new WarehouseManagerInventoryService();

type PageState = 'waiting' | 'loading' | 'counting' | 'submitting' | 'error';

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

function mapDetailToItem(d: InboundDetail): CounterItem {
    return {
        id: d.id,
        product_id: d.product_id,
        product_name: d.product?.name ?? '(Không rõ sản phẩm)',
        sku: d.product?.sku ?? '',
        image_url: d.product?.image_url ?? null,
        batch_code: d.batch?.code ?? null,
        expiry_date: d.batch?.expiry_date ?? null,
        expected_qty: d.expected_qty,
        actual_qty: d.actual_qty ?? 0,
    };
}

export default function CounterPage() {
    const router = useRouter();
    const [state, setState] = useState<PageState>('waiting');
    const [receipt, setReceipt] = useState<InboundRequest | null>(null);
    const [items, setItems] = useState<CounterItem[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const qtyMapRef = useRef<Map<string, number>>(new Map());
    const { trigger } = useFloorFeedback();
    const { flash, triggerFlash } = useFlashOverlay();

    // ── Load receipt by scanned barcode ──
    const loadReceipt = useCallback(async (barcode: string) => {
        setState('loading');
        try {
            const token = await authService.getValidAccessToken();
            if (!token) throw new Error('Chưa đăng nhập');

            // Search for receipt in RECEIVING status first, then APPROVED
            const res = await inventoryService.listInbound(token, { keywords: barcode, limit: 5 });
            const allItems = res?.data?.items ?? [];
            const found = allItems.find(
                (r) => r.status === 'RECEIVING' || r.status === 'APPROVED',
            ) ?? allItems[0] ?? null;

            if (!found) {
                trigger('error');
                triggerFlash('error');
                setErrorMsg(`Không tìm thấy phiếu nhập cho mã: ${barcode}`);
                setState('error');
                return;
            }

            // If APPROVED, kick off start-receiving first
            if (found.status === 'APPROVED') {
                await wmService.startReceiving(token, found.id);
            }

            // Fetch full detail with product/batch info
            const detail = await inventoryService.getInboundById(token, found.id);
            const fullReceipt = detail?.data ?? detail as unknown as InboundRequest;

            const counterItems = (fullReceipt.details ?? []).map(mapDetailToItem);
            qtyMapRef.current = new Map(counterItems.map((i) => [i.id, i.expected_qty]));

            setReceipt(fullReceipt);
            setItems(counterItems);
            trigger('success');
            triggerFlash('success');
            setState('counting');
        } catch (err) {
            trigger('error');
            triggerFlash('error');
            setErrorMsg(err instanceof Error ? err.message : 'Lỗi tải phiếu nhập');
            setState('error');
        }
    }, [trigger, triggerFlash]);

    // Waiting screen: scan receipt code
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

    const resolveBarcode = useCallback(
        (barcode: string): string | null => {
            const item = items.find((i) => i.sku === barcode);
            return item?.product_id ?? null;
        },
        [items],
    );

    const handleUpdateQty = useCallback((itemId: string, qty: number) => {
        qtyMapRef.current.set(itemId, qty);
    }, []);

    const handleComplete = useCallback(async () => {
        if (!receipt) return;
        setState('submitting');
        try {
            const token = await authService.getValidAccessToken();
            if (!token) throw new Error('Chưa đăng nhập');
            await wmService.confirmReceiving(token, receipt.id, {
                details: items.map((i) => ({
                    detail_id: i.id,
                    actual_qty: qtyMapRef.current.get(i.id) ?? i.expected_qty,
                })),
            });
            router.push('/warehouse-floor');
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Lỗi xác nhận kiểm đếm');
            setState('error');
        }
    }, [receipt, items, router]);

    if (state === 'loading' || state === 'submitting') {
        return (
            <div className="h-dvh flex flex-col items-center justify-center gap-4 bg-slate-50">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                <p className="text-slate-600 font-medium">
                    {state === 'loading' ? 'Đang tải phiếu nhập...' : 'Đang xác nhận...'}
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
                    className="floor-btn bg-blue-600 text-white"
                    onClick={() => { setErrorMsg(null); setState('waiting'); }}
                >
                    Thử lại
                </button>
            </div>
        );
    }

    if (state === 'counting' && receipt) {
        return (
            <InventoryCounter
                receipt={{
                    id: receipt.id,
                    code: receipt.code,
                    type: 'inbound',
                    warehouse_name: receipt.warehouse?.name,
                    partner_name: receipt.partner?.name,
                }}
                items={items}
                resolveBarcode={resolveBarcode}
                onUpdateQty={handleUpdateQty}
                onComplete={handleComplete}
                onBack={() => setState('waiting')}
            />
        );
    }

    // ── Waiting Screen ──
    return (
        <div className="h-dvh flex flex-col bg-slate-50 select-none">
            <FlashOverlay flash={flash} />

            <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 shrink-0">
                <button onClick={() => router.push('/warehouse-floor')} className="p-2 -ml-2 rounded-xl hover:bg-slate-100" title="Quay lại">
                    <ChevronDown className="w-6 h-6 text-slate-500 rotate-90" />
                </button>
                <div className="text-center flex-1">
                    <p className="text-lg font-bold text-slate-800">Kiểm đếm</p>
                </div>
                <div className="w-10" />
            </header>

            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
                <div className="w-24 h-24 rounded-full bg-blue-50 flex items-center justify-center">
                    <ClipboardCheck className="w-14 h-14 text-blue-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 text-center">
                    Quét Mã Phiếu Nhập
                </h2>
                <p className="text-slate-500 text-center max-w-xs">
                    Hướng súng quét vào mã vạch trên phiếu để bắt đầu kiểm đếm
                </p>
                <div className="flex items-center gap-3 text-slate-400">
                    <ScanBarcode className="w-8 h-8 animate-pulse" />
                    <span className="text-sm font-medium">Đang chờ quét...</span>
                </div>
            </div>
        </div>
    );
}


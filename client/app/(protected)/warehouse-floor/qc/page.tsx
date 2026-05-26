'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ScanBarcode, Shield, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { useBarcodeScan } from '@/hooks/useBarcodeScan';
import { useFloorFeedback } from '@/hooks/useFloorFeedback';
import { FlashOverlay, useFlashOverlay } from '@/components/warehouse-floor/FlashOverlay';
import QCInspectionScreen from '@/components/warehouse-floor/QCInspectionScreen';
import { AuthService } from '@/services/auth/auth.service';
import { InventoryService } from '@/services/inventory/inventory.service';
import type { InboundRequest, InboundDetail } from '@/services/inventory/inventory.types';

const authService = new AuthService();
const inventoryService = new InventoryService();

type PageState = 'waiting' | 'loading' | 'inspecting' | 'error';

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

function mapDetailToQCItem(d: InboundDetail, receiptCode: string): QCItem {
    return {
        id: d.id,
        product_id: d.product_id,
        product_name: d.product?.name ?? '(Không rõ sản phẩm)',
        sku: d.product?.sku ?? '',
        image_url: d.product?.image_url ?? null,
        batch_code: d.batch?.code ?? null,
        expiry_date: d.batch?.expiry_date ?? null,
        quantity: d.expected_qty,
        receipt_code: receiptCode,
    };
}

export default function QCPage() {
    const router = useRouter();
    const [state, setState] = useState<PageState>('waiting');
    const [receipt, setReceipt] = useState<InboundRequest | null>(null);
    const [items, setItems] = useState<QCItem[]>([]);
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
            // QC typically happens on receipts that are RECEIVING (pre-confirmation)
            const found =
                allItems.find((r) => r.status === 'RECEIVING') ??
                allItems.find((r) => r.status === 'APPROVED') ??
                allItems[0] ??
                null;

            if (!found) {
                trigger('error');
                triggerFlash('error');
                setErrorMsg(`Không tìm thấy phiếu PO cho mã: ${barcode}`);
                setState('error');
                return;
            }

            const detail = await inventoryService.getInboundById(token, found.id);
            const fullReceipt = detail?.data ?? detail as unknown as InboundRequest;

            setReceipt(fullReceipt);
            setItems((fullReceipt.details ?? []).map((d) => mapDetailToQCItem(d, fullReceipt.code)));
            trigger('success');
            triggerFlash('success');
            setState('inspecting');
        } catch (err) {
            trigger('error');
            triggerFlash('error');
            setErrorMsg(err instanceof Error ? err.message : 'Lỗi tải phiếu QC');
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

    const resolveBarcode = useCallback(
        (barcode: string): string | null => {
            const item = items.find((i) => i.sku === barcode);
            return item?.product_id ?? null;
        },
        [items],
    );

    if (state === 'loading') {
        return (
            <div className="h-dvh flex flex-col items-center justify-center gap-4 bg-slate-50">
                <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
                <p className="text-slate-600 font-medium">Đang tải phiếu kiểm tra...</p>
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
                    className="floor-btn bg-amber-600 text-white"
                    onClick={() => { setErrorMsg(null); setState('waiting'); }}
                >
                    Thử lại
                </button>
            </div>
        );
    }

    if (state === 'inspecting' && receipt) {
        return (
            <QCInspectionScreen
                items={items}
                assignedArea={receipt.warehouse?.name ?? 'Kho'}
                quarantineBlockCode="QR-01"
                resolveBarcode={resolveBarcode}
                onInspectionResult={(result) => {
                    // Results stored client-side; no backend QC inspection API for inbound items
                    console.info('QC result:', result);
                }}
                onAllComplete={() => router.push('/warehouse-floor')}
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
                    <p className="text-lg font-bold text-slate-800">Kiểm tra QC</p>
                </div>
                <div className="w-10" />
            </header>
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
                <div className="w-24 h-24 rounded-full bg-amber-50 flex items-center justify-center">
                    <Shield className="w-14 h-14 text-amber-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 text-center">
                    Quét Mã để Bắt đầu QC
                </h2>
                <p className="text-slate-500 text-center max-w-xs">
                    Quét phiếu PO đang kiểm đếm để bắt đầu quy trình QC
                </p>
                <div className="flex items-center gap-3 text-slate-600">
                    <ScanBarcode className="w-8 h-8 animate-pulse" />
                    <span className="text-sm font-medium">Đang chờ quét...</span>
                </div>
            </div>
        </div>
    );
}



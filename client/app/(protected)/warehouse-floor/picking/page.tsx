'use client';

import { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ScanBarcode, PackageMinus, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import { useBarcodeScan } from '@/hooks/useBarcodeScan';
import { useFloorFeedback } from '@/hooks/useFloorFeedback';
import { FlashOverlay, useFlashOverlay } from '@/components/warehouse-floor/FlashOverlay';
import PickingScreen from '@/components/warehouse-floor/PickingScreen';
import { AuthService } from '@/services/auth/auth.service';
import { WarehouseManagerInventoryService } from '@/services/inventory/warehouse-manager-inventory.service';
import { WarehouseService } from '@/services/warehouse/warehouse.service';
import type { OutboundRequest, OutboundDetail } from '@/services/inventory/inventory.types';
import type { WarehouseLayout } from '@/services/warehouse/warehouse.types';

const authService = new AuthService();
const wmService = new WarehouseManagerInventoryService();
const warehouseService = new WarehouseService();

type PageState = 'waiting' | 'loading' | 'picking' | 'submitting' | 'error';

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
}

interface BlockLocation {
    row_name: string;
    rack_name: string;
    shelf_level: number;
    block_code: string;
}

function buildBlockMap(layout: WarehouseLayout): Map<string, BlockLocation> {
    const map = new Map<string, BlockLocation>();
    for (const row of layout.rows) {
        for (const rack of row.racks) {
            for (let si = 0; si < rack.shelves.length; si++) {
                const shelf = rack.shelves[si];
                const shelfLevel = parseInt(shelf.code, 10) || si + 1;
                for (const block of shelf.blocks) {
                    map.set(block.id, {
                        row_name: row.code,
                        rack_name: rack.code,
                        shelf_level: shelfLevel,
                        block_code: block.code,
                    });
                }
            }
        }
    }
    return map;
}

function buildDetailMap(details: OutboundDetail[]): Map<string, OutboundDetail> {
    return new Map(details.map((d) => [d.id, d]));
}

export default function PickingPage() {
    const router = useRouter();
    const [state, setState] = useState<PageState>('waiting');
    const [exportRecord, setExportRecord] = useState<OutboundRequest | null>(null);
    const [items, setItems] = useState<PickItem[]>([]);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const pickedQtyRef = useRef<Map<string, number>>(new Map());
    const { trigger } = useFloorFeedback();
    const { flash, triggerFlash } = useFlashOverlay();

    const loadExport = useCallback(async (barcode: string) => {
        setState('loading');
        try {
            const token = await authService.getValidAccessToken();
            if (!token) throw new Error('Chưa đăng nhập');

            const res = await wmService.listOutbound(token, { keywords: barcode, limit: 5 });
            const allItems = res?.data?.items ?? [];
            const found = allItems.find((r) => r.status === 'PICKING') ?? null;

            if (!found) {
                trigger('error');
                triggerFlash('error');
                setErrorMsg(
                    allItems.length
                        ? `Phiếu ${barcode} chưa ở trạng thái lấy hàng`
                        : `Không tìm thấy phiếu xuất cho mã: ${barcode}`,
                );
                setState('error');
                return;
            }

            const [detailRes, layout] = await Promise.all([
                wmService.getOutboundById(token, found.id),
                warehouseService.getLayout(token, found.warehouse_id).catch(() => null),
            ]);
            const fullExport = detailRes?.data ?? detailRes as unknown as OutboundRequest;
            const blockMap = buildBlockMap(layout ?? { rows: [] } as unknown as WarehouseLayout);
            const detailMap = buildDetailMap(fullExport.details ?? []);

            const pickList = fullExport.pick_lists?.[0];
            const mapped: PickItem[] = (pickList?.details ?? []).map((d) => {
                const loc = blockMap.get(d.block_id);
                const exportDetail = detailMap.get(d.export_detail_id);
                return {
                    id: d.id,
                    product_id: d.product_id,
                    product_name: exportDetail?.product?.name ?? '(Không rõ sản phẩm)',
                    sku: exportDetail?.product?.sku ?? '',
                    image_url: exportDetail?.product?.image_url ?? null,
                    quantity: d.required_qty,
                    location: {
                        row_name: loc?.row_name ?? '?',
                        rack_name: loc?.rack_name ?? '?',
                        shelf_level: loc?.shelf_level ?? 1,
                        block_code: loc?.block_code ?? d.block_id.slice(0, 8),
                        block_barcode: loc?.block_code ?? d.block_id.slice(0, 8),
                    },
                };
            });

            pickedQtyRef.current = new Map(mapped.map((i) => [i.id, i.quantity]));
            setExportRecord(fullExport);
            setItems(mapped);
            trigger('success');
            triggerFlash('success');
            setState('picking');
        } catch (err) {
            trigger('error');
            triggerFlash('error');
            setErrorMsg(err instanceof Error ? err.message : 'Lỗi tải phiếu lấy hàng');
            setState('error');
        }
    }, [trigger, triggerFlash]);

    useBarcodeScan(
        useCallback(
            (barcode: string) => {
                if (state !== 'waiting') return;
                loadExport(barcode);
            },
            [state, loadExport],
        ),
        { disabled: state !== 'waiting' },
    );

    const resolveBarcode = useCallback(
        (barcode: string): string | null => {
            const item = items.find((i) => i.sku === barcode || i.location.block_barcode === barcode);
            return item?.product_id ?? null;
        },
        [items],
    );

    const handleItemPicked = useCallback((id: string, qty: number) => {
        pickedQtyRef.current.set(id, qty);
    }, []);

    const handleAllComplete = useCallback(async () => {
        if (!exportRecord) return;
        setState('submitting');
        try {
            const token = await authService.getValidAccessToken();
            if (!token) throw new Error('Chưa đăng nhập');
            const details = items.map((i) => ({
                pick_list_detail_id: i.id,
                picked_qty: pickedQtyRef.current.get(i.id) ?? i.quantity,
            }));
            await wmService.confirmPicking(token, exportRecord.id, { details });
            router.push('/warehouse-floor');
        } catch (err) {
            setErrorMsg(err instanceof Error ? err.message : 'Lỗi xác nhận lấy hàng');
            setState('error');
        }
    }, [exportRecord, items, router]);

    if (state === 'loading' || state === 'submitting') {
        return (
            <div className="h-dvh flex flex-col items-center justify-center gap-4 bg-slate-50">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-slate-600 font-medium">
                    {state === 'loading' ? 'Đang tải phiếu lấy hàng...' : 'Đang xác nhận...'}
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
                    className="floor-btn bg-indigo-600 text-white"
                    onClick={() => { setErrorMsg(null); setState('waiting'); }}
                >
                    Thử lại
                </button>
            </div>
        );
    }

    if (state === 'picking' && exportRecord) {
        return (
            <PickingScreen
                items={items}
                exportCode={exportRecord.code}
                resolveBarcode={resolveBarcode}
                onItemPicked={handleItemPicked}
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
                    <p className="text-lg font-bold text-slate-800">Lấy hàng (Picking)</p>
                </div>
                <div className="w-10" />
            </header>
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
                <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center">
                    <PackageMinus className="w-14 h-14 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-800 text-center">
                    Quét Mã Phiếu Xuất
                </h2>
                <p className="text-slate-500 text-center max-w-xs">
                    Quét phiếu xuất kho để nhận danh sách lấy hàng theo đường đi ngắn nhất
                </p>
                <div className="flex items-center gap-3 text-slate-400">
                    <ScanBarcode className="w-8 h-8 animate-pulse" />
                    <span className="text-sm font-medium">Đang chờ quét...</span>
                </div>
            </div>
        </div>
    );
}


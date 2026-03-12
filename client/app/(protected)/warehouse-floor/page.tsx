'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    ClipboardCheck,
    PackagePlus,
    PackageMinus,
    Shield,
    ScanBarcode,
    ChevronDown,
    Warehouse,
} from 'lucide-react';
import { useBarcodeScan } from '@/hooks/useBarcodeScan';
import { useFloorFeedback } from '@/hooks/useFloorFeedback';
import { FlashOverlay, useFlashOverlay } from '@/components/warehouse-floor/FlashOverlay';

import type { LucideIcon } from 'lucide-react';

type FloorMode = 'counter' | 'putaway' | 'picking' | 'qc';

const MODES: { id: FloorMode; label: string; description: string; icon: LucideIcon; color: string; bg: string }[] = [
    {
        id: 'counter',
        label: 'Kiểm đếm',
        description: 'Đếm hàng nhập/xuất theo phiếu',
        icon: ClipboardCheck,
        color: 'text-blue-600',
        bg: 'bg-blue-50 border-blue-200 hover:bg-blue-100',
    },
    {
        id: 'putaway',
        label: 'Cất hàng (Putaway)',
        description: 'Cất hàng lên kệ đúng vị trí',
        icon: PackagePlus,
        color: 'text-teal-600',
        bg: 'bg-teal-50 border-teal-200 hover:bg-teal-100',
    },
    {
        id: 'picking',
        label: 'Lấy hàng (Picking)',
        description: 'Lấy hàng theo lệnh xuất kho',
        icon: PackageMinus,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100',
    },
    {
        id: 'qc',
        label: 'Kiểm tra QC',
        description: 'Giám định chất lượng sản phẩm',
        icon: Shield,
        color: 'text-amber-600',
        bg: 'bg-amber-50 border-amber-200 hover:bg-amber-100',
    },
];

export default function WarehouseFloorPage() {
    const router = useRouter();
    const { trigger } = useFloorFeedback();
    const { flash, triggerFlash } = useFlashOverlay();
    const [pendingCode, setPendingCode] = useState<string | null>(null);

    // Barcode-first: Quét mã phiếu tại trang chính sẽ tự động nhảy vào chế độ phù hợp
    useBarcodeScan(
        useCallback(
            (barcode: string) => {
                trigger('success');
                triggerFlash('success');
                setPendingCode(barcode);
                // In production, resolve barcode → receipt type → navigate
                // For now, show a notification
            },
            [trigger, triggerFlash],
        ),
    );

    const handleSelectMode = useCallback(
        (mode: FloorMode) => {
            router.push(`/warehouse-floor/${mode}`);
        },
        [router],
    );

    return (
        <div className="h-dvh flex flex-col bg-slate-50 select-none">
            <FlashOverlay flash={flash} />

            {/* Header */}
            <header className="bg-white border-b border-slate-200 px-4 py-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center">
                        <Warehouse className="w-7 h-7 text-teal-600" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Sàn Kho</h1>
                        <p className="text-sm text-slate-500">Chọn chế độ hoặc quét mã phiếu</p>
                    </div>
                </div>
            </header>

            {/* Scan prompt */}
            <div className="px-4 pt-4">
                <div className="flex items-center gap-3 bg-white border-2 border-dashed border-slate-300 rounded-2xl p-4">
                    <ScanBarcode className="w-8 h-8 text-slate-400 animate-pulse" />
                    <div className="flex-1">
                        <p className="text-sm font-bold text-slate-700">Quét mã phiếu để bắt đầu nhanh</p>
                        <p className="text-xs text-slate-400">
                            Bóp cò súng quét mã ▸ Hệ thống tự nhận diện loại phiếu
                        </p>
                    </div>
                    {pendingCode && (
                        <span className="text-xs bg-teal-50 text-teal-600 px-2 py-1 rounded-lg font-mono">
                            {pendingCode}
                        </span>
                    )}
                </div>
            </div>

            {/* Mode selection */}
            <div className="flex-1 px-4 py-4 space-y-3 overflow-y-auto">
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Hoặc chọn chế độ
                </p>
                {MODES.map((mode) => {
                    const Icon = mode.icon;
                    return (
                        <button
                            key={mode.id}
                            className={`w-full flex items-center gap-4 p-5 rounded-2xl border-2 transition-all ${mode.bg}`}
                            onClick={() => handleSelectMode(mode.id)}
                        >
                            <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${mode.color} bg-white shadow-sm`}>
                                <Icon className="w-8 h-8" />
                            </div>
                            <div className="text-left flex-1">
                                <p className={`text-lg font-bold ${mode.color}`}>{mode.label}</p>
                                <p className="text-sm text-slate-500">{mode.description}</p>
                            </div>
                            <ChevronDown className="w-5 h-5 text-slate-300 -rotate-90" />
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

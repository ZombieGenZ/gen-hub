"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { revenueAnalyticsService } from "@/services/revenue-analytics/revenue-analytics.service";
import type { RevenueFilters } from "@/services/revenue-analytics/revenue-analytics.types";

interface RevenueExportDialogProps {
    filters: RevenueFilters;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const EXPORT_COLUMNS = [
    { key: "org_name", label: "Tên công ty", default: true },
    { key: "contract_code", label: "Mã hợp đồng", default: true },
    { key: "status", label: "Trạng thái", default: true },
    { key: "amount", label: "Số tiền thực thu", default: true },
    { key: "payment_method", label: "Phương thức thanh toán", default: false },
    { key: "paid_at", label: "Ngày thanh toán", default: true },
    { key: "warehouse", label: "Kho hàng", default: false },
    { key: "overdue_penalty", label: "Tiền phạt", default: false },
];

export function RevenueExportDialog({ filters, open, onOpenChange }: RevenueExportDialogProps) {
    const [selectedCols, setSelectedCols] = useState<Set<string>>(
        new Set(EXPORT_COLUMNS.filter(c => c.default).map(c => c.key)),
    );
    const [format, setFormat] = useState<"excel" | "pdf">("excel");
    const [isExporting, setIsExporting] = useState(false);

    const toggleCol = (key: string) => {
        setSelectedCols(prev => {
            const next = new Set(prev);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const handleExport = async () => {
        setIsExporting(true);
        try {
            const blob = await revenueAnalyticsService.exportReport(filters, format);
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `bao-cao-doanh-thu-${Date.now()}.${format === "pdf" ? "pdf" : "xlsx"}`;
            a.click();
            URL.revokeObjectURL(url);
            onOpenChange(false);
        } catch {
            // Toast error handled by parent
        } finally {
            setIsExporting(false);
        }
    };

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => onOpenChange(false)}
            />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 mx-4">
                <h3 className="text-lg font-bold text-slate-800 mb-1">Xuất báo cáo</h3>
                <p className="text-sm text-slate-500 mb-5">
                    Chọn định dạng và các cột dữ liệu muốn xuất
                </p>

                {/* Format selection */}
                <div className="flex gap-2 mb-5">
                    <button
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-colors ${format === "excel"
                                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                        onClick={() => setFormat("excel")}
                    >
                        Excel (.xlsx)
                    </button>
                    <button
                        className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium border transition-colors ${format === "pdf"
                                ? "bg-red-50 border-red-200 text-red-700"
                                : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                        onClick={() => setFormat("pdf")}
                    >
                        PDF (.pdf)
                    </button>
                </div>

                {/* Column selection */}
                <div className="mb-5">
                    <p className="text-sm font-medium text-slate-700 mb-2">Chọn cột dữ liệu:</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {EXPORT_COLUMNS.map(col => (
                            <label
                                key={col.key}
                                className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 px-2 py-1.5 rounded-lg"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedCols.has(col.key)}
                                    onChange={() => toggleCol(col.key)}
                                    className="rounded border-slate-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-slate-700">{col.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                    >
                        Hủy
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleExport}
                        disabled={isExporting || selectedCols.size === 0}
                        className="gap-2"
                    >
                        {isExporting ? (
                            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Download className="w-4 h-4" />
                        )}
                        Tải xuống
                    </Button>
                </div>
            </div>
        </div>
    );
}

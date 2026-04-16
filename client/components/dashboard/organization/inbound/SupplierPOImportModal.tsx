"use client";

/**
 * SupplierPOImportModal
 * Cho phép user dán dữ liệu phiếu PO từ nhà cung cấp (NCC) vào textarea,
 * hệ thống tự parse, khớp sản phẩm theo SKU và auto-fill vào form tạo phiếu nhập kho.
 *
 * Định dạng hỗ trợ (mỗi dòng):
 *   SKU [tab|,|;] Tên sản phẩm [tab|,|;] Số lượng
 *   SKU [tab|,|;] Số lượng          (nếu chỉ có 2 cột)
 *
 * Ví dụ:
 *   SP001    Sản phẩm A    100
 *   SP002,Sản phẩm B,50
 */

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    CheckCircleIcon,
    ExclamationCircleIcon,
    ArrowPathIcon,
    DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { authStorage } from "@/services/auth/auth-storage.service";
import { ProductService } from "@/services/product/product.service";
import type { Product } from "@/services/product/product.types";

const productService = new ProductService();

// ─── Types ──────────────────────────────────────────────────────

interface ParsedRow {
    /** Dòng gốc từ input */
    raw: string;
    /** SKU hoặc ID sản phẩm từ NCC */
    sku: string;
    /** Tên sản phẩm (nếu NCC cung cấp) */
    supplierName: string;
    /** Số lượng cần nhập */
    qty: number;
}

export interface MatchedItem {
    product: Product;
    qty: number;
}

interface MatchResult extends ParsedRow {
    status: "matched" | "notfound" | "pending";
    product?: Product;
}

interface SupplierPOImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Callback khi user xác nhận — trả về danh sách sản phẩm khớp kèm số lượng */
    onImport: (items: MatchedItem[]) => void;
    /** Warehouse ID để restrict stock (optional) */
    warehouseId?: string;
}

// ─── Parser ─────────────────────────────────────────────────────

function parseLine(line: string): ParsedRow | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) return null;

    // Thử tab trước (copy từ Excel/Google Sheets), sau đó pipe, dấu phẩy, chấm phẩy
    const parts = trimmed.includes("\t")
        ? trimmed.split("\t")
        : trimmed.split(/[|,;]/);

    const cleaned = parts.map((p) => p.trim()).filter(Boolean);
    if (cleaned.length < 1) return null;

    const sku = cleaned[0];
    if (!sku) return null;

    if (cleaned.length === 1) {
        // Chỉ có SKU, qty mặc định 1
        return { raw: trimmed, sku, supplierName: "", qty: 1 };
    }

    if (cleaned.length === 2) {
        // Có thể là: SKU + qty HOẶC SKU + tên
        const second = cleaned[1];
        const numCandidate = parseFloat(second.replace(/[.,\s]/g, ""));
        if (!isNaN(numCandidate) && numCandidate > 0) {
            return { raw: trimmed, sku, supplierName: "", qty: Math.round(numCandidate) };
        }
        return { raw: trimmed, sku, supplierName: second, qty: 1 };
    }

    // 3+ cột: SKU | Tên | Số lượng (lấy cột cuối là qty)
    const lastCol = cleaned[cleaned.length - 1];
    const numCandidate = parseFloat(lastCol.replace(/[.,\s]/g, ""));
    const qty = !isNaN(numCandidate) && numCandidate > 0 ? Math.round(numCandidate) : 1;
    const supplierName = cleaned.slice(1, cleaned.length - 1).join(" ");
    return { raw: trimmed, sku, supplierName, qty };
}

// ─── Component ──────────────────────────────────────────────────

export function SupplierPOImportModal({
    open,
    onOpenChange,
    onImport,
    warehouseId,
}: SupplierPOImportModalProps) {
    const [rawText, setRawText] = useState("");
    const [results, setResults] = useState<MatchResult[]>([]);
    const [isMatching, setIsMatching] = useState(false);
    const [step, setStep] = useState<"input" | "preview">("input");

    const handleReset = useCallback(() => {
        setRawText("");
        setResults([]);
        setStep("input");
    }, []);

    const handleClose = useCallback(() => {
        onOpenChange(false);
        handleReset();
    }, [onOpenChange, handleReset]);

    /** Bước 1: Parse + Match SKU với sản phẩm trong hệ thống */
    const handleAnalyze = useCallback(async () => {
        const lines = rawText.split("\n");
        const parsed: ParsedRow[] = lines
            .map(parseLine)
            .filter((r): r is ParsedRow => r !== null);

        if (parsed.length === 0) return;

        // Khởi tạo results ở trạng thái pending
        const initialResults: MatchResult[] = parsed.map((p) => ({
            ...p,
            status: "pending",
        }));
        setResults(initialResults);
        setStep("preview");
        setIsMatching(true);

        const token = authStorage.getAccessToken();
        if (!token) {
            setIsMatching(false);
            return;
        }

        // Match từng SKU song song (giới hạn 5 concurrent để không spam API)
        const BATCH_SIZE = 5;
        const matched: MatchResult[] = [...initialResults];

        for (let i = 0; i < parsed.length; i += BATCH_SIZE) {
            const batch = parsed.slice(i, i + BATCH_SIZE);
            const searchResults = await Promise.all(
                batch.map(async (row, batchIdx) => {
                    try {
                        const res = await productService.list(token, {
                            keywords: row.sku,
                            limit: 10,
                            warehouse_id: warehouseId,
                        });
                        const items = res?.data?.items ?? [];
                        // Tìm khớp chính xác SKU (case-insensitive)
                        const exactMatch =
                            items.find(
                                (p) => p.sku?.toLowerCase() === row.sku.toLowerCase(),
                            ) ?? null;
                        return { idx: i + batchIdx, product: exactMatch };
                    } catch {
                        return { idx: i + batchIdx, product: null };
                    }
                }),
            );

            for (const { idx, product } of searchResults) {
                if (product) {
                    matched[idx] = { ...matched[idx], status: "matched", product };
                } else {
                    matched[idx] = { ...matched[idx], status: "notfound" };
                }
            }

            // Cập nhật từng batch để UI phản hồi dần
            setResults([...matched]);
        }

        setIsMatching(false);
    }, [rawText, warehouseId]);

    const handleConfirm = useCallback(() => {
        const items: MatchedItem[] = results
            .filter((r) => r.status === "matched" && r.product)
            .map((r) => ({ product: r.product!, qty: r.qty }));
        onImport(items);
        handleClose();
    }, [results, onImport, handleClose]);

    const matchedCount = results.filter((r) => r.status === "matched").length;
    const notFoundCount = results.filter((r) => r.status === "notfound").length;
    const pendingCount = results.filter((r) => r.status === "pending").length;

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col overflow-hidden rounded-3xl p-0">
                <DialogHeader className="p-6 border-b shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-[18px]">
                        <DocumentTextIcon className="w-5 h-5 text-[#0F766E]" />
                        Nhập từ phiếu NCC
                    </DialogTitle>
                    <DialogDescription>
                        Dán dữ liệu phiếu PO từ nhà cung cấp. Hệ thống sẽ tự khớp sản phẩm theo SKU và điền vào phiếu nhập.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 min-h-0 overflow-y-auto p-6 space-y-5">
                    {step === "input" && (
                        <>
                            {/* Hướng dẫn định dạng */}
                            <div className="bg-muted/50 rounded-2xl p-4 text-sm space-y-1.5">
                                <p className="font-semibold text-foreground text-xs uppercase tracking-wide mb-2">
                                    Định dạng hỗ trợ (mỗi dòng)
                                </p>
                                <p className="text-muted-foreground font-mono text-xs">
                                    SKU&nbsp;&nbsp;&nbsp;<span className="text-[#0F766E]">→</span>&nbsp;&nbsp;&nbsp;Tên sản phẩm&nbsp;&nbsp;&nbsp;<span className="text-[#0F766E]">→</span>&nbsp;&nbsp;&nbsp;Số lượng
                                </p>
                                <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                    <p>• Ngăn cách bằng <strong>Tab</strong> (copy từ Excel/Google Sheets)</p>
                                    <p>• Hoặc dùng dấu phẩy <strong>,</strong> / chấm phẩy <strong>;</strong> / gạch đứng <strong>|</strong></p>
                                    <p>• Cột Tên sản phẩm có thể bỏ qua (hệ thống dùng SKU để tìm)</p>
                                </div>
                                <div className="mt-3 bg-background rounded-xl p-3 font-mono text-xs text-muted-foreground border">
                                    <p className="text-[#0F766E] mb-1">{/* Ví dụ */}</p>
                                    <p>SP-001{"  "}Gạo tẻ thơm{"  "}100</p>
                                    <p>SP-002{"  "}Đường cát trắng{"  "}50</p>
                                    <p>SP-003,Muối i-ốt,200</p>
                                </div>
                            </div>

                            {/* Textarea nhập liệu */}
                            <div className="space-y-2">
                                <Label>Dán dữ liệu phiếu PO từ NCC</Label>
                                <textarea
                                    value={rawText}
                                    onChange={(e) => setRawText(e.target.value)}
                                    placeholder={"SP-001\tGạo tẻ thơm\t100\nSP-002\tĐường cát\t50"}
                                    rows={10}
                                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-mono resize-none focus:outline-none focus:ring-2 focus:ring-[#0F766E]/50 placeholder:text-muted-foreground/50"
                                    spellCheck={false}
                                />
                                <p className="text-xs text-muted-foreground">
                                    {rawText.split("\n").filter((l) => l.trim()).length} dòng được nhập
                                </p>
                            </div>
                        </>
                    )}

                    {step === "preview" && (
                        <>
                            {/* Summary badges */}
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-3 py-1.5 rounded-full">
                                    <CheckCircleIcon className="w-3.5 h-3.5" />
                                    {matchedCount} khớp
                                </span>
                                {notFoundCount > 0 && (
                                    <span className="inline-flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold px-3 py-1.5 rounded-full">
                                        <ExclamationCircleIcon className="w-3.5 h-3.5" />
                                        {notFoundCount} không tìm thấy
                                    </span>
                                )}
                                {isMatching && pendingCount > 0 && (
                                    <span className="inline-flex items-center gap-1.5 bg-muted text-muted-foreground text-xs font-semibold px-3 py-1.5 rounded-full">
                                        <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                        Đang tìm {pendingCount} sản phẩm...
                                    </span>
                                )}
                            </div>

                            {/* Preview table */}
                            <div className="border rounded-2xl overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/40 border-b">
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                SKU (NCC)
                                            </th>
                                            <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                                Sản phẩm khớp
                                            </th>
                                            <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide w-20">
                                                SL
                                            </th>
                                            <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide w-22.5 min-w-22.5">
                                                Trạng thái
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {results.map((row, idx) => (
                                            <tr
                                                key={idx}
                                                className={
                                                    row.status === "notfound"
                                                        ? "bg-red-50/60 dark:bg-red-950/20"
                                                        : row.status === "matched"
                                                            ? "hover:bg-muted/20"
                                                            : "opacity-60"
                                                }
                                            >
                                                {/* SKU từ NCC */}
                                                <td className="px-4 py-3">
                                                    <p className="font-mono font-medium text-xs">{row.sku}</p>
                                                    {row.supplierName && (
                                                        <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-30">
                                                            {row.supplierName}
                                                        </p>
                                                    )}
                                                </td>

                                                {/* Sản phẩm khớp */}
                                                <td className="px-4 py-3">
                                                    {row.status === "matched" && row.product ? (
                                                        <div>
                                                            <p className="font-medium text-sm truncate max-w-50">
                                                                {row.product.name}
                                                            </p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                SKU: {row.product.sku}
                                                            </p>
                                                        </div>
                                                    ) : row.status === "pending" ? (
                                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                                            <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                                            <span className="text-xs">Đang tìm...</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-red-500 font-medium">
                                                            Không tìm thấy sản phẩm
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Số lượng */}
                                                <td className="px-4 py-3 text-right tabular-nums font-semibold">
                                                    {row.qty.toLocaleString("vi-VN")}
                                                </td>

                                                {/* Trạng thái icon */}
                                                <td className="px-4 py-3 text-center">
                                                    {row.status === "matched" && (
                                                        <CheckCircleIcon className="w-5 h-5 text-emerald-500 mx-auto" />
                                                    )}
                                                    {row.status === "notfound" && (
                                                        <ExclamationCircleIcon className="w-5 h-5 text-red-400 mx-auto" />
                                                    )}
                                                    {row.status === "pending" && (
                                                        <ArrowPathIcon className="w-4 h-4 text-muted-foreground animate-spin mx-auto" />
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {notFoundCount > 0 && (
                                <p className="text-xs text-muted-foreground">
                                    Sản phẩm không tìm thấy sẽ bị bỏ qua. Bạn có thể{" "}
                                    <button
                                        className="underline text-[#0F766E] hover:text-[#0F766E]/80 font-medium"
                                        onClick={() => setStep("input")}
                                    >
                                        chỉnh sửa lại dữ liệu
                                    </button>{" "}
                                    để sửa SKU.
                                </p>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="shrink-0 border-t p-4 flex items-center justify-between bg-background">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            disabled={isMatching}
                            className="rounded-xl"
                        >
                            Hủy
                        </Button>
                        {step === "preview" && (
                            <Button
                                variant="outline"
                                onClick={() => setStep("input")}
                                disabled={isMatching}
                                className="rounded-xl"
                            >
                                ← Sửa lại
                            </Button>
                        )}
                    </div>

                    {step === "input" ? (
                        <Button
                            onClick={handleAnalyze}
                            disabled={!rawText.trim() || isMatching}
                            className="rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white min-w-30"
                        >
                            Phân tích
                        </Button>
                    ) : (
                        <Button
                            onClick={handleConfirm}
                            disabled={isMatching || matchedCount === 0}
                            className="rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white min-w-40"
                        >
                            {isMatching ? (
                                <span className="flex items-center gap-2">
                                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                    Đang xử lý...
                                </span>
                            ) : (
                                `Thêm ${matchedCount} sản phẩm vào phiếu`
                            )}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

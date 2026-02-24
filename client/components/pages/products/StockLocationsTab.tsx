"use client";

import React, { useEffect, useState, useCallback } from "react";
import { StockLocationService } from "@/services/inventory/stock-location.service";
import type { StockLocation } from "@/types/product-inventory";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useRouter } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import { MapPin, Lock, Unlock } from "lucide-react";

const stockLocationService = new StockLocationService();

// ════════════════════════════════════════════════
// Tab 4: Stock Locations
// ════════════════════════════════════════════════
interface StockLocationsTabProps {
    productId: string;
}

export function StockLocationsTab({ productId }: StockLocationsTabProps) {
    const router = useRouter();
    const [locations, setLocations] = useState<StockLocation[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLocations = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }
            setLoading(true);
            const result = await stockLocationService.listByProduct(
                token,
                productId,
                { limit: 100, offset: 0 }
            );
            if (result?.data) {
                setLocations(result.data.items || []);
            }
        } catch {
            // Silent — may not have stock location API yet
            setLocations([]);
        } finally {
            setLoading(false);
        }
    }, [productId, router]);

    useEffect(() => {
        fetchLocations();
    }, [fetchLocations]);

    // ── Compute totals ──
    const totals = locations.reduce(
        (acc, loc) => ({
            available: acc.available + (loc.quantity_available || 0),
            allocated: acc.allocated + (loc.quantity_allocated || 0),
        }),
        { available: 0, allocated: 0 }
    );
    const totalQty = totals.available + totals.allocated;

    return (
        <div className="space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="shadow-sm rounded-2xl border-0 bg-linear-to-br from-[#0F766E]/5 to-[#0F766E]/10">
                    <CardContent className="p-4">
                        <p className="text-xs text-[#0F766E]/70">Tổng tồn kho</p>
                        <p className="text-2xl font-bold text-[#0F766E] mt-1">
                            {new Intl.NumberFormat("vi-VN").format(totalQty)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm rounded-2xl border-0 bg-emerald-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                            <p className="text-xs text-emerald-700">Khả dụng</p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-700">
                            {new Intl.NumberFormat("vi-VN").format(totals.available)}
                        </p>
                    </CardContent>
                </Card>
                <Card className="shadow-sm rounded-2xl border-0 bg-amber-50">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-1.5 mb-1">
                            <Lock className="w-3.5 h-3.5 text-amber-600" />
                            <p className="text-xs text-amber-700">Đang giữ</p>
                        </div>
                        <p className="text-2xl font-bold text-amber-700">
                            {new Intl.NumberFormat("vi-VN").format(totals.allocated)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Location table */}
            <Card className="shadow-premium rounded-3xl border-0">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/80">
                                    <TableHead className="min-w-40">
                                        Vị trí (Ô / Tầng / Kệ)
                                    </TableHead>
                                    <TableHead className="min-w-30">
                                        Lô hàng
                                    </TableHead>
                                    <TableHead className="min-w-30">
                                        Khả dụng
                                    </TableHead>
                                    <TableHead className="min-w-30">
                                        Đang giữ
                                    </TableHead>
                                    <TableHead className="min-w-35">
                                        Tỷ lệ sử dụng
                                    </TableHead>
                                </TableRow>
                            </TableHeader>

                            <TableBody>
                                {loading &&
                                    Array.from({ length: 4 }).map((_, i) => (
                                        <TableRow key={`skel-${i}`}>
                                            <TableCell>
                                                <Skeleton className="h-4 w-40" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-24" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-16 ml-auto" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-4 w-16 ml-auto" />
                                            </TableCell>
                                            <TableCell>
                                                <Skeleton className="h-3 w-full rounded-full" />
                                            </TableCell>
                                        </TableRow>
                                    ))}

                                {!loading && locations.length === 0 && (
                                    <TableRow>
                                        <TableCell
                                            colSpan={5}
                                            className="py-12 text-center"
                                        >
                                            <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                                            <p className="font-medium text-slate-600">
                                                Chưa có tồn kho
                                            </p>
                                            <p className="text-sm text-slate-400 mt-1">
                                                Sản phẩm chưa được nhập vào vị trí lưu kho nào.
                                                Tạo phiếu nhập kho để bắt đầu.
                                            </p>
                                        </TableCell>
                                    </TableRow>
                                )}

                                {!loading &&
                                    locations.map((loc) => {
                                        const total =
                                            (loc.quantity_available || 0) +
                                            (loc.quantity_allocated || 0);
                                        const usagePercent =
                                            total > 0
                                                ? (loc.quantity_allocated / total) * 100
                                                : 0;

                                        return (
                                            <TableRow
                                                key={loc.id}
                                                className="hover:bg-slate-50/50"
                                            >
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                                                            <MapPin className="w-4 h-4 text-slate-500" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-medium text-slate-900">
                                                                {loc.block?.name ||
                                                                    loc.block?.code ||
                                                                    "—"}
                                                            </p>
                                                            <p className="text-xs text-slate-500">
                                                                {loc.shelf?.rack?.name
                                                                    ? `${loc.shelf.rack.name} › ${loc.shelf.name}`
                                                                    : loc.shelf?.name ||
                                                                    "—"}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </TableCell>

                                                <TableCell>
                                                    {loc.batch ? (
                                                        <span className="font-mono text-xs text-slate-600">
                                                            {loc.batch.code}
                                                        </span>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">
                                                            —
                                                        </span>
                                                    )}
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <span className="text-sm font-semibold text-emerald-700 tabular-nums">
                                                        {new Intl.NumberFormat(
                                                            "vi-VN"
                                                        ).format(
                                                            loc.quantity_available
                                                        )}
                                                    </span>
                                                </TableCell>

                                                <TableCell className="text-right">
                                                    <span className="text-sm font-medium text-amber-600 tabular-nums">
                                                        {new Intl.NumberFormat(
                                                            "vi-VN"
                                                        ).format(
                                                            loc.quantity_allocated
                                                        )}
                                                    </span>
                                                </TableCell>

                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <Progress
                                                            value={usagePercent}
                                                            className="h-2 flex-1"
                                                        />
                                                        <span className="text-xs text-slate-500 w-10 text-right tabular-nums">
                                                            {usagePercent.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

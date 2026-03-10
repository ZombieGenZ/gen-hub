"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
    Flame,
    Lock,
    PackageOpen,
    Bookmark,
    Info,
    Layers,
    Loader2,
    AlertCircle,
} from "lucide-react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { warehouseService } from "@/services/warehouse/warehouse.service";
import type {
    WarehouseLayout,
    InventoryStockItem,
} from "@/services/warehouse/warehouse.types";

// ── Display types (decoupled from mock) ──

type BlockStatus = "empty" | "occupied" | "reserved" | "locked";

interface FloorBlock {
    id: string;
    col: number;
    row: number;
    status: BlockStatus;
    product_name?: string;
    batch_code?: string;
    quantity?: number;
    fill_pct: number;
    access_freq: number;
}

interface FloorRack {
    id: string;
    code: string;
    name: string;
    blocks: FloorBlock[];
    cols: number;
    rows: number;
}

interface FloorRow {
    id: string;
    code: string;
    name: string;
    is_mine: boolean;
    racks: FloorRack[];
    total_items: number;
}

// ── Transform API → display ──

function transformLayoutToFloorPlan(
    layout: WarehouseLayout,
    stock: InventoryStockItem[],
): FloorRow[] {
    const stockByBlock = new Map<string, InventoryStockItem[]>();
    for (const item of stock) {
        const list = stockByBlock.get(item.block_id) || [];
        list.push(item);
        stockByBlock.set(item.block_id, list);
    }

    return layout.rows.map((row) => {
        let rowTotalItems = 0;

        const racks: FloorRack[] = row.racks.map((rack) => {
            const shelfCount = rack.shelves.length || 1;
            const maxBlocksPerShelf = Math.max(
                ...rack.shelves.map((s) => s.blocks.length),
                1,
            );

            const blocks: FloorBlock[] = [];
            rack.shelves.forEach((shelf, shelfIdx) => {
                shelf.blocks.forEach((block, blockIdx) => {
                    const items = stockByBlock.get(block.id) || [];
                    const totalQty = items.reduce((s, i) => s + i.quantity_on_hand, 0);
                    rowTotalItems += totalQty;

                    const hasStock = items.length > 0;
                    const primary = items[0];

                    // Estimate access frequency from days_in_storage
                    const minDays = hasStock
                        ? Math.min(...items.map((i) => i.days_in_storage))
                        : 999;
                    const accessFreq = hasStock
                        ? Math.max(0, Math.round(60 - minDays * 0.9))
                        : 0;

                    blocks.push({
                        id: block.id,
                        col: blockIdx,
                        row: shelfIdx,
                        status: hasStock ? "occupied" : "empty",
                        product_name: hasStock
                            ? items.length > 1
                                ? `${primary.product_name} (+${items.length - 1})`
                                : primary.product_name
                            : undefined,
                        batch_code: primary?.batch_code ?? undefined,
                        quantity: hasStock ? totalQty : undefined,
                        fill_pct: hasStock
                            ? Math.min(100, Math.round((totalQty / 50) * 100))
                            : 0,
                        access_freq: accessFreq,
                    });
                });
            });

            return {
                id: rack.id,
                code: rack.code,
                name: rack.name || `Kệ ${rack.code}`,
                blocks,
                cols: maxBlocksPerShelf,
                rows: shelfCount,
            };
        });

        return {
            id: row.id,
            code: row.code,
            name: row.name || `Dãy ${row.code}`,
            is_mine: row.is_rented,
            racks,
            total_items: rowTotalItems,
        };
    });
}

// ── Block colors ──

const STATUS_COLORS: Record<BlockStatus, string> = {
    empty: "bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700",
    occupied: "bg-blue-100 dark:bg-blue-900/40 border-blue-300 dark:border-blue-700",
    reserved: "bg-yellow-100 dark:bg-yellow-900/40 border-yellow-300 dark:border-yellow-700",
    locked: "bg-gray-300 dark:bg-gray-700 border-gray-400 dark:border-gray-600",
};

const STATUS_LABELS: Record<BlockStatus, string> = {
    empty: "Trống",
    occupied: "Có hàng",
    reserved: "Đã đặt",
    locked: "Khóa",
};

function heatColor(freq: number): string {
    if (freq >= 50) return "bg-red-500/80";
    if (freq >= 35) return "bg-orange-400/70";
    if (freq >= 20) return "bg-yellow-400/60";
    if (freq >= 10) return "bg-green-300/50";
    return "bg-gray-200/30 dark:bg-gray-700/30";
}

// ── Block Cell ──

function BlockCell({
    block,
    showHeatmap,
    dimmed,
}: {
    block: FloorBlock;
    showHeatmap: boolean;
    dimmed: boolean;
}) {
    const baseClass = showHeatmap
        ? heatColor(block.access_freq)
        : STATUS_COLORS[block.status];

    return (
        <TooltipProvider delayDuration={100}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div
                        className={cn(
                            "relative w-full aspect-square rounded-md border cursor-pointer transition-all duration-150 flex items-center justify-center text-[10px] font-medium",
                            baseClass,
                            dimmed && "opacity-25 pointer-events-none",
                            !dimmed && "hover:ring-2 hover:ring-brand/50 hover:scale-105"
                        )}
                    >
                        {block.status === "occupied" && !showHeatmap && (
                            <div
                                className="absolute bottom-0 left-0 right-0 bg-brand/60 rounded-b-md transition-all"
                                style={{ height: `${block.fill_pct}%` }}
                            />
                        )}
                        {showHeatmap && block.access_freq > 0 && (
                            <span className="z-10 text-white font-bold text-[9px] drop-shadow">
                                {block.access_freq}
                            </span>
                        )}
                        {!showHeatmap && block.status === "empty" && (
                            <PackageOpen className="w-3 h-3 text-muted-foreground/40" />
                        )}
                        {!showHeatmap && block.status === "locked" && (
                            <Lock className="w-3 h-3 text-muted-foreground/50" />
                        )}
                    </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                    <div className="text-xs space-y-1">
                        <p className="font-semibold">{STATUS_LABELS[block.status]}</p>
                        {block.product_name && (
                            <>
                                <p>📦 {block.product_name}</p>
                                <p>Lô: {block.batch_code}</p>
                                <p>SL: {block.quantity}</p>
                                <p>Lấp đầy: {block.fill_pct}%</p>
                            </>
                        )}
                        {showHeatmap && <p>🔥 Tần suất: {block.access_freq} lượt/tháng</p>}
                    </div>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}

// ── Main Component ──

export function FloorPlanTab({ warehouseId }: { warehouseId: string }) {
    const [showHeatmap, setShowHeatmap] = useState(false);
    const [selectedRow, setSelectedRow] = useState<string | null>(null);

    // ─── Fetch layout ───
    const {
        data: layout,
        isLoading: layoutLoading,
        error: layoutError,
    } = useQuery<WarehouseLayout>({
        queryKey: ['floor-plan', 'layout', warehouseId],
        queryFn: async () => {
            const token = authStorage.getAccessToken();
            if (!token) throw new Error('Chưa đăng nhập');
            return warehouseService.getLayout(token, warehouseId);
        },
        enabled: !!warehouseId,
        staleTime: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    // ─── Fetch stock ───
    const {
        data: stock,
        isLoading: stockLoading,
    } = useQuery<InventoryStockItem[]>({
        queryKey: ['floor-plan', 'stock', warehouseId],
        queryFn: async () => {
            const token = authStorage.getAccessToken();
            if (!token) return [];
            return warehouseService.getInventoryStock(token, warehouseId);
        },
        enabled: !!warehouseId,
        staleTime: 2 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    // ─── Transform ───
    const floorRows = useMemo(() => {
        if (!layout) return [];
        return transformLayoutToFloorPlan(layout, stock ?? []);
    }, [layout, stock]);

    // For shared warehouses, detect if any row is not rented by current user
    const isShared = floorRows.some((r) => !r.is_mine);

    const visibleRows = useMemo(() => {
        if (selectedRow) return floorRows.filter((r) => r.id === selectedRow);
        return floorRows;
    }, [selectedRow, floorRows]);

    // ─── Loading state ───
    const isLoading = layoutLoading || stockLoading;
    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">Đang tải sơ đồ kho...</span>
            </div>
        );
    }

    // ─── Error state ───
    if (layoutError) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <AlertCircle className="w-6 h-6 text-red-500" />
                <p className="text-sm">Không thể tải sơ đồ kho.</p>
                <p className="text-xs">{(layoutError as Error).message}</p>
            </div>
        );
    }

    // ─── Empty state ───
    if (floorRows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
                <Layers className="w-8 h-8" />
                <p className="text-sm">Kho chưa có cấu trúc dãy / kệ / ô.</p>
            </div>
        );
    }

    // ─── Heatmap insight: find top accessed products ───
    const hotBlocks = floorRows
        .flatMap((r) => r.racks.flatMap((rack) => rack.blocks))
        .filter((b) => b.status === "occupied" && b.access_freq >= 35)
        .sort((a, b) => b.access_freq - a.access_freq)
        .slice(0, 2);

    const heatmapInsight = hotBlocks.length > 0
        ? `Các ô màu đỏ/cam có tần suất xuất nhập cao nhất. Cân nhắc di chuyển hàng bán chạy ra gần cửa kho để giảm thời gian pick hàng. Hiện tại ${hotBlocks.map((b) => b.product_name).join(" và ")} có lượng truy xuất cao nhất.`
        : "Bật bản đồ nhiệt để xem phân bố tần suất truy xuất các ô hàng. Ô càng đỏ = tần suất xuất nhập càng cao.";

    return (
        <div className="space-y-5">
            {/* Controls & legend */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex items-center gap-6">
                    {/* Heatmap toggle */}
                    <div className="flex items-center gap-2">
                        <Switch
                            id="heatmap"
                            checked={showHeatmap}
                            onCheckedChange={setShowHeatmap}
                        />
                        <Label htmlFor="heatmap" className="text-xs flex items-center gap-1 cursor-pointer">
                            <Flame className="w-3.5 h-3.5 text-orange-500" />
                            Bản đồ nhiệt
                        </Label>
                    </div>

                    {/* Row filter */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <Button
                            variant={selectedRow === null ? "default" : "outline"}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => setSelectedRow(null)}
                        >
                            Tất cả
                        </Button>
                        {floorRows.map((row) => (
                            <Button
                                key={row.id}
                                variant={selectedRow === row.id ? "default" : "outline"}
                                size="sm"
                                className={cn(
                                    "h-7 text-xs",
                                    !row.is_mine && "opacity-60"
                                )}
                                onClick={() => setSelectedRow(row.id === selectedRow ? null : row.id)}
                            >
                                {row.name}
                                {row.is_mine && <Bookmark className="w-3 h-3 ml-1 text-brand" />}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                {showHeatmap ? (
                    <>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500/80" /> Rất cao (&ge;50)</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-orange-400/70" /> Cao (35-49)</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-400/60" /> Trung bình (20-34)</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-green-300/50" /> Thấp (10-19)</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-200 dark:bg-gray-700" /> Rất thấp (&lt;10)</span>
                    </>
                ) : (
                    <>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" /> Có hàng</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-100 border border-gray-200" /> Trống</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300" /> Đã đặt</span>
                        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-gray-300 border border-gray-400" /> Khóa</span>
                    </>
                )}
                {isShared && (
                    <span className="flex items-center gap-1.5 ml-4 text-purple-600 dark:text-purple-400">
                        <Bookmark className="w-3 h-3" /> = Khu vực của bạn
                    </span>
                )}
            </div>

            {/* AI heatmap insight */}
            {showHeatmap && (
                <Card className="border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/30">
                    <CardContent className="p-3 flex items-start gap-2 text-xs">
                        <Info className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-medium text-orange-800 dark:text-orange-300">AI Insight</p>
                            <p className="text-orange-700 dark:text-orange-400 mt-0.5">
                                {heatmapInsight}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Floor plan grid */}
            <div className="space-y-6">
                {visibleRows.map((row) => {
                    const isDimmed = isShared && !row.is_mine;
                    const occupiedBlocks = row.racks.flatMap((r) => r.blocks).filter((b) => b.status === "occupied").length;
                    const totalBlocks = row.racks.flatMap((r) => r.blocks).length;
                    const rowOccupancy = totalBlocks > 0 ? Math.round((occupiedBlocks / totalBlocks) * 100) : 0;

                    return (
                        <Card
                            key={row.id}
                            className={cn(
                                "transition-opacity",
                                isDimmed && "opacity-40"
                            )}
                        >
                            <CardHeader className="pb-2 px-4 pt-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Layers className="w-4 h-4 text-muted-foreground" />
                                        <CardTitle className="text-sm font-semibold">{row.name}</CardTitle>
                                        {row.is_mine && (
                                            <Badge variant="outline" className="text-[10px] bg-brand/10 text-brand border-brand/30">
                                                Của bạn
                                            </Badge>
                                        )}
                                        {isDimmed && (
                                            <Badge variant="outline" className="text-[10px]">
                                                Người thuê khác
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        {occupiedBlocks}/{totalBlocks} ô • {rowOccupancy}% lấp đầy •{" "}
                                        {row.total_items} SP
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="px-4 pb-4 space-y-4">
                                {row.racks.map((rack) => (
                                    <div key={rack.id}>
                                        <p className="text-xs text-muted-foreground mb-2 font-medium">{rack.name}</p>
                                        <div
                                            className="grid gap-1.5"
                                            style={{
                                                gridTemplateColumns: `repeat(${rack.cols}, minmax(0, 1fr))`,
                                            }}
                                        >
                                            {rack.blocks.map((block) => (
                                                <BlockCell
                                                    key={block.id}
                                                    block={block}
                                                    showHeatmap={showHeatmap}
                                                    dimmed={isDimmed}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

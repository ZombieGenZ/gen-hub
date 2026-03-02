"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import {
    AlertTriangle,
    Clock,
    Package,
    MapPin,
    TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MockRentedWarehouse, MockInventoryItem } from "@/data/mockMyWarehouses";

// ── Helpers ──

function daysUntilExpiry(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const now = new Date();
    const target = new Date(dateStr);
    return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(str: string | null): string {
    if (!str) return "—";
    try {
        const d = new Date(str);
        return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
        return str;
    }
}

type FilterType = "ALL" | "EXPIRING_SOON" | "DEAD_STOCK";
type GroupBy = "NONE" | "ROW" | "RACK";

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
    { value: "ALL", label: "Tất cả hàng hóa" },
    { value: "EXPIRING_SOON", label: "Sắp hết hạn (< 60 ngày)" },
    { value: "DEAD_STOCK", label: "Hàng tồn lâu (> 60 ngày)" },
];

const GROUP_OPTIONS: { value: GroupBy; label: string }[] = [
    { value: "NONE", label: "Không nhóm" },
    { value: "ROW", label: "Nhóm theo Dãy" },
    { value: "RACK", label: "Nhóm theo Kệ" },
];

// ── Inventory Row ──

function InventoryRow({ item }: { item: MockInventoryItem }) {
    const expiryDays = daysUntilExpiry(item.expiry_date);
    const isExpiringSoon = expiryDays !== null && expiryDays <= 60 && expiryDays > 0;
    const isExpired = expiryDays !== null && expiryDays <= 0;
    const isDeadStock = item.days_in_storage > 60 && item.avg_daily_out < 1;

    return (
        <TableRow className={cn(
            isExpired && "bg-red-50/50 dark:bg-red-950/20",
            isExpiringSoon && !isExpired && "bg-yellow-50/50 dark:bg-yellow-950/20",
        )}>
            <TableCell>
                <div className="flex items-center gap-2">
                    {item.image_url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image_url} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                    )}
                    <div>
                        <p className="font-medium text-xs">{item.product_name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.sku}</p>
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-xs">
                <Badge variant="outline" className="text-[10px] font-mono">{item.batch_code}</Badge>
            </TableCell>
            <TableCell className="text-xs font-medium text-right">{item.quantity_on_hand}</TableCell>
            <TableCell className="text-xs text-muted-foreground">{item.unit}</TableCell>
            <TableCell className="text-xs">
                <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{item.location}</span>
                </div>
            </TableCell>
            <TableCell className="text-xs">
                {item.expiry_date ? (
                    <span className={cn(
                        "font-medium",
                        isExpired && "text-red-600",
                        isExpiringSoon && !isExpired && "text-yellow-600",
                    )}>
                        {formatDate(item.expiry_date)}
                        {isExpired && <span className="ml-1">(Hết hạn)</span>}
                        {isExpiringSoon && !isExpired && <span className="ml-1">({expiryDays}d)</span>}
                    </span>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )}
            </TableCell>
            <TableCell className="text-xs text-right">
                <span className={cn(item.days_in_storage > 60 && "text-orange-600 font-medium")}>
                    {item.days_in_storage}
                </span>
            </TableCell>
            <TableCell className="text-xs text-right">
                {item.avg_daily_out.toFixed(1)}
            </TableCell>
            <TableCell className="text-xs text-right text-muted-foreground">
                {(item.weight_kg / 1000).toFixed(2)}T
            </TableCell>
            <TableCell>
                <div className="flex gap-1">
                    {isExpiringSoon && (
                        <Badge variant="outline" className="text-[9px] border-yellow-300 text-yellow-700 bg-yellow-50">
                            <AlertTriangle className="w-2.5 h-2.5 mr-0.5" />
                            Hết hạn
                        </Badge>
                    )}
                    {isDeadStock && (
                        <Badge variant="outline" className="text-[9px] border-orange-300 text-orange-700 bg-orange-50">
                            <TrendingDown className="w-2.5 h-2.5 mr-0.5" />
                            Dead stock
                        </Badge>
                    )}
                </div>
            </TableCell>
        </TableRow>
    );
}

// ── Main ──

export function InventoryTab({ warehouse }: { warehouse: MockRentedWarehouse }) {
    const [filter, setFilter] = useState<FilterType>("ALL");
    const [groupBy, setGroupBy] = useState<GroupBy>("NONE");
    const [search, setSearch] = useState("");

    const inventory = warehouse.inventory;

    const filtered = useMemo(() => {
        let items = [...inventory];
        const q = search.trim().toLowerCase();
        if (q) {
            items = items.filter(
                (i) =>
                    i.product_name.toLowerCase().includes(q) ||
                    i.sku.toLowerCase().includes(q) ||
                    i.batch_code.toLowerCase().includes(q)
            );
        }
        if (filter === "EXPIRING_SOON") {
            items = items.filter((i) => {
                const d = daysUntilExpiry(i.expiry_date);
                return d !== null && d <= 60 && d > 0;
            });
        }
        if (filter === "DEAD_STOCK") {
            items = items.filter((i) => i.days_in_storage > 60 && i.avg_daily_out < 1);
        }
        return items;
    }, [inventory, search, filter]);

    const grouped = useMemo(() => {
        if (groupBy === "NONE") return { "": filtered };
        const key = groupBy === "ROW" ? "row_code" : "rack_code";
        const map: Record<string, MockInventoryItem[]> = {};
        filtered.forEach((item) => {
            const k = item[key];
            if (!map[k]) map[k] = [];
            map[k].push(item);
        });
        return map;
    }, [filtered, groupBy]);

    // Summary
    const totalItems = inventory.length;
    const totalQty = inventory.reduce((s, i) => s + i.quantity_on_hand, 0);
    const expiringSoon = inventory.filter((i) => {
        const d = daysUntilExpiry(i.expiry_date);
        return d !== null && d <= 60 && d > 0;
    }).length;
    const deadStock = inventory.filter((i) => i.days_in_storage > 60 && i.avg_daily_out < 1).length;
    const totalWeight = inventory.reduce((s, i) => s + i.weight_kg, 0);

    return (
        <div className="space-y-5">
            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <Card className="border">
                    <CardContent className="p-3 text-center">
                        <Package className="w-4 h-4 mx-auto mb-1 text-brand" />
                        <p className="text-lg font-bold">{totalItems}</p>
                        <p className="text-[10px] text-muted-foreground">Dòng hàng</p>
                    </CardContent>
                </Card>
                <Card className="border">
                    <CardContent className="p-3 text-center">
                        <p className="text-lg font-bold">{totalQty.toLocaleString("vi-VN")}</p>
                        <p className="text-[10px] text-muted-foreground">Tổng SL tồn kho</p>
                    </CardContent>
                </Card>
                <Card className="border">
                    <CardContent className="p-3 text-center">
                        <p className="text-lg font-bold">{(totalWeight / 1000).toFixed(1)}T</p>
                        <p className="text-[10px] text-muted-foreground">Tổng trọng lượng</p>
                    </CardContent>
                </Card>
                <Card className={cn("border", expiringSoon > 0 && "border-yellow-300 bg-yellow-50/50 dark:bg-yellow-950/20")}>
                    <CardContent className="p-3 text-center">
                        <AlertTriangle className={cn("w-4 h-4 mx-auto mb-1", expiringSoon > 0 ? "text-yellow-600" : "text-muted-foreground")} />
                        <p className={cn("text-lg font-bold", expiringSoon > 0 && "text-yellow-600")}>{expiringSoon}</p>
                        <p className="text-[10px] text-muted-foreground">Sắp hết hạn</p>
                    </CardContent>
                </Card>
                <Card className={cn("border", deadStock > 0 && "border-orange-300 bg-orange-50/50 dark:bg-orange-950/20")}>
                    <CardContent className="p-3 text-center">
                        <Clock className={cn("w-4 h-4 mx-auto mb-1", deadStock > 0 ? "text-orange-600" : "text-muted-foreground")} />
                        <p className={cn("text-lg font-bold", deadStock > 0 && "text-orange-600")}>{deadStock}</p>
                        <p className="text-[10px] text-muted-foreground">Dead stock</p>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="relative flex-1 max-w-xs">
                    <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm sản phẩm, SKU, mã lô..."
                        className="pl-8 text-sm h-9"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
                    <SelectTrigger className="w-50 h-9 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {FILTER_OPTIONS.map((f) => (
                            <SelectItem key={f.value} value={f.value} className="text-xs">{f.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as GroupBy)}>
                    <SelectTrigger className="w-42.5 h-9 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {GROUP_OPTIONS.map((g) => (
                            <SelectItem key={g.value} value={g.value} className="text-xs">{g.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            {Object.entries(grouped).map(([groupName, items]) => (
                <div key={groupName || "all"}>
                    {groupName && (
                        <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            {groupBy === "ROW" ? `Dãy ${groupName}` : `Kệ ${groupName}`}
                            <Badge variant="secondary" className="text-[10px]">{items.length} mặt hàng</Badge>
                        </h4>
                    )}
                    <Card className="border overflow-hidden mb-4">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead className="text-xs">Sản phẩm</TableHead>
                                        <TableHead className="text-xs">Lô hàng</TableHead>
                                        <TableHead className="text-xs text-right">SL tồn</TableHead>
                                        <TableHead className="text-xs">ĐVT</TableHead>
                                        <TableHead className="text-xs">Vị trí</TableHead>
                                        <TableHead className="text-xs">HSD</TableHead>
                                        <TableHead className="text-xs text-right">Ngày lưu</TableHead>
                                        <TableHead className="text-xs text-right">TB xuất/ngày</TableHead>
                                        <TableHead className="text-xs text-right">Trọng lượng</TableHead>
                                        <TableHead className="text-xs">Cảnh báo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center text-muted-foreground py-8 text-sm">
                                                Không tìm thấy hàng hóa nào phù hợp.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        items.map((item) => <InventoryRow key={item.id} item={item} />)
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            ))}
        </div>
    );
}

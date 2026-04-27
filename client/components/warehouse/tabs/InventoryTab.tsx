"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
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
    Loader2,
    RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useToast } from "@/contexts/ToastContext";
import { Download } from "lucide-react";
import { InventoryService } from "@/services/inventory/inventory.service";
import { TablePagination } from "@/components/ui/table-pagination";

const inventoryService = new InventoryService();
const ITEMS_PER_PAGE = 10;

// ── Stock item type (from API) ──
interface StockItem {
    id: string;
    product_id: string;
    product_name: string;
    sku: string;
    image_url?: string | null;
    batch_code: string | null;
    expiry_date: string | null;
    quantity: number;
    quantity_on_hand: number;
    quantity_allocated: number;
    quantity_available: number;
    warehouse_id: string;
    warehouse_name: string;
    block_id: string;
    location: string;
    row_code: string;
    rack_code: string;
    days_in_storage: number;
    created_at: string;
}

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

function InventoryRow({ item }: { item: StockItem }) {
    const expiryDays = daysUntilExpiry(item.expiry_date);
    const isExpiringSoon = expiryDays !== null && expiryDays <= 60 && expiryDays > 0;
    const isExpired = expiryDays !== null && expiryDays <= 0;
    const isDeadStock = item.days_in_storage > 60;

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
                {item.batch_code ? (
                    <Badge variant="outline" className="text-[10px] font-mono">{item.batch_code}</Badge>
                ) : (
                    <span className="text-muted-foreground">—</span>
                )}
            </TableCell>
            <TableCell className="text-xs font-medium text-right">{item.quantity_on_hand}</TableCell>
            <TableCell className="text-xs">
                <div className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground">{item.location || '—'}</span>
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

export function InventoryTab({ warehouseId }: { warehouseId: string }) {
    const [filter, setFilter] = useState<FilterType>("ALL");
    const [groupBy, setGroupBy] = useState<GroupBy>("NONE");
    const [search, setSearch] = useState("");
    const [inventory, setInventory] = useState<StockItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isExporting, setIsExporting] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const { showToast } = useToast();

    const fetchStock = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        setIsLoading(true);
        setError(null);
        try {
            // Nếu warehouseId rỗng, gọi không filter theo warehouse
            const res: any = await inventoryService.listStock(token, { warehouse_id: warehouseId || undefined });
            console.log('[InventoryTab] warehouseId:', warehouseId, 'raw API response:', res);
            // Hỗ trợ nhiều response format: { data: [...] }, { data: { items: [...] } }, hoặc trực tiếp [...]
            let items: StockItem[] = [];
            if (Array.isArray(res?.data)) {
                items = res.data;
            } else if (Array.isArray(res?.data?.items)) {
                items = res.data.items;
            } else if (Array.isArray(res)) {
                items = res;
            }
            console.log('[InventoryTab] parsed items:', items.length, items);
            setInventory(items);
        } catch (err: any) {
            console.error('[InventoryTab] Error:', err);
            setError(err.message || 'Không thể tải tồn kho');
        } finally {
            setIsLoading(false);
        }
    }, [warehouseId]);

    useEffect(() => {
        fetchStock();
    }, [fetchStock]);

    const handleExportExcel = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            setIsExporting(true);
            const blob = await inventoryService.exportStock(token, warehouseId || undefined, search || undefined);

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `stock-report-${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast("Xuất báo cáo tồn kho thành công", "success");
        } catch (err) {
            showToast("Không thể xuất Excel báo cáo tồn kho", "error");
        } finally {
            setIsExporting(false);
        }
    };

    const filtered = useMemo(() => {
        let items = [...inventory];
        const q = search.trim().toLowerCase();
        if (q) {
            items = items.filter(
                (i) =>
                    i.product_name.toLowerCase().includes(q) ||
                    i.sku.toLowerCase().includes(q) ||
                    (i.batch_code && i.batch_code.toLowerCase().includes(q))
            );
        }
        if (filter === "EXPIRING_SOON") {
            items = items.filter((i) => {
                const d = daysUntilExpiry(i.expiry_date);
                return d !== null && d <= 60 && d > 0;
            });
        }
        if (filter === "DEAD_STOCK") {
            items = items.filter((i) => i.days_in_storage > 60);
        }
        return items;
    }, [inventory, search, filter]);

    const totalFilteredItems = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalFilteredItems / ITEMS_PER_PAGE));

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * ITEMS_PER_PAGE;
        return filtered.slice(start, start + ITEMS_PER_PAGE);
    }, [filtered, currentPage]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search, filter, groupBy]);

    useEffect(() => {
        setCurrentPage((prev) => Math.min(prev, totalPages));
    }, [totalPages]);

    const grouped = useMemo(() => {
        if (groupBy === "NONE") return { "": paginatedItems };
        const key = groupBy === "ROW" ? "row_code" : "rack_code";
        const map: Record<string, StockItem[]> = {};
        paginatedItems.forEach((item) => {
            const k = item[key] || "Không xác định";
            if (!map[k]) map[k] = [];
            map[k].push(item);
        });
        return map;
    }, [paginatedItems, groupBy]);

    // Summary
    const totalItems = inventory.length;
    const totalQty = inventory.reduce((s, i) => s + i.quantity_on_hand, 0);
    const expiringSoon = inventory.filter((i) => {
        const d = daysUntilExpiry(i.expiry_date);
        return d !== null && d <= 60 && d > 0;
    }).length;
    const deadStock = inventory.filter((i) => i.days_in_storage > 60).length;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Đang tải tồn kho...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <p className="text-sm text-muted-foreground">{error}</p>
                <Button variant="outline" size="sm" onClick={fetchStock}>
                    <RefreshCw className="w-4 h-4 mr-1" /> Thử lại
                </Button>
            </div>
        );
    }

    if (inventory.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Package className="w-10 h-10 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Chưa có hàng tồn kho trong kho này.</p>
                <Button variant="outline" size="sm" onClick={fetchStock}>
                    <RefreshCw className="w-4 h-4 mr-1" /> Tải lại
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Refresh & Export buttons */}
            <div className="flex justify-end gap-2">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleExportExcel} 
                    className="text-xs gap-1.5 h-8"
                    disabled={isExporting}
                >
                    <Download className={cn("w-3.5 h-3.5", isExporting && "animate-bounce")} />
                    {isExporting ? "Đang xuất..." : "Xuất Excel"}
                </Button>
                <Button variant="ghost" size="sm" onClick={fetchStock} className="text-xs h-8">
                    <RefreshCw className="w-3.5 h-3.5 mr-1" /> Làm mới
                </Button>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
                        <p className="text-[10px] text-muted-foreground">Tồn lâu (&gt;60 ngày)</p>
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
                                        <TableHead className="text-xs">Vị trí</TableHead>
                                        <TableHead className="text-xs">HSD</TableHead>
                                        <TableHead className="text-xs text-right">Ngày lưu</TableHead>
                                        <TableHead className="text-xs">Cảnh báo</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {items.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8 text-sm">
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

            <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalFilteredItems}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}

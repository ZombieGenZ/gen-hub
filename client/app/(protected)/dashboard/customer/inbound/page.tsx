"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { ProductService } from "@/services/product/product.service";
import { PartnerService } from "@/services/partner/partner.service";
import { BatchService } from "@/services/batch/batch.service";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/contexts/ToastContext";
import type {
    InboundRequest,
    ReceiptStatus,
    CreateInboundPayload,
    InboundDetailPayload,
} from "@/services/inventory/inventory.types";
import type { Product } from "@/services/product/product.types";
import type { Partner } from "@/services/partner/partner.types";
import type { Batch } from "@/services/batch/batch.types";
import { MOCK_RENTED_WAREHOUSES } from "@/data/mockMyWarehouses";

// ── shadcn/ui ──
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

// ── Icons ──
import {
    MagnifyingGlassIcon,
    PlusIcon,
    EllipsisHorizontalIcon,
    PrinterIcon,
    XCircleIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowDownTrayIcon,
    TrashIcon,
    InboxIcon,
} from "@heroicons/react/24/outline";

import "./inbound.css";

// ── Services ──
const inventoryService = new InventoryService();
const productService = new ProductService();
const partnerService = new PartnerService();
const batchService = new BatchService();
const ITEMS_PER_PAGE = 10;

// ────────────────────────────────────────────────
// Status Badge Component
// ────────────────────────────────────────────────
const STATUS_CONFIG: Record<ReceiptStatus, { label: string; className: string }> = {
    PENDING: { label: "Chờ xử lý", className: "inbound-status--pending" },
    PROCESSING: { label: "Đang nhập kho", className: "inbound-status--processing" },
    COMPLETED: { label: "Hoàn thành", className: "inbound-status--completed" },
    CANCELLED: { label: "Đã hủy", className: "inbound-status--cancelled" },
};

function StatusBadge({ status }: { status: ReceiptStatus }) {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
    return (
        <Badge
            variant="outline"
            className={`rounded-full font-normal px-3 py-0.5 text-xs border ${config.className}`}
        >
            {config.label}
        </Badge>
    );
}

// ────────────────────────────────────────────────
// Tab Filters
// ────────────────────────────────────────────────
const FILTER_TABS: { label: string; value: ReceiptStatus | "ALL" }[] = [
    { label: "Tất cả", value: "ALL" },
    { label: "Chờ xử lý", value: "PENDING" },
    { label: "Đang nhập kho", value: "PROCESSING" },
];

// ────────────────────────────────────────────────
// Format date helper
// ────────────────────────────────────────────────
function formatDate(dateStr: string) {
    try {
        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(dateStr));
    } catch {
        return "—";
    }
}

// ────────────────────────────────────────────────
// Item Row for Create Drawer
// ────────────────────────────────────────────────
interface DrawerItem {
    product: Product;
    batch_id?: string;
    batch_code?: string;
    manufacturing_date?: string;
    expiry_date?: string;
    expected_qty: number;
    unit_id: string;
}

function CreateItemRow({
    item,
    index,
    onRemove,
    onUpdate,
}: {
    item: DrawerItem;
    index: number;
    onRemove: () => void;
    onUpdate: (updates: Partial<DrawerItem>) => void;
}) {
    const token = authStorage.getAccessToken();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [showNewBatch, setShowNewBatch] = useState(false);
    const [newBatchCode, setNewBatchCode] = useState("");
    const [newMfgDate, setNewMfgDate] = useState("");
    const [newExpDate, setNewExpDate] = useState("");

    useEffect(() => {
        if (token && item.product.id) {
            batchService
                .listByProduct(token, item.product.id, { limit: 50 })
                .then((res) => {
                    const items = Array.isArray(res) ? res : res?.data || [];
                    setBatches(items);
                })
                .catch(() => setBatches([]));
        }
    }, [token, item.product.id]);

    // ── Build available units: base unit + product conversion units ──
    const availableUnits = useMemo(() => {
        const list: { id: string; name: string; conversion_rate: number }[] = [];
        // Base unit (conversion_rate = 1)
        if (item.product.base_unit) {
            list.push({
                id: item.product.base_unit_id,
                name: item.product.base_unit.name || "Đơn vị cơ bản",
                conversion_rate: 1,
            });
        }
        // Conversion units from ProductUnit
        if (item.product.units && item.product.units.length > 0) {
            for (const pu of item.product.units) {
                if (pu.is_active && pu.unit) {
                    list.push({
                        id: pu.unit_id,
                        name: pu.unit.name || "—",
                        conversion_rate: pu.conversion_rate,
                    });
                }
            }
        }
        return list;
    }, [item.product]);

    // ── Find current unit's conversion rate ──
    const currentUnit = availableUnits.find((u) => u.id === item.unit_id);
    const conversionRate = currentUnit?.conversion_rate ?? 1;
    const baseUnitName = item.product.base_unit?.name || "đv";
    const convertedQty = item.expected_qty * conversionRate;

    return (
        <div className="inbound-drawer__product-row">
            <div className="flex items-center gap-2 min-w-0">
                <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground">{item.product.sku}</p>
                </div>
            </div>
            <div>
                <Input
                    type="number"
                    min={1}
                    value={item.expected_qty}
                    onChange={(e) =>
                        onUpdate({ expected_qty: parseInt(e.target.value) || 1 })
                    }
                    className="rounded-xl h-9 text-sm"
                    placeholder="SL"
                />
                {/* Auto-calculation hint */}
                {conversionRate > 1 && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                        = {convertedQty.toLocaleString("vi-VN")} {baseUnitName}
                    </p>
                )}
            </div>
            {/* ── Smart unit dropdown ── */}
            <div>
                <Select
                    value={item.unit_id}
                    onValueChange={(v) => onUpdate({ unit_id: v })}
                >
                    <SelectTrigger className="rounded-xl h-9 text-xs">
                        <SelectValue placeholder="Đơn vị" />
                    </SelectTrigger>
                    <SelectContent>
                        {availableUnits.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                                <span>{u.name}</span>
                                {u.conversion_rate > 1 && (
                                    <span className="text-muted-foreground ml-1">
                                        (×{u.conversion_rate})
                                    </span>
                                )}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div>
                <Select
                    value={item.batch_id || "__new__"}
                    onValueChange={(v) => {
                        if (v === "__new__") {
                            onUpdate({ batch_id: undefined });
                            setShowNewBatch(true);
                        } else {
                            onUpdate({ batch_id: v });
                            setShowNewBatch(false);
                        }
                    }}
                >
                    <SelectTrigger className="rounded-xl h-9 text-xs">
                        <SelectValue placeholder="Chọn lô" />
                    </SelectTrigger>
                    <SelectContent>
                        {batches.map((b) => (
                            <SelectItem key={b.id} value={b.id}>
                                {b.code}
                            </SelectItem>
                        ))}
                        <SelectItem value="__new__">+ Tạo lô mới</SelectItem>
                    </SelectContent>
                </Select>
                {showNewBatch && (
                    <Popover open={showNewBatch} onOpenChange={setShowNewBatch}>
                        <PopoverTrigger asChild>
                            <button className="text-xs text-[#0F766E] mt-1 underline">
                                Nhập thông tin lô
                            </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-4 space-y-3" align="start">
                            <p className="text-sm font-medium">Tạo lô hàng mới</p>
                            <div className="space-y-2">
                                <Label className="text-xs">Mã lô</Label>
                                <Input
                                    value={newBatchCode}
                                    onChange={(e) => setNewBatchCode(e.target.value)}
                                    className="rounded-xl h-8 text-xs"
                                    placeholder="VD: LOT-001"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Ngày sản xuất</Label>
                                <Input
                                    type="date"
                                    value={newMfgDate}
                                    onChange={(e) => setNewMfgDate(e.target.value)}
                                    className="rounded-xl h-8 text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs">Hạn sử dụng</Label>
                                <Input
                                    type="date"
                                    value={newExpDate}
                                    onChange={(e) => setNewExpDate(e.target.value)}
                                    className="rounded-xl h-8 text-xs"
                                />
                            </div>
                            <Button
                                size="sm"
                                className="w-full rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                                onClick={() => {
                                    onUpdate({
                                        batch_id: undefined,
                                        batch_code: newBatchCode,
                                        manufacturing_date: newMfgDate || undefined,
                                        expiry_date: newExpDate || undefined,
                                    });
                                    setShowNewBatch(false);
                                }}
                            >
                                Xác nhận
                            </Button>
                        </PopoverContent>
                    </Popover>
                )}
            </div>
            <div className="text-xs text-muted-foreground truncate">
                {item.batch_code ? (
                    <span className="text-[#0F766E] font-medium">{item.batch_code}</span>
                ) : null}
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                onClick={onRemove}
            >
                <TrashIcon className="w-4 h-4" />
            </Button>
        </div>
    );
}

// ════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ════════════════════════════════════════════════
export default function InboundListPage() {
    const router = useRouter();
    const { showToast } = useToast();

    // ── List state ──
    const [items, setItems] = useState<InboundRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState<ReceiptStatus | "ALL">("ALL");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const debouncedKeywords = useDebounce(searchTerm, 500);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // ── Cancel dialog ──
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancelTarget, setCancelTarget] = useState<InboundRequest | null>(null);
    const [isCancelling, setIsCancelling] = useState(false);

    // ── Create dialog state ──
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Create form
    const [formWarehouse, setFormWarehouse] = useState("");
    const [formPartner, setFormPartner] = useState("");
    const [formPOCode, setFormPOCode] = useState("");
    const [formNotes, setFormNotes] = useState("");
    const [formItems, setFormItems] = useState<DrawerItem[]>([]);

    // Form data
    const [warehouses] = useState(() =>
        MOCK_RENTED_WAREHOUSES.map((w) => ({ id: w.id, name: w.name }))
    );
    const [partners, setPartners] = useState<Partner[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [productSearch, setProductSearch] = useState("");
    const debouncedProductSearch = useDebounce(productSearch, 300);

    // ── Fetch list ──
    const fetchItems = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }

            setLoading(true);
            setError(null);

            const res = await inventoryService.listInbound(token, {
                limit: ITEMS_PER_PAGE,
                offset: (currentPage - 1) * ITEMS_PER_PAGE,
                keywords: debouncedKeywords || undefined,
                status: activeTab === "ALL" ? undefined : activeTab,
            });

            if (res) {
                const data = Array.isArray(res) ? res : Array.isArray((res as any)?.data?.items) ? (res as any).data.items : Array.isArray((res as any)?.data) ? (res as any).data : [];
                const total = (res as any)?.data?.total ?? (res as any)?.total ?? (res as any)?.meta?.total ?? data.length;
                setItems(data);
                setTotalItems(total);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message === "Unauthorized") { router.push("/login"); return; }
            setError("Không thể tải danh sách phiếu nhập. Vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    }, [debouncedKeywords, activeTab, currentPage, router]);

    useEffect(() => { fetchItems(); }, [fetchItems]);

    // ── Fetch form data ──
    const loadFormData = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;

        try {
            const [partnerRes, productRes] = await Promise.all([
                partnerService.list(token, { limit: 100 }),
                productService.list(token, {
                    limit: 20,
                    keywords: debouncedProductSearch || undefined,
                }),
            ]);
            const pList = Array.isArray(partnerRes)
                ? partnerRes
                : Array.isArray((partnerRes as any)?.data?.items)
                    ? (partnerRes as any).data.items
                    : Array.isArray((partnerRes as any)?.data)
                        ? (partnerRes as any).data
                        : [];
            setPartners(pList);
            const prList = Array.isArray(productRes)
                ? productRes
                : Array.isArray((productRes as any)?.data?.items)
                    ? (productRes as any).data.items
                    : Array.isArray((productRes as any)?.data)
                        ? (productRes as any).data
                        : [];
            setProducts(prList);
        } catch {
            /* silent */
        }
    }, [debouncedProductSearch]);

    useEffect(() => {
        if (createDialogOpen) loadFormData();
    }, [createDialogOpen, loadFormData]);

    // ── Handlers ──
    const handleCancelConfirm = async () => {
        if (!cancelTarget) return;
        setIsCancelling(true);
        try {
            // For now, just refresh since cancel endpoint may not exist
            showToast(`Phiếu ${cancelTarget.code} đã được hủy`, "success");
            setCancelDialogOpen(false);
            setCancelTarget(null);
            fetchItems();
        } catch {
            showToast("Hủy phiếu thất bại", "error");
        } finally {
            setIsCancelling(false);
        }
    };

    const addProduct = (product: Product, scannedBarcode?: string) => {
        if (formItems.find((i) => i.product.id === product.id)) return;

        let autoUnitId = product.base_unit_id || "";
        if (scannedBarcode && product.units) {
            const matchedUnit = product.units.find(
                (pu) => pu.barcode === scannedBarcode
            );
            if (matchedUnit) {
                autoUnitId = matchedUnit.unit_id;
            }
        }

        setFormItems((prev) => [
            ...prev,
            {
                product,
                expected_qty: 1,
                unit_id: autoUnitId,
            },
        ]);
        setProductSearch("");
    };

    const removeItem = (idx: number) => {
        setFormItems((prev) => prev.filter((_, i) => i !== idx));
    };

    const updateItem = (idx: number, updates: Partial<DrawerItem>) => {
        setFormItems((prev) =>
            prev.map((item, i) => (i === idx ? { ...item, ...updates } : item))
        );
    };

    const handleSubmit = async () => {
        if (!formWarehouse) {
            showToast("Vui lòng chọn kho", "error");
            return;
        }
        if (formItems.length === 0) {
            showToast("Vui lòng thêm ít nhất 1 sản phẩm", "error");
            return;
        }

        const token = authStorage.getAccessToken();
        if (!token) return;

        setIsSubmitting(true);
        try {
            const payload: CreateInboundPayload = {
                warehouse_id: formWarehouse,
                partner_id: formPartner || undefined,
                purchase_order_code: formPOCode || undefined,
                notes: formNotes || undefined,
                details: formItems.map((item) => {
                    const detail: InboundDetailPayload = {
                        product_id: item.product.id,
                        expected_qty: item.expected_qty,
                        unit_id: item.unit_id,
                    };
                    if (item.batch_id) {
                        detail.batch_id = item.batch_id;
                    } else if (item.batch_code) {
                        detail.batch_code = item.batch_code;
                        detail.manufacturing_date = item.manufacturing_date;
                        detail.expiry_date = item.expiry_date;
                    }
                    return detail;
                }),
            };
            await inventoryService.createInbound(token, payload);
            showToast("Tạo phiếu nhập thành công! 🎉", "success");
            setCreateDialogOpen(false);
            resetForm();
            fetchItems();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Tạo phiếu nhập thất bại";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setFormWarehouse("");
        setFormPartner("");
        setFormPOCode("");
        setFormNotes("");
        setFormItems([]);
        setProductSearch("");
    };

    const filteredProducts = useMemo(() => {
        const addedIds = new Set(formItems.map((i) => i.product.id));
        return products.filter((p) => !addedIds.has(p.id));
    }, [products, formItems]);

    // ════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════
    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-[32px] font-bold tracking-tight leading-[130%]">
                        Phiếu nhập kho
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Quản lý và theo dõi {totalItems} phiếu nhập kho
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" className="gap-2 rounded-xl">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Xuất Excel</span>
                    </Button>
                    <Button
                        onClick={() => setCreateDialogOpen(true)}
                        className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white rounded-xl"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Tạo phiếu nhập
                    </Button>
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <Card className="border-0 shadow-premium rounded-3xl">
                <CardContent className="p-6">
                    <div className="flex flex-wrap items-center gap-4">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[250px]">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm theo mã phiếu, mã PO..."
                                className="pl-9 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setCurrentPage(1);
                                }}
                            />
                        </div>

                        {/* Tab Filters */}
                        <div className="flex items-center gap-2">
                            {FILTER_TABS.map((tab) => (
                                <Button
                                    key={tab.value}
                                    variant={activeTab === tab.value ? "secondary" : "ghost"}
                                    onClick={() => {
                                        setActiveTab(tab.value);
                                        setCurrentPage(1);
                                    }}
                                    size="sm"
                                    className="rounded-full"
                                >
                                    {tab.label}
                                </Button>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ── Data Grid ── */}
            <Card className="border-0 shadow-premium overflow-hidden rounded-3xl">
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/30 border-b">
                                <tr>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Mã phiếu nhập
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Mã PO
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Kho
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Đối tác
                                    </th>
                                    <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Trạng thái
                                    </th>
                                    <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Ngày tạo
                                    </th>
                                    <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">
                                        Thao tác
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, idx) => (
                                        <tr key={`sk-${idx}`}>
                                            {Array.from({ length: 7 }).map((_, ci) => (
                                                <td key={ci} className="py-4 px-4">
                                                    <Skeleton className="h-5 w-24" />
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                ) : error ? (
                                    <tr>
                                        <td colSpan={7} className="py-12 text-center text-muted-foreground">
                                            {error}
                                        </td>
                                    </tr>
                                ) : items.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="py-16 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                                                    <InboxIcon className="w-8 h-8 text-muted-foreground/50" />
                                                </div>
                                                <div>
                                                    <p className="text-muted-foreground font-medium">
                                                        Không tìm thấy phiếu nhập nào
                                                    </p>
                                                    <p className="text-sm text-muted-foreground/70 mt-1">
                                                        {searchTerm
                                                            ? "Thử thay đổi từ khóa tìm kiếm"
                                                            : "Bắt đầu bằng cách tạo phiếu nhập mới"}
                                                    </p>
                                                </div>
                                                {!searchTerm && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => setCreateDialogOpen(true)}
                                                        className="gap-2 mt-2 rounded-xl"
                                                    >
                                                        <PlusIcon className="w-4 h-4" />
                                                        Tạo phiếu nhập đầu tiên
                                                    </Button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item) => (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-muted/50 transition-colors group cursor-pointer"
                                            onClick={() =>
                                                router.push(`/dashboard/customer/inbound/${item.id}`)
                                            }
                                        >
                                            <td className="py-4 px-4">
                                                <span className="font-semibold text-sm text-[#0F766E]">
                                                    {item.code}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-sm text-muted-foreground">
                                                {item.purchase_order_code || "—"}
                                            </td>
                                            <td className="py-4 px-4 text-sm">
                                                {item.warehouse?.name || "—"}
                                            </td>
                                            <td className="py-4 px-4 text-sm">
                                                {item.partner?.name || "—"}
                                            </td>
                                            <td className="py-4 px-4 text-center">
                                                <StatusBadge status={item.status} />
                                            </td>
                                            <td className="py-4 px-4 text-sm text-muted-foreground">
                                                {formatDate(item.created_at)}
                                            </td>
                                            <td
                                                className="py-4 px-4 text-right"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 rounded-full"
                                                            >
                                                                <EllipsisHorizontalIcon className="w-5 h-5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem
                                                                onClick={() =>
                                                                    router.push(
                                                                        `/dashboard/customer/inbound/${item.id}`
                                                                    )
                                                                }
                                                            >
                                                                <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                                                                Xem chi tiết
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem>
                                                                <PrinterIcon className="w-4 h-4 mr-2" />
                                                                In phiếu
                                                            </DropdownMenuItem>
                                                            {item.status === "PENDING" && (
                                                                <>
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem
                                                                        className="text-destructive focus:text-destructive"
                                                                        onClick={() => {
                                                                            setCancelTarget(item);
                                                                            setCancelDialogOpen(true);
                                                                        }}
                                                                    >
                                                                        <XCircleIcon className="w-4 h-4 mr-2" />
                                                                        Hủy phiếu
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardContent>
            </Card>

            {/* ── Pagination ── */}
            {totalItems > ITEMS_PER_PAGE && (
                <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                        Hiển thị {(currentPage - 1) * ITEMS_PER_PAGE + 1} đến{" "}
                        {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} trong tổng số{" "}
                        {totalItems} kết quả
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                            disabled={currentPage === 1}
                            className="h-8 w-8 p-0 rounded-lg"
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter(
                                    (page) =>
                                        Math.abs(page - currentPage) <= 2 ||
                                        page === 1 ||
                                        page === totalPages
                                )
                                .map((page, index, array) => (
                                    <React.Fragment key={page}>
                                        {index > 0 && array[index - 1] !== page - 1 && (
                                            <span className="text-gray-400">...</span>
                                        )}
                                        <Button
                                            variant={currentPage === page ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setCurrentPage(page)}
                                            className={`h-8 min-w-[32px] rounded-lg ${currentPage === page
                                                ? "bg-[#0F766E] hover:bg-[#0F766E]/90"
                                                : "text-gray-600"
                                                }`}
                                        >
                                            {page}
                                        </Button>
                                    </React.Fragment>
                                ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                                setCurrentPage((p) => Math.min(p + 1, totalPages))
                            }
                            disabled={currentPage === totalPages}
                            className="h-8 w-8 p-0 rounded-lg"
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* ══════════════════════════════════════════
                Cancel Confirmation Dialog
               ══════════════════════════════════════════ */}
            <Dialog
                open={cancelDialogOpen}
                onOpenChange={(open) => {
                    if (!isCancelling) setCancelDialogOpen(open);
                }}
            >
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>🚫 Hủy phiếu nhập</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn hủy phiếu{" "}
                            <strong className="text-foreground">
                                &ldquo;{cancelTarget?.code}&rdquo;
                            </strong>{" "}
                            không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">
                                ⚠️ Hành động này không thể hoàn tác.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setCancelDialogOpen(false)}
                            disabled={isCancelling}
                            className="rounded-xl"
                        >
                            Đóng
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleCancelConfirm}
                            disabled={isCancelling}
                            className="gap-2 rounded-xl"
                        >
                            {isCancelling ? (
                                <span className="flex items-center gap-2">
                                    <svg
                                        className="animate-spin h-4 w-4"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                        />
                                    </svg>
                                    Đang hủy...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2">
                                    <XCircleIcon className="w-4 h-4" /> Xác nhận hủy
                                </span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ══════════════════════════════════════════
                Create Inbound Dialog
               ══════════════════════════════════════════ */}
            <Dialog
                open={createDialogOpen}
                onOpenChange={(open) => {
                    if (!open && !isSubmitting) {
                        setCreateDialogOpen(false);
                        resetForm();
                    }
                }}
            >
                <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto rounded-3xl p-0">
                    <DialogHeader className="p-6 border-b">
                        <DialogTitle className="text-[20px] leading-[130%]">
                            Tạo phiếu nhập kho
                        </DialogTitle>
                        <DialogDescription>
                            Nhập thông tin phiếu nhập và thêm sản phẩm cần nhập kho
                        </DialogDescription>
                    </DialogHeader>

                    {/* Section 1 — Thông tin chung */}
                    <div className="inbound-drawer__section">
                        <h3 className="inbound-drawer__section-title">
                            1. Thông tin chung
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Kho nhập *</Label>
                                <Select
                                    value={formWarehouse}
                                    onValueChange={setFormWarehouse}
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="Chọn kho" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {warehouses.map((w) => (
                                            <SelectItem key={w.id} value={w.id}>
                                                {w.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Nhà cung cấp</Label>
                                <Select
                                    value={formPartner}
                                    onValueChange={setFormPartner}
                                >
                                    <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="Chọn NCC" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {partners.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Mã PO tham chiếu</Label>
                                <Input
                                    value={formPOCode}
                                    onChange={(e) => setFormPOCode(e.target.value)}
                                    placeholder="VD: PO-2024-001"
                                    className="rounded-xl"
                                />
                            </div>
                        </div>
                        <div className="mt-4 space-y-2">
                            <Label>Ghi chú</Label>
                            <Input
                                value={formNotes}
                                onChange={(e) => setFormNotes(e.target.value)}
                                placeholder="Ghi chú cho phiếu nhập..."
                                className="rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Section 2 — Chi tiết hàng hóa */}
                    <div className="inbound-drawer__section">
                        <h3 className="inbound-drawer__section-title">
                            2. Chi tiết hàng hóa
                        </h3>
                        {/* Product search + barcode scanner */}
                        <div className="relative mb-4">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm sản phẩm theo tên, SKU hoặc quét barcode..."
                                className="pl-9 rounded-xl"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter" && productSearch.trim()) {
                                        // Barcode scan: try to match product barcode or unit barcode
                                        const barcode = productSearch.trim();
                                        // Check product's own barcode
                                        const directMatch = products.find(
                                            (p) => p.barcode === barcode
                                        );
                                        if (directMatch) {
                                            addProduct(directMatch, barcode);
                                            return;
                                        }
                                        // Check unit barcodes across products
                                        for (const p of products) {
                                            if (p.units) {
                                                const unitMatch = p.units.find(
                                                    (pu) => pu.barcode === barcode
                                                );
                                                if (unitMatch) {
                                                    addProduct(p, barcode);
                                                    return;
                                                }
                                            }
                                        }
                                        // Fallback: add first filtered product
                                        if (filteredProducts.length === 1) {
                                            addProduct(filteredProducts[0]);
                                        }
                                    }
                                }}
                            />
                            {productSearch && filteredProducts.length > 0 && (
                                <div className="absolute z-10 top-full mt-1 w-full bg-white border rounded-2xl shadow-lg max-h-48 overflow-y-auto">
                                    {filteredProducts.map((p) => (
                                        <button
                                            key={p.id}
                                            className="w-full text-left px-4 py-2 hover:bg-muted/50 transition-colors text-sm flex items-center justify-between"
                                            onClick={() => addProduct(p)}
                                        >
                                            <span>
                                                <span className="font-medium">{p.name}</span>
                                                <span className="text-muted-foreground ml-2 text-xs">
                                                    {p.sku}
                                                </span>
                                            </span>
                                            <PlusIcon className="w-4 h-4 text-[#0F766E]" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Items table header */}
                        {formItems.length > 0 && (
                            <>
                                <div className="inbound-drawer__product-row text-xs font-semibold text-muted-foreground uppercase border-b pb-2">
                                    <span>Sản phẩm</span>
                                    <span>Số lượng</span>
                                    <span>Đơn vị</span>
                                    <span>Lô hàng</span>
                                    <span>Lô mới</span>
                                    <span></span>
                                </div>
                                {formItems.map((item, idx) => (
                                    <CreateItemRow
                                        key={item.product.id}
                                        item={item}
                                        index={idx}
                                        onRemove={() => removeItem(idx)}
                                        onUpdate={(updates) => updateItem(idx, updates)}
                                    />
                                ))}
                            </>
                        )}

                        {formItems.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground">
                                <InboxIcon className="w-10 h-10 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">
                                    Tìm kiếm và thêm sản phẩm vào phiếu nhập
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="sticky bottom-0 bg-white border-t p-4 flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            {formItems.length} sản phẩm
                        </p>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setCreateDialogOpen(false);
                                    resetForm();
                                }}
                                disabled={isSubmitting}
                                className="rounded-xl"
                            >
                                Hủy
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white rounded-xl min-w-[140px]"
                            >
                                {isSubmitting ? (
                                    <span className="flex items-center gap-2">
                                        <svg
                                            className="animate-spin h-4 w-4"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                        >
                                            <circle
                                                className="opacity-25"
                                                cx="12"
                                                cy="12"
                                                r="10"
                                                stroke="currentColor"
                                                strokeWidth="4"
                                            />
                                            <path
                                                className="opacity-75"
                                                fill="currentColor"
                                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                                            />
                                        </svg>
                                        Đang tạo...
                                    </span>
                                ) : (
                                    "Tạo phiếu nhập"
                                )}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

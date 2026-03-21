"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { useToast } from "@/contexts/ToastContext";
import type { OutboundRequest, ExportStatus } from "@/services/inventory/inventory.types";

// ── shadcn/ui ──
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ── Icons ──
import {
    ArrowLeftIcon,
    PrinterIcon,
    CheckCircleIcon,
    MapPinIcon,
    CubeIcon,
    TruckIcon,
    ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

import "../outbound.css";

const inventoryService = new InventoryService();

// ────────────────────────────────────────────────
// Status config
// ────────────────────────────────────────────────
const STATUS_CONFIG: Record<ExportStatus, { label: string; className: string }> = {
    PENDING: { label: "Chờ xử lý", className: "outbound-status--pending" },
    PICKING: { label: "Đang nhặt hàng", className: "outbound-status--picking" },
    CHECKING: { label: "Đang kiểm tra", className: "outbound-status--checking" },
    PACKED: { label: "Đã đóng gói", className: "outbound-status--packed" },
    SHIPPED: { label: "Đã xuất kho", className: "outbound-status--shipped" },
    CANCELLED: { label: "Đã hủy", className: "outbound-status--cancelled" },
};

// ────────────────────────────────────────────────
// Timeline
// ────────────────────────────────────────────────
const TIMELINE_STEPS = [
    { key: "PENDING", label: "Khởi tạo" },
    { key: "PICKING", label: "Đang nhặt hàng" },
    { key: "CHECKING", label: "Đang kiểm tra" },
    { key: "PACKED", label: "Đã đóng gói" },
    { key: "SHIPPED", label: "Đã xuất kho" },
];

const STATUS_ORDER: ExportStatus[] = ["PENDING", "PICKING", "CHECKING", "PACKED", "SHIPPED"];

function getStepState(stepKey: string, currentStatus: ExportStatus): "completed" | "active" | "pending" {
    if (currentStatus === "CANCELLED") {
        return stepKey === "PENDING" ? "active" : "pending";
    }
    const currentIdx = STATUS_ORDER.indexOf(currentStatus);
    const stepIdx = STATUS_ORDER.indexOf(stepKey as ExportStatus);
    if (stepIdx < currentIdx) return "completed";
    if (stepIdx === currentIdx) return "active";
    return "pending";
}

function formatDate(dateStr: string) {
    try {
        return new Intl.DateTimeFormat("vi-VN", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit",
        }).format(new Date(dateStr));
    } catch { return "—"; }
}

// ────────────────────────────────────────────────
// Mock pick list data (to be replaced with real API)
// ────────────────────────────────────────────────
interface PickListItem {
    id: string;
    block_id: string;
    block_name: string;
    product_name: string;
    product_sku: string;
    batch_code: string;
    required_qty: number;
    picked_qty: number;
}

interface PackageItem {
    id: string;
    tracking_number: string;
    carrier: string;
    weight_kg: number;
    length_cm: number;
    width_cm: number;
    height_cm: number;
}

// ════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════
export default function OutboundDetailPage() {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const { showToast } = useToast();

    const [data, setData] = useState<OutboundRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Mock pick list (in real app, this comes from ExportPickListDetail API)
    const [pickList] = useState<PickListItem[]>([]);
    const [packages, setPackages] = useState<PackageItem[]>([]);

    // ── New package form ──
    const [newPkgTracking, setNewPkgTracking] = useState("");
    const [newPkgCarrier, setNewPkgCarrier] = useState("");
    const [newPkgWeight, setNewPkgWeight] = useState(0);
    const [newPkgLength, setNewPkgLength] = useState(0);
    const [newPkgWidth, setNewPkgWidth] = useState(0);
    const [newPkgHeight, setNewPkgHeight] = useState(0);

    const fetchData = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }
            setLoading(true);
            const res = await inventoryService.getOutboundById(token, id);
            const item = (res as any)?.data || res;
            setData(item);
        } catch (err) {
            const e = err instanceof Error ? err : new Error(String(err));
            if (e.message === "Unauthorized") { router.push("/login"); return; }
            setError("Không thể tải thông tin phiếu xuất.");
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Group pick list by block
    const pickListByBlock = React.useMemo(() => {
        const groups: Record<string, PickListItem[]> = {};
        pickList.forEach((item) => {
            const key = item.block_id || "unknown";
            if (!groups[key]) groups[key] = [];
            groups[key].push(item);
        });
        return groups;
    }, [pickList]);

    const addPackage = () => {
        if (!newPkgTracking.trim()) {
            showToast("Vui lòng nhập mã vận đơn", "error");
            return;
        }
        setPackages((prev) => [
            ...prev,
            {
                id: `pkg-${Date.now()}`,
                tracking_number: newPkgTracking,
                carrier: newPkgCarrier,
                weight_kg: newPkgWeight,
                length_cm: newPkgLength,
                width_cm: newPkgWidth,
                height_cm: newPkgHeight,
            },
        ]);
        setNewPkgTracking("");
        setNewPkgCarrier("");
        setNewPkgWeight(0);
        setNewPkgLength(0);
        setNewPkgWidth(0);
        setNewPkgHeight(0);
        showToast("Đã thêm kiện hàng", "success");
    };

    // ════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════
    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-20 w-full rounded-3xl" />
                <Skeleton className="h-96 w-full rounded-3xl" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="space-y-6">
                <Button variant="ghost" onClick={() => router.push("/dashboard/organization/outbound")} className="gap-2 rounded-xl">
                    <ArrowLeftIcon className="w-4 h-4" /> Quay lại
                </Button>
                <Card className="border-0 shadow-premium rounded-3xl">
                    <CardContent className="py-16 text-center text-muted-foreground">
                        {error || "Không tìm thấy phiếu xuất"}
                    </CardContent>
                </Card>
            </div>
        );
    }

    const statusConfig = STATUS_CONFIG[data.status] || STATUS_CONFIG.PENDING;

    return (
        <div className="space-y-6">
            {/* ── Back + Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/organization/outbound")} className="rounded-full h-10 w-10">
                        <ArrowLeftIcon className="w-5 h-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-[32px] font-bold tracking-tight leading-[130%]">{data.code}</h1>
                            <Badge variant="outline" className={`rounded-full font-normal px-3 py-0.5 text-xs border ${statusConfig.className}`}>
                                {statusConfig.label}
                            </Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mt-1">Tạo lúc {formatDate(data.created_at)}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="gap-2 rounded-xl">
                        <PrinterIcon className="w-4 h-4" /> In phiếu
                    </Button>
                </div>
            </div>

            {/* ── Timeline ── */}
            <Card className="border-0 shadow-premium rounded-3xl">
                <CardContent className="p-0">
                    <div className="outbound-timeline">
                        {TIMELINE_STEPS.map((step, idx) => {
                            const state = getStepState(step.key, data.status);
                            return (
                                <React.Fragment key={step.key}>
                                    <div className="outbound-timeline__step">
                                        <div className={`outbound-timeline__dot outbound-timeline__dot--${state}`}>
                                            {state === "completed" ? <CheckCircleIcon className="w-5 h-5" /> : idx + 1}
                                        </div>
                                        <span className={`outbound-timeline__label outbound-timeline__label--${state}`}>
                                            {step.label}
                                        </span>
                                    </div>
                                    {idx < TIMELINE_STEPS.length - 1 && (
                                        <div className={`outbound-timeline__connector outbound-timeline__connector--${state === "completed" ? "completed" : "pending"}`} />
                                    )}
                                </React.Fragment>
                            );
                        })}
                        {data.status === "CANCELLED" && (
                            <>
                                <div className="outbound-timeline__connector outbound-timeline__connector--pending" />
                                <div className="outbound-timeline__step">
                                    <div className="outbound-timeline__dot" style={{ background: "#fee2e2", color: "#b91c1c" }}>✕</div>
                                    <span className="outbound-timeline__label" style={{ color: "#b91c1c", fontWeight: 600 }}>Đã hủy</span>
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ── Tabs ── */}
            <Tabs defaultValue="details" className="space-y-4">
                <TabsList className="bg-muted/50 rounded-2xl p-1">
                    <TabsTrigger value="details" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <ClipboardDocumentListIcon className="w-4 h-4" />
                        Chi tiết yêu cầu
                    </TabsTrigger>
                    <TabsTrigger value="picklist" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <MapPinIcon className="w-4 h-4" />
                        Lệnh nhặt hàng
                    </TabsTrigger>
                    <TabsTrigger value="packages" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <CubeIcon className="w-4 h-4" />
                        Đóng gói
                    </TabsTrigger>
                </TabsList>

                {/* ── Tab 1: Chi tiết yêu cầu ── */}
                <TabsContent value="details">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* General info */}
                        <Card className="border-0 shadow-premium rounded-3xl">
                            <CardContent className="p-6 space-y-4">
                                <h2 className="text-[20px] font-semibold leading-[130%]">Thông tin chung</h2>
                                <div className="space-y-3">
                                    <InfoRow label="Mã phiếu" value={data.code} />
                                    <InfoRow label="Mã SO" value={data.sales_order_code || "—"} />
                                    <InfoRow label="Kho" value={data.warehouse?.name || "—"} />
                                    <InfoRow label="Đối tác" value={data.partner?.name || "—"} />
                                    <InfoRow label="Ngày tạo" value={formatDate(data.created_at)} />
                                    <InfoRow label="Cập nhật" value={formatDate(data.updated_at)} />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Detail items */}
                        <Card className="border-0 shadow-premium rounded-3xl lg:col-span-2">
                            <CardContent className="p-6">
                                <h2 className="text-[20px] font-semibold leading-[130%] mb-4">Danh sách sản phẩm</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/30 border-b">
                                            <tr>
                                                <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Sản phẩm</th>
                                                <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">SKU</th>
                                                <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Lô hàng</th>
                                                <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Số lượng</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {data.details && data.details.length > 0 ? (
                                                data.details.map((detail) => (
                                                    <tr key={detail.id} className="hover:bg-muted/30 transition-colors">
                                                        <td className="py-3 px-4 text-sm font-medium">{detail.product?.name || "—"}</td>
                                                        <td className="py-3 px-4 text-sm text-muted-foreground">{detail.product?.sku || "—"}</td>
                                                        <td className="py-3 px-4 text-sm">{detail.batch?.code || "—"}</td>
                                                        <td className="py-3 px-4 text-center font-semibold text-sm">{detail.quantity}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={4} className="py-12 text-center text-muted-foreground">
                                                        Chưa có chi tiết hàng hóa
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ── Tab 2: Lệnh nhặt hàng (Pick List) ── */}
                <TabsContent value="picklist">
                    <Card className="border-0 shadow-premium rounded-3xl">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-[20px] font-semibold leading-[130%]">Lệnh nhặt hàng</h2>
                                <Button className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white rounded-xl" size="sm">
                                    <CheckCircleIcon className="w-4 h-4" />
                                    Hoàn tất nhặt hàng
                                </Button>
                            </div>

                            {Object.keys(pickListByBlock).length > 0 ? (
                                Object.entries(pickListByBlock).map(([blockId, items]) => (
                                    <div key={blockId} className="outbound-picklist__group">
                                        <div className="outbound-picklist__group-header">
                                            <MapPinIcon className="w-4 h-4" />
                                            <span>Vị trí: {items[0]?.block_name || blockId}</span>
                                            <Badge variant="secondary" className="rounded-full text-xs ml-auto shadow-none">
                                                {items.length} mặt hàng
                                            </Badge>
                                        </div>
                                        <table className="w-full">
                                            <thead className="bg-muted/20">
                                                <tr>
                                                    <th className="text-left py-2 px-4 font-semibold text-xs text-muted-foreground uppercase">Sản phẩm</th>
                                                    <th className="text-left py-2 px-4 font-semibold text-xs text-muted-foreground uppercase">Lô</th>
                                                    <th className="text-center py-2 px-4 font-semibold text-xs text-muted-foreground uppercase">Cần lấy</th>
                                                    <th className="text-center py-2 px-4 font-semibold text-xs text-muted-foreground uppercase">Đã lấy</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {items.map((item) => (
                                                    <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                                        <td className="py-2 px-4">
                                                            <p className="text-sm font-medium">{item.product_name}</p>
                                                            <p className="text-xs text-muted-foreground">{item.product_sku}</p>
                                                        </td>
                                                        <td className="py-2 px-4 text-sm">{item.batch_code}</td>
                                                        <td className="py-2 px-4 text-center font-semibold text-sm">{item.required_qty}</td>
                                                        <td className="py-2 px-4 text-center">
                                                            <Input
                                                                type="number"
                                                                min={0}
                                                                defaultValue={item.picked_qty}
                                                                className="w-16 h-7 rounded-lg text-center text-sm mx-auto"
                                                            />
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-16 text-muted-foreground">
                                    <MapPinIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                    <p className="text-sm font-medium">Chưa có lệnh nhặt hàng</p>
                                    <p className="text-xs text-muted-foreground/70 mt-1">
                                        Lệnh nhặt hàng sẽ được tạo khi phiếu chuyển sang trạng thái &quot;Đang nhặt hàng&quot;
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Tab 3: Đóng gói (Packages) ── */}
                <TabsContent value="packages">
                    <Card className="border-0 shadow-premium rounded-3xl">
                        <CardContent className="p-6">
                            <h2 className="text-[20px] font-semibold leading-[130%] mb-6">Quản lý kiện hàng</h2>

                            {/* Add package form */}
                            <div className="p-4 bg-muted/30 rounded-2xl mb-6 space-y-4">
                                <p className="text-sm font-semibold text-muted-foreground">Thêm kiện hàng mới</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Mã vận đơn *</Label>
                                        <Input
                                            value={newPkgTracking}
                                            onChange={(e) => setNewPkgTracking(e.target.value)}
                                            placeholder="VD: VN123456789"
                                            className="rounded-xl h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Hãng vận chuyển</Label>
                                        <Input
                                            value={newPkgCarrier}
                                            onChange={(e) => setNewPkgCarrier(e.target.value)}
                                            placeholder="VD: GHTK, GHN, ..."
                                            className="rounded-xl h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Khối lượng (kg)</Label>
                                        <Input
                                            type="number"
                                            value={newPkgWeight || ""}
                                            onChange={(e) => setNewPkgWeight(parseFloat(e.target.value) || 0)}
                                            className="rounded-xl h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Dài (cm)</Label>
                                        <Input
                                            type="number"
                                            value={newPkgLength || ""}
                                            onChange={(e) => setNewPkgLength(parseFloat(e.target.value) || 0)}
                                            className="rounded-xl h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Rộng (cm)</Label>
                                        <Input
                                            type="number"
                                            value={newPkgWidth || ""}
                                            onChange={(e) => setNewPkgWidth(parseFloat(e.target.value) || 0)}
                                            className="rounded-xl h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Cao (cm)</Label>
                                        <Input
                                            type="number"
                                            value={newPkgHeight || ""}
                                            onChange={(e) => setNewPkgHeight(parseFloat(e.target.value) || 0)}
                                            className="rounded-xl h-9 text-sm"
                                        />
                                    </div>
                                </div>
                                <Button onClick={addPackage} size="sm" className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white rounded-xl">
                                    <CubeIcon className="w-4 h-4" /> Thêm kiện hàng
                                </Button>
                            </div>

                            {/* Package list */}
                            {packages.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead className="bg-muted/30 border-b">
                                            <tr>
                                                <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Mã vận đơn</th>
                                                <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Hãng vận chuyển</th>
                                                <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Khối lượng</th>
                                                <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Kích thước (DxRxC)</th>
                                                <th className="text-right py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Thao tác</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {packages.map((pkg) => (
                                                <tr key={pkg.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-2">
                                                            <TruckIcon className="w-4 h-4 text-[#0F766E]" />
                                                            <span className="text-sm font-medium">{pkg.tracking_number}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-sm">{pkg.carrier || "—"}</td>
                                                    <td className="py-3 px-4 text-center text-sm">{pkg.weight_kg} kg</td>
                                                    <td className="py-3 px-4 text-center text-sm">
                                                        {pkg.length_cm}×{pkg.width_cm}×{pkg.height_cm} cm
                                                    </td>
                                                    <td className="py-3 px-4 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive hover:text-destructive rounded-xl text-xs"
                                                            onClick={() => setPackages((prev) => prev.filter((p) => p.id !== pkg.id))}
                                                        >
                                                            Xóa
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground">
                                    <CubeIcon className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                    <p className="text-sm font-medium">Chưa có kiện hàng nào</p>
                                    <p className="text-xs text-muted-foreground/70 mt-1">
                                        Thêm kiện hàng bằng biểu mẫu phía trên
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

// ────────────────────────────────────────────────
// Info row helper
// ────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-2">
            <span className="text-sm text-muted-foreground shrink-0">{label}</span>
            <span className="text-sm font-medium text-right">{value}</span>
        </div>
    );
}

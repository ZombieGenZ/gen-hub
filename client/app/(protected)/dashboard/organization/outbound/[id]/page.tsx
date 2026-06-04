"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { useToast } from "@/contexts/ToastContext";
import type { OutboundRequest, ExportStatus } from "@/services/inventory/inventory.types";
import { useOrganizationRealtime } from "@/hooks/useOrganizationRealtime";

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
    BuildingStorefrontIcon,
    UserIcon,
} from "@heroicons/react/24/outline";
import { OutboundRouteMap } from "@/components/outbound/OutboundRouteMap";
import { BinPackingPanel } from "@/components/outbound/BinPackingPanel";

import "../outbound.css";

const inventoryService = new InventoryService();

const OUTBOUND_DETAIL_EVENTS = [
    "outbound:approved",
    "outbound:rejected",
    "outbound:picking-confirmed",
    "outbound:checking-confirmed",
    "outbound:shipment-completed",
    "outbound:split",
];

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
    const [orgId, setOrgId] = useState<string | null>(null);

    const [packages, setPackages] = useState<PackageItem[]>([]);

    // ── New package form ──
    const [newPkgTracking, setNewPkgTracking] = useState("");
    const [newPkgCarrier, setNewPkgCarrier] = useState("");
    const [newPkgWeight, setNewPkgWeight] = useState(0);
    const [newPkgLength, setNewPkgLength] = useState(0);
    const [newPkgWidth, setNewPkgWidth] = useState(0);
    const [newPkgHeight, setNewPkgHeight] = useState(0);

    const fetchData = useCallback(async (showLoading = true) => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }

            if (showLoading) {
                setLoading(true);
            }
            const res = await inventoryService.getOutboundById(token, id);
            const item = (res as any)?.data || res;
            setData(item);
            setOrgId(item?.organization_id ?? null);
        } catch (err) {
            const e = err instanceof Error ? err : new Error(String(err));
            if (e.message === "Unauthorized") { router.push("/login"); return; }
            setError("Không thể tải thông tin phiếu xuất.");
        } finally {
            setLoading(false);
        }
    }, [id, router]);

    useEffect(() => { void fetchData(); }, [fetchData]);

    useOrganizationRealtime({
        orgId,
        events: OUTBOUND_DETAIL_EVENTS,
        enabled: !!orgId,
        onEvent: (eventName, payload) => {
            const data = payload as { exportId?: string } | undefined;
            if (!data?.exportId || data.exportId !== id) {
                return;
            }

            void fetchData(false);

            const messageMap: Record<string, string> = {
                "outbound:approved": "Phiếu xuất đã được duyệt",
                "outbound:rejected": "Phiếu xuất đã bị từ chối",
                "outbound:picking-confirmed": "Đã xác nhận nhặt hàng phiếu xuất",
                "outbound:checking-confirmed": "Đã xác nhận kiểm tra phiếu xuất",
                "outbound:shipment-completed": "Phiếu xuất đã hoàn tất",
                "outbound:split": "Phiếu xuất đã được tách",
            };

            const message = messageMap[eventName];
            if (message) {
                showToast(message, "success");
            }
        },
    });

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
                        <p className="text-muted-foreground text-sm mt-1">
                            {data.warehouse?.name || "—"}
                            {data.required_date && <> &bull; {formatDate(data.required_date)}</>}
                        </p>
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
                                    <div className="outbound-timeline__dot outbound-timeline__dot--cancelled">✕</div>
                                    <span className="outbound-timeline__label outbound-timeline__label--cancelled">Đã hủy</span>
                                </div>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ── Summary info cards ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-0 shadow-premium rounded-2xl">
                    <CardContent className="p-4 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#0F766E]/10 flex items-center justify-center shrink-0">
                            <BuildingStorefrontIcon className="w-5 h-5 text-[#0F766E]" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Kho xuất</p>
                            <p className="text-sm font-semibold truncate mt-0.5">{data.warehouse?.name || "—"}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-premium rounded-2xl">
                    <CardContent className="p-4 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                            <UserIcon className="w-5 h-5 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Xuất cho</p>
                            <p className="text-sm font-semibold truncate mt-0.5">{data.partner?.name || "—"}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-premium rounded-2xl">
                    <CardContent className="p-4 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                            <MapPinIcon className="w-5 h-5 text-orange-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Địa chỉ giao</p>
                            <p className="text-sm font-semibold truncate mt-0.5" title={data.delivery_address || undefined}>{data.delivery_address || "—"}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-premium rounded-2xl">
                    <CardContent className="p-4 flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-purple-500/10 flex items-center justify-center shrink-0">
                            <TruckIcon className="w-5 h-5 text-purple-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Ngày xuất dự kiến</p>
                            <p className="text-sm font-semibold truncate mt-0.5">{data.required_date ? formatDate(data.required_date) : "—"}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

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
                    <TabsTrigger value="route" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <TruckIcon className="w-4 h-4" />
                        Lộ trình
                    </TabsTrigger>
                    <TabsTrigger value="binpacking" className="gap-2 rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <CubeIcon className="w-4 h-4" />
                        Xếp hàng 3D
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
                                    <InfoRow label="Nơi nhận" value={data.delivery_address || "—"} />
                                    <InfoRow label="Ngày dự kiến" value={data.required_date ? formatDate(data.required_date) : "—"} />
                                    <InfoRow label="Thông tin xe" value={data.vehicle_info || "—"} />
                                    <InfoRow label="Ngày tạo" value={formatDate(data.created_at)} />
                                    <InfoRow label="Cập nhật" value={formatDate(data.updated_at)} />
                                    {data.approved_at && (
                                        <InfoRow label="Duyệt lúc" value={formatDate(data.approved_at)} />
                                    )}
                                    {data.picking_started_at && (
                                        <InfoRow label="Bắt đầu nhặt" value={formatDate(data.picking_started_at)} />
                                    )}
                                    {data.picking_completed_at && (
                                        <InfoRow label="Hoàn tất nhặt" value={formatDate(data.picking_completed_at)} />
                                    )}
                                    {data.checking_started_at && (
                                        <InfoRow label="Bắt đầu kiểm" value={formatDate(data.checking_started_at)} />
                                    )}
                                    {data.checking_completed_at && (
                                        <InfoRow label="Hoàn tất kiểm" value={formatDate(data.checking_completed_at)} />
                                    )}
                                    {data.shipped_at && (
                                        <InfoRow label="Xuất kho lúc" value={formatDate(data.shipped_at)} />
                                    )}
                                    {data.tracking_number && (
                                        <InfoRow label="Mã vận đơn" value={data.tracking_number} />
                                    )}
                                    {data.notes && (
                                        <div className="pt-2 mt-2 border-t border-dashed">
                                            <p className="text-xs text-muted-foreground mb-1">Ghi chú</p>
                                            <p className="text-sm">{data.notes}</p>
                                        </div>
                                    )}
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
                                                <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">HSD</th>
                                                <th className="text-left py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Đơn vị</th>
                                                <th className="text-center py-3 px-4 font-semibold text-xs text-muted-foreground uppercase">Số lượng</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {data.details && data.details.length > 0 ? (
                                                data.details.map((detail) => (
                                                    <tr key={detail.id} className="hover:bg-muted/30 transition-colors">
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-2">
                                                                {detail.product?.image_url && (
                                                                    <img
                                                                        src={detail.product.image_url}
                                                                        alt={detail.product.name}
                                                                        className="w-8 h-8 rounded-lg object-cover shrink-0 border border-muted"
                                                                    />
                                                                )}
                                                                <span className="text-sm font-medium">{detail.product?.name || "—"}</span>
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-muted-foreground">{detail.product?.sku || "—"}</td>
                                                        <td className="py-3 px-4 text-sm">{detail.batch?.code || "—"}</td>
                                                        <td className="py-3 px-4 text-sm">
                                                            {detail.batch?.expiry_date ? (
                                                                <span className={new Date(detail.batch.expiry_date) < new Date() ? "text-red-500 font-medium" : ""}>
                                                                    {formatDate(detail.batch.expiry_date).split(",")[0]}
                                                                </span>
                                                            ) : "—"}
                                                        </td>
                                                        <td className="py-3 px-4 text-sm text-muted-foreground">{detail.unit?.name || "—"}</td>
                                                        <td className="py-3 px-4 text-center font-semibold text-sm">{detail.quantity}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                                                        Chưa có chi tiết hàng hóa
                                                    </td>
                                                </tr>
                                            )}
                                            {data.details && data.details.length > 0 && (
                                                <tfoot className="border-t-2 bg-muted/20">
                                                    <tr>
                                                        <td colSpan={5} className="py-3 px-4 text-sm font-semibold text-muted-foreground">
                                                            Tổng cộng: {data.details.length} mặt hàng
                                                        </td>
                                                        <td className="py-3 px-4 text-center font-bold text-sm">
                                                            {data.details.reduce((s, d) => s + d.quantity, 0)}
                                                        </td>
                                                    </tr>
                                                </tfoot>
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
                            <h2 className="text-[20px] font-semibold leading-[130%] mb-6">Lệnh nhặt hàng</h2>

                            {data.pick_lists && data.pick_lists.length > 0 ? (
                                <div className="space-y-6">
                                    {data.pick_lists.map((pickList) => (
                                        <div key={pickList.id} className="border border-muted rounded-2xl overflow-hidden">
                                            <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b">
                                                <ClipboardDocumentListIcon className="w-4 h-4 text-muted-foreground" />
                                                <span className="text-sm font-semibold">{pickList.code}</span>
                                                <Badge
                                                    variant="secondary"
                                                    className="rounded-full text-xs shadow-none ml-auto"
                                                >
                                                    {pickList.status}
                                                </Badge>
                                            </div>
                                            <table className="w-full">
                                                <thead className="bg-muted/10">
                                                    <tr>
                                                        <th className="text-left py-2 px-4 font-semibold text-xs text-muted-foreground uppercase">Vị trí</th>
                                                        <th className="text-left py-2 px-4 font-semibold text-xs text-muted-foreground uppercase">Sản phẩm</th>
                                                        <th className="text-center py-2 px-4 font-semibold text-xs text-muted-foreground uppercase">Cần lấy</th>
                                                        <th className="text-center py-2 px-4 font-semibold text-xs text-muted-foreground uppercase">Đã lấy</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {pickList.details.map((item) => {
                                                        const isComplete = item.picked_qty >= item.required_qty;
                                                        return (
                                                            <tr key={item.id} className="hover:bg-muted/20 transition-colors">
                                                                <td className="py-2 px-4">
                                                                    <div className="flex items-center gap-1.5">
                                                                        <MapPinIcon className="w-3.5 h-3.5 text-[#0F766E] shrink-0" />
                                                                        <span className="text-sm font-medium">
                                                                            {item.block?.code || "—"}
                                                                        </span>
                                                                        {item.block?.name && (
                                                                            <span className="text-xs text-muted-foreground">({item.block.name})</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="py-2 px-4">
                                                                    <p className="text-sm font-medium">
                                                                        {item.export_detail?.product?.name || "—"}
                                                                    </p>
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {item.export_detail?.product?.sku || ""}
                                                                    </p>
                                                                </td>
                                                                <td className="py-2 px-4 text-center font-semibold text-sm">{item.required_qty}</td>
                                                                <td className="py-2 px-4 text-center">
                                                                    <span className={`text-sm font-semibold ${isComplete ? "text-green-600" : item.picked_qty > 0 ? "text-yellow-600" : "text-muted-foreground"}`}>
                                                                        {item.picked_qty}
                                                                    </span>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ))}
                                </div>
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
                                            className="rounded-xl h-9 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Hãng vận chuyển</Label>
                                        <Input
                                            value={newPkgCarrier}
                                            onChange={(e) => setNewPkgCarrier(e.target.value)}
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
                {/* ── Tab 4: Lộ trình ── */}
                <TabsContent value="route">
                    <Card className="border-0 shadow-premium rounded-3xl">
                        <CardContent className="p-6">
                            <h2 className="text-[20px] font-semibold leading-[130%] mb-4">Lộ trình giao hàng</h2>
                            <OutboundRouteMap
                                exportId={data.id}
                                warehouseTemplateId={data.warehouse?.id}
                                warehouseLat={data.warehouse?.latitude}
                                warehouseLng={data.warehouse?.longitude}
                                warehouseName={data.warehouse?.name}
                                deliveryAddress={data.delivery_address}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── Tab 5: Xếp hàng 3D ── */}
                <TabsContent value="binpacking">
                    <BinPackingPanel
                        exportId={data.id}
                        warehouseId={data.warehouse_id ?? data.warehouse?.id ?? ""}
                        productNames={Object.fromEntries(
                            (data.details ?? [])
                                .filter((d) => d.product?.id)
                                .map((d) => [d.product!.id, d.product!.name ?? d.product!.sku ?? ""])
                        )}
                        onApplied={() => void fetchData(false)}
                    />
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

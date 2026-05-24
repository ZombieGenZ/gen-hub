"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { CheckIcon, LinkIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { authStorage } from "@/services/auth/auth-storage.service";
import { GpsService } from "@/services/gps/gps.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import type { InboundRequest, OutboundRequest, ReceiptStatus, ExportStatus } from "@/services/inventory/inventory.types";

const gpsService = new GpsService();
const inventoryService = new InventoryService();

// Statuses that count as "fully approved / in-progress" for GPS purposes
const ELIGIBLE_INBOUND_STATUSES: ReceiptStatus[] = ["APPROVED", "RECEIVING", "PROCESSING", "PUTAWAY"];
const ELIGIBLE_OUTBOUND_STATUSES: ExportStatus[] = ["PICKING", "CHECKING", "PACKED"];

function inboundStatusLabel(s: ReceiptStatus): { label: string; color: string } {
    switch (s) {
        case "APPROVED":  return { label: "Đã duyệt",    color: "bg-green-100 text-green-700" };
        case "RECEIVING": return { label: "Đang nhận",   color: "bg-blue-100 text-blue-700" };
        case "PROCESSING":return { label: "Đang xử lý",  color: "bg-indigo-100 text-indigo-700" };
        case "PUTAWAY":   return { label: "Đang lưu kho",color: "bg-violet-100 text-violet-700" };
        default:          return { label: s,              color: "bg-gray-100 text-gray-600" };
    }
}

function outboundStatusLabel(s: ExportStatus): { label: string; color: string } {
    switch (s) {
        case "PICKING":  return { label: "Đang lấy hàng", color: "bg-blue-100 text-blue-700" };
        case "CHECKING": return { label: "Đang kiểm tra", color: "bg-orange-100 text-orange-700" };
        case "PACKED":   return { label: "Đã đóng gói",   color: "bg-violet-100 text-violet-700" };
        default:         return { label: s,                color: "bg-gray-100 text-gray-600" };
    }
}

function formatDate(iso?: string | null): string {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// ── Detail Modal ────────────────────────────────────────────────

function InboundDetailModal({ item, open, onClose }: { item: InboundRequest; open: boolean; onClose: () => void }) {
    const st = inboundStatusLabel(item.status);
    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="rounded-2xl max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="font-mono text-teal-700">{item.code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                    </DialogTitle>
                    <DialogDescription>Phiếu nhập kho</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-1">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Kho nhận</p>
                            <p className="font-medium">{item.warehouse?.name ?? "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Nhà cung cấp</p>
                            <p className="font-medium">{item.partner?.name ?? "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Mã PO</p>
                            <p className="font-mono text-xs">{item.purchase_order_code ?? "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Ngày dự kiến</p>
                            <p className="font-medium">{formatDate(item.expected_arrival)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Ngày tạo</p>
                            <p className="font-medium">{formatDate(item.created_at)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Số mặt hàng</p>
                            <p className="font-medium">{item._count?.details ?? item.details?.length ?? "—"}</p>
                        </div>
                    </div>
                    {item.vehicle_info && (
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Thông tin xe</p>
                            <p className="text-sm">{item.vehicle_info}</p>
                        </div>
                    )}
                    {item.notes && (
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Ghi chú</p>
                            <p className="text-sm text-gray-700">{item.notes}</p>
                        </div>
                    )}
                    {item.details && item.details.length > 0 && (
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Sản phẩm</p>
                            <div className="space-y-1.5">
                                {item.details.map((d) => (
                                    <div key={d.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                                        <span className="font-medium truncate max-w-[200px]">{d.product?.name ?? d.product_id}</span>
                                        <span className="text-muted-foreground ml-2 shrink-0">
                                            SL: {d.expected_qty} {d.unit?.name ?? ""}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" className="rounded-xl" onClick={onClose}>Đóng</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function OutboundDetailModal({ item, open, onClose }: { item: OutboundRequest; open: boolean; onClose: () => void }) {
    const st = outboundStatusLabel(item.status);
    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
            <DialogContent className="rounded-2xl max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <span className="font-mono text-teal-700">{item.code}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                    </DialogTitle>
                    <DialogDescription>Phiếu xuất kho</DialogDescription>
                </DialogHeader>
                <div className="space-y-3 py-1">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Kho xuất</p>
                            <p className="font-medium">{item.warehouse?.name ?? "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Khách hàng</p>
                            <p className="font-medium">{item.partner?.name ?? "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Mã SO</p>
                            <p className="font-mono text-xs">{item.sales_order_code ?? "—"}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Ngày yêu cầu</p>
                            <p className="font-medium">{formatDate(item.required_date)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Ngày tạo</p>
                            <p className="font-medium">{formatDate(item.created_at)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Số mặt hàng</p>
                            <p className="font-medium">{item._count?.details ?? item.details?.length ?? "—"}</p>
                        </div>
                    </div>
                    {item.delivery_address && (
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Địa chỉ giao hàng</p>
                            <p className="text-sm">{item.delivery_address}</p>
                        </div>
                    )}
                    {item.vehicle_info && (
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Thông tin xe</p>
                            <p className="text-sm">{item.vehicle_info}</p>
                        </div>
                    )}
                    {item.notes && (
                        <div>
                            <p className="text-xs text-muted-foreground mb-0.5">Ghi chú</p>
                            <p className="text-sm text-gray-700">{item.notes}</p>
                        </div>
                    )}
                    {item.details && item.details.length > 0 && (
                        <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Sản phẩm</p>
                            <div className="space-y-1.5">
                                {item.details.map((d) => (
                                    <div key={d.id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                                        <span className="font-medium truncate max-w-[200px]">{d.product?.name ?? d.product_id}</span>
                                        <span className="text-muted-foreground ml-2 shrink-0">
                                            SL: {d.quantity} {d.unit?.name ?? ""}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" className="rounded-xl" onClick={onClose}>Đóng</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Picker row ──────────────────────────────────────────────────

function InboundRow({
    item,
    selected,
    onSelect,
    onDetail,
}: {
    item: InboundRequest;
    selected: boolean;
    onSelect: () => void;
    onDetail: () => void;
}) {
    const st = inboundStatusLabel(item.status);
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                selected
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
            }`}
        >
            {/* Selection indicator */}
            <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                selected ? "border-teal-500 bg-teal-500" : "border-gray-300"
            }`}>
                {selected && <CheckIcon className="w-2.5 h-2.5 text-white" />}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-sm text-teal-700">{item.code}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {item.partner?.name ?? "Không có NCC"} · {formatDate(item.expected_arrival)}
                    {item._count?.details != null && ` · ${item._count.details} SP`}
                </div>
            </div>

            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDetail(); }}
                className="shrink-0 p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                title="Xem chi tiết"
            >
                <InformationCircleIcon className="w-4 h-4" />
            </button>
        </button>
    );
}

function OutboundRow({
    item,
    selected,
    onSelect,
    onDetail,
}: {
    item: OutboundRequest;
    selected: boolean;
    onSelect: () => void;
    onDetail: () => void;
}) {
    const st = outboundStatusLabel(item.status);
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                selected
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-100 bg-white hover:border-gray-200 hover:bg-gray-50"
            }`}
        >
            <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                selected ? "border-teal-500 bg-teal-500" : "border-gray-300"
            }`}>
                {selected && <CheckIcon className="w-2.5 h-2.5 text-white" />}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-semibold text-sm text-teal-700">{item.code}</span>
                    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">
                    {item.partner?.name ?? "Không có KH"} · {formatDate(item.required_date)}
                    {item._count?.details != null && ` · ${item._count.details} SP`}
                </div>
            </div>

            <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDetail(); }}
                className="shrink-0 p-1 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
                title="Xem chi tiết"
            >
                <InformationCircleIcon className="w-4 h-4" />
            </button>
        </button>
    );
}

// ── Main Dialog ─────────────────────────────────────────────────

export interface GpsSessionCreateDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    warehouseId: string;
    /** Pre-selected export ID (e.g. from outbound detail page) */
    defaultExportId?: string;
    onCreated?: (trackingUrl: string) => void;
}

export function GpsSessionCreateDialog({
    open,
    onOpenChange,
    warehouseId,
    defaultExportId,
    onCreated,
}: GpsSessionCreateDialogProps) {
    // Form fields
    const [licensePlate, setLicensePlate] = useState("");
    const [driverPhone, setDriverPhone] = useState("");
    const [creating, setCreating] = useState(false);
    const [trackingUrl, setTrackingUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Picker state
    const [activeTab, setActiveTab] = useState<"inbound" | "outbound">(defaultExportId ? "outbound" : "inbound");
    const [inboundList, setInboundList] = useState<InboundRequest[]>([]);
    const [outboundList, setOutboundList] = useState<OutboundRequest[]>([]);
    const [loadingList, setLoadingList] = useState(false);
    const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
    const [selectedExportId, setSelectedExportId] = useState<string | null>(defaultExportId ?? null);

    // Detail modal state
    const [detailInbound, setDetailInbound] = useState<InboundRequest | null>(null);
    const [detailOutbound, setDetailOutbound] = useState<OutboundRequest | null>(null);

    // Fetch lists when dialog opens
    useEffect(() => {
        if (!open) return;
        const token = authStorage.getAccessToken();
        if (!token) return;

        setLoadingList(true);
        Promise.all([
            inventoryService.listInbound(token, { warehouse_id: warehouseId, limit: 100 }),
            inventoryService.listOutbound(token, { warehouse_id: warehouseId, limit: 100 }),
        ])
            .then(([inRes, outRes]) => {
                setInboundList(
                    (inRes.data?.items ?? []).filter((r) => ELIGIBLE_INBOUND_STATUSES.includes(r.status)),
                );
                setOutboundList(
                    (outRes.data?.items ?? []).filter((r) => ELIGIBLE_OUTBOUND_STATUSES.includes(r.status)),
                );
            })
            .catch(() => null)
            .finally(() => setLoadingList(false));
    }, [open, warehouseId]);

    // Reset form when dialog closes
    useEffect(() => {
        if (!open) {
            setLicensePlate("");
            setDriverPhone("");
            setTrackingUrl(null);
            setCopied(false);
            setSelectedReceiptId(null);
            setSelectedExportId(defaultExportId ?? null);
            setActiveTab(defaultExportId ? "outbound" : "inbound");
        }
    }, [open, defaultExportId]);

    const handleSelectInbound = useCallback((id: string) => {
        setSelectedReceiptId((prev) => (prev === id ? null : id));
        setSelectedExportId(null);
        setActiveTab("inbound");
    }, []);

    const handleSelectOutbound = useCallback((id: string) => {
        setSelectedExportId((prev) => (prev === id ? null : id));
        setSelectedReceiptId(null);
        setActiveTab("outbound");
    }, []);

    const handleCreate = async () => {
        if (!licensePlate.trim()) return;
        const token = authStorage.getAccessToken();
        if (!token) return;

        setCreating(true);
        try {
            const result = await gpsService.createSession(token, {
                license_plate: licensePlate,
                warehouse_template_id: warehouseId,
                receipt_id: selectedReceiptId ?? undefined,
                export_id: selectedExportId ?? undefined,
                driver_phone: driverPhone || undefined,
            });
            setTrackingUrl(result.tracking_url);
            onCreated?.(result.tracking_url);
        } catch (e) {
            console.error(e);
        } finally {
            setCreating(false);
        }
    };

    const handleCopy = () => {
        if (!trackingUrl) return;
        void navigator.clipboard.writeText(trackingUrl).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    // ── Render detail modals outside main dialog to avoid nesting issues ──
    const detailModals = (
        <>
            {detailInbound && (
                <InboundDetailModal
                    item={detailInbound}
                    open={!!detailInbound}
                    onClose={() => setDetailInbound(null)}
                />
            )}
            {detailOutbound && (
                <OutboundDetailModal
                    item={detailOutbound}
                    open={!!detailOutbound}
                    onClose={() => setDetailOutbound(null)}
                />
            )}
        </>
    );

    return (
        <>
            {detailModals}

            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="rounded-2xl max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Tạo link GPS cho tài xế</DialogTitle>
                        <DialogDescription>
                            Tài xế mở link trên điện thoại để chia sẻ vị trí realtime
                        </DialogDescription>
                    </DialogHeader>

                    {!trackingUrl ? (
                        <div className="space-y-4 py-1">
                            {/* Biển số + SĐT */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-sm">Biển số xe *</Label>
                                    <Input
                                        value={licensePlate}
                                        onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                                        placeholder="51A-12345"
                                        className="rounded-xl font-mono uppercase"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-sm">SĐT tài xế</Label>
                                    <Input
                                        value={driverPhone}
                                        onChange={(e) => setDriverPhone(e.target.value)}
                                        placeholder="0901234567"
                                        className="rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Receipt / Export Picker */}
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium text-gray-700">Liên kết phiếu</p>
                                    {(selectedReceiptId || selectedExportId) && (
                                        <button
                                            type="button"
                                            onClick={() => { setSelectedReceiptId(null); setSelectedExportId(null); }}
                                            className="text-xs text-red-500 hover:text-red-600"
                                        >
                                            Bỏ chọn
                                        </button>
                                    )}
                                </div>

                                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "inbound" | "outbound")}>
                                    <TabsList className="w-full rounded-xl h-9">
                                        <TabsTrigger value="inbound" className="flex-1 rounded-lg text-xs">
                                            📥 Nhập kho
                                            {inboundList.length > 0 && (
                                                <span className="ml-1.5 bg-teal-100 text-teal-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                                                    {inboundList.length}
                                                </span>
                                            )}
                                        </TabsTrigger>
                                        <TabsTrigger value="outbound" className="flex-1 rounded-lg text-xs">
                                            📤 Xuất kho
                                            {outboundList.length > 0 && (
                                                <span className="ml-1.5 bg-teal-100 text-teal-700 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                                                    {outboundList.length}
                                                </span>
                                            )}
                                        </TabsTrigger>
                                    </TabsList>

                                    <TabsContent value="inbound" className="mt-2">
                                        {loadingList ? (
                                            <div className="h-24 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                                                Đang tải...
                                            </div>
                                        ) : inboundList.length === 0 ? (
                                            <div className="h-20 flex items-center justify-center text-xs text-muted-foreground text-center px-4">
                                                Không có phiếu nhập đã duyệt tại kho này
                                            </div>
                                        ) : (
                                            <ScrollArea className="h-44">
                                                <div className="space-y-1.5 pr-2">
                                                    {inboundList.map((item) => (
                                                        <InboundRow
                                                            key={item.id}
                                                            item={item}
                                                            selected={selectedReceiptId === item.id}
                                                            onSelect={() => handleSelectInbound(item.id)}
                                                            onDetail={() => setDetailInbound(item)}
                                                        />
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        )}
                                    </TabsContent>

                                    <TabsContent value="outbound" className="mt-2">
                                        {loadingList ? (
                                            <div className="h-24 flex items-center justify-center text-xs text-muted-foreground animate-pulse">
                                                Đang tải...
                                            </div>
                                        ) : outboundList.length === 0 ? (
                                            <div className="h-20 flex items-center justify-center text-xs text-muted-foreground text-center px-4">
                                                Không có phiếu xuất đang hoạt động tại kho này
                                            </div>
                                        ) : (
                                            <ScrollArea className="h-44">
                                                <div className="space-y-1.5 pr-2">
                                                    {outboundList.map((item) => (
                                                        <OutboundRow
                                                            key={item.id}
                                                            item={item}
                                                            selected={selectedExportId === item.id}
                                                            onSelect={() => handleSelectOutbound(item.id)}
                                                            onDetail={() => setDetailOutbound(item)}
                                                        />
                                                    ))}
                                                </div>
                                            </ScrollArea>
                                        )}
                                    </TabsContent>
                                </Tabs>

                                {/* Show selected summary */}
                                {(selectedReceiptId || selectedExportId) && (
                                    <div className="mt-2 flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl px-3 py-2">
                                        <span className="text-xs text-teal-600 font-medium">Đã chọn:</span>
                                        <span className="font-mono text-xs font-semibold text-teal-800">
                                            {selectedReceiptId
                                                ? (inboundList.find((r) => r.id === selectedReceiptId)?.code ?? selectedReceiptId)
                                                : (outboundList.find((r) => r.id === selectedExportId)?.code ?? selectedExportId)
                                            }
                                        </span>
                                        <Badge className="text-[10px] py-0 h-4 bg-teal-600">
                                            {selectedReceiptId ? "Nhập kho" : "Xuất kho"}
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 py-2">
                            <p className="text-sm text-muted-foreground">Link GPS đã tạo. Gửi cho tài xế:</p>
                            <div className="flex gap-2">
                                <Input value={trackingUrl} readOnly className="rounded-xl text-xs font-mono" />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="shrink-0 rounded-xl"
                                    onClick={handleCopy}
                                >
                                    {copied ? <CheckIcon className="w-4 h-4 text-green-600" /> : <LinkIcon className="w-4 h-4" />}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">Link có hiệu lực 24 giờ</p>
                        </div>
                    )}

                    <DialogFooter>
                        {!trackingUrl ? (
                            <>
                                <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
                                    Hủy
                                </Button>
                                <Button
                                    onClick={handleCreate}
                                    disabled={creating || !licensePlate.trim()}
                                    className="gap-2 bg-[#0F766E] hover:bg-[#0F766E]/90 text-white rounded-xl"
                                >
                                    {creating ? "Đang tạo..." : "Tạo link GPS"}
                                </Button>
                            </>
                        ) : (
                            <Button className="rounded-xl" onClick={() => onOpenChange(false)}>Đóng</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

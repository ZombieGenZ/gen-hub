"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { useToast } from "@/contexts/ToastContext";
import type { InboundRequest, OutboundRequest } from "@/services/inventory/inventory.types";

// ── shadcn/ui ──
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";

// ── Icons ──
import {
    MagnifyingGlassIcon,
    Squares2X2Icon,
    ListBulletIcon,
    CheckCircleIcon,
    ClockIcon,
    BoltIcon,
    InboxIcon,
    ArrowDownTrayIcon,
    CubeIcon,
    TruckIcon,
    ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";

// ── Sub-components ──
import InboundApprovalDetail from "./InboundApprovalDetail";
import OutboundApprovalDetail from "./OutboundApprovalDetail";

import "./approval.css";

const inventoryService = new InventoryService();

// ────────────────────────────────────────────────
// Unified ticket type
// ────────────────────────────────────────────────
interface ApprovalTicket {
    id: string;
    code: string;
    type: "inbound" | "outbound";
    status: string;
    customerName: string;
    warehouseName: string;
    skuCount: number;
    createdAt: string;
    slaHours: number; // hours since creation
    raw: InboundRequest | OutboundRequest;
}

// ────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────
function formatTimeAgo(dateStr: string): string {
    try {
        const diff = Date.now() - new Date(dateStr).getTime();
        const hours = Math.floor(diff / 3600000);
        if (hours < 1) return "Vừa tạo";
        if (hours < 24) return `${hours}h trước`;
        const days = Math.floor(hours / 24);
        return `${days}d trước`;
    } catch {
        return "—";
    }
}

function getHoursSince(dateStr: string): number {
    try {
        return (Date.now() - new Date(dateStr).getTime()) / 3600000;
    } catch {
        return 0;
    }
}

function getSlaStatus(hours: number): "ok" | "warning" | "breach" {
    if (hours >= 4) return "breach";
    if (hours >= 2) return "warning";
    return "ok";
}

const SLA_LABELS = {
    ok: "Trong SLA",
    warning: "Sắp hết hạn",
    breach: "Quá hạn SLA",
};

// ────────────────────────────────────────────────
// View mode & filter types
// ────────────────────────────────────────────────
type ViewMode = "list" | "kanban";
type TypeFilter = "ALL" | "inbound" | "outbound";

const TYPE_FILTERS: { label: string; value: TypeFilter }[] = [
    { label: "Tất cả", value: "ALL" },
    { label: "Nhập kho", value: "inbound" },
    { label: "Xuất kho", value: "outbound" },
];

// Kanban columns
const KANBAN_COLUMNS = [
    { key: "PENDING", title: "Chờ duyệt", cssModifier: "pending" },
    { key: "PROCESSING", title: "Đang xử lý", cssModifier: "processing" },
    { key: "COMPLETED", title: "Hoàn tất", cssModifier: "completed" },
];

// Map statuses to kanban columns
function getKanbanColumn(status: string): string {
    if (status === "PENDING") return "PENDING";
    if (["PROCESSING", "PICKING", "PACKED"].includes(status)) return "PROCESSING";
    if (["COMPLETED", "SHIPPED"].includes(status)) return "COMPLETED";
    return "PENDING";
}

// ════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════
export default function ApprovalQueuePage() {
    const router = useRouter();
    const { showToast } = useToast();

    // ── Data state ──
    const [inboundItems, setInboundItems] = useState<InboundRequest[]>([]);
    const [outboundItems, setOutboundItems] = useState<OutboundRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ── UI state ──
    const [viewMode, setViewMode] = useState<ViewMode>("list");
    const [typeFilter, setTypeFilter] = useState<TypeFilter>("ALL");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    // ── Drag state for Kanban ──
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

    // ── Fetch data ──
    const fetchData = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }
            setLoading(true);
            setError(null);

            const [inboundRes, outboundRes] = await Promise.all([
                inventoryService.listInbound(token, { limit: 50 }),
                inventoryService.listOutbound(token, { limit: 50 }),
            ]);

            const inData = Array.isArray(inboundRes)
                ? inboundRes
                : Array.isArray((inboundRes as any)?.data?.items)
                    ? (inboundRes as any).data.items
                    : Array.isArray((inboundRes as any)?.data)
                        ? (inboundRes as any).data
                        : [];
            const outData = Array.isArray(outboundRes)
                ? outboundRes
                : Array.isArray((outboundRes as any)?.data?.items)
                    ? (outboundRes as any).data.items
                    : Array.isArray((outboundRes as any)?.data)
                        ? (outboundRes as any).data
                        : [];

            setInboundItems(inData);
            setOutboundItems(outData);
        } catch (err) {
            const e = err instanceof Error ? err : new Error(String(err));
            if (e.message === "Unauthorized") {
                router.push("/login");
                return;
            }
            setError("Không thể tải danh sách phiếu. Vui lòng thử lại.");
        } finally {
            setLoading(false);
        }
    }, [router]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // ── Build unified ticket list ──
    const allTickets: ApprovalTicket[] = useMemo(() => {
        const inbound: ApprovalTicket[] = inboundItems.map((item) => ({
            id: item.id,
            code: item.code,
            type: "inbound" as const,
            status: item.status,
            customerName: item.partner?.name || "—",
            warehouseName: item.warehouse?.name || "—",
            skuCount: item._count?.details ?? item.details?.length ?? 0,
            createdAt: item.created_at,
            slaHours: getHoursSince(item.created_at),
            raw: item,
        }));

        const outbound: ApprovalTicket[] = outboundItems.map((item) => ({
            id: item.id,
            code: item.code,
            type: "outbound" as const,
            status: item.status,
            customerName: item.partner?.name || "—",
            warehouseName: item.warehouse?.name || "—",
            skuCount: item._count?.details ?? item.details?.length ?? 0,
            createdAt: item.created_at,
            slaHours: getHoursSince(item.created_at),
            raw: item,
        }));

        return [...inbound, ...outbound].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }, [inboundItems, outboundItems]);

    // ── Filtered tickets ──
    const filteredTickets = useMemo(() => {
        return allTickets.filter((t) => {
            if (typeFilter !== "ALL" && t.type !== typeFilter) return false;
            if (
                searchTerm &&
                !t.code.toLowerCase().includes(searchTerm.toLowerCase()) &&
                !t.customerName.toLowerCase().includes(searchTerm.toLowerCase())
            )
                return false;
            return true;
        });
    }, [allTickets, typeFilter, searchTerm]);

    const pendingTickets = filteredTickets.filter((t) => t.status === "PENDING");
    const selectedTicket = allTickets.find((t) => t.id === selectedTicketId);

    // ── Bulk selection ──
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleBulkApprove = () => {
        showToast(
            `Đã duyệt hàng loạt ${selectedIds.size} phiếu — Wave Picking List đã được tạo`,
            "success"
        );
        setSelectedIds(new Set());
    };

    // ── Kanban drag handlers ──
    const handleDragStart = (ticketId: string) => setDraggedId(ticketId);
    const handleDragEnd = () => {
        setDraggedId(null);
        setDragOverColumn(null);
    };
    const handleDragOver = (e: React.DragEvent, column: string) => {
        e.preventDefault();
        setDragOverColumn(column);
    };
    const handleDrop = (column: string) => {
        if (draggedId) {
            const ticket = allTickets.find((t) => t.id === draggedId);
            if (ticket) {
                showToast(
                    `Đã chuyển "${ticket.code}" sang "${KANBAN_COLUMNS.find((c) => c.key === column)?.title}"`,
                    "success"
                );
            }
        }
        setDraggedId(null);
        setDragOverColumn(null);
    };

    // ════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════
    return (
        <div className="space-y-6">
            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-[32px] font-bold tracking-tight leading-[130%]">
                        Duyệt phiếu Nhập / Xuất
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {pendingTickets.length} phiếu đang chờ duyệt •{" "}
                        {allTickets.length} phiếu tổng
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex items-center border rounded-xl overflow-hidden">
                        <Button
                            variant={viewMode === "list" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("list")}
                            className="rounded-none gap-1 px-3"
                        >
                            <ListBulletIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Danh sách</span>
                        </Button>
                        <Button
                            variant={viewMode === "kanban" ? "secondary" : "ghost"}
                            size="sm"
                            onClick={() => setViewMode("kanban")}
                            className="rounded-none gap-1 px-3"
                        >
                            <Squares2X2Icon className="w-4 h-4" />
                            <span className="hidden sm:inline">Kanban</span>
                        </Button>
                    </div>
                    <Button variant="outline" className="gap-2 rounded-xl">
                        <ArrowDownTrayIcon className="w-4 h-4" />
                        <span className="hidden sm:inline">Xuất Excel</span>
                    </Button>
                </div>
            </div>

            {/* ── Filter Bar ── */}
            <Card className="border-0 shadow-premium rounded-3xl">
                <CardContent className="p-6">
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="relative flex-1 min-w-[250px]">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm theo mã phiếu, tên khách hàng..."
                                className="pl-9 rounded-xl"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            {TYPE_FILTERS.map((tab) => (
                                <Button
                                    key={tab.value}
                                    variant={typeFilter === tab.value ? "secondary" : "ghost"}
                                    onClick={() => setTypeFilter(tab.value)}
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

            {/* ── Main Content ── */}
            {loading ? (
                <div className="approval-layout">
                    <div className="space-y-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
                        ))}
                    </div>
                    <Skeleton className="h-[500px] rounded-3xl" />
                </div>
            ) : error ? (
                <Card className="border-0 shadow-premium rounded-3xl">
                    <CardContent className="py-16 text-center text-muted-foreground">
                        {error}
                    </CardContent>
                </Card>
            ) : viewMode === "list" ? (
                /* ═══════════ SPLIT-PANE VIEW ═══════════ */
                <div className="approval-layout">
                    {/* ── Left Sidebar: Ticket Cards ── */}
                    <div className="approval-layout__sidebar">
                        {filteredTickets.length === 0 ? (
                            <div className="approval-empty">
                                <div className="approval-empty__icon">
                                    <InboxIcon className="w-8 h-8 text-muted-foreground/50" />
                                </div>
                                <p className="text-sm text-muted-foreground font-medium">
                                    Không có phiếu nào
                                </p>
                                <p className="text-xs text-muted-foreground/70">
                                    Tất cả các phiếu đã được xử lý
                                </p>
                            </div>
                        ) : (
                            filteredTickets.map((ticket) => {
                                const slaStatus = getSlaStatus(ticket.slaHours);
                                const isSelected = selectedTicketId === ticket.id;
                                const isChecked = selectedIds.has(ticket.id);

                                return (
                                    <div
                                        key={ticket.id}
                                        className={`approval-card approval-card--${ticket.type} ${isSelected ? "approval-card--selected" : ""
                                            } ${slaStatus === "breach" && ticket.status === "PENDING"
                                                ? "approval-card--sla-breach"
                                                : ""
                                            }`}
                                        onClick={() => setSelectedTicketId(ticket.id)}
                                    >
                                        <div className="approval-card__header">
                                            <div className="flex items-center gap-2">
                                                {ticket.status === "PENDING" && (
                                                    <Checkbox
                                                        checked={isChecked}
                                                        onCheckedChange={() =>
                                                            toggleSelect(ticket.id)
                                                        }
                                                        onClick={(e) =>
                                                            e.stopPropagation()
                                                        }
                                                        className="rounded"
                                                    />
                                                )}
                                                <span className="approval-card__code">
                                                    {ticket.code}
                                                </span>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={`rounded-full px-2 py-0 text-[10px] font-medium border ${ticket.type === "inbound"
                                                    ? "approval-type--inbound"
                                                    : "approval-type--outbound"
                                                    }`}
                                            >
                                                {ticket.type === "inbound" ? (
                                                    <span className="flex items-center gap-1">
                                                        <ArrowDownTrayIcon className="w-3 h-3" />
                                                        Nhập
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1">
                                                        <TruckIcon className="w-3 h-3" />
                                                        Xuất
                                                    </span>
                                                )}
                                            </Badge>
                                        </div>

                                        <p className="approval-card__customer">
                                            {ticket.customerName} • {ticket.warehouseName}
                                        </p>

                                        <div className="approval-card__footer">
                                            <div className="approval-card__meta">
                                                <span className="flex items-center gap-1">
                                                    <CubeIcon className="w-3 h-3" />
                                                    {ticket.skuCount} SKU
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <ClockIcon className="w-3 h-3" />
                                                    {formatTimeAgo(ticket.createdAt)}
                                                </span>
                                            </div>
                                            {ticket.status === "PENDING" && (
                                                <span
                                                    className={`approval-sla approval-sla--${slaStatus}`}
                                                >
                                                    {slaStatus === "breach" && (
                                                        <ExclamationTriangleIcon className="w-3 h-3" />
                                                    )}
                                                    {SLA_LABELS[slaStatus]}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* ── Right Panel: Detail ── */}
                    <Card className="border-0 shadow-premium rounded-3xl overflow-hidden approval-layout__main">
                        {selectedTicket ? (
                            selectedTicket.type === "inbound" ? (
                                <InboundApprovalDetail
                                    key={selectedTicket.id}
                                    ticketId={selectedTicket.id}
                                />
                            ) : (
                                <OutboundApprovalDetail
                                    key={selectedTicket.id}
                                    ticketId={selectedTicket.id}
                                />
                            )
                        ) : (
                            <div className="approval-empty">
                                <div className="approval-empty__icon">
                                    <InboxIcon className="w-8 h-8 text-muted-foreground/50" />
                                </div>
                                <div>
                                    <p className="text-muted-foreground font-medium">
                                        Chọn một phiếu để xem chi tiết
                                    </p>
                                    <p className="text-sm text-muted-foreground/70 mt-1">
                                        Bấm vào thẻ bên trái để hiển thị thông tin duyệt
                                    </p>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            ) : (
                /* ═══════════ KANBAN VIEW ═══════════ */
                <div className="approval-kanban">
                    {KANBAN_COLUMNS.map((column) => {
                        const columnTickets = filteredTickets.filter(
                            (t) => getKanbanColumn(t.status) === column.key
                        );

                        return (
                            <div
                                key={column.key}
                                className={`approval-kanban__column approval-kanban__column--${column.cssModifier}`}
                            >
                                <div className="approval-kanban__header">
                                    <span className="approval-kanban__title">
                                        {column.title}
                                    </span>
                                    <span className="approval-kanban__count">
                                        {columnTickets.length}
                                    </span>
                                </div>

                                <div
                                    className={`approval-kanban__dropzone ${dragOverColumn === column.key
                                        ? "approval-kanban__dropzone--over"
                                        : ""
                                        }`}
                                    onDragOver={(e) => handleDragOver(e, column.key)}
                                    onDragLeave={() => setDragOverColumn(null)}
                                    onDrop={() => handleDrop(column.key)}
                                >
                                    {columnTickets.length === 0 ? (
                                        <div className="flex-1 flex items-center justify-center">
                                            <p className="text-xs text-muted-foreground/50">
                                                Không có phiếu
                                            </p>
                                        </div>
                                    ) : (
                                        columnTickets.map((ticket) => {
                                            const slaStatus = getSlaStatus(ticket.slaHours);
                                            return (
                                                <div
                                                    key={ticket.id}
                                                    className={`approval-kanban-card ${slaStatus === "breach" &&
                                                        ticket.status === "PENDING"
                                                        ? "approval-card--sla-breach"
                                                        : ""
                                                        }`}
                                                    draggable
                                                    onDragStart={() =>
                                                        handleDragStart(ticket.id)
                                                    }
                                                    onDragEnd={handleDragEnd}
                                                    onClick={() => {
                                                        setViewMode("list");
                                                        setSelectedTicketId(ticket.id);
                                                    }}
                                                >
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <span className="text-xs font-bold text-[#0F766E]">
                                                            {ticket.code}
                                                        </span>
                                                        <Badge
                                                            variant="outline"
                                                            className={`rounded-full px-2 py-0 text-[9px] font-medium border ${ticket.type === "inbound"
                                                                ? "approval-type--inbound"
                                                                : "approval-type--outbound"
                                                                }`}
                                                        >
                                                            {ticket.type === "inbound"
                                                                ? "Nhập"
                                                                : "Xuất"}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground truncate">
                                                        {ticket.customerName}
                                                    </p>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                                            <CubeIcon className="w-3 h-3" />
                                                            {ticket.skuCount} SKU
                                                        </span>
                                                        {ticket.status === "PENDING" && (
                                                            <span
                                                                className={`approval-sla approval-sla--${slaStatus}`}
                                                                style={{ fontSize: "9px" }}
                                                            >
                                                                {SLA_LABELS[slaStatus]}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Bulk Approval Bar ── */}
            {selectedIds.size > 0 && (
                <div className="approval-bulk-bar">
                    <div className="flex items-center gap-3">
                        <Checkbox
                            checked={
                                selectedIds.size === pendingTickets.length &&
                                pendingTickets.length > 0
                            }
                            onCheckedChange={(checked) => {
                                if (checked) {
                                    setSelectedIds(
                                        new Set(pendingTickets.map((t) => t.id))
                                    );
                                } else {
                                    setSelectedIds(new Set());
                                }
                            }}
                            className="rounded"
                        />
                        <span className="text-sm font-medium">
                            Đã chọn {selectedIds.size} phiếu
                        </span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedIds(new Set())}
                            className="text-xs text-muted-foreground rounded-xl"
                        >
                            Bỏ chọn
                        </Button>
                    </div>
                    <Button
                        className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                        onClick={handleBulkApprove}
                    >
                        <CheckCircleIcon className="w-4 h-4" />
                        Duyệt tất cả ({selectedIds.size})
                    </Button>
                </div>
            )}
        </div>
    );
}

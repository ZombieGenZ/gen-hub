"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { PartnerService } from "@/services/partner/partner.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { useToast } from "@/contexts/ToastContext";
import type { Partner } from "@/services/partner/partner.types";
import type { InboundRequest, OutboundRequest } from "@/services/inventory/inventory.types";

// ── shadcn/ui ──
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// ── Icons ──
import {
    ArrowLeftIcon,
    PhoneIcon,
    EnvelopeIcon,
    MapPinIcon,
    BuildingOfficeIcon,
    UserGroupIcon,
    PencilSquareIcon,
    DocumentTextIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { FileText, PackageCheck, Truck, Info } from "lucide-react";

// ── Services ──
const partnerService = new PartnerService();
const inventoryService = new InventoryService();
const TX_PER_PAGE = 10;

// ════════════════════════════════════════════════
// STATUS BADGE HELPERS
// ════════════════════════════════════════════════
function ReceiptStatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; className: string }> = {
        COMPLETED: { label: "Hoàn tất", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        PROCESSING: { label: "Đang xử lý", className: "bg-amber-50 text-amber-700 border-amber-200" },
        PENDING: { label: "Chờ duyệt", className: "bg-slate-100 text-slate-600 border-slate-200" },
        CANCELLED: { label: "Đã hủy", className: "bg-red-50 text-red-600 border-red-200" },
    };
    const c = config[status] || { label: status, className: "bg-slate-100 text-slate-600 border-slate-200" };
    return <Badge className={`${c.className} rounded-full text-xs`}>{c.label}</Badge>;
}

function ExportStatusBadge({ status }: { status: string }) {
    const config: Record<string, { label: string; className: string }> = {
        SHIPPED: { label: "Đã giao", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
        PACKED: { label: "Đã đóng gói", className: "bg-blue-50 text-blue-700 border-blue-200" },
        PICKING: { label: "Đang chọn hàng", className: "bg-amber-50 text-amber-700 border-amber-200" },
        PENDING: { label: "Chờ duyệt", className: "bg-slate-100 text-slate-600 border-slate-200" },
        CANCELLED: { label: "Đã hủy", className: "bg-red-50 text-red-600 border-red-200" },
    };
    const c = config[status] || { label: status, className: "bg-slate-100 text-slate-600 border-slate-200" };
    return <Badge className={`${c.className} rounded-full text-xs`}>{c.label}</Badge>;
}

// ════════════════════════════════════════════════
// MAIN PAGE: Partner Detail (360° View)
// ════════════════════════════════════════════════
export default function PartnerDetailPage() {
    const router = useRouter();
    const params = useParams();
    const partnerId = params?.id as string;
    const { showToast } = useToast();

    // ── States ──
    const [partner, setPartner] = useState<Partner | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");

    // ── Transaction states ──
    const [inbounds, setInbounds] = useState<InboundRequest[]>([]);
    const [outbounds, setOutbounds] = useState<OutboundRequest[]>([]);
    const [txLoading, setTxLoading] = useState(false);
    const [txPage, setTxPage] = useState(1);
    const [txTotal, setTxTotal] = useState(0);
    const txTotalPages = Math.ceil(txTotal / TX_PER_PAGE);

    // ── Fetch Partner ──
    const fetchPartner = useCallback(async () => {
        if (!partnerId) return;
        try {
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }
            setLoading(true);
            const result = await partnerService.getById(token, partnerId);
            if (result?.data) {
                setPartner(result.data);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message === "Unauthorized") { router.push("/login"); return; }
            showToast("Không thể tải thông tin đối tác", "error");
        } finally {
            setLoading(false);
        }
    }, [partnerId, router, showToast]);

    useEffect(() => { fetchPartner(); }, [fetchPartner]);

    // ── Fetch Transactions ──
    const fetchTransactions = useCallback(async () => {
        if (!partner) return;
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            setTxLoading(true);
            const offset = (txPage - 1) * TX_PER_PAGE;

            if (partner.type === "SUPPLIER") {
                const result = await inventoryService.listInbound(token, {
                    keywords: partner.name,
                    limit: TX_PER_PAGE,
                    offset,
                });
                if (result?.data) {
                    // Filter by partner_id client side for accuracy
                    const items = (result.data.items || []).filter(
                        (r) => r.partner_id === partner.id || r.partner?.id === partner.id
                    );
                    setInbounds(items);
                    setTxTotal(result.data.total || 0);
                }
            } else {
                const result = await inventoryService.listOutbound(token, {
                    keywords: partner.name,
                    limit: TX_PER_PAGE,
                    offset,
                });
                if (result?.data) {
                    const items = (result.data.items || []).filter(
                        (r) => r.partner_id === partner.id || r.partner?.id === partner.id
                    );
                    setOutbounds(items);
                    setTxTotal(result.data.total || 0);
                }
            }
        } catch {
            // silent fail
        } finally {
            setTxLoading(false);
        }
    }, [partner, txPage]);

    useEffect(() => {
        if (activeTab === "transactions") {
            fetchTransactions();
        }
    }, [activeTab, fetchTransactions]);

    // ── Build full address string ──
    const fullAddress = partner
        ? [
            partner.address_detail,
            partner.ward?.name,
            partner.ward?.province?.name,
        ]
            .filter(Boolean)
            .join(", ") || "Chưa cập nhật"
        : "";

    // ══════════════════════════════
    // RENDER
    // ══════════════════════════════

    if (loading) {
        return (
            <div className="flex-1 overflow-auto bg-slate-50/50">
                <main className="pt-0 py-4 px-4 space-y-6">
                    <div className="h-8 w-48 bg-slate-100 rounded animate-pulse" />
                    <div className="h-48 bg-slate-100 rounded-3xl animate-pulse" />
                    <div className="h-64 bg-slate-100 rounded-3xl animate-pulse" />
                </main>
            </div>
        );
    }

    if (!partner) {
        return (
            <div className="flex-1 overflow-auto bg-slate-50/50">
                <main className="pt-0 py-4 px-4">
                    <div className="flex flex-col items-center justify-center py-24 text-slate-400">
                        <UserGroupIcon className="w-16 h-16 mb-4 opacity-30" />
                        <p className="text-lg font-medium">Không tìm thấy đối tác</p>
                        <Button
                            variant="outline"
                            className="mt-4 rounded-xl"
                            onClick={() => router.push("/dashboard/customer/partners")}
                        >
                            <ArrowLeftIcon className="w-4 h-4 mr-2" />
                            Quay lại danh sách
                        </Button>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-auto bg-slate-50/50">
            <main className="pt-0 py-4 px-4 space-y-6">
                {/* ── Back button ── */}
                <Button
                    variant="ghost"
                    className="rounded-xl text-slate-600 hover:text-slate-900 -ml-2"
                    onClick={() => router.push("/dashboard/customer/partners")}
                >
                    <ArrowLeftIcon className="w-4 h-4 mr-2" />
                    Quay lại danh sách
                </Button>

                {/* ═══════════════════════════════════ */}
                {/* HEADER PROFILE CARD */}
                {/* ═══════════════════════════════════ */}
                <Card className="shadow-premium rounded-3xl border-0 overflow-hidden">
                    <div className={`h-2 ${partner.type === "CUSTOMER" ? "bg-emerald-500" : "bg-blue-500"}`} />
                    <CardContent className="p-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            {/* Left: Name + badges */}
                            <div className="flex items-start gap-4">
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${partner.type === "CUSTOMER"
                                        ? "bg-emerald-100 text-emerald-600"
                                        : "bg-blue-100 text-blue-600"
                                    }`}>
                                    {partner.type === "CUSTOMER" ? (
                                        <UserGroupIcon className="w-7 h-7" />
                                    ) : (
                                        <BuildingOfficeIcon className="w-7 h-7" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h1 className="text-xl font-bold text-slate-900">
                                            {partner.name}
                                        </h1>
                                        {partner.type === "CUSTOMER" ? (
                                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full text-xs">
                                                Khách hàng
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-blue-50 text-blue-700 border-blue-200 rounded-full text-xs">
                                                Nhà cung cấp
                                            </Badge>
                                        )}
                                        {partner.is_active ? (
                                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full text-xs">
                                                Đang giao dịch
                                            </Badge>
                                        ) : (
                                            <Badge className="bg-slate-100 text-slate-500 border-slate-200 rounded-full text-xs">
                                                Ngừng giao dịch
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-500 mt-1 font-mono">
                                        Mã: {partner.code}
                                    </p>

                                    {/* Contact info - clickable */}
                                    <div className="flex flex-wrap items-center gap-4 mt-3">
                                        {partner.phone && (
                                            <a
                                                href={`tel:${partner.phone}`}
                                                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#0F766E] transition-colors"
                                            >
                                                <PhoneIcon className="w-4 h-4" />
                                                {partner.phone}
                                            </a>
                                        )}
                                        {partner.email && (
                                            <a
                                                href={`mailto:${partner.email}`}
                                                className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-[#0F766E] transition-colors"
                                            >
                                                <EnvelopeIcon className="w-4 h-4" />
                                                {partner.email}
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Right: Edit button */}
                            <Button
                                variant="outline"
                                className="rounded-xl shrink-0"
                                onClick={() => router.push(`/dashboard/customer/partners?edit=${partner.id}`)}
                            >
                                <PencilSquareIcon className="w-4 h-4 mr-2" />
                                Chỉnh sửa
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* ═══════════════════════════════════ */}
                {/* TABS CONTENT */}
                {/* ═══════════════════════════════════ */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="bg-slate-100 p-1 rounded-xl">
                        <TabsTrigger value="overview" className="rounded-lg px-4 py-2 text-sm font-medium">
                            <Info className="w-4 h-4 mr-2" />
                            Tổng quan
                        </TabsTrigger>
                        <TabsTrigger value="transactions" className="rounded-lg px-4 py-2 text-sm font-medium">
                            <FileText className="w-4 h-4 mr-2" />
                            Lịch sử giao dịch
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Tab 1: Overview ── */}
                    <TabsContent value="overview">
                        <Card className="shadow-premium rounded-3xl border-0">
                            <CardContent className="p-6 space-y-6">
                                {/* Address section */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <MapPinIcon className="w-4 h-4" />
                                        Địa chỉ
                                    </h3>
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <p className="text-sm text-slate-700">{fullAddress}</p>
                                    </div>
                                </div>

                                {/* Tax code */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <DocumentTextIcon className="w-4 h-4" />
                                        Thuế & Pháp lý
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <p className="text-xs text-slate-500 mb-1">Mã số thuế</p>
                                            <p className="text-sm font-medium text-slate-700">
                                                {partner.tax_code || "Chưa cập nhật"}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <p className="text-xs text-slate-500 mb-1">Ngày tạo</p>
                                            <p className="text-sm font-medium text-slate-700">
                                                {new Date(partner.created_at).toLocaleDateString("vi-VN", {
                                                    day: "2-digit",
                                                    month: "2-digit",
                                                    year: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Contact details */}
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                        <PhoneIcon className="w-4 h-4" />
                                        Thông tin liên hệ
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <p className="text-xs text-slate-500 mb-1">Số điện thoại</p>
                                            <p className="text-sm font-medium text-slate-700">
                                                {partner.phone ? (
                                                    <a href={`tel:${partner.phone}`} className="hover:text-[#0F766E]">
                                                        {partner.phone}
                                                    </a>
                                                ) : (
                                                    "Chưa cập nhật"
                                                )}
                                            </p>
                                        </div>
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                            <p className="text-xs text-slate-500 mb-1">Email</p>
                                            <p className="text-sm font-medium text-slate-700">
                                                {partner.email ? (
                                                    <a href={`mailto:${partner.email}`} className="hover:text-[#0F766E]">
                                                        {partner.email}
                                                    </a>
                                                ) : (
                                                    "Chưa cập nhật"
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* ── Tab 2: Transaction History ── */}
                    <TabsContent value="transactions">
                        <Card className="shadow-premium rounded-3xl border-0">
                            <CardContent className="p-0">
                                {partner.type === "SUPPLIER" ? (
                                    /* ── Supplier -> Inbound Receipts ── */
                                    <>
                                        <div className="px-6 py-4 border-b border-slate-100">
                                            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                <PackageCheck className="w-4 h-4 text-blue-500" />
                                                Phiếu Nhập từ Nhà cung cấp
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Danh sách các phiếu nhập kho liên quan đến đối tác này
                                            </p>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-slate-50/80">
                                                        <TableHead className="font-semibold text-slate-700">Mã phiếu</TableHead>
                                                        <TableHead className="font-semibold text-slate-700">Kho nhận</TableHead>
                                                        <TableHead className="font-semibold text-slate-700 text-center">Trạng thái</TableHead>
                                                        <TableHead className="font-semibold text-slate-700 text-center">Số SP</TableHead>
                                                        <TableHead className="font-semibold text-slate-700 text-center">Ngày tạo</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {txLoading ? (
                                                        Array.from({ length: 3 }).map((_, i) => (
                                                            <TableRow key={i}>
                                                                {Array.from({ length: 5 }).map((_, j) => (
                                                                    <TableCell key={j}>
                                                                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        ))
                                                    ) : inbounds.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={5}>
                                                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                                                    <PackageCheck className="w-10 h-10 mb-2 opacity-30" />
                                                                    <p className="text-sm">Chưa có phiếu nhập nào</p>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        inbounds.map((receipt) => (
                                                            <TableRow
                                                                key={receipt.id}
                                                                className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                                                                onClick={() =>
                                                                    router.push(`/dashboard/customer/inbound/${receipt.id}`)
                                                                }
                                                            >
                                                                <TableCell>
                                                                    <span className="font-mono text-sm font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                                        {receipt.code}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-sm text-slate-600">
                                                                    {receipt.warehouse?.name || "—"}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <ReceiptStatusBadge status={receipt.status} />
                                                                </TableCell>
                                                                <TableCell className="text-center text-sm text-slate-600">
                                                                    {receipt._count?.details ?? receipt.details?.length ?? 0}
                                                                </TableCell>
                                                                <TableCell className="text-center text-sm text-slate-500">
                                                                    {new Date(receipt.created_at).toLocaleDateString("vi-VN")}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </>
                                ) : (
                                    /* ── Customer -> Outbound Exports ── */
                                    <>
                                        <div className="px-6 py-4 border-b border-slate-100">
                                            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                                <Truck className="w-4 h-4 text-emerald-500" />
                                                Phiếu Xuất cho Khách hàng
                                            </h3>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                                Danh sách các phiếu xuất kho liên quan đến đối tác này
                                            </p>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-slate-50/80">
                                                        <TableHead className="font-semibold text-slate-700">Mã phiếu</TableHead>
                                                        <TableHead className="font-semibold text-slate-700">Kho xuất</TableHead>
                                                        <TableHead className="font-semibold text-slate-700 text-center">Trạng thái</TableHead>
                                                        <TableHead className="font-semibold text-slate-700 text-center">Số SP</TableHead>
                                                        <TableHead className="font-semibold text-slate-700 text-center">Ngày tạo</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {txLoading ? (
                                                        Array.from({ length: 3 }).map((_, i) => (
                                                            <TableRow key={i}>
                                                                {Array.from({ length: 5 }).map((_, j) => (
                                                                    <TableCell key={j}>
                                                                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                                                    </TableCell>
                                                                ))}
                                                            </TableRow>
                                                        ))
                                                    ) : outbounds.length === 0 ? (
                                                        <TableRow>
                                                            <TableCell colSpan={5}>
                                                                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                                                                    <Truck className="w-10 h-10 mb-2 opacity-30" />
                                                                    <p className="text-sm">Chưa có phiếu xuất nào</p>
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>
                                                    ) : (
                                                        outbounds.map((exp) => (
                                                            <TableRow
                                                                key={exp.id}
                                                                className="hover:bg-slate-50/50 cursor-pointer transition-colors"
                                                                onClick={() =>
                                                                    router.push(`/dashboard/customer/outbound/${exp.id}`)
                                                                }
                                                            >
                                                                <TableCell>
                                                                    <span className="font-mono text-sm font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                                        {exp.code}
                                                                    </span>
                                                                </TableCell>
                                                                <TableCell className="text-sm text-slate-600">
                                                                    {exp.warehouse?.name || "—"}
                                                                </TableCell>
                                                                <TableCell className="text-center">
                                                                    <ExportStatusBadge status={exp.status} />
                                                                </TableCell>
                                                                <TableCell className="text-center text-sm text-slate-600">
                                                                    {exp._count?.details ?? exp.details?.length ?? 0}
                                                                </TableCell>
                                                                <TableCell className="text-center text-sm text-slate-500">
                                                                    {new Date(exp.created_at).toLocaleDateString("vi-VN")}
                                                                </TableCell>
                                                            </TableRow>
                                                        ))
                                                    )}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </>
                                )}

                                {/* ── Transaction Pagination ── */}
                                {!txLoading && txTotalPages > 1 && (
                                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                                        <p className="text-sm text-slate-500">
                                            Trang {txPage} / {txTotalPages}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg"
                                                disabled={txPage === 1}
                                                onClick={() => setTxPage((p) => p - 1)}
                                            >
                                                <ChevronLeftIcon className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="icon"
                                                className="h-8 w-8 rounded-lg"
                                                disabled={txPage === txTotalPages}
                                                onClick={() => setTxPage((p) => p + 1)}
                                            >
                                                <ChevronRightIcon className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </main>
        </div>
    );
}

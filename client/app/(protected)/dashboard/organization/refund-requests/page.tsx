"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { refundService } from "@/services/refund/refund.service";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowPathIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";
import type { RefundRequest, RefundStatus } from "@/types/refund/refund.type";
import React from "react";
import { orgHelper } from "@/lib/organization.utils";
import { useOrganizationRealtime } from "@/hooks/useOrganizationRealtime";
import { TablePagination } from "@/components/ui/table-pagination";

const REFUND_EVENTS = [
    "refundRequest:created",
    "refundRequest:accepted",
    "refundRequest:rejected",
    "refundRequest:statusChanged",
    "refundRequest:deleted",
];

export default function CustomerRefundRequestsPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [requests, setRequests] = useState<RefundRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);
    const [orgId, setOrgId] = useState<string | null>(null);

    const formatCurrency = (val: number | string) => {
        const num = typeof val === "string" ? parseFloat(val) : val;
        if (!num && num !== 0) return "0 ₫";
        return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
    };

    const formatDate = (str: string) => {
        if (!str) return "—";
        try { return format(new Date(str), "dd/MM/yyyy HH:mm"); } catch { return str; }
    };

    const fetchRequests = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }
            setLoading(true);

            // Fetch list
            const res = await refundService.listMyRequests(token);

            // Depending on ApiResponse format
            const data = (res as any).data ?? res;

            if (data && data.items) {
                setRequests(data.items);
                setTotal(data.total || 0);
            } else if (Array.isArray(data)) {
                setRequests(data);
                setTotal(data.length);
            } else {
                setRequests([]);
                setTotal(0);
            }
        } catch (error) {
            console.error("Failed to fetch refund requests", error);
            showToast("Không thể tải danh sách hoàn tiền", "error");
        } finally {
            setLoading(false);
        }
    }, [router, showToast]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    useEffect(() => {
        const initOrg = async () => {
            if (orgId) return;
            const token = authStorage.getAccessToken();
            if (!token) return;
            try {
                const resolvedOrgId = await orgHelper.getOrgId(token);
                setOrgId(resolvedOrgId);
            } catch {
                // Keep normal list flow if org id resolve fails.
            }
        };

        void initOrg();
    }, [orgId]);

    useOrganizationRealtime({
        orgId,
        events: REFUND_EVENTS,
        enabled: !!orgId,
        onEvent: (eventName) => {
            void fetchRequests();

            const messageMap: Record<string, string> = {
                "refundRequest:created": "Yêu cầu hoàn tiền mới đã được tạo",
                "refundRequest:accepted": "Yêu cầu hoàn tiền đã được duyệt",
                "refundRequest:rejected": "Yêu cầu hoàn tiền đã bị từ chối",
                "refundRequest:statusChanged": "Trạng thái yêu cầu hoàn tiền đã thay đổi",
                "refundRequest:deleted": "Yêu cầu hoàn tiền đã bị xóa",
            };

            const message = messageMap[eventName];
            if (message) {
                showToast(message, "success");
            }
        },
    });

    const getStatusBadge = (status: RefundStatus | string) => {
        switch (status) {
            case "PENDING": return <Badge variant="outline" className="text-yellow-600 border-yellow-300 bg-yellow-50">Chờ xử lý</Badge>;
            case "ACCEPTED":
            case "APPROVED": return <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Đã duyệt</Badge>;
            case "REJECTED": return <Badge variant="outline" className="text-red-600 border-red-300 bg-red-50">Từ chối</Badge>;
            case "PROCESSING": return <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50">Đang xử lý</Badge>;
            case "COMPLETED": return <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50">Hoàn thành</Badge>;
            case "CANCELLED": return <Badge variant="outline" className="text-gray-600 border-gray-300 bg-gray-50">Đã hủy</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Yêu cầu hoàn tiền</h1>
                <p className="text-muted-foreground">Theo dõi tình trạng các yêu cầu hoàn tiền / thanh lý hợp đồng của tổ chức.</p>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 flex justify-center">
                        <ArrowPathIcon className="w-8 h-8 animate-spin text-brand" />
                    </div>
                ) : requests.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <DocumentTextIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">Chưa có yêu cầu nào</h3>
                        <p className="text-muted-foreground text-sm">Khi bạn yêu cầu thanh lý hoặc hoàn tiền, danh sách sẽ xuất hiện tại đây.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Ngày tạo</TableHead>
                                <TableHead>Lý do</TableHead>
                                <TableHead className="text-right">Tiền gốc</TableHead>
                                <TableHead className="text-right">Phí phạt</TableHead>
                                <TableHead className="text-right">Thực nhận</TableHead>
                                <TableHead className="text-center">Trạng thái</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.map((req, index) => (
                                <TableRow key={req.id} className="hover:bg-muted/40 transition-colors">
                                    <TableCell className="text-muted-foreground font-medium">
                                        {(page - 1) * limit + index + 1}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatDate(req.created_at)}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium line-clamp-1">{req.reason}</span>
                                            {req.process_notes && (
                                                <span className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                                    Ghi chú: {req.process_notes}
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right text-sm">
                                        {formatCurrency(req.original_amount)}
                                    </TableCell>
                                    <TableCell className="text-right text-sm text-destructive">
                                        {req.fee_amount > 0 ? `- ${formatCurrency(req.fee_amount)}` : "—"}
                                        {req.fee_percent > 0 && <span className="text-xs ml-1 opacity-70">({req.fee_percent}%)</span>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <span className="font-bold text-brand text-sm">{formatCurrency(req.final_refund_amount)}</span>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        {getStatusBadge(req.status)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Pagination */}
            {total > limit && (
                <div className="border-t pt-4">
                    <TablePagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={total}
                        itemsPerPage={limit}
                        onPageChange={setPage}
                    />
                </div>
            )}
        </div>
    );
}

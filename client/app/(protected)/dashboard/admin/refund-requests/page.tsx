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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowPathIcon, DocumentTextIcon, ChevronLeftIcon, ChevronRightIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { format, differenceInHours } from "date-fns";
import { useToast } from "@/contexts/ToastContext";
import { ReconciliationDrawer } from "@/components/contract/ReconciliationDrawer";
import type { RefundRequest, RefundStatus } from "@/types/refund/refund.type";
import React from "react";

const STATUS_TABS: { value: string; label: string }[] = [
    { value: "all", label: "Tất cả" },
    { value: "PENDING", label: "Chờ xử lý" },
    { value: "APPROVED", label: "Đã duyệt" },
    { value: "REJECTED", label: "Từ chối" },
];

export default function AdminRefundRequestsPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [requests, setRequests] = useState<RefundRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);
    const [activeTab, setActiveTab] = useState("PENDING"); // Default to pending

    // Drawer state
    const [selectedRequest, setSelectedRequest] = useState<RefundRequest | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const formatCurrency = (val: number | string) => {
        const num = typeof val === "string" ? parseFloat(val) : val;
        if (!num && num !== 0) return "0 ₫";
        return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
    };

    const formatDate = (str: string) => {
        if (!str) return "—";
        try { return format(new Date(str), "dd/MM/yyyy HH:mm"); } catch { return str; }
    };

    const isOver48Hours = (createdAt: string) => {
        try {
            const hours = differenceInHours(new Date(), new Date(createdAt));
            return hours >= 48;
        } catch {
            return false;
        }
    };

    const fetchRequests = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }
            setLoading(true);

            const params = {
                page, // Backend support for page? Wait, refund.service says limit/offset
                limit,
                offset: (page - 1) * limit,
                status: activeTab !== "all" ? activeTab : undefined,
            };

            const res = await refundService.adminListRequests(token, params);
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
    }, [page, limit, activeTab, router, showToast]);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    const getStatusBadge = (status: RefundStatus | string) => {
        switch(status) {
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
                <h1 className="text-2xl font-bold tracking-tight">Hàng đợi Hoàn tiền (Refund Queue)</h1>
                <p className="text-muted-foreground">Phê duyệt, đối soát phí và xử lý thanh lý hợp đồng cho các tổ chức.</p>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 mb-4">
                    <TabsList className="bg-card border h-auto p-1 inline-flex flex-nowrap min-w-max">
                        {STATUS_TABS.map((tab) => (
                            <TabsTrigger
                                key={tab.value}
                                value={tab.value}
                                className="text-xs px-3 py-1.5 whitespace-nowrap data-[state=active]:bg-brand data-[state=active]:text-white"
                            >
                                {tab.label}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                </div>
            </Tabs>

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
                        <h3 className="font-semibold text-lg mb-1">Hàng đợi trống</h3>
                        <p className="text-muted-foreground text-sm">Không có yêu cầu nào cần xử lý lúc này.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>Tổ chức</TableHead>
                                <TableHead>Ngày gửi</TableHead>
                                <TableHead className="text-right">Tiền gốc</TableHead>
                                <TableHead className="text-right">Dự toán Thực nhận</TableHead>
                                <TableHead className="text-center">Trạng thái</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.map((req, index) => {
                                const overdue = req.status === "PENDING" && isOver48Hours(req.created_at);
                                return (
                                    <TableRow key={req.id} className="hover:bg-muted/40 transition-colors">
                                        <TableCell className="text-muted-foreground font-medium">
                                            {(page - 1) * limit + index + 1}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium text-sm">{req.organization_id.substring(0,8)}...</span>
                                                <span className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]" title={req.reason}>
                                                    {req.reason}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className={`text-sm ${overdue ? "text-destructive font-semibold" : ""}`}>
                                                    {formatDate(req.created_at)}
                                                </span>
                                                {overdue && (
                                                    <span className="text-xs text-destructive flex items-center gap-1 mt-0.5">
                                                        <ExclamationTriangleIcon className="w-3 h-3" />
                                                        Quá 48h
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right text-sm">
                                            {formatCurrency(req.original_amount)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <span className="font-bold text-brand text-sm">{formatCurrency(req.final_refund_amount)}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {getStatusBadge(req.status)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button 
                                                variant={req.status === "PENDING" ? "default" : "outline"} 
                                                size="sm"
                                                className={req.status === "PENDING" ? "bg-brand hover:bg-brand-hover" : ""}
                                                onClick={() => {
                                                    setSelectedRequest(req);
                                                    setIsDrawerOpen(true);
                                                }}
                                            >
                                                {req.status === "PENDING" ? "Xử lý" : "Chi tiết"}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Pagination */}
            {total > limit && (
                <div className="flex items-center justify-between border-t pt-4">
                    <div className="text-sm text-muted-foreground">
                        Hiển thị {requests.length > 0 ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} / {total}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading}>
                            <ChevronLeftIcon className="h-4 w-4" />
                            Trước
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: totalPages }, (_, i) => i + 1)
                                .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                                .map((p, i, arr) => (
                                    <React.Fragment key={p}>
                                        {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2">...</span>}
                                        <Button
                                            variant={page === p ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setPage(p)}
                                            className={page === p ? "bg-brand hover:bg-brand-hover" : ""}
                                        >
                                            {p}
                                        </Button>
                                    </React.Fragment>
                                ))}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages || loading}>
                            Tiếp
                            <ChevronRightIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}

            <ReconciliationDrawer 
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                request={selectedRequest}
                onSuccess={() => {
                    fetchRequests();
                }}
            />
        </div>
    );
}

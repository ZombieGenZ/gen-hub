"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { rentalContractService } from "@/services/rental-contract/rental-contract.service";
import { orgHelper } from "@/lib/organization.utils";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DocumentCheckIcon,
    ArrowPathIcon,
    MagnifyingGlassIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowDownTrayIcon,
    EyeIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";
import { ContractStatusBadge } from "@/components/contract/ContractStatusBadge";
import type { ContractStatus } from "@/types/rental-contracts/rental-contracts.type";
import React from "react";

interface Contract {
    id: string;
    code: string;
    name: string;
    status: ContractStatus;
    started_at: string;
    expired_at?: string;
    total_price: number;
    final_price: number;
    warehouses?: { id: string; name: string }[];
    organization?: {
        id: string;
        name: string;
    };
}

const STATUS_TABS: { value: string; label: string }[] = [
    { value: "all", label: "Tất cả" },
    { value: "PENDING", label: "Chờ xử lý" },
    { value: "ACTIVE", label: "Đang hiệu lực" },
    { value: "OVERDUE_LEVEL_1", label: "Quá hạn" },
    { value: "COMPLETED", label: "Hoàn thành" },
    { value: "CANCELLED", label: "Đã hủy" },
];

export default function ContractManagementPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("all");

    const formatCurrency = (val: number | string) => {
        const num = typeof val === "string" ? parseFloat(val) : val;
        if (!num && num !== 0) return "0 ₫";
        return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
    };

    const formatDate = (str: string) => {
        if (!str) return "—";
        try { return format(new Date(str), "dd/MM/yyyy"); } catch { return str; }
    };

    const fetchContracts = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }
            setLoading(true);

            // Get current user's organization_id
            const currentOrgId = await orgHelper.getOrgId(token);

            const params = {
                page,
                limit,
                keywords: searchTerm || undefined,
                status: activeTab !== "all" ? activeTab : undefined,
            };

            const data = await rentalContractService.getOrgRentalContracts(token, currentOrgId, params);
            
            if(!data) {
                showToast("Không thể tải hợp đồng", "error");
                setContracts([]);
                setTotal(0);
                return;
            }

            showToast("Hợp đồng đã được tải", "success");

            let items: Contract[] = [];
            let totalItems = 0;

            if (data && data.items) {
                items = data.items;
                totalItems = data.total || 0;
            } else if (Array.isArray(data)) {
                items = data;
                totalItems = data.length;
            }

            setContracts(items);
            setTotal(totalItems);
        } catch (error) {
            console.error("Failed to fetch contracts", error);
        } finally {
            setLoading(false);
        }
    }, [page, limit, searchTerm, activeTab, showToast, router]);

    useEffect(() => {
        const timer = setTimeout(() => { fetchContracts(); }, 400);
        return () => clearTimeout(timer);
    }, [fetchContracts]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Hợp đồng thuê kho</h1>
                <p className="text-muted-foreground">Quản lý các hợp đồng đang hoạt động và lịch sử thuê kho.</p>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setPage(1); }}>
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
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

            {/* Search */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="relative max-w-md">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm theo mã hợp đồng, tên kho..."
                        className="pl-9 bg-muted/20 border-border"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 flex justify-center">
                        <ArrowPathIcon className="w-8 h-8 animate-spin text-brand" />
                    </div>
                ) : contracts.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <DocumentCheckIcon className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">Chưa có hợp đồng nào</h3>
                        <p className="text-muted-foreground text-sm">Các hợp đồng đã được duyệt sẽ xuất hiện tại đây.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead className="w-12.5">#</TableHead>
                                <TableHead>Mã hợp đồng</TableHead>
                                <TableHead>Kho</TableHead>
                                <TableHead>Thời hạn</TableHead>
                                <TableHead>Giá trị</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="text-right">Hành động</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contracts.map((contract, index) => (
                                <TableRow
                                    key={contract.id}
                                    className="hover:bg-muted/40 cursor-pointer transition-colors"
                                    onClick={() => router.push(`/dashboard/organization/contracts/${contract.id}`)}
                                >
                                    <TableCell className="text-muted-foreground font-medium">
                                        {(page - 1) * limit + index + 1}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col">
                                            <span className="font-semibold font-mono text-sm">{contract.code}</span>
                                            <span className="text-xs text-muted-foreground truncate max-w-40">{contract.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {contract.warehouses?.map((w) => w.name).join(", ") || "—"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-xs">
                                            <span>{formatDate(contract.started_at)}</span>
                                            <span className="text-muted-foreground">→ {formatDate(contract.expired_at || "")}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-bold text-brand text-sm">{formatCurrency(contract.final_price)}</span>
                                    </TableCell>
                                    <TableCell>
                                        <ContractStatusBadge status={contract.status} showDot size="sm" />
                                    </TableCell>
                                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="gap-1"
                                                onClick={() => router.push(`/dashboard/organization/contracts/${contract.id}`)}
                                            >
                                                <EyeIcon className="w-3.5 h-3.5" />
                                                Chi tiết
                                            </Button>
                                            <Button variant="ghost" size="sm" className="gap-1">
                                                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                                                Tải về
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Pagination */}
            {total > limit && (
                <div className="flex items-center justify-between border-t pt-4">
                    <div className="text-sm text-muted-foreground">
                        Hiển thị {contracts.length > 0 ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} / {total}
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
        </div>
    );
}

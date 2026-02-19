"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
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
    PlusIcon,
    MagnifyingGlassIcon,
    DocumentTextIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowPathIcon,
    EllipsisHorizontalIcon,
    ArrowDownTrayIcon,
    EyeIcon,
    NoSymbolIcon,
    XMarkIcon,
    FunnelIcon,
    ChevronDownIcon,
} from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { RentalContractService } from "@/services/rental-contract/rental-contract.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useRouter } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { Organization } from "@/types/organization/organization.type";
import { CreateContractModal } from "@/components/dashboard/CreateContractModal";
import { OrganizationService } from "@/services/organization/organization.service";
import { ContractStatusBadge } from "@/components/contract/ContractStatusBadge";
import type { ContractStatus } from "@/types/rental-contracts/rental-contracts.type";
import React from "react";

const rentalContractService = new RentalContractService();
const organizationService = new OrganizationService();

interface Contract {
    id: string;
    code: string;
    name: string;
    status: ContractStatus;
    started_at: string;
    expired_at: string;
    total_price: number;
    final_price: number;
    auto_renew?: boolean;
    organization?: {
        id: string;
        name: string;
        logo_url?: string;
    };
    warehouses?: { id: string; name: string }[];
}

// Main tabs (primary views)
const MAIN_TABS: { value: string; label: string }[] = [
    { value: "all", label: "Tất cả" },
    { value: "PENDING", label: "Chờ xử lý" },
    { value: "ACTIVE", label: "Hiệu lực" },
];

// Extra statuses (tucked into dropdown filter)
const EXTRA_STATUSES: { value: string; label: string }[] = [
    { value: "OVERDUE_LEVEL_1", label: "Quá hạn L1" },
    { value: "OVERDUE_LEVEL_2", label: "Quá hạn L2" },
    { value: "OVERDUE_LEVEL_3", label: "Quá hạn L3" },
    { value: "SEALED", label: "Niêm phong" },
    { value: "LIQUIDATED", label: "Thanh lý" },
    { value: "CANCELLED", label: "Đã hủy" },
    { value: "COMPLETED", label: "Hoàn thành" },
];

const ContractsPage = () => {
    const router = useRouter();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);

    // Modal
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [activeTab, setActiveTab] = useState("all");
    const [extraFilter, setExtraFilter] = useState<string | null>(null);

    // Bulk selection
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const formatCurrency = (amount: number | string) => {
        if (!amount) return "0 ₫";
        const num = typeof amount === "string" ? parseFloat(amount) : amount;
        return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "-";
        try {
            return format(new Date(dateString), "dd/MM/yyyy");
        } catch {
            return dateString;
        }
    };

    // ---------- Selection helpers ----------
    const allSelected = contracts.length > 0 && contracts.every((c) => selectedIds.has(c.id));
    const someSelected = selectedIds.size > 0;

    const toggleAll = () => {
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(contracts.map((c) => c.id)));
        }
    };

    const toggleOne = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    // Clear selection on tab/page/filter change
    useEffect(() => {
        setSelectedIds(new Set());
    }, [activeTab, extraFilter, page]);

    // ---------- Fetch ----------
    const fetchContracts = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }

            setIsLoading(true);
            setError(null);

            // Fetch organizations if needed
            if (organizations.length === 0) {
                try {
                    const response: any = await organizationService.getOrganizations(token, { limit: 100, is_active: true });
                    let orgs: Organization[] = [];
                    if (Array.isArray(response)) orgs = response;
                    else if (response?.data && Array.isArray(response.data)) orgs = response.data;
                    else if (response?.items && Array.isArray(response.items)) orgs = response.items;
                    else if (response?.data?.items && Array.isArray(response.data.items)) orgs = response.data.items;
                    if (orgs.length > 0) setOrganizations(orgs);
                } catch (err) {
                    console.error("Failed to fetch organizations", err);
                }
            }

            const params = {
                page,
                limit,
                keywords: searchTerm || undefined,
                status: extraFilter || (activeTab !== "all" ? activeTab : undefined),
            };

            const data: any = await rentalContractService.getRentalContracts(token, params);
            if (data) {
                if (Array.isArray(data)) {
                    setContracts(data);
                    setTotal(data.length);
                } else if (data.items) {
                    setContracts(data.items);
                    setTotal(data.total || 0);
                }
            } else {
                setContracts([]);
                setTotal(0);
            }
        } catch (err: any) {
            console.error(err);
            if (err.message === "Unauthorized") {
                router.push("/login");
                return;
            }
            setError("Không thể tải danh sách hợp đồng");
        } finally {
            setIsLoading(false);
        }
    }, [page, searchTerm, activeTab, extraFilter, limit, organizations.length, router]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchContracts();
        }, 400);
        return () => clearTimeout(timer);
    }, [fetchContracts]);

    // ---------- Bulk cancel ----------
    const handleBulkCancel = async () => {
        if (selectedIds.size === 0) return;
        const confirmed = window.confirm(`Bạn có chắc muốn hủy ${selectedIds.size} hợp đồng đã chọn?`);
        if (!confirmed) return;

        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await rentalContractService.cancelManyRentalContracts(token, {
                items: Array.from(selectedIds).map((id) => ({
                    id,
                    cancel_type: "ADMIN_REQUEST" as const,
                    cancel_reason: "Hủy hàng loạt bởi admin",
                })),
            });
            setSelectedIds(new Set());
            fetchContracts();
        } catch (err) {
            console.error("Bulk cancel error", err);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <div className="flex flex-col flex-1 h-full bg-muted/40">
            <main className="flex-1 p-4 md:p-8 w-full space-y-6">
                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                            <DocumentTextIcon className="w-8 h-8 text-brand bg-brand-subtle p-1.5 rounded-lg" />
                            Quản lý Hợp đồng
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">
                            Quản lý danh sách các hợp đồng thuê kho trong hệ thống.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="bg-card shadow-sm">
                            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                            Xuất báo cáo
                        </Button>
                        <Button className="gap-2" style={{ borderRadius: "12px" }} onClick={() => setIsCreateModalOpen(true)}>
                            <PlusIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Tạo hợp đồng</span>
                            <span className="sm:hidden">Tạo</span>
                        </Button>
                    </div>
                </div>

                {/* ─── Unified Toolbar ─── */}
                <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                    {/* Row: Underline Tabs + Filter Dropdown + Search */}
                    <div className="flex items-stretch border-b border-border">
                        {/* Underline Tabs */}
                        <div className="flex items-center">
                            {MAIN_TABS.map((tab) => (
                                <button
                                    key={tab.value}
                                    onClick={() => { setActiveTab(tab.value); setExtraFilter(null); setPage(1); }}
                                    className={cn(
                                        "px-4 py-3 text-sm whitespace-nowrap transition-colors -mb-px border-b-2",
                                        activeTab === tab.value && !extraFilter
                                            ? "border-primary text-primary font-semibold"
                                            : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="self-center w-px h-5 bg-border mx-1 shrink-0" />

                        {/* Extra status filter */}
                        <div className="flex items-center px-1">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className={cn(
                                            "h-8 gap-1.5 text-xs",
                                            extraFilter
                                                ? "text-primary font-semibold bg-primary/10"
                                                : "text-muted-foreground font-medium"
                                        )}
                                    >
                                        <FunnelIcon className="w-3.5 h-3.5 shrink-0" />
                                        <span className="hidden sm:inline">
                                            {extraFilter
                                                ? EXTRA_STATUSES.find((s) => s.value === extraFilter)?.label
                                                : "Trạng thái khác"}
                                        </span>
                                        <ChevronDownIcon className="w-3 h-3 shrink-0 opacity-60" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="w-52">
                                    <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                                        Lọc trạng thái nâng cao
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {EXTRA_STATUSES.map((s) => (
                                        <DropdownMenuCheckboxItem
                                            key={s.value}
                                            checked={extraFilter === s.value}
                                            onCheckedChange={(checked) => {
                                                setExtraFilter(checked ? s.value : null);
                                                setPage(1);
                                            }}
                                        >
                                            {s.label}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                    {extraFilter && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                className="text-xs text-muted-foreground gap-1.5"
                                                onClick={() => setExtraFilter(null)}
                                            >
                                                <XMarkIcon className="w-3.5 h-3.5" />
                                                Xóa bộ lọc
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Search */}
                        <div className="flex items-center px-3 py-2 border-l border-border">
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                                <Input
                                    placeholder="Tìm mã HĐ, tên tổ chức..."
                                    className="pl-8 h-9 w-56 text-sm border-slate-200 rounded-md bg-transparent focus-visible:ring-1 focus-visible:ring-primary/30"
                                    value={searchTerm}
                                    onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bulk action bar */}
                    {someSelected && (
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-brand-subtle/40 border-b border-brand/20 animate-in slide-in-from-top-1 duration-150">
                            <span className="text-sm font-medium text-brand-subtle-foreground">
                                {selectedIds.size} hợp đồng đã chọn
                            </span>
                            <Button variant="destructive" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleBulkCancel}>
                                <NoSymbolIcon className="w-3.5 h-3.5" />
                                Hủy hàng loạt
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 ml-auto text-muted-foreground hover:text-foreground"
                                onClick={() => setSelectedIds(new Set())}
                            >
                                <XMarkIcon className="w-3.5 h-3.5" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-[44px]">
                                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Chọn tất cả" />
                                </TableHead>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Mã HĐ</TableHead>
                                <TableHead>Tổ chức</TableHead>
                                <TableHead>Thời hạn</TableHead>
                                <TableHead>Giá trị</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <ArrowPathIcon className="h-6 w-6 animate-spin text-primary" />
                                            <span className="text-muted-foreground">Đang tải dữ liệu...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : contracts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <DocumentTextIcon className="h-8 w-8 mb-2 opacity-50" />
                                            <p>Không tìm thấy hợp đồng nào</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                contracts.map((contract, index) => {
                                    const isSelected = selectedIds.has(contract.id);
                                    return (
                                        <TableRow
                                            key={contract.id}
                                            className={cn(
                                                "group hover:bg-muted/50 transition-colors cursor-pointer",
                                                isSelected && "bg-brand-subtle/30"
                                            )}
                                            onClick={() => router.push(`/dashboard/admin/contracts/${contract.id}`)}
                                        >
                                            <TableCell onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleOne(contract.id)}
                                                    aria-label={`Chọn ${contract.code}`}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium text-muted-foreground">
                                                {(page - 1) * limit + index + 1}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground">{contract.code}</span>
                                                    <span className="text-xs text-muted-foreground truncate max-w-[160px]">{contract.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                                                        {contract.organization?.name?.charAt(0) || "O"}
                                                    </div>
                                                    <span className="text-sm truncate max-w-[140px]">
                                                        {contract.organization?.name || "—"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-xs">
                                                    <span>{formatDate(contract.started_at)}</span>
                                                    <span className="text-muted-foreground">→ {formatDate(contract.expired_at)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-brand text-sm">{formatCurrency(contract.final_price)}</span>
                                                    {Number(contract.final_price) !== Number(contract.total_price) && (
                                                        <span className="text-xs text-muted-foreground line-through">
                                                            {formatCurrency(contract.total_price)}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <ContractStatusBadge status={contract.status} showDot size="sm" />
                                            </TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <EllipsisHorizontalIcon className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => router.push(`/dashboard/admin/contracts/${contract.id}`)}>
                                                            <EyeIcon className="w-4 h-4 mr-2" />
                                                            Xem chi tiết
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-red-600">
                                                            <NoSymbolIcon className="w-4 h-4 mr-2" />
                                                            Hủy hợp đồng
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t pt-4">
                    <div className="text-sm text-muted-foreground">
                        Hiển thị {contracts.length > 0 ? (page - 1) * limit + 1 : 0}–{Math.min(page * limit, total)} / {total}
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || isLoading}>
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
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages || isLoading}
                        >
                            Tiếp
                            <ChevronRightIcon className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <CreateContractModal
                    open={isCreateModalOpen}
                    onOpenChange={setIsCreateModalOpen}
                    onSuccess={fetchContracts}
                    organizations={organizations}
                />
            </main>
        </div>
    );
};

export default ContractsPage;

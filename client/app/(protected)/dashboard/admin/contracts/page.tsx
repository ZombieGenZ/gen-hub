"use client";

import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { RentalContractService } from "@/services/rental-contract/rental-contract.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useRouter } from "next/navigation";
import { Organization } from "@/types/organization/organization.type";
import { CreateContractModal } from "@/components/dashboard/CreateContractModal";
import { OrganizationService } from "@/services/organization/organization.service";
import type { ContractStatus } from "@/types/rental-contracts/rental-contracts.type";
import React from "react";
import { toast } from "sonner";

// Components
import { ContractHeader } from "@/components/dashboard/admin/contracts/ContractHeader";
import { ContractFilterBar } from "@/components/dashboard/admin/contracts/ContractFilterBar";
import { ContractTable } from "@/components/dashboard/admin/contracts/ContractTable";
import { ContractFloatingActionBar } from "@/components/dashboard/admin/contracts/ContractFloatingActionBar";

const rentalContractService = new RentalContractService();
const organizationService = new OrganizationService();
const CONTRACTS_BASE_PATH = "/dashboard/admin/contracts";

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

    const openContractDetail = useCallback((contractId: string) => {
        router.push(`${CONTRACTS_BASE_PATH}/${contractId}`);
    }, [router]);

    const handleMainTabChange = (tabValue: string) => {
        setActiveTab(tabValue);
        setExtraFilter(null);
        setPage(1);
    };

    const handleExtraFilterChange = (status: string) => {
        setExtraFilter((prev) => (prev === status ? null : status));
        setPage(1);
    };

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
                    toast.error("Không thể tải danh sách tổ chức");
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
                } else if (data.data?.items) {
                    setContracts(data.data.items);
                    setTotal(data.data.total || data.data.items.length);
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
            toast.error(err.message || "Không thể tải danh sách hợp đồng");
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
            toast.success(`Đã hủy ${selectedIds.size} hợp đồng thành công ✅`);
            fetchContracts();
        } catch (err: any) {
            console.error("Bulk cancel error", err);
            toast.error(err.message || "Hủy hàng loạt thất bại");
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return (
        <div className="flex flex-col flex-1 h-full bg-muted/40">
            <main className="flex-1 p-4 md:p-8 w-full space-y-6">
                <ContractHeader setIsCreateModalOpen={setIsCreateModalOpen} />

                <ContractFilterBar
                    mainTabs={MAIN_TABS}
                    activeTab={activeTab}
                    handleMainTabChange={handleMainTabChange}
                    extraStatuses={EXTRA_STATUSES}
                    extraFilter={extraFilter}
                    handleExtraFilterChange={handleExtraFilterChange}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    setPage={setPage}
                    setExtraFilter={setExtraFilter}
                />

                <ContractTable
                    isLoading={isLoading}
                    contracts={contracts}
                    page={page}
                    limit={limit}
                    total={total}
                    allSelected={allSelected}
                    toggleAll={toggleAll}
                    selectedIds={selectedIds}
                    toggleOne={toggleOne}
                    openContractDetail={openContractDetail}
                    formatDate={formatDate}
                    formatCurrency={formatCurrency}
                    setPage={setPage}
                    totalPages={totalPages}
                />

                <ContractFloatingActionBar
                    someSelected={someSelected}
                    selectedIdsCount={selectedIds.size}
                    handleBulkCancel={handleBulkCancel}
                    clearSelection={() => setSelectedIds(new Set())}
                />

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

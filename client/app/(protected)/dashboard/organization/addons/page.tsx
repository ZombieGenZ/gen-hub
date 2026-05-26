"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { rentalContractService } from "@/services/rental-contract/rental-contract.service";
import { orgHelper } from "@/lib/organization.utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Building2,
    Package,
    ChevronRight,
    AlertCircle,
    CheckCircle2,
    Clock,
    X,
} from "lucide-react";
import { ManageAddonsModal } from "@/components/contract/ManageAddonsModal";
import { useToast } from "@/contexts/ToastContext";

/* ─── Types ─── */

interface AmenityItem {
    id: string;
    name: string;
    description?: string;
    icon?: string;
}

interface ContractAddon {
    id: string;
    addon_id: string;
    addon: { id: string; name: string; price: number; is_monthly_payment?: boolean; description?: string };
    price_at_purchase: number;
    is_gift: boolean;
    is_cancelled: boolean;
    created_at: string;
}

interface WarehouseDetail {
    id: string;
    warehouse_template?: {
        id: string;
        name: string;
        address_detail?: string;
        amenities?: { amenity: AmenityItem }[];
    } | null;
    warehouse?: { id: string; name: string } | null;
}

interface ContractFull {
    id: string;
    code: string;
    name: string;
    status: string;
    details: WarehouseDetail[];
    addons: ContractAddon[];
    /** Amenity IDs selected for this contract */
    amenityIds: string[];
    /** Actual amenity objects from warehouse template */
    amenities: AmenityItem[];
}

/* ─── Helpers ─── */

const formatCurrency = (val: number) =>
    new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

function canCancelAddon(createdAt: string): boolean {
    return new Date().getTime() - new Date(createdAt).getTime() <= TWO_DAYS_MS;
}

function getRemainingCancelTime(createdAt: string): string {
    const diff = TWO_DAYS_MS - (new Date().getTime() - new Date(createdAt).getTime());
    if (diff <= 0) return "";
    const hours = Math.floor(diff / (60 * 60 * 1000));
    if (hours >= 24) return `Còn ${Math.floor(hours / 24)} ngày ${hours % 24}h để hủy`;
    return `Còn ${hours}h để hủy`;
}

/* ─── Page Component ─── */

export default function OrganizationAddonsPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [contracts, setContracts] = useState<ContractFull[]>([]);
    const [loading, setLoading] = useState(true);
    const [orgId, setOrgId] = useState<string | null>(null);

    // Modal state
    const [selectedContract, setSelectedContract] = useState<ContractFull | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchContracts = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }
            setLoading(true);

            const currentOrgId = orgId || await orgHelper.getOrgId(token);
            if (!orgId) setOrgId(currentOrgId);

            // Fetch active and pending contracts (list)
            const [activeRes, pendingRes] = await Promise.all([
                rentalContractService.getOrgRentalContracts(token, currentOrgId, { status: "ACTIVE", limit: 50 }),
                rentalContractService.getOrgRentalContracts(token, currentOrgId, { status: "PENDING", limit: 50 })
            ]);

            const activeItems = activeRes?.items || (Array.isArray(activeRes) ? activeRes : []);
            const pendingItems = pendingRes?.items || (Array.isArray(pendingRes) ? pendingRes : []);
            const allItems = [...activeItems, ...pendingItems];

            // For each contract, fetch full details (with addons, amenities)
            const fullContracts: ContractFull[] = await Promise.all(
                allItems.map(async (item: any) => {
                    try {
                        const full = await rentalContractService.getOrgRentalContractFull(token, currentOrgId, item.id);
                        const data = full?.data ?? full;

                        // Extract amenities from warehouse template details
                        const details: WarehouseDetail[] = data.details || [];
                        const amenities: AmenityItem[] = [];
                        for (const d of details) {
                            const wtAmenities = d.warehouse_template?.amenities || [];
                            for (const wa of wtAmenities) {
                                if (wa.amenity && !amenities.find(a => a.id === wa.amenity.id)) {
                                    amenities.push(wa.amenity);
                                }
                            }
                        }

                        return {
                            id: data.id || item.id,
                            code: data.code || item.code,
                            name: data.name || item.name,
                            status: data.status || item.status,
                            details,
                            addons: (data.addons || []).filter((a: any) => !a.is_cancelled && !!a.addon),
                            amenityIds: amenities.map(a => a.id),
                            amenities,
                        };
                    } catch {
                        return {
                            id: item.id, code: item.code, name: item.name, status: item.status,
                            details: item.details || [], addons: [], amenityIds: [], amenities: [],
                        };
                    }
                })
            );

            setContracts(fullContracts);
        } catch (error) {
            console.error("Failed to fetch contracts for addons", error);
            showToast("Không thể tải danh sách dịch vụ", "error");
        } finally {
            setLoading(false);
        }
    }, [orgId, router, showToast]);

    useEffect(() => {
        fetchContracts();
    }, [fetchContracts]);

    /* ─── Handlers ─── */

    const handleOpenManage = (contract: ContractFull) => {
        setSelectedContract(contract);
        setIsModalOpen(true);
    };

    const handleSaveAddons = async (addonIds: string[], amenityIds: string[]) => {
        if (!selectedContract) return;
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const currentOrgId = orgId || await orgHelper.getOrgId(token);
            if (!orgId) setOrgId(currentOrgId);
            await rentalContractService.updateOrgContractAddons(token, currentOrgId, selectedContract.id, addonIds);
            showToast("Cập nhật dịch vụ thành công", "success");
            fetchContracts();
        } catch (err: any) {
            showToast(err.message || "Cập nhật thất bại", "error");
            throw err;
        }
    };

    const handleCancelSingleAddon = async (contract: ContractFull, addonId: string) => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const currentOrgId = orgId || await orgHelper.getOrgId(token);
            if (!orgId) setOrgId(currentOrgId);
            const remainingAddonIds = contract.addons
                .filter(a => a.addon_id !== addonId)
                .map(a => a.addon_id);
            await rentalContractService.updateOrgContractAddons(token, currentOrgId, contract.id, remainingAddonIds);
            showToast("Đã hủy dịch vụ thành công", "success");
            fetchContracts();
        } catch (err: any) {
            showToast(err.message || "Không thể hủy dịch vụ", "error");
        }
    };

    /* ─── Render Helpers ─── */

    const getStatusLabel = (status: string) => {
        switch (status) {
            case "ACTIVE": return { label: "Đang sử dụng", icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />, cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
            case "PENDING": return { label: "Chờ thanh toán", icon: <Clock className="w-3.5 h-3.5 text-amber-500" />, cls: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
            default: return { label: status, icon: <AlertCircle className="w-3.5 h-3.5 text-slate-500" />, cls: "bg-slate-50 text-slate-600" };
        }
    };

    const getWarehouseInfo = (details: WarehouseDetail[]) => {
        if (!details || details.length === 0) return { name: "Chưa xác định", address: "" };
        const first = details[0];
        const name = first.warehouse?.name || first.warehouse_template?.name || "Kho thuê";
        const address = first.warehouse_template?.address_detail || "";
        return { name, address };
    };

    return (
        <div className="space-y-8 pb-10">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-brand to-brand/70 bg-clip-text text-transparent">
                    Dịch vụ & Tiện ích
                </h1>
                <p className="text-muted-foreground mt-1 text-lg">
                    Quản lý và đăng ký thêm các dịch vụ gia tăng cho kho bãi của bạn.
                </p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-[280px] w-full rounded-2xl" />
                    ))}
                </div>
            ) : contracts.length === 0 ? (
                <Card className="border-dashed border-2 bg-muted/20">
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                            <Building2 className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-xl font-bold">Chưa có kho thuê hoạt động</h3>
                        <p className="text-muted-foreground max-w-sm mt-2">
                            Bạn cần có hợp đồng thuê kho đang hoạt động hoặc chờ xử lý để quản lý các tiện ích bổ sung.
                        </p>
                        <Button
                            className="mt-6 rounded-xl px-8"
                            onClick={() => router.push("/kho-bai")}
                        >
                            Tìm kiếm kho bãi ngay
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {contracts.map((contract) => {
                        const { name: warehouseName, address } = getWarehouseInfo(contract.details);
                        const statusInfo = getStatusLabel(contract.status);

                        return (
                            <Card
                                key={contract.id}
                                className="border shadow-sm hover:shadow-md transition-all duration-300 group overflow-hidden"
                                style={{ borderRadius: "20px" }}
                            >
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1.5 flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                                                    {contract.code}
                                                </span>
                                                <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${statusInfo.cls}`}>
                                                    {statusInfo.icon}
                                                    {statusInfo.label}
                                                </div>
                                            </div>
                                            <CardTitle className="text-lg leading-tight">
                                                {warehouseName}
                                            </CardTitle>
                                            {address && (
                                                <CardDescription className="flex items-center gap-1 text-xs">
                                                    <Building2 className="w-3 h-3 shrink-0" />
                                                    <span className="truncate">{address}</span>
                                                </CardDescription>
                                            )}
                                        </div>
                                        <div className="w-10 h-10 rounded-2xl bg-brand/5 flex items-center justify-center text-brand shrink-0 group-hover:bg-brand group-hover:text-white transition-all duration-300 border border-brand/10">
                                            <Package className="w-5 h-5" />
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-4 pt-0">
                                    {/* Tiện ích có sẵn (Amenities from warehouse template) */}
                                    {contract.amenities.length > 0 && (
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                Tiện ích có sẵn
                                            </p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {contract.amenities.map(amenity => (
                                                    <Badge
                                                        key={amenity.id}
                                                        variant="outline"
                                                        className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 text-[10px] px-2 py-0.5 rounded-lg font-medium"
                                                    >
                                                        <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                                                        {amenity.name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Dịch vụ đã đăng ký (Addons) */}
                                    <div className="space-y-2">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            Dịch vụ đã đăng ký
                                        </p>
                                        {contract.addons.length > 0 ? (
                                            <div className="space-y-1.5">
                                                {contract.addons.map(ca => {
                                                    const cancelable = canCancelAddon(ca.created_at);
                                                    const remainingTime = getRemainingCancelTime(ca.created_at);
                                                    return (
                                                        <div
                                                            key={ca.id}
                                                            className="flex items-center justify-between gap-2 p-2 rounded-lg bg-brand/5 border border-brand/10"
                                                        >
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-semibold truncate">{ca.addon?.name ?? ca.addon_id}</p>
                                                                <p className="text-[10px] text-muted-foreground">
                                                                    {formatCurrency(ca.price_at_purchase)}
                                                                    {ca.addon?.is_monthly_payment ? "/tháng" : ""}
                                                                    {ca.is_gift && " · Miễn phí"}
                                                                </p>
                                                                {cancelable && remainingTime && (
                                                                    <p className="text-[10px] text-amber-600">{remainingTime}</p>
                                                                )}
                                                            </div>
                                                            {cancelable && !ca.is_gift && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="h-6 w-6 p-0 text-destructive hover:bg-destructive/10 shrink-0"
                                                                    onClick={() => handleCancelSingleAddon(contract, ca.addon_id)}
                                                                    title="Hủy dịch vụ"
                                                                >
                                                                    <X className="w-3.5 h-3.5" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">Chưa đăng ký dịch vụ thêm</p>
                                        )}
                                    </div>

                                    {/* Action Button */}
                                    <div className="pt-1">
                                        <Button
                                            variant="outline"
                                            className="w-full justify-between group/btn border-brand/20 hover:border-brand hover:bg-brand/5 rounded-xl h-11 px-5"
                                            onClick={() => handleOpenManage(contract)}
                                        >
                                            <span className="flex items-center gap-2 font-semibold text-sm">
                                                Quản lý dịch vụ
                                            </span>
                                            <ChevronRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Modal */}
            {selectedContract && (
                <ManageAddonsModal
                    open={isModalOpen}
                    onOpenChange={setIsModalOpen}
                    currentAddonIds={selectedContract.addons.map(a => a.addon_id)}
                    currentAmenityIds={selectedContract.amenityIds}
                    lockedAddonIds={selectedContract.addons
                        .filter(a => !canCancelAddon(a.created_at) && !a.is_gift)
                        .map(a => a.addon_id)
                    }
                    onSave={handleSaveAddons}
                />
            )}
        </div>
    );
}

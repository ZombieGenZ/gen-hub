"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { RentalDurationTierService } from "@/services/rental-duration-tier/rental-duration-tier.service";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    ChevronUpIcon,
    ChevronDownIcon,
    ShieldCheckIcon,
    WrenchScrewdriverIcon,
    CheckCircleIcon,
    XCircleIcon,
    ClockIcon,
    SparklesIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import {
    RentalDurationTier,
    RentalDurationTierRequest,
} from "@/types/rental-duration-tier/rental-duration-tier.type";
import { toast } from "sonner";
import { TierForm } from "./tier-form";

const tierService = new RentalDurationTierService();

// ─── Helper: Duration label ──────────────────────────────────────────────────
function durationLabel(value: number, unit: string) {
    if (unit === "YEAR") return `${value} ${value > 1 ? "Năm" : "Năm"}`;
    return `${value} ${value > 1 ? "Tháng" : "Tháng"}`;
}

// ─── Sortable Tier Card ──────────────────────────────────────────────────────
function TierCard({
    tier,
    index,
    total,
    onMoveUp,
    onMoveDown,
    onEdit,
    onDelete,
    onToggleActive,
    isDragging,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
}: {
    tier: RentalDurationTier;
    index: number;
    total: number;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onToggleActive: (active: boolean) => void;
    isDragging: boolean;
    onDragStart: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDragEnd: () => void;
    onDrop: (e: React.DragEvent) => void;
}) {
    const addonCount = tier.tier_addon_gifts?.length || 0;
    const insuranceCount = tier.tier_insurance_gifts?.length || 0;
    const totalGifts = addonCount + insuranceCount;

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragEnd={onDragEnd}
            onDrop={onDrop}
            className={`group transition-all duration-200 ${isDragging ? "opacity-40 scale-[0.98]" : "opacity-100"}`}
        >
            <div
                className={`flex items-center gap-4 p-4 md:p-5 bg-white dark:bg-slate-900 border rounded-2xl shadow-sm hover:shadow-md transition-all ${!tier.is_active ? "bg-gray-50/50 dark:bg-slate-900/50" : ""
                    }`}
            >
                {/* ── Drag Handle + Order Buttons ── */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                    {/* Drag Handle (6 dots) */}
                    <div className="cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-muted/50 text-muted-foreground">
                        <svg width="14" height="20" viewBox="0 0 14 20" fill="currentColor">
                            <circle cx="3" cy="3" r="1.5" />
                            <circle cx="11" cy="3" r="1.5" />
                            <circle cx="3" cy="10" r="1.5" />
                            <circle cx="11" cy="10" r="1.5" />
                            <circle cx="3" cy="17" r="1.5" />
                            <circle cx="11" cy="17" r="1.5" />
                        </svg>
                    </div>
                    {/* Up/Down arrows */}
                    <div className="flex flex-col gap-0.5">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 rounded text-muted-foreground hover:text-foreground"
                            onClick={onMoveUp}
                            disabled={index === 0}
                        >
                            <ChevronUpIcon className="w-3 h-3" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 rounded text-muted-foreground hover:text-foreground"
                            onClick={onMoveDown}
                            disabled={index === total - 1}
                        >
                            <ChevronDownIcon className="w-3 h-3" />
                        </Button>
                    </div>
                </div>

                {/* ── Info Block ── */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className={`font-bold text-base ${!tier.is_active ? "text-muted-foreground" : ""}`}>
                            {tier.name}
                        </h3>
                        <Badge variant="secondary" className="rounded-full text-xs px-2.5 py-0.5 font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            <ClockIcon className="w-3 h-3 mr-1" />
                            {durationLabel(tier.duration_value, tier.duration_unit)}
                        </Badge>
                    </div>

                    {/* Description */}
                    {tier.description && (
                        <p className="text-xs text-muted-foreground truncate max-w-sm mb-2">
                            {tier.description}
                        </p>
                    )}

                    {/* Incentives Summary */}
                    {totalGifts > 0 ? (
                        <div className="flex flex-col gap-1 mt-1">
                            {addonCount > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <WrenchScrewdriverIcon className="w-3 h-3 text-blue-500 shrink-0" />
                                    {tier.tier_addon_gifts!.map((g) => (
                                        <span key={g.addon_id} className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                                            {g.addon?.name || g.addon_id}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {insuranceCount > 0 && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <ShieldCheckIcon className="w-3 h-3 text-emerald-500 shrink-0" />
                                    {tier.tier_insurance_gifts!.map((g) => (
                                        <span key={g.insurance_id} className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">
                                            {g.insurance?.name || g.insurance_id}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-xs text-muted-foreground/60 italic">Chưa có quà tặng kèm</p>
                    )}
                </div>

                {/* ── Status Toggle ── */}
                <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch
                        checked={tier.is_active}
                        onCheckedChange={onToggleActive}
                        className="data-[state=checked]:bg-emerald-500"
                    />
                    <span className={`text-xs font-medium hidden sm:inline ${tier.is_active ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {tier.is_active ? "Hoạt động" : "Không hoạt động"}
                    </span>
                </div>

                {/* ── Actions ── */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-100 transition-all duration-200">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-blue-50 text-blue-600/70 hover:text-blue-600 transition-all duration-200 active:scale-90"
                        onClick={onEdit}
                        title="Chỉnh sửa"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-full hover:bg-red-50 text-red-600/70 hover:text-red-600 transition-all duration-200 active:scale-90"
                        onClick={onDelete}
                        title="Xóa"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
export default function RentalDurationTiersPage() {

    // ─── Data ────────────────────────────────────────────────────────────────────
    const [tiers, setTiers] = useState<RentalDurationTier[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

    // ─── Dialog (Create/Edit) ────────────────────────────────────────────
    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    useEffect(() => {
        if (isFormDialogOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "";
        }
        return () => { document.body.style.overflow = ""; };
    }, [isFormDialogOpen]);
    const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
    const [selectedTier, setSelectedTier] = useState<RentalDurationTier | null>(null);
    const [isFormLoading, setIsFormLoading] = useState(false);
    const [formKey, setFormKey] = useState(0);

    // ─── Delete Dialog ──────────────────────────────────────────────────
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);
    const [isDeleteLoading, setIsDeleteLoading] = useState(false);
    const [deleteTier, setDeleteTier] = useState<RentalDurationTier | null>(null);

    // ─── Selection for bulk actions ──────────────────────────────────────────────
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
    const [isBulkLoading, setIsBulkLoading] = useState(false);

    // ─── Drag state ──────────────────────────────────────────────────────────────
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    // ─── Fetch tiers ────────────────────────────────────────────────────────────
    const fetchTiers = useCallback(async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            const data: any = await tierService.getAllRentalDuratuion(token, { limit: 100 });

            let items: RentalDurationTier[] = [];
            if (data?.items) items = data.items;
            else if (data?.data?.items) items = data.data.items;
            else if (Array.isArray(data?.data)) items = data.data;
            else if (Array.isArray(data)) items = data;

            // Sort by order
            items.sort((a, b) => a.order - b.order);

            setTiers(items);

            // Stats
            const active = items.filter((t) => t.is_active).length;
            setStats({
                total: items.length,
                active,
                inactive: items.length - active,
            });
        } catch (error: any) {
            console.error("Failed to fetch tiers", error);
            toast.error(error.message || "Không thể tải danh sách gói thuê");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchTiers();
    }, [fetchTiers]);

    // ─── Create / Edit ──────────────────────────────────────────────────────────
    const openCreate = () => {
        setSheetMode("create");
        setSelectedTier(null);
        setFormKey((k) => k + 1);
        setIsFormDialogOpen(true);
    };

    const openEdit = async (tier: RentalDurationTier) => {
        setSheetMode("edit");
        setSelectedTier(null);
        setIsFormDialogOpen(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const data: any = await tierService.getRentalDurationTier(token, tier.id);
            const detail = data?.data || data;
            setSelectedTier(detail);
            setFormKey((k) => k + 1);
        } catch (error: any) {
            // Fallback: use tier data without gifts
            setSelectedTier(tier);
            setFormKey((k) => k + 1);
            console.error("Failed to fetch tier detail", error);
            toast.error(error.message || "Không thể tải chi tiết gói thuê");
        }
    };

    const handleFormSubmit = async (payload: RentalDurationTierRequest) => {
        setIsFormLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            if (sheetMode === "create") {
                // Set order to max+1
                const maxOrder = tiers.length > 0 ? Math.max(...tiers.map((t) => t.order)) : -1;
                payload.order = maxOrder + 1;
                const created: any = await tierService.createRentalDurationTier(token, payload);
                toast.success("Đã tạo gói thuê mới thành công!");
                setIsFormDialogOpen(false);
                setSelectedTier(null);
                // Server returns full tier (with gifts) in create response — use it directly
                const createdData = created?.data || created;
                if (createdData?.id) {
                    setTiers((prev) => [...prev, createdData].sort((a, b) => a.order - b.order));
                }
                fetchTiers();
            } else if (selectedTier) {
                const updated: any = await tierService.updateRentalDurationTier(token, selectedTier.id, payload);
                toast.success("Đã cập nhật gói thuê thành công!");
                setIsFormDialogOpen(false);
                // Server returns full tier (with gifts) in update response — use it directly
                const updatedData = updated?.data || updated;
                if (updatedData?.id) {
                    setTiers((prev) => prev.map((t) => t.id === updatedData.id ? updatedData : t));
                }
                setSelectedTier(null);
                fetchTiers();
            }
        } catch (error: any) {
            console.error("Failed to save tier", error);
            toast.error(error?.message || "Lưu gói thuê thất bại");
        } finally {
            setIsFormLoading(false);
        }
    };

    // ─── Delete ──────────────────────────────────────────────────────────────────
    const handleDelete = async () => {
        setIsDeleteLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token || !deleteTier) return;

            await tierService.deleteRentalDurationTier(token, deleteTier.id);
            toast.success(`Đã xóa gói thuê "${deleteTier.name}"`);
            setIsDeleteOpen(false);
            setDeleteTier(null);
            fetchTiers();
        } catch (error: any) {
            console.error("Failed to delete tier", error);
            toast.error(error.message || "Xóa gói thuê thất bại");
        } finally {
            setIsDeleteLoading(false);
        }
    };

    const handleBulkDelete = async () => {
        setIsBulkLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            await tierService.deleteMultipleRentalDurationTier(token, selectedIds);
            toast.success(`Đã xóa ${selectedIds.length} gói thuê thành công!`);
            setIsBulkDeleteOpen(false);
            setSelectedIds([]);
            fetchTiers();
        } catch (error: any) {
            console.error("Bulk delete failed", error);
            toast.error(error.message || "Xóa nhiều gói thuê thất bại");
        } finally {
            setIsBulkLoading(false);
        }
    };

    // ─── Toggle Active ──────────────────────────────────────────────────────────
    const handleToggleActive = async (tier: RentalDurationTier, active: boolean) => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            await tierService.updateRentalDurationTier(token, tier.id, { name: tier.name, duration_value: tier.duration_value, duration_unit: tier.duration_unit, is_active: active });
            // Optimistic update
            setTiers((prev) =>
                prev.map((t) => (t.id === tier.id ? { ...t, is_active: active } : t))
            );
            setStats((prev) => ({
                ...prev,
                active: active ? prev.active + 1 : prev.active - 1,
                inactive: active ? prev.inactive - 1 : prev.inactive + 1,
            }));
            toast.success(active ? "Đã kích hoạt gói" : "Đã tắt gói");
        } catch (error: any) {
            console.error("Failed to toggle tier", error);
            toast.error(error.message || "Cập nhật trạng thái thất bại");
        }
    };

    // ─── Reorder (Up/Down + Drag) ────────────────────────────────────────────────
    const reorder = async (fromIndex: number, toIndex: number) => {
        if (fromIndex === toIndex) return;
        const updated = [...tiers];
        const [moved] = updated.splice(fromIndex, 1);
        updated.splice(toIndex, 0, moved);

        // Optimistic reorder
        setTiers(updated);

        // Persist order changes
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            // Update both swapped items
            await Promise.all(
                updated.map((tier, idx) =>
                    tier.order !== idx
                        ? tierService.updateRentalDurationTier(token, tier.id, {
                            name: tier.name,
                            duration_value: tier.duration_value,
                            duration_unit: tier.duration_unit,
                            order: idx,
                        })
                        : Promise.resolve()
                )
            );

            setTiers(updated.map((t, idx) => ({ ...t, order: idx })));
        } catch (error: any) {
            console.error("Failed to reorder", error);
            toast.error(error.message || "Sắp xếp thứ tự thất bại");
            fetchTiers(); // Revert
        }
    };

    const moveUp = (index: number) => reorder(index, index - 1);
    const moveDown = (index: number) => reorder(index, index + 1);

    // ─── Drag & Drop handlers ────────────────────────────────────────────────────
    const handleDragStart = (index: number) => (e: React.DragEvent) => {
        setDragIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (index: number) => (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (targetIndex: number) => (e: React.DragEvent) => {
        e.preventDefault();
        if (dragIndex !== null && dragIndex !== targetIndex) {
            reorder(dragIndex, targetIndex);
        }
        setDragIndex(null);
    };

    const handleDragEnd = () => setDragIndex(null);

    // ─── Selection helpers ───────────────────────────────────────────────────────
    const toggleSelect = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
        );
    };

    // ─── Filter tiers by status ──────────────────────────────────────────────────
    const filteredTiers = tiers.filter((tier) => {
        if (statusFilter === "active") return tier.is_active;
        if (statusFilter === "inactive") return !tier.is_active;
        return true; // "all"
    });

    return (
        <div className="space-y-6">
            {/* ═══ Header ═══ */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-[32px] leading-[130%]">
                        Gói thuê
                    </h1>
                    <p className="text-muted-foreground mt-1 text-base">
                        Cấu hình các mốc thời gian thuê & ưu đãi kèm theo
                    </p>
                </div>
                <Button
                    onClick={openCreate}
                    className="gap-2 bg-slate-900 hover:bg-slate-800 text-white transition-all duration-200 active:scale-[0.97] hover:shadow-md rounded-xl"
                >
                    <PlusIcon className="w-4 h-4" />
                    Tạo gói
                </Button>
            </div>

            {/* ═══ Interactive Filter Tabs ═══ */}
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                <TabsList className="inline-flex h-11 items-center justify-start rounded-xl bg-muted p-1 gap-1">
                    <TabsTrigger
                        value="all"
                        className="rounded-lg px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                        <span className="font-medium">Tất cả</span>
                        <Badge variant="secondary" className="ml-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                            {stats.total}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="active"
                        className="rounded-lg px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                        <CheckCircleIcon className="w-4 h-4 mr-1.5" />
                        <span className="font-medium">Hoạt động</span>
                        <Badge variant="secondary" className="ml-2 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20">
                            {stats.active}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger
                        value="inactive"
                        className="rounded-lg px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                        <XCircleIcon className="w-4 h-4 mr-1.5" />
                        <span className="font-medium">Không hoạt động</span>
                        <Badge variant="secondary" className="ml-2 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20">
                            {stats.inactive}
                        </Badge>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            {/* ═══ Tier List (Sortable Cards) ═══ */}
            <Card className="border-0 shadow-premium overflow-hidden rounded-3xl">
                <div className="p-6 pb-4 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold">Danh sách gói thuê</h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            {statusFilter === "all"
                                ? `Hiển thị tất cả ${filteredTiers.length} gói · Kéo thả để sắp xếp thứ tự`
                                : statusFilter === "active"
                                    ? `Hiển thị ${filteredTiers.length} gói đang hoạt động`
                                    : `Hiển thị ${filteredTiers.length} gói chưa kích hoạt`
                            }
                        </p>
                    </div>
                </div>
                <CardContent className="px-6 pb-6 pt-0">
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex items-center gap-4 p-5 border rounded-2xl">
                                    <Skeleton className="w-6 h-12 rounded" />
                                    <div className="flex-1 space-y-2">
                                        <Skeleton className="h-5 w-48" />
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                    <Skeleton className="h-6 w-11 rounded-full" />
                                    <Skeleton className="h-8 w-16 rounded" />
                                </div>
                            ))}
                        </div>
                    ) : filteredTiers.length === 0 ? (
                        <div className="text-center py-16">
                            {statusFilter === "all" ? (
                                <>
                                    <SparklesIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                                    <p className="text-muted-foreground font-medium">Chưa có gói thuê nào</p>
                                    <p className="text-xs text-muted-foreground/60 mt-1 mb-4">
                                        Tạo gói đầu tiên để bắt đầu cấu hình mốc thời gian
                                    </p>
                                    <Button
                                        onClick={openCreate}
                                        variant="outline"
                                        className="gap-2 rounded-xl"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        Tạo gói đầu tiên
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {statusFilter === "active" ? (
                                        <CheckCircleIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                                    ) : (
                                        <XCircleIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/30" />
                                    )}
                                    <p className="text-muted-foreground font-medium">
                                        Không có gói {statusFilter === "active" ? "đang hoạt động" : "chưa kích hoạt"}
                                    </p>
                                    <p className="text-xs text-muted-foreground/60 mt-1">
                                        Thử chọn tab khác để xem gói thuê
                                    </p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredTiers.map((tier) => {
                                const originalIndex = tiers.findIndex(t => t.id === tier.id);
                                return (
                                    <TierCard
                                        key={tier.id}
                                        tier={tier}
                                        index={originalIndex}
                                        total={tiers.length}
                                        onMoveUp={() => moveUp(originalIndex)}
                                        onMoveDown={() => moveDown(originalIndex)}
                                        onEdit={() => openEdit(tier)}
                                        onDelete={() => {
                                            setDeleteTier(tier);
                                            setIsDeleteOpen(true);
                                        }}
                                        onToggleActive={(active) => handleToggleActive(tier, active)}
                                        isDragging={dragIndex === originalIndex}
                                        onDragStart={handleDragStart(originalIndex)}
                                        onDragOver={handleDragOver(originalIndex)}
                                        onDragEnd={handleDragEnd}
                                        onDrop={handleDrop(originalIndex)}
                                    />
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ═══ Floating Bulk Action Bar ═══ */}
            {selectedIds.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
                    <div
                        className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border border-border shadow-2xl px-4 py-2 flex items-center gap-4 animate-in slide-in-from-bottom-4 fade-in rounded-3xl"
                    >
                        <span className="text-muted-foreground text-sm font-medium">{selectedIds.length} đã chọn</span>
                        <div className="h-4 w-px bg-border" />
                        <Button
                            variant="destructive"
                            size="sm"
                            className="gap-2 rounded-xl"
                            onClick={() => setIsBulkDeleteOpen(true)}
                        >
                            <TrashIcon className="w-4 h-4" /> Xóa
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedIds([])}
                            className="rounded-full text-muted-foreground hover:text-foreground h-8 w-8"
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}

            {/* ═══ Create/Edit Dialog (was Sheet) ═══ */}
            <Dialog open={isFormDialogOpen} onOpenChange={(open) => { if (!isFormLoading) setIsFormDialogOpen(open); }}>
                <DialogContent className="w-[95vw] max-w-2xl max-h-[90dvh] flex flex-col p-1 gap-0 overflow-hidden rounded-2xl">
                    <DialogHeader className="p-6 pb-4 shrink-0 z-10 border-b bg-background">
                        <DialogTitle className="text-xl font-bold">
                            {sheetMode === "create" ? "Tạo gói thuê mới" : "Chỉnh sửa gói thuê"}
                        </DialogTitle>
                        <DialogDescription>
                            {sheetMode === "create"
                                ? "Thêm mốc thời gian thuê mới với các ưu đãi kèm theo"
                                : `Đang chỉnh sửa "${selectedTier?.name}"`}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto overscroll-contain p-6">
                        {sheetMode === "edit" && !selectedTier ? (
                            <div className="flex items-center justify-center h-40 text-muted-foreground text-sm gap-2">
                                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                Đang tải...
                            </div>
                        ) : (
                            <TierForm
                                key={formKey}
                                initialData={selectedTier}
                                onSubmit={handleFormSubmit}
                                onCancel={() => setIsFormDialogOpen(false)}
                                isEdit={sheetMode === "edit"}
                                loading={isFormLoading}
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* ═══ Delete Confirmation Dialog ═══ */}
            <Dialog open={isDeleteOpen} onOpenChange={(open) => { if (!isDeleteLoading) setIsDeleteOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa gói <strong className="text-foreground">&ldquo;{deleteTier?.name}&rdquo;</strong> không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={isDeleteLoading} className="rounded-xl transition-all duration-200">Hủy</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={isDeleteLoading} className="gap-2 min-w-[100px] rounded-xl transition-all duration-200">
                            {isDeleteLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Đang xóa...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2"><TrashIcon className="w-4 h-4" /> Xóa</span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ═══ Bulk Delete Dialog ═══ */}
            <Dialog open={isBulkDeleteOpen} onOpenChange={(open) => { if (!isBulkLoading) setIsBulkDeleteOpen(open); }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>Xác nhận xóa nhiều</DialogTitle>
                        <DialogDescription>
                            Bạn có chắc chắn muốn xóa <strong className="text-foreground">{selectedIds.length} gói thuê</strong> đã chọn không?
                            <br />
                            <span className="text-red-500 text-xs mt-1 inline-block">Hành động này không thể hoàn tác.</span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBulkDeleteOpen(false)} disabled={isBulkLoading} className="rounded-xl transition-all duration-200">Hủy</Button>
                        <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkLoading} className="gap-2 min-w-[120px] rounded-xl transition-all duration-200">
                            {isBulkLoading ? (
                                <span className="flex items-center gap-2">
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                                    Đang xóa {selectedIds.length}...
                                </span>
                            ) : (
                                <span className="flex items-center gap-2"><TrashIcon className="w-4 h-4" /> Xóa {selectedIds.length} mục</span>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

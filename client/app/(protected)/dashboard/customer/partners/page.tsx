"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { PartnerService } from "@/services/partner/partner.service";
import { LocationService } from "@/services/location/location.service";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/contexts/ToastContext";
import type {
    Partner,
    PartnerType,
    CreatePartnerPayload,
    UpdatePartnerPayload,
} from "@/services/partner/partner.types";
import type { Province } from "@/types/location/provinces.type";
import type { Ward } from "@/types/location/wards.type";

// ── shadcn/ui ──
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    ScrollArea,
} from "@/components/ui/scroll-area";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

// ── Icons ──
import {
    MagnifyingGlassIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    PhoneIcon,
    EnvelopeIcon,
    UserGroupIcon,
    BuildingOfficeIcon,
    IdentificationIcon,
    MapPinIcon,
    EyeIcon,
} from "@heroicons/react/24/outline";
import { Sparkles } from "lucide-react";

// ── Services ──
const partnerService = new PartnerService();
const locationService = new LocationService();
const ITEMS_PER_PAGE = 15;

// ════════════════════════════════════════════════
// MAIN PAGE: Partner Management
// ════════════════════════════════════════════════
export default function PartnerManagementPage() {
    const router = useRouter();
    const { showToast } = useToast();

    // ── Data state ──
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [activeTab, setActiveTab] = useState<"ALL" | "CUSTOMER" | "SUPPLIER">("ALL");
    const [filterActive, setFilterActive] = useState<"all" | "active" | "inactive">("all");
    const debouncedKeywords = useDebounce(searchTerm, 500);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // ── Selection ──
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // ── Drawer / Dialog ──
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [drawerMode, setDrawerMode] = useState<"create" | "edit">("create");
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null);
    const [editTarget, setEditTarget] = useState<Partner | null>(null);

    // ── Form fields ──
    const [formType, setFormType] = useState<PartnerType>("CUSTOMER");
    const [formName, setFormName] = useState("");
    const [formCode, setFormCode] = useState("");
    const [formPhone, setFormPhone] = useState("");
    const [formEmail, setFormEmail] = useState("");
    const [formTaxCode, setFormTaxCode] = useState("");
    const [formAddressDetail, setFormAddressDetail] = useState("");
    const [formWardId, setFormWardId] = useState("");
    const [formActive, setFormActive] = useState(true);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [codeChecking, setCodeChecking] = useState(false);

    // ── Location cascading ──
    const [provinces, setProvinces] = useState<Province[]>([]);
    const [wards, setWards] = useState<Ward[]>([]);
    const [selectedProvinceId, setSelectedProvinceId] = useState("");
    const [loadingProvinces, setLoadingProvinces] = useState(false);
    const [loadingWards, setLoadingWards] = useState(false);

    // ── Code auto-generate ──
    const generateCode = useCallback(() => {
        const prefix = formType === "CUSTOMER" ? "KH" : "NCC";
        const random = String(Math.floor(Math.random() * 9000) + 1000);
        setFormCode(`${prefix}${random}`);
        setFormErrors((prev) => ({ ...prev, code: "" }));
    }, [formType]);

    // ── Debounce code check ──
    const debouncedCode = useDebounce(formCode, 600);

    useEffect(() => {
        if (!debouncedCode || debouncedCode.length < 2) return;
        if (drawerMode === "edit" && editTarget?.code === debouncedCode) return;

        const checkCode = async () => {
            setCodeChecking(true);
            try {
                const token = authStorage.getAccessToken();
                if (!token) return;
                // We check by listing with keyword = exact code
                const result = await partnerService.list(token, {
                    keywords: debouncedCode,
                    limit: 1,
                });
                const exists = result?.data?.items?.some(
                    (p) => p.code === debouncedCode && p.id !== editTarget?.id
                );
                if (exists) {
                    setFormErrors((prev) => ({
                        ...prev,
                        code: "Mã này đã được sử dụng. Vui lòng chọn mã khác.",
                    }));
                } else {
                    setFormErrors((prev) => ({ ...prev, code: "" }));
                }
            } catch {
                // ignore
            } finally {
                setCodeChecking(false);
            }
        };
        checkCode();
    }, [debouncedCode, drawerMode, editTarget]);

    // ── Load provinces ──
    useEffect(() => {
        const loadProvinces = async () => {
            setLoadingProvinces(true);
            try {
                const data = await locationService.getProvinces();
                setProvinces(data || []);
            } catch {
                // ignore
            } finally {
                setLoadingProvinces(false);
            }
        };
        loadProvinces();
    }, []);

    // ── Load wards when province changes ──
    useEffect(() => {
        if (!selectedProvinceId) {
            setWards([]);
            setFormWardId("");
            return;
        }
        const loadWards = async () => {
            setLoadingWards(true);
            try {
                const data = await locationService.getWards({ province_id: selectedProvinceId });
                setWards(data || []);
            } catch {
                // ignore
            } finally {
                setLoadingWards(false);
            }
        };
        loadWards();
    }, [selectedProvinceId]);

    // ── Fetch partners ──
    const fetchPartners = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }

            setLoading(true);
            const offset = (currentPage - 1) * ITEMS_PER_PAGE;
            const result = await partnerService.list(token, {
                keywords: debouncedKeywords || undefined,
                type: activeTab === "ALL" ? undefined : activeTab,
                is_active: filterActive === "all" ? undefined : filterActive === "active",
                limit: ITEMS_PER_PAGE,
                offset,
            });

            if (result?.data) {
                setPartners(result.data.items || []);
                setTotalItems(result.data.total || 0);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message === "Unauthorized") { router.push("/login"); return; }
            showToast("Không thể tải danh sách đối tác", "error");
        } finally {
            setLoading(false);
        }
    }, [debouncedKeywords, currentPage, activeTab, filterActive, router, showToast]);

    useEffect(() => { fetchPartners(); }, [fetchPartners]);
    useEffect(() => { setCurrentPage(1); }, [debouncedKeywords, activeTab, filterActive]);

    // ── Toggle active ──
    const handleToggleActive = async (partner: Partner) => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await partnerService.update(token, partner.id, { is_active: !partner.is_active });
            showToast(
                `Đã ${partner.is_active ? "ngừng" : "kích hoạt"} đối tác "${partner.name}"`,
                "success"
            );
            fetchPartners();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Cập nhật thất bại";
            showToast(msg, "error");
        }
    };

    // ── Selection helpers ──
    const toggleSelection = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        setSelectedIds((prev) =>
            prev.length === partners.length ? [] : partners.map((p) => p.id)
        );
    };

    // ── Reset form ──
    const resetForm = () => {
        setFormType("CUSTOMER");
        setFormName("");
        setFormCode("");
        setFormPhone("");
        setFormEmail("");
        setFormTaxCode("");
        setFormAddressDetail("");
        setFormWardId("");
        setSelectedProvinceId("");
        setFormActive(true);
        setFormErrors({});
    };

    // ── Validate ──
    const validate = () => {
        const errs: Record<string, string> = {};
        if (!formName.trim()) errs.name = "Tên đối tác là bắt buộc";
        if (formName.trim().length > 255) errs.name = "Tên đối tác tối đa 255 ký tự";
        if (!formCode.trim()) errs.code = "Mã đối tác là bắt buộc";
        if (formCode.trim().length > 50) errs.code = "Mã đối tác tối đa 50 ký tự";
        if (formEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail)) {
            errs.email = "Email không hợp lệ";
        }
        if (formPhone && formPhone.length > 20) errs.phone = "Số điện thoại tối đa 20 ký tự";
        if (formTaxCode && formTaxCode.length > 20) errs.tax_code = "Mã số thuế tối đa 20 ký tự";
        setFormErrors((prev) => ({ ...prev, ...errs }));
        return Object.keys(errs).length === 0;
    };

    // ── Open create drawer ──
    const openCreateDrawer = () => {
        resetForm();
        setDrawerMode("create");
        setEditTarget(null);
        setDrawerOpen(true);
    };

    // ── Open edit drawer ──
    const openEditDrawer = async (partner: Partner) => {
        setDrawerMode("edit");
        setEditTarget(partner);
        setFormType(partner.type);
        setFormName(partner.name);
        setFormCode(partner.code);
        setFormPhone(partner.phone || "");
        setFormEmail(partner.email || "");
        setFormTaxCode(partner.tax_code || "");
        setFormAddressDetail(partner.address_detail || "");
        setFormActive(partner.is_active);
        setFormErrors({});

        // Load province from ward relationship
        if (partner.ward?.province?.id) {
            setSelectedProvinceId(partner.ward.province.id);
            // Wards will load via useEffect
            setFormWardId(partner.ward_id || "");
        } else {
            setSelectedProvinceId("");
            setFormWardId("");
        }
        setDrawerOpen(true);
    };

    // ── Create ──
    const handleCreate = async () => {
        if (!validate()) return;
        if (formErrors.code) return; // Don't submit if code exists
        setIsSubmitting(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            const payload: CreatePartnerPayload = {
                name: formName.trim(),
                code: formCode.trim(),
                type: formType,
                is_active: formActive,
            };
            if (formPhone.trim()) payload.phone = formPhone.trim();
            if (formEmail.trim()) payload.email = formEmail.trim();
            if (formTaxCode.trim()) payload.tax_code = formTaxCode.trim();
            if (formAddressDetail.trim()) payload.address_detail = formAddressDetail.trim();
            if (formWardId) payload.ward_id = formWardId;

            await partnerService.create(token, payload);
            showToast(`Đã tạo đối tác "${formName}" thành công!`, "success");
            setDrawerOpen(false);
            resetForm();
            fetchPartners();
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message?.includes("đã tồn tại") || error.message?.includes("code_exists")) {
                setFormErrors((prev) => ({
                    ...prev,
                    code: "Mã này đã được sử dụng. Vui lòng chọn mã khác.",
                }));
            } else {
                showToast(error.message || "Tạo đối tác thất bại", "error");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Update ──
    const handleUpdate = async () => {
        if (!validate() || !editTarget) return;
        if (formErrors.code) return;
        setIsSubmitting(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            const payload: UpdatePartnerPayload = {
                name: formName.trim(),
                code: formCode.trim(),
                type: formType,
                is_active: formActive,
                phone: formPhone.trim() || undefined,
                email: formEmail.trim() || undefined,
                tax_code: formTaxCode.trim() || undefined,
                address_detail: formAddressDetail.trim() || undefined,
                ward_id: formWardId || undefined,
            };

            await partnerService.update(token, editTarget.id, payload);
            showToast(`Đã cập nhật đối tác "${formName}" thành công!`, "success");
            setDrawerOpen(false);
            setEditTarget(null);
            resetForm();
            fetchPartners();
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message?.includes("đã tồn tại") || error.message?.includes("code_exists")) {
                setFormErrors((prev) => ({
                    ...prev,
                    code: "Mã này đã được sử dụng. Vui lòng chọn mã khác.",
                }));
            } else {
                showToast(error.message || "Cập nhật thất bại", "error");
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Delete single ──
    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        setIsSubmitting(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await partnerService.delete(token, deleteTarget.id);
            showToast(`Đã xóa đối tác "${deleteTarget.name}"`, "success");
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
            setSelectedIds([]);
            fetchPartners();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Xóa thất bại";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Bulk delete ──
    const handleBulkDelete = async () => {
        setIsSubmitting(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await partnerService.deleteMany(token, selectedIds);
            showToast(`Đã xóa ${selectedIds.length} đối tác thành công!`, "success");
            setBulkDeleteOpen(false);
            setSelectedIds([]);
            fetchPartners();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Xóa thất bại";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Stats memo ──
    const stats = useMemo(() => ({
        total: totalItems,
    }), [totalItems]);

    // ════════════════════════════════════════════════
    // RENDER
    // ════════════════════════════════════════════════
    return (
        <div className="flex-1 overflow-auto bg-slate-50/50">
            <main className="pt-0 py-4 px-4 space-y-6">
                {/* ── Page header ── */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <UserGroupIcon className="w-6 h-6 text-[#0F766E]" />
                            Quản lý Đối tác
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Quản lý khách hàng và nhà cung cấp trong hệ thống kho
                        </p>
                    </div>
                    <Button
                        className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl"
                        onClick={openCreateDrawer}
                    >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Thêm đối tác
                    </Button>
                </div>

                {/* ── Tabs + Search + Filters ── */}
                <Card className="shadow-premium rounded-3xl border-0">
                    <CardContent className="p-4 md:p-6 space-y-4">
                        {/* Type tabs */}
                        <Tabs
                            value={activeTab}
                            onValueChange={(v) => setActiveTab(v as "ALL" | "CUSTOMER" | "SUPPLIER")}
                        >
                            <TabsList className="bg-slate-100 p-1 rounded-xl">
                                <TabsTrigger value="ALL" className="rounded-lg px-4 py-2 text-sm font-medium">
                                    Tất cả
                                </TabsTrigger>
                                <TabsTrigger value="CUSTOMER" className="rounded-lg px-4 py-2 text-sm font-medium">
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                                    Khách hàng
                                </TabsTrigger>
                                <TabsTrigger value="SUPPLIER" className="rounded-lg px-4 py-2 text-sm font-medium">
                                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2" />
                                    Nhà cung cấp
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>

                        {/* Search + filter row */}
                        <div className="flex flex-col md:flex-row gap-3">
                            <div className="relative flex-1">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    type="text"
                                    placeholder="Tìm kiếm theo tên, mã, email, số điện thoại..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 h-10 rounded-xl"
                                />
                            </div>
                            <Select
                                value={filterActive}
                                onValueChange={(v) => setFilterActive(v as "all" | "active" | "inactive")}
                            >
                                <SelectTrigger className="w-full md:w-52 h-10 rounded-xl">
                                    <SelectValue placeholder="Trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                    <SelectItem value="active">Đang giao dịch</SelectItem>
                                    <SelectItem value="inactive">Ngừng giao dịch</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>

                {/* ── Data Grid ── */}
                <Card className="shadow-premium rounded-3xl border-0">
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/80">
                                        <TableHead className="w-12">
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300"
                                                checked={selectedIds.length === partners.length && partners.length > 0}
                                                onChange={toggleSelectAll}
                                                aria-label="Chọn tất cả"
                                            />
                                        </TableHead>
                                        <TableHead className="font-semibold text-slate-700">Mã ĐT</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Tên đối tác</TableHead>
                                        <TableHead className="font-semibold text-slate-700 text-center">Loại</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Liên hệ</TableHead>
                                        <TableHead className="font-semibold text-slate-700 text-center">Trạng thái</TableHead>
                                        <TableHead className="font-semibold text-slate-700 text-center">Ngày tạo</TableHead>
                                        <TableHead className="font-semibold text-slate-700 text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>
                                                {Array.from({ length: 8 }).map((_, j) => (
                                                    <TableCell key={j}>
                                                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : partners.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8}>
                                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                                    <UserGroupIcon className="w-12 h-12 mb-3 opacity-30" />
                                                    <p className="text-base font-medium">Chưa có đối tác nào</p>
                                                    <p className="text-sm mt-1">
                                                        Nhấn &quot;Thêm đối tác&quot; để bắt đầu khai báo
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        partners.map((partner) => (
                                            <TableRow
                                                key={partner.id}
                                                className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                                                onClick={() => router.push(`/dashboard/customer/partners/${partner.id}`)}
                                            >
                                                <TableCell onClick={(e) => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300"
                                                        checked={selectedIds.includes(partner.id)}
                                                        onChange={() => toggleSelection(partner.id)}
                                                        aria-label={`Chọn ${partner.name}`}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-mono text-sm font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                        {partner.code}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-medium text-slate-900">
                                                        {partner.name}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {partner.type === "CUSTOMER" ? (
                                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full text-xs">
                                                            Khách hàng
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 rounded-full text-xs">
                                                            Nhà cung cấp
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-0.5">
                                                        {partner.phone && (
                                                            <span className="text-sm text-slate-600 flex items-center gap-1">
                                                                <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                                                                {partner.phone}
                                                            </span>
                                                        )}
                                                        {partner.email && (
                                                            <span className="text-sm text-slate-500 flex items-center gap-1">
                                                                <EnvelopeIcon className="w-3.5 h-3.5 text-slate-400" />
                                                                {partner.email}
                                                            </span>
                                                        )}
                                                        {!partner.phone && !partner.email && (
                                                            <span className="text-sm text-slate-400">—</span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                                    <Switch
                                                        checked={partner.is_active}
                                                        onCheckedChange={() => handleToggleActive(partner)}
                                                    />
                                                </TableCell>
                                                <TableCell className="text-center text-sm text-slate-500">
                                                    {new Date(partner.created_at).toLocaleDateString("vi-VN")}
                                                </TableCell>
                                                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-[#0F766E]"
                                                            onClick={() => router.push(`/dashboard/customer/partners/${partner.id}`)}
                                                            title="Xem chi tiết"
                                                        >
                                                            <EyeIcon className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-[#0F766E]"
                                                            onClick={() => openEditDrawer(partner)}
                                                            title="Chỉnh sửa"
                                                        >
                                                            <PencilSquareIcon className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-red-600"
                                                            onClick={() => {
                                                                setDeleteTarget(partner);
                                                                setDeleteDialogOpen(true);
                                                            }}
                                                            title="Xóa"
                                                        >
                                                            <TrashIcon className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* ── Pagination ── */}
                        {!loading && totalPages > 1 && (
                            <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                                <p className="text-sm text-slate-500">
                                    Hiển thị{" "}
                                    <span className="font-medium text-slate-700">
                                        {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                                    </span>
                                    -
                                    <span className="font-medium text-slate-700">
                                        {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)}
                                    </span>{" "}
                                    trong{" "}
                                    <span className="font-medium text-slate-700">{totalItems}</span>{" "}
                                    đối tác
                                </p>
                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage((p) => p - 1)}
                                    >
                                        <ChevronLeftIcon className="w-4 h-4" />
                                    </Button>
                                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                        let page: number;
                                        if (totalPages <= 5) {
                                            page = i + 1;
                                        } else if (currentPage <= 3) {
                                            page = i + 1;
                                        } else if (currentPage >= totalPages - 2) {
                                            page = totalPages - 4 + i;
                                        } else {
                                            page = currentPage - 2 + i;
                                        }
                                        return (
                                            <Button
                                                key={page}
                                                variant={currentPage === page ? "default" : "outline"}
                                                size="icon"
                                                className={`h-8 w-8 rounded-lg text-xs ${currentPage === page
                                                    ? "bg-[#0F766E] hover:bg-[#0D6B63] text-white"
                                                    : ""
                                                    }`}
                                                onClick={() => setCurrentPage(page)}
                                            >
                                                {page}
                                            </Button>
                                        );
                                    })}
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-8 w-8 rounded-lg"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage((p) => p + 1)}
                                    >
                                        <ChevronRightIcon className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ── Floating bulk action bar ── */}
                {selectedIds.length > 0 && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
                        <div className="flex items-center gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl">
                            <span className="text-sm">
                                Đã chọn <strong>{selectedIds.length}</strong> đối tác
                            </span>
                            <div className="w-px h-5 bg-slate-600" />
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-950/30"
                                onClick={() => setBulkDeleteOpen(true)}
                            >
                                <TrashIcon className="w-4 h-4 mr-1.5" />
                                Xóa
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-slate-300 hover:text-white"
                                onClick={() => setSelectedIds([])}
                            >
                                Bỏ chọn
                            </Button>
                        </div>
                    </div>
                )}

                {/* ════════════════════════════════════════════════ */}
                {/* CREATE / EDIT DIALOG */}
                {/* ════════════════════════════════════════════════ */}
                <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
                    <DialogContent className="sm:max-w-2xl p-0 gap-0 max-h-[90vh] flex flex-col">
                        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
                            <DialogTitle className="flex items-center gap-2">
                                {drawerMode === "create" ? (
                                    <>
                                        <PlusIcon className="w-5 h-5 text-[#0F766E]" />
                                        Thêm đối tác mới
                                    </>
                                ) : (
                                    <>
                                        <PencilSquareIcon className="w-5 h-5 text-[#0F766E]" />
                                        Chỉnh sửa đối tác
                                    </>
                                )}
                            </DialogTitle>
                            <DialogDescription>
                                {drawerMode === "create"
                                    ? "Khai báo thông tin đối tác mới cho hệ thống kho"
                                    : `Cập nhật thông tin "${editTarget?.name}"`}
                            </DialogDescription>
                        </DialogHeader>

                        <ScrollArea className="flex-1 overflow-y-auto">
                            <div className="space-y-6 px-6 py-6">
                                {/* ── Section: Thông tin định danh ── */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <IdentificationIcon className="w-4 h-4" />
                                        Thông tin định danh
                                    </h3>

                                    {/* Type radio */}
                                    <div className="space-y-2">
                                        <Label>
                                            Phân loại <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="flex gap-3">
                                            <button
                                                type="button"
                                                onClick={() => setFormType("CUSTOMER")}
                                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${formType === "CUSTOMER"
                                                    ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                    }`}
                                            >
                                                <UserGroupIcon className="w-4 h-4" />
                                                Khách hàng
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => setFormType("SUPPLIER")}
                                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${formType === "SUPPLIER"
                                                    ? "border-blue-500 bg-blue-50 text-blue-700"
                                                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                                                    }`}
                                            >
                                                <BuildingOfficeIcon className="w-4 h-4" />
                                                Nhà cung cấp
                                            </button>
                                        </div>
                                    </div>

                                    {/* Name */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="partner-name">
                                            Tên đối tác <span className="text-red-500">*</span>
                                        </Label>
                                        <Input
                                            id="partner-name"
                                            placeholder="Nhập tên đối tác..."
                                            value={formName}
                                            onChange={(e) => setFormName(e.target.value)}
                                            className={`rounded-xl ${formErrors.name ? "border-red-400 focus:ring-red-400" : ""}`}
                                            autoFocus
                                        />
                                        {formErrors.name && (
                                            <p className="text-xs text-red-500">{formErrors.name}</p>
                                        )}
                                    </div>

                                    {/* Code + auto generate */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="partner-code">
                                            Mã đối tác <span className="text-red-500">*</span>
                                        </Label>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <Input
                                                    id="partner-code"
                                                    placeholder="Nhập mã đối tác..."
                                                    value={formCode}
                                                    onChange={(e) => setFormCode(e.target.value.toUpperCase())}
                                                    className={`rounded-xl ${formErrors.code ? "border-red-400 focus:ring-red-400" : ""}`}
                                                />
                                                {codeChecking && (
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        <div className="w-4 h-4 border-2 border-slate-300 border-t-[#0F766E] rounded-full animate-spin" />
                                                    </div>
                                                )}
                                            </div>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                className="rounded-xl shrink-0"
                                                onClick={generateCode}
                                                title="Tự động tạo mã"
                                            >
                                                <Sparkles className="w-4 h-4 mr-1.5" />
                                                Tự động
                                            </Button>
                                        </div>
                                        {formErrors.code && (
                                            <p className="text-xs text-red-500">{formErrors.code}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-slate-100" />

                                {/* ── Section: Thông tin liên hệ ── */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <PhoneIcon className="w-4 h-4" />
                                        Thông tin liên hệ
                                    </h3>

                                    {/* Phone */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="partner-phone">Số điện thoại</Label>
                                        <Input
                                            id="partner-phone"
                                            placeholder="Nhập số điện thoại..."
                                            value={formPhone}
                                            onChange={(e) => setFormPhone(e.target.value)}
                                            className={`rounded-xl ${formErrors.phone ? "border-red-400" : ""}`}
                                        />
                                        {formErrors.phone && (
                                            <p className="text-xs text-red-500">{formErrors.phone}</p>
                                        )}
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="partner-email">Email</Label>
                                        <Input
                                            id="partner-email"
                                            type="email"
                                            placeholder="Nhập email liên hệ..."
                                            value={formEmail}
                                            onChange={(e) => setFormEmail(e.target.value)}
                                            className={`rounded-xl ${formErrors.email ? "border-red-400 focus:ring-red-400" : ""}`}
                                        />
                                        {formErrors.email && (
                                            <p className="text-xs text-red-500">{formErrors.email}</p>
                                        )}
                                    </div>

                                    {/* Tax code */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="partner-tax">Mã số thuế</Label>
                                        <Input
                                            id="partner-tax"
                                            placeholder="Nhập mã số thuế..."
                                            value={formTaxCode}
                                            onChange={(e) => setFormTaxCode(e.target.value)}
                                            className={`rounded-xl ${formErrors.tax_code ? "border-red-400" : ""}`}
                                        />
                                        {formErrors.tax_code && (
                                            <p className="text-xs text-red-500">{formErrors.tax_code}</p>
                                        )}
                                    </div>
                                </div>

                                <div className="border-t border-slate-100" />

                                {/* ── Section: Địa chỉ ── */}
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                        <MapPinIcon className="w-4 h-4" />
                                        Địa chỉ
                                    </h3>

                                    {/* Province */}
                                    <div className="space-y-1.5">
                                        <Label>Tỉnh / Thành phố</Label>
                                        <Select
                                            value={selectedProvinceId}
                                            onValueChange={(v) => {
                                                setSelectedProvinceId(v);
                                                setFormWardId("");
                                            }}
                                        >
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue placeholder={loadingProvinces ? "Đang tải..." : "Chọn tỉnh/thành phố"} />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60">
                                                {provinces.map((p) => (
                                                    <SelectItem key={p.id} value={p.id}>
                                                        {p.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Ward (Phường/Xã) */}
                                    <div className="space-y-1.5">
                                        <Label>Phường / Xã</Label>
                                        <Select
                                            value={formWardId}
                                            onValueChange={setFormWardId}
                                            disabled={!selectedProvinceId}
                                        >
                                            <SelectTrigger className="rounded-xl">
                                                <SelectValue
                                                    placeholder={
                                                        !selectedProvinceId
                                                            ? "Chọn tỉnh/thành trước"
                                                            : loadingWards
                                                                ? "Đang tải..."
                                                                : "Chọn phường/xã"
                                                    }
                                                />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-60">
                                                {wards.map((w) => (
                                                    <SelectItem key={w.id} value={w.id}>
                                                        {w.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    {/* Address detail */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="partner-address">Số nhà, tên đường</Label>
                                        <Input
                                            id="partner-address"
                                            placeholder="Nhập địa chỉ chi tiết..."
                                            value={formAddressDetail}
                                            onChange={(e) => setFormAddressDetail(e.target.value)}
                                            className="rounded-xl"
                                        />
                                    </div>
                                </div>

                                <div className="border-t border-slate-100" />

                                {/* ── Active toggle ── */}
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div>
                                        <p className="text-sm font-medium text-slate-900">
                                            Đang giao dịch
                                        </p>
                                        <p className="text-xs text-slate-500 mt-0.5">
                                            Đối tác có thể xuất hiện khi tạo phiếu nhập/xuất
                                        </p>
                                    </div>
                                    <Switch
                                        checked={formActive}
                                        onCheckedChange={setFormActive}
                                    />
                                </div>
                            </div>
                        </ScrollArea>

                        <DialogFooter className="px-6 py-4 border-t border-slate-100 shrink-0">
                            <Button
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => setDrawerOpen(false)}
                            >
                                Hủy
                            </Button>
                            <Button
                                className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl"
                                onClick={drawerMode === "create" ? handleCreate : handleUpdate}
                                disabled={isSubmitting || codeChecking}
                            >
                                {isSubmitting
                                    ? "Đang lưu..."
                                    : drawerMode === "create"
                                        ? "Tạo đối tác"
                                        : "Lưu thay đổi"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── Delete single dialog ── */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Xác nhận xóa đối tác</DialogTitle>
                            <DialogDescription className="space-y-2">
                                <span>
                                    Bạn có chắc chắn muốn xóa đối tác &quot;{deleteTarget?.name}&quot;?
                                </span>
                                <span className="block text-amber-600 text-xs bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                                    Các phiếu nhập/xuất lịch sử liên quan vẫn sẽ được lưu trữ để đối soát.
                                </span>
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => setDeleteDialogOpen(false)}
                            >
                                Hủy
                            </Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                                onClick={handleDeleteConfirm}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Đang xóa..." : "Xóa đối tác"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── Bulk delete dialog ── */}
                <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Xóa nhiều đối tác</DialogTitle>
                            <DialogDescription className="space-y-2">
                                <span>
                                    Bạn có chắc chắn muốn xóa {selectedIds.length} đối tác đã chọn?
                                </span>
                                <span className="block text-amber-600 text-xs bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                                    Các phiếu nhập/xuất lịch sử liên quan vẫn sẽ được lưu trữ để đối soát.
                                </span>
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => setBulkDeleteOpen(false)}
                            >
                                Hủy
                            </Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                                onClick={handleBulkDelete}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Đang xóa..." : `Xóa ${selectedIds.length} đối tác`}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}

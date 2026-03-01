"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { UnitService } from "@/services/unit/unit.service";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/contexts/ToastContext";
import type { Unit, CreateUnitPayload, UpdateUnitPayload } from "@/services/unit/unit.types";

// ── shadcn/ui ──
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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

// ── Icons ──
import {
    MagnifyingGlassIcon,
    PlusIcon,
    PencilSquareIcon,
    TrashIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { Ruler } from "lucide-react";

// ── Service ──
const unitService = new UnitService();
const ITEMS_PER_PAGE = 15;

// ════════════════════════════════════════════════
// MAIN PAGE: Unit Management
// ════════════════════════════════════════════════
export default function UnitManagementPage() {
    const router = useRouter();
    const { showToast } = useToast();

    // ── Data state ──
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const debouncedKeywords = useDebounce(searchTerm, 500);
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);

    // ── Selection ──
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    // ── Dialogs ──
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Unit | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Unit | null>(null);

    // ── Form fields ──
    const [formName, setFormName] = useState("");
    const [formDescription, setFormDescription] = useState("");
    const [formMultiLang, setFormMultiLang] = useState(false);
    const [formActive, setFormActive] = useState(true);
    const [formErrors, setFormErrors] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Fetch units ──
    const fetchUnits = useCallback(async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }

            setLoading(true);
            const offset = (currentPage - 1) * ITEMS_PER_PAGE;
            const result = await unitService.list(token, {
                keywords: debouncedKeywords || undefined,
                limit: ITEMS_PER_PAGE,
                offset,
            });

            if (result?.data) {
                setUnits(result.data.items || []);
                setTotalItems(result.data.total || 0);
            }
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            if (error.message === "Unauthorized") { router.push("/login"); return; }
            showToast("Không thể tải danh sách đơn vị tính", "error");
        } finally {
            setLoading(false);
        }
    }, [debouncedKeywords, currentPage, router, showToast]);

    useEffect(() => { fetchUnits(); }, [fetchUnits]);
    useEffect(() => { setCurrentPage(1); }, [debouncedKeywords]);

    // ── Selection helpers ──
    const toggleSelection = (id: string) => {
        setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        setSelectedIds((prev) =>
            prev.length === units.length ? [] : units.map((u) => u.id)
        );
    };

    // ── Reset form ──
    const resetForm = () => {
        setFormName("");
        setFormDescription("");
        setFormMultiLang(false);
        setFormActive(true);
        setFormErrors({});
    };

    // ── Validate ──
    const validate = () => {
        const errs: Record<string, string> = {};
        if (!formName.trim()) errs.name = "Tên đơn vị là bắt buộc";
        if (formName.trim().length > 100) errs.name = "Tên đơn vị tối đa 100 ký tự";
        setFormErrors(errs);
        return Object.keys(errs).length === 0;
    };

    // ── Create ──
    const handleCreate = async () => {
        if (!validate()) return;
        setIsSubmitting(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            const payload: CreateUnitPayload = {
                name: formName.trim(),
                is_active: formActive,
                is_used_multiple_languages: formMultiLang,
            };
            if (formDescription.trim()) payload.description = formDescription.trim();

            await unitService.create(token, payload);
            showToast(`Đã tạo đơn vị "${formName}" thành công! 🎉`, "success");
            setCreateOpen(false);
            resetForm();
            fetchUnits();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Tạo đơn vị thất bại";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Open edit ──
    const openEdit = (unit: Unit) => {
        setEditTarget(unit);
        setFormName(unit.name || "");
        setFormDescription(unit.description || "");
        setFormMultiLang(unit.is_used_multiple_languages);
        setFormActive(unit.is_active);
        setFormErrors({});
        setEditOpen(true);
    };

    // ── Update ──
    const handleUpdate = async () => {
        if (!validate() || !editTarget) return;
        setIsSubmitting(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            const payload: UpdateUnitPayload = {
                name: formName.trim(),
                description: formDescription.trim() || undefined,
                is_active: formActive,
                is_used_multiple_languages: formMultiLang,
            };

            await unitService.update(token, editTarget.id, payload);
            showToast(`Đã cập nhật đơn vị "${formName}" thành công!`, "success");
            setEditOpen(false);
            setEditTarget(null);
            resetForm();
            fetchUnits();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Cập nhật thất bại";
            showToast(msg, "error");
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
            await unitService.delete(token, deleteTarget.id);
            showToast(`Đã xóa đơn vị "${deleteTarget.name}" 🗑️`, "success");
            setDeleteDialogOpen(false);
            setDeleteTarget(null);
            setSelectedIds([]);
            fetchUnits();
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
            await unitService.deleteMany(token, selectedIds);
            showToast(`Đã xóa ${selectedIds.length} đơn vị thành công! 🗑️`, "success");
            setBulkDeleteOpen(false);
            setSelectedIds([]);
            fetchUnits();
        } catch (err) {
            const msg = err instanceof Error ? err.message : "Xóa thất bại";
            showToast(msg, "error");
        } finally {
            setIsSubmitting(false);
        }
    };

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
                            <Ruler className="w-6 h-6 text-[#0F766E]" />
                            Quản lý Đơn vị tính
                        </h1>
                        <p className="text-slate-500 mt-1">
                            Khai báo danh mục đơn vị tính dùng chung cho toàn bộ tổ chức
                        </p>
                    </div>
                    <Button
                        className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl"
                        onClick={() => {
                            resetForm();
                            setCreateOpen(true);
                        }}
                    >
                        <PlusIcon className="w-4 h-4 mr-2" />
                        Thêm đơn vị
                    </Button>
                </div>

                {/* ── Search ── */}
                <Card className="shadow-premium rounded-3xl border-0">
                    <CardContent className="p-4 md:p-6">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Tìm kiếm theo tên hoặc mô tả đơn vị..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 h-10 rounded-xl"
                            />
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
                                                checked={selectedIds.length === units.length && units.length > 0}
                                                onChange={toggleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead className="font-semibold text-slate-700">Tên đơn vị</TableHead>
                                        <TableHead className="font-semibold text-slate-700">Mô tả</TableHead>
                                        <TableHead className="font-semibold text-slate-700 text-center">Đa ngôn ngữ</TableHead>
                                        <TableHead className="font-semibold text-slate-700 text-center">Trạng thái</TableHead>
                                        <TableHead className="font-semibold text-slate-700 text-center">Ngày tạo</TableHead>
                                        <TableHead className="font-semibold text-slate-700 text-right">Thao tác</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <TableRow key={i}>
                                                {Array.from({ length: 7 }).map((_, j) => (
                                                    <TableCell key={j}>
                                                        <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                                    </TableCell>
                                                ))}
                                            </TableRow>
                                        ))
                                    ) : units.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7}>
                                                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                                    <Ruler className="w-12 h-12 mb-3 opacity-30" />
                                                    <p className="text-base font-medium">Chưa có đơn vị tính nào</p>
                                                    <p className="text-sm mt-1">
                                                        Nhấn &quot;Thêm đơn vị&quot; để bắt đầu khai báo
                                                    </p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        units.map((unit) => (
                                            <TableRow
                                                key={unit.id}
                                                className="group hover:bg-slate-50/50 transition-colors"
                                            >
                                                <TableCell>
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-gray-300"
                                                        checked={selectedIds.includes(unit.id)}
                                                        onChange={() => toggleSelection(unit.id)}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-medium text-slate-900">
                                                        {unit.name || "—"}
                                                    </span>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-sm text-slate-500 line-clamp-1">
                                                        {unit.description || "—"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {unit.is_used_multiple_languages ? (
                                                        <Badge className="bg-blue-50 text-blue-700 border-blue-200 rounded-full text-xs">
                                                            Có
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-slate-400">Không</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    {unit.is_active ? (
                                                        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full text-xs">
                                                            Hoạt động
                                                        </Badge>
                                                    ) : (
                                                        <Badge className="bg-slate-100 text-slate-500 border-slate-200 rounded-full text-xs">
                                                            Tạm ngưng
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-center text-sm text-slate-500">
                                                    {new Date(unit.created_at).toLocaleDateString("vi-VN")}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-[#0F766E]"
                                                            onClick={() => openEdit(unit)}
                                                        >
                                                            <PencilSquareIcon className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-red-600"
                                                            onClick={() => {
                                                                setDeleteTarget(unit);
                                                                setDeleteDialogOpen(true);
                                                            }}
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
                                    đơn vị
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
                                Đã chọn <strong>{selectedIds.length}</strong> đơn vị
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
                {/* CREATE DIALOG */}
                {/* ════════════════════════════════════════════════ */}
                <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                    <DialogContent className="sm:max-w-md p-4">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Ruler className="w-5 h-5 text-[#0F766E]" />
                                Thêm đơn vị tính mới
                            </DialogTitle>
                            <DialogDescription>
                                Khai báo đơn vị tính dùng chung cho toàn bộ tổ chức
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            {/* Name */}
                            <div className="space-y-1.5">
                                <Label htmlFor="unit-name">
                                    Tên đơn vị <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="unit-name"
                                    placeholder="Nhập tên đơn vị..."
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className={`rounded-xl ${formErrors.name ? "border-red-400" : ""}`}
                                    autoFocus
                                />
                                {formErrors.name && (
                                    <p className="text-xs text-red-500">{formErrors.name}</p>
                                )}
                            </div>

                            {/* Description */}
                            <div className="space-y-1.5">
                                <Label htmlFor="unit-desc">Mô tả</Label>
                                <Textarea
                                    id="unit-desc"
                                    placeholder="Mô tả ngắn về đơn vị tính..."
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    className="rounded-xl resize-none"
                                    rows={2}
                                />
                            </div>

                            {/* Multi-language toggle */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">
                                        Hỗ trợ đa ngôn ngữ
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Cho phép nhập tên đơn vị theo nhiều ngôn ngữ (công ty đa quốc gia)
                                    </p>
                                </div>
                                <Switch
                                    checked={formMultiLang}
                                    onCheckedChange={setFormMultiLang}
                                />
                            </div>

                            {/* Active toggle */}
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">
                                        Đang hoạt động
                                    </p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Đơn vị có thể được chọn khi tạo sản phẩm
                                    </p>
                                </div>
                                <Switch
                                    checked={formActive}
                                    onCheckedChange={setFormActive}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                variant="outline"
                                className="rounded-xl"
                                onClick={() => setCreateOpen(false)}
                            >
                                Hủy
                            </Button>
                            <Button
                                className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl"
                                onClick={handleCreate}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Đang tạo..." : "Tạo đơn vị"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ════════════════════════════════════════════════ */}
                {/* EDIT DIALOG */}
                {/* ════════════════════════════════════════════════ */}
                <Dialog open={editOpen} onOpenChange={setEditOpen}>
                    <DialogContent className="sm:max-w-md p-4">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <PencilSquareIcon className="w-5 h-5 text-[#0F766E]" />
                                Chỉnh sửa đơn vị tính
                            </DialogTitle>
                            <DialogDescription>
                                Cập nhật thông tin đơn vị &quot;{editTarget?.name}&quot;
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-unit-name">
                                    Tên đơn vị <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="edit-unit-name"
                                    placeholder="Nhập tên đơn vị..."
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className={`rounded-xl ${formErrors.name ? "border-red-400" : ""}`}
                                    autoFocus
                                />
                                {formErrors.name && (
                                    <p className="text-xs text-red-500">{formErrors.name}</p>
                                )}
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="edit-unit-desc">Mô tả</Label>
                                <Textarea
                                    id="edit-unit-desc"
                                    placeholder="Mô tả ngắn..."
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    className="rounded-xl resize-none"
                                    rows={2}
                                />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Hỗ trợ đa ngôn ngữ</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Cho phép nhập tên đơn vị theo nhiều ngôn ngữ
                                    </p>
                                </div>
                                <Switch checked={formMultiLang} onCheckedChange={setFormMultiLang} />
                            </div>
                            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <p className="text-sm font-medium text-slate-900">Đang hoạt động</p>
                                    <p className="text-xs text-slate-500 mt-0.5">
                                        Đơn vị có thể được chọn khi tạo sản phẩm
                                    </p>
                                </div>
                                <Switch checked={formActive} onCheckedChange={setFormActive} />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" className="rounded-xl" onClick={() => setEditOpen(false)}>
                                Hủy
                            </Button>
                            <Button
                                className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl"
                                onClick={handleUpdate}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── Delete single dialog ── */}
                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Xác nhận xóa đơn vị</DialogTitle>
                            <DialogDescription>
                                Bạn có chắc chắn muốn xóa đơn vị &quot;{deleteTarget?.name}&quot;?
                                Không thể xóa đơn vị đang được sử dụng bởi sản phẩm.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" className="rounded-xl" onClick={() => setDeleteDialogOpen(false)}>
                                Hủy
                            </Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                                onClick={handleDeleteConfirm}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Đang xóa..." : "Xóa đơn vị"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* ── Bulk delete dialog ── */}
                <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Xóa nhiều đơn vị</DialogTitle>
                            <DialogDescription>
                                Bạn có chắc chắn muốn xóa {selectedIds.length} đơn vị đã chọn?
                                Không thể xóa đơn vị đang được sử dụng bởi sản phẩm.
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button variant="outline" className="rounded-xl" onClick={() => setBulkDeleteOpen(false)}>
                                Hủy
                            </Button>
                            <Button
                                className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
                                onClick={handleBulkDelete}
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Đang xóa..." : `Xóa ${selectedIds.length} đơn vị`}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </main>
        </div>
    );
}

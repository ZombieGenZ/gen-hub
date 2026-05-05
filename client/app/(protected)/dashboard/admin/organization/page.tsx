"use client";

import React, { useEffect, useState, useCallback } from "react";
import { OrganizationService } from "@/services/organization/organization.service";
import { Organization, OrganizationResponse } from "@/types/organization/organization.type";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useDebounce } from "@/hooks/use-debounce";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { CreateOrganizationDialog, CreateOrgFormData } from "@/components/organization/CreateOrganizationDialog";
import {
    Plus, Search, Building2, ChevronRight, Loader2,
    Users, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";

const organizationService = new OrganizationService();
const PAGE_SIZE = 15;

export default function OrganizationPage() {
    const router = useRouter();
    const [data, setData] = useState<OrganizationResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
    const [page, setPage] = useState(1);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);

    const fetchOrganizations = useCallback(async () => {
        setLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }
            const params: Record<string, any> = {
                limit: PAGE_SIZE,
                offset: (page - 1) * PAGE_SIZE,
                keywords: debouncedSearch || undefined,
            };
            if (statusFilter === "active") params.is_active = true;
            if (statusFilter === "inactive") params.is_active = false;
            const response = await organizationService.getOrganizations(token, params);
            setData(response);
        } catch (error: any) {
            console.error("Fetch organizations error", error);
            toast.error(error.message || "Không thể tải danh sách tổ chức");
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, statusFilter, page, router]);

    useEffect(() => {
        setPage(1);
    }, [debouncedSearch, statusFilter]);

    useEffect(() => {
        fetchOrganizations();
    }, [fetchOrganizations]);

    const handleCreateOrg = async (formData: CreateOrgFormData) => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await organizationService.createOrganization(token, {
                name: formData.name,
                tax_code: "",
                representative_name: "",
                representative_title: "",
                representative_phone: "",
                representative_email: "",
            });
            toast.success(`Đã tạo tổ chức "${formData.name}" thành công`);
            await fetchOrganizations();
        } catch (error: any) {
            console.error("Create organization error", error);
            toast.error(error.message || "Không thể tạo tổ chức mới");
        }
    };

    const items = data?.items ?? [];
    const total = data?.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    const startItem = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
    const endItem = Math.min(page * PAGE_SIZE, total);

    const TABS = [
        { key: "all", label: "Tất cả" },
        { key: "active", label: "Hoạt động" },
        { key: "inactive", label: "Ngừng hoạt động" },
    ] as const;

    return (
        <div className="flex-1 bg-slate-50/50">
            <main className="p-4 md:p-8 space-y-6">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Tổ chức</h1>
                        <p className="text-sm text-slate-500 mt-1">
                            Quản lý tổ chức, thành viên và vai trò trên hệ thống
                        </p>
                    </div>
                    <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 shrink-0">
                        <Plus className="w-4 h-4" />
                        Tạo tổ chức
                    </Button>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                placeholder="Tìm theo tên tổ chức..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 rounded-xl h-9 text-sm border-slate-200"
                            />
                        </div>
                        {/* Status tabs */}
                        <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
                            {TABS.map((tab) => (
                                <button
                                    key={tab.key}
                                    onClick={() => setStatusFilter(tab.key)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                                        statusFilter === tab.key
                                            ? "bg-white text-slate-900 shadow-sm"
                                            : "text-slate-500 hover:text-slate-700"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Table */}
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="font-semibold text-slate-700">Tổ chức</TableHead>
                                <TableHead className="font-semibold text-slate-700">Chủ sở hữu</TableHead>
                                <TableHead className="font-semibold text-slate-700">Thành viên</TableHead>
                                <TableHead className="font-semibold text-slate-700">Trạng thái</TableHead>
                                <TableHead className="font-semibold text-slate-700">Ngày tạo</TableHead>
                                <TableHead />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-16 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-400">
                                            <Loader2 className="w-7 h-7 animate-spin" />
                                            <span className="text-sm">Đang tải...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : items.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="py-16 text-center">
                                        <Building2 className="w-10 h-10 mx-auto text-slate-200 mb-3" />
                                        <p className="text-sm text-slate-400 font-medium">Không tìm thấy tổ chức nào</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                items.map((org) => (
                                    <TableRow
                                        key={org.id}
                                        onClick={() => router.push(`/dashboard/admin/organization/${org.id}/settings`)}
                                        className="cursor-pointer hover:bg-slate-50/60 transition-colors"
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 font-bold text-sm shrink-0">
                                                    {org.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-slate-900 text-sm">{org.name}</p>
                                                    {org.international_name && (
                                                        <p className="text-xs text-slate-400 mt-0.5">{org.international_name}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="text-sm text-slate-700">{org.owner?.name || "—"}</p>
                                                <p className="text-xs text-slate-400 mt-0.5">{org.owner?.email || ""}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5 text-sm text-slate-600">
                                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                                {org._count?.members ?? 0}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {org.is_active ? (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs gap-1">
                                                    <CheckCircle2 className="w-3 h-3" />Hoạt động
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-xs gap-1">
                                                    <XCircle className="w-3 h-3" />Ngừng
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-500">
                                            {new Date(org.created_at).toLocaleDateString("vi-VN", {
                                                year: "numeric", month: "short", day: "numeric",
                                            })}
                                        </TableCell>
                                        <TableCell>
                                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 ml-auto" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {!loading && total > 0 && (
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-4">
                            <p className="text-sm text-slate-500">
                                Hiển thị <span className="font-medium text-slate-700">{startItem}–{endItem}</span> / <span className="font-medium text-slate-700">{total}</span> tổ chức
                            </p>
                            <div className="flex items-center gap-1">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page <= 1}
                                    className="rounded-xl h-8 px-3 text-xs"
                                >
                                    Trước
                                </Button>
                                <span className="text-sm text-slate-600 px-2 font-medium">{page} / {totalPages}</span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="rounded-xl h-8 px-3 text-xs"
                                >
                                    Sau
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <CreateOrganizationDialog
                open={createDialogOpen}
                onOpenChange={setCreateDialogOpen}
                onSubmit={handleCreateOrg}
            />
        </div>
    );
}

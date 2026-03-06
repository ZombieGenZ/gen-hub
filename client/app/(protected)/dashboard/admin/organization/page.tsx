"use client";

import React, { useEffect, useState, useMemo } from "react";
import { OrganizationService } from "@/services/organization/organization.service";
import { Organization } from "@/types/organization/organization.type";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useDebounce } from "@/hooks/use-debounce";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateOrganizationDialog, CreateOrgFormData } from "@/components/organization/CreateOrganizationDialog";
import {
    Plus,
    Search,
    Building2,
    ArrowUpDown,
    ChevronRight,
    Loader2,
} from "lucide-react";

const organizationService = new OrganizationService();

export default function OrganizationPage() {
    const router = useRouter();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [sortField, setSortField] = useState<"name" | "members" | "created">("created");
    const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

    const fetchOrganizations = async () => {
        setLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }
            const response = await organizationService.getOrganizations(token, {
                limit: 50,
                keywords: debouncedSearch || undefined,
            });
            if (!Array.isArray(response.items)) {
                throw new Error("Expected an array of organizations");
            }
            setOrganizations(response.items);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrganizations();
    }, [debouncedSearch]);

    const sortedOrganizations = useMemo(() => {
        const sorted = [...organizations];
        sorted.sort((a, b) => {
            let diff = 0;
            if (sortField === "name") {
                diff = a.name.localeCompare(b.name);
            } else if (sortField === "members") {
                diff = (a._count?.members || 0) - (b._count?.members || 0);
            } else {
                diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }
            return sortDir === "asc" ? diff : -diff;
        });
        return sorted;
    }, [organizations, sortField, sortDir]);

    const pageSize = 10;
    const totalPages = Math.max(1, Math.ceil(sortedOrganizations.length / pageSize));
    const paginatedOrgs = sortedOrganizations.slice((page - 1) * pageSize, page * pageSize);

    const handleCreateOrg = async (data: CreateOrgFormData) => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        await organizationService.createOrganization(token, {
            name: data.name,
            tax_code: "",
            representative_name: "",
            representative_title: "",
            representative_phone: "",
            representative_email: "",
        });
        await fetchOrganizations();
    };

    const handleRowClick = (orgId: string) => {
        router.push(`/dashboard/admin/organization/${orgId}/settings`);
    };

    return (
        <div className="flex-1 bg-slate-50/50">
            <main className="p-4 md:p-8 space-y-6">
                {/* Breadcrumb */}
                <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <span className="text-foreground font-medium">Tổ chức</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span>Tổng quan</span>
                </nav>

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Tổ chức</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Tạo và quản lý tổ chức, cài đặt và thành viên
                        </p>
                    </div>
                    <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                        <Plus className="w-4 h-4" />
                        Tạo tổ chức
                    </Button>
                </div>

                {/* Manage Organizations Card */}
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    {/* Toolbar */}
                    <div className="p-4 border-b border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Tìm kiếm..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                                className="pl-10"
                            />
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-1.5">
                                    <ArrowUpDown className="w-3.5 h-3.5" />
                                    Sắp xếp
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                    onClick={() => { setSortField("created"); setSortDir("desc"); }}
                                    className="cursor-pointer"
                                >
                                    Ngày tạo ↓
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => { setSortField("created"); setSortDir("asc"); }}
                                    className="cursor-pointer"
                                >
                                    Ngày tạo ↑
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => { setSortField("name"); setSortDir("asc"); }}
                                    className="cursor-pointer"
                                >
                                    Tên A-Z
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    onClick={() => { setSortField("members"); setSortDir("desc"); }}
                                    className="cursor-pointer"
                                >
                                    Thành viên ↓
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-muted/30 border-b border-border/30">
                                <tr>
                                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Tên
                                    </th>
                                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        ID
                                    </th>
                                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Thành viên
                                    </th>
                                    <th className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        <button
                                            onClick={() => {
                                                setSortField("created");
                                                setSortDir((d) => (d === "asc" ? "desc" : "asc"));
                                            }}
                                            className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                                        >
                                            Ngày tạo
                                            <ArrowUpDown className="w-3 h-3" />
                                        </button>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-16 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center gap-3">
                                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                                <p className="text-sm font-medium">Đang tải dữ liệu...</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : paginatedOrgs.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-16 text-center text-muted-foreground">
                                            <Building2 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                                            <p className="font-medium">Không tìm thấy tổ chức nào.</p>
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedOrgs.map((org) => (
                                        <tr
                                            key={org.id}
                                            onClick={() => handleRowClick(org.id)}
                                            className="hover:bg-muted/20 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                        {org.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-medium text-foreground">
                                                        {org.name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <code className="text-xs text-muted-foreground font-mono">
                                                    {org.id.length > 24 ? `${org.id.substring(0, 24)}...` : org.id}
                                                </code>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                {org._count?.members || 0}
                                            </td>
                                            <td className="px-6 py-4 text-sm text-muted-foreground">
                                                {new Date(org.created_at).toLocaleDateString("vi-VN", {
                                                    year: "numeric",
                                                    month: "short",
                                                    day: "numeric",
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    <div className="px-6 py-4 border-t border-border/30 flex items-center justify-end gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={page <= 1}
                                className="hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Trước
                            </button>
                            <span className="font-medium text-foreground">{page}</span>
                            <button
                                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                disabled={page >= totalPages}
                                className="hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                Sau
                            </button>
                        </div>
                    </div>
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
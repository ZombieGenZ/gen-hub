"use client";

import React, { useState, useEffect, useMemo } from "react";
import { ContactListService } from "@/services/contact-list/contact-list.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import {
    ContactListEntry,
    ContactListType,
    ContactListMatchType,
} from "@/types/contact/contact-list.type";
import { StatCard } from "@/components/dashboard/StatCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    PlusIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    EllipsisHorizontalIcon,
    TrashIcon,
    PencilSquareIcon,
    NoSymbolIcon,
    CheckCircleIcon,
    ShieldCheckIcon,
    GlobeAltIcon,
    ComputerDesktopIcon,
    EnvelopeIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { CreateRuleDialog } from "./components/create-rule-dialog";
import { EditRuleDialog } from "./components/edit-rule-dialog";
import { TablePagination } from "@/components/ui/table-pagination";

const contactListService = new ContactListService();

export default function ContactFilteringPage() {
    const [entries, setEntries] = useState<ContactListEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [search, setSearch] = useState("");
    const [listType, setListType] = useState<ContactListType | "ALL">("ALL");
    const [matchType, setMatchType] = useState<ContactListMatchType | "ALL">("ALL");

    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<ContactListEntry | null>(null);

    const fetchEntries = async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) return;

            const response = await contactListService.getAll(token, {
                page,
                limit,
                search,
                list_type: listType === "ALL" ? undefined : listType,
                match_type: matchType === "ALL" ? undefined : matchType,
                sort_by: "created_at",
                sort_order: "DESC",
            });

            if (response && response.data) {
                setEntries(response.data.items || []);
                if (response.data.total !== undefined) {
                    setTotal(response.data.total);
                }
            }
        } catch (error) {
            console.error("Failed to fetch contact list", error);
            toast.error("Không thể tải danh sách lọc");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEntries();
    }, [page, limit, search, listType, matchType]);

    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa quy tắc này?")) return;

        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            await contactListService.delete(token, id);
            toast.success("Đã xóa quy tắc thành công");
            fetchEntries();
        } catch (error) {
            console.error("Failed to delete entry", error);
            toast.error("Không thể xóa quy tắc");
        }
    };

    const handleToggleActive = async (entry: ContactListEntry) => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            await contactListService.update(token, entry.id, {
                is_active: !entry.is_active,
            });
            toast.success(`Đã ${!entry.is_active ? "bật" : "tắt"} quy tắc`);
            fetchEntries();
        } catch (error) {
            console.error("Failed to update entry", error);
            toast.error("Không thể cập nhật quy tắc");
        }
    };

    const stats = useMemo(() => {
        // Note: Ideally, stats should come from a dedicated API endpoint or be calculated from all data.
        // For now, we only have paginated data, so accurate total stats might need a separate API call later.
        // We'll just display totals from meta if available, or placeholder/client-side count.
        // Let's assume for now we just show total rule count.
        return {
            totalRules: total,
            blacklistCount: entries.filter(e => e.list_type === ContactListType.BLACKLIST).length, // approximate for current page
        };
    }, [entries, total]);

    const getMatchTypeIcon = (type: ContactListMatchType) => {
        switch (type) {
            case ContactListMatchType.EMAIL:
            case ContactListMatchType.EMAIL_DOMAIN:
                return <EnvelopeIcon className="w-4 h-4" />;
            case ContactListMatchType.IP_V4:
            case ContactListMatchType.IP_V6:
                return <ComputerDesktopIcon className="w-4 h-4" />;
            case ContactListMatchType.REGION_COUNTRY:
            case ContactListMatchType.REGION_CITY:
                return <GlobeAltIcon className="w-4 h-4" />;
            default:
                return <ShieldCheckIcon className="w-4 h-4" />;
        }
    };

    const totalPages = Math.ceil(total / limit);

    return (
        <div className="space-y-6 p-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="font-bold text-slate-900" style={{ fontSize: "32px", lineHeight: "130%" }}>
                        Bộ lọc liên hệ
                    </h1>
                    <p className="text-slate-500 mt-1" style={{ fontSize: "16px", lineHeight: "150%" }}>
                        Quản lý Blacklist và Whitelist để lọc tin nhắn rác và ưu tiên khách hàng.
                    </p>
                </div>
                <Button onClick={() => setIsCreateDialogOpen(true)} className="gap-2" style={{ borderRadius: "12px" }}>
                    <PlusIcon className="w-4 h-4" />
                    Thêm quy tắc
                </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <StatCard
                    title="Tổng quy tắc"
                    value={total}
                    icon={ShieldCheckIcon as any}
                    variant="brand"
                    description="Tổng số quy tắc đang hoạt động"
                />
                {/* Add more stats if API supports it */}
            </div>

            {/* Filters */}
            <div className="bg-white p-4 shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between" style={{ borderRadius: "16px" }}>
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative w-full md:w-64">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm giá trị, lý do..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ borderRadius: "12px" }}
                        />
                    </div>
                    <Select value={listType} onValueChange={(v) => setListType(v as any)}>
                        <SelectTrigger className="w-[140px]" style={{ borderRadius: "12px" }}>
                            <SelectValue placeholder="Loại danh sách" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tất cả loại</SelectItem>
                            <SelectItem value={ContactListType.BLACKLIST}>Blacklist</SelectItem>
                            <SelectItem value={ContactListType.WHITELIST}>Whitelist</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={matchType} onValueChange={(v) => setMatchType(v as any)}>
                        <SelectTrigger className="w-[140px]" style={{ borderRadius: "12px" }}>
                            <SelectValue placeholder="Loại khớp" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="ALL">Tất cả khớp</SelectItem>
                            <SelectItem value={ContactListMatchType.EMAIL}>Email</SelectItem>
                            <SelectItem value={ContactListMatchType.EMAIL_DOMAIN}>Domain</SelectItem>
                            <SelectItem value={ContactListMatchType.IP_V4}>IPv4</SelectItem>
                            {/* Add other types */}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white shadow-premium overflow-hidden" style={{ borderRadius: "24px" }}>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Giá trị</TableHead>
                            <TableHead>Loại</TableHead>
                            <TableHead>Lý do</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Ngày tạo</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                    Đang tải dữ liệu...
                                </TableCell>
                            </TableRow>
                        ) : entries.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                    Không có quy tắc nào
                                </TableCell>
                            </TableRow>
                        ) : (
                            entries.map((entry) => (
                                <TableRow key={entry.id}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            {getMatchTypeIcon(entry.match_type)}
                                            <span className="truncate max-w-[200px]" title={entry.value}>
                                                {entry.value}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={entry.list_type === ContactListType.BLACKLIST ? "destructive" : "default"}
                                            className="uppercase text-[10px]"
                                        >
                                            {entry.list_type}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500 max-w-[200px] truncate" title={entry.reason}>
                                        {entry.reason || "-"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={entry.is_active ? "secondary" : "outline"}
                                            className={entry.is_active ? "bg-green-50 text-green-700 hover:bg-green-100" : "text-slate-500"}
                                        >
                                            {entry.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-slate-500 text-sm">
                                        {format(new Date(entry.created_at), "dd/MM/yyyy", { locale: vi })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <EllipsisHorizontalIcon className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setEditingEntry(entry)}>
                                                    <PencilSquareIcon className="w-4 h-4 mr-2" />
                                                    Chỉnh sửa
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleToggleActive(entry)}>
                                                    {entry.is_active ? (
                                                        <>
                                                            <NoSymbolIcon className="w-4 h-4 mr-2" /> Vô hiệu hóa
                                                        </>
                                                    ) : (
                                                        <>
                                                            <CheckCircleIcon className="w-4 h-4 mr-2" /> Kích hoạt
                                                        </>
                                                    )}
                                                </DropdownMenuItem>
                                                <DropdownMenuItem
                                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                                    onClick={() => handleDelete(entry.id)}
                                                >
                                                    <TrashIcon className="w-4 h-4 mr-2" />
                                                    Xóa
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
                <div>
                    <TablePagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={total}
                        itemsPerPage={limit}
                        onPageChange={setPage}
                    />
                </div>
            )}

            <CreateRuleDialog
                open={isCreateDialogOpen}
                onOpenChange={setIsCreateDialogOpen}
                onSuccess={fetchEntries}
            />

            {editingEntry && (
                <EditRuleDialog
                    open={!!editingEntry}
                    onOpenChange={(open) => !open && setEditingEntry(null)}
                    entry={editingEntry}
                    onSuccess={fetchEntries}
                />
            )}
        </div>
    );
}

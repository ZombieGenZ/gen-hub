"use client";

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Search, Eye, AlertTriangle, CheckCircle2, Clock, XCircle,
    ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    UserManagementService,
    type User,
} from "@/services/user-management/user-management.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useToast } from "@/contexts/ToastContext";
const svc = new UserManagementService();
const LIMIT = 20;

type StatusFilter = "all" | "active" | "banned" | "unverified";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "active", label: "Hoạt động" },
    { key: "banned", label: "Bị khóa" },
    { key: "unverified", label: "Chưa xác thực" },
];

function StatusBadge({ user }: { user: User }) {
    if (user.is_banned)
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs gap-1"><XCircle className="w-3 h-3" />Bị khóa</Badge>;
    if (!user.is_verified)
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 text-xs gap-1"><Clock className="w-3 h-3" />Chưa xác thực</Badge>;
    if (user.warning_count > 0)
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs gap-1"><AlertTriangle className="w-3 h-3" />{user.warning_count} cảnh cáo</Badge>;
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs gap-1"><CheckCircle2 className="w-3 h-3" />Hoạt động</Badge>;
}

export default function CustomersPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchUsers = async (kw = searchTerm, status = statusFilter, off = offset) => {
        setIsLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const query: any = { keywords: kw, limit: LIMIT, offset: off };
            if (status !== "all") query.status = status;
            const res = await svc.findMany(token, query);
            setUsers(res?.data?.items ?? []);
            setTotal(res?.data?.total ?? 0);
        } catch (err: any) {
            showToast(err.message || "Không thể tải danh sách khách hàng", "error");
            setUsers([]);
            setTotal(0);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { setOffset(0); }, [searchTerm, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(() => fetchUsers(searchTerm, statusFilter, offset), 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, statusFilter, offset]);

    const totalPages = Math.ceil(total / LIMIT);
    const currentPage = Math.floor(offset / LIMIT) + 1;

    return (
        <div className="flex flex-col flex-1 h-full bg-slate-50/50">
            <main className="flex-1 p-4 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Khách hàng</h1>
                        <p className="text-sm text-slate-500 mt-1">Quản lý thông tin khách hàng</p>
                    </div>
                </div>

                {/* Search + Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm theo tên, email..."
                            className="pl-9 h-9 bg-white border-slate-200 rounded-xl text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-xl">
                        {STATUS_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setStatusFilter(tab.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    statusFilter === tab.key
                                        ? "bg-slate-900 text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="font-semibold text-slate-700">Khách hàng</TableHead>
                                <TableHead className="font-semibold text-slate-700">Số điện thoại</TableHead>
                                <TableHead className="font-semibold text-slate-700">Cảnh cáo</TableHead>
                                <TableHead className="font-semibold text-slate-700">Trạng thái</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-slate-400 text-sm">Đang tải dữ liệu...</TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-slate-400 text-sm">Không tìm thấy khách hàng nào</TableCell>
                                </TableRow>
                            ) : users.map((user) => (
                                <TableRow key={user.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-semibold text-sm shrink-0">
                                                {(user.name || user.full_name || user.email || "?").charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900 text-sm">{user.name || user.full_name || "—"}</div>
                                                <div className="text-xs text-slate-500">{user.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600">{user.phone || "—"}</TableCell>
                                    <TableCell>
                                        {user.warning_count > 0 ? (
                                            <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs gap-1">
                                                <AlertTriangle className="w-3 h-3" />{user.warning_count}
                                            </Badge>
                                        ) : <span className="text-xs text-slate-400">—</span>}
                                    </TableCell>
                                    <TableCell><StatusBadge user={user} /></TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-xl"
                                            onClick={() => router.push(`/dashboard/admin/customers/${user.id}`)}
                                        >
                                            <Eye className="w-4 h-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {total > LIMIT && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                            <p className="text-xs text-slate-500">
                                {offset + 1}–{Math.min(offset + LIMIT, total)} / {total} khách hàng
                            </p>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg"
                                    disabled={offset === 0 || isLoading}
                                    onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <div className="flex items-center px-3 text-xs font-medium text-slate-700">
                                    {currentPage} / {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg"
                                    disabled={offset + LIMIT >= total || isLoading}
                                    onClick={() => setOffset(offset + LIMIT)}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

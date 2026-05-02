"use client";

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Eye, AlertTriangle, CheckCircle2, Clock, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    UserManagementService,
    type User,
} from "@/services/user-management/user-management.service";
import { authStorage } from "@/services/auth/auth-storage.service";

const svc = new UserManagementService();

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
    const [searchTerm, setSearchTerm] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUsers = async (keywords = "") => {
        setIsLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const res = await svc.findMany(token, { keywords, limit: 50 });
            setUsers(res?.data?.items ?? (res as any)?.items ?? []);
        } catch {
            setUsers([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => fetchUsers(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

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

                {/* Search */}
                <div className="mb-6">
                    <div className="relative w-full max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm theo tên, email..."
                            className="pl-9 h-9 bg-white border-slate-200 rounded-xl text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
                                        ) : (
                                            <span className="text-xs text-slate-400">—</span>
                                        )}
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
                </div>
            </main>
        </div>
    );
}

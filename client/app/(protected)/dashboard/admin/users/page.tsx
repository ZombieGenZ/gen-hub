"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Plus,
    MoreHorizontal,
    ShieldCheck,
    MapPin,
    User
} from "lucide-react";
import { useState, useEffect } from "react";
import { UserService } from "@/services/user/user.service";
import { authStorage } from "@/services/auth/auth-storage.service";

export default function StaffPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [staffList, setStaffList] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStaff = async () => {
            setIsLoading(true);
            try {
                const token = authStorage.getAccessToken();
                if (!token) return;
                const userService = new UserService();
                const users = await userService.searchUsers(token, searchTerm);
                setStaffList(users || []);
            } catch (error) {
                console.error("Failed to fetch staff", error);
                setStaffList([]);
            } finally {
                setIsLoading(false);
            }
        };

        const debounceTimer = setTimeout(fetchStaff, 300);
        return () => clearTimeout(debounceTimer);
    }, [searchTerm]);

    return (
        <div className="flex flex-col flex-1 h-full bg-slate-50/50">
            <main className="flex-1 p-4 md:p-8">
                <div className="mb-6">
                    <div className="relative w-full max-w-xl hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm nhân viên..."
                            className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white focus:ring-brand/20 transition-all rounded-xl text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Nhân viên</h1>
                        <p className="text-sm text-slate-500 mt-1">Quản lý nhân sự và phân quyền truy cập</p>
                    </div>
                    <Button className="bg-brand hover:bg-brand-hover text-white gap-2 rounded-xl shadow-sm shadow-brand/20">
                        <Plus className="w-4 h-4" />
                        Thêm nhân viên
                    </Button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="font-semibold text-slate-700">Nhân viên</TableHead>
                                <TableHead className="font-semibold text-slate-700">Vai trò</TableHead>
                                <TableHead className="font-semibold text-slate-700">Kho phụ trách</TableHead>
                                <TableHead className="font-semibold text-slate-700">Trạng thái</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">Đang tải dữ liệu...</TableCell>
                                </TableRow>
                            ) : staffList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8 text-slate-500">Không tìm thấy nhân viên</TableCell>
                                </TableRow>
                            ) : staffList.map((staff) => (
                                <TableRow key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">{staff.name || 'N/A'}</div>
                                                <div className="text-xs text-slate-500">{staff.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {(!staff.roles || staff.roles.length === 0) && <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200">Nhân viên</Badge>}
                                            {staff.roles?.some((r: any) => r.name === 'admin' || r.name === 'ADMIN') && <Badge className="bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100">Quản trị viên</Badge>}
                                            {staff.roles?.some((r: any) => r.name === 'manager' || r.name === 'MANAGER') && <Badge className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100">Quản lý</Badge>}
                                            {staff.roles?.some((r: any) => r.name === 'viewer' || r.name === 'VIEWER') && <Badge className="bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100">Người xem</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                            {staff.warehouse || 'Hệ thống'}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {staff.status === 'active' || staff.is_active || staff.email_confirmed ? (
                                            <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                                                <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                                                Hoạt động
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                Chưa xác thực
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-xl">
                                            <MoreHorizontal className="w-4 h-4" />
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

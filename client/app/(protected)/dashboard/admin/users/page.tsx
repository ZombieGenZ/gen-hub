"use client";

import { DashboardHeader } from "@/components/layouts/DashboardHeader";
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
import { useState } from "react";

// Mock Data
const MOCK_STAFF = [
    { id: "NV001", name: "Trần Văn Quản", email: "admin.sys@genhub.vn", role: "admin", warehouse: "Tất cả", status: "active" },
    { id: "NV002", name: "Lê Thị Kho", email: "lethikho@genhub.vn", role: "manager", warehouse: "Kho Bình Dương A1", status: "active" },
    { id: "NV003", name: "Phạm Giám Sát", email: "giam.sat@genhub.vn", role: "viewer", warehouse: "Kho Đồng Nai B2", status: "active" },
    { id: "NV004", name: "Nguyễn Nhân Viên", email: "nv.moi@genhub.vn", role: "staff", warehouse: "Kho Long An C1", status: "inactive" },
];

export default function StaffPage() {
    const [searchTerm, setSearchTerm] = useState("");

    return (
        <div className="flex flex-col flex-1 h-full bg-slate-50/50">
            <DashboardHeader>
                <div className="relative w-full max-w-xl hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Tìm kiếm nhân viên..."
                        className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white focus:ring-brand/20 transition-all rounded-lg text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </DashboardHeader>

            <main className="flex-1 p-4 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Nhân viên</h1>
                        <p className="text-sm text-slate-500 mt-1">Quản lý nhân sự và phân quyền truy cập</p>
                    </div>
                    <Button className="bg-brand hover:bg-brand-hover text-white gap-2 rounded-lg shadow-sm shadow-brand/20">
                        <Plus className="w-4 h-4" />
                        Thêm nhân viên
                    </Button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
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
                            {MOCK_STAFF.map((staff) => (
                                <TableRow key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                                <User className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <div className="font-medium text-slate-900">{staff.name}</div>
                                                <div className="text-xs text-slate-500">{staff.email}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {staff.role === 'admin' && <Badge className="bg-purple-50 text-purple-600 border-purple-100 hover:bg-purple-100">Quản trị viên</Badge>}
                                            {staff.role === 'manager' && <Badge className="bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100">Quản lý</Badge>}
                                            {staff.role === 'staff' && <Badge className="bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200">Nhân viên</Badge>}
                                            {staff.role === 'viewer' && <Badge className="bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100">Người xem</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1.5 text-slate-600 text-sm">
                                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                            {staff.warehouse}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {staff.status === 'active' ? (
                                            <span className="flex items-center gap-1.5 text-xs font-medium text-success">
                                                <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
                                                Hoạt động
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                                                <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                                                Nghỉ việc
                                            </span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-lg">
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

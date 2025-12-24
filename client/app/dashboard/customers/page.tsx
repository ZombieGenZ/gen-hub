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
    Filter,
    MoreVertical,
    Eye,
    Shield,
    Lock
} from "lucide-react";
import { useState } from "react";

// Mock Data
const MOCK_CUSTOMERS = [
    { id: "KH001", name: "Công ty TNHH ABC", email: "contact@abc.com", phone: "0901234567", contracts: 3, status: "active" },
    { id: "KH002", name: "Tập đoàn XYZ", email: "info@xyz.corp", phone: "0912345678", contracts: 12, status: "active" },
    { id: "KH003", name: "Nguyễn Văn An", email: "nvan@gmail.com", phone: "0987654321", contracts: 1, status: "blocked" },
    { id: "KH004", name: "Logistics Global", email: "support@logistics.vn", phone: "0999888777", contracts: 5, status: "active" },
    { id: "KH005", name: "Kho Vận Miền Nam", email: "admin@kvmn.com", phone: "0933221100", contracts: 0, status: "inactive" },
];

export default function CustomersPage() {
    const [searchTerm, setSearchTerm] = useState("");

    const filteredCustomers = MOCK_CUSTOMERS.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col flex-1 h-full bg-slate-50/50">
            <DashboardHeader>
                <div className="relative w-full max-w-xl hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Tìm kiếm khách hàng..."
                        className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white focus:ring-primary/20 transition-all rounded-lg text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </DashboardHeader>

            <main className="flex-1 p-4 md:p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Khách hàng</h1>
                        <p className="text-sm text-slate-500 mt-1">Quản lý thông tin khách hàng và đối tác</p>
                    </div>
                    <Button className="bg-primary hover:bg-primary/90 text-white gap-2 rounded-lg">
                        <Filter className="w-4 h-4" />
                        Bộ lọc
                    </Button>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="font-semibold text-slate-700">ID KH</TableHead>
                                <TableHead className="font-semibold text-slate-700">Tên khách hàng</TableHead>
                                <TableHead className="font-semibold text-slate-700">Liên hệ</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-center">Hợp đồng</TableHead>
                                <TableHead className="font-semibold text-slate-700">Trạng thái</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCustomers.map((customer) => (
                                <TableRow key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                                    <TableCell className="font-medium text-slate-600">{customer.id}</TableCell>
                                    <TableCell>
                                        <div className="font-medium text-slate-900">{customer.name}</div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span className="text-slate-700">{customer.email}</span>
                                            <span className="text-slate-500">{customer.phone}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                            {customer.contracts}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {customer.status === 'active' && <Badge className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border-emerald-100">Đang hoạt động</Badge>}
                                        {customer.status === 'blocked' && <Badge className="bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-100">Đã khóa</Badge>}
                                        {customer.status === 'inactive' && <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200">Không hoạt động</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg">
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg">
                                                <Lock className="w-4 h-4" />
                                            </Button>
                                        </div>
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

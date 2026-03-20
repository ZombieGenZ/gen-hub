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
    MagnifyingGlassIcon,
    FunnelIcon,
    EyeIcon,
    LockClosedIcon,
} from "@heroicons/react/24/outline";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PartnerService } from "@/services/partner/partner.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import type { Partner } from "@/services/partner/partner.types";
import { useToast } from "@/contexts/ToastContext";

const partnerService = new PartnerService();

type CustomerRow = {
    id: string;
    code: string;
    name: string;
    email: string;
    phone: string;
    contracts: number;
    status: "active" | "inactive";
};

export default function CustomersPage() {
    const [searchTerm, setSearchTerm] = useState("");
    const [loading, setLoading] = useState(true);
    const [customers, setCustomers] = useState<CustomerRow[]>([]);
    const router = useRouter();
    const { showToast } = useToast();

    useEffect(() => {
        const fetchCustomers = async () => {
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }

            setLoading(true);
            try {
                const result = await partnerService.list(token, {
                    limit: 200,
                    offset: 0,
                    type: "CUSTOMER",
                });

                const rows: CustomerRow[] = (result.data.items || []).map((item: Partner) => ({
                    id: item.id,
                    code: item.code || item.id.slice(0, 8),
                    name: item.name,
                    email: item.email || "-",
                    phone: item.phone || "-",
                    contracts: 0,
                    status: item.is_active ? "active" : "inactive",
                }));

                setCustomers(rows);
            } catch (error) {
                console.error(error);
                showToast("Không thể tải danh sách khách hàng", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchCustomers();
    }, [router, showToast]);

    const filteredCustomers = useMemo(
        () => customers.filter((c) =>
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.email.toLowerCase().includes(searchTerm.toLowerCase())
        ),
        [customers, searchTerm]
    );

    return (
        <div className="flex flex-col flex-1 h-full bg-slate-50/50">
            <main className="flex-1 p-4 md:p-8">
                <div className="relative w-full max-w-xl hidden md:block mb-6">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Tìm kiếm khách hàng..."
                        className="pl-9 h-9 bg-slate-50 border-slate-200 focus:bg-white focus:ring-brand/20 transition-all rounded-xl text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Khách hàng</h1>
                        <p className="text-sm text-slate-500 mt-1">Quản lý thông tin khách hàng và đối tác</p>
                    </div>
                    <Button className="bg-brand hover:bg-brand-hover text-white gap-2 rounded-xl">
                        <FunnelIcon className="w-4 h-4" />
                        Bộ lọc
                    </Button>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {loading && (
                        <div className="px-4 py-3 text-sm text-slate-500 border-b border-slate-200">Đang tải dữ liệu khách hàng...</div>
                    )}
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
                                    <TableCell className="font-medium text-slate-600">{customer.code}</TableCell>
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
                                        {customer.status === 'active' && <Badge className="bg-success/10 text-success hover:bg-success/20 border-success/20">Đang hoạt động</Badge>}
                                        {customer.status === 'inactive' && <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-200 border-slate-200">Không hoạt động</Badge>}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-brand hover:bg-brand/5 rounded-xl"
                                                onClick={() => router.push(`/dashboard/admin/customers/${customer.id}`)}
                                            >
                                                <EyeIcon className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl">
                                                <LockClosedIcon className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {!loading && filteredCustomers.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                                        Không có khách hàng phù hợp.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </main>
        </div>
    );
}

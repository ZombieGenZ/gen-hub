"use client";

import { DashboardHeader } from "@/components/layouts/DashboardHeader";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Plus,
    Search,
    Filter,
    FileText,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Calendar,
    MoreHorizontal,
    ArrowUpDown,
    Download
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { rentalContractService } from "@/services/rental-contract/rental-contract.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useRouter } from "next/navigation";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StatCard } from "@/components/dashboard/StatCard";
import { Organization } from "@/types/organization/organization.type";

interface Contract {
    id: string;
    code: string;
    name: string;
    status: string;
    started_at: string;
    expired_at: string;
    total_price: number;
    final_price: number;
    customer?: {
        name: string;
    };
}

const statusConfig: Record<string, { label: string; className: string }> = {
    'PENDING': { label: 'Chờ duyệt', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
    'ACTIVE': { label: 'Đang hiệu lực', className: 'bg-green-100 text-green-700 border-green-200' },
    'EXPIRED': { label: 'Hết hạn', className: 'bg-gray-100 text-gray-700 border-gray-200' },
    'CANCELLED': { label: 'Đã hủy', className: 'bg-red-100 text-red-700 border-red-200' },
    'TERMINATED': { label: 'Đã thanh lý', className: 'bg-slate-100 text-slate-700 border-slate-200' },
};

const DEFAULT_STATUS = { label: 'Không xác định', className: 'bg-gray-100 text-gray-500' };

const ContractsPage = () => {
    const router = useRouter();
    const [organizations, setOrganizations] = useState<Organization[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [limit] = useState(10);
    const [total, setTotal] = useState(0);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Using mock data for stats until API is ready or derived from contracts
    const stats = [
        { title: "Tổng hợp đồng", value: total, icon: FileText, variant: "blue" as const },
        { title: "Đang hiệu lực", value: contracts.filter(c => c.status === 'ACTIVE').length, icon: Calendar, variant: "green" as const },
        // Add more stats if needed
    ];

    const formatCurrency = (amount: number | string) => {
        if (!amount) return "0 ₫";
        const num = typeof amount === 'string' ? parseFloat(amount) : amount;
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
    };

    const formatDate = (dateString: string) => {
        if (!dateString) return "-";
        try {
            return format(new Date(dateString), "dd/MM/yyyy");
        } catch {
            return dateString;
        }
    };

    const fetchContracts = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }

            setIsLoading(true);
            setError(null);

            const params = {
                page,
                limit,
                keywords: searchTerm,
                status: statusFilter !== "all" ? statusFilter : undefined
            };

            const data: any = await rentalContractService.getRentalContracts(token, params);

            if (data) {
                if (Array.isArray(data)) {
                    setContracts(data);
                    setTotal(data.length);
                } else if (data.items) {
                    setContracts(data.items);
                    setTotal(data.total || 0);
                }
            } else {
                setContracts([]);
                setTotal(0);
            }
        } catch (err: any) {
            console.error(err);
            if (err.message === "Unauthorized") { // Check strictly if service throws this string, otherwise assume auth error on 401
                router.push("/login");
                return;
            }
            // Fallback for demo/mock if API fails
            // setContracts(MOCK_CONTRACTS); 
            setError("Không thể tải danh sách hợp đồng");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Debounce search
        const timer = setTimeout(() => {
            fetchContracts();
        }, 500);

        return () => clearTimeout(timer);
    }, [page, searchTerm, statusFilter]);

    return (
        <div className="flex flex-col flex-1 h-full bg-muted/40">
            <DashboardHeader />

            <main className="flex-1 p-4 md:p-8 w-full space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                            <FileText className="w-8 h-8 text-primary bg-primary/10 p-1.5 rounded-lg" />
                            Quản lý Hợp đồng
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">Quản lý danh sách các hợp đồng thuê kho trong hệ thống.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="bg-card shadow-sm">
                            <Download className="w-4 h-4 mr-2" />
                            Xuất báo cáo
                        </Button>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 shadow-md shadow-primary/20">
                            <Plus className="w-4 h-4" />
                            Tạo hợp đồng
                        </Button>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    {stats.map((stat, i) => (
                        <StatCard
                            key={i}
                            title={stat.title}
                            value={stat.value}
                            icon={stat.icon}
                            variant={stat.variant}
                        />
                    ))}
                </div>

                {/* Filters & Actions */}
                <div className="bg-card p-4 rounded-xl border border-border shadow-sm mb-6">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="flex items-center gap-2 w-full md:w-auto flex-1">
                            <div className="relative flex-1 md:max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    placeholder="Tìm kiếm theo mã HĐ, tên..."
                                    className="pl-9 bg-muted/20 border-border"
                                    value={searchTerm}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setPage(1);
                                    }}
                                />
                            </div>
                            <div className="w-[180px]">
                                <Select value={statusFilter} onValueChange={(val) => {
                                    setStatusFilter(val);
                                    setPage(1);
                                }}>
                                    <SelectTrigger className="bg-muted/20 border-border">
                                        <div className="flex items-center gap-2">
                                            <Filter className="w-4 h-4 text-muted-foreground" />
                                            <SelectValue placeholder="Trạng thái" />
                                        </div>
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                        {Object.entries(statusConfig).map(([key, conf]) => (
                                            <SelectItem key={key} value={key}>{conf.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/40 border-b border-border">
                            <TableRow>
                                <TableHead className="w-[150px] font-bold text-muted-foreground uppercase text-xs tracking-wider py-4">Mã Booking</TableHead>
                                <TableHead className="font-bold text-muted-foreground uppercase text-xs tracking-wider py-4">Khách hàng / Tên HĐ</TableHead>
                                <TableHead className="font-bold text-muted-foreground uppercase text-xs tracking-wider py-4">Thời hạn</TableHead>
                                <TableHead className="font-bold text-muted-foreground uppercase text-xs tracking-wider py-4 text-right">Giá trị</TableHead>
                                <TableHead className="font-bold text-muted-foreground uppercase text-xs tracking-wider py-4 text-center w-[150px]">Trạng thái</TableHead>
                                <TableHead className="w-[80px] py-4"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center">
                                        <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                            <p>Đang tải dữ liệu...</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : error ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center text-red-500">
                                        {error}
                                    </TableCell>
                                </TableRow>
                            ) : contracts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                                        Không tìm thấy hợp đồng nào
                                    </TableCell>
                                </TableRow>
                            ) : (
                                contracts.map((contract) => {
                                    const status = statusConfig[contract.status] || DEFAULT_STATUS;
                                    return (
                                        <TableRow key={contract.id} className="hover:bg-muted/10">
                                            <TableCell className="font-medium text-foreground">
                                                {contract.code}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-foreground">{contract.name}</span>
                                                    <span className="text-xs text-muted-foreground">{contract.customer?.name || "Khách lẻ"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm text-foreground">
                                                    <span className="flex items-center gap-1"><span className="w-16 text-xs text-muted-foreground">Bắt đầu:</span> {formatDate(contract.started_at)}</span>
                                                    <span className="flex items-center gap-1"><span className="w-16 text-xs text-muted-foreground">Kết thúc:</span> {formatDate(contract.expired_at)}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium text-foreground">
                                                {formatCurrency(contract.final_price)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="outline" className={status.className}>
                                                    {status.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => navigator.clipboard.writeText(contract.code)}>
                                                            Sao chép mã HĐ
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem>Xem chi tiết</DropdownMenuItem>
                                                        <DropdownMenuItem>Chỉnh sửa</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between p-4 border-t border-border">
                        <div className="text-sm text-muted-foreground">
                            Trang {page} / ?
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setPage(p => p + 1)}
                                disabled={contracts.length < limit}
                            >
                                <ChevronRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default ContractsPage;

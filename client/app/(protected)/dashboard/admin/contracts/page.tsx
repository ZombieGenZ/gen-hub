"use client";

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
import { RentalContractService } from "@/services/rental-contract/rental-contract.service";
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
import { CreateContractModal } from "@/components/dashboard/CreateContractModal";
import { OrganizationService } from "@/services/organization/organization.service";
import React from "react";

const rentalContractService = new RentalContractService();
const organizationService = new OrganizationService();

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
    'ACTIVE': { label: 'Đang hiệu lực', className: 'bg-success/10 text-success border-success/20' },
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

    // Modal state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Filters
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    // Using mock data for stats until API is ready or derived from contracts
    const stats = [
        { title: "Tổng hợp đồng", value: total, icon: FileText, variant: "brand" as const },
        { title: "Đang hiệu lực", value: contracts.filter(c => c.status === 'ACTIVE').length, icon: Calendar, variant: "brand" as const },
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

            // Fetch organizations if empty
            if (organizations.length === 0) {
                try {
                    const response: any = await organizationService.getOrganizations(token, { limit: 100, is_active: true });
                    let orgs: Organization[] = [];
                    
                    if (Array.isArray(response)) {
                        orgs = response;
                    } else if (response?.data && Array.isArray(response.data)) {
                        orgs = response.data;
                    } else if (response?.items && Array.isArray(response.items)) {
                        orgs = response.items;
                    } else if (response?.data?.items && Array.isArray(response.data.items)) {
                        orgs = response.data.items;
                    }

                    if (orgs.length > 0) {
                        setOrganizations(orgs);
                    }
                } catch (err) {
                    console.error("Failed to fetch organizations", err);
                }
            }

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


            <main className="flex-1 p-4 md:p-8 w-full space-y-6">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                            <FileText className="w-8 h-8 text-brand bg-brand-subtle p-1.5 rounded-lg" />
                            Quản lý Hợp đồng
                        </h1>
                        <p className="text-muted-foreground mt-1 text-sm">Quản lý danh sách các hợp đồng thuê kho trong hệ thống.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" className="bg-card shadow-sm">
                            <Download className="w-4 h-4 mr-2" />
                            Xuất báo cáo
                        </Button>
                        <Button 
                            className="gap-2"
                            style={{ borderRadius: "12px" }}
                            onClick={() => setIsCreateModalOpen(true)}
                        >
                            <Plus className="w-4 h-4" />
                            <span className="hidden sm:inline">Tạo hợp đồng</span>
                            <span className="sm:hidden">Tạo</span>
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

                {/* Contracts Table */}
                <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>Mã HĐ</TableHead>
                                <TableHead>Khách hàng</TableHead>
                                <TableHead>Ngày bắt đầu</TableHead>
                                <TableHead>Ngày kết thúc</TableHead>
                                <TableHead>Giá trị</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <span className="text-muted-foreground">Đang tải dữ liệu...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : contracts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center">
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <FileText className="h-8 w-8 mb-2 opacity-50" />
                                            <p>Không tìm thấy hợp đồng nào</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                contracts.map((contract, index) => {
                                    const statusInfo = statusConfig[contract.status] || DEFAULT_STATUS;
                                    return (
                                        <TableRow key={contract.id} className="group hover:bg-muted/50 transition-colors">
                                            <TableCell className="font-medium text-muted-foreground">
                                                {(page - 1) * limit + index + 1}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground">{contract.code}</span>
                                                    <span className="text-xs text-muted-foreground">{contract.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                                        {contract.customer?.name?.charAt(0) || "K"}
                                                    </div>
                                                    <span className="font-medium">{contract.customer?.name || "Khách hàng"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{formatDate(contract.started_at)}</TableCell>
                                            <TableCell>{formatDate(contract.expired_at)}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-brand">{formatCurrency(contract.final_price)}</span>
                                                    {contract.final_price !== contract.total_price && (
                                                        <span className="text-xs text-muted-foreground line-through">
                                                            {formatCurrency(contract.total_price)}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={cn("font-medium", statusInfo.className)}>
                                                    {statusInfo.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => router.push(`/dashboard/admin/contracts/${contract.id}`)}>
                                                            Xem chi tiết
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-red-600">
                                                            Hủy hợp đồng
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t pt-4">
                    <div className="text-sm text-muted-foreground">
                        Hiển thị {contracts.length > 0 ? (page - 1) * limit + 1 : 0} - {Math.min(page * limit, total)} trong số {total} hợp đồng
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || isLoading}
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Trước
                        </Button>
                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.ceil(total / limit) }, (_, i) => i + 1)
                                .filter(p => p === 1 || p === Math.ceil(total / limit) || Math.abs(p - page) <= 1)
                                .map((p, i, arr) => (
                                    <React.Fragment key={p}>
                                        {i > 0 && arr[i - 1] !== p - 1 && <span className="px-2">...</span>}
                                        <Button
                                            variant={page === p ? "default" : "outline"}
                                            size="sm"
                                            onClick={() => setPage(p)}
                                            className={page === p ? "bg-brand hover:bg-brand-hover" : ""}
                                        >
                                            {p}
                                        </Button>
                                    </React.Fragment>

                                ))}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(Math.ceil(total / limit), p + 1))}
                            disabled={page >= Math.ceil(total / limit) || isLoading}
                        >
                            Tiếp
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <CreateContractModal 
                    open={isCreateModalOpen} 
                    onOpenChange={setIsCreateModalOpen} 
                    onSuccess={fetchContracts}
                    organizations={organizations}
                />
            </main>
        </div>
    );
};

export default ContractsPage;

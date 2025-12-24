"use client";

import { DashboardSidebar } from "@/components/layouts/DashboardSidebar";
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
    Loader2
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { rentalContractService } from "@/services/rental-contract/rental-contract.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useRouter } from "next/navigation";


const statusConfig: Record<string, { label: string; className: string }> = {
    PENDING: {
        label: "Chờ duyệt",
        className: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100"
    },
    ACTIVE: {
        label: "Đang hiệu lực",
        className: "bg-[#0F766E] text-white border-transparent hover:bg-[#0F766E]/90"
    },
    OVERDUE_LEVEL_1: {
        label: "Quá hạn cấp 1",
        className: "bg-[#EF4444] text-white border-transparent hover:bg-[#EF4444]/90"
    },
    OVERDUE_LEVEL_2: {
        label: "Quá hạn cấp 2",
        className: "bg-red-600 text-white border-transparent hover:bg-red-600/90"
    },
    OVERDUE_LEVEL_3: {
        label: "Quá hạn cấp 3",
        className: "bg-red-700 text-white border-transparent hover:bg-red-700/90"
    },
    SEALED: {
        label: "Đã niêm phong",
        className: "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-100"
    },
    LIQUIDATED: {
        label: "Đã thanh lý",
        className: "bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100"
    },
    CANCELLED: {
        label: "Đã hủy",
        className: "bg-[#EF4444] text-white border-transparent hover:bg-[#EF4444]/90"
    },
    COMPLETED: {
        label: "Hoàn thành",
        className: "bg-[#0F766E] text-white border-transparent hover:bg-[#0F766E]/90"
    },
};

const DEFAULT_STATUS = {
    label: "Không xác định",
    className: "bg-slate-100 text-slate-400 border-slate-200"
};

interface RentalContract {
    id: string;
    code: string;
    name: string;
    status: string;
    started_at: string | null;
    expired_at: string | null;
    total_price: number | null;
    final_price: number | null;
}

const ContractsPage = () => {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [contracts, setContracts] = useState<RentalContract[]>([]);
    const [total, setTotal] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Pagination state
    const [page, setPage] = useState(1);
    const [limit] = useState(10);

    useEffect(() => {
        const fetchContracts = async () => {
            try {
                setIsLoading(true);
                const token = authStorage.getAccessToken();
                if (!token) {
                    router.push("/login");
                    return;
                }

                const data = await rentalContractService.getRentalContracts(token, {
                    keywords: searchTerm,
                    status: statusFilter === "all" ? undefined : statusFilter,
                    page,
                    limit
                });

                setContracts(data?.items || []);
                setTotal(data?.total || 0);
                setError(null);
            } catch (err: unknown) {
                console.error("Fetch contracts error:", err);
                const errorMessage = err instanceof Error ? err.message : "Có lỗi xảy ra";
                setError(errorMessage);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = setTimeout(() => {
            fetchContracts();
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, statusFilter, page, limit, router]);

    const formatCurrency = (value: number | string | undefined | null) => {
        if (value === undefined || value === null) return "0 ₫";
        const numValue = typeof value === "string" ? parseFloat(value) : value;
        return new Intl.NumberFormat("vi-VN").format(numValue) + " ₫";
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "-";
        try {
            return format(new Date(dateString), "dd/MM/yyyy");
        } catch {
            return "-";
        }
    };

    return (
        <div className="contracts-page flex min-h-screen bg-[#F8FAFC]">
            <DashboardSidebar />

            <div className="contracts-page__content flex-1 flex flex-col md:ml-64">
                <DashboardHeader>
                    <div className="relative w-full max-w-xl hidden md:block">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm hợp đồng..."
                            className="pl-9 h-10 bg-slate-50 border-transparent focus:bg-white transition-all rounded-lg"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1); // Reset to page 1 on search
                            }}
                        />
                    </div>
                </DashboardHeader>

                <main className="contracts-page__main flex-1 p-6">
                    {/* Breadcrumb */}
                    <nav className="flex items-center gap-2 text-sm mb-6">
                        <span className="text-slate-400">Trang chủ</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-[#1E293B] font-medium">Hợp đồng</span>
                    </nav>

                    {/* Page Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-[#0F766E]/10 flex items-center justify-center">
                                <FileText className="h-6 w-6 text-[#0F766E]" />
                            </div>
                            <div className="flex flex-col">
                                <h1 className="text-2xl font-bold text-[#1E293B]">Quản lý hợp đồng</h1>
                                <p className="text-slate-500 text-[14px]">Quản lý tất cả hợp đồng thuê kho</p>
                            </div>
                        </div>
                        <Button className="bg-[#0F766E] hover:bg-[#14B8A6] text-white rounded-lg h-11 px-6 gap-2 font-medium">
                            <Plus className="h-4 w-4" />
                            Thêm hợp đồng
                        </Button>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-6 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Tìm kiếm theo mã hoặc tên hợp đồng..."
                                className="pl-11 h-11 bg-white border-slate-200 rounded-lg text-sm transition-all focus:ring-2 focus:ring-[#0F766E]/20"
                                value={searchTerm}
                                onChange={(e) => {
                                    setSearchTerm(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <Select value={statusFilter} onValueChange={(val) => {
                                setStatusFilter(val);
                                setPage(1);
                            }}>
                                <SelectTrigger className="w-full sm:w-56 h-11 bg-white border-slate-200 rounded-lg text-sm">
                                    <SelectValue placeholder="Tất cả trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                    {Object.entries(statusConfig).map(([key, config]) => (
                                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button variant="outline" className="h-11 px-5 gap-2 border-slate-200 text-slate-600 font-medium hover:bg-slate-50">
                                <Filter className="h-4 w-4" />
                                Lọc
                            </Button>
                        </div>
                    </div>

                    {/* Table Container */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="hover:bg-transparent border-slate-200">
                                        <TableHead className="font-semibold text-slate-700 py-4 h-auto uppercase text-[12px] tracking-wider px-6 text-nowrap whitespace-nowrap">Mã HĐ</TableHead>
                                        <TableHead className="font-semibold text-slate-700 py-4 h-auto uppercase text-[12px] tracking-wider text-nowrap whitespace-nowrap">Tên hợp đồng</TableHead>
                                        <TableHead className="font-semibold text-slate-700 py-4 h-auto uppercase text-[12px] tracking-wider text-nowrap whitespace-nowrap">Ngày bắt đầu</TableHead>
                                        <TableHead className="font-semibold text-slate-700 py-4 h-auto uppercase text-[12px] tracking-wider text-nowrap whitespace-nowrap">Ngày hết hạn</TableHead>
                                        <TableHead className="font-semibold text-slate-700 py-4 h-auto uppercase text-[12px] tracking-wider text-right text-nowrap whitespace-nowrap">Tổng giá trị</TableHead>
                                        <TableHead className="font-semibold text-slate-700 py-4 h-auto uppercase text-[12px] tracking-wider text-right text-nowrap whitespace-nowrap">Giá sau CK</TableHead>
                                        <TableHead className="font-semibold text-slate-700 py-4 h-auto uppercase text-[12px] tracking-wider px-6 text-nowrap whitespace-nowrap">Trạng thái</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {isLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center text-slate-500">
                                                <div className="flex items-center justify-center gap-3">
                                                    <Loader2 className="h-5 w-5 animate-spin text-[#0F766E]" />
                                                    <span>Đang tải dữ liệu...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : error ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center text-red-500 font-medium">
                                                Đã xảy ra lỗi khi tải dữ liệu. Vui lòng thử lại sau.
                                            </TableCell>
                                        </TableRow>
                                    ) : contracts.length > 0 ? (
                                        contracts.map((contract) => {
                                            const statusInfo = statusConfig[contract.status] || DEFAULT_STATUS;
                                            return (
                                                <TableRow key={contract.id} className="border-slate-100 hover:bg-slate-50/50 transition-colors">
                                                    <TableCell className="font-medium text-[#1E293B] py-4 px-6">{contract.code}</TableCell>
                                                    <TableCell className="text-[#334155]">{contract.name || "-"}</TableCell>
                                                    <TableCell className="text-[#334155] whitespace-nowrap">{formatDate(contract.started_at)}</TableCell>
                                                    <TableCell className="text-[#334155] whitespace-nowrap">{formatDate(contract.expired_at)}</TableCell>
                                                    <TableCell className="text-right text-[#334155] whitespace-nowrap">{formatCurrency(contract.total_price)}</TableCell>
                                                    <TableCell className="text-right text-[#334155] whitespace-nowrap">{formatCurrency(contract.final_price)}</TableCell>
                                                    <TableCell className="px-6 whitespace-nowrap">
                                                        <Badge
                                                            variant="outline"
                                                            className={cn(
                                                                "font-medium px-2.5 py-0.5 rounded-md text-[12px] border shadow-sm",
                                                                statusInfo.className
                                                            )}
                                                        >
                                                            {statusInfo.label}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center text-slate-400">
                                                Không tìm thấy hợp đồng nào phù hợp
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
                            <p className="text-sm text-slate-400 italic">
                                Hiển thị {contracts.length} trên tổng số {total} hợp đồng
                            </p>
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-md border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                    onClick={() => setPage(p => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                >
                                    <ChevronLeft className="h-3 w-3" />
                                </Button>
                                <div className="text-sm font-medium px-2 min-w-[3rem] text-center">
                                    Trang {page}
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-md border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                                    onClick={() => setPage(p => p + 1)}
                                    disabled={contracts.length < limit}
                                >
                                    <ChevronRight className="h-3 w-3" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ContractsPage;

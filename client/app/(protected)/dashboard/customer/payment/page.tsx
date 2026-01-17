"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import {
    accountBalanceService,
    OrganizationBalance,
    OrganizationBalanceTransaction
} from "@/services/account-balance/account-balance.service";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Wallet, ArrowUpRight, ArrowDownLeft, History, CreditCard, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Calendar, RangeValue } from "@/components/ui/calendar-1";
import { cn } from "@/lib/utils";
import { DepositModal } from "@/components/modals/deposit-modal";


export default function FinancePage() {
    const { showToast } = useToast();
    const router = useRouter();
    const [balance, setBalance] = useState<OrganizationBalance | null>(null);
    const [transactions, setTransactions] = useState<OrganizationBalanceTransaction[]>([]);
    const [loading, setLoading] = useState(true);

    const [isDepositOpen, setIsDepositOpen] = useState(false);

    // Filter states
    const [searchDescription, setSearchDescription] = useState("");
    const [filterType, setFilterType] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");

    const [date, setDate] = useState<RangeValue | null>(null);

    const user = authStorage.getUser();
    // Assuming organization_id is in the token payload. 
    // If not, we might need to fetch profile. 
    // Usually payload has: sub (userId), email, roles, organization_id (if part of one)
    const orgId = user?.organization_id;

    const fetchData = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token || !orgId) return;

            const [balanceData, transactionsData] = await Promise.all([
                accountBalanceService.getOrganizationBalance(token, orgId),
                accountBalanceService.getTransactions(token, orgId, {
                    limit: 10,
                    description: searchDescription || undefined,
                    type: filterType !== "all" ? filterType : undefined,
                    status: filterStatus !== "all" ? filterStatus : undefined,
                    from_date: date?.start ? format(date.start, "yyyy-MM-dd") : undefined,
                    to_date: date?.end ? format(date.end, "yyyy-MM-dd") : undefined,
                })
            ]);

            setBalance(balanceData);
            if (transactionsData && (transactionsData as any).items) {
                setTransactions((transactionsData as any).items);
            } else if (Array.isArray(transactionsData)) {
                setTransactions(transactionsData);
            }

        } catch (error) {
            console.error("Failed to fetch finance data", error);
            // showToast("Không thể tải thông tin tài chính", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (orgId) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [orgId]);



    const handleSearch = () => {
        setLoading(true);
        fetchData();
    };

    const handleResetFilters = () => {
        setSearchDescription("");
        setFilterType("all");
        setFilterStatus("all");
        setSearchDescription("");
        setFilterType("all");
        setFilterStatus("all");
        setDate(null);
        setLoading(true);
        const token = authStorage.getAccessToken();
        if (!token || !orgId) return;

        accountBalanceService.getTransactions(token, orgId, { limit: 10 })
            .then((transactionsData: any) => {
                if (transactionsData && transactionsData.items) {
                    setTransactions(transactionsData.items);
                } else if (Array.isArray(transactionsData)) {
                    setTransactions(transactionsData);
                }
                setLoading(false);
            });
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    if (orgId) {
        return <div className="p-8 text-center text-muted-foreground">Bạn chưa thuộc về tổ chức nào.</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Tài chính & Thanh toán</h1>
                <p className="text-muted-foreground">Quản lý ví điện tử, số dư và lịch sử giao dịch.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Balance Card */}
                <Card className="md:col-span-1 shadow-sm border-border/60">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Wallet className="w-4 h-4" /> Số dư ví
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        ) : (
                            <div>
                                <div className="text-4xl font-bold tracking-tight">
                                    {formatCurrency(balance?.balance || 0)}
                                </div>
                                <div className="mt-6 flex gap-3">
                                    <DepositModal
                                        open={isDepositOpen}
                                        onOpenChange={setIsDepositOpen}
                                        onSuccess={fetchData}
                                        orgId={orgId}
                                        currentBalance={balance?.balance || 0}
                                    />
                                    <Button
                                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                                        onClick={() => setIsDepositOpen(true)}
                                    >
                                        <ArrowUpRight className="w-4 h-4 mr-2" /> Nạp tiền
                                    </Button>

                                    <Button variant="outline" className="flex-1 border-input hover:bg-accent hover:text-accent-foreground">
                                        <CreditCard className="w-4 h-4 mr-2" /> Rút tiền
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Stats */}
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tổng quan tài chính</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-muted/30 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Tổng đã nạp</p>
                            <p className="text-xl font-semibold text-green-600">
                                +{formatCurrency(balance?.total_deposited || 0)}
                            </p>
                        </div>
                        <div className="p-4 bg-muted/30 rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Tổng đã chi tiêu</p>
                            <p className="text-xl font-semibold text-red-600">
                                -{formatCurrency(balance?.total_spent || 0)}
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions */}
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <CardTitle className="flex items-center gap-2">
                            <History className="w-5 h-5" /> Lịch sử giao dịch
                        </CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Filters */}
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="w-full lg:flex-1">
                            <Input
                                placeholder="Tìm kiếm nội dung..."
                                value={searchDescription}
                                onChange={(e) => setSearchDescription(e.target.value)}
                                className="w-full"
                            />
                        </div>
                        <div className="w-full lg:w-[200px]">
                            <Select value={filterType} onValueChange={setFilterType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Loại giao dịch" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả loại</SelectItem>
                                    <SelectItem value="DEPOSIT">Nạp tiền</SelectItem>
                                    <SelectItem value="WITHDRAW">Rút tiền</SelectItem>
                                    <SelectItem value="PAYMENT">Thanh toán</SelectItem>
                                    <SelectItem value="REFUND">Hoàn tiền</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full lg:w-[200px]">
                            <Select value={filterStatus} onValueChange={setFilterStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                    <SelectItem value="COMPLETED">Thành công</SelectItem>
                                    <SelectItem value="PENDING">Đang xử lý</SelectItem>
                                    <SelectItem value="FAILED">Thất bại</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full lg:w-auto">
                            <Calendar
                                allowClear
                                isDocsPage={true}
                                onChange={setDate}
                                value={date}
                                horizontalLayout={true}
                                showTimeInput={false}
                                popoverAlignment="center"
                                compact
                            />
                        </div>
                        <div className="flex gap-2 w-full lg:w-auto">
                            <Button onClick={handleSearch} className="flex-1 lg:flex-none bg-primary text-primary-foreground">
                                <Search className="w-4 h-4 mr-2" /> Lọc
                            </Button>
                            <Button onClick={handleResetFilters} variant="outline" size="icon" title="Đặt lại">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-4">Đang tải...</div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">Chưa có giao dịch nào.</div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mã chừng từ</TableHead>
                                    <TableHead>Loại</TableHead>
                                    <TableHead>Số tiền</TableHead>
                                    <TableHead>Số dư sau</TableHead>
                                    <TableHead>Mô tả</TableHead>
                                    <TableHead>Ngày</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map((tx) => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {tx.id.substring(0, 8)}...
                                        </TableCell>
                                        <TableCell>
                                            <span className={`text-xs font-bold px-2 py-1 rounded-full ${tx.type === 'DEPOSIT' || tx.type === 'REFUND'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-red-100 text-red-700'
                                                }`}>
                                                {tx.type}
                                            </span>
                                        </TableCell>
                                        <TableCell className={`font-medium ${tx.type === 'DEPOSIT' || tx.type === 'REFUND'
                                            ? 'text-green-600'
                                            : 'text-red-600'
                                            }`}>
                                            {tx.type === 'DEPOSIT' || tx.type === 'REFUND' ? '+' : '-'}{formatCurrency(tx.amount)}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {formatCurrency(tx.balance_after)}
                                        </TableCell>
                                        <TableCell className="max-w-[200px] truncate" title={tx.description}>
                                            {tx.description}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm")}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

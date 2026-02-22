"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
    Wallet,
    ArrowUpRight,
    History,
    CreditCard,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    X,
} from "lucide-react";
import { format } from "date-fns";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Calendar, RangeValue } from "@/components/ui/calendar-1";
import { cn } from "@/lib/utils";
import { DepositModal } from "@/components/modals/deposit-modal";
import { OrganizationService } from "@/services/organization/organization.service";
import { Organization } from "@/types/organization/organization.type";
import { Toast } from "@/components/ui/Toast";
import { useRouter } from "next/navigation";

// ─── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 20;

// ─── Types ────────────────────────────────────────────────────────────────────

type TxType = 'DEPOSIT' | 'WITHDRAW' | 'PAYMENT' | 'REFUND' | 'ADJUSTMENT';

type FilterType = 'all' | TxType;

type FilterStatus = 'all' | 'COMPLETED' | 'PENDING' | 'FAILED';

interface TransactionListResponse {
    items: OrganizationBalanceTransaction[];
    total: number;
}

// ─── Config Maps ──────────────────────────────────────────────────────────────

const TYPE_MAP: Record<TxType, { label: string; color: string; sign: '+' | '-' }> = {
    DEPOSIT:    { label: 'Nạp tiền',   color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',     sign: '+' },
    REFUND:     { label: 'Hoàn tiền',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',         sign: '+' },
    PAYMENT:    { label: 'Thanh toán', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',             sign: '-' },
    WITHDRAW:   { label: 'Rút tiền',   color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400', sign: '-' },
    ADJUSTMENT: { label: 'Điều chỉnh', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',            sign: '+' },
};

const isCredit = (type: string): boolean => type === 'DEPOSIT' || type === 'REFUND';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatCurrency = (val: number): string =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

// ─── Component ────────────────────────────────────────────────────────────────

const organizationService = new OrganizationService();

export default function FinancePage() {
    const [balance, setBalance] = useState<OrganizationBalance | null>(null);
    const [transactions, setTransactions] = useState<OrganizationBalanceTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [txLoading, setTxLoading] = useState(false);
    const router = useRouter();

    const [isDepositOpen, setIsDepositOpen] = useState(false);

    // Filter states — typed as union literals (no plain string)
    const [searchDescription, setSearchDescription] = useState("");
    const [filterType, setFilterType] = useState<FilterType>("all");
    const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
    const [date, setDate] = useState<RangeValue | null>(null);

    // Pagination
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);

    const [orgId, setOrgId] = useState<string | null>(null);

    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ── Init user ──────────────────────────────────────────────────────────────
    useEffect(() => {
        const initUser = async () => {
            const userID = await authStorage.getUserID();
            const token = authStorage.getAccessToken();
            
            if (!userID || !token) {
                setLoading(false);
                // Toast({
                //     message: "Vui lòng đăng nhập lại để tiếp tục.",
                //     type: "error",
                // });
                router.push("/login");
                return;
            }

            const listOrgs = await organizationService.getOrganizations(userID!);
            const organization = listOrgs.items.find((o: Organization) => o.owner.id == userID);
            if (organization) {
                const org = await organizationService.getOrganizationById(token, organization.id);
                setOrgId(org.id);
            } else {
                setLoading(false);
            }
        };
        initUser();
    }, [router]);

    // ── Data fetchers ──────────────────────────────────────────────────────────

    const fetchBalance = useCallback(async (token: string, id: string) => {
        try {
            const data = await accountBalanceService.getOrganizationBalance(token, id);
            setBalance(data);
        } catch {
            // Keep existing balance on failure — UI stays usable
        }
    }, []);

    const fetchTransactions = useCallback(async (
        token: string,
        id: string,
        currentPage: number,
        desc: string,
        type: FilterType,
        status: FilterStatus,
        dateRange: RangeValue | null
    ) => {
        setTxLoading(true);
        try {
            const result = await accountBalanceService.getTransactions(token, id, {
                page: currentPage,
                limit: LIMIT,
                description: desc || undefined,
                type: type !== "all" ? type : undefined,
                status: status !== "all" ? status : undefined,
                from_date: dateRange?.start ? format(dateRange.start, "yyyy-MM-dd") : undefined,
                to_date: dateRange?.end ? format(dateRange.end, "yyyy-MM-dd") : undefined,
            });

            const typed = result as TransactionListResponse | OrganizationBalanceTransaction[];
            const items = Array.isArray(typed)
                ? typed
                : typed.items ?? [];
            const totalCount = Array.isArray(typed) ? items.length : (typed.total ?? items.length);

            setTransactions(items);
            setTotal(totalCount);
        } catch {
            setTransactions([]);
            setTotal(0);
        } finally {
            setTxLoading(false);
        }
    }, []);

    // ── Initial load ──────────────────────────────────────────────────────────
    useEffect(() => {
        if (!orgId) return;
        const load = async () => {
            try {
                const token = authStorage.getAccessToken();
                if (!token) return;
                await Promise.all([
                    fetchBalance(token, orgId),
                    fetchTransactions(token, orgId, 1, "", "all", "all", null),
                ]);
            } catch {
                // Individual fetchers handle their own errors
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [orgId, fetchBalance, fetchTransactions]);

    // ── Debounced filter re-fetch (400ms, resets to page 1) ──────────────────
    useEffect(() => {
        if (!orgId) return;
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            const token = authStorage.getAccessToken();
            if (!token) return;
            setPage(1);
            fetchTransactions(token, orgId, 1, searchDescription, filterType, filterStatus, date);
        }, 400);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchDescription, filterType, filterStatus, date]);

    // ── Page change ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!orgId) return;
        const token = authStorage.getAccessToken();
        if (!token) return;
        fetchTransactions(token, orgId, page, searchDescription, filterType, filterStatus, date);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleReset = () => {
        setSearchDescription("");
        setFilterType("all");
        setFilterStatus("all");
        setDate(null);
        setPage(1);
    };

    const handleDepositSuccess = () => {
        const token = authStorage.getAccessToken();
        if (!token || !orgId) return;
        fetchBalance(token, orgId);
        if (page === 1) {
            // Page state won't change → effect won't fire → fetch directly
            fetchTransactions(token, orgId, 1, searchDescription, filterType, filterStatus, date);
        } else {
            // Changing page to 1 triggers the page effect which fetches
            setPage(1);
        }
    };

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    // ── Empty org state ───────────────────────────────────────────────────────
    if (!loading && !orgId) {
        return (
            <div className="flex flex-col items-center justify-center py-[72px] text-center gap-4">
                <Wallet className="w-10 h-10 text-muted-foreground/40" />
                <p className="text-muted-foreground">Bạn chưa thuộc về tổ chức nào.</p>
            </div>
        );
    }

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Tài chính & Thanh toán</h1>
                <p className="text-muted-foreground text-sm">Quản lý ví điện tử, số dư và lịch sử giao dịch.</p>
            </div>

            {/* Top row: balance card + stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* Balance Card */}
                <Card className="md:col-span-1 border-border/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Wallet className="w-4 h-4" /> Số dư ví
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="space-y-4">
                                <Skeleton className="h-10 w-40" />
                                <div className="flex gap-4">
                                    <Skeleton className="h-9 flex-1 rounded-xl" />
                                    <Skeleton className="h-9 flex-1 rounded-xl" />
                                </div>
                            </div>
                        ) : (
                            <div>
                                <div className="text-4xl font-bold tracking-tight tabular-nums">
                                    {formatCurrency(balance?.balance ?? 0)}
                                </div>
                                <div className="mt-6 flex gap-4">
                                    <DepositModal
                                        open={isDepositOpen}
                                        onOpenChange={setIsDepositOpen}
                                        onSuccess={handleDepositSuccess}
                                        orgId={orgId!}
                                        currentBalance={balance?.balance ?? 0}
                                    />
                                    <Button
                                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm"
                                        onClick={() => setIsDepositOpen(true)}
                                    >
                                        <ArrowUpRight className="w-4 h-4 mr-1.5" /> Nạp tiền
                                    </Button>
                                    <Button variant="outline" className="flex-1" disabled>
                                        <CreditCard className="w-4 h-4 mr-1.5" /> Rút tiền
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Financial Overview */}
                <Card className="md:col-span-2 border-border/60 shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Tổng quan tài chính</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-3 gap-4">
                        {loading ? (
                            <>
                                <Skeleton className="h-16 rounded-2xl" />
                                <Skeleton className="h-16 rounded-2xl" />
                                <Skeleton className="h-16 rounded-2xl" />
                            </>
                        ) : (
                            <>
                                <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/20">
                                    <p className="text-xs text-muted-foreground mb-1">Tổng đã nạp</p>
                                    <p className="text-lg font-semibold text-green-600 tabular-nums">
                                        +{formatCurrency(balance?.total_deposited ?? 0)}
                                    </p>
                                </div>
                                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
                                    <p className="text-xs text-muted-foreground mb-1">Tổng đã chi tiêu</p>
                                    <p className="text-lg font-semibold text-red-600 tabular-nums">
                                        -{formatCurrency(balance?.total_spent ?? 0)}
                                    </p>
                                </div>
                                <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                                    <p className="text-xs text-muted-foreground mb-1">Tổng hoàn tiền</p>
                                    <p className="text-lg font-semibold text-blue-600 tabular-nums">
                                        +{formatCurrency(balance?.total_refunded ?? 0)}
                                    </p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Transaction History */}
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <History className="w-4 h-4" /> Lịch sử giao dịch
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">

                    {/* Filters */}
                    <div className="flex flex-col lg:flex-row gap-4">
                        <div className="relative flex-1">
                            <Input
                                placeholder="Tìm kiếm nội dung giao dịch..."
                                value={searchDescription}
                                onChange={(e) => setSearchDescription(e.target.value)}
                                className="pr-8"
                            />
                            {searchDescription && (
                                <button
                                    onClick={() => setSearchDescription("")}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                        <div className="w-full lg:w-[180px]">
                            <Select value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Loại giao dịch" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Tất cả loại</SelectItem>
                                    <SelectItem value="DEPOSIT">Nạp tiền</SelectItem>
                                    <SelectItem value="WITHDRAW">Rút tiền</SelectItem>
                                    <SelectItem value="PAYMENT">Thanh toán</SelectItem>
                                    <SelectItem value="REFUND">Hoàn tiền</SelectItem>
                                    <SelectItem value="ADJUSTMENT">Điều chỉnh</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="w-full lg:w-[180px]">
                            <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
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
                        <Button
                            variant="outline"
                            size="icon"
                            title="Đặt lại bộ lọc"
                            onClick={handleReset}
                            className="shrink-0"
                        >
                            <RotateCcw className="w-4 h-4" />
                        </Button>
                    </div>

                    {/* Table / States */}
                    {loading || txLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <Skeleton key={i} className="h-11 w-full rounded-2xl" />
                            ))}
                        </div>
                    ) : transactions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-[48px] gap-4 text-center">
                            <History className="w-10 h-10 text-muted-foreground/30" />
                            <p className="font-medium text-muted-foreground">Chưa có giao dịch nào</p>
                            <p className="text-sm text-muted-foreground/70">Các giao dịch nạp tiền và thanh toán sẽ xuất hiện ở đây.</p>
                        </div>
                    ) : (
                        <>
                            <div className="rounded-2xl border border-border/60 overflow-hidden">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                                            <TableHead className="w-[110px]">Mã chứng từ</TableHead>
                                            <TableHead className="w-[120px]">Loại</TableHead>
                                            <TableHead className="text-right">Số tiền</TableHead>
                                            <TableHead className="text-right">Số dư trước</TableHead>
                                            <TableHead className="text-right">Số dư sau</TableHead>
                                            <TableHead>Mô tả</TableHead>
                                            <TableHead className="w-[130px] text-right">Thời gian</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {transactions.map((tx) => {
                                            const typeInfo = TYPE_MAP[tx.type as TxType];
                                            const credit = isCredit(tx.type);
                                            return (
                                                <TableRow key={tx.id} className="hover:bg-muted/20">
                                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                                        {tx.id.substring(0, 8).toUpperCase()}
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className={cn(
                                                            "text-xs font-semibold px-2 py-1 rounded-xl",
                                                            typeInfo?.color ?? "bg-gray-100 text-gray-600"
                                                        )}>
                                                            {typeInfo?.label ?? tx.type}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className={cn(
                                                        "text-right font-semibold tabular-nums",
                                                        credit ? "text-green-600" : "text-red-600"
                                                    )}>
                                                        {credit ? "+" : "-"}{formatCurrency(tx.amount)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground text-sm tabular-nums">
                                                        {formatCurrency(tx.balance_before)}
                                                    </TableCell>
                                                    <TableCell className="text-right text-muted-foreground text-sm tabular-nums">
                                                        {formatCurrency(tx.balance_after)}
                                                    </TableCell>
                                                    <TableCell className="max-w-[200px]">
                                                        <span className="truncate block text-sm" title={tx.description}>
                                                            {tx.description || <span className="text-muted-foreground/50 italic">—</span>}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                                                        {format(new Date(tx.created_at), "dd/MM/yyyy HH:mm")}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <div className="flex items-center justify-between pt-2">
                                <p className="text-sm text-muted-foreground">
                                    Trang {page} / {totalPages}
                                    {total > 0 && (
                                        <span className="ml-1 text-muted-foreground/60">
                                            ({total} giao dịch)
                                        </span>
                                    )}
                                </p>
                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                                        disabled={page <= 1}
                                    >
                                        <ChevronLeft className="w-4 h-4 mr-1" /> Trước
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page >= totalPages}
                                    >
                                        Tiếp <ChevronRight className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

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
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wallet, ArrowUpRight, ArrowDownLeft, History, CreditCard, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";

export default function FinancePage() {
    const { showToast } = useToast();
    const router = useRouter();
    const [balance, setBalance] = useState<OrganizationBalance | null>(null);
    const [transactions, setTransactions] = useState<OrganizationBalanceTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [depositAmount, setDepositAmount] = useState("");
    const [depositLoading, setDepositLoading] = useState(false);
    const [isDepositOpen, setIsDepositOpen] = useState(false);

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
                accountBalanceService.getTransactions(token, orgId, { limit: 10 })
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

    const handleDeposit = async () => {
        try {
            const amount = parseInt(depositAmount.replace(/\D/g, ''));
            if (!amount || amount < 10000) {
                showToast("Số tiền tối thiểu là 10.000đ", "error");
                return;
            }

            setDepositLoading(true);
            const token = authStorage.getAccessToken();
            // Call API to create deposit
            // This usually returns a Sepay payment link or QR code info
            // For now, we assume it might trigger a redirect or return data to show QR
            const res = await accountBalanceService.createDeposit(token || "", orgId, amount, "Nạp tiền vào ví");

            showToast("Tạo yêu cầu nạp tiền thành công", "success");
            setIsDepositOpen(false);

            // If response has paymentUrl/qrUrl, navigate or show it.
            // For MVP/Demo:
            fetchData(); // Refresh to see if (magic) instant update happens or just close

        } catch (error) {
            console.error("Deposit failed", error);
            showToast("Tạo yêu cầu thất bại", "error");
        } finally {
            setDepositLoading(false);
        }
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    if (!orgId) {
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
                <Card className="md:col-span-1 bg-gradient-to-br from-brand/10 to-transparent border-brand/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            <Wallet className="w-4 h-4" /> Số dư ví
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin text-brand" />
                        ) : (
                            <div>
                                <div className="text-3xl font-bold text-brand">
                                    {formatCurrency(balance?.balance || 0)}
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <Dialog open={isDepositOpen} onOpenChange={setIsDepositOpen}>
                                        <DialogTrigger asChild>
                                            <Button className="w-full bg-brand hover:bg-brand-hover shadow-lg shadow-brand/20">
                                                <ArrowUpRight className="w-4 h-4 mr-2" /> Nạp tiền
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Nạp tiền vào ví</DialogTitle>
                                                <DialogDescription>
                                                    Nhập số tiền bạn muốn nạp. Chúng tôi hỗ trợ thanh toán qua chuyển khoản ngân hàng (QR Code).
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="py-4 space-y-4">
                                                <div className="space-y-2">
                                                    <Label>Số tiền (VND)</Label>
                                                    <Input
                                                        placeholder="VD: 500,000"
                                                        value={depositAmount}
                                                        onChange={(e) => setDepositAmount(e.target.value)}
                                                        type="number"
                                                    />
                                                </div>
                                            </div>
                                            <DialogFooter>
                                                <Button variant="outline" onClick={() => setIsDepositOpen(false)}>Hủy</Button>
                                                <Button onClick={handleDeposit} disabled={depositLoading} className="bg-brand">
                                                    {depositLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Xác nhận nạp"}
                                                </Button>
                                            </DialogFooter>
                                        </DialogContent>
                                    </Dialog>

                                    <Button variant="outline" className="w-full">
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
                    <CardTitle className="flex items-center gap-2">
                        <History className="w-5 h-5" /> Lịch sử giao dịch
                    </CardTitle>
                </CardHeader>
                <CardContent>
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

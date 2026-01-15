"use client";

import { useEffect, useState } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { rentalContractService } from "@/services/rental-contract/rental-contract.service";
import { accountBalanceService } from "@/services/account-balance/account-balance.service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    LayoutDashboard,
    FileText,
    FileCheck,
    Wallet,
    Search,
    ArrowUpRight,
    Bell
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CustomerDashboardOverview() {
    const router = useRouter();
    const [stats, setStats] = useState({
        activeContracts: 0,
        pendingBookings: 0,
        balance: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = authStorage.getAccessToken();
                const user = authStorage.getUser();
                if (!token) return;

                // Parallel fetching
                const promises = [
                    rentalContractService.getRentalContracts(token, { status: "ACTIVE", limit: 1 }), // Just to get total/count if API returns meta
                    rentalContractService.getRentalContracts(token, { status: "PENDING", limit: 1 }),
                ];

                if (user?.organization_id) {
                    promises.push(accountBalanceService.getOrganizationBalance(token, user.organization_id));
                }

                const [activeRes, pendingRes, balanceRes] = await Promise.all(promises);

                // Assuming API returns { meta: { total: number }, items: ... } or similar
                // If not, we might rely on the length of items if limit is small, but better if API has total.
                // Based on previous files, it seems valid.

                const activeCount = (activeRes as any)?.meta?.total || (activeRes as any)?.items?.length || 0;
                const pendingCount = (pendingRes as any)?.meta?.total || (pendingRes as any)?.items?.length || 0;
                const balanceVal = (balanceRes as any)?.balance || 0;

                setStats({
                    activeContracts: activeCount,
                    pendingBookings: pendingCount,
                    balance: balanceVal
                });

            } catch (error) {
                console.error("Failed to fetch dashboard stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tổng quan</h1>
                    <p className="text-muted-foreground">Chào mừng trở lại! Dưới đây là tóm tắt hoạt động của bạn.</p>
                </div>
                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => router.push("/dashboard/customer/warehouses")}>
                        <Search className="w-4 h-4 mr-2" />
                        Tìm kho mới
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Active Contracts Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Hợp đồng đang thuê</CardTitle>
                        <FileCheck className="h-4 w-4 text-brand" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "-" : stats.activeContracts}</div>
                        <p className="text-xs text-muted-foreground">hợp đồng đang hiệu lực</p>
                        <Link href="/dashboard/customer/contracts" className="text-xs text-brand hover:underline mt-2 inline-block">
                            Xem chi tiết
                        </Link>
                    </CardContent>
                </Card>

                {/* Pending Bookings Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Yêu cầu chờ duyệt</CardTitle>
                        <FileText className="h-4 w-4 text-orange-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{loading ? "-" : stats.pendingBookings}</div>
                        <p className="text-xs text-muted-foreground">yêu cầu đang xử lý</p>
                        <Link href="/dashboard/customer/bookings" className="text-xs text-brand hover:underline mt-2 inline-block">
                            Xem danh sách
                        </Link>
                    </CardContent>
                </Card>

                {/* Balance Card */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Số dư ví</CardTitle>
                        <Wallet className="h-4 w-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono">
                            {loading ? "-" : formatCurrency(stats.balance)}
                        </div>
                        <p className="text-xs text-muted-foreground">khả dụng</p>
                        <Link href="/dashboard/customer/payment" className="text-xs text-brand hover:underline mt-2 inline-block">
                            Quản lý ví
                        </Link>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity / Notifications Placeholder */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Thông báo mới</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-col gap-4">
                            {/* Placeholder notifications */}
                            <div className="bg-muted/30 p-3 rounded-lg flex gap-3">
                                <div className="bg-blue-100 p-2 rounded-full h-8 w-8 flex items-center justify-center">
                                    <Bell className="w-4 h-4 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium">Hệ thống</p>
                                    <p className="text-xs text-muted-foreground">Chào mừng bạn đến với GenHub Customer Dashboard.</p>
                                    <p className="text-[10px] text-muted-foreground mt-1">Vừa xong</p>
                                </div>
                            </div>
                            <p className="text-center text-sm text-muted-foreground py-4">Không có thông báo mới nào khác.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-1">
                    <CardHeader>
                        <CardTitle className="text-lg">Khám phá</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => router.push('/dashboard/customer/warehouses')}>
                                <h4 className="font-semibold mb-1">Tìm kho lạnh</h4>
                                <p className="text-sm text-muted-foreground">Duyệt qua danh sách kho lạnh đạt chuẩn GSP với hệ thống kiểm soát nhiệt độ hiện đại.</p>
                            </div>
                            <div className="border border-border rounded-lg p-4 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => router.push('/dashboard/customer/warehouses')}>
                                <h4 className="font-semibold mb-1">Kho thương mại điện tử</h4>
                                <p className="text-sm text-muted-foreground">Giải pháp fulfillment trọn gói cho doanh nghiệp TMĐT.</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

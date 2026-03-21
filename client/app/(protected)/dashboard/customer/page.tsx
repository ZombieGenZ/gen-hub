"use client";

import { useEffect, useState } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { UserService } from "@/services/user/user.service";
import { CustomerKPIs } from "@/components/dashboard/customer/CustomerKPIs";
import { CustomerStockFlow } from "@/components/dashboard/customer/CustomerStockFlow";
import { CustomerTopProducts } from "@/components/dashboard/customer/CustomerTopProducts";
import { CustomerStockAlerts } from "@/components/dashboard/customer/CustomerStockAlerts";
import { CustomerShipments } from "@/components/dashboard/customer/CustomerShipments";
import { CustomerDashboardHeader } from "@/components/dashboard/customer/CustomerDashboardHeader";
import { Card, CardContent } from "@/components/ui/card";

export default function CustomerDashboardOverview() {
    const userService = new UserService();
    const [dateFilter, setDateFilter] = useState("week");
    const [orgId, setOrgId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUserOrg = async () => {
            setLoading(true);
            try {
                const token = authStorage.getAccessToken();
                const refreshToken = authStorage.getRefreshToken();
                if (!token || !refreshToken) return;

                const user = await userService.getUser(token, refreshToken);
                // User info available
                const currentOrgId = user?.organization_id;
                // Found OrgID
                
                if (currentOrgId) {
                    setOrgId(currentOrgId);
                }
            } catch (error) {
                console.error("Failed to fetch user org", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserOrg();
    }, []);

    if (loading) {
        return (
            <div className="space-y-4">
                <CustomerDashboardHeader dateFilter={dateFilter} setDateFilter={setDateFilter} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="border-0 shadow-premium">
                            <CardContent className="h-[120px] flex items-center justify-center text-muted-foreground">
                                Đang tải...
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!orgId) {
        return (
            <div className="space-y-4">
                <CustomerDashboardHeader dateFilter={dateFilter} setDateFilter={setDateFilter} />
                <div className="p-8 text-center text-muted-foreground">
                    Không tìm thấy thông tin tổ chức. Vui lòng thử lại sau.
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <CustomerDashboardHeader dateFilter={dateFilter} setDateFilter={setDateFilter} />

            {/* KPI Area (Top Row) */}
            <CustomerKPIs orgId={orgId} />

            {/* Main Content Layout - Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Stock Flow Analysis Chart (2/3) */}
                <div className="lg:col-span-2">
                    <CustomerStockFlow orgId={orgId} />
                </div>
                
                {/* Top Products (1/3) */}
                <div>
                    <CustomerTopProducts orgId={orgId} />
                </div>
                
                {/* Stocks Alert (1/3) */}
                <div>
                    <CustomerStockAlerts orgId={orgId} />
                </div>
            </div>

            {/* Main Content Layout - Row 2 */}
            <div className="grid grid-cols-1 gap-3">
                {/* Shipments Timeline Table (2/3) */}
                <div>
                    <CustomerShipments orgId={orgId} />
                </div>
            </div>
        </div>
    );
}


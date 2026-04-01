"use client";

import { useEffect, useState } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { UserService } from "@/services/user/user.service";
import { CustomerKPIs } from "@/components/dashboard/organization/CustomerKPIs";
import { CustomerStockFlow } from "@/components/dashboard/organization/CustomerStockFlow";
import { CustomerTopProducts } from "@/components/dashboard/organization/CustomerTopProducts";
import { CustomerStockAlerts } from "@/components/dashboard/organization/CustomerStockAlerts";
import { CustomerShipments } from "@/components/dashboard/organization/CustomerShipments";
import { CustomerDashboardHeader } from "@/components/dashboard/organization/CustomerDashboardHeader";
import { Card, CardContent } from "@/components/ui/card";
import { useOrganizationRealtime } from "@/hooks/useOrganizationRealtime";
import { useToast } from "@/contexts/ToastContext";

const DASHBOARD_REALTIME_EVENTS = [
    "inbound:created",
    "inbound:approved",
    "inbound:rejected",
    "inbound:receiving-confirmed",
    "inbound:putaway-confirmed",
    "outbound:created",
    "outbound:approved",
    "outbound:rejected",
    "outbound:picking-confirmed",
    "outbound:checking-confirmed",
    "outbound:shipment-completed",
    "rentalContract:created",
    "rentalContract:statusUpdated",
    "rentalContract:renewed",
    "refundRequest:created",
    "refundRequest:statusChanged",
];

export default function CustomerDashboardOverview() {
    const userService = new UserService();
    const { showToast } = useToast();
    const [dateFilter, setDateFilter] = useState("week");
    const [orgId, setOrgId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshTick, setRefreshTick] = useState(0);

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

    useOrganizationRealtime({
        orgId,
        events: DASHBOARD_REALTIME_EVENTS,
        enabled: !!orgId,
        onEvent: (eventName) => {
            setRefreshTick((prev) => prev + 1);

            if (eventName === "outbound:shipment-completed") {
                showToast("Vận đơn đã hoàn tất, dashboard đã được cập nhật", "success");
            }
        },
    });

    if (loading) {
        return (
            <div className="space-y-4">
                <CustomerDashboardHeader dateFilter={dateFilter} setDateFilter={setDateFilter} />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="border-0 shadow-premium">
                            <CardContent className="h-30 flex items-center justify-center text-muted-foreground">
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
            <CustomerKPIs key={`kpis-${orgId}-${refreshTick}`} orgId={orgId} />

            {/* Main Content Layout - Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {/* Stock Flow Analysis Chart (2/3) */}
                <div className="lg:col-span-2">
                    <CustomerStockFlow key={`stock-flow-${orgId}-${refreshTick}`} orgId={orgId} />
                </div>

                {/* Top Products (1/3) */}
                <div>
                    <CustomerTopProducts key={`top-products-${orgId}-${refreshTick}`} orgId={orgId} />
                </div>

                {/* Stocks Alert (1/3) */}
                <div>
                    <CustomerStockAlerts key={`stock-alerts-${orgId}-${refreshTick}`} orgId={orgId} />
                </div>
            </div>

            {/* Main Content Layout - Row 2 */}
            <div className="grid grid-cols-1 gap-3">
                {/* Shipments Timeline Table (2/3) */}
                <div>
                    <CustomerShipments key={`shipments-${orgId}-${refreshTick}`} orgId={orgId} />
                </div>
            </div>
        </div>
    );
}


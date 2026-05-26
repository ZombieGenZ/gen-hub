"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    BuildingStorefrontIcon,
    UsersIcon,
    CurrencyDollarIcon,
    ArrowRightIcon,
    ArrowPathIcon,
    ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { authStorage } from "@/services/auth/auth-storage.service";
import { orgHelper } from "@/lib/organization.utils";
import { warehouseOwnerService } from "@/services/warehouse-owner/warehouse-owner.service";
import type { WarehouseOwnerSummary } from "@/services/warehouse-owner/warehouse-owner.types";
import { TrustBadge } from "@/components/marketplace/TrustBadge";

const PLACEHOLDER = "/placeholder-warehouse.svg";

function formatVND(n: number) {
    return new Intl.NumberFormat("vi-VN").format(n);
}

function StatusPill({ status }: { status: string }) {
    const map: Record<string, string> = {
        AVAILABLE: "bg-green-100 text-green-700",
        RENTED: "bg-blue-100 text-blue-700",
        LOCKED: "bg-gray-100 text-gray-500",
    };
    const label: Record<string, string> = {
        AVAILABLE: "Sẵn sàng",
        RENTED: "Đang cho thuê",
        LOCKED: "Tạm khóa",
    };
    return (
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
            {label[status] ?? status}
        </span>
    );
}

export default function MyWarehousesPage() {
    const router = useRouter();
    const [orgId, setOrgId] = useState<string | null>(null);
    const [warehouses, setWarehouses] = useState<WarehouseOwnerSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        void (async () => {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const id = await orgHelper.getOrgId(token);
            setOrgId(id);
        })();
    }, []);

    const fetch = useCallback(async () => {
        if (!orgId) return;
        setIsLoading(true);
        setError(null);
        try {
            const data = await warehouseOwnerService.getMyWarehouses(orgId);
            setWarehouses(data);
        } catch {
            setError("Không thể tải danh sách kho. Vui lòng thử lại.");
        } finally {
            setIsLoading(false);
        }
    }, [orgId]);

    useEffect(() => {
        void fetch();
    }, [fetch]);

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <BuildingStorefrontIcon className="h-7 w-7 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Kho của tôi (Chủ kho)</h1>
                        <p className="text-sm text-gray-500">Quản lý kho bãi bạn sở hữu — khách thuê, hợp đồng, doanh thu</p>
                    </div>
                </div>
                <button
                    onClick={() => void fetch()}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                >
                    <ArrowPathIcon className="h-4 w-4" />
                    Làm mới
                </button>
            </div>

            {isLoading ? (
                <div className="text-center py-16 text-gray-600">Đang tải...</div>
            ) : error ? (
                <div className="flex items-center gap-2 text-red-600 py-8">
                    <ExclamationCircleIcon className="h-5 w-5" />
                    {error}
                </div>
            ) : warehouses.length === 0 ? (
                <div className="text-center py-16">
                    <BuildingStorefrontIcon className="h-14 w-14 mx-auto mb-3 text-gray-200" />
                    <p className="text-gray-500 font-medium">Bạn chưa sở hữu kho nào</p>
                    <p className="text-gray-500 text-sm mt-1">
                        Kho bãi do tổ chức của bạn sở hữu sẽ xuất hiện ở đây.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {warehouses.map((wh) => {
                        const img = wh.images?.[0]?.url ?? PLACEHOLDER;
                        const province = wh.ward?.province?.name ?? "";
                        const ward = wh.ward?.name ?? "";
                        const area = wh.length * wh.width;

                        return (
                            <div
                                key={wh.id}
                                onClick={() => router.push(`/dashboard/organization/my-warehouses/${wh.id}`)}
                                className="border border-gray-200 rounded-2xl overflow-hidden bg-white cursor-pointer hover:shadow-md hover:border-blue-300 transition-all"
                            >
                                {/* Image */}
                                <div className="relative h-44 bg-gray-100">
                                    <img
                                        src={img}
                                        alt={wh.name}
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER; }}
                                    />
                                    <div className="absolute top-3 left-3 flex flex-col gap-1">
                                        <StatusPill status={wh.rental_status} />
                                        {wh.is_cold_storage && (
                                            <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded-full font-medium">
                                                Kho mát
                                            </span>
                                        )}
                                    </div>
                                    {wh.trust_profile && wh.trust_profile.badge_level !== "NONE" && (
                                        <div className="absolute top-3 right-3">
                                            <TrustBadge level={wh.trust_profile.badge_level} size="sm" showLabel={false} />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="p-4 space-y-3">
                                    <div>
                                        <p className="font-semibold text-slate-900 line-clamp-1">{wh.name}</p>
                                        <p className="text-xs text-gray-600 line-clamp-1">
                                            {[wh.address_detail, ward, province].filter(Boolean).join(", ")}
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>{area.toLocaleString()} m²</span>
                                        <span className="font-semibold text-gray-800">
                                            {formatVND(Number(wh.price_per_month))} đ/tháng
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gray-100">
                                        <div className="flex items-center gap-1.5 text-sm">
                                            <UsersIcon className="h-4 w-4 text-blue-400" />
                                            <span className="font-medium">{wh.active_tenant_count}</span>
                                            <span className="text-gray-600 text-xs">khách thuê</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm justify-end">
                                            <CurrencyDollarIcon className="h-4 w-4 text-green-500" />
                                            <span className="font-medium text-green-700 text-xs">
                                                {formatVND(Number(wh.total_paid))} đ
                                            </span>
                                        </div>
                                    </div>

                                    <button className="w-full flex items-center justify-center gap-1.5 text-sm text-blue-600 hover:text-blue-800 font-medium mt-1">
                                        Xem chi tiết <ArrowRightIcon className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

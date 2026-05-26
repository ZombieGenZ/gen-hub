"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
    BuildingStorefrontIcon,
    UsersIcon,
    DocumentTextIcon,
    CurrencyDollarIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    CheckCircleIcon,
    PhoneIcon,
    EnvelopeIcon,
    BuildingOffice2Icon,
    IdentificationIcon,
    MapPinIcon,
    ArrowPathIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { ShieldCheckIcon, StarIcon } from "@heroicons/react/24/solid";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";
import Link from "next/link";
import { authStorage } from "@/services/auth/auth-storage.service";
import { orgHelper } from "@/lib/organization.utils";
import { warehouseOwnerService } from "@/services/warehouse-owner/warehouse-owner.service";
import type {
    WarehouseOverviewData,
    TenantLease,
    ContractHistoryResponse,
    RevenueData,
    ContractStatus,
} from "@/services/warehouse-owner/warehouse-owner.types";
import {
    CONTRACT_STATUS_LABELS,
    CONTRACT_STATUS_COLORS,
} from "@/services/warehouse-owner/warehouse-owner.types";

const TABS = [
    { id: "overview", label: "Tổng quan", icon: BuildingStorefrontIcon },
    { id: "tenants", label: "Khách thuê", icon: UsersIcon },
    { id: "contracts", label: "Hợp đồng", icon: DocumentTextIcon },
    { id: "revenue", label: "Doanh thu", icon: CurrencyDollarIcon },
] as const;
type TabId = (typeof TABS)[number]["id"];

function formatVND(n: number) {
    return new Intl.NumberFormat("vi-VN").format(n);
}

function KpiCard({
    label,
    value,
    sub,
    icon: Icon,
    color = "blue",
    warn = false,
}: {
    label: string;
    value: string | number;
    sub?: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    color?: "blue" | "green" | "amber" | "red";
    warn?: boolean;
}) {
    const colors = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-green-50 text-green-600",
        amber: "bg-amber-50 text-amber-600",
        red: "bg-red-50 text-red-600",
    };
    return (
        <div className={`border rounded-xl p-4 bg-white ${warn ? "border-red-200" : "border-gray-200"}`}>
            <div className="flex items-center gap-2 mb-2">
                <div className={`p-1.5 rounded-lg ${colors[color as keyof typeof colors]}`}>
                    <Icon className="h-4 w-4" />
                </div>
                <span className="text-xs text-gray-500">{label}</span>
            </div>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        </div>
    );
}

export default function MyWarehouseDetailPage() {
    const params = useParams<{ id: string }>();
    const templateId = params.id;

    const [orgId, setOrgId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabId>("overview");

    const [overview, setOverview] = useState<WarehouseOverviewData | null>(null);
    const [tenants, setTenants] = useState<TenantLease[]>([]);
    const [contracts, setContracts] = useState<ContractHistoryResponse | null>(null);
    const [revenue, setRevenue] = useState<RevenueData | null>(null);

    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [contractPage, setContractPage] = useState(1);
    const [contractStatus, setContractStatus] = useState<ContractStatus | "">("");

    useEffect(() => {
        void (async () => {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const id = await orgHelper.getOrgId(token);
            setOrgId(id);
        })();
    }, []);

    const loadOverview = useCallback(async (org: string) => {
        setLoading((prev) => ({ ...prev, overview: true }));
        try {
            const data = await warehouseOwnerService.getWarehouseOverview(org, templateId);
            setOverview(data);
        } finally {
            setLoading((prev) => ({ ...prev, overview: false }));
        }
    }, [templateId]);

    const loadTenants = useCallback(async (org: string) => {
        setLoading((prev) => ({ ...prev, tenants: true }));
        try {
            const data = await warehouseOwnerService.getWarehouseTenants(org, templateId);
            setTenants(data);
        } finally {
            setLoading((prev) => ({ ...prev, tenants: false }));
        }
    }, [templateId]);

    const loadContracts = useCallback(async (org: string, page: number, status?: string) => {
        setLoading((prev) => ({ ...prev, contracts: true }));
        try {
            const data = await warehouseOwnerService.getWarehouseContracts(org, templateId, {
                page,
                status: status as ContractStatus | undefined,
            });
            setContracts(data);
        } finally {
            setLoading((prev) => ({ ...prev, contracts: false }));
        }
    }, [templateId]);

    const loadRevenue = useCallback(async (org: string) => {
        setLoading((prev) => ({ ...prev, revenue: true }));
        try {
            const data = await warehouseOwnerService.getWarehouseRevenue(org, templateId);
            setRevenue(data);
        } finally {
            setLoading((prev) => ({ ...prev, revenue: false }));
        }
    }, [templateId]);

    useEffect(() => {
        if (!orgId) return;
        void loadOverview(orgId);
    }, [orgId, loadOverview]);

    useEffect(() => {
        if (!orgId) return;
        if (activeTab === "tenants" && tenants.length === 0) void loadTenants(orgId);
        if (activeTab === "contracts") void loadContracts(orgId, contractPage, contractStatus || undefined);
        if (activeTab === "revenue" && !revenue) void loadRevenue(orgId);
    }, [activeTab, orgId]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (!orgId || activeTab !== "contracts") return;
        void loadContracts(orgId, contractPage, contractStatus || undefined);
    }, [contractPage, contractStatus]); // eslint-disable-line react-hooks/exhaustive-deps

    const t = overview?.template;
    const s = overview?.stats;

    return (
        <div className="space-y-6 p-6">
            {/* Back + Title */}
            <div className="flex items-center gap-3">
                <Link
                    href="/dashboard/organization/my-warehouses"
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                >
                    <ChevronLeftIcon className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900 line-clamp-1">
                        {t?.name ?? "Đang tải..."}
                    </h1>
                    <p className="text-xs text-gray-400">
                        {t?.ward ? `${t.ward.name}, ${t.ward.province.name}` : ""}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-0">
                    {TABS.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                    activeTab === tab.id
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-gray-700"
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                            </button>
                        );
                    })}
                </nav>
            </div>

            {/* ───────── TAB: OVERVIEW ───────── */}
            {activeTab === "overview" && (
                <div className="space-y-6">
                    {loading.overview ? (
                        <div className="text-center py-12 text-gray-400">Đang tải...</div>
                    ) : s ? (
                        <>
                            {/* KPI grid */}
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                                <KpiCard label="Khách thuê hiện tại" value={s.active_tenant_count} icon={UsersIcon} color="blue" />
                                <KpiCard label="Tổng hợp đồng" value={s.total_contract_count} icon={DocumentTextIcon} color="blue" />
                                <KpiCard
                                    label="Hết hạn trong 30 ngày"
                                    value={s.expiring_soon_count}
                                    icon={ClockIcon}
                                    color={s.expiring_soon_count > 0 ? "amber" : "green"}
                                    warn={s.expiring_soon_count > 0}
                                />
                                <KpiCard
                                    label="Hợp đồng quá hạn"
                                    value={s.overdue_contract_count}
                                    icon={ExclamationTriangleIcon}
                                    color={s.overdue_contract_count > 0 ? "red" : "green"}
                                    warn={s.overdue_contract_count > 0}
                                />
                                <KpiCard label="Thu trong 30 ngày" value={`${formatVND(s.paid_this_month)} đ`} icon={CurrencyDollarIcon} color="green" />
                                <KpiCard label="Chờ thanh toán" value={`${formatVND(s.pending_amount)} đ`} icon={CurrencyDollarIcon} color="amber" />
                            </div>

                            {/* Warehouse details */}
                            {t && (
                                <div className="border border-gray-200 rounded-xl p-5 bg-white">
                                    <h3 className="font-semibold text-gray-800 mb-3">Thông tin kho</h3>
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                            <span className="text-gray-400">Diện tích:</span>{" "}
                                            <span className="font-medium">{t.length * t.width} m²</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Giá thuê:</span>{" "}
                                            <span className="font-medium">{formatVND(Number(t.price_per_month))} đ/tháng</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Chiều cao:</span>{" "}
                                            <span className="font-medium">{t.ceiling_height ?? "—"} m</span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Loại:</span>{" "}
                                            <span className="font-medium">{t.is_cold_storage ? "Kho mát" : "Kho thường"}</span>
                                        </div>
                                    </div>
                                    {/* Trust badge */}
                                    {t.trust_profile && (
                                        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
                                            {t.trust_profile.badge_level === "PREMIUM" ? (
                                                <StarIcon className="h-5 w-5 text-amber-500" />
                                            ) : t.trust_profile.badge_level === "VERIFIED" ? (
                                                <ShieldCheckIcon className="h-5 w-5 text-blue-500" />
                                            ) : null}
                                            <div>
                                                <p className="text-sm font-medium text-gray-800">
                                                    {t.trust_profile.badge_level === "PREMIUM"
                                                        ? "Đối tác uy tín"
                                                        : t.trust_profile.badge_level === "VERIFIED"
                                                        ? "Đã xác minh"
                                                        : "Chưa xác minh"}
                                                </p>
                                                <p className="text-xs text-gray-400">
                                                    Điểm uy tín: {t.trust_profile.trust_score}/55
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    ) : null}
                </div>
            )}

            {/* ───────── TAB: TENANTS ───────── */}
            {activeTab === "tenants" && (
                <div className="space-y-3">
                    {loading.tenants ? (
                        <div className="text-center py-12 text-gray-400">Đang tải...</div>
                    ) : tenants.length === 0 ? (
                        <div className="text-center py-12 text-gray-300">
                            <UsersIcon className="h-12 w-12 mx-auto mb-2 opacity-40" />
                            <p className="text-gray-400">Kho hiện không có khách thuê</p>
                        </div>
                    ) : (
                        tenants.map((lease) => {
                            const org = lease.tenant;
                            const detail = lease.warehouse_detail;
                            return (
                                <div key={lease.contract_id} className="border border-gray-200 rounded-xl p-5 bg-white space-y-4">
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <BuildingOffice2Icon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                                            <div>
                                                <p className="font-semibold text-gray-900">{org.name}</p>
                                                {org.international_name && (
                                                    <p className="text-xs text-gray-400">{org.international_name}</p>
                                                )}
                                            </div>
                                        </div>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONTRACT_STATUS_COLORS[lease.status]}`}>
                                            {CONTRACT_STATUS_LABELS[lease.status]}
                                        </span>
                                    </div>

                                    {/* Customer info grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                        {org.tax_code && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <IdentificationIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                <span>MST: <strong>{org.tax_code}</strong></span>
                                            </div>
                                        )}
                                        {org.representative_name && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <UsersIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                <span>
                                                    {org.representative_name}
                                                    {org.representative_title ? ` — ${org.representative_title}` : ""}
                                                </span>
                                            </div>
                                        )}
                                        {org.representative_phone && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <PhoneIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                <a href={`tel:${org.representative_phone}`} className="hover:text-blue-600">
                                                    {org.representative_phone}
                                                </a>
                                            </div>
                                        )}
                                        {org.representative_email && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <EnvelopeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                                <a href={`mailto:${org.representative_email}`} className="hover:text-blue-600 truncate">
                                                    {org.representative_email}
                                                </a>
                                            </div>
                                        )}
                                        {org.headquarters_address && (
                                            <div className="flex items-start gap-2 text-gray-600 sm:col-span-2">
                                                <MapPinIcon className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                                <span>{org.headquarters_address}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Contract & payment summary */}
                                    <div className="border-t border-gray-100 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                        <div>
                                            <p className="text-gray-400 text-xs">Mã HĐ</p>
                                            <p className="font-mono font-medium text-gray-800">{lease.contract_code}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-xs">Bắt đầu</p>
                                            <p className="font-medium text-gray-800">
                                                {new Date(lease.started_at).toLocaleDateString("vi-VN")}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-xs">Hết hạn</p>
                                            <p className={`font-medium ${
                                                lease.expired_at && new Date(lease.expired_at) < new Date(Date.now() + 30 * 86400_000)
                                                    ? "text-amber-600"
                                                    : "text-gray-800"
                                            }`}>
                                                {lease.expired_at
                                                    ? new Date(lease.expired_at).toLocaleDateString("vi-VN")
                                                    : "Không xác định"}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-gray-400 text-xs">Giá trị HĐ</p>
                                            <p className="font-semibold text-gray-900">
                                                {formatVND(Number(lease.final_price))} đ
                                            </p>
                                        </div>
                                        {detail && (
                                            <>
                                                <div>
                                                    <p className="text-gray-400 text-xs">Đơn giá/tháng</p>
                                                    <p className="font-medium text-gray-800">
                                                        {formatVND(Number(detail.price_per_month))} đ
                                                    </p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-400 text-xs">Thời hạn</p>
                                                    <p className="font-medium text-gray-800">{detail.rental_days} ngày</p>
                                                </div>
                                            </>
                                        )}
                                        {lease.last_payment && (
                                            <div className="sm:col-span-2">
                                                <p className="text-gray-400 text-xs">Thanh toán gần nhất</p>
                                                <p className="font-medium text-green-700 flex items-center gap-1">
                                                    <CheckCircleIcon className="h-3.5 w-3.5" />
                                                    {formatVND(lease.last_payment.amount)} đ —{" "}
                                                    {new Date(lease.last_payment.paid_at).toLocaleDateString("vi-VN")}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* ───────── TAB: CONTRACTS ───────── */}
            {activeTab === "contracts" && (
                <div className="space-y-4">
                    {/* Filter */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <select
                            value={contractStatus}
                            onChange={(e) => {
                                setContractStatus(e.target.value as ContractStatus | "");
                                setContractPage(1);
                            }}
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">Tất cả trạng thái</option>
                            {Object.entries(CONTRACT_STATUS_LABELS).map(([k, v]) => (
                                <option key={k} value={k}>{v}</option>
                            ))}
                        </select>
                        <span className="text-sm text-gray-400">
                            {contracts ? `${contracts.total} hợp đồng` : ""}
                        </span>
                    </div>

                    {loading.contracts ? (
                        <div className="text-center py-12 text-gray-400">Đang tải...</div>
                    ) : !contracts || contracts.items.length === 0 ? (
                        <div className="text-center py-12 text-gray-300">
                            <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 opacity-40" />
                            <p className="text-gray-400">Không có hợp đồng nào</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto rounded-xl border border-gray-200">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 border-b border-gray-200">
                                        <tr>
                                            <th className="text-left px-4 py-3 font-medium text-gray-500">Mã HĐ</th>
                                            <th className="text-left px-4 py-3 font-medium text-gray-500">Khách thuê</th>
                                            <th className="text-left px-4 py-3 font-medium text-gray-500">MST</th>
                                            <th className="text-left px-4 py-3 font-medium text-gray-500">Thời gian</th>
                                            <th className="text-right px-4 py-3 font-medium text-gray-500">Giá trị</th>
                                            <th className="text-right px-4 py-3 font-medium text-gray-500">Đã thu</th>
                                            <th className="text-center px-4 py-3 font-medium text-gray-500">Trạng thái</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {contracts.items.map((c) => {
                                            const paid = c.payments
                                                .filter((p) => p.status === "PAID")
                                                .reduce((s, p) => s + p.amount, 0);
                                            return (
                                                <tr key={c.id} className="hover:bg-gray-50">
                                                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{c.code}</td>
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-gray-800 line-clamp-1">{c.organization.name}</p>
                                                        {c.organization.representative_phone && (
                                                            <p className="text-xs text-gray-400">{c.organization.representative_phone}</p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-gray-500">{c.organization.tax_code ?? "—"}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-500">
                                                        <span>{new Date(c.started_at).toLocaleDateString("vi-VN")}</span>
                                                        {c.expired_at && (
                                                            <>
                                                                <br />
                                                                <span>→ {new Date(c.expired_at).toLocaleDateString("vi-VN")}</span>
                                                            </>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-gray-800">
                                                        {formatVND(Number(c.final_price))}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-green-700 font-medium">
                                                        {formatVND(paid)}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CONTRACT_STATUS_COLORS[c.status]}`}>
                                                            {CONTRACT_STATUS_LABELS[c.status]}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {contracts.total_pages > 1 && (
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-400">
                                        Trang {contracts.page}/{contracts.total_pages}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            disabled={contractPage <= 1}
                                            onClick={() => setContractPage((p) => p - 1)}
                                            className="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-40"
                                        >
                                            <ChevronLeftIcon className="h-4 w-4" />
                                        </button>
                                        <button
                                            disabled={contractPage >= contracts.total_pages}
                                            onClick={() => setContractPage((p) => p + 1)}
                                            className="p-1.5 rounded-lg border hover:bg-gray-50 disabled:opacity-40"
                                        >
                                            <ChevronRightIcon className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* ───────── TAB: REVENUE ───────── */}
            {activeTab === "revenue" && (
                <div className="space-y-6">
                    {loading.revenue ? (
                        <div className="text-center py-12 text-gray-400">Đang tải...</div>
                    ) : revenue ? (
                        <>
                            {/* Summary cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                                <div className="border border-gray-200 rounded-xl p-4 bg-white">
                                    <p className="text-xs text-gray-400 mb-1">Tổng hợp đồng</p>
                                    <p className="text-lg font-bold text-gray-900">
                                        {formatVND(revenue.summary.total_contracted)} đ
                                    </p>
                                </div>
                                <div className="border border-green-200 rounded-xl p-4 bg-green-50">
                                    <p className="text-xs text-green-600 mb-1">Đã thu</p>
                                    <p className="text-lg font-bold text-green-700">
                                        {formatVND(revenue.summary.total_paid)} đ
                                    </p>
                                </div>
                                <div className="border border-amber-200 rounded-xl p-4 bg-amber-50">
                                    <p className="text-xs text-amber-600 mb-1">Đang chờ</p>
                                    <p className="text-lg font-bold text-amber-700">
                                        {formatVND(revenue.summary.total_pending)} đ
                                    </p>
                                </div>
                                <div className={`border rounded-xl p-4 ${revenue.summary.total_overdue > 0 ? "border-red-200 bg-red-50" : "border-gray-200 bg-white"}`}>
                                    <p className={`text-xs mb-1 ${revenue.summary.total_overdue > 0 ? "text-red-600" : "text-gray-400"}`}>
                                        Còn thiếu
                                    </p>
                                    <p className={`text-lg font-bold ${revenue.summary.total_overdue > 0 ? "text-red-700" : "text-gray-900"}`}>
                                        {formatVND(revenue.summary.total_overdue)} đ
                                    </p>
                                </div>
                                <div className="border border-blue-200 rounded-xl p-4 bg-blue-50">
                                    <p className="text-xs text-blue-600 mb-1">Tỷ lệ thu</p>
                                    <p className="text-lg font-bold text-blue-700">
                                        {revenue.summary.collection_rate}%
                                    </p>
                                </div>
                            </div>

                            {/* Chart: contracted vs paid per month */}
                            <div className="border border-gray-200 rounded-xl p-5 bg-white">
                                <h3 className="font-semibold text-gray-800 mb-4">
                                    So sánh doanh thu hợp đồng vs thực thu (6 tháng)
                                </h3>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={revenue.monthly} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                                        <YAxis
                                            tick={{ fontSize: 11 }}
                                            tickFormatter={(v: number) =>
                                                v >= 1_000_000
                                                    ? `${(v / 1_000_000).toFixed(0)}M`
                                                    : v >= 1_000
                                                    ? `${(v / 1_000).toFixed(0)}K`
                                                    : String(v)
                                            }
                                        />
                                        <Tooltip
                                            formatter={(value: number | undefined) => `${formatVND(value ?? 0)} đ`}
                                        />
                                        <Legend />
                                        <Bar dataKey="contracted" name="Hợp đồng" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                                        <Bar dataKey="paid" name="Thực thu" fill="#4ade80" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                                <p className="text-xs text-gray-400 mt-2">
                                    * Doanh thu hợp đồng = tổng đơn giá/tháng của hợp đồng hoạt động trong tháng đó.
                                    Thực thu = thanh toán được xác nhận trong tháng.
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-12 text-gray-300">
                            <CurrencyDollarIcon className="h-12 w-12 mx-auto mb-2 opacity-40" />
                            <p className="text-gray-400">Chưa có dữ liệu doanh thu</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

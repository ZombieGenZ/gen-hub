"use client";

import React, { useEffect, useState, useCallback } from "react";
import { authStorage } from "@/services/auth/auth-storage.service";
import { warehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { warehouseAiAnalyticsService } from "@/services/warehouse-ai-analytics/warehouse-ai-analytics.service";
import type {
    AiOverview,
    AiFunnel,
    AiPricePosition,
    AiRecentQuery,
} from "@/services/warehouse-ai-analytics/warehouse-ai-analytics.types";
import { useToast } from "@/contexts/ToastContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    CpuChipIcon,
    CalendarDaysIcon,
    ChatBubbleLeftEllipsisIcon,
    DocumentTextIcon,
    MagnifyingGlassIcon,
    BuildingOffice2Icon,
} from "@heroicons/react/24/outline";

interface WarehouseOption {
    id: string;
    name: string;
}

export default function AdminAiAnalyticsPage() {
    const { showToast } = useToast();

    const [warehouses, setWarehouses] = useState<WarehouseOption[]>([]);
    const [selectedId, setSelectedId] = useState("");

    const [overview, setOverview] = useState<AiOverview | null>(null);
    const [funnel, setFunnel] = useState<AiFunnel | null>(null);
    const [pricePos, setPricePos] = useState<AiPricePosition | null>(null);
    const [queries, setQueries] = useState<AiRecentQuery[]>([]);

    const [loading, setLoading] = useState({
        overview: false,
        funnel: false,
        price: false,
        queries: false,
    });

    // Load warehouse list
    useEffect(() => {
        void (async () => {
            const token = authStorage.getAccessToken();
            if (!token) return;
            try {
                const raw = await warehouseTemplateService.getWarehouseTemplates(token, {
                    is_active: true,
                    limit: 100,
                });
                const items = (Array.isArray(raw) ? raw : (raw?.items ?? [])) as WarehouseOption[];
                setWarehouses(items.map((w) => ({ id: w.id, name: w.name })));
                if (items.length > 0) setSelectedId(items[0].id);
            } catch {
                showToast("Không thể tải danh sách kho", "error");
            }
        })();
    }, []);

    const fetchAll = useCallback(async (id: string) => {
        if (!id) return;
        setLoading({ overview: true, funnel: true, price: true, queries: true });
        const [ov, fn, pp, rq] = await Promise.allSettled([
            warehouseAiAnalyticsService.getOverview(id),
            warehouseAiAnalyticsService.getFunnel(id),
            warehouseAiAnalyticsService.getPricePosition(id),
            warehouseAiAnalyticsService.getRecentQueries(id),
        ]);
        if (ov.status === "fulfilled") setOverview(ov.value);
        else setOverview(null);
        if (fn.status === "fulfilled") setFunnel(fn.value);
        else setFunnel(null);
        if (pp.status === "fulfilled") setPricePos(pp.value);
        else setPricePos(null);
        if (rq.status === "fulfilled") setQueries(rq.value);
        else setQueries([]);
        setLoading({ overview: false, funnel: false, price: false, queries: false });
    }, []);

    useEffect(() => {
        if (selectedId) void fetchAll(selectedId);
    }, [selectedId]);

    return (
        <div className="space-y-6 p-4 md:p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">AI Insights Kho</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Phân tích hiệu quả AI Chatbot — impression, chuyển đổi và vị trí giá cạnh tranh
                    </p>
                </div>
                <div className="w-full sm:w-72">
                    <Select value={selectedId} onValueChange={setSelectedId}>
                        <SelectTrigger className="rounded-xl">
                            <SelectValue placeholder="Chọn kho..." />
                        </SelectTrigger>
                        <SelectContent>
                            {warehouses.map((w) => (
                                <SelectItem key={w.id} value={w.id}>
                                    {w.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KpiCard
                    icon={<CpuChipIcon className="h-5 w-5 text-violet-600" />}
                    label="Tổng lần xuất hiện"
                    value={overview?.total_impressions ?? "—"}
                    sub={overview ? `${overview.impressions_7d} trong 7 ngày` : undefined}
                    loading={loading.overview}
                    color="violet"
                />
                <KpiCard
                    icon={<CalendarDaysIcon className="h-5 w-5 text-blue-600" />}
                    label="Lượt hẹn thăm kho"
                    value={overview?.ai_visits ?? "—"}
                    sub={
                        overview && funnel
                            ? `${funnel.rates.impression_to_visit}% conversion`
                            : undefined
                    }
                    loading={loading.overview}
                    color="blue"
                />
                <KpiCard
                    icon={<ChatBubbleLeftEllipsisIcon className="h-5 w-5 text-teal-600" />}
                    label="Tư vấn qua AI"
                    value={overview?.ai_consultations ?? "—"}
                    loading={loading.overview}
                    color="teal"
                />
                <KpiCard
                    icon={<DocumentTextIcon className="h-5 w-5 text-green-600" />}
                    label="Hợp đồng ký kết"
                    value={funnel?.contracts ?? "—"}
                    sub={
                        funnel
                            ? `Overall: ${funnel.rates.overall}%`
                            : undefined
                    }
                    loading={loading.funnel}
                    color="green"
                />
            </div>

            {/* Avg rank + unique queries info bar */}
            {overview && (
                <div className="flex flex-wrap gap-4 rounded-2xl border bg-muted/30 px-5 py-3 text-sm">
                    <span>
                        <span className="font-semibold">{overview.unique_queries}</span>{" "}
                        <span className="text-muted-foreground">query unique</span>
                    </span>
                    <span className="text-border">|</span>
                    <span>
                        <span className="font-semibold">{overview.impressions_30d}</span>{" "}
                        <span className="text-muted-foreground">lần xuất hiện 30 ngày qua</span>
                    </span>
                    {overview.avg_rank_position !== null && (
                        <>
                            <span className="text-border">|</span>
                            <span>
                                <span className="font-semibold">Hạng TB #{overview.avg_rank_position}</span>{" "}
                                <span className="text-muted-foreground">trong kết quả AI</span>
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* Conversion Funnel + Price Position — side by side */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Funnel */}
                <Card className="rounded-2xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-base">Phễu chuyển đổi AI</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading.funnel ? (
                            <div className="h-40 animate-pulse rounded-xl bg-muted" />
                        ) : funnel ? (
                            <FunnelChart funnel={funnel} />
                        ) : (
                            <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
                        )}
                    </CardContent>
                </Card>

                {/* Price Position */}
                <Card className="rounded-2xl">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <BuildingOffice2Icon className="h-4 w-4" />
                            Vị trí giá khu vực
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading.price ? (
                            <div className="h-40 animate-pulse rounded-xl bg-muted" />
                        ) : pricePos ? (
                            <PricePositionCard pos={pricePos} />
                        ) : (
                            <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Recent Queries */}
            <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <MagnifyingGlassIcon className="h-4 w-4" />
                        20 Query AI Gần Nhất
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading.queries ? (
                        <div className="h-32 animate-pulse rounded-xl bg-muted" />
                    ) : queries.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
                            <CpuChipIcon className="h-8 w-8 opacity-30" />
                            <p className="text-sm">
                                Kho này chưa xuất hiện trong kết quả AI nào.
                                <br />
                                Dữ liệu sẽ xuất hiện sau khi AI Chatbot đề xuất kho này cho người dùng.
                            </p>
                        </div>
                    ) : (
                        <RecentQueriesTable rows={queries} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
    icon,
    label,
    value,
    sub,
    loading,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: number | string;
    sub?: string;
    loading: boolean;
    color: "violet" | "blue" | "teal" | "green";
}) {
    const bg: Record<string, string> = {
        violet: "bg-violet-50",
        blue: "bg-blue-50",
        teal: "bg-teal-50",
        green: "bg-green-50",
    };
    return (
        <Card className="rounded-2xl">
            <CardContent className="p-4">
                <div className={`mb-3 inline-flex rounded-xl p-2 ${bg[color]}`}>{icon}</div>
                {loading ? (
                    <div className="h-7 w-12 animate-pulse rounded bg-muted" />
                ) : (
                    <p className="text-2xl font-bold">{value}</p>
                )}
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                {sub && <p className="mt-0.5 text-xs font-medium text-blue-600">{sub}</p>}
            </CardContent>
        </Card>
    );
}

function FunnelChart({ funnel }: { funnel: AiFunnel }) {
    const max = Math.max(funnel.impressions, 1);
    const steps = [
        {
            label: "Xuất hiện trong AI",
            value: funnel.impressions,
            color: "bg-violet-500",
            rate: null as number | null,
        },
        {
            label: "Hẹn thăm kho",
            value: funnel.visits,
            color: "bg-blue-500",
            rate: funnel.rates.impression_to_visit,
        },
        {
            label: "Yêu cầu tư vấn AI",
            value: funnel.consultations,
            color: "bg-teal-500",
            rate: funnel.rates.visit_to_consultation,
        },
        {
            label: "Hợp đồng ký kết",
            value: funnel.contracts,
            color: "bg-green-500",
            rate: funnel.rates.consultation_to_contract,
        },
    ];

    return (
        <div className="space-y-3">
            {steps.map((step, i) => (
                <div key={i}>
                    <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{step.label}</span>
                        <span className="font-semibold text-foreground">
                            {step.value.toLocaleString("vi-VN")}
                            {step.rate !== null && (
                                <span className="ml-2 font-normal text-muted-foreground">
                                    ({step.rate}%)
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                        <div
                            className={`h-3 rounded-full transition-all ${step.color}`}
                            style={{ width: `${(step.value / max) * 100}%` }}
                        />
                    </div>
                </div>
            ))}
            {funnel.note && (
                <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                    ⚠ {funnel.note}
                </p>
            )}
        </div>
    );
}

function PricePositionCard({ pos }: { pos: AiPricePosition }) {
    if (pos.error) {
        return <p className="text-sm text-muted-foreground">{pos.error}</p>;
    }

    if (!pos.province || pos.province_count === 0) {
        return (
            <div className="space-y-2">
                <p className="text-2xl font-bold">
                    {pos.price_per_month.toLocaleString("vi-VN")} đ
                    <span className="ml-1 text-sm font-normal text-muted-foreground">/tháng</span>
                </p>
                <p className="text-sm text-muted-foreground">
                    {pos.note ?? "Không đủ dữ liệu khu vực để so sánh."}
                </p>
            </div>
        );
    }

    const range = pos.province_max! - pos.province_min!;
    const myOffset =
        range > 0 ? ((pos.price_per_month - pos.province_min!) / range) * 100 : 50;
    const avgOffset =
        range > 0 ? ((pos.province_avg! - pos.province_min!) / range) * 100 : 50;

    const badge =
        pos.percentile_rank! >= 70
            ? { text: "Cao hơn trung bình", cls: "bg-red-100 text-red-700" }
            : pos.percentile_rank! <= 30
            ? { text: "Thấp hơn trung bình", cls: "bg-green-100 text-green-700" }
            : { text: "Xấp xỉ trung bình", cls: "bg-yellow-100 text-yellow-700" };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl font-bold">
                    {pos.price_per_month.toLocaleString("vi-VN")} đ
                    <span className="ml-1 text-sm font-normal text-muted-foreground">/tháng</span>
                </span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${badge.cls}`}>
                    {badge.text}
                </span>
            </div>

            {/* Range bar */}
            <div className="relative mx-1 h-4 rounded-full bg-muted">
                {/* Avg line */}
                <div
                    className="absolute top-0 h-4 w-0.5 bg-gray-400"
                    style={{ left: `${Math.min(Math.max(avgOffset, 1), 99)}%` }}
                />
                {/* My price dot */}
                <div
                    className="absolute -top-1 h-6 w-6 -translate-x-1/2 rounded-full border-2 border-white bg-violet-600 shadow-md"
                    style={{ left: `${Math.min(Math.max(myOffset, 2), 98)}%` }}
                />
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
                <span>Min: {pos.province_min!.toLocaleString("vi-VN")} đ</span>
                <span>TB: {pos.province_avg!.toLocaleString("vi-VN")} đ</span>
                <span>Max: {pos.province_max!.toLocaleString("vi-VN")} đ</span>
            </div>

            <p className="text-xs text-muted-foreground">
                Tỉnh/TP <span className="font-medium text-foreground">{pos.province.name}</span>
                {" "}— {pos.province_count} kho — Percentile {pos.percentile_rank}
            </p>
        </div>
    );
}

function RecentQueriesTable({ rows }: { rows: AiRecentQuery[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                        <th className="pb-2 text-left font-medium">Thời gian</th>
                        <th className="pb-2 text-left font-medium">Nội dung query</th>
                        <th className="pb-2 text-center font-medium">Hạng</th>
                        <th className="pb-2 text-center font-medium">Điểm</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {rows.map((r) => (
                        <tr key={r.id} className="hover:bg-muted/30">
                            <td className="py-2 text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(r.created_at).toLocaleString("vi-VN")}
                            </td>
                            <td className="py-2 max-w-xs">
                                <span
                                    className="block truncate"
                                    title={r.query_text}
                                >
                                    {r.query_text}
                                </span>
                            </td>
                            <td className="py-2 text-center">
                                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700">
                                    {r.rank_position}
                                </span>
                            </td>
                            <td className="py-2 text-center text-xs">
                                {r.match_score !== null ? (
                                    <span className="font-medium">{r.match_score}</span>
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

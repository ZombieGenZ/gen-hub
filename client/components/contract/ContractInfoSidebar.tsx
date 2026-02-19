"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ContractStatusBadge } from "./ContractStatusBadge";
import { SignerBadges, type Signer } from "./SignerBadges";
import {
    Building2,
    CalendarDays,
    Warehouse,
    Banknote,
    ShieldCheck,
    Sparkles,
    StickyNote,
    Timer,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";

interface WarehouseInfo {
    id: string;
    name: string;
    rows?: { id: string; name: string }[];
}

interface AddonInfo {
    id: string;
    name: string;
    price?: number;
}

interface InsuranceInfo {
    id: string;
    name: string;
    price?: number;
}

export interface ContractInfoData {
    status: string;
    code: string;
    organization?: { id: string; name: string };
    started_at: string;
    expired_at: string;
    total_price: number;
    discount_rate?: number;
    final_price: number;
    warehouses?: WarehouseInfo[];
    addons?: AddonInfo[];
    insurances?: InsuranceInfo[];
    notes?: string;
    auto_renew?: boolean;
    signers?: Signer[];
}

interface ContractInfoSidebarProps {
    data: ContractInfoData;
    className?: string;
}

const formatCurrency = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (!num && num !== 0) return "0 ₫";
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(num);
};

const formatDate = (str: string) => {
    try {
        return format(new Date(str), "dd/MM/yyyy");
    } catch {
        return str;
    }
};

export function ContractInfoSidebar({ data, className }: ContractInfoSidebarProps) {
    const daysRemaining = data.expired_at
        ? differenceInDays(new Date(data.expired_at), new Date())
        : null;

    return (
        <div className={cn("space-y-4", className)}>
            {/* Status */}
            <Card>
                <CardContent className="pt-5 pb-4 space-y-4">
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Trạng thái</span>
                        <ContractStatusBadge status={data.status} showIcon size="md" />
                    </div>

                    {daysRemaining !== null && data.status === "ACTIVE" && (
                        <div className="flex items-center gap-2 text-sm">
                            <Timer className="w-4 h-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                                Còn{" "}
                                <span className={cn("font-semibold", daysRemaining <= 30 ? "text-orange-600" : "text-foreground")}>
                                    {daysRemaining} ngày
                                </span>
                            </span>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Organization */}
            {data.organization && (
                <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Building2 className="w-3.5 h-3.5" />
                            Tổ chức
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <p className="text-sm font-medium">{data.organization.name}</p>
                    </CardContent>
                </Card>
            )}

            {/* Time */}
            <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <CalendarDays className="w-3.5 h-3.5" />
                        Thời hạn
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Bắt đầu</span>
                        <span className="font-medium">{formatDate(data.started_at)}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Kết thúc</span>
                        <span className="font-medium">{formatDate(data.expired_at)}</span>
                    </div>
                    {data.auto_renew && (
                        <p className="text-xs text-blue-600 mt-1">↻ Tự động gia hạn</p>
                    )}
                </CardContent>
            </Card>

            {/* Warehouses */}
            {data.warehouses && data.warehouses.length > 0 && (
                <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Warehouse className="w-3.5 h-3.5" />
                            Kho thuê ({data.warehouses.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-2">
                        {data.warehouses.map((wh) => (
                            <div key={wh.id} className="text-sm">
                                <p className="font-medium">{wh.name}</p>
                                {wh.rows && wh.rows.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Dãy: {wh.rows.map((r) => r.name).join(", ")}
                                    </p>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Financial */}
            <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Banknote className="w-3.5 h-3.5" />
                        Tài chính
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Tổng tiền</span>
                        <span>{formatCurrency(data.total_price)}</span>
                    </div>
                    {data.discount_rate && data.discount_rate > 0 && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Giảm giá</span>
                            <span className="text-emerald-600">-{data.discount_rate}%</span>
                        </div>
                    )}
                    <Separator className="my-1.5" />
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">Thanh toán</span>
                        <span className="font-bold text-brand">{formatCurrency(data.final_price)}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Addons */}
            {data.addons && data.addons.length > 0 && (
                <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5" />
                            Tiện ích ({data.addons.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-1">
                        {data.addons.map((addon) => (
                            <div key={addon.id} className="flex items-center justify-between text-sm">
                                <span>{addon.name}</span>
                                {addon.price && (
                                    <span className="text-xs text-muted-foreground">{formatCurrency(addon.price)}</span>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Insurance */}
            {data.insurances && data.insurances.length > 0 && (
                <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Bảo hiểm ({data.insurances.length})
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 space-y-1">
                        {data.insurances.map((ins) => (
                            <div key={ins.id} className="flex items-center justify-between text-sm">
                                <span>{ins.name}</span>
                                {ins.price && (
                                    <span className="text-xs text-muted-foreground">{formatCurrency(ins.price)}</span>
                                )}
                            </div>
                        ))}
                    </CardContent>
                </Card>
            )}

            {/* Notes */}
            {data.notes && (
                <Card>
                    <CardHeader className="pb-2 pt-4 px-4">
                        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <StickyNote className="w-3.5 h-3.5" />
                            Ghi chú
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4">
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{data.notes}</p>
                    </CardContent>
                </Card>
            )}

            {/* Signers (Aboard-style) */}
            {data.signers && data.signers.length > 0 && (
                <Card>
                    <CardContent className="pt-4 pb-4">
                        <SignerBadges signers={data.signers} />
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

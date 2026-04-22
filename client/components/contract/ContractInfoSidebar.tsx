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
    PlusCircle,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface WarehouseInfo {
    id: string;
    name: string;
    rows?: { id: string; name: string }[];
}

interface AddonInfo {
    id: string;
    name: string;
    price?: number;
    is_gift?: boolean;
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
    vat_rate?: number;
    vat_amount?: number;
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
    onManageAddons?: () => void;
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

export function ContractInfoSidebar({ data, className, onManageAddons }: ContractInfoSidebarProps) {
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
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <p className="text-sm font-medium truncate cursor-help">{data.organization.name}</p>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">{data.organization.name}</TooltipContent>
                        </Tooltip>
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
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <p className="font-medium truncate cursor-help">{wh.name}</p>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">{wh.name}</TooltipContent>
                                </Tooltip>
                                {wh.rows && wh.rows.length > 0 && (
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
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
                    {/* Giá kho (base price) */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Giá thuê kho</span>
                        <span>{formatCurrency(data.total_price)}</span>
                    </div>

                    {/* Addon chi tiết */}
                    {data.addons && data.addons.filter(a => !a.is_gift && (a.price ?? 0) > 0).map((addon) => (
                        <div key={addon.id} className="flex items-center justify-between text-sm">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-muted-foreground truncate max-w-[60%] cursor-help">{addon.name}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">{addon.name}</TooltipContent>
                            </Tooltip>
                            <span className="text-muted-foreground">{formatCurrency(addon.price ?? 0)}</span>
                        </div>
                    ))}

                    {/* Bảo hiểm chi tiết */}
                    {data.insurances && data.insurances.filter(ins => (ins.price ?? 0) > 0).map((ins) => (
                        <div key={ins.id} className="flex items-center justify-between text-sm">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-muted-foreground truncate max-w-[60%] cursor-help">{ins.name}</span>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">{ins.name}</TooltipContent>
                            </Tooltip>
                            <span className="text-muted-foreground">{formatCurrency(ins.price ?? 0)}</span>
                        </div>
                    ))}

                    {/* VAT */}
                    {data.vat_amount != null && data.vat_amount > 0 && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                                VAT{data.vat_rate ? ` (${data.vat_rate}%)` : ""}
                            </span>
                            <span className="text-muted-foreground">{formatCurrency(data.vat_amount)}</span>
                        </div>
                    )}

                    {/* Giảm giá */}
                    {data.discount_rate && data.discount_rate > 0 && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Giảm giá</span>
                            <span className="text-emerald-600">-{data.discount_rate}%</span>
                        </div>
                    )}

                    <Separator className="my-1.5" />

                    {/* Tổng thanh toán */}
                    <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold">Thanh toán</span>
                        <span className="font-bold text-brand">{formatCurrency(data.final_price)}</span>
                    </div>
                </CardContent>
            </Card>

            {/* Addons */}
            <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        Tiện ích ({data.addons?.length ?? 0})
                        {onManageAddons && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="ml-auto h-6 w-6"
                                onClick={onManageAddons}
                                title="Quản lý tiện ích"
                            >
                                <PlusCircle className="w-3.5 h-3.5" />
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-1">
                    {data.addons && data.addons.length > 0 ? (
                        data.addons.map((addon) => (
                            <div key={addon.id} className="flex items-center justify-between text-sm">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="truncate max-w-[180px] cursor-help">{addon.name}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">{addon.name}</TooltipContent>
                                </Tooltip>
                                {addon.price && (
                                    <span className="text-xs text-muted-foreground">{formatCurrency(addon.price)}</span>
                                )}
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-muted-foreground">Chưa có tiện ích</p>
                    )}
                </CardContent>
            </Card>

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
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <span className="truncate max-w-[180px] cursor-help">{ins.name}</span>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">{ins.name}</TooltipContent>
                                </Tooltip>
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

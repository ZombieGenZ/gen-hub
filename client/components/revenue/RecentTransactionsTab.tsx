"use client";

import { formatCurrencyFull } from "@/lib/format-currency";
import type { TransactionItem } from "@/services/revenue-analytics/revenue-analytics.types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { EmptyRevenueState } from "./EmptyRevenueState";
import { cn } from "@/lib/utils";

interface RecentTransactionsTabProps {
    items: TransactionItem[];
    offset: number;
}

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
    PAID: { label: "Đã thanh toán", className: "bg-emerald-100 text-emerald-700" },
    PENDING: { label: "Chờ xử lý", className: "bg-yellow-100 text-yellow-700" },
    CANCELLED: { label: "Đã hủy", className: "bg-red-100 text-red-700" },
    EXPIRED: { label: "Hết hạn", className: "bg-slate-100 text-slate-600" },
};

const TYPE_LABELS: Record<string, string> = {
    NEW_CONTRACT: "Hợp đồng mới",
    RENEWAL: "Gia hạn",
    ACCOUNT_DEPOSIT: "Nạp tiền",
};

function formatDate(dateStr: string | null): string {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function RecentTransactionsTab({ items, offset }: RecentTransactionsTabProps) {
    if (!items.length) return <EmptyRevenueState />;

    return (
        <Table>
            <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Mã thanh toán</TableHead>
                    <TableHead>Tổ chức</TableHead>
                    <TableHead>Mã HĐ</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead className="text-right">Số tiền</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Ngày tạo</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item, index) => {
                    const statusInfo = STATUS_STYLES[item.status] || {
                        label: item.status,
                        className: "bg-slate-100 text-slate-600",
                    };
                    return (
                        <TableRow key={item.id}>
                            <TableCell className="text-muted-foreground">
                                {offset + index + 1}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                                {item.payment_code}
                            </TableCell>
                            <TableCell className="text-sm">
                                {item.organization?.name || "—"}
                            </TableCell>
                            <TableCell className="font-mono text-sm text-muted-foreground">
                                {item.rental_contract?.code || "—"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {TYPE_LABELS[item.type] || item.type}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                                {formatCurrencyFull(item.amount)}
                            </TableCell>
                            <TableCell>
                                <span
                                    className={cn(
                                        "inline-flex px-2 py-0.5 rounded-full text-xs font-medium",
                                        statusInfo.className,
                                    )}
                                >
                                    {statusInfo.label}
                                </span>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                                {formatDate(item.created_at)}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}

"use client";

import { formatCurrencyFull } from "@/lib/format-currency";
import type { TopOrganizationItem } from "@/services/revenue-analytics/revenue-analytics.types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { EmptyRevenueState } from "./EmptyRevenueState";

interface TopOrganizationsTabProps {
    items: TopOrganizationItem[];
    offset: number;
}

export function TopOrganizationsTab({ items, offset }: TopOrganizationsTabProps) {
    if (!items.length) return <EmptyRevenueState />;

    return (
        <Table>
            <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Tên công ty</TableHead>
                    <TableHead>Mã số thuế</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
                    <TableHead className="text-right">Nợ đọng</TableHead>
                    <TableHead className="text-right">Số HĐ</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item, index) => (
                    <TableRow key={item.id}>
                        <TableCell className="text-muted-foreground">
                            {offset + index + 1}
                        </TableCell>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-muted-foreground">
                            {item.tax_code || "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600">
                            {formatCurrencyFull(item.total_revenue)}
                        </TableCell>
                        <TableCell className="text-right">
                            {item.outstanding_debt > 0 ? (
                                <span className="inline-flex items-center gap-1 text-red-600 font-semibold">
                                    {formatCurrencyFull(item.outstanding_debt)}
                                    <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                </span>
                            ) : (
                                <span className="text-muted-foreground">0 d</span>
                            )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                            {item.contract_count}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}

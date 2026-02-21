"use client";

import { formatCurrencyFull } from "@/lib/format-currency";
import type { TopWarehouseItem } from "@/services/revenue-analytics/revenue-analytics.types";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { EmptyRevenueState } from "./EmptyRevenueState";

interface TopWarehousesTabProps {
    items: TopWarehouseItem[];
    offset: number;
}

export function TopWarehousesTab({ items, offset }: TopWarehousesTabProps) {
    if (!items.length) return <EmptyRevenueState />;

    return (
        <Table>
            <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Tên kho</TableHead>
                    <TableHead>Địa chỉ</TableHead>
                    <TableHead className="text-right">Giá/tháng</TableHead>
                    <TableHead className="text-right">Doanh thu</TableHead>
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
                        <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                            {item.address_detail || "—"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                            {formatCurrencyFull(item.price_per_month)}
                        </TableCell>
                        <TableCell className="text-right font-semibold text-emerald-600">
                            {formatCurrencyFull(item.total_revenue)}
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

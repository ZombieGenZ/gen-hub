import React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    UserGroupIcon,
    PencilSquareIcon,
    TrashIcon,
    EyeIcon,
    PhoneIcon,
    EnvelopeIcon,
} from "@heroicons/react/24/outline";
import type { Partner } from "@/services/partner/partner.types";
import { TablePagination } from "@/components/ui/table-pagination";

export const ITEMS_PER_PAGE = 15;

interface PartnerTableProps {
    partners: Partner[];
    loading: boolean;
    selectedIds: string[];
    onToggleSelection: (id: string) => void;
    onToggleSelectAll: () => void;
    onToggleActive: (partner: Partner) => void;
    onEditClick: (partner: Partner) => void;
    onDeleteClick: (partner: Partner) => void;
    currentPage: number;
    totalPages: number;
    totalItems: number;
    onPageChange: (page: number) => void;
}

export function PartnerTable({
    partners,
    loading,
    selectedIds,
    onToggleSelection,
    onToggleSelectAll,
    onToggleActive,
    onEditClick,
    onDeleteClick,
    currentPage,
    totalPages,
    totalItems,
    onPageChange,
}: PartnerTableProps) {
    const router = useRouter();

    return (
        <Card className="shadow-premium rounded-3xl border-0">
            <CardContent className="p-0">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50/80">
                                <TableHead className="w-12">
                                    <input
                                        type="checkbox"
                                        className="rounded border-gray-300"
                                        checked={selectedIds.length === partners.length && partners.length > 0}
                                        onChange={onToggleSelectAll}
                                        aria-label="Chọn tất cả"
                                    />
                                </TableHead>
                                <TableHead className="font-semibold text-slate-700">Mã ĐT</TableHead>
                                <TableHead className="font-semibold text-slate-700">Tên đối tác</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-center">Loại</TableHead>
                                <TableHead className="font-semibold text-slate-700">Liên hệ</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-center">Trạng thái</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-center">Ngày tạo</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        {Array.from({ length: 8 }).map((_, j) => (
                                            <TableCell key={j}>
                                                <div className="h-4 bg-slate-100 rounded animate-pulse" />
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))
                            ) : partners.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8}>
                                        <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                            <UserGroupIcon className="w-12 h-12 mb-3 opacity-30" />
                                            <p className="text-base font-medium">Chưa có đối tác nào</p>
                                            <p className="text-sm mt-1">
                                                Nhấn &quot;Thêm đối tác&quot; để bắt đầu khai báo
                                            </p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                partners.map((partner) => (
                                    <TableRow
                                        key={partner.id}
                                        className="group hover:bg-slate-50/50 transition-colors cursor-pointer"
                                        onClick={() => router.push(`/dashboard/organization/partners/${partner.id}`)}
                                    >
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300"
                                                checked={selectedIds.includes(partner.id)}
                                                onChange={() => onToggleSelection(partner.id)}
                                                aria-label={`Chọn ${partner.name}`}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-sm font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                                                {partner.code}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-medium text-slate-900">{partner.name}</span>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {partner.type === "CUSTOMER" ? (
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 rounded-full text-xs">
                                                    Khách hàng
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-blue-50 text-blue-700 border-blue-200 rounded-full text-xs">
                                                    Nhà cung cấp
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-0.5">
                                                {partner.phone && (
                                                    <span className="text-sm text-slate-600 flex items-center gap-1">
                                                        <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                                                        {partner.phone}
                                                    </span>
                                                )}
                                                {partner.email && (
                                                    <span className="text-sm text-slate-500 flex items-center gap-1">
                                                        <EnvelopeIcon className="w-3.5 h-3.5 text-slate-400" />
                                                        {partner.email}
                                                    </span>
                                                )}
                                                {!partner.phone && !partner.email && (
                                                    <span className="text-sm text-slate-400">—</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                            <Switch
                                                checked={partner.is_active}
                                                onCheckedChange={() => onToggleActive(partner)}
                                            />
                                        </TableCell>
                                        <TableCell className="text-center text-sm text-slate-500">
                                            {new Date(partner.created_at).toLocaleDateString("vi-VN")}
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg text-slate-500 hover:text-[#0F766E]"
                                                    onClick={() => router.push(`/dashboard/organization/partners/${partner.id}`)}
                                                    title="Xem chi tiết"
                                                    aria-label={`Xem chi tiết ${partner.name}`}
                                                >
                                                    <EyeIcon className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg text-slate-500 hover:text-[#0F766E]"
                                                    onClick={() => onEditClick(partner)}
                                                    title="Chỉnh sửa"
                                                    aria-label={`Chỉnh sửa ${partner.name}`}
                                                >
                                                    <PencilSquareIcon className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 rounded-lg text-slate-500 hover:text-red-600"
                                                    onClick={() => onDeleteClick(partner)}
                                                    title="Xóa"
                                                    aria-label={`Xóa ${partner.name}`}
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {!loading && totalPages > 1 && (
                    <div className="px-6 py-4 border-t border-slate-100">
                        <TablePagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={onPageChange}
                        />
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

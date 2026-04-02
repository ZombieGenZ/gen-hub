import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
    ArrowPathIcon,
    DocumentTextIcon,
    EllipsisHorizontalIcon,
    EyeIcon,
    NoSymbolIcon,
} from "@heroicons/react/24/outline";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ContractStatusBadge } from "@/components/contract/ContractStatusBadge";
import type { ContractStatus } from "@/types/rental-contracts/rental-contracts.type";
import { TablePagination } from "@/components/ui/table-pagination";

interface Contract {
    id: string;
    code: string;
    name: string;
    status: ContractStatus;
    started_at: string;
    expired_at: string;
    total_price: number;
    final_price: number;
    organization?: {
        id: string;
        name: string;
        logo_url?: string;
    };
}

interface ContractTableProps {
    isLoading: boolean;
    contracts: Contract[];
    page: number;
    limit: number;
    total: number;
    allSelected: boolean;
    toggleAll: () => void;
    selectedIds: Set<string>;
    toggleOne: (id: string) => void;
    openContractDetail: (id: string) => void;
    formatDate: (date: string) => string;
    formatCurrency: (amount: number | string) => string;
    setPage: React.Dispatch<React.SetStateAction<number>>;
    totalPages: number;
}

export function ContractTable({
    isLoading,
    contracts,
    page,
    limit,
    total,
    allSelected,
    toggleAll,
    selectedIds,
    toggleOne,
    openContractDetail,
    formatDate,
    formatCurrency,
    setPage,
    totalPages,
}: ContractTableProps) {
    return (
        <div className="space-y-6">
            <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="w-11">
                                <Checkbox checked={allSelected} onCheckedChange={toggleAll} aria-label="Chọn tất cả" />
                            </TableHead>
                            <TableHead className="w-12.5">#</TableHead>
                            <TableHead>Mã HĐ</TableHead>
                            <TableHead>Tổ chức</TableHead>
                            <TableHead>Thời hạn</TableHead>
                            <TableHead>Giá trị</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead className="text-right">Thao tác</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-24 text-center">
                                    <div className="flex justify-center items-center gap-2">
                                        <ArrowPathIcon className="h-6 w-6 animate-spin text-primary" />
                                        <span className="text-muted-foreground">Đang tải dữ liệu...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : contracts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-32 text-center">
                                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                                        <DocumentTextIcon className="h-8 w-8 mb-2 opacity-50" />
                                        <p>Không tìm thấy hợp đồng nào</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            contracts.map((contract, index) => {
                                const isSelected = selectedIds.has(contract.id);
                                return (
                                    <TableRow
                                        key={contract.id}
                                        className={cn(
                                            "group hover:bg-muted/50 transition-colors cursor-pointer",
                                            isSelected && "bg-brand-subtle/30"
                                        )}
                                        onClick={() => openContractDetail(contract.id)}
                                    >
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleOne(contract.id)}
                                                aria-label={`Chọn ${contract.code}`}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium text-muted-foreground">
                                            {(page - 1) * limit + index + 1}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-foreground">{contract.code}</span>
                                                <span className="max-w-40 truncate text-xs text-muted-foreground">{contract.name}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-[10px] shrink-0">
                                                    {contract.organization?.name?.charAt(0) || "O"}
                                                </div>
                                                <span className="max-w-35 truncate text-sm">
                                                    {contract.organization?.name || "—"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-xs">
                                                <span>{formatDate(contract.started_at)}</span>
                                                <span className="text-muted-foreground">→ {formatDate(contract.expired_at)}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-brand text-sm">{formatCurrency(contract.final_price)}</span>
                                                {Number(contract.final_price) !== Number(contract.total_price) && (
                                                    <span className="text-xs text-muted-foreground line-through">
                                                        {formatCurrency(contract.total_price)}
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <ContractStatusBadge status={contract.status} showDot size="sm" />
                                        </TableCell>
                                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <EllipsisHorizontalIcon className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => openContractDetail(contract.id)}>
                                                        <span className="inline-flex items-center gap-2">
                                                            <EyeIcon className="w-4 h-4 shrink-0" />
                                                            Xem chi tiết
                                                        </span>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600">
                                                        <span className="inline-flex items-center gap-2">
                                                            <NoSymbolIcon className="w-4 h-4 shrink-0" />
                                                            Hủy hợp đồng
                                                        </span>
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4">
                <TablePagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={total}
                    itemsPerPage={limit}
                    onPageChange={setPage}
                />
            </div>
        </div>
    );
}

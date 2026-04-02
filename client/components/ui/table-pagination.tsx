"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";

interface TablePaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems?: number;
    itemsPerPage?: number;
    onPageChange: (page: number) => void;
    className?: string;
}

export function TablePagination({
    currentPage,
    totalPages,
    totalItems,
    itemsPerPage,
    onPageChange,
    className,
}: TablePaginationProps) {
    if (totalPages <= 1) {
        return null;
    }

    const canShowSummary =
        typeof totalItems === "number" &&
        typeof itemsPerPage === "number" &&
        totalItems > 0 &&
        itemsPerPage > 0;

    const startItem = canShowSummary ? (currentPage - 1) * itemsPerPage + 1 : 0;
    const endItem = canShowSummary ? Math.min(currentPage * itemsPerPage, totalItems) : 0;

    return (
        <div className={className ?? "flex items-center justify-between"}>
            <div className="text-sm text-muted-foreground">
                {canShowSummary
                    ? `Hiển thị ${startItem} đến ${endItem} trong tổng số ${totalItems} kết quả`
                    : `Trang ${currentPage} / ${totalPages}`}
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0 rounded-lg"
                >
                    <ChevronLeftIcon className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                        .filter(
                            (page) =>
                                Math.abs(page - currentPage) <= 2 ||
                                page === 1 ||
                                page === totalPages,
                        )
                        .map((page, index, array) => (
                            <React.Fragment key={page}>
                                {index > 0 && array[index - 1] !== page - 1 && (
                                    <span className="text-gray-400">...</span>
                                )}
                                <Button
                                    variant={currentPage === page ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => onPageChange(page)}
                                    className={`h-8 min-w-8 rounded-lg ${
                                        currentPage === page
                                            ? "bg-[#0F766E] hover:bg-[#0F766E]/90 text-white"
                                            : "text-gray-600"
                                    }`}
                                >
                                    {page}
                                </Button>
                            </React.Fragment>
                        ))}
                </div>

                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0 rounded-lg"
                >
                    <ChevronRightIcon className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

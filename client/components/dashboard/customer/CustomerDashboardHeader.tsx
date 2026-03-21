"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface CustomerDashboardHeaderProps {
    dateFilter: string;
    setDateFilter: (filter: string) => void;
}

export function CustomerDashboardHeader({ dateFilter, setDateFilter }: CustomerDashboardHeaderProps) {
    return (
        <div className="flex justify-between items-center mb-4">
            {/* Date Filter */}
            <div className="flex items-center bg-muted/50 p-1 rounded-lg border border-border/40">
                {["today", "week", "month"].map((key) => (
                    <button
                        key={key}
                        onClick={() => setDateFilter(key)}
                        className={cn(
                            "px-3.5 py-1.5 text-xs font-medium rounded-md transition-all",
                            dateFilter === key
                                ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                                : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                    >
                        {key === "today" ? "Hôm nay" : key === "week" ? "Tuần này" : "Tháng này"}
                    </button>
                ))}
            </div>

            <div className="flex gap-2">
                <Button variant="outline" className="gap-2 h-8 text-xs px-3.5">
                    <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                    Xuất dữ liệu
                </Button>
            </div>
        </div>
    );
}

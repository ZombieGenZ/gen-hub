import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    MagnifyingGlassIcon,
    ShieldCheckIcon,
    CheckCircleIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";

interface InsuranceFilterBarProps {
    statusFilter: "all" | "active" | "inactive";
    setStatusFilter: (val: "all" | "active" | "inactive") => void;
    setCurrentPage: (val: number) => void;
    stats: { total: number; active: number; inactive: number };
    searchTerm: string;
    setSearchTerm: (val: string) => void;
}

export function InsuranceFilterBar({
    statusFilter,
    setStatusFilter,
    setCurrentPage,
    stats,
    searchTerm,
    setSearchTerm,
}: InsuranceFilterBarProps) {
    return (
        <div className="space-y-6">
            <Tabs
                value={statusFilter}
                onValueChange={(value) => {
                    setStatusFilter(value as "all" | "active" | "inactive");
                    setCurrentPage(1);
                }}
                className="w-full"
            >
                <TabsList className="rounded-xl bg-muted/50 p-1.5 h-auto">
                    <TabsTrigger value="all" className="rounded-lg gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <ShieldCheckIcon className="w-4 h-4" />
                        Tất cả
                        <Badge variant="secondary" className="ml-1 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{stats.total}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="active" className="rounded-lg gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <CheckCircleIcon className="w-4 h-4" />
                        Hoạt động
                        <Badge variant="secondary" className="ml-1 px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{stats.active}</Badge>
                    </TabsTrigger>
                    <TabsTrigger value="inactive" className="rounded-lg gap-2 px-4 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm">
                        <XCircleIcon className="w-4 h-4" />
                        Đã tắt
                        <Badge variant="secondary" className="ml-1 px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{stats.inactive}</Badge>
                    </TabsTrigger>
                </TabsList>
            </Tabs>

            <Card className="border-0 shadow-premium rounded-3xl">
                <CardContent className="p-6">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm kiếm theo tên hoặc mô tả..."
                            className="rounded-xl pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

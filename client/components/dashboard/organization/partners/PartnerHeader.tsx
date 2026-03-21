import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { UserGroupIcon, PlusIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";

interface PartnerHeaderProps {
    searchTerm: string;
    onSearchChange: (value: string) => void;
    activeTab: "ALL" | "CUSTOMER" | "SUPPLIER";
    onTabChange: (value: "ALL" | "CUSTOMER" | "SUPPLIER") => void;
    filterActive: "all" | "active" | "inactive";
    onFilterActiveChange: (value: "all" | "active" | "inactive") => void;
    onCreateClick: () => void;
}

export function PartnerHeader({
    searchTerm,
    onSearchChange,
    activeTab,
    onTabChange,
    filterActive,
    onFilterActiveChange,
    onCreateClick,
}: PartnerHeaderProps) {
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <UserGroupIcon className="w-6 h-6 text-[#0F766E]" />
                        Quản lý Đối tác
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Quản lý khách hàng và nhà cung cấp trong hệ thống kho
                    </p>
                </div>
                <Button
                    className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl"
                    onClick={onCreateClick}
                >
                    <PlusIcon className="w-4 h-4 mr-2" />
                    Thêm đối tác
                </Button>
            </div>

            <Card className="shadow-premium rounded-3xl border-0">
                <CardContent className="p-4 md:p-6 space-y-4">
                    <Tabs
                        value={activeTab}
                        onValueChange={(v) => onTabChange(v as "ALL" | "CUSTOMER" | "SUPPLIER")}
                    >
                        <TabsList className="bg-slate-100 p-1 rounded-xl">
                            <TabsTrigger value="ALL" className="rounded-lg px-4 py-2 text-sm font-medium">
                                Tất cả
                            </TabsTrigger>
                            <TabsTrigger value="CUSTOMER" className="rounded-lg px-4 py-2 text-sm font-medium">
                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-2" />
                                Khách hàng
                            </TabsTrigger>
                            <TabsTrigger value="SUPPLIER" className="rounded-lg px-4 py-2 text-sm font-medium">
                                <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-2" />
                                Nhà cung cấp
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>

                    <div className="flex flex-col md:flex-row gap-3">
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Tìm kiếm theo tên, mã, email, số điện thoại..."
                                value={searchTerm}
                                onChange={(e) => onSearchChange(e.target.value)}
                                className="pl-10 h-10 rounded-xl"
                            />
                        </div>
                        <Select
                            value={filterActive}
                            onValueChange={(v) => onFilterActiveChange(v as "all" | "active" | "inactive")}
                        >
                            <SelectTrigger className="w-full md:w-52 h-10 rounded-xl">
                                <SelectValue placeholder="Trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                <SelectItem value="active">Đang giao dịch</SelectItem>
                                <SelectItem value="inactive">Ngừng giao dịch</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

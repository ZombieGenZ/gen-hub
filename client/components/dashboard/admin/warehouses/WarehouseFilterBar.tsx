import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    MagnifyingGlassIcon,
    CheckCircleIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";
import { Province } from "@/types/location/provinces.type";

interface WarehouseFilterBarProps {
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    setCurrentPage: (val: number) => void;
    provinceFilter: string;
    setProvinceFilter: (val: string) => void;
    provinces: Province[];
    statusFilter: "all" | "active" | "inactive" | "full";
    setStatusFilter: (val: "all" | "active" | "inactive" | "full") => void;
}

export function WarehouseFilterBar({
    searchTerm,
    setSearchTerm,
    setCurrentPage,
    provinceFilter,
    setProvinceFilter,
    provinces,
    statusFilter,
    setStatusFilter,
}: WarehouseFilterBarProps) {
    return (
        <Card className="border-0 shadow-premium rounded-3xl">
            <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div className="relative flex-1 min-w-[250px]">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm kiếm kho..."
                            className="pl-9 rounded-xl"
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setCurrentPage(1);
                            }}
                        />
                    </div>

                    <Select
                        value={provinceFilter}
                        onValueChange={(v) => {
                            setProvinceFilter(v);
                            setCurrentPage(1);
                        }}
                    >
                        <SelectTrigger className="w-[200px] rounded-xl">
                            <SelectValue placeholder="Khu vực: Tất cả" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả khu vực</SelectItem>
                            {provinces.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                    {p.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <div className="flex items-center gap-2">
                        <Button
                            variant={statusFilter === "all" ? "secondary" : "ghost"}
                            onClick={() => {
                                setStatusFilter("all");
                                setCurrentPage(1);
                            }}
                            size="sm"
                            className="rounded-full"
                        >
                            Tất cả
                        </Button>
                        <Button
                            variant={statusFilter === "active" ? "secondary" : "ghost"}
                            onClick={() => {
                                setStatusFilter("active");
                                setCurrentPage(1);
                            }}
                            size="sm"
                            className="rounded-full gap-1"
                        >
                            <CheckCircleIcon className="w-4 h-4 text-green-600" /> Hoạt động
                        </Button>
                        <Button
                            variant={statusFilter === "inactive" ? "secondary" : "ghost"}
                            onClick={() => {
                                setStatusFilter("inactive");
                                setCurrentPage(1);
                            }}
                            size="sm"
                            className="rounded-full gap-1"
                        >
                            <XCircleIcon className="w-4 h-4 text-gray-400" /> Đang bảo trì
                        </Button>
                        <Button
                            variant={statusFilter === "full" ? "secondary" : "ghost"}
                            onClick={() => {
                                setStatusFilter("full");
                                setCurrentPage(1);
                            }}
                            size="sm"
                            className="rounded-full gap-1"
                        >
                            Đầy kho
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

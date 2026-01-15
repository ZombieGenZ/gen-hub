"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { warehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    Filter,
    MapPin,
    Snowflake,
    Box,
    Thermometer,
    Loader2
} from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import Image from "next/image";

interface Warehouse {
    id: string;
    name: string;
    address_detail: string;
    price_per_month: number;
    length: number;
    width: number;
    is_cold_storage: boolean;
    images: { url: string }[];
    ward?: {
        name: string;
        province?: {
            name: string;
        }
    };
    total_weight_capacity: number;
}

export default function WarehouseListPage() {
    const router = useRouter();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");

    const fetchWarehouses = async () => {
        try {
            setLoading(true);
            const token = authStorage.getAccessToken();
            // Note: Public viewing might not need token, but dashboard usually does.
            // If token is missing, maybe redirect or use public API if allowed.
            // For customer dashboard, we assume logged in.

            if (!token) {
                // router.push("/login"); // Optional: enforce login
                // return;
            }

            const data = await warehouseTemplateService.getWarehouseTemplates(token || "", {
                keywords: searchTerm,
                // Add other filters as needed
            });

            if (Array.isArray(data)) {
                setWarehouses(data);
            } else if (data && data.items) {
                setWarehouses(data.items);
            } else {
                setWarehouses([]);
            }
        } catch (error) {
            console.error("Failed to fetch warehouses", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchWarehouses();
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Tìm kiếm & Đặt kho</h1>
                    <p className="text-muted-foreground">Khám phá các kho bãi phù hợp với nhu cầu của bạn.</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-card p-4 rounded-xl border border-border shadow-sm">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm theo tên kho, địa chỉ..."
                            className="pl-9"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Loại kho" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Tất cả loại kho</SelectItem>
                            <SelectItem value="standard">Kho thường</SelectItem>
                            <SelectItem value="cold">Kho lạnh/mát</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="outline" className="gap-2">
                        <Filter className="w-4 h-4" />
                        Bộ lọc nâng cao
                    </Button>
                </div>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="flex justify-center items-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-brand" />
                </div>
            ) : warehouses.length === 0 ? (
                <div className="text-center py-12 bg-card rounded-xl border border-dashed text-muted-foreground">
                    Không tìm thấy kho nào phù hợp.
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {warehouses.map((warehouse) => (
                        <div
                            key={warehouse.id}
                            className="group bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col"
                            onClick={() => router.push(`/dashboard/customer/warehouses/${warehouse.id}`)}
                        >
                            <div className="relative h-48 bg-muted">
                                <Image
                                    src={warehouse.images?.[0]?.url || "/placeholder-warehouse.jpg"}
                                    alt={warehouse.name}
                                    fill
                                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute top-3 left-3">
                                    <Badge variant="secondary" className="bg-background/90 backdrop-blur text-foreground shadow-sm">
                                        {warehouse.is_cold_storage ? (
                                            <span className="flex items-center gap-1"><Snowflake className="w-3 h-3 text-blue-500" /> Kho lạnh</span>
                                        ) : (
                                            <span className="flex items-center gap-1"><Box className="w-3 h-3 text-orange-500" /> Kho thường</span>
                                        )}
                                    </Badge>
                                </div>
                            </div>
                            <div className="p-4 flex flex-col flex-1">
                                <div className="mb-2">
                                    <h3 className="font-bold text-lg line-clamp-1 group-hover:text-brand transition-colors">{warehouse.name}</h3>
                                    <div className="flex items-start gap-1 text-sm text-muted-foreground mt-1">
                                        <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                        <span className="line-clamp-2">{warehouse.address_detail}, {warehouse.ward?.name}, {warehouse.ward?.province?.name}</span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2 my-3 text-sm">
                                    <div className="bg-muted/50 p-2 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground">Diện tích</p>
                                        <p className="font-semibold">{warehouse.length * warehouse.width} m²</p>
                                    </div>
                                    <div className="bg-muted/50 p-2 rounded-lg text-center">
                                        <p className="text-xs text-muted-foreground">Sức chứa</p>
                                        <p className="font-semibold">{warehouse.total_weight_capacity} tấn</p>
                                    </div>
                                </div>

                                <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Giá thuê từ</p>
                                        <p className="text-lg font-bold text-brand">{formatCurrency(warehouse.price_per_month)}<span className="text-sm font-normal text-muted-foreground">/tháng</span></p>
                                    </div>
                                    <Button size="sm" className="bg-brand hover:bg-brand-hover">Xem chi tiết</Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

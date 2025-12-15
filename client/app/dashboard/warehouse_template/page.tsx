"use client";

import React, { useEffect, useState } from "react";
import { WarehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { Warehouse } from "@/types/warehoue_template/warehouse_template.type";
import { useDebounce } from "@/hooks/use-debounce";
import { DashboardHeader } from "@/components/layouts/DashboardHeader";



import { useRouter } from "next/navigation";

// ... (other imports)

export default function WarehouseTemplatePage() {
    const router = useRouter();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // ... (state for filters and pagination)

    const [filters, setFilters] = useState<{
        keywords: string;
        province_id: string;
        status_label: string;
        type_label: string;
    }>({
        keywords: "",
        province_id: "",
        status_label: "Tất cả",
        type_label: "Tất cả"
    });

    const [pagination, setPagination] = useState({
        page: 1,
        limit: 9,
        total: 0,
        totalPages: 0
    });

    const debouncedKeywords = useDebounce(filters.keywords, 500);

    const fetchWarehouses = async () => {
        try {
            const token = localStorage.getItem("access_token");
            if (!token) {
                router.push("/login");
                return;
            }

            setLoading(true);
            setError(null);

            // ... (rest of the logic)

            // Map UI filters to API params
            const apiParams: any = {
                keywords: debouncedKeywords,
                page: pagination.page,
                limit: pagination.limit,
            };

            // Map Province
            if (filters.province_id && filters.province_id !== "all") {
                apiParams.province_id = filters.province_id;
            }

            // Map Status
            if (filters.status_label === "Hoạt động") {
                apiParams.is_active = true;
            } else if (filters.status_label === "Đang bảo trì") {
                apiParams.is_active = false;
            } else if (filters.status_label === "Đầy kho") {
                apiParams.rental_status = 'RENTED';
            }

            // Note: 'Type' filter is not yet supported by backend API, skipping mapping.

            const warehouseService = new WarehouseTemplateService();
            const data: any = await warehouseService.getWarehouseTemplates(token, apiParams);

            if (data) {
                // Handle different response structures (array vs paginated object)
                let items: Warehouse[] = [];
                let total = 0;

                if (Array.isArray(data)) {
                    items = data;
                    total = data.length;
                } else if (data.items) {
                    items = data.items;
                    total = data.total || 0;
                }

                setWarehouses(items);
                setPagination(prev => ({
                    ...prev,
                    total,
                    totalPages: Math.ceil(total / prev.limit)
                }));
            }
        } catch (err) {
            console.error("Failed to fetch warehouses", err);
            // Fallback for demo purposes if API fails completely
            setError("Không thể tải dữ liệu kho. Vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWarehouses();
    }, [debouncedKeywords, filters.province_id, filters.status_label, pagination.page]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFilters(prev => ({ ...prev, keywords: e.target.value }));
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1 on search
    };

    const handleProvinceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, province_id: e.target.value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, type_label: e.target.value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setFilters(prev => ({ ...prev, status_label: e.target.value }));
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= pagination.totalPages) {
            setPagination(prev => ({ ...prev, page: newPage }));
        }
    };

    return (
        <>
            <DashboardHeader>
                <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all w-full md:w-96">
                    <i className="fas fa-search text-slate-400"></i>
                    <input
                        type="text"
                        placeholder="Tìm kiếm kho..."
                        className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-400 text-slate-700"
                        value={filters.keywords}
                        onChange={handleSearchChange}
                    />
                </div>
            </DashboardHeader>

            <div className="p-4 md:p-8">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                    <a href="#" className="hover:text-primary transition-colors">Trang chủ</a>
                    <i className="fas fa-chevron-right text-xs"></i>
                    <span className="text-slate-900 font-medium">Danh sách kho</span>
                </div>

                {/* Page Header */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 mb-1">Quản lý kho</h1>
                        <p className="text-slate-500">Quản lý và theo dõi {pagination.total} kho hàng trên toàn hệ thống</p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2">
                            <i className="fas fa-file-export text-slate-400"></i>
                            <span className="hidden sm:inline">Xuất Excel</span>
                            <span className="sm:hidden">Excel</span>
                        </button>
                        <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-teal-700 transition-all shadow-lg shadow-primary/30 flex items-center gap-2">
                            <i className="fas fa-plus"></i>
                            <span className="hidden sm:inline">Thêm kho mới</span>
                            <span className="sm:hidden">Thêm</span>
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2 text-slate-700 font-medium min-w-[80px]">
                        <i className="fas fa-filter text-primary"></i>
                        Bộ lọc:
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full sm:w-auto flex-1">
                        <div className="relative group w-full">
                            <select
                                className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                                value={filters.province_id}
                                onChange={handleProvinceChange}
                            >
                                <option value="">Khu vực: Tất cả</option>
                                <option value="hanoi">Hà Nội (Demo)</option>
                                <option value="danang">Đà Nẵng (Demo)</option>
                                <option value="hcm">TP. HCM (Demo)</option>
                            </select>
                            <i className="fas fa-chevron-down absolute right-3 top-3 text-slate-400 text-xs pointer-events-none group-hover:text-primary transition-colors"></i>
                        </div>

                        <div className="relative group w-full">
                            <select
                                className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                                value={filters.type_label}
                                onChange={handleTypeChange}
                            >
                                <option value="Tất cả">Loại kho: Tất cả</option>
                                <option value="Kho công nghệ">Kho công nghệ</option>
                                <option value="Kho thường">Kho thường</option>
                                <option value="Kho lạnh">Kho lạnh</option>
                            </select>
                            <i className="fas fa-chevron-down absolute right-3 top-3 text-slate-400 text-xs pointer-events-none group-hover:text-primary transition-colors"></i>
                        </div>

                        <div className="relative group w-full">
                            <select
                                className="appearance-none w-full bg-slate-50 border border-slate-200 text-slate-700 py-2 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                                value={filters.status_label}
                                onChange={handleStatusChange}
                            >
                                <option value="Tất cả">Trạng thái: Tất cả</option>
                                <option value="Hoạt động">Hoạt động</option>
                                <option value="Đang bảo trì">Đang bảo trì</option>
                                <option value="Đầy kho">Đầy kho</option>
                            </select>
                            <i className="fas fa-chevron-down absolute right-3 top-3 text-slate-400 text-xs pointer-events-none group-hover:text-primary transition-colors"></i>
                        </div>
                    </div>
                </div>

                {/* Warehouse Grid */}
                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    </div>
                ) : error ? (
                    <div className="text-center p-8 bg-red-50 text-red-600 rounded-xl">
                        {error}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                        {warehouses.map((warehouse) => (
                            <div key={warehouse.id} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group flex flex-col h-full">
                                <div className="relative h-64 overflow-hidden rounded-t-xl bg-slate-100">
                                    <img
                                        src={warehouse.images?.[0]?.url || "https://placehold.co/600x400?text=No+Image"}
                                        alt={warehouse.name}
                                        className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                                    />
                                    <div className="absolute top-3 right-3 flex gap-2">
                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold backdrop-blur-md shadow-sm ${warehouse.is_active
                                            ? "bg-green-500/90 text-white"
                                            : "bg-orange-500/90 text-white"
                                            }`}>
                                            {warehouse.is_active ? "Hoạt động" : "Bảo trì"}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-5 flex-1 flex flex-col">
                                    <div className="mb-3">
                                        <h3 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1" title={warehouse.name}>
                                            {warehouse.name}
                                        </h3>
                                        <span className="text-xs text-slate-500 font-mono bg-slate-100 px-2 py-0.5 rounded inline-block">
                                            #{warehouse.id.substring(0, 8).toUpperCase()}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2 mb-4 text-slate-600">
                                        <i className="fas fa-map-marker-alt text-teal-600"></i>
                                        <span className="text-sm font-medium truncate" title={`${warehouse.ward?.name}, ${warehouse.ward?.province?.name}`}>
                                            {warehouse.ward?.name}, {warehouse.ward?.province?.name}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                                                <i className="fas fa-ruler-combined text-slate-400"></i> Diện tích
                                            </div>
                                            <div className="font-bold text-slate-900 text-base">
                                                {new Intl.NumberFormat('vi-VN').format(warehouse.length * warehouse.width)} m²
                                            </div>
                                        </div>
                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <div className="text-xs text-slate-500 mb-1 flex items-center gap-1.5">
                                                <i className="fas fa-boxes text-slate-400"></i> Sức chứa (Est)
                                            </div>
                                            <div className="font-bold text-slate-900 text-base">
                                                {Math.floor((warehouse.length * warehouse.width) * 1.5)} pallets
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-4 px-1">
                                        <i className="fas fa-layer-group text-slate-400 w-5"></i>
                                        <span>Trang thiết bị: <span className="text-slate-700 font-medium">{warehouse.type || "N/A"}</span></span>
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-primary text-xs font-bold ring-2 ring-white shadow-sm">
                                                {warehouse.created_by ? warehouse.created_by.charAt(0).toUpperCase() : "A"}
                                            </div>
                                            <span className="text-xs text-slate-500 font-medium">Quản lý kho</span>
                                        </div>
                                        <button className="text-slate-400 hover:text-primary transition-colors p-1 rounded-md hover:bg-slate-50">
                                            <i className="fas fa-ellipsis-h"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Add New Card (always visible at end) */}
                        {warehouses.length < pagination.limit && (
                            <div className="border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center p-8 text-slate-400 hover:border-primary hover:text-primary hover:bg-teal-50/50 transition-all cursor-pointer h-full min-h-[400px] group">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-teal-100 transition-colors">
                                    <i className="fas fa-plus text-2xl group-hover:scale-110 transition-transform"></i>
                                </div>
                                <span className="font-semibold">Thêm kho mới</span>
                                <p className="text-sm mt-2 text-center max-w-[200px]">Tạo kho mới với cấu hình tùy chỉnh</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Pagination */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6">
                    <div className="text-sm text-slate-500">
                        Hiển thị <span className="font-medium text-slate-900">{warehouses.length > 0 ? (pagination.page - 1) * pagination.limit + 1 : 0}-{Math.min(pagination.page * pagination.limit, pagination.total)}</span> của <span className="font-medium text-slate-900">{pagination.total}</span> kho
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                        >
                            <i className="fas fa-chevron-left text-xs"></i>
                        </button>

                        {/* Simple pagination buttons logic */}
                        {[...Array(pagination.totalPages)].map((_, i) => {
                            const pageNum = i + 1;
                            // Show first, last, and current +- 1. Simplified for now.
                            if (pageNum === 1 || pageNum === pagination.totalPages || (pageNum >= pagination.page - 1 && pageNum <= pagination.page + 1)) {
                                return (
                                    <button
                                        key={pageNum}
                                        className={`w-10 h-10 flex items-center justify-center rounded-lg font-medium transition-all ${pagination.page === pageNum
                                            ? "bg-primary text-white shadow-lg shadow-primary/30"
                                            : "text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"
                                            }`}
                                        onClick={() => handlePageChange(pageNum)}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            } else if (pageNum === pagination.page - 2 || pageNum === pagination.page + 2) {
                                return <span key={pageNum} className="text-slate-400">...</span>
                            }
                            return null;
                        })}

                        <button
                            className="w-10 h-10 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                        >
                            <i className="fas fa-chevron-right text-xs"></i>
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}
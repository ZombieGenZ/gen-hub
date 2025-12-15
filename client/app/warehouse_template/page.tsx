"use client";

import React, { useEffect, useState } from "react";
import { WarehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { Warehouse } from "@/types/warehoue_template/warehouse_template.type";
import { useDebounce } from "@/hooks/use-debounce";

const MOCK_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI1MGZkOTg2NS0zYWY3LTQ4NDgtODNhNy0wYzUwNWExNzdkNDMiLCJpc19wcmltYXJ5X2F1dGgiOnRydWUsInByb2plY3QiOiJHRU4tSFVCIiwiaWF0IjoxNzY1ODAwMTAwLCJleHAiOjE3NjU4MDEwMDB9.naeTkPK13qF9sOal__cAZppEK1jzKql_Aun9DInxCDE"; // Valid token from auto-login (admin_auto@example.com)

export default function WarehouseTemplatePage() {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // State for filters and pagination
    const [filters, setFilters] = useState<{
        keywords: string;
        province_id: string;
        status_label: string; // "Tất cả", "Hoạt động", ...
        type_label: string; // "Tất cả", "Kho công nghệ", ...
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
            setLoading(true);
            setError(null);

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
            const data: any = await warehouseService.getWarehouseTemplates(MOCK_TOKEN, apiParams);

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
            // Fallback for demo purposes if API fails completely (optional, can be removed)
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
        <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
            <style jsx global>{`
                @import url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css');
            `}</style>

            {/* Sidebar */}
            <aside className="w-64 bg-slate-100 border-r border-slate-200 flex flex-col fixed h-full z-10 transition-all duration-300">
                <div className="p-6 flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-lg shadow-primary/20">
                        <i className="fas fa-box text-white text-sm"></i>
                    </div>
                    <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-teal-800">
                        GenHub
                    </span>
                </div>

                <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">Menu</div>
                    <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all group">
                        <i className="fas fa-chart-pie w-5 text-slate-400 group-hover:text-primary transition-colors"></i>
                        <span className="font-medium">Tổng quan</span>
                    </a>
                    <a href="#" className="flex items-center gap-3 px-3 py-2.5 bg-white text-primary rounded-lg shadow-sm transition-all group">
                        <i className="fas fa-warehouse w-5 text-primary"></i>
                        <span className="font-medium">Kho</span>
                    </a>
                    <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all group">
                        <i className="fas fa-file-contract w-5 text-slate-400 group-hover:text-primary transition-colors"></i>
                        <span className="font-medium">Hợp đồng</span>
                    </a>
                    <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all group">
                        <i className="fas fa-users w-5 text-slate-400 group-hover:text-primary transition-colors"></i>
                        <span className="font-medium">Khách hàng</span>
                    </a>

                    <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-6 mb-2 px-2">Khu vực</div>
                    <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all group">
                        <i className="fas fa-map-marker-alt w-5 text-slate-400 group-hover:text-primary transition-colors"></i>
                        <span className="font-medium">Bản đồ kho</span>
                    </a>
                    <a href="#" className="flex items-center gap-3 px-3 py-2.5 text-slate-600 hover:bg-white hover:shadow-sm rounded-lg transition-all group">
                        <i className="fas fa-globe-asia w-5 text-slate-400 group-hover:text-primary transition-colors"></i>
                        <span className="font-medium">Vùng địa lý</span>
                    </a>
                </nav>


            </aside>

            {/* Main Content */}
            <main className="ml-64 flex-1 flex flex-col min-h-screen transition-all duration-300">
                {/* Header */}
                <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
                    <div className="flex items-center justify-between px-8 py-4">
                        <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary transition-all w-96">
                            <i className="fas fa-search text-slate-400"></i>
                            <input
                                type="text"
                                placeholder="Tìm kiếm kho..."
                                className="bg-transparent border-none outline-none text-sm w-full placeholder-slate-400 text-slate-700"
                                value={filters.keywords}
                                onChange={handleSearchChange}
                            />
                        </div>

                        <div className="flex items-center gap-6">
                            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                <i className="fas fa-bell text-lg"></i>
                                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                            </button>
                            <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
                                <i className="fas fa-cog"></i>
                                <span className="text-sm font-medium">Cài đặt</span>
                            </button>

                            <div className="h-8 w-px bg-slate-200"></div>

                            <div className="flex items-center gap-3 cursor-pointer group">
                                <div className="text-right hidden md:block">
                                    <p className="text-sm font-medium text-slate-900 leading-none">Admin User</p>
                                    <p className="text-xs text-slate-500 mt-1">admin@example.com</p>
                                </div>
                                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-teal-400 flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-white group-hover:ring-primary/20 transition-all">
                                    AD
                                </div>
                                <i className="fas fa-chevron-down text-xs text-slate-400 group-hover:text-primary transition-colors"></i>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8">
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-6">
                        <a href="#" className="hover:text-primary transition-colors">Trang chủ</a>
                        <i className="fas fa-chevron-right text-xs"></i>
                        <span className="text-slate-900 font-medium">Danh sách kho</span>
                    </div>

                    {/* Page Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 mb-1">Quản lý kho</h1>
                            <p className="text-slate-500">Quản lý và theo dõi {pagination.total} kho hàng trên toàn hệ thống</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-medium hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm flex items-center gap-2">
                                <i className="fas fa-file-export text-slate-400"></i>
                                Xuất Excel
                            </button>
                            <button className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-teal-700 transition-all shadow-lg shadow-primary/30 flex items-center gap-2">
                                <i className="fas fa-plus"></i>
                                Thêm kho mới
                            </button>
                        </div>
                    </div>

                    {/* Filters */}
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2 text-slate-700 font-medium min-w-[80px]">
                            <i className="fas fa-filter text-primary"></i>
                            Bộ lọc:
                        </div>

                        <div className="relative group">
                            <select
                                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer min-w-[160px]"
                                value={filters.province_id}
                                onChange={handleProvinceChange}
                            >
                                <option value="">Khu vực: Tất cả</option>
                                {/* In a real app, these would be IDs from a DB. Using generic placeholders for now */}
                                <option value="hanoi">Hà Nội (Demo)</option>
                                <option value="danang">Đà Nẵng (Demo)</option>
                                <option value="hcm">TP. HCM (Demo)</option>
                            </select>
                            <i className="fas fa-chevron-down absolute right-3 top-3 text-slate-400 text-xs pointer-events-none group-hover:text-primary transition-colors"></i>
                        </div>

                        <div className="relative group">
                            <select
                                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer min-w-[160px]"
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

                        <div className="relative group">
                            <select
                                className="appearance-none bg-slate-50 border border-slate-200 text-slate-700 py-2 px-4 pr-8 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer min-w-[160px]"
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
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                            {warehouses.map((warehouse) => (
                                <div key={warehouse.id} className="bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group flex flex-col h-full">
                                    <div className="relative h-48 overflow-hidden rounded-t-xl bg-slate-100">
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
            </main>
        </div>
    );
}
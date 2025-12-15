'use client'

import { useEffect, useState } from 'react';
import { Warehouse } from '@/types/warehoue_template/warehouse_template.type';
import { WarehouseTemplateService } from '@/services/warehouse_template/warehouse_template.service';

const warehouseTemplateService = new WarehouseTemplateService()

const WarehousePage: React.FC = () => {
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const response = await warehouseTemplateService.getWarehouseTemplates(localStorage.getItem('access_token') || '', searchTerm);
                console.log('API Response:', response); // Log the response
                if (Array.isArray(response.items)) {
                    setWarehouses(response.items);
                } else {
                    console.error('Expected an array but received:', response);
                    setWarehouses([]); // Set to an empty array if the response is not valid
            }
            } catch (error) {
                console.error('Error fetching warehouses:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchWarehouses();
    }, [searchTerm]);

    // const filteredWarehouses = warehouses.filter(warehouse => {
    //     const matchesSearch = warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    //                         warehouse.address_detail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    //                         warehouse.ward.name.toLowerCase().includes(searchTerm.toLowerCase());
    //     const matchesStatus = filterStatus === 'all' || 
    //                         (filterStatus === 'available' && !warehouse.is_rented) ||
    //                         (filterStatus === 'rented' && warehouse.is_rented);
    //     const matchesType = filterType === 'all' ||
    //                       (filterType === 'shared' && warehouse.is_shared_warehouse) ||
    //                       (filterType === 'whole' && !warehouse.is_shared_warehouse);
    //     return matchesSearch && matchesStatus && matchesType && warehouse.is_active && !warehouse.is_deleted;
    // });

    const formatPrice = (price: string) => {
        return new Intl.NumberFormat('vi-VN', {
            style: 'currency',
            currency: 'VND'
        }).format(parseFloat(price));
    };

    const calculateArea = (length: number, width: number) => {
        return length * width;
    };

    const getBestDiscount = (warehouse: Warehouse) => {
        const discounts = [
            { label: '3 tháng', value: parseFloat(warehouse.discount_3_months) },
            { label: '6 tháng', value: parseFloat(warehouse.discount_6_months) },
            { label: '1 năm', value: parseFloat(warehouse.discount_1_year) },
            { label: '2 năm', value: parseFloat(warehouse.discount_2_years) },
            { label: '3+ năm', value: parseFloat(warehouse.discount_3_years_plus) }
        ].sort((a, b) => b.value - a.value);
        
        return discounts[0].value > 0 ? discounts[0] : null;
    };

    return (
        <div className="min-h-screen w-full bg-slate-900 font-sans">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                        Danh Sách Kho Hàng
                    </h1>
                    <p className="text-slate-400">
                        Tìm kiếm và quản lý các kho hàng có sẵn - Tổng cộng {warehouses.length} kho
                    </p>
                </div>

                {/* Search and Filter Bar */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-xl shadow-xl p-6 mb-6">
                    <div className="flex flex-col lg:flex-row gap-4">
                        {/* Search Input */}
                        <div className="flex-1">
                            <input
                                type="text"
                                placeholder="Tìm kiếm theo tên, địa chỉ, phường..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
                            />
                        </div>
                        
                        {/* Filter Status */}
                        <div className="lg:w-48">
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500 transition-colors"
                            >
                                <option value="all">Tất cả trạng thái</option>
                                <option value="available">Còn trống</option>
                                <option value="rented">Đã thuê</option>
                            </select>
                        </div>

                        {/* Filter Type */}
                        <div className="lg:w-48">
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-teal-500 transition-colors"
                            >
                                <option value="all">Tất cả loại</option>
                                <option value="whole">Nguyên kho</option>
                                <option value="shared">Kho chia sẻ</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Loading State */}
                {loading && (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-teal-500"></div>
                    </div>
                )}

                {/* Warehouse Grid */}
                {!loading && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {warehouses.length === 0 ? (
                            <div className="col-span-full text-center py-20">
                                <p className="text-slate-400 text-lg">
                                    Không tìm thấy kho hàng nào phù hợp
                                </p>
                            </div>
                        ) : (
                            warehouses.map(warehouse => {
                                const bestDiscount = getBestDiscount(warehouse);
                                const area = calculateArea(warehouse.length, warehouse.width);
                                const blockArea = parseFloat(warehouse.block_length) * parseFloat(warehouse.block_width);

                                return (
                                    <div
                                        key={warehouse.id}
                                        className="bg-slate-900/60 border border-slate-800 rounded-xl shadow-xl overflow-hidden hover:border-teal-600 transition-all duration-300 hover:scale-[1.02]"
                                    >
                                        {/* Warehouse Image */}
                                        <div className="relative h-48 bg-gradient-to-br from-slate-800 to-slate-900">
                                            {warehouse.images.length > 0 ? (
                                                <img
                                                    src={warehouse.images[0]}
                                                    alt={warehouse.name}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <svg className="w-20 h-20 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                                    </svg>
                                                </div>
                                            )}
                                            
                                            {/* Image Count Badge */}
                                            {warehouse.images.length > 0 && (
                                                <div className="absolute top-3 right-3 bg-slate-900/80 px-2 py-1 rounded-lg text-xs text-white flex items-center">
                                                    <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                                                    </svg>
                                                    {warehouse.images.length}
                                                </div>
                                            )}

                                            {/* Discount Badge */}
                                            {bestDiscount && (
                                                <div className="absolute top-3 left-3 bg-red-600 px-3 py-1 rounded-lg text-xs font-bold text-white">
                                                    -{bestDiscount.value}% {bestDiscount.label}
                                                </div>
                                            )}
                                        </div>

                                        {/* Warehouse Info */}
                                        <div className="p-6">
                                            {/* Status & Type Badges */}
                                            <div className="flex gap-2 mb-3 flex-wrap">
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                                    !warehouse.is_rented
                                                        ? 'bg-green-900/50 text-green-400 border border-green-700' 
                                                        : 'bg-red-900/50 text-red-400 border border-red-700'
                                                }`}>
                                                    {!warehouse.is_rented ? 'Còn trống' : 'Đã thuê'}
                                                </span>
                                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                                    warehouse.is_shared_warehouse
                                                        ? 'bg-blue-900/50 text-blue-400 border border-blue-700'
                                                        : 'bg-purple-900/50 text-purple-400 border border-purple-700'
                                                }`}>
                                                    {warehouse.is_shared_warehouse ? 'Kho chia sẻ' : 'Nguyên kho'}
                                                </span>
                                            </div>

                                            <h3 className="text-xl font-bold text-white mb-2">
                                                {warehouse.name}
                                            </h3>
                                            
                                            <p className="text-slate-400 text-sm mb-4 line-clamp-2">
                                                {warehouse.description}
                                            </p>

                                            {/* Warehouse Details */}
                                            <div className="space-y-2 mb-4">
                                                <div className="flex items-center text-sm text-slate-300">
                                                    <svg className="w-4 h-4 mr-2 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                                    </svg>
                                                    <span>Diện tích: <strong>{area.toLocaleString()} {warehouse.unit}</strong> ({warehouse.length} x {warehouse.width} {warehouse.unit})</span>
                                                </div>

                                                {warehouse.is_shared_warehouse && (
                                                    <div className="flex items-center text-sm text-slate-300">
                                                        <svg className="w-4 h-4 mr-2 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                                        </svg>
                                                        <span>Khối: {warehouse.block_length} x {warehouse.block_width} {warehouse.block_unit} ({blockArea} {warehouse.block_unit})</span>
                                                    </div>
                                                )}

                                                <div className="flex items-center text-sm text-slate-300">
                                                    <svg className="w-4 h-4 mr-2 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                                                    </svg>
                                                    <span>Số dãy: {warehouse._count?.rows}</span>
                                                </div>
                                                
                                                <div className="flex items-start text-sm text-slate-300">
                                                    <svg className="w-4 h-4 mr-2 mt-0.5 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    <span className="line-clamp-2">
                                                        {warehouse.address_detail}, {warehouse.ward.name}, {warehouse.ward.province.name}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Price & Discounts */}
                                            <div className="border-t border-slate-800 pt-4 mb-4">
                                                <p className="text-teal-400 font-bold text-xl mb-2">
                                                    {formatPrice(warehouse.price_per_month)}
                                                    <span className="text-slate-500 text-sm font-normal">/tháng</span>
                                                </p>
                                                
                                                {parseFloat(warehouse.whole_warehouse_discount) > 0 && !warehouse.is_shared_warehouse && (
                                                    <p className="text-xs text-yellow-400">
                                                        🎁 Giảm {warehouse.whole_warehouse_discount}% khi thuê nguyên kho
                                                    </p>
                                                )}
                                            </div>

                                            {/* Action Button */}
                                            <button
                                                className="w-full inline-flex justify-center items-center px-5 py-3 rounded-lg text-sm font-semibold text-white transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                                                style={{
                                                    background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)",
                                                    boxShadow: "0 10px 25px rgba(15, 118, 110, 0.35)",
                                                }}
                                            >
                                                Xem chi tiết
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* Footer */}
                <div className="mt-8 text-center text-xs text-slate-500">
                    © 2025 Gen Hub. All rights reserved.
                </div>
            </div>
        </div>
    );
};

export default WarehousePage;
"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { WarehouseTemplateService } from '@/services/warehouse_template/warehouse_template.service';
import { Warehouse } from '@/types/warehoue_template/warehouse_template.type';
import { PrimeNestHeader } from '@/app/(public)/homepage/Header';
import { PrimeNestFooter } from '@/app/(public)/homepage/Footer';
import { Ruler, BoxSelect, ArrowUpFromLine, Weight, MapPin, Share2, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

const warehouseService = new WarehouseTemplateService();

export default function WarehouseDetailPage() {
    const params = useParams();
    const id = params.id as string;
    const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWarehouse = async () => {
            try {
                setLoading(true);

                // Direct API call without authentication for public access
                const API_URL = process.env.NEXT_PUBLIC_API_URL;
                const response = await fetch(`${API_URL}/warehouse-templates/${id}`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const result = await response.json();
                    setWarehouse(result.data);
                } else {
                    console.error("Failed to fetch warehouse");
                }
            } catch (err) {
                console.error("Error:", err);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchWarehouse();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col min-h-screen">
                <PrimeNestHeader isLogin={false} />
                <main className="flex-1 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0F766E]"></div>
                </main>
                <PrimeNestFooter />
            </div>
        );
    }

    if (!warehouse) {
        return (
            <div className="flex flex-col min-h-screen">
                <PrimeNestHeader isLogin={false} />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-slate-900 mb-2">Không tìm thấy kho</h1>
                        <p className="text-slate-600">Kho bạn đang tìm không tồn tại hoặc đã bị xóa.</p>
                    </div>
                </main>
                <PrimeNestFooter />
            </div>
        );
    }

    const area = warehouse.length * warehouse.width;
    const displaySpecs = [
        {
            label: 'Diện tích',
            value: `${area.toLocaleString()} m²`,
            sub: `${warehouse.length}m × ${warehouse.width}m`,
            icon: 'area'
        },
        {
            label: 'Kích thước ô',
            value: `${warehouse.block_length} × ${warehouse.block_width}`,
            sub: 'Chiều dài × Chiều rộng',
            icon: 'grid'
        },
        {
            label: 'Chiều cao trần',
            value: `${warehouse.ceiling_height}m`,
            sub: 'Tầm cao tối đa',
            icon: 'height'
        },
        {
            label: 'Tải trọng',
            value: `${warehouse.max_load_capacity || 'N/A'} tấn/m²`,
            sub: 'Tải trọng tối đa',
            icon: 'weight'
        },
    ];

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <PrimeNestHeader isLogin={false} />

            <main className="flex-1 w-full">
                <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-8">
                    {/* Header */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
                        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                                        {warehouse.is_cold_storage ? 'Kho Lạnh' : warehouse.is_shared_warehouse ? 'Fulfillment' : 'Kho Thường'}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        Cập nhật: {new Date(warehouse.updated_at || warehouse.created_at).toLocaleDateString('vi-VN')}
                                    </span>
                                </div>

                                <h1 className="text-3xl font-bold text-slate-900 mb-3">
                                    {warehouse.name}
                                </h1>

                                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                                    <span className="flex items-center gap-1">
                                        <MapPin className="w-3.5 h-3.5" />
                                        {`${warehouse.address_detail}, ${warehouse.ward?.name || ''}`}
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="icon" className="rounded-full">
                                    <Share2 className="w-4 h-4" />
                                </Button>
                                <Button variant="outline" size="icon" className="rounded-full">
                                    <Heart className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-[#0F766E]">
                                {(parseFloat(warehouse.price_per_month) / 1000000).toFixed(0)} Tr
                            </span>
                            <span className="text-lg text-slate-500">/tháng</span>
                        </div>
                    </div>

                    {/* Images Gallery */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Hình ảnh</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {warehouse.images && warehouse.images.length > 0 ? (
                                warehouse.images.map((img) => (
                                    <div key={img.id} className="aspect-video rounded-xl overflow-hidden bg-slate-100">
                                        <img
                                            src={img.url}
                                            alt={warehouse.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full aspect-video rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                                    Chưa có hình ảnh
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Specs */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm mb-6">
                        {displaySpecs.map((spec, index) => {
                            const Icon =
                                spec.icon === 'area' ? BoxSelect :
                                    spec.icon === 'grid' ? Ruler :
                                        spec.icon === 'height' ? ArrowUpFromLine :
                                            Weight;

                            return (
                                <div key={index} className="flex flex-col gap-1.5 p-4 rounded-lg hover:bg-slate-50 transition-colors">
                                    <span className="text-xs text-slate-500 flex items-center gap-2 uppercase tracking-wider font-semibold">
                                        <Icon className="w-4 h-4 text-[#0F766E]" />
                                        {spec.label}
                                    </span>
                                    <div>
                                        <span className="font-bold text-xl block text-slate-900">{spec.value}</span>
                                        <span className="text-xs text-slate-500">{spec.sub}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Description */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Mô tả</h2>
                        <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                            {warehouse.description || 'Chưa có mô tả chi tiết.'}
                        </p>
                    </div>

                    {/* Contact */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <h2 className="text-xl font-bold text-slate-900 mb-4">Thông tin liên hệ</h2>
                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Người quản lý</p>
                                <p className="font-semibold text-slate-900">{warehouse.manager_name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Email</p>
                                <p className="font-semibold text-slate-900">{warehouse.manager_email}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500 mb-1">Số điện thoại</p>
                                <p className="font-semibold text-slate-900">{warehouse.manager_phone}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            <PrimeNestFooter />
        </div>
    );
}

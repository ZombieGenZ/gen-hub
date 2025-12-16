"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DashboardHeader } from "@/components/layouts/DashboardHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WarehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { Warehouse } from "@/types/warehoue_template/warehouse_template.type";
import { Calendar, Info, Phone, Mail, User, MapPin, ArrowRight } from "lucide-react";
import Image from "next/image";

export default function RentalRequestPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const preSelectedWarehouseId = searchParams.get("warehouse_id");

    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [formData, setFormData] = useState({
        warehouseId: preSelectedWarehouseId || "",
        fromDate: "",
        toDate: "",
        area: "",
        purpose: "",
        notes: "",
        contactName: "",
        contactPhone: "",
        contactEmail: ""
    });

    useEffect(() => {
        const fetchWarehouses = async () => {
            try {
                const token = localStorage.getItem("access_token");
                if (!token) {
                    router.push("/login");
                    return;
                }
                const service = new WarehouseTemplateService();
                // Fetch all active warehouses
                const data: any = await service.getWarehouseTemplates(token, { is_active: true, limit: 100 });
                
                let items: Warehouse[] = [];
                if (Array.isArray(data)) {
                    items = data;
                } else if (data.items) {
                    items = data.items;
                }
                setWarehouses(items);
            } catch (error) {
                console.error("Failed to fetch warehouses", error);
            } finally {
                setLoading(false);
            }
        };
        fetchWarehouses();
    }, [router]);

    const selectedWarehouse = warehouses.find(w => w.id === formData.warehouseId);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const calculateDays = () => {
        if (!formData.fromDate || !formData.toDate) return 0;
        const start = new Date(formData.fromDate);
        const end = new Date(formData.toDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
        return diffDays > 0 ? diffDays : 0;
    };

    const handleSubmit = async () => {
        // Mock submission
        alert("Yêu cầu thuê kho đã được gửi thành công! (Demo)");
        router.push("/dashboard/warehouse_template");
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <DashboardHeader>
                <div className="flex items-center text-sm text-slate-500">
                    <span className="font-medium text-slate-900">Yêu cầu thuê kho</span>
                </div>
            </DashboardHeader>

            <div className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">Yêu Cầu Thuê Kho</h1>
                    <p className="text-slate-500 mt-1">Vui lòng điền thông tin chi tiết để chúng tôi tìm giải pháp lưu trữ tốt nhất cho doanh nghiệp của bạn.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column - Form */}
                    <div className="lg:col-span-2 space-y-6">
                        
                        {/* Section 1: Rental Info */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-2 mb-4 text-blue-600 font-medium">
                                <MapPin className="w-5 h-5" />
                                <h2>Thông tin thuê</h2>
                            </div>
                            
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="warehouseId" className="mb-2 block">Chọn Kho mong muốn</Label>
                                    <div className="relative">
                                        <select
                                            id="warehouseId"
                                            name="warehouseId"
                                            value={formData.warehouseId}
                                            onChange={handleInputChange}
                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                        >
                                            <option value="">Chọn kho từ danh sách...</option>
                                            {warehouses.map(w => (
                                                <option key={w.id} value={w.id}>{w.name}</option>
                                            ))}
                                        </select>
                                        <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="fromDate" className="mb-2 block">Từ ngày</Label>
                                        <div className="relative">
                                            <Input 
                                                type="date" 
                                                id="fromDate" 
                                                name="fromDate"
                                                value={formData.fromDate}
                                                onChange={handleInputChange}
                                                className="pl-10"
                                            />
                                            <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="toDate" className="mb-2 block">Đến ngày</Label>
                                        <div className="relative">
                                            <Input 
                                                type="date" 
                                                id="toDate" 
                                                name="toDate"
                                                value={formData.toDate}
                                                onChange={handleInputChange}
                                                className="pl-10"
                                            />
                                            <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Request Details */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-2 mb-4 text-blue-600 font-medium">
                                <div className="w-5 h-5 flex items-center justify-center border-2 border-blue-600 rounded text-[10px] font-bold">
                                    <div className="w-3 h-0.5 bg-blue-600"></div>
                                </div>
                                <h2>Chi tiết nhu cầu</h2>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="area" className="mb-2 block">Diện tích mong muốn (m²)</Label>
                                        <Input 
                                            type="number" 
                                            id="area" 
                                            name="area"
                                            placeholder="VD: 500"
                                            value={formData.area}
                                            onChange={handleInputChange}
                                        />
                                    </div>
                                    <div>
                                        <Label htmlFor="purpose" className="mb-2 block">Mục đích thuê</Label>
                                        <div className="relative">
                                            <select
                                                id="purpose"
                                                name="purpose"
                                                value={formData.purpose}
                                                onChange={handleInputChange}
                                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                                            >
                                                <option value="">Chọn mục đích...</option>
                                                <option value="Lưu trữ linh kiện điện tử">Lưu trữ linh kiện điện tử</option>
                                                <option value="Lưu trữ hàng tiêu dùng">Lưu trữ hàng tiêu dùng</option>
                                                <option value="Kho phân phối (Distribution Center)">Kho phân phối (Distribution Center)</option>
                                                <option value="Kho lạnh/Kho mát">Kho lạnh/Kho mát</option>
                                                <option value="Khác">Khác</option>
                                            </select>
                                            <div className="absolute right-3 top-2.5 pointer-events-none text-slate-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <Label htmlFor="notes" className="mb-2 block">Ghi chú thêm</Label>
                                    <textarea
                                        id="notes"
                                        name="notes"
                                        rows={4}
                                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        placeholder="Nhập các yêu cầu đặc biệt về nhiệt độ, độ ẩm, an ninh..."
                                        value={formData.notes}
                                        onChange={handleInputChange}
                                    ></textarea>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Contact Info */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-2 mb-4 text-blue-600 font-medium">
                                <User className="w-5 h-5" />
                                <h2>Thông tin liên hệ</h2>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="contactName" className="mb-2 block">Họ và tên người liên hệ</Label>
                                    <div className="relative">
                                        <Input 
                                            type="text" 
                                            id="contactName" 
                                            name="contactName"
                                            placeholder="Nguyễn Văn A"
                                            value={formData.contactName}
                                            onChange={handleInputChange}
                                            className="pl-10"
                                        />
                                        <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <Label htmlFor="contactPhone" className="mb-2 block">Số điện thoại</Label>
                                        <div className="relative">
                                            <Input 
                                                type="tel" 
                                                id="contactPhone" 
                                                name="contactPhone"
                                                placeholder="0909 123 456"
                                                value={formData.contactPhone}
                                                onChange={handleInputChange}
                                                className="pl-10"
                                            />
                                            <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                        </div>
                                    </div>
                                    <div>
                                        <Label htmlFor="contactEmail" className="mb-2 block">Email công ty</Label>
                                        <div className="relative">
                                            <Input 
                                                type="email" 
                                                id="contactEmail" 
                                                name="contactEmail"
                                                placeholder="contact@company.com"
                                                value={formData.contactEmail}
                                                onChange={handleInputChange}
                                                className="pl-10"
                                            />
                                            <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Right Column - Summary */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Summary Card */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-24">
                            {selectedWarehouse ? (
                                <div className="mb-6 relative h-40 rounded-lg overflow-hidden">
                                    <Image 
                                        src={selectedWarehouse.images?.[0]?.url || "https://placehold.co/600x400?text=Warehouse"} 
                                        alt={selectedWarehouse.name}
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                                        <p className="text-white font-bold text-sm">{selectedWarehouse.name}</p>
                                        <p className="text-white/80 text-xs truncate">{selectedWarehouse.address_detail}</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="mb-6 h-40 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 text-sm">
                                    Chưa chọn kho
                                </div>
                            )}

                            <h3 className="font-bold text-slate-900 mb-4">Tóm tắt yêu cầu</h3>
                            
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Thời gian thuê</span>
                                    <div className="text-right">
                                        <span className="font-medium text-slate-900 block">{calculateDays()} ngày</span>
                                        {formData.fromDate && formData.toDate && (
                                            <span className="text-xs text-slate-400">
                                                {new Date(formData.fromDate).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'})} - {new Date(formData.toDate).toLocaleDateString('vi-VN', {day: '2-digit', month: '2-digit'})}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Diện tích</span>
                                    <span className="font-medium text-slate-900">{formData.area || "0"} m²</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-slate-100">
                                    <span className="text-slate-500">Loại hàng</span>
                                    <span className="font-medium text-slate-900 truncate max-w-[150px]">{formData.purpose || "Chưa chọn"}</span>
                                </div>
                            </div>

                            <div className="mt-6 bg-blue-50 p-3 rounded-lg flex gap-3">
                                <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-blue-700 leading-relaxed">
                                    Yêu cầu của bạn sẽ được xử lý trong vòng 24h. Nhân viên tư vấn sẽ liên hệ qua số điện thoại cung cấp.
                                </p>
                            </div>
                        </div>

                        {/* Support Card */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                                    <Phone className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-900">Cần hỗ trợ?</p>
                                    <p className="text-xs text-slate-500">Gọi hotline miễn phí</p>
                                </div>
                            </div>
                            <div className="text-center mt-4">
                                <span className="text-2xl font-bold text-slate-900">1800 6688</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="mt-8 flex justify-end gap-4 border-t border-slate-200 pt-6">
                    <Button variant="outline" className="h-11 px-8" onClick={() => router.back()}>
                        Hủy bỏ
                    </Button>
                    <Button className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white gap-2" onClick={handleSubmit}>
                        Gửi yêu cầu <ArrowRight className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}

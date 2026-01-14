"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { warehouseTemplateService } from "@/services/warehouse_template/warehouse_template.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { Calendar, Info, Phone, Mail, User, MapPin, ArrowRight, ArrowLeft } from "lucide-react";
import Image from "next/image";
import { useToast } from "@/contexts/ToastContext";

interface Warehouse {
    id: string;
    name: string;
    address_detail: string;
    images: { url: string }[];
}

function RentalRequestContent() {
    const router = useRouter();
    const params = useParams();
    const { showToast } = useToast();
    const preSelectedWarehouseId = params.id as string;

    const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
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
        const fetchWarehouse = async () => {
            try {
                const token = authStorage.getAccessToken();
                if (!token) {
                    // router.push("/login"); // Optional
                }

                if (preSelectedWarehouseId) {
                    const data: any = await warehouseTemplateService.getWarehouseTemplateById(token || "", preSelectedWarehouseId);
                    setWarehouse(data);
                }
            } catch (error) {
                console.error("Failed to fetch warehouse", error);
            } finally {
                setLoading(false);
            }
        };
        fetchWarehouse();
    }, [preSelectedWarehouseId]);

    useEffect(() => {
        // Pre-fill contact info from user profile if available (Mock for now)
        // const user = authStorage.getUser();
        // if (user) ...
    }, []);


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
        // Here we would call the API to create a RentalContract with status PENDING
        // await rentalContractService.createContract({...});

        showToast("Yêu cầu thuê kho đã được gửi thành công! (Demo)", 'success');
        router.push("/dashboard/customer/bookings");
    };

    if (loading) return <div>Đang tải...</div>;

    return (
        <div className="max-w-5xl mx-auto pb-12">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4 pl-0 gap-2 hover:bg-transparent hover:text-brand">
                <ArrowLeft className="w-4 h-4" />
                Quay lại chi tiết kho
            </Button>

            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Yêu Cầu Thuê Kho</h1>
                <p className="text-muted-foreground mt-1">Hoàn tất thông tin để gửi yêu cầu đặt kho của bạn.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - Form */}
                <div className="lg:col-span-2 space-y-6">

                    {/* Section 1: Rental Info */}
                    <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                        <div className="flex items-center gap-2 mb-4 text-brand font-medium">
                            <MapPin className="w-5 h-5" />
                            <h2>Thông tin thuê</h2>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <Label className="mb-2 block">Kho đã chọn</Label>
                                <Input value={warehouse?.name || "Đang tải..."} disabled className="bg-muted" />
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
                                        <Calendar className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
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
                                        <Calendar className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Request Details */}
                    <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                        <div className="flex items-center gap-2 mb-4 text-brand font-medium">
                            <div className="w-5 h-5 flex items-center justify-center border-2 border-brand rounded text-[10px] font-bold">
                                <div className="w-3 h-0.5 bg-brand"></div>
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
                                            className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring appearance-none"
                                        >
                                            <option value="">Chọn mục đích...</option>
                                            <option value="Lưu trữ linh kiện điện tử">Lưu trữ linh kiện điện tử</option>
                                            <option value="Lưu trữ hàng tiêu dùng">Lưu trữ hàng tiêu dùng</option>
                                            <option value="Kho phân phối">Kho phân phối</option>
                                            <option value="Kho lạnh/Kho mát">Kho lạnh/Kho mát</option>
                                            <option value="Khác">Khác</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="notes" className="mb-2 block">Ghi chú thêm</Label>
                                <textarea
                                    id="notes"
                                    name="notes"
                                    rows={4}
                                    className="w-full bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                                    placeholder="Nhập các yêu cầu đặc biệt..."
                                    value={formData.notes}
                                    onChange={handleInputChange}
                                ></textarea>
                            </div>
                        </div>
                    </div>

                    {/* Section 3: Contact Info */}
                    <div className="bg-card p-6 rounded-xl shadow-sm border border-border">
                        <div className="flex items-center gap-2 mb-4 text-brand font-medium">
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
                                    <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
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
                                        <Phone className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                                    </div>
                                </div>
                                <div>
                                    <Label htmlFor="contactEmail" className="mb-2 block">Email</Label>
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
                                        <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Right Column - Summary */}
                <div className="lg:col-span-1 space-y-6">
                    {/* Summary Card */}
                    <div className="bg-card p-6 rounded-xl shadow-sm border border-border sticky top-24">
                        {warehouse ? (
                            <div className="mb-6 relative h-40 rounded-lg overflow-hidden">
                                <Image
                                    src={warehouse.images?.[0]?.url || "/placeholder-warehouse.jpg"}
                                    alt={warehouse.name}
                                    fill
                                    className="object-cover"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                                    <p className="text-white font-bold text-sm">{warehouse.name}</p>
                                    <p className="text-white/80 text-xs truncate">{warehouse.address_detail}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="mb-6 h-40 bg-muted rounded-lg flex items-center justify-center text-muted-foreground text-sm">
                                Đang tải thông tin kho...
                            </div>
                        )}

                        <h3 className="font-bold mb-4">Tóm tắt yêu cầu</h3>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-border">
                                <span className="text-muted-foreground">Thời gian thuê</span>
                                <div className="text-right">
                                    <span className="font-medium block">{calculateDays()} ngày</span>
                                    {formData.fromDate && formData.toDate && (
                                        <span className="text-xs text-muted-foreground">
                                            {new Date(formData.fromDate).toLocaleDateString('vi-VN')} - {new Date(formData.toDate).toLocaleDateString('vi-VN')}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex justify-between py-2 border-b border-border">
                                <span className="text-muted-foreground">Diện tích</span>
                                <span className="font-medium">{formData.area || "0"} m²</span>
                            </div>
                        </div>

                        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex gap-3">
                            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">
                                Yêu cầu của bạn sẽ được gửi đến bộ phận kinh doanh. Chúng tôi sẽ liên hệ lại sớm nhất.
                            </p>
                        </div>

                        {/* Footer Actions */}
                        <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6">
                            <Button className="w-full h-11 bg-brand hover:bg-brand-hover text-white gap-2 shadow-lg shadow-brand/20" onClick={handleSubmit}>
                                Gửi yêu cầu đặt kho <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function BookingPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <RentalRequestContent />
        </Suspense>
    );
}

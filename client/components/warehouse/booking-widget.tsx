"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    CalendarIcon,
    CheckIcon,
    DocumentTextIcon
} from '@heroicons/react/24/outline';
import { format, addMonths } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface BookingWidgetProps {
    price: number;
    unit?: string;
}

export function BookingWidget({ price, unit = "tháng" }: BookingWidgetProps) {
    const [rentalType, setRentalType] = useState<"whole" | "row">("whole");
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [duration, setDuration] = useState("6");
    const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
    const [insurance, setInsurance] = useState("basic");

    // Mock calculations
    const basePrice = rentalType === "whole" ? price : price * 0.15; // Assume row is 15% of whole
    const durationDiscount = duration === "12" ? 0.05 : duration === "24" ? 0.1 : 0;

    // Addons cost
    const addonsCost = selectedAddons.length * 2000000; // 2M per addon
    const insuranceCost = insurance === "pro" ? 5000000 : insurance === "premium" ? 10000000 : 0;

    const monthlyTotal = basePrice * (1 - durationDiscount) + addonsCost + insuranceCost;
    const grandTotal = monthlyTotal * parseInt(duration);

    return (
        <div className="sticky top-24 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1a202c] shadow-xl shadow-slate-200/50 overflow-hidden">
            {/* Header / Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-700">
                <button
                    onClick={() => setRentalType("whole")}
                    className={cn(
                        "flex-1 py-4 text-sm font-bold transition-colors relative",
                        rentalType === "whole"
                            ? "text-[#0F766E] bg-teal-50/50"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    )}
                >
                    Thuê nguyên kho
                    {rentalType === "whole" && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F766E]" />
                    )}
                </button>
                <button
                    onClick={() => setRentalType("row")}
                    className={cn(
                        "flex-1 py-4 text-sm font-bold transition-colors relative",
                        rentalType === "row"
                            ? "text-[#0F766E] bg-teal-50/50"
                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    )}
                >
                    Thuê theo dãy/kệ
                    {rentalType === "row" && (
                        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0F766E]" />
                    )}
                </button>
            </div>

            <div className="p-6 space-y-6">
                {/* Price Display */}
                <div>
                    <div className="flex items-baseline gap-1 mb-1">
                        <span className="text-3xl font-black text-[#0F766E] tracking-tight">
                            {monthlyTotal >= 1000000000
                                ? `${(monthlyTotal / 1000000000).toFixed(2).replace('.', ',')} Tỷ`
                                : `${monthlyTotal.toLocaleString('vi-VN')}₫`
                            }
                        </span>
                        <span className="text-slate-500 font-medium">/{unit}</span>
                    </div>
                    {durationDiscount > 0 && (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 border-none">
                            Đã giảm {durationDiscount * 100}% cho kỳ hạn {duration} tháng
                        </Badge>
                    )}
                </div>

                <div className="space-y-4">
                    {/* Date Picker */}
                    <div className="space-y-2">
                        <Label className="text-slate-600 font-medium text-xs uppercase tracking-wide">Ngày bắt đầu thuê</Label>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal h-12 rounded-xl border-slate-200",
                                        !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-[#0F766E]" />
                                    {date ? format(date, "d 'tháng' M, yyyy", { locale: vi }) : <span>Chọn ngày</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    mode="single"
                                    selected={date}
                                    onSelect={setDate}
                                    initialFocus
                                    className="rounded-xl border border-slate-100 shadow-lg"
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* Duration Select */}
                    <div className="space-y-2">
                        <Label className="text-slate-600 font-medium text-xs uppercase tracking-wide">Kỳ hạn thuê</Label>
                        <Select value={duration} onValueChange={setDuration}>
                            <SelectTrigger className="w-full h-12 rounded-xl border-slate-200">
                                <SelectValue placeholder="Chọn kỳ hạn" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="6">6 Tháng (Tiêu chuẩn)</SelectItem>
                                <SelectItem value="12">1 Năm (Giảm 5%)</SelectItem>
                                <SelectItem value="24">2 Năm (Giảm 10%)</SelectItem>
                                <SelectItem value="36">3 Năm (Giảm 15%)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Partial Rental Specifics */}
                    {rentalType === "row" && (
                        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                            <Label className="text-slate-600 font-medium text-xs uppercase tracking-wide">Chọn Dãy (Demo)</Label>
                            <Select defaultValue="A">
                                <SelectTrigger className="w-full h-10 bg-white border-slate-200">
                                    <SelectValue placeholder="Chọn dãy" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="A">Dãy A (Gần cửa kho)</SelectItem>
                                    <SelectItem value="B">Dãy B (Giữa kho)</SelectItem>
                                    <SelectItem value="C">Dãy C (Nhiệt độ thấp)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {/* Addons Collapsible */}
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-slate-600 font-medium text-xs uppercase tracking-wide">Dịch vụ cộng thêm</Label>
                            <span className="text-xs text-[#0F766E] font-medium cursor-pointer hover:underline">Xem chi tiết</span>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            <div className="flex items-start space-x-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                                <Checkbox
                                    id="addon-forklift"
                                    checked={selectedAddons.includes('forklift')}
                                    onCheckedChange={(checked) => {
                                        if (checked) setSelectedAddons([...selectedAddons, 'forklift']);
                                        else setSelectedAddons(selectedAddons.filter(id => id !== 'forklift'));
                                    }}
                                    className="data-[state=checked]:bg-[#0F766E] data-[state=checked]:border-[#0F766E]"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="addon-forklift" className="font-semibold text-slate-700 cursor-pointer">
                                        Xe nâng & Bốc xếp
                                    </Label>
                                    <p className="text-xs text-slate-500">
                                        +2.000.000đ/tháng
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                                <Checkbox
                                    id="addon-security"
                                    checked={selectedAddons.includes('security')}
                                    onCheckedChange={(checked) => {
                                        if (checked) setSelectedAddons([...selectedAddons, 'security']);
                                        else setSelectedAddons(selectedAddons.filter(id => id !== 'security'));
                                    }}
                                    className="data-[state=checked]:bg-[#0F766E] data-[state=checked]:border-[#0F766E]"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <Label htmlFor="addon-security" className="font-semibold text-slate-700 cursor-pointer">
                                        Bảo vệ riêng 24/7
                                    </Label>
                                    <p className="text-xs text-slate-500">
                                        +2.000.000đ/tháng
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Separator className="bg-slate-100" />

                {/* Summary */}
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600">
                        <span>Giá thuê x {duration} tháng</span>
                        <span className="font-medium text-slate-900">
                            {(monthlyTotal * parseInt(duration)).toLocaleString('vi-VN')}₫
                        </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                        <span>Phí dịch vụ (10%)</span>
                        <span className="font-medium text-slate-900">
                            {(monthlyTotal * parseInt(duration) * 0.1).toLocaleString('vi-VN')}₫
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-base pt-2 font-bold text-slate-900 border-t border-slate-100 mt-2">
                        <span>Tổng cộng (dự kiến)</span>
                        <span className="text-[#0F766E]">
                            {(monthlyTotal * parseInt(duration) * 1.1).toLocaleString('vi-VN')}₫
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="space-y-3 pt-2">
                    <Button className="w-full h-12 rounded-xl bg-[#0F766E] hover:bg-[#0D655D] text-white text-base font-bold shadow-lg shadow-teal-500/20 transition-all">
                        Thuê ngay / Đặt cọc
                    </Button>
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1 h-10 rounded-xl border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">
                            <DocumentTextIcon className="w-3.5 h-3.5 mr-1.5" />
                            Hợp đồng mẫu
                        </Button>
                        <Button variant="outline" className="flex-1 h-10 rounded-xl border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-50">
                            Chat tư vấn
                        </Button>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                    <CheckIcon className="w-3 h-3" />
                    <span>Không trừ tiền cho đến khi ký hợp đồng</span>
                </div>
            </div>
        </div>
    );
}

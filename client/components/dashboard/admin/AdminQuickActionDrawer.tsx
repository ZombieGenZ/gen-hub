"use client";

import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface AdminQuickActionDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    actionData: { type: string; data: any } | null;
}

export function AdminQuickActionDrawer({ isOpen, onClose, actionData }: AdminQuickActionDrawerProps) {
    if (!actionData) return null;

    const { type, data } = actionData;

    const renderTicketContent = () => (
        <div className="space-y-6 mt-6">
            <div className="space-y-2">
                <Badge variant="outline" className={`text-xs font-semibold px-2 py-0.5 rounded ${data.priority === 'URGENT' ? 'border-chart-2/50 text-chart-2 bg-chart-2/5' : 'border-chart-3/50 text-chart-3 bg-chart-3/5'}`}>
                    Mức độ KHẨN CẤP: {data.priority}
                </Badge>
                <h3 className="text-lg font-bold text-slate-900">{data.title}</h3>
                <p className="text-sm text-slate-500">Ticket ID: <span className="font-mono text-slate-900">{data.id}</span></p>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
                <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Tổ chức yêu cầu</p>
                    <p className="text-sm font-semibold text-slate-900">{data.org}</p>
                </div>
                <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Thời gian tạo</p>
                    <p className="text-sm font-semibold text-slate-900">{data.time}</p>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-2 block">Nhân viên phụ trách</label>
                    <select className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none">
                        <option>Chưa giao</option>
                        <option>Nguyễn Văn Kỹ Thuật</option>
                        <option>Trần Thị Chăm Sóc</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-medium text-slate-500 mb-2 block">Ghi chú nhanh</label>
                    <textarea 
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none min-h-[100px] resize-none"
                        placeholder="Nhập ghi chú hoặc bước xử lý tiếp theo..."
                    ></textarea>
                </div>
            </div>
            <div className="mt-8 pt-4 space-y-3">
                <Button className="w-full bg-chart-1 text-white hover:bg-chart-1/90" size="lg">Nhận & Giao việc</Button>
                <Button variant="outline" className="w-full" size="lg" onClick={onClose}>Hủy & Đóng</Button>
            </div>
        </div>
    );

    const renderOrgUpdateContent = () => (
        <div className="space-y-6 mt-6">
             <div className="space-y-2">
                <Badge variant="outline" className="text-xs font-semibold border-chart-3/50 text-chart-3 bg-chart-3/5 px-2 py-0.5 rounded">
                    Khách hàng cập nhật thông tin
                </Badge>
                <h3 className="text-lg font-bold text-slate-900">{data.type}</h3>
                <p className="text-sm text-slate-500">Request ID: <span className="font-mono text-slate-900">{data.id}</span></p>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
                <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Tổ chức</p>
                    <p className="text-sm font-semibold text-slate-900">{data.org}</p>
                </div>
                
                <div className="bg-slate-50 border-l-4 border-chart-3 p-4 rounded-r-lg mt-4">
                    <p className="text-xs text-slate-500 mb-2">Thông tin cũ</p>
                    <p className="text-sm text-slate-500 line-through">0312000111</p>
                    <Separator className="my-2 bg-slate-200" />
                    <p className="text-xs text-slate-500 mb-2">Thông tin mới đề xuất</p>
                    <p className="text-sm font-semibold text-slate-900">0312000222</p>
                </div>

                <div className="bg-chart-4/5 p-3 flex items-center gap-3 rounded-lg border border-chart-4/20 mt-4">
                    <div className="w-9 h-9 bg-white rounded-md flex items-center justify-center border border-slate-100 shadow-sm">
                        <span className="text-xs">PDF</span>
                    </div>
                    <div>
                        <p className="text-sm font-medium text-slate-900">giay_phep_kinh_doanh_moi.pdf</p>
                        <p className="text-xs text-slate-500">Đã đính kèm</p>
                    </div>
                </div>
            </div>
            <div className="mt-8 pt-4 flex gap-3">
                <Button variant="outline" className="flex-1 border-chart-2/50 text-chart-2 hover:bg-chart-2/5" size="lg">Từ chối</Button>
                <Button className="flex-1 bg-chart-1 text-white hover:bg-chart-1/90" size="lg">Phê duyệt</Button>
            </div>
        </div>
    );

    const renderRefundContent = () => (
        <div className="space-y-6 mt-6">
             <div className="space-y-2">
                <Badge variant="outline" className="text-xs font-semibold border-chart-4/50 text-chart-4 bg-chart-4/5 px-2 py-0.5 rounded">
                    Yêu cầu Kế toán đối soát
                </Badge>
                <h3 className="text-lg font-bold text-slate-900">Hoàn tiền {data.reason}</h3>
                <p className="text-sm text-slate-500">Refund ID: <span className="font-mono text-slate-900">{data.id}</span></p>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
                <div>
                    <p className="text-xs font-medium text-slate-500 mb-1">Tổ chức</p>
                    <p className="text-sm font-semibold text-slate-900">{data.org}</p>
                </div>
                
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm text-slate-600">Số tiền đề xuất hoàn:</span>
                        <span className="text-lg font-bold text-chart-4">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.amount)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-xs text-slate-500">
                        <span>Lệ phí xử lý (Dự kiến):</span>
                        <span>- {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(100000)}</span>
                    </div>
                    <Separator className="my-2" />
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-slate-900">Thực lãnh:</span>
                        <span className="text-base font-bold text-slate-900">
                            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.amount - 100000)}
                        </span>
                    </div>
                </div>

                <div>
                    <label className="text-xs font-medium text-slate-500 mb-2 block">Ghi chú cho khách hàng (Tùy chọn)</label>
                    <textarea 
                        className="w-full text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none min-h-[80px] resize-none"
                    ></textarea>
                </div>
            </div>
            <div className="mt-8 pt-4 space-y-3">
                 <Button className="w-full bg-chart-4 text-white hover:bg-chart-4/90" size="lg">Xác nhận & Cập nhật số dư</Button>
            </div>
        </div>
    );

    const renderVisitContent = () => (
        <div className="space-y-6 mt-6">
             <div className="space-y-2">
                <Badge variant="outline" className="text-xs font-semibold border-chart-1/50 text-chart-1 bg-chart-1/5 px-2 py-0.5 rounded">
                    Sales xử lý
                </Badge>
                <h3 className="text-lg font-bold text-slate-900">Lịch hẹn khách đến xem kho</h3>
                <p className="text-sm text-slate-500">Booking ID: <span className="font-mono text-slate-900">{data.id}</span></p>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Khách hàng</p>
                        <p className="text-sm font-semibold text-slate-900">{data.customerName}</p>
                        <p className="text-xs text-slate-500">{data.org}</p>
                    </div>
                    <div>
                        <p className="text-xs font-medium text-slate-500 mb-1">Dự kiến tham quan</p>
                        <p className="text-sm font-bold text-chart-1">{data.date}</p>
                    </div>
                </div>
                
                <div className="mt-4">
                    <p className="text-xs font-medium text-slate-500 mb-1">Hệ thống kho</p>
                    <p className="text-sm font-semibold text-slate-900">{data.warehouse}</p>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl mt-4 space-y-3">
                    <p className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">Checklist xác nhận:</p>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded appearance-none border border-slate-300 checked:bg-chart-1 checked:border-chart-1 transition-colors relative 
                        after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px] after:top-[1px] after:w-[6px] after:h-[10px] after:border-r-2 after:border-b-2 after:border-white after:rotate-45" />
                        <span className="text-sm text-slate-700">Đã gọi điện xác nhận giờ đón khách</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded appearance-none border border-slate-300 checked:bg-chart-1 checked:border-chart-1 transition-colors relative 
                        after:content-[''] after:absolute after:hidden checked:after:block after:left-[5px] after:top-[1px] after:w-[6px] after:h-[10px] after:border-r-2 after:border-b-2 after:border-white after:rotate-45" />
                        <span className="text-sm text-slate-700">Đã thông báo bảo vệ kho chuẩn bị mở cổng</span>
                    </label>
                </div>
            </div>
            
            <div className="mt-8 pt-4 space-y-3">
                <Button className="w-full bg-chart-1 text-white hover:bg-chart-1/90" size="lg">Xác nhận lịch hẹn</Button>
            </div>
        </div>
    );

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-[400px] sm:w-[540px] border-l-0 shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] p-0">
                <div className="h-full flex flex-col">
                    <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                        {type === 'TICKET' && renderTicketContent()}
                        {type === 'ORG_UPDATE' && renderOrgUpdateContent()}
                        {type === 'REFUND' && renderRefundContent()}
                        {type === 'VISIT' && renderVisitContent()}
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
}

"use client";

import { DashboardHeader } from "@/components/layouts/AdminHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Save,
    Bell,
    Shield,
    Globe,
    Mail,
    Phone,
    Building
} from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
    return (
        <div className="flex flex-col flex-1 h-full bg-muted/40">
            <DashboardHeader />

            <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Cài đặt hệ thống</h1>
                        <p className="text-sm text-muted-foreground mt-1">Quản lý cấu hình chung và bảo mật</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* General Settings */}
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border/50 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-brand-subtle flex items-center justify-center text-brand">
                                <Globe className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Thông tin chung</h3>
                                <p className="text-sm text-muted-foreground">Thông tin cơ bản về doanh nghiệp</p>
                            </div>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label>Tên doanh nghiệp</Label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input defaultValue="GenHub Logistics" className="pl-9" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Email liên hệ</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input defaultValue="contact@genhub.vn" className="pl-9" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Số điện thoại</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input defaultValue="0909 888 777" className="pl-9" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Địa chỉ</Label>
                                <Input defaultValue="123 Đường ABC, Quận 1, TP.HCM" />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-muted/20 border-t border-border/50 flex justify-end">
                            <Button className="gap-2 bg-brand text-white hover:bg-brand-hover">
                                <Save className="w-4 h-4" />
                                Lưu thay đổi
                            </Button>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border/50 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center text-warning">
                                <Bell className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Thông báo</h3>
                                <p className="text-sm text-muted-foreground">Cấu hình nhận thông báo hệ thống</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-foreground">Email thông báo</h4>
                                    <p className="text-sm text-muted-foreground">Nhận email khi có đơn hàng mới</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-foreground">Thông báo đẩy</h4>
                                    <p className="text-sm text-muted-foreground">Nhận thông báo trên trình duyệt</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-foreground">Báo cáo hàng tuần</h4>
                                    <p className="text-sm text-muted-foreground">Gửi báo cáo tổng hợp vào thứ 2</p>
                                </div>
                                <Switch />
                            </div>
                        </div>
                    </div>

                    {/* Security */}
                    <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border/50 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center text-success">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Bảo mật</h3>
                                <p className="text-sm text-muted-foreground">Cấu hình bảo mật và đăng nhập</p>
                            </div>
                        </div>
                        <div className="p-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-foreground">Xác thực 2 lớp (2FA)</h4>
                                    <p className="text-sm text-muted-foreground">Tăng cường bảo mật cho tài khoản quản trị</p>
                                </div>
                                <Switch />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-foreground">Tự động đăng xuất</h4>
                                    <p className="text-sm text-muted-foreground">Đăng xuất sau 30 phút không hoạt động</p>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

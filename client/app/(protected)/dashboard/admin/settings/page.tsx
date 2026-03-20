"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/contexts/ToastContext";
import { authStorage } from "@/services/auth/auth-storage.service";
import { OrganizationService } from "@/services/organization/organization.service";
import { Organization } from "@/types/organization/organization.type";
import { useRouter } from "next/navigation";
import {
    Save,
    Bell,
    Shield,
    Globe,
    Mail,
    Phone,
    Building
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const organizationService = new OrganizationService();

interface GeneralSettingsForm {
    name: string;
    representative_email: string;
    representative_phone: string;
    headquarters_address: string;
    is_using_google_email: boolean;
    auto_delete_api_key_logs: boolean;
    auto_delete_org_audit_logs: boolean;
}

export default function SettingsPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [organization, setOrganization] = useState<Organization | null>(null);
    const [form, setForm] = useState<GeneralSettingsForm>({
        name: "",
        representative_email: "",
        representative_phone: "",
        headquarters_address: "",
        is_using_google_email: false,
        auto_delete_api_key_logs: false,
        auto_delete_org_audit_logs: false,
    });

    const getToken = useCallback(() => {
        const token = authStorage.getAccessToken();
        if (!token) {
            router.push("/login");
            return null;
        }
        return token;
    }, [router]);

    const fetchOrganization = useCallback(async () => {
        const token = getToken();
        if (!token) return;

        setLoading(true);
        try {
            const response = await organizationService.getOrganizations(token, { limit: 1 });
            const org = response?.items?.[0] ?? null;

            if (!org) {
                showToast("Không tìm thấy tổ chức để cấu hình", "error");
                return;
            }

            setOrganization(org);
            setForm({
                name: org.name ?? "",
                representative_email: org.representative_email ?? "",
                representative_phone: org.representative_phone ?? "",
                headquarters_address: org.headquarters_address ?? "",
                is_using_google_email: org.is_using_google_email ?? false,
                auto_delete_api_key_logs: org.auto_delete_api_key_logs ?? false,
                auto_delete_org_audit_logs: org.auto_delete_org_audit_logs ?? false,
            });
        } catch (error) {
            console.error(error);
            showToast("Không thể tải dữ liệu cài đặt", "error");
        } finally {
            setLoading(false);
        }
    }, [getToken, showToast]);

    useEffect(() => {
        fetchOrganization();
    }, [fetchOrganization]);

    const handleSave = async () => {
        if (!organization) return;

        const token = getToken();
        if (!token) return;

        setSaving(true);
        try {
            await organizationService.updateOrganization(token, organization.id, {
                name: form.name.trim(),
                representative_email: form.representative_email.trim(),
                representative_phone: form.representative_phone.trim(),
                headquarters_address: form.headquarters_address.trim(),
                is_using_google_email: form.is_using_google_email,
                auto_delete_api_key_logs: form.auto_delete_api_key_logs,
                auto_delete_org_audit_logs: form.auto_delete_org_audit_logs,
            });

            showToast("Đã gửi yêu cầu cập nhật cài đặt", "success");
            await fetchOrganization();
        } catch (error) {
            console.error(error);
            showToast("Lưu cài đặt thất bại", "error");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col flex-1 h-full bg-muted/40">

            <main className="flex-1 p-4 md:p-8 max-w-5xl mx-auto w-full">
                {loading && (
                    <div className="mb-4 rounded-xl border bg-white px-4 py-2 text-sm text-muted-foreground">
                        Đang tải dữ liệu cài đặt...
                    </div>
                )}

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Cài đặt hệ thống</h1>
                        <p className="text-sm text-muted-foreground mt-1">Quản lý cấu hình chung và bảo mật</p>
                    </div>
                </div>

                <div className="space-y-6">
                    {/* General Settings */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border/50 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-brand-subtle flex items-center justify-center text-brand">
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
                                    <Input
                                        value={form.name}
                                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Email liên hệ</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        value={form.representative_email}
                                        onChange={(e) => setForm((prev) => ({ ...prev, representative_email: e.target.value }))}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Số điện thoại</Label>
                                <div className="relative">
                                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <Input
                                        value={form.representative_phone}
                                        onChange={(e) => setForm((prev) => ({ ...prev, representative_phone: e.target.value }))}
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Địa chỉ</Label>
                                <Input
                                    value={form.headquarters_address}
                                    onChange={(e) => setForm((prev) => ({ ...prev, headquarters_address: e.target.value }))}
                                />
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-muted/20 border-t border-border/50 flex justify-end">
                            <Button
                                className="gap-2 bg-brand text-white hover:bg-brand-hover"
                                onClick={handleSave}
                                disabled={saving || loading || !organization}
                            >
                                <Save className="w-4 h-4" />
                                {saving ? "Đang lưu..." : "Lưu thay đổi"}
                            </Button>
                        </div>
                    </div>

                    {/* Notifications */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border/50 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center text-warning">
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
                                    <h4 className="font-medium text-foreground">Gmail tích hợp</h4>
                                    <p className="text-sm text-muted-foreground">Sử dụng Gmail để đồng bộ luồng thông báo tổ chức</p>
                                </div>
                                <Switch
                                    checked={form.is_using_google_email}
                                    onCheckedChange={(checked) =>
                                        setForm((prev) => ({ ...prev, is_using_google_email: Boolean(checked) }))
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-foreground">Tự động dọn log API key</h4>
                                    <p className="text-sm text-muted-foreground">Bật để tự động xóa log API key theo chính sách lưu trữ</p>
                                </div>
                                <Switch
                                    checked={form.auto_delete_api_key_logs}
                                    onCheckedChange={(checked) =>
                                        setForm((prev) => ({ ...prev, auto_delete_api_key_logs: Boolean(checked) }))
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-foreground">Tự động dọn audit log</h4>
                                    <p className="text-sm text-muted-foreground">Bật để tự động xóa lịch sử audit theo chính sách</p>
                                </div>
                                <Switch
                                    checked={form.auto_delete_org_audit_logs}
                                    onCheckedChange={(checked) =>
                                        setForm((prev) => ({ ...prev, auto_delete_org_audit_logs: Boolean(checked) }))
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    {/* Security */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border/50 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center text-success">
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
                                    <h4 className="font-medium text-foreground">Trạng thái Gmail tích hợp</h4>
                                    <p className="text-sm text-muted-foreground">Đồng bộ với cấu hình tích hợp Gmail của tổ chức</p>
                                </div>
                                <Switch
                                    checked={form.is_using_google_email}
                                    onCheckedChange={(checked) =>
                                        setForm((prev) => ({ ...prev, is_using_google_email: Boolean(checked) }))
                                    }
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-foreground">Tự động dọn audit log</h4>
                                    <p className="text-sm text-muted-foreground">Giúp giảm dữ liệu nhạy cảm lưu trữ dài hạn</p>
                                </div>
                                <Switch
                                    checked={form.auto_delete_org_audit_logs}
                                    onCheckedChange={(checked) =>
                                        setForm((prev) => ({ ...prev, auto_delete_org_audit_logs: Boolean(checked) }))
                                    }
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

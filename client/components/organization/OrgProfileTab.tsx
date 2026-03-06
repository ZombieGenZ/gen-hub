"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Organization } from "@/types/organization/organization.type";
import { Copy, Check, ImageIcon, Save, Loader2 } from "lucide-react";

interface OrgProfileTabProps {
    organization: Organization;
    onUpdate: (data: Partial<Organization>) => Promise<void>;
}

export function OrgProfileTab({ organization, onUpdate }: OrgProfileTabProps) {
    const [copied, setCopied] = useState(false);
    const [name, setName] = useState(organization.name);
    const [internationalName, setInternationalName] = useState(organization.international_name || "");
    const [saving, setSaving] = useState(false);
    const [allowAdminDelete, setAllowAdminDelete] = useState(true);

    const slug = organization.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-") || "";

    const handleCopyId = async () => {
        await navigator.clipboard.writeText(organization.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onUpdate({ name, international_name: internationalName || null });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Profile Section */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border/50">
                    <h3 className="text-base font-semibold text-foreground">Hồ sơ</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Quản lý hồ sơ tổ chức</p>
                </div>
                <div className="p-6 space-y-6">
                    {/* Organization ID */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">ID Tổ chức</Label>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2">
                                <code className="text-sm text-muted-foreground font-mono truncate">
                                    {organization.id}
                                </code>
                                <button
                                    onClick={handleCopyId}
                                    className="ml-2 text-primary hover:text-primary/80 text-sm font-medium flex items-center gap-1 shrink-0 cursor-pointer"
                                >
                                    {copied ? (
                                        <>
                                            <Check className="w-3.5 h-3.5" />
                                            Đã sao chép
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-3.5 h-3.5" />
                                            Sao chép
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Slug */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">Slug</Label>
                        <Input value={slug} readOnly className="bg-muted/30" />
                    </div>

                    {/* Created */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">Ngày tạo</Label>
                        <p className="text-sm text-muted-foreground">
                            {new Date(organization.created_at).toLocaleDateString("vi-VN", {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                            })}
                        </p>
                    </div>

                    {/* Name */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">Tên tổ chức</Label>
                        <Input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Nhập tên tổ chức..."
                        />
                    </div>

                    {/* International Name */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">Tên quốc tế</Label>
                        <Input
                            value={internationalName}
                            onChange={(e) => setInternationalName(e.target.value)}
                            placeholder="Tên quốc tế (tùy chọn)..."
                        />
                    </div>

                    {/* Logo */}
                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-foreground">Logo</Label>
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-xl bg-muted border border-border flex items-center justify-center overflow-hidden">
                                <ImageIcon className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <label className="text-sm text-primary cursor-pointer hover:underline font-medium">
                                Tải ảnh lên
                                <input type="file" accept="image/*" className="hidden" />
                            </label>
                        </div>
                    </div>
                </div>
                <div className="px-6 py-4 bg-muted/20 border-t border-border/50 flex justify-end">
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Lưu thay đổi
                    </Button>
                </div>
            </div>

            {/* Membership Limit Section */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border/50">
                    <h3 className="text-base font-semibold text-foreground">Giới hạn thành viên</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Chỉnh sửa giới hạn thành viên của tổ chức</p>
                </div>
                <div className="p-6 space-y-4">
                    <label className="flex items-start gap-4 cursor-pointer group">
                        <input type="radio" name="memberLimit" value="unlimited" className="mt-1 accent-primary" />
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">Không giới hạn</span>
                                <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Pro</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Tổ chức có thể có số lượng thành viên và lời mời không giới hạn.
                            </p>
                        </div>
                    </label>
                    <label className="flex items-start gap-4 cursor-pointer group">
                        <input type="radio" name="memberLimit" value="limited" defaultChecked className="mt-1 accent-primary" />
                        <div>
                            <span className="text-sm font-medium text-foreground">Giới hạn</span>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Tổ chức bị giới hạn số lượng thành viên, bao gồm cả lời mời đang chờ.
                            </p>
                            <Input
                                type="number"
                                defaultValue={5}
                                min={1}
                                className="w-24 mt-2"
                            />
                        </div>
                    </label>
                </div>
            </div>

            {/* Metadata Section */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border/50">
                    <h3 className="text-base font-semibold text-foreground">Metadata</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Chỉnh sửa metadata của tổ chức</p>
                </div>
                <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <code className="text-xs font-mono text-muted-foreground">{`</>`}</code>
                            <div>
                                <p className="text-sm font-medium text-foreground">Public</p>
                                <p className="text-sm text-muted-foreground">(trống)</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-1.5">
                            ✏️ Chỉnh sửa
                        </Button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <code className="text-xs font-mono text-muted-foreground">{`</>`}</code>
                            <div>
                                <p className="text-sm font-medium text-foreground">Private</p>
                                <p className="text-sm text-muted-foreground">(trống)</p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="gap-1.5">
                            ✏️ Chỉnh sửa
                        </Button>
                    </div>
                </div>
            </div>

            {/* Organization Permissions */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border/50">
                    <h3 className="text-base font-semibold text-foreground">Quyền tổ chức</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Xác định quyền cho tổ chức này. Điều này sẽ ghi đè quyền mặc định.
                    </p>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-between">
                        <Switch
                            checked={allowAdminDelete}
                            onCheckedChange={setAllowAdminDelete}
                        />
                        <span className="text-sm text-foreground flex-1 ml-4">
                            Cho phép quản trị viên tổ chức xóa tổ chức này
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Organization, OrganizationCreateRequest } from "@/types/organization/organization.type";
import { Copy, Check, ImageIcon, Save, Loader2, Users, Database } from "lucide-react";

interface OrgProfileTabProps {
    organization: Organization;
    onUpdate: (data: Partial<OrganizationCreateRequest>) => Promise<void>;
}

export function OrgProfileTab({ organization, onUpdate }: OrgProfileTabProps) {
    const [copied, setCopied] = useState(false);
    const [copiedMetadata, setCopiedMetadata] = useState(false);
    const [name, setName] = useState(organization.name);
    const [internationalName, setInternationalName] = useState(organization.international_name || "");
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [memberLimitMode, setMemberLimitMode] = useState<"unlimited" | "limited">("unlimited");
    const [memberLimitValue, setMemberLimitValue] = useState("10");
    const [publicMetadata, setPublicMetadata] = useState("");
    const [privateMetadata, setPrivateMetadata] = useState("");
    const [saving, setSaving] = useState(false);
    const [allowAdminDelete, setAllowAdminDelete] = useState(true);

    useEffect(() => {
        setName(organization.name);
        setInternationalName(organization.international_name || "");

        const memberLimitKey = `org:${organization.id}:member-limit`;
        const storedLimit = localStorage.getItem(memberLimitKey);
        if (storedLimit) {
            try {
                const parsed = JSON.parse(storedLimit) as { mode?: "unlimited" | "limited"; value?: number };
                setMemberLimitMode(parsed.mode === "limited" ? "limited" : "unlimited");
                setMemberLimitValue(String(parsed.value ?? 10));
            } catch {
                setMemberLimitMode("unlimited");
                setMemberLimitValue("10");
            }
        } else {
            setMemberLimitMode("unlimited");
            setMemberLimitValue("10");
        }

        const publicMeta = {
            tax_code: organization.tax_code,
            representative_name: organization.representative_name,
            representative_title: organization.representative_title,
            representative_email: organization.representative_email,
            representative_phone: organization.representative_phone,
            headquarters_address: organization.headquarters_address,
            is_active: organization.is_active,
        };

        const privateMeta = {
            is_using_google_email: organization.is_using_google_email,
            gmail_watch_label_ids: organization.gmail_watch_label_ids,
            gmail_watch_renew_interval_hours: organization.gmail_watch_renew_interval_hours,
            auto_delete_api_key_logs: organization.auto_delete_api_key_logs,
            api_key_logs_retention_ms: organization.api_key_logs_retention_ms,
            auto_delete_org_audit_logs: organization.auto_delete_org_audit_logs,
            org_audit_logs_retention_ms: organization.org_audit_logs_retention_ms,
            min_loss_tolerance: organization.min_loss_tolerance,
            max_loss_tolerance: organization.max_loss_tolerance,
        };

        setPublicMetadata(JSON.stringify(publicMeta, null, 2));
        setPrivateMetadata(JSON.stringify(privateMeta, null, 2));
    }, [organization.id, organization.name, organization.international_name]);

    useEffect(() => {
        return () => {
            if (logoPreviewUrl) {
                URL.revokeObjectURL(logoPreviewUrl);
            }
        };
    }, [logoPreviewUrl]);

    const slug = organization.name
        ?.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-") || "";

    const normalizedName = name.trim();
    const normalizedInternationalName = internationalName.trim();
    const isUnchanged = useMemo(() => {
        const currentIntl = organization.international_name || "";
        return normalizedName === organization.name && normalizedInternationalName === currentIntl;
    }, [normalizedName, normalizedInternationalName, organization.name, organization.international_name]);

    const handleCopyId = async () => {
        await navigator.clipboard.writeText(organization.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyMetadata = async () => {
        try {
            const payload = {
                public: JSON.parse(publicMetadata || "{}"),
                private: JSON.parse(privateMetadata || "{}"),
            };
            await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
            setCopiedMetadata(true);
            setTimeout(() => setCopiedMetadata(false), 2000);
        } catch {
            await navigator.clipboard.writeText(`${publicMetadata}\n\n${privateMetadata}`);
            setCopiedMetadata(true);
            setTimeout(() => setCopiedMetadata(false), 2000);
        }
    };

    const handleLogoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (logoPreviewUrl) {
            URL.revokeObjectURL(logoPreviewUrl);
        }

        setLogoPreviewUrl(URL.createObjectURL(file));
    };

    const handleMemberLimitModeChange = (mode: "unlimited" | "limited") => {
        setMemberLimitMode(mode);
        localStorage.setItem(
            `org:${organization.id}:member-limit`,
            JSON.stringify({ mode, value: Number(memberLimitValue || "10") }),
        );
    };

    const handleMemberLimitValueChange = (value: string) => {
        const normalized = value.replace(/[^0-9]/g, "");
        setMemberLimitValue(normalized);
        localStorage.setItem(
            `org:${organization.id}:member-limit`,
            JSON.stringify({ mode: memberLimitMode, value: Number(normalized || "10") }),
        );
    };

    const handleSave = async () => {
        if (!normalizedName || isUnchanged) return;
        setSaving(true);
        try {
            await onUpdate({ name: normalizedName, international_name: normalizedInternationalName || undefined });
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
                                {logoPreviewUrl ? (
                                    <Image src={logoPreviewUrl} alt="Logo preview" width={56} height={56} className="h-full w-full object-cover" unoptimized />
                                ) : (
                                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                )}
                            </div>
                            <label className="text-sm text-primary cursor-pointer hover:underline font-medium">
                                {logoPreviewUrl ? "Đổi ảnh logo" : "Tải ảnh lên"}
                                <input type="file" accept="image/*" className="hidden" onChange={handleLogoSelect} />
                            </label>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Fallback: hiện chỉ xem trước logo cục bộ, API cập nhật logo chưa có trong organization service.
                        </p>
                    </div>
                </div>
                <div className="px-6 py-4 bg-muted/20 border-t border-border/50 flex justify-end">
                    <Button onClick={handleSave} disabled={saving || !normalizedName || isUnchanged} className="gap-2">
                        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                        Lưu thay đổi
                    </Button>
                </div>
            </div>

            {/* Membership Limit Section */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="p-6 border-b border-border/50">
                    <h3 className="text-base font-semibold text-foreground">Giới hạn thành viên</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">Fallback: lưu local theo tổ chức vì backend chưa có trường member_limit</p>
                </div>
                <div className="p-6 space-y-4">
                    <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground flex items-center gap-2">
                        <Users className="w-4 h-4 text-foreground/60" />
                        Thành viên hiện tại: <span className="font-medium text-foreground">{organization._count.members}</span>
                    </div>
                    <label className="flex items-start gap-4 cursor-pointer group">
                        <input
                            type="radio"
                            name="memberLimit"
                            value="unlimited"
                            checked={memberLimitMode === "unlimited"}
                            onChange={() => handleMemberLimitModeChange("unlimited")}
                            className="mt-1 accent-primary"
                        />
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-foreground">Không giới hạn</span>
                                <span className="text-[10px] font-semibold bg-primary/10 text-primary px-2 py-0.5 rounded-full">Fallback</span>
                            </div>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Trạng thái hiển thị không giới hạn thành viên trong UI.
                            </p>
                        </div>
                    </label>
                    <label className="flex items-start gap-4 cursor-pointer group">
                        <input
                            type="radio"
                            name="memberLimit"
                            value="limited"
                            checked={memberLimitMode === "limited"}
                            onChange={() => handleMemberLimitModeChange("limited")}
                            className="mt-1 accent-primary"
                        />
                        <div>
                            <span className="text-sm font-medium text-foreground">Giới hạn</span>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Dùng để tham chiếu nội bộ, chưa đồng bộ xuống server.
                            </p>
                            <Input
                                type="number"
                                value={memberLimitValue}
                                onChange={(e) => handleMemberLimitValueChange(e.target.value)}
                                min={1}
                                disabled={memberLimitMode !== "limited"}
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
                    <p className="text-sm text-muted-foreground mt-0.5">Hiển thị từ dữ liệu tổ chức hiện tại, cho phép chỉnh sửa local để sao chép</p>
                </div>
                <div className="p-6 space-y-4">
                    <div className="rounded-lg border border-border bg-muted/20 p-3 text-sm text-muted-foreground flex items-center gap-2">
                        <Database className="w-4 h-4 text-foreground/60" />
                        Fallback metadata: chưa có endpoint cập nhật metadata riêng, bạn có thể chỉnh local và sao chép.
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Public</Label>
                        <Textarea
                            value={publicMetadata}
                            onChange={(e) => setPublicMetadata(e.target.value)}
                            rows={8}
                            className="font-mono text-xs"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-sm font-medium">Private</Label>
                        <Textarea
                            value={privateMetadata}
                            onChange={(e) => setPrivateMetadata(e.target.value)}
                            rows={8}
                            className="font-mono text-xs"
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button variant="outline" size="sm" className="gap-2" onClick={handleCopyMetadata}>
                            {copiedMetadata ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copiedMetadata ? "Đã sao chép metadata" : "Sao chép metadata"}
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
                    <p className="text-xs text-muted-foreground mt-3">
                        Fallback: cờ này hiện chỉ áp dụng giao diện, chưa có endpoint cập nhật riêng.
                    </p>
                </div>
            </div>
        </div>
    );
}

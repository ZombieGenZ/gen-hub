"use client";

import React, { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Organization, OrganizationCreateRequest } from "@/types/organization/organization.type";
import { authStorage } from "@/services/auth/auth-storage.service";
import { OrganizationUpdateRequestService, OrgUpdateRequest } from "@/services/organization/organization-update-request.service";
import { Copy, Check, ImageIcon, Save, Loader2, Users, Database, Lock } from "lucide-react";

interface OrgProfileTabProps {
    organization: Organization;
    onUpdate: (data: Partial<OrganizationCreateRequest>) => Promise<void>;
    enableLegalApprovalFlow?: boolean;
}

const requestService = new OrganizationUpdateRequestService();

const LEGAL_QUICK_FIELDS = [
    { key: "tax_code", label: "Mã số thuế" },
    { key: "representative_name", label: "Tên người đại diện" },
    { key: "representative_title", label: "Chức danh" },
    { key: "representative_phone", label: "SĐT đại diện" },
    { key: "representative_email", label: "Email đại diện" },
] as const;

function formatDateTime(value?: string) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

export function OrgProfileTab({ organization, onUpdate, enableLegalApprovalFlow = false }: OrgProfileTabProps) {
    const [copied, setCopied] = useState(false);
    const [copiedMetadata, setCopiedMetadata] = useState(false);
    const [name, setName] = useState(organization.name);
    const [internationalName, setInternationalName] = useState(organization.international_name || "");
    const [taxCode, setTaxCode] = useState(organization.tax_code || "");
    const [representativeName, setRepresentativeName] = useState(organization.representative_name || "");
    const [representativeTitle, setRepresentativeTitle] = useState(organization.representative_title || "");
    const [representativePhone, setRepresentativePhone] = useState(organization.representative_phone || "");
    const [representativeEmail, setRepresentativeEmail] = useState(organization.representative_email || "");
    const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
    const [memberLimitMode, setMemberLimitMode] = useState<"unlimited" | "limited">("unlimited");
    const [memberLimitValue, setMemberLimitValue] = useState("10");
    const [publicMetadata, setPublicMetadata] = useState("");
    const [privateMetadata, setPrivateMetadata] = useState("");
    const [saving, setSaving] = useState(false);
    const [allowAdminDelete, setAllowAdminDelete] = useState(true);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [requestHistory, setRequestHistory] = useState<OrgUpdateRequest[]>([]);
    const [pendingRequest, setPendingRequest] = useState<OrgUpdateRequest | null>(null);

    useEffect(() => {
        setName(organization.name);
        setInternationalName(organization.international_name || "");
        setTaxCode(organization.tax_code || "");
        setRepresentativeName(organization.representative_name || "");
        setRepresentativeTitle(organization.representative_title || "");
        setRepresentativePhone(organization.representative_phone || "");
        setRepresentativeEmail(organization.representative_email || "");

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
    }, [organization]);

    useEffect(() => {
        if (!enableLegalApprovalFlow) {
            setRequestHistory([]);
            setPendingRequest(null);
            return;
        }

        let mounted = true;

        const fetchRequests = async () => {
            const token = authStorage.getAccessToken();
            if (!token) return;
            setHistoryLoading(true);
            try {
                const data = await requestService.getAll(token, { limit: 200, offset: 0 });
                if (!mounted) return;
                const items = (data.items || []).filter((item) => item.organization_id === organization.id);
                setRequestHistory(items);
                const latestPending = items.find((item) => item.status === "PENDING") || null;
                setPendingRequest(latestPending);
            } catch {
                if (!mounted) return;
                setRequestHistory([]);
                setPendingRequest(null);
            } finally {
                if (mounted) {
                    setHistoryLoading(false);
                }
            }
        };

        fetchRequests();
        const timer = window.setInterval(fetchRequests, 15000);

        return () => {
            mounted = false;
            window.clearInterval(timer);
        };
    }, [organization.id, enableLegalApprovalFlow]);

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
    const normalizedTaxCode = taxCode.trim();
    const normalizedRepresentativeName = representativeName.trim();
    const normalizedRepresentativeTitle = representativeTitle.trim();
    const normalizedRepresentativePhone = representativePhone.trim();
    const normalizedRepresentativeEmail = representativeEmail.trim();

    const legalChanged = useMemo(() => {
        return (
            normalizedTaxCode !== (organization.tax_code || "") ||
            normalizedRepresentativeName !== (organization.representative_name || "") ||
            normalizedRepresentativeTitle !== (organization.representative_title || "") ||
            normalizedRepresentativePhone !== (organization.representative_phone || "") ||
            normalizedRepresentativeEmail !== (organization.representative_email || "")
        );
    }, [
        normalizedTaxCode,
        normalizedRepresentativeName,
        normalizedRepresentativeTitle,
        normalizedRepresentativePhone,
        normalizedRepresentativeEmail,
        organization,
    ]);

    const isUnchanged = useMemo(() => {
        if (!enableLegalApprovalFlow) return true;
        return !legalChanged;
    }, [legalChanged, enableLegalApprovalFlow]);

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

    const handleSubmit = async () => {
        if (isUnchanged || (enableLegalApprovalFlow && !!pendingRequest)) return;
        setSaving(true);
        try {
            const payload: Partial<OrganizationCreateRequest> = {};

            if (enableLegalApprovalFlow) {
                payload.tax_code = normalizedTaxCode || undefined;
                payload.representative_name = normalizedRepresentativeName || undefined;
                payload.representative_title = normalizedRepresentativeTitle || undefined;
                payload.representative_phone = normalizedRepresentativePhone || undefined;
                payload.representative_email = normalizedRepresentativeEmail || undefined;
            }

            await onUpdate(payload);
            if (enableLegalApprovalFlow) {
                setConfirmDialogOpen(false);
            }
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (isUnchanged || (enableLegalApprovalFlow && !!pendingRequest)) return;
        if (enableLegalApprovalFlow && legalChanged) {
            setConfirmDialogOpen(true);
            return;
        }
        await handleSubmit();
    };

    const changedFieldsOfRequest = (request: OrgUpdateRequest) => {
        const org = request.organization;
        if (!org) return [];
        const changed: string[] = [];
        LEGAL_QUICK_FIELDS.forEach((field) => {
            const key = field.key;
            const oldValue = (org as any)[key] || "";
            const newValue = (request as any)[key] || "";
            if (oldValue !== newValue) {
                changed.push(field.label);
            }
        });
        return changed;
    };

    const hasPendingLock = enableLegalApprovalFlow && !!pendingRequest;
    const submitLabel = enableLegalApprovalFlow && legalChanged ? "Gửi yêu cầu phê duyệt" : "Lưu thay đổi";

    return (
        <div className="space-y-6">
            {hasPendingLock && (
                <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                    <span className="font-semibold">⏳ Hệ thống đang xử lý yêu cầu cập nhật thông tin pháp lý của bạn</span>
                    <span> gửi ngày {formatDateTime(pendingRequest?.created_at)}.</span>
                </div>
            )}

            <Tabs defaultValue="profile" className="w-full">
                <TabsList className="bg-muted/40">
                    <TabsTrigger value="profile">Hồ sơ cài đặt</TabsTrigger>
                    <TabsTrigger value="requests">Lịch sử yêu cầu</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6 mt-4">
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
                                    readOnly
                                    className="bg-muted/30 cursor-default"
                                />
                            </div>

                            {/* International Name */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-foreground">Tên quốc tế</Label>
                                <Input
                                    value={internationalName}
                                    readOnly
                                    className="bg-muted/30 cursor-default"
                                />
                            </div>

                            {/* Legal Section */}
                            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-4">
                                <div className="flex items-start gap-2">
                                    <Lock className="w-4 h-4 text-amber-600 mt-0.5" />
                                    <div>
                                        <p className="text-sm font-semibold text-amber-900">Khối thông tin pháp lý</p>
                                        <p className="text-xs text-amber-700">
                                            Thay đổi trong khối này cần Ban quản lý đối soát trước khi áp dụng.
                                        </p>
                                    </div>
                                </div>

                                <div className={hasPendingLock ? "opacity-60 pointer-events-none" : ""}>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-foreground">Mã số thuế</Label>
                                        <Input
                                            value={taxCode}
                                            onChange={(e) => setTaxCode(e.target.value)}
                                            placeholder="Nhập mã số thuế"
                                            disabled={hasPendingLock}
                                        />
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-foreground">Người đại diện</Label>
                                            <Input
                                                value={representativeName}
                                                onChange={(e) => setRepresentativeName(e.target.value)}
                                                placeholder="Nhập tên người đại diện"
                                                disabled={hasPendingLock}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-foreground">Chức danh đại diện</Label>
                                            <Input
                                                value={representativeTitle}
                                                onChange={(e) => setRepresentativeTitle(e.target.value)}
                                                placeholder="Nhập chức danh"
                                                disabled={hasPendingLock}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-foreground">Số điện thoại đại diện</Label>
                                            <Input
                                                value={representativePhone}
                                                onChange={(e) => setRepresentativePhone(e.target.value)}
                                                placeholder="Nhập số điện thoại"
                                                disabled={hasPendingLock}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-foreground">Email đại diện</Label>
                                            <Input
                                                value={representativeEmail}
                                                onChange={(e) => setRepresentativeEmail(e.target.value)}
                                                placeholder="Nhập email"
                                                disabled={hasPendingLock}
                                            />
                                        </div>
                                    </div>
                                </div>
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
                                    Tính năng upload logo đang được phát triển.
                                </p>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-muted/20 border-t border-border/50 flex justify-end">
                            <Button onClick={handleSave} disabled={saving || isUnchanged || hasPendingLock} className="gap-2">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {submitLabel}
                            </Button>
                        </div>
                    </div>

                    {/* Membership Limit Section */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border/50">
                            <h3 className="text-base font-semibold text-foreground">Giới hạn thành viên</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">Tính năng đang được phát triển. Cài đặt được lưu cục bộ trên trình duyệt.</p>
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
                                        <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border">Đang phát triển</span>
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
                                Chỉnh sửa bên dưới chỉ áp dụng cục bộ. Sao chép để sử dụng ở nơi khác.
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
                                Tính năng đang được phát triển. Cài đặt này chưa được lưu lên server.
                            </p>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="requests" className="mt-4">
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-border/50">
                            <h3 className="text-base font-semibold text-foreground">Lịch sử yêu cầu cập nhật pháp lý</h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Theo dõi toàn bộ yêu cầu đã gửi, trạng thái xử lý và lý do từ chối nếu có.
                            </p>
                        </div>
                        <div className="p-6">
                            {historyLoading ? (
                                <div className="py-10 flex items-center justify-center text-muted-foreground">
                                    <Loader2 className="w-5 h-5 animate-spin mr-2" /> Đang tải lịch sử...
                                </div>
                            ) : requestHistory.length === 0 ? (
                                <div className="py-10 text-center text-muted-foreground text-sm">
                                    Chưa có yêu cầu cập nhật nào.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border">
                                                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Ngày gửi</th>
                                                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Trạng thái</th>
                                                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Trường thay đổi</th>
                                                <th className="text-left py-2 px-2 font-medium text-muted-foreground">Lý do từ chối</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {requestHistory.map((item) => {
                                                const changedFields = changedFieldsOfRequest(item);
                                                const rowClass = item.status === "REJECTED" ? "bg-red-50/50" : "";
                                                return (
                                                    <tr key={item.id} className={`border-b border-border/50 ${rowClass}`}>
                                                        <td className="py-3 px-2">{formatDateTime(item.created_at)}</td>
                                                        <td className="py-3 px-2">
                                                            {item.status === "PENDING" && (
                                                                <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">PENDING</Badge>
                                                            )}
                                                            {item.status === "APPROVED" && (
                                                                <Badge className="bg-green-100 text-green-800 border-green-200">APPROVED</Badge>
                                                            )}
                                                            {item.status === "REJECTED" && (
                                                                <Badge className="bg-red-100 text-red-700 border-red-200">REJECTED</Badge>
                                                            )}
                                                        </td>
                                                        <td className="py-3 px-2">
                                                            <div className="flex flex-wrap gap-1.5">
                                                                {changedFields.length === 0 ? (
                                                                    <span className="text-muted-foreground">-</span>
                                                                ) : (
                                                                    changedFields.map((field) => (
                                                                        <span key={`${item.id}-${field}`} className="inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
                                                                            {field}
                                                                        </span>
                                                                    ))
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-2 text-red-700 font-medium">
                                                            {item.status === "REJECTED" ? item.reject_reason || "Không có" : "-"}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Gửi yêu cầu phê duyệt cập nhật pháp lý?</DialogTitle>
                        <DialogDescription>
                            Việc thay đổi thông tin pháp lý cần được Ban quản lý đối soát. Trong thời gian chờ duyệt (1-2 ngày), thông tin cũ vẫn sẽ được sử dụng cho các giao dịch. Bạn có muốn gửi yêu cầu?
                        </DialogDescription>
                    </DialogHeader>
                    <DialogBody className="text-sm text-muted-foreground">
                        Sau khi gửi, khối thông tin pháp lý sẽ tạm khóa cho đến khi có kết quả duyệt.
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmDialogOpen(false)} disabled={saving}>
                            Hủy
                        </Button>
                        <Button onClick={handleSubmit} disabled={saving} className="gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Xác nhận gửi yêu cầu
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

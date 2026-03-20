"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import {
    OrganizationUpdateRequestService,
    OrgUpdateRequest,
} from "@/services/organization/organization-update-request.service";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, ChevronRight } from "lucide-react";

const requestService = new OrganizationUpdateRequestService();

type LegalFieldKey = "tax_code" | "representative_name" | "representative_title" | "representative_phone" | "representative_email";

const DIFF_FIELDS: Array<{ key: LegalFieldKey; label: string }> = [
    { key: "tax_code", label: "Mã số thuế" },
    { key: "representative_name", label: "Tên người đại diện" },
    { key: "representative_title", label: "Chức danh" },
    { key: "representative_phone", label: "SĐT đại diện" },
    { key: "representative_email", label: "Email đại diện" },
];

const QUICK_REJECT_REASONS = [
    "Mã số thuế sai định dạng",
    "Mã số thuế không khớp với tên công ty trên cổng thông tin quốc gia",
    "Thiếu giấy phép kinh doanh đính kèm",
    "Thông tin người đại diện chưa hợp lệ",
];

function formatDate(value?: string) {
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

export default function OrganizationUpdateRequestDiffPage() {
    const params = useParams();
    const router = useRouter();
    const requestId = params.id as string;

    const [request, setRequest] = useState<OrgUpdateRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rejectOpen, setRejectOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");

    const fetchData = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) {
            router.push("/login");
            return;
        }
        setLoading(true);
        try {
            const data = await requestService.getById(token, requestId);
            setRequest(data);
            setError(null);
        } catch (err: unknown) {
            setRequest(null);
            const message = err instanceof Error ? err.message : "Không tải được chi tiết yêu cầu";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, [requestId, router]);

    useEffect(() => {
        fetchData();
        const timer = window.setInterval(fetchData, 15000);
        return () => window.clearInterval(timer);
    }, [fetchData]);

    const diffs = useMemo(() => {
        if (!request?.organization) return [];
        return DIFF_FIELDS.map((field) => {
            const oldValue = String(request.organization?.[field.key] || "").trim();
            const newValue = String(request[field.key] || "").trim();
            return {
                key: field.key,
                label: field.label,
                oldValue,
                newValue,
                changed: oldValue !== newValue,
            };
        });
    }, [request]);

    const handleApprove = async () => {
        if (!request) return;
        const token = authStorage.getAccessToken();
        if (!token) {
            router.push("/login");
            return;
        }

        setSaving(true);
        try {
            await requestService.approve(token, request.id);
            await fetchData();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Duyệt yêu cầu thất bại";
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    const handleReject = async () => {
        if (!request || !rejectReason.trim()) return;
        const token = authStorage.getAccessToken();
        if (!token) {
            router.push("/login");
            return;
        }

        setSaving(true);
        try {
            await requestService.reject(token, request.id, rejectReason.trim());
            setRejectOpen(false);
            setRejectReason("");
            await fetchData();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Từ chối yêu cầu thất bại";
            setError(message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="flex-1 p-8">
                <p className="text-destructive mb-4">{error || "Không tìm thấy yêu cầu"}</p>
                <Link href="/dashboard/admin/organization/update-requests" className="text-primary hover:underline">
                    ← Quay lại hàng đợi
                </Link>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-slate-50/50">
            <main className="p-4 md:p-8 space-y-6">
                <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Link href="/dashboard/admin/organization" className="hover:text-foreground transition-colors">
                        Tổ chức
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <Link href="/dashboard/admin/organization/update-requests" className="hover:text-foreground transition-colors">
                        Yêu cầu cập nhật
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-foreground font-medium">Đối chiếu</span>
                </nav>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Đối chiếu cập nhật pháp lý</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Tổ chức: <span className="font-medium text-foreground">{request.organization?.name || "-"}</span>
                            <span className="mx-2">•</span>
                            Người gửi: {request.requester?.full_name || request.requester?.email || request.requester_id}
                            <span className="mx-2">•</span>
                            Ngày gửi: {formatDate(request.created_at)}
                        </p>
                    </div>
                    <div>
                        {request.status === "PENDING" && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">PENDING</Badge>
                        )}
                        {request.status === "APPROVED" && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">APPROVED</Badge>
                        )}
                        {request.status === "REJECTED" && (
                            <Badge className="bg-red-100 text-red-700 border-red-200">REJECTED</Badge>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-border/50">
                            <h2 className="font-semibold text-foreground">Dữ liệu HIỆN TẠI</h2>
                            <p className="text-xs text-muted-foreground mt-1">Đang lưu trong bảng Organization</p>
                        </div>
                        <div className="p-5 space-y-3">
                            {diffs.map((row) => (
                                <div key={`old-${String(row.key)}`} className={row.changed ? "" : "opacity-50"}>
                                    <p className="text-xs text-muted-foreground">{row.label}</p>
                                    <p className="text-sm text-foreground mt-1 break-all">{row.oldValue || "-"}</p>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="px-5 py-4 border-b border-border/50">
                            <h2 className="font-semibold text-foreground">Dữ liệu YÊU CẦU MỚI</h2>
                            <p className="text-xs text-muted-foreground mt-1">Lấy từ bảng OrganizationUpdateRequest</p>
                        </div>
                        <div className="p-5 space-y-3">
                            {diffs.map((row) => (
                                <div
                                    key={`new-${String(row.key)}`}
                                    className={row.changed ? "rounded-lg bg-green-50 border border-green-200 p-2" : "opacity-50"}
                                >
                                    <p className="text-xs text-muted-foreground">{row.label}</p>
                                    <p className={`text-sm mt-1 break-all ${row.changed ? "font-semibold text-green-900" : "text-foreground"}`}>
                                        {row.newValue || "-"}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </section>
                </div>

                {request.status === "REJECTED" && (
                    <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                        <span className="font-semibold">Lý do từ chối:</span> {request.reject_reason || "Không có"}
                    </div>
                )}

                <div className="bg-card rounded-2xl border border-border shadow-sm p-4 flex flex-wrap items-center justify-end gap-2">
                    <Button variant="outline" onClick={() => router.push("/dashboard/admin/organization/update-requests")}>Quay lại hàng đợi</Button>
                    {request.status === "PENDING" && (
                        <>
                            <Button variant="outline" onClick={() => setRejectOpen(true)} disabled={saving}>
                                Từ chối (Reject)
                            </Button>
                            <Button onClick={handleApprove} disabled={saving} className="gap-2">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                Phê duyệt (Approve)
                            </Button>
                        </>
                    )}
                </div>
            </main>

            <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Từ chối yêu cầu cập nhật</DialogTitle>
                        <DialogDescription>
                            Vui lòng nhập lý do từ chối. Lý do này sẽ hiển thị trực tiếp cho khách hàng.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogBody className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                            {QUICK_REJECT_REASONS.map((quick) => (
                                <button
                                    key={quick}
                                    type="button"
                                    onClick={() => setRejectReason(quick)}
                                    className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs hover:bg-muted"
                                >
                                    {quick}
                                </button>
                            ))}
                        </div>
                        <Textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={4}
                            placeholder="Nhập lý do từ chối..."
                        />
                    </DialogBody>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectOpen(false)} disabled={saving}>
                            Hủy
                        </Button>
                        <Button onClick={handleReject} disabled={saving || !rejectReason.trim()} className="gap-2">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                            Xác nhận từ chối
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import {
    OrganizationUpdateRequestService,
    OrgUpdateRequest,
} from "@/services/organization/organization-update-request.service";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, ChevronRight } from "lucide-react";

const requestService = new OrganizationUpdateRequestService();

type LegalFieldKey = "tax_code" | "representative_name" | "representative_title" | "representative_phone" | "representative_email";

const FIELD_LABELS: Array<{ key: LegalFieldKey; label: string }> = [
    { key: "tax_code", label: "Mã số thuế" },
    { key: "representative_name", label: "Tên đại diện" },
    { key: "representative_title", label: "Chức danh" },
    { key: "representative_phone", label: "SĐT đại diện" },
    { key: "representative_email", label: "Email đại diện" },
];

function formatDate(value: string) {
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

function getChangedFields(item: OrgUpdateRequest): string[] {
    if (!item.organization) return [];
    const changed: string[] = [];
    FIELD_LABELS.forEach((field) => {
        const oldValue = String(item.organization?.[field.key] || "").trim();
        const newValue = String(item[field.key] || "").trim();
        if (oldValue !== newValue) {
            changed.push(field.label);
        }
    });
    return changed;
}

export default function OrganizationUpdateRequestQueuePage() {
    const router = useRouter();
    const [items, setItems] = useState<OrgUpdateRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [keyword, setKeyword] = useState("");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const fetchPending = async () => {
            setLoading(true);
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }
            try {
                const data = await requestService.getAll(token, {
                    status: "PENDING",
                    limit: 100,
                    offset: 0,
                });
                if (!mounted) return;
                setItems(data.items || []);
                setError(null);
            } catch (err: unknown) {
                if (!mounted) return;
                setItems([]);
                const message = err instanceof Error ? err.message : "Không thể tải danh sách yêu cầu";
                setError(message);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchPending();
        const timer = window.setInterval(fetchPending, 15000);
        return () => {
            mounted = false;
            window.clearInterval(timer);
        };
    }, [router]);

    const filteredItems = useMemo(() => {
        const q = keyword.trim().toLowerCase();
        if (!q) return items;
        return items.filter((item) => {
            const orgName = (item.organization?.name || "").toLowerCase();
            const requester = (item.requester?.full_name || item.requester?.email || item.requester_id || "").toLowerCase();
            const taxCode = (item.tax_code || "").toLowerCase();
            return orgName.includes(q) || requester.includes(q) || taxCode.includes(q);
        });
    }, [items, keyword]);

    return (
        <div className="flex-1 bg-slate-50/50">
            <main className="p-4 md:p-8 space-y-6">
                <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Link href="/dashboard/admin/organization" className="hover:text-foreground transition-colors">
                        Tổ chức
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5" />
                    <span className="text-foreground font-medium">Hàng đợi cập nhật pháp lý</span>
                </nav>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Yêu cầu cập nhật pháp lý</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Hàng đợi các yêu cầu đang chờ đối soát và phê duyệt.
                        </p>
                    </div>
                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 w-fit">
                        {filteredItems.length} yêu cầu PENDING
                    </Badge>
                </div>

                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border/50">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                placeholder="Tìm theo tổ chức / requester / mã số thuế"
                                className="pl-10"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/30 border-b border-border/30">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Tên tổ chức</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Người yêu cầu</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Ngày gửi</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Các trường thay đổi</th>
                                    <th className="px-4 py-3 font-medium text-muted-foreground">Hành động</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/30">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                            <div className="inline-flex items-center gap-2">
                                                <Loader2 className="w-5 h-5 animate-spin" /> Đang tải dữ liệu...
                                            </div>
                                        </td>
                                    </tr>
                                ) : error ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-destructive">
                                            {error}
                                        </td>
                                    </tr>
                                ) : filteredItems.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                                            Không có yêu cầu nào đang chờ xử lý.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItems.map((item) => {
                                        const changedFields = getChangedFields(item);
                                        return (
                                            <tr key={item.id} className="hover:bg-muted/20">
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {item.organization?.name || "-"}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {item.requester?.full_name || item.requester?.email || item.requester_id}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {formatDate(item.created_at)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-wrap gap-1.5">
                                                        {changedFields.length === 0 ? (
                                                            <span className="text-muted-foreground">-</span>
                                                        ) : (
                                                            changedFields.map((field) => (
                                                                <span
                                                                    key={`${item.id}-${field}`}
                                                                    className="inline-flex rounded-full bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 text-xs"
                                                                >
                                                                    {field}
                                                                </span>
                                                            ))
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => router.push(`/dashboard/admin/organization/update-requests/${item.id}`)}
                                                    >
                                                        Đối chiếu
                                                    </Button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

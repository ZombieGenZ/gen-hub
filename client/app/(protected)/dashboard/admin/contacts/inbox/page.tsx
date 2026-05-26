"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowLeftIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ExclamationTriangleIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    ShieldExclamationIcon,
    TrashIcon,
    UserGroupIcon,
    UserIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ChannelIcon } from "@/components/contacts/ChannelIcon";
import { TicketPriorityIcon } from "@/components/contacts/TicketPriorityIcon";
import { TicketStatusBadge } from "@/components/contacts/TicketStatusBadge";
import { useDeleteContact, useDeleteManyContacts } from "@/hooks/contacts/use-contact-mutations";
import { useContactSocket } from "@/hooks/contacts/use-contact-socket";
import { useContacts } from "@/hooks/contacts/use-contacts";
import { authStorage } from "@/services/auth/auth-storage.service";
import { Contact, ContactQueryParams } from "@/types/contact/contact.type";

type QuickFilter = "all" | "mine" | "unassigned" | "high-priority" | "spam";
type StatusFilter = "all" | "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";

const ITEMS_PER_PAGE = 15;

function getRelativeTime(dateStr: string): string {
    const now = new Date();
    const d = new Date(dateStr);
    const diff = now.getTime() - d.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;

    const days = Math.floor(hours / 24);
    return `${days} ngày trước`;
}

function getQuickFilterParams(quickFilter: QuickFilter): Partial<ContactQueryParams> {
    switch (quickFilter) {
        case "high-priority":
            return { is_priority_customer: true, is_skipped: false };
        case "spam":
            return { is_skipped: true };
        default:
            return {};
    }
}

function getStatusDotClass(status: string): string {
    switch (status) {
        case "OPEN":
            return "bg-emerald-500";
        case "PENDING":
            return "bg-amber-500";
        case "RESOLVED":
            return "bg-blue-500";
        default:
            return "bg-slate-300";
    }
}

function TicketCellButton({
    onClick,
    className,
    children,
}: {
    onClick: () => void;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <button onClick={onClick} className={className}>
            {children}
        </button>
    );
}

export default function ContactsInboxPage() {
    const router = useRouter();
    const currentUserId = authStorage.getUserID();
    const [searchTerm, setSearchTerm] = useState("");
    const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    useContactSocket();

    const offset = (currentPage - 1) * ITEMS_PER_PAGE;
    const queryParams: ContactQueryParams = {
        limit: ITEMS_PER_PAGE,
        offset,
        keywords: searchTerm.trim() || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        ...getQuickFilterParams(quickFilter),
    };

    const { data, isLoading } = useContacts(queryParams);
    const contacts = useMemo(() => data?.items ?? [], [data?.items]);
    const totalItems = data?.total ?? contacts.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));

    const deleteMutation = useDeleteContact();
    const deleteManyMutation = useDeleteManyContacts();

    const visibleContacts = useMemo(() => {
        return contacts.filter((ticket) => {
            if (quickFilter === "mine") {
                return !!currentUserId && ticket.assigned_staff_list?.some((staff) => staff.id === currentUserId);
            }

            if (quickFilter === "unassigned") {
                return !ticket.assigned_staff_list?.length;
            }

            return true;
        });
    }, [contacts, currentUserId, quickFilter]);

    const allVisibleSelected = visibleContacts.length > 0 && visibleContacts.every((ticket) => selectedIds.includes(ticket.id));

    const quickFilterButtons: { key: QuickFilter; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
        { key: "all", label: "Tất cả", icon: FunnelIcon },
        { key: "mine", label: "Của tôi", icon: UserIcon },
        { key: "unassigned", label: "Chưa gán", icon: UserGroupIcon },
        { key: "high-priority", label: "Ưu tiên cao", icon: ExclamationTriangleIcon },
        { key: "spam", label: "Spam", icon: ShieldExclamationIcon },
    ];

    const toggleSelectAll = (checked: boolean) => {
        if (!checked) {
            setSelectedIds([]);
            return;
        }

        setSelectedIds(visibleContacts.map((ticket) => ticket.id));
    };

    const toggleSelection = (ticketId: string, checked: boolean) => {
        setSelectedIds((prev) => {
            if (checked) {
                return prev.includes(ticketId) ? prev : [...prev, ticketId];
            }

            return prev.filter((id) => id !== ticketId);
        });
    };

    const handleDeleteOne = async (ticket: Contact) => {
        if (!window.confirm(`Xóa ticket #${ticket.code}? Thao tác này không thể hoàn tác.`)) {
            return;
        }

        await deleteMutation.mutateAsync(ticket.id);
        setSelectedIds((prev) => prev.filter((id) => id !== ticket.id));
    };

    const handleDeleteSelected = async () => {
        if (!selectedIds.length) {
            return;
        }

        if (!window.confirm(`Xóa ${selectedIds.length} ticket đã chọn? Thao tác này không thể hoàn tác.`)) {
            return;
        }

        await deleteManyMutation.mutateAsync(selectedIds);
        setSelectedIds([]);
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
                </div>
                <div className="h-16 animate-pulse rounded-3xl bg-slate-100" />
                {[1, 2, 3, 4, 5, 6].map((item) => (
                    <div key={item} className="h-16 animate-pulse rounded-2xl bg-slate-50" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/admin/contacts"
                        className="rounded-xl p-2 transition-colors hover:bg-slate-100"
                    >
                        <ArrowLeftIcon className="h-5 w-5 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="text-[32px] font-bold leading-[130%] text-slate-900">Inbox</h1>
                        <p className="text-sm text-slate-500">{totalItems} ticket</p>
                    </div>
                </div>

                {selectedIds.length > 0 && (
                    <div className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-2">
                        <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                            {selectedIds.length} đã chọn
                        </Badge>
                        <button
                            onClick={handleDeleteSelected}
                            disabled={deleteManyMutation.isPending}
                            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <TrashIcon className="h-4 w-4" />
                            {deleteManyMutation.isPending ? "Đang xóa..." : "Xóa đã chọn"}
                        </button>
                    </div>
                )}
            </div>

            <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                <CardContent className="p-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="relative min-w-[280px] max-w-[400px] flex-1 md:w-[360px] md:flex-none">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                                <Input
                                    placeholder="Tìm theo email, tên, mã ticket..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(event) => {
                                        setSearchTerm(event.target.value);
                                        setCurrentPage(1);
                                    }}
                                    style={{ borderRadius: "12px" }}
                                />
                            </div>

                            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

                            <div className="flex flex-wrap items-center gap-2">
                                {quickFilterButtons.map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        onClick={() => {
                                            setQuickFilter(key);
                                            setCurrentPage(1);
                                        }}
                                        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                                            quickFilter === key
                                                ? "bg-primary text-white shadow-sm shadow-primary/20"
                                                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                        }`}
                                    >
                                        <Icon className="h-3.5 w-3.5" />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="hidden h-8 w-px bg-slate-200 sm:block" />

                            <Select value={statusFilter} onValueChange={(value: StatusFilter) => {
                                setStatusFilter(value);
                                setCurrentPage(1);
                            }}>
                                <SelectTrigger className="w-fit gap-2 rounded-xl">
                                    <SelectValue placeholder="Trạng thái" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                    <SelectItem value="OPEN">Mở</SelectItem>
                                    <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                                    <SelectItem value="RESOLVED">Đã xử lý</SelectItem>
                                    <SelectItem value="CLOSED">Đóng</SelectItem>
                                </SelectContent>
                            </Select>

                            {(searchTerm || quickFilter !== "all" || statusFilter !== "all") && (
                                <button
                                    onClick={() => {
                                        setSearchTerm("");
                                        setQuickFilter("all");
                                        setStatusFilter("all");
                                        setCurrentPage(1);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 transition-colors hover:text-red-500"
                                >
                                    <XMarkIcon className="h-3.5 w-3.5" />
                                    Xóa lọc
                                </button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="overflow-hidden rounded-[24px] bg-white shadow-premium">
                <div className="overflow-x-auto">
                    <div className="grid min-w-[820px] grid-cols-[44px_28px_72px_72px_1fr_88px_100px_96px_48px] gap-3 border-b border-slate-100 bg-slate-50 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <div className="flex items-center justify-center">
                            <Checkbox
                                checked={allVisibleSelected}
                                onCheckedChange={(checked) => toggleSelectAll(checked === true)}
                                aria-label="Chọn tất cả ticket đang hiển thị"
                            />
                        </div>
                        <span>TT</span>
                        <span>Ưu tiên</span>
                        <span>Kênh</span>
                        <span>Tiêu đề / Khách hàng</span>
                        <span>Tags</span>
                        <span>Thời gian</span>
                        <span>Trạng thái</span>
                        <span />
                    </div>

                    <div className="divide-y divide-slate-50">
                        {visibleContacts.length === 0 ? (
                            <div className="p-12 text-center text-slate-600">
                                <FunnelIcon className="mx-auto mb-3 h-10 w-10 text-slate-400" />
                                <p className="text-sm font-medium">Không tìm thấy ticket nào</p>
                                <p className="mt-1 text-xs">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                            </div>
                        ) : (
                            visibleContacts.map((ticket) => {
                                const isSelected = selectedIds.includes(ticket.id);
                                const openTicketDetail = () => router.push(`/dashboard/admin/contacts/inbox/${ticket.id}`);

                                return (
                                    <div
                                        key={ticket.id}
                                        className="grid min-w-[820px] grid-cols-[44px_28px_72px_72px_1fr_88px_100px_96px_48px] gap-3 px-6 py-4 transition-all hover:bg-slate-50/80"
                                    >
                                        <div className="flex items-center justify-center">
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={(checked) => toggleSelection(ticket.id, checked === true)}
                                                aria-label={`Chọn ticket ${ticket.code}`}
                                            />
                                        </div>

                                        <TicketCellButton onClick={openTicketDetail} className="flex items-center">
                                            <div
                                                className={`h-2.5 w-2.5 rounded-full ${getStatusDotClass(ticket.status)}`}
                                            />
                                        </TicketCellButton>

                                        <TicketCellButton onClick={openTicketDetail} className="flex items-center">
                                            <TicketPriorityIcon priority={ticket.priority} showLabel />
                                        </TicketCellButton>

                                        <TicketCellButton onClick={openTicketDetail} className="flex items-center">
                                            <ChannelIcon channel={ticket.channel} showLabel />
                                        </TicketCellButton>

                                        <TicketCellButton onClick={openTicketDetail} className="min-w-0 text-left">
                                            <p className="truncate text-sm font-semibold text-slate-900 transition-colors hover:text-primary">
                                                {ticket.subject}
                                            </p>
                                            <p className="mt-0.5 truncate text-xs text-slate-500">
                                                {ticket.customer_name} • {ticket.customer_email}
                                            </p>
                                        </TicketCellButton>

                                        <TicketCellButton onClick={openTicketDetail} className="flex flex-wrap gap-1 text-left">
                                            {ticket.tags?.slice(0, 2).map((tag) => (
                                                <span
                                                    key={tag.id}
                                                    className="inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white"
                                                    style={{ backgroundColor: tag.color || "#94a3b8" }}
                                                >
                                                    {tag.name}
                                                </span>
                                            ))}
                                            {!!ticket.tags?.length && ticket.tags.length > 2 && (
                                                <span className="text-[10px] text-slate-600">+{ticket.tags.length - 2}</span>
                                            )}
                                        </TicketCellButton>

                                        <TicketCellButton onClick={openTicketDetail} className="text-left text-xs text-slate-600">
                                            {getRelativeTime(ticket.last_activity_at || ticket.created_at)}
                                        </TicketCellButton>

                                        <TicketCellButton onClick={openTicketDetail} className="flex items-center">
                                            <TicketStatusBadge status={ticket.status} isSkipped={ticket.is_skipped} />
                                        </TicketCellButton>

                                        <div className="flex items-center justify-end">
                                            <button
                                                onClick={() => handleDeleteOne(ticket)}
                                                disabled={deleteMutation.isPending}
                                                className="rounded-xl p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                                aria-label={`Xóa ticket ${ticket.code}`}
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {totalItems > ITEMS_PER_PAGE && (
                    <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
                        <span className="text-sm text-slate-500">
                            Hiển thị {offset + 1}-{Math.min(offset + visibleContacts.length, totalItems)} / {totalItems}
                        </span>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                                disabled={currentPage === 1}
                                aria-label="Trang trước"
                                title="Trang trước"
                                className="rounded-xl p-2 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ChevronLeftIcon className="h-4 w-4" />
                            </button>

                            {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => {
                                const page = index + 1;
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`h-8 w-8 rounded-xl text-sm font-medium transition-colors ${
                                            currentPage === page
                                                ? "bg-primary text-white"
                                                : "text-slate-500 hover:bg-slate-100"
                                        }`}
                                    >
                                        {page}
                                    </button>
                                );
                            })}

                            <button
                                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                                disabled={currentPage === totalPages}
                                aria-label="Trang sau"
                                title="Trang sau"
                                className="rounded-xl p-2 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <ChevronRightIcon className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useContacts } from "@/hooks/contacts/use-contacts";
import { Contact, ContactTag } from "@/types/contact/contact.type";
import { TicketStatusBadge } from "@/components/contacts/TicketStatusBadge";
import { TicketPriorityIcon } from "@/components/contacts/TicketPriorityIcon";
import { ChannelIcon } from "@/components/contacts/ChannelIcon";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    ArrowLeftIcon,
    UserIcon,
    UserGroupIcon,
    ExclamationTriangleIcon,
    ShieldExclamationIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";



type QuickFilter = "all" | "mine" | "unassigned" | "high-priority" | "spam";
type StatusFilter = "all" | "OPEN" | "PENDING" | "RESOLVED" | "CLOSED";

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

export default function ContactsInboxPage() {
    const router = useRouter();
    const { data: contacts = [], isLoading: loading } = useContacts();
    const [searchTerm, setSearchTerm] = useState("");
    const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 15;

    // Filtered contacts
    const filteredContacts = useMemo(() => {
        return contacts.filter(c => {
            // Search
            const searchLower = searchTerm.toLowerCase();
            const matchSearch = !searchTerm ||
                c.customer_name?.toLowerCase().includes(searchLower) ||
                c.customer_email?.toLowerCase().includes(searchLower) ||
                c.code?.toLowerCase().includes(searchLower) ||
                c.subject?.toLowerCase().includes(searchLower);

            // Status filter
            const matchStatus = statusFilter === "all" || c.status === statusFilter;

            // Quick filter
            let matchQuick = true;
            if (quickFilter === "unassigned") {
                matchQuick = !c.assigned_staff_list || c.assigned_staff_list.length === 0;
            } else if (quickFilter === "high-priority") {
                matchQuick = c.priority === "URGENT" || c.priority === "HIGH";
            } else if (quickFilter === "spam") {
                matchQuick = !!(c as any).is_skipped;
            }

            return matchSearch && matchStatus && matchQuick;
        });
    }, [contacts, searchTerm, statusFilter, quickFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredContacts.length / itemsPerPage);
    const paginatedContacts = filteredContacts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter, quickFilter]);

    const quickFilterButtons: { key: QuickFilter; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement>> }[] = [
        { key: "all", label: "Tất cả", icon: FunnelIcon },
        { key: "mine", label: "Của tôi", icon: UserIcon },
        { key: "unassigned", label: "Chưa gán", icon: UserGroupIcon },
        { key: "high-priority", label: "Ưu tiên cao", icon: ExclamationTriangleIcon },
        { key: "spam", label: "Spam", icon: ShieldExclamationIcon },
    ];

    // Skeleton loading
    if (loading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <div className="h-8 w-48 bg-slate-200 animate-pulse" style={{ borderRadius: "8px" }} />
                </div>
                <div className="h-16 bg-slate-100 animate-pulse" style={{ borderRadius: "24px" }} />
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="h-16 bg-slate-50 animate-pulse" style={{ borderRadius: "16px" }} />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Link
                        href="/dashboard/admin/contacts"
                        className="p-2 hover:bg-slate-100 transition-colors"
                        style={{ borderRadius: "12px" }}
                    >
                        <ArrowLeftIcon className="w-5 h-5 text-slate-500" />
                    </Link>
                    <div>
                        <h1 className="font-bold text-slate-900" style={{ fontSize: "32px", lineHeight: "130%" }}>
                            Inbox
                        </h1>
                        <p className="text-slate-500 text-sm">
                            {filteredContacts.length} ticket{filteredContacts.length !== 1 ? "s" : ""}
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter Bar */}
            <Card className="border-0 shadow-premium" style={{ borderRadius: "24px" }}>
                <CardContent className="p-4">
                    <div className="flex flex-col gap-4">
                        <div className="flex flex-wrap items-center gap-3">
                            {/* Search */}
                            <div className="relative" style={{ width: "360px", minWidth: "280px", maxWidth: "400px" }}>
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <Input
                                    placeholder="Tìm theo Email, Tên, Mã Ticket..."
                                    className="pl-9"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    style={{ borderRadius: "12px" }}
                                />
                            </div>

                            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                            {/* Quick Filters */}
                            <div className="flex flex-wrap items-center gap-2">
                                {quickFilterButtons.map(({ key, label, icon: Icon }) => (
                                    <button
                                        key={key}
                                        onClick={() => setQuickFilter(key)}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-all ${quickFilter === key
                                            ? "bg-primary text-white shadow-sm shadow-primary/20"
                                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                                            }`}
                                        style={{ borderRadius: "12px" }}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        {label}
                                    </button>
                                ))}
                            </div>

                            <div className="h-8 w-px bg-slate-200 hidden sm:block" />

                            {/* Status Filter */}
                            <Select
                                value={statusFilter}
                                onValueChange={(v: StatusFilter) => setStatusFilter(v)}
                            >
                                <SelectTrigger className="w-fit gap-2" style={{ borderRadius: "12px" }}>
                                    <SelectValue placeholder="Trạng thái" />
                                </SelectTrigger>
                                <SelectContent style={{ borderRadius: "12px" }}>
                                    <SelectItem value="all">Tất cả trạng thái</SelectItem>
                                    <SelectItem value="OPEN">Mở</SelectItem>
                                    <SelectItem value="PENDING">Chờ xử lý</SelectItem>
                                    <SelectItem value="RESOLVED">Đã xử lý</SelectItem>
                                    <SelectItem value="CLOSED">Đóng</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Clear filters */}
                            {(searchTerm || quickFilter !== "all" || statusFilter !== "all") && (
                                <button
                                    onClick={() => { setSearchTerm(""); setQuickFilter("all"); setStatusFilter("all"); }}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-xs text-slate-500 hover:text-red-500 transition-colors"
                                >
                                    <XMarkIcon className="w-3.5 h-3.5" />
                                    Xóa lọc
                                </button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Ticket Table */}
            <div className="bg-white shadow-premium overflow-hidden" style={{ borderRadius: "24px" }}>
                <div className="overflow-x-auto">
                    {/* Table Header */}
                    <div className="grid grid-cols-[32px_72px_72px_1fr_72px_100px_96px] gap-3 px-6 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[700px]">
                        <span>TT</span>
                        <span>Ưu tiên</span>
                        <span>Kênh</span>
                        <span>Tiêu đề / Khách hàng</span>
                        <span>Tags</span>
                        <span>Thời gian</span>
                        <span>Trạng thái</span>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-slate-50">
                        {paginatedContacts.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <FunnelIcon className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                                <p className="text-sm font-medium">Không tìm thấy ticket nào</p>
                                <p className="text-xs mt-1">Thử thay đổi bộ lọc hoặc tìm kiếm</p>
                            </div>
                        ) : (
                            paginatedContacts.map((ticket) => (
                                <div
                                    key={ticket.id}
                                    onClick={() => router.push(`/dashboard/admin/contacts/inbox/${ticket.id}`)}
                                    className="grid grid-cols-[32px_72px_72px_1fr_72px_100px_96px] gap-3 px-6 py-4 items-center hover:bg-slate-50/80 cursor-pointer transition-all group min-w-[700px]"
                                >
                                    {/* Status dot */}
                                    <div>
                                        <div className={`w-2.5 h-2.5 rounded-full ${ticket.status === "OPEN" ? "bg-emerald-500" :
                                            ticket.status === "PENDING" ? "bg-amber-500" :
                                                ticket.status === "RESOLVED" ? "bg-blue-500" :
                                                    "bg-slate-300"
                                            }`} />
                                    </div>

                                    {/* Priority */}
                                    <TicketPriorityIcon priority={ticket.priority} showLabel />

                                    {/* Channel */}
                                    <ChannelIcon channel={ticket.channel} showLabel />

                                    {/* Subject + Customer */}
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-primary transition-colors">
                                            {ticket.subject}
                                        </p>
                                        <p className="text-xs text-slate-500 truncate mt-0.5">
                                            {ticket.customer_name} • {ticket.customer_email}
                                        </p>
                                    </div>

                                    {/* Tags */}
                                    <div className="flex flex-wrap gap-1">
                                        {ticket.tags?.slice(0, 2).map((tag) => (
                                            <span
                                                key={tag.id}
                                                className="inline-block px-1.5 py-0.5 text-[10px] font-medium text-white"
                                                style={{
                                                    borderRadius: "6px",
                                                    backgroundColor: tag.color || "#94a3b8",
                                                }}
                                            >
                                                {tag.name}
                                            </span>
                                        ))}
                                        {ticket.tags && ticket.tags.length > 2 && (
                                            <span className="text-[10px] text-slate-400">+{ticket.tags.length - 2}</span>
                                        )}
                                    </div>

                                    {/* Time */}
                                    <span className="text-xs text-slate-400">
                                        {getRelativeTime(ticket.last_activity_at || ticket.created_at)}
                                    </span>

                                    {/* Status Badge */}
                                    <TicketStatusBadge status={ticket.status} isSkipped={(ticket as any).is_skipped} />
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                        <span className="text-sm text-slate-500">
                            Hiển thị {(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredContacts.length)} / {filteredContacts.length}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                style={{ borderRadius: "12px" }}
                            >
                                <ChevronLeftIcon className="w-4 h-4" />
                            </button>
                            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                                const page = i + 1;
                                return (
                                    <button
                                        key={page}
                                        onClick={() => setCurrentPage(page)}
                                        className={`w-8 h-8 text-sm font-medium transition-colors ${currentPage === page
                                            ? "bg-primary text-white"
                                            : "text-slate-500 hover:bg-slate-100"
                                            }`}
                                        style={{ borderRadius: "12px" }}
                                    >
                                        {page}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                style={{ borderRadius: "12px" }}
                            >
                                <ChevronRightIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

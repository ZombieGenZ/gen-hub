"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useContacts, useContactDetail, useContactMessages, useContactTags } from "@/hooks/contacts/use-contacts";
import { useReplyContact, useUpdateContact, useCloseContact, useReopenContact } from "@/hooks/contacts/use-contact-mutations";
import { ContactMessage } from "@/types/contact/contact.type";
import { TicketStatusBadge } from "@/components/contacts/TicketStatusBadge";
import { TicketPriorityIcon } from "@/components/contacts/TicketPriorityIcon";
import { ChannelIcon } from "@/components/contacts/ChannelIcon";
import { MessageBubble, MessageDateDivider } from "@/components/contacts/MessageBubble";
import { TicketComposer } from "@/components/contacts/TicketComposer";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeftIcon,
    CheckCircleIcon,
    ArrowPathIcon,
    XCircleIcon,
    SparklesIcon,
    ShieldExclamationIcon,
    TagIcon,
    UserCircleIcon,
    EnvelopeIcon,
    PhoneIcon,
    BuildingOffice2Icon,
    ClockIcon,
    NoSymbolIcon,
    XMarkIcon,
    PencilSquareIcon,
} from "@heroicons/react/24/outline";
import Link from "next/link";
import { useToast } from "@/contexts/ToastContext";
import { cn } from "@/lib/utils";
import { EditTicketTagsDialog } from "@/components/contacts/EditTicketTagsDialog"; // Fixed import path - will verify
import { useContactListCheck, useCreateContactListEntry, useDeleteContactListEntry } from "@/hooks/contacts/use-contact-list";
import { ContactListType, ContactListMatchType } from "@/types/contact/contact-list.type";



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

export default function TicketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const ticketId = params.id as string;

    // Queries
    const { data: ticket, isLoading: ticketLoading } = useContactDetail(ticketId);
    const { data: messages = [] } = useContactMessages(ticketId);
    const { data: allTickets = [] } = useContacts();
    const { data: tags = [] } = useContactTags();

    // Mutations
    const replyMutation = useReplyContact(ticketId);
    const updateMutation = useUpdateContact(ticketId);
    const closeMutation = useCloseContact(ticketId);
    const reopenMutation = useReopenContact(ticketId);

    const loading = ticketLoading;
    const replying = replyMutation.isPending;

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Group messages by date
    const groupedMessages = useMemo(() => {
        const groups: { date: string; messages: ContactMessage[] }[] = [];
        let currentDate = "";

        const sortedMessages = [...messages].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        sortedMessages.forEach((msg) => {
            const msgDate = new Date(msg.created_at).toLocaleDateString("vi-VN");
            if (msgDate !== currentDate) {
                currentDate = msgDate;
                groups.push({ date: msg.created_at, messages: [msg] });
            } else {
                groups[groups.length - 1].messages.push(msg);
            }
        });

        return groups;
    }, [messages]);

    // Handle reply
    const handleSendReply = async (content: string, isInternal: boolean) => {
        try {
            await replyMutation.mutateAsync({ content, is_internal: isInternal });
            showToast(isInternal ? "Đã lưu ghi chú nội bộ" : "Đã gửi trả lời", "success");
        } catch (error) {
            console.error("Failed to send reply", error);
            showToast("Không thể gửi trả lời", "error");
        }
    };

    // Handle status change
    const handleStatusChange = async (newStatus: string) => {
        try {
            if (newStatus === "CLOSED") {
                await closeMutation.mutateAsync();
            } else if (newStatus === "OPEN" && ticket?.status === "CLOSED") {
                await reopenMutation.mutateAsync();
            } else {
                await updateMutation.mutateAsync({ status: newStatus });
            }
            showToast("Đã cập nhật trạng thái", "success");
        } catch (error) {
            console.error("Failed to update status", error);
            showToast("Không thể cập nhật trạng thái", "error");
        }
    };

    // Handle priority change
    const handlePriorityChange = async (newPriority: string) => {
        try {
            await updateMutation.mutateAsync({ priority: newPriority });
            showToast("Đã cập nhật mức độ ưu tiên", "success");
        } catch (error) {
            console.error("Failed to update priority", error);
        }
    };

    // State for dialogs
    const [isEditTagsOpen, setIsEditTagsOpen] = React.useState(false);

    // Check Block Status
    const { data: blacklistEntry } = useContactListCheck(ticket?.customer_email, ContactListType.BLACKLIST);
    const createListEntryMutation = useCreateContactListEntry();
    const deleteListEntryMutation = useDeleteContactListEntry();

    const isBlocked = !!blacklistEntry;

    // Handle Block/Unblock
    const handleBlockToggle = async () => {
        if (!ticket?.customer_email) return;

        try {
            if (isBlocked) {
                if (!confirm("Bạn có chắc chắn muốn bỏ chặn người gửi này?")) return;
                await deleteListEntryMutation.mutateAsync(blacklistEntry.id);
                showToast("Đã bỏ chặn người gửi", "success");
            } else {
                if (!confirm("Bạn có chắc chắn muốn chặn người gửi này? Các tin nhắn sau này có thể bị lọc vào Spam.")) return;
                await createListEntryMutation.mutateAsync({
                    list_type: ContactListType.BLACKLIST,
                    match_type: ContactListMatchType.EMAIL,
                    value: ticket.customer_email,
                    reason: `Blocked from ticket #${ticket.code}`,
                    is_active: true
                });
                showToast("Đã chặn người gửi", "success");
            }
        } catch (error) {
            console.error("Failed to toggle block status", error);
            showToast("Không thể thay đổi trạng thái chặn", "error");
        }
    };

    // Handle Save Tags
    const handleSaveTags = async (tagIds: string[]) => {
        try {
            await updateMutation.mutateAsync({ tag_ids: tagIds });
            showToast("Đã cập nhật nhãn dán", "success");
            setIsEditTagsOpen(false);
        } catch (error) {
            console.error("Failed to update tags", error);
            showToast("Không thể cập nhật nhãn dán", "error");
        }
    };

    // Skeleton
    if (loading) {
        return (
            <div className="grid grid-cols-[260px_1fr_300px] h-[calc(100vh-64px)] -mx-4 -mb-4 w-[calc(100%+2rem)] overflow-hidden">
                <div className="bg-slate-50 animate-pulse" />
                <div className="bg-white animate-pulse" />
                <div className="bg-slate-50 animate-pulse" />
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <XCircleIcon className="w-12 h-12 text-slate-300" />
                <p className="text-slate-500">Không tìm thấy ticket</p>
                <Link
                    href="/dashboard/admin/contacts/inbox"
                    className="text-sm text-primary hover:underline"
                >
                    Quay lại Inbox
                </Link>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-[260px_1fr_300px] h-[calc(100vh-64px)] -mx-4 -mb-4 w-[calc(100%+2rem)] overflow-hidden">
            {/* ====== Column 1: Left Sidebar - Ticket List ====== */}
            <div
                className="border-r border-slate-200 bg-slate-50/50 flex flex-col overflow-hidden"
            >
                {/* Sidebar Header */}
                <div className="p-4 border-b border-slate-200">
                    <div className="flex items-center gap-2 mb-3">
                        <Link
                            href="/dashboard/admin/contacts/inbox"
                            className="p-1.5 hover:bg-slate-200 transition-colors"
                            style={{ borderRadius: "8px" }}
                        >
                            <ArrowLeftIcon className="w-4 h-4 text-slate-500" />
                        </Link>
                        <h3 className="text-sm font-bold text-slate-700">Inbox</h3>
                    </div>
                </div>

                {/* Ticket List */}
                <div className="flex-1 overflow-y-auto">
                    {allTickets.map((t) => (
                        <div
                            key={t.id}
                            onClick={() => router.push(`/dashboard/admin/contacts/inbox/${t.id}`)}
                            className={`px-4 py-3 border-b border-slate-100 cursor-pointer transition-all hover:bg-white ${t.id === ticketId ? "bg-white border-l-2 border-l-primary" : ""
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.status === "OPEN" ? "bg-emerald-500" :
                                    t.status === "PENDING" ? "bg-amber-500" :
                                        "bg-slate-300"
                                    }`} />
                                <p className="text-xs font-semibold text-slate-800 truncate flex-1">
                                    {t.customer_name}
                                </p>
                                <span className="text-[10px] text-slate-400">
                                    {getRelativeTime(t.last_activity_at || t.created_at)}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate pl-3.5">{t.subject}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* ====== Column 2: Main Content - Conversation ====== */}
            <div className="flex flex-col min-w-0 min-h-0 bg-white overflow-hidden">
                {/* Blocked Banner */}
                {isBlocked && (
                    <div className="bg-red-50 px-6 py-2 border-b border-red-100 flex items-center gap-2 text-sm text-red-700">
                        <NoSymbolIcon className="w-4 h-4" />
                        <span className="font-medium">Người gửi này đang bị chặn.</span>
                        <button
                            onClick={handleBlockToggle}
                            className="underline hover:no-underline ml-auto text-xs"
                        >
                            Bỏ chặn ngay
                        </button>
                    </div>
                )}

                {/* Ticket Header */}
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="font-bold text-slate-900 truncate" style={{ fontSize: "20px", lineHeight: "130%" }}>
                                {ticket.subject}
                            </h2>
                            <span className="text-xs text-slate-400 font-mono flex-shrink-0">
                                #{ticket.code}
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <ChannelIcon channel={ticket.channel} showLabel />
                            <span className="text-slate-300">•</span>
                            <span className="text-xs text-slate-400">
                                {new Date(ticket.created_at).toLocaleDateString("vi-VN", {
                                    day: "2-digit", month: "2-digit", year: "numeric",
                                    hour: "2-digit", minute: "2-digit",
                                })}
                            </span>
                        </div>
                    </div>

                    {/* Quick Status Buttons */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {ticket.status !== "RESOLVED" && (
                            <button
                                onClick={() => handleStatusChange("RESOLVED")}
                                disabled={updateMutation.isPending}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors",
                                    updateMutation.isPending && "opacity-50 cursor-not-allowed"
                                )}
                                style={{ borderRadius: "12px" }}
                            >
                                {updateMutation.isPending ? (
                                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <CheckCircleIcon className="w-3.5 h-3.5" />
                                )}
                                {updateMutation.isPending ? "Đang xử lý..." : "Xử lý xong"}
                            </button>
                        )}
                        {ticket.status === "CLOSED" ? (
                            <button
                                onClick={() => handleStatusChange("OPEN")}
                                disabled={reopenMutation.isPending}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors",
                                    reopenMutation.isPending && "opacity-50 cursor-not-allowed"
                                )}
                                style={{ borderRadius: "12px" }}
                            >
                                {reopenMutation.isPending ? (
                                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <ArrowPathIcon className="w-3.5 h-3.5" />
                                )}
                                {reopenMutation.isPending ? "Đang mở lại..." : "Mở lại"}
                            </button>
                        ) : (
                            <button
                                onClick={() => handleStatusChange("CLOSED")}
                                disabled={closeMutation.isPending}
                                className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors",
                                    closeMutation.isPending && "opacity-50 cursor-not-allowed"
                                )}
                                style={{ borderRadius: "12px" }}
                            >
                                {closeMutation.isPending ? (
                                    <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                    <XCircleIcon className="w-3.5 h-3.5" />
                                )}
                                {closeMutation.isPending ? "Đang đóng..." : "Đóng"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Message Stream */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {/* Initial message (from ticket) */}
                    {ticket.message && messages.length === 0 && (
                        <MessageBubble
                            message={{
                                id: "initial",
                                conversation_id: ticket.id,
                                sender_type: "CUSTOMER",
                                sender_name: ticket.customer_name,
                                sender_email: ticket.customer_email,
                                content: ticket.message,
                                is_internal: false,
                                created_at: ticket.created_at,
                            }}
                        />
                    )}

                    {/* Messages grouped by date */}
                    {groupedMessages.map((group, gi) => (
                        <div key={gi}>
                            <MessageDateDivider date={group.date} />
                            {group.messages.map((msg) => (
                                <MessageBubble key={msg.id} message={msg} />
                            ))}
                        </div>
                    ))}

                    {messages.length === 0 && !ticket.message && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                            <EnvelopeIcon className="w-10 h-10 text-slate-300" />
                            <p className="text-sm">Chưa có tin nhắn nào</p>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <div className="px-6 pb-4">
                    <TicketComposer
                        onSendReply={handleSendReply}
                        isLoading={replying}
                    />
                </div>
            </div>

            {/* ====== Column 3: Right Sidebar - Context & Metadata ====== */}
            <div className="border-l border-slate-200 bg-slate-50/50 overflow-y-auto">
                {/* Customer Profile */}
                <div className="p-6 border-b border-slate-200">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
                        Khách hàng
                    </h3>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                            {ticket.customer_name?.charAt(0)?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-sm truncate">{ticket.customer_name}</p>
                            {ticket.customer_company && (
                                <p className="text-xs text-slate-500 truncate">{ticket.customer_company}</p>
                            )}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            <EnvelopeIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                            <span className="truncate">{ticket.customer_email}</span>
                        </div>
                        {ticket.customer_phone && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <PhoneIcon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <span>{ticket.customer_phone}</span>
                            </div>
                        )}
                        {ticket.customer_company && (
                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                <BuildingOffice2Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                                <span>{ticket.customer_company}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Ticket Metadata */}
                <div className="p-6 border-b border-slate-200 space-y-4">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Thông tin ticket
                    </h3>

                    {/* Status */}
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Trạng thái</label>
                        <TicketStatusBadge status={ticket.status} isSkipped={ticket.is_skipped} />
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Mức ưu tiên</label>
                        <Select
                            value={ticket.priority || "LOW"}
                            onValueChange={handlePriorityChange}
                        >
                            <SelectTrigger className="w-full" style={{ borderRadius: "12px" }}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent style={{ borderRadius: "12px" }}>
                                <SelectItem value="URGENT">🔴 Khẩn cấp</SelectItem>
                                <SelectItem value="HIGH">🟠 Cao</SelectItem>
                                <SelectItem value="MEDIUM">🟡 Trung bình</SelectItem>
                                <SelectItem value="LOW">⚪ Thấp</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Assignee */}
                    <div>
                        <label className="text-xs text-slate-500 mb-1 block">Người xử lý</label>
                        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-sm" style={{ borderRadius: "12px" }}>
                            <UserCircleIcon className="w-4 h-4 text-slate-400" />
                            <span className="text-slate-600">
                                {ticket.assigned_staff_name ||
                                    (ticket.assigned_staff_list?.length ? "Đã gán" : "Chưa gán")}
                            </span>
                        </div>
                    </div>

                    {/* Tags */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <label className="text-xs text-slate-500 flex items-center gap-1">
                                <TagIcon className="w-3 h-3" />
                                Tags
                            </label>
                            <button
                                onClick={() => setIsEditTagsOpen(true)}
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                                <PencilSquareIcon className="w-3 h-3" />
                                Sửa
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {ticket.tags && ticket.tags.length > 0 ? (
                                ticket.tags.map((tag) => (
                                    <span
                                        key={tag.id}
                                        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-white"
                                        style={{
                                            borderRadius: "8px",
                                            backgroundColor: tag.color || "#64748b",
                                        }}
                                    >
                                        #{tag.name}
                                    </span>
                                ))
                            ) : (
                                <span className="text-xs text-slate-400">Chưa có tag</span>
                            )}
                        </div>
                    </div>

                    {/* Created time */}
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <ClockIcon className="w-3.5 h-3.5" />
                        Tạo lúc {new Date(ticket.created_at).toLocaleDateString("vi-VN", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                        })}
                    </div>
                </div>

                {/* AI Summary */}
                {ticket.ai_summary && (
                    <div className="p-6 border-b border-slate-200">
                        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            <SparklesIcon className="w-3.5 h-3.5 text-violet-500" />
                            AI Tóm tắt
                        </h3>
                        <div
                            className="bg-violet-50 border border-violet-100 px-4 py-3 text-sm text-violet-900 leading-relaxed"
                            style={{ borderRadius: "12px" }}
                        >
                            {ticket.ai_summary}
                        </div>
                    </div>
                )}

                {/* Customer History */}
                <div className="p-6 border-b border-slate-200">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        Lịch sử liên hệ
                    </h3>
                    <div className="space-y-2">
                        {allTickets
                            .filter(t => t.customer_email === ticket.customer_email && t.id !== ticket.id)
                            .slice(0, 5)
                            .map((t) => (
                                <div
                                    key={t.id}
                                    onClick={() => router.push(`/dashboard/admin/contacts/inbox/${t.id}`)}
                                    className="flex items-center gap-2 p-2 hover:bg-white cursor-pointer transition-colors"
                                    style={{ borderRadius: "8px" }}
                                >
                                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.status === "OPEN" ? "bg-emerald-500" :
                                        t.status === "PENDING" ? "bg-amber-500" :
                                            t.status === "RESOLVED" ? "bg-blue-500" :
                                                "bg-slate-300"
                                        }`} />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-slate-700 truncate">{t.subject}</p>
                                        <p className="text-[10px] text-slate-400">{getRelativeTime(t.created_at)}</p>
                                    </div>
                                </div>
                            ))}
                        {allTickets.filter(t => t.customer_email === ticket.customer_email && t.id !== ticket.id).length === 0 && (
                            <p className="text-xs text-slate-400">Không có ticket cũ</p>
                        )}
                    </div>
                </div>

                {/* Safety Actions */}
                <div className="p-6">
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                        An toàn
                    </h3>
                    <button
                        onClick={handleBlockToggle}
                        disabled={createListEntryMutation.isPending || deleteListEntryMutation.isPending}
                        className={cn(
                            "w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors",
                            isBlocked
                                ? "text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200"
                                : "text-red-600 bg-red-50 hover:bg-red-100 border border-red-200",
                            (createListEntryMutation.isPending || deleteListEntryMutation.isPending) && "opacity-50 cursor-not-allowed"
                        )}
                        style={{ borderRadius: "12px" }}
                    >
                        {isBlocked ? (
                            <>
                                <CheckCircleIcon className="w-4 h-4" />
                                Bỏ chặn người gửi
                            </>
                        ) : (
                            <>
                                <NoSymbolIcon className="w-4 h-4" />
                                Chặn người gửi
                            </>
                        )}
                    </button>
                </div>
            </div>

            <EditTicketTagsDialog
                open={isEditTagsOpen}
                onOpenChange={setIsEditTagsOpen}
                currentTags={ticket.tags || []}
                onSave={handleSaveTags}
            />
        </div>
    );
}

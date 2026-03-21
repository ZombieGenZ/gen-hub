"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
    ArrowLeftIcon,
    ArrowPathIcon,
    ClockIcon,
    EnvelopeIcon,
    NoSymbolIcon,
    PencilSquareIcon,
    TrashIcon,
    UserCircleIcon,
    XCircleIcon,
} from "@heroicons/react/24/outline";
import { EditTicketTagsDialog } from "@/components/contacts/EditTicketTagsDialog";
import { ChannelIcon } from "@/components/contacts/ChannelIcon";
import { MessageBubble, MessageDateDivider } from "@/components/contacts/MessageBubble";
import { TicketComposer } from "@/components/contacts/TicketComposer";
import { TicketStatusBadge } from "@/components/contacts/TicketStatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/contexts/ToastContext";
import { useCloseContact, useDeleteContact, useReopenContact, useReplyContact, useUpdateContact } from "@/hooks/contacts/use-contact-mutations";
import { useContactSocket } from "@/hooks/contacts/use-contact-socket";
import { useContactDetail, useContactMessages, useContacts } from "@/hooks/contacts/use-contacts";
import { useContactListCheck, useCreateContactListEntry, useDeleteContactListEntry } from "@/hooks/contacts/use-contact-list";
import { cn } from "@/lib/utils";
import { ContactMessage } from "@/types/contact/contact.type";
import { ContactListMatchType, ContactListType } from "@/types/contact/contact-list.type";

const INBOX_BASE_PATH = "/dashboard/admin/contacts/inbox";

function relativeTime(value: string) {
    const diff = Date.now() - new Date(value).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Vừa xong";
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    return `${Math.floor(hours / 24)} ngày trước`;
}

function getTicketDetailPath(ticketId: string): string {
    return `${INBOX_BASE_PATH}/${ticketId}`;
}

function getSidebarStatusDotClass(status: string): string {
    switch (status) {
        case "OPEN":
            return "bg-emerald-500";
        case "PENDING":
            return "bg-amber-500";
        default:
            return "bg-slate-300";
    }
}

export default function TicketDetailPage() {
    const params = useParams();
    const router = useRouter();
    const { showToast } = useToast();
    const ticketId = params.id as string;
    const [isEditTagsOpen, setIsEditTagsOpen] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const { data: ticket, isLoading } = useContactDetail(ticketId);
    const { data: messages = [] } = useContactMessages(ticketId);
    const { data: sidebarData } = useContacts({ limit: 25, offset: 0 });
    const allTickets = sidebarData?.items ?? [];

    const replyMutation = useReplyContact(ticketId);
    const updateMutation = useUpdateContact(ticketId);
    const closeMutation = useCloseContact(ticketId);
    const reopenMutation = useReopenContact(ticketId);
    const deleteMutation = useDeleteContact();
    const { data: blacklistEntry } = useContactListCheck(ticket?.customer_email, ContactListType.BLACKLIST);
    const createBlacklist = useCreateContactListEntry();
    const deleteBlacklist = useDeleteContactListEntry();
    const isBlocked = !!blacklistEntry;
    const openTicketFromSidebar = (id: string) => router.push(getTicketDetailPath(id));

    const groupedMessages = useMemo(() => {
        const groups: { date: string; messages: ContactMessage[] }[] = [];
        [...messages]
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .forEach((message) => {
                const current = new Date(message.created_at).toLocaleDateString("vi-VN");
                const last = groups.at(-1);
                if (!last || new Date(last.date).toLocaleDateString("vi-VN") !== current) {
                    groups.push({ date: message.created_at, messages: [message] });
                    return;
                }
                last.messages.push(message);
            });
        return groups;
    }, [messages]);

    useContactSocket({
        activeTicketId: ticketId,
        onMessageCreated: () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
        onDeleted: (data) => {
            if (data.conversationId === ticketId) {
                router.replace(INBOX_BASE_PATH);
            }
        },
    });

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const saveUpdate = async (payload: Parameters<typeof updateMutation.mutateAsync>[0], success: string, error: string) => {
        try {
            await updateMutation.mutateAsync(payload);
            showToast(success, "success");
        } catch (err) {
            console.error(error, err);
            showToast(error, "error");
        }
    };

    if (isLoading) {
        return <div className="h-[70vh] animate-pulse rounded-3xl bg-slate-100" />;
    }

    if (!ticket) {
        return (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4">
                <XCircleIcon className="h-12 w-12 text-slate-300" />
                <p className="text-slate-500">Không tìm thấy ticket</p>
                <Link href={INBOX_BASE_PATH} className="text-sm text-primary hover:underline">Quay lại Inbox</Link>
            </div>
        );
    }

    return (
        <div className="grid h-[calc(100vh-64px)] w-[calc(100%+2rem)] grid-cols-[260px_1fr_320px] overflow-hidden -mx-4 -mb-4">
            <aside className="overflow-y-auto border-r border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-2 border-b border-slate-200 p-4">
                    <Link href={INBOX_BASE_PATH} className="rounded-lg p-1.5 hover:bg-slate-200"><ArrowLeftIcon className="h-4 w-4 text-slate-500" /></Link>
                    <h3 className="text-sm font-bold text-slate-700">Inbox</h3>
                </div>
                {allTickets.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => openTicketFromSidebar(item.id)}
                        className={cn("w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-white", item.id === ticketId && "border-l-2 border-l-primary bg-white")}
                    >
                        <div className="mb-1 flex items-center gap-2">
                            <div className={cn("h-1.5 w-1.5 rounded-full", getSidebarStatusDotClass(item.status))} />
                            <p className="flex-1 truncate text-xs font-semibold text-slate-800">{item.customer_name}</p>
                            <span className="text-[10px] text-slate-400">{relativeTime(item.last_activity_at || item.created_at)}</span>
                        </div>
                        <p className="truncate pl-3.5 text-[11px] text-slate-500">{item.subject}</p>
                    </button>
                ))}
            </aside>

            <main className="flex min-h-0 flex-col bg-white">
                {isBlocked && (
                    <div className="flex items-center gap-2 border-b border-red-100 bg-red-50 px-6 py-2 text-sm text-red-700">
                        <NoSymbolIcon className="h-4 w-4" />
                        <span className="font-medium">Người gửi này đang bị chặn.</span>
                    </div>
                )}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                    <div className="min-w-0">
                        <h2 className="truncate text-xl font-bold text-slate-900">{ticket.subject}</h2>
                        <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                            <ChannelIcon channel={ticket.channel} showLabel />
                            <span>#{ticket.code}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {ticket.status === "CLOSED" ? (
                            <button onClick={() => reopenMutation.mutateAsync().then(() => showToast("Đã mở lại ticket", "success"))} className="rounded-xl bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">Mở lại</button>
                        ) : (
                            <button onClick={() => closeMutation.mutateAsync().then(() => showToast("Đã đóng ticket", "success"))} className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700">Đóng</button>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {ticket.message && messages.length === 0 && (
                        <MessageBubble message={{ id: "initial", conversation_id: ticket.id, sender_type: "CUSTOMER", sender_name: ticket.customer_name, sender_email: ticket.customer_email, content: ticket.message, is_internal: false, created_at: ticket.created_at }} />
                    )}
                    {groupedMessages.map((group) => (
                        <div key={group.date}>
                            <MessageDateDivider date={group.date} />
                            {group.messages.map((message) => <MessageBubble key={message.id} message={message} />)}
                        </div>
                    ))}
                    {!ticket.message && messages.length === 0 && (
                        <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
                            <EnvelopeIcon className="h-10 w-10 text-slate-300" />
                            <p className="text-sm">Chưa có tin nhắn nào</p>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <div className="px-6 pb-4">
                    <TicketComposer
                        onSendReply={async (content, isInternal) => {
                            try {
                                await replyMutation.mutateAsync({ content, is_internal: isInternal });
                                showToast(isInternal ? "Đã lưu ghi chú nội bộ" : "Đã gửi trả lời", "success");
                            } catch (err) {
                                console.error("Failed to send reply", err);
                                showToast("Không thể gửi trả lời", "error");
                            }
                        }}
                        isLoading={replyMutation.isPending}
                    />
                </div>
            </main>

            <aside className="space-y-5 overflow-y-auto border-l border-slate-200 bg-slate-50/50 p-6">
                <section className="space-y-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Khách hàng</h3>
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><UserCircleIcon className="h-4 w-4 text-slate-400" />{ticket.customer_name}</div>
                    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">{ticket.customer_email}</div>
                </section>

                <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Thông tin ticket</h3>
                    <div><p className="mb-1 text-xs text-slate-500">Trạng thái</p><TicketStatusBadge status={ticket.status} isSkipped={ticket.is_skipped} /></div>
                    <div>
                        <p className="mb-1 text-xs text-slate-500">Mức ưu tiên</p>
                        <Select value={ticket.priority || "LOW"} onValueChange={(value) => saveUpdate({ priority: value as "LOW" | "MEDIUM" | "HIGH" | "URGENT" }, "Đã cập nhật mức ưu tiên", "Không thể cập nhật mức ưu tiên")}>
                            <SelectTrigger className="rounded-xl bg-white"><SelectValue /></SelectTrigger>
                            <SelectContent><SelectItem value="LOW">Thấp</SelectItem><SelectItem value="MEDIUM">Trung bình</SelectItem><SelectItem value="HIGH">Cao</SelectItem><SelectItem value="URGENT">Khẩn cấp</SelectItem></SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-3">
                        <div><p className="text-sm font-medium text-slate-700">AI Auto-reply</p><p className="text-xs text-slate-400">{ticket.enable_ai_reply ? "Đang bật" : "Đang tắt"}</p></div>
                        <Switch checked={ticket.enable_ai_reply ?? false} onCheckedChange={(checked) => saveUpdate({ enable_ai_reply: checked }, checked ? "Đã bật AI auto-reply" : "Đã tắt AI auto-reply", "Không thể cập nhật AI auto-reply")} />
                    </div>
                    <div>
                        <div className="mb-1 flex items-center justify-between">
                            <p className="text-xs text-slate-500">Tags</p>
                            <button onClick={() => setIsEditTagsOpen(true)} className="inline-flex items-center gap-1 text-xs text-primary hover:underline"><PencilSquareIcon className="h-3 w-3" />Sửa</button>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {ticket.tags?.length ? ticket.tags.map((tag) => <span key={tag.id} className="rounded-lg bg-slate-600 px-2 py-1 text-xs font-medium text-white">#{tag.name}</span>) : <span className="text-xs text-slate-400">Chưa có tag</span>}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400"><ClockIcon className="h-3.5 w-3.5" />{new Date(ticket.created_at).toLocaleString("vi-VN")}</div>
                </section>

                <section className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">An toàn</h3>
                    <button
                        onClick={async () => {
                            try {
                                if (isBlocked) {
                                    if (!window.confirm("Bỏ chặn người gửi này?")) return;
                                    await deleteBlacklist.mutateAsync(blacklistEntry.id);
                                    showToast("Đã bỏ chặn người gửi", "success");
                                } else {
                                    if (!window.confirm("Chặn người gửi này?")) return;
                                    await createBlacklist.mutateAsync({ list_type: ContactListType.BLACKLIST, match_type: ContactListMatchType.EMAIL, value: ticket.customer_email, reason: `Blocked from ticket #${ticket.code}`, is_active: true });
                                    showToast("Đã chặn người gửi", "success");
                                }
                            } catch (err) {
                                console.error("Failed to toggle blacklist", err);
                                showToast("Không thể cập nhật trạng thái chặn", "error");
                            }
                        }}
                        className={cn("w-full rounded-xl border px-4 py-2.5 text-sm font-medium", isBlocked ? "border-slate-200 bg-slate-100 text-slate-700" : "border-red-200 bg-red-50 text-red-600")}
                    >
                        {isBlocked ? "Bỏ chặn người gửi" : "Chặn người gửi"}
                    </button>
                    <button
                        onClick={async () => {
                            if (!window.confirm(`Xóa ticket #${ticket.code}?`)) return;
                            try {
                                await deleteMutation.mutateAsync(ticket.id);
                                showToast("Đã xóa ticket", "success");
                                router.replace(INBOX_BASE_PATH);
                            } catch (err) {
                                console.error("Failed to delete ticket", err);
                                showToast("Không thể xóa ticket", "error");
                            }
                        }}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                        {deleteMutation.isPending ? <ArrowPathIcon className="h-4 w-4 animate-spin" /> : <TrashIcon className="h-4 w-4" />}
                        {deleteMutation.isPending ? "Đang xóa..." : "Xóa ticket"}
                    </button>
                </section>
            </aside>

            <EditTicketTagsDialog open={isEditTagsOpen} onOpenChange={setIsEditTagsOpen} currentTags={ticket.tags || []} onSave={(tagIds) => saveUpdate({ tags: tagIds }, "Đã cập nhật nhãn dán", "Không thể cập nhật nhãn dán").then(() => setIsEditTagsOpen(false))} />
        </div>
    );
}

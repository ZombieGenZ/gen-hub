"use client";

import { useEffect, useState, type ComponentType, type SVGProps } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    ArrowLeftIcon,
    BellIcon,
    BuildingOffice2Icon,
    ChatBubbleBottomCenterTextIcon,
    CheckCircleIcon,
    ChevronRightIcon,
    ClockIcon,
    DocumentTextIcon,
    EnvelopeIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    LockClosedIcon,
    PaperAirplaneIcon,
    PhoneIcon,
    XCircleIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { PartnerService } from "@/services/partner/partner.service";
import { NotificationService } from "@/services/notification/notification.service";
import { UserService } from "@/services/user/user.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { useToast } from "@/contexts/ToastContext";

// ─── Types ───────────────────────────────────────────────────────────
type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "ERROR";

interface TimelineItem {
    id: string;
    type: NotificationType;
    title: string;
    content: string;
    created_at: string;
    is_read: boolean;
    sender?: string;
}

interface CustomerDetail {
    id: string;
    name: string;
    email: string;
    phone: string;
    contracts: number;
    status: "active" | "inactive";
    is_banned: boolean;
    banned_end: string | null;
    banned_reason: string;
    user_id?: string;
}

interface AdminUserLite {
    id: string;
    email?: string;
    is_banned?: boolean;
    banned_end?: string | null;
    warning_count?: number;
}

const partnerService = new PartnerService();
const notificationService = new NotificationService();
const userService = new UserService();

// ─── Helpers ──────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<NotificationType, {
    icon: ComponentType<SVGProps<SVGSVGElement> & { title?: string; titleId?: string }>;
    dotColor: string;
    bgColor: string;
    textColor: string;
    borderColor: string;
    label: string;
}> = {
    INFO: { icon: InformationCircleIcon, dotColor: "bg-blue-400", bgColor: "bg-blue-50", textColor: "text-blue-700", borderColor: "border-blue-200", label: "Thông tin" },
    SUCCESS: { icon: CheckCircleIcon, dotColor: "bg-emerald-400", bgColor: "bg-emerald-50", textColor: "text-emerald-700", borderColor: "border-emerald-200", label: "Thành công" },
    WARNING: { icon: ExclamationTriangleIcon, dotColor: "bg-amber-400", bgColor: "bg-amber-50", textColor: "text-amber-700", borderColor: "border-amber-200", label: "Cảnh báo" },
    ERROR: { icon: XCircleIcon, dotColor: "bg-red-400", bgColor: "bg-red-50", textColor: "text-red-700", borderColor: "border-red-200", label: "Lỗi" },
};

function formatDateVN(iso: string) {
    const d = new Date(iso);
    return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function formatDateTimeVN(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

// ─── Component ───────────────────────────────────────────────────────
export default function CustomerDetailPage() {
    const router = useRouter();
    const params = useParams();
    const customerId = params?.id as string;
    const { showToast } = useToast();

    const [loading, setLoading] = useState(true);
    const [customer, setCustomer] = useState<CustomerDetail | null>(null);
    const [timeline, setTimeline] = useState<TimelineItem[]>([]);
    const [activeTab, setActiveTab] = useState<"overview" | "warnings">("warnings");

    // Quick send warning
    const [showSendForm, setShowSendForm] = useState(false);
    const [sendFormData, setSendFormData] = useState({
        title: "",
        content: "",
        type: "WARNING" as NotificationType,
    });
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);

    useEffect(() => {
        const fetchCustomerDetail = async () => {
            const token = authStorage.getAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }

            setLoading(true);
            try {
                const partnerRes = await partnerService.getById(token, customerId);
                const partner = partnerRes.data;

                const customerData: CustomerDetail = {
                    id: partner.id,
                    name: partner.name,
                    email: partner.email || "-",
                    phone: partner.phone || "-",
                    contracts: 0,
                    status: partner.is_active ? "active" : "inactive",
                    is_banned: false,
                    banned_end: null,
                    banned_reason: "",
                };

                if (partner.email) {
                    const users = (await userService.searchUsers(token, partner.email)) as unknown as AdminUserLite[];
                    const matchedUser = users.find(
                        (u) => String(u.email || "").toLowerCase() === partner.email!.toLowerCase()
                    );

                    if (matchedUser?.id) {
                        customerData.user_id = matchedUser.id;
                        customerData.is_banned = Boolean(matchedUser.is_banned);
                        customerData.banned_end = matchedUser.banned_end || null;
                        customerData.banned_reason = matchedUser.warning_count
                            ? `Tích lũy ${matchedUser.warning_count} cảnh báo`
                            : "Tài khoản đang bị khóa";

                        const notifications = await notificationService.getUserNotifications(token, matchedUser.id, {
                            limit: 100,
                            offset: 0,
                        });

                        const mappedTimeline: TimelineItem[] = (notifications.items || []).map((item) => ({
                            id: item.id,
                            type: item.type,
                            title: item.title,
                            content: item.content,
                            created_at: item.created_at,
                            is_read: item.is_read,
                            sender: "Hệ thống",
                        }));

                        setTimeline(mappedTimeline);
                    }
                }

                setCustomer(customerData);
            } catch (error) {
                console.error(error);
                showToast("Không thể tải chi tiết khách hàng", "error");
            } finally {
                setLoading(false);
            }
        };

        if (customerId) {
            fetchCustomerDetail();
        }
    }, [customerId, router, showToast]);

    const handleSendWarning = () => {
        setConfirmOpen(true);
    };

    const handleConfirmSend = async () => {
        const token = authStorage.getAccessToken();
        if (!token) {
            router.push("/login");
            return;
        }
        if (!customer?.user_id) {
            showToast("Không tìm thấy tài khoản user để gửi thông báo", "error");
            return;
        }

        setIsSending(true);
        try {
            const created = await notificationService.sendNotification(token, {
                user_id: customer.user_id,
                title: sendFormData.title,
                content: sendFormData.content,
                type: sendFormData.type,
            });

            const newItem: TimelineItem = {
                id: created.id,
                type: created.type,
                title: created.title,
                content: created.content,
                created_at: created.created_at,
                is_read: created.is_read,
                sender: "Admin",
            };

            setTimeline((prev) => [newItem, ...prev]);
            setSendFormData({ title: "", content: "", type: "WARNING" });
            setShowSendForm(false);
            setConfirmOpen(false);
            showToast("Đã gửi thông báo", "success");
        } catch (error) {
            console.error(error);
            showToast("Gửi thông báo thất bại", "error");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="flex flex-col flex-1 h-full bg-muted/40">
            {loading && (
                <div className="px-6 py-3 text-sm text-muted-foreground border-b bg-white">Đang tải dữ liệu khách hàng...</div>
            )}

            {/* ── Banned Banner ───────────────────────────────────────────── */}
            {customer?.is_banned && (
                <div className="bg-red-700 text-white px-6 py-3.5 flex items-center gap-3">
                    <LockClosedIcon className="w-5 h-5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm">Tài khoản này đang bị khóa (Banned)</span>
                        <span className="text-red-200 text-sm ml-2">— {customer.banned_reason}</span>
                    </div>
                    <div className="text-sm text-red-100 shrink-0">
                        <span className="text-red-300">Hạn mở khóa: </span>
                        <span className="font-semibold">{customer.banned_end ? formatDateVN(customer.banned_end) : "Không xác định"}</span>
                    </div>
                </div>
            )}

            <main className="flex-1 p-4 md:p-8">
                {/* ── Breadcrumb ── */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
                    <button
                        onClick={() => router.back()}
                        className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                    >
                        <ArrowLeftIcon className="w-3.5 h-3.5" />
                        Quay lại
                    </button>
                    <ChevronRightIcon className="w-3 h-3" />
                    <span>Khách hàng</span>
                    <ChevronRightIcon className="w-3 h-3" />
                    <span className="text-foreground font-medium">{customer?.name || "Chi tiết"}</span>
                </div>

                {/* ── Header ── */}
                <div className="flex items-start gap-5 mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand/20 to-brand/5 flex items-center justify-center text-brand text-2xl font-bold border border-brand/20 shrink-0">
                        {(customer?.name || "?").charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 flex-wrap mb-1">
                            <h1 className="text-2xl font-bold text-foreground">{customer?.name || "Khách hàng"}</h1>
                            {customer?.is_banned ? (
                                <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100">
                                    <LockClosedIcon className="w-3 h-3 mr-1" /> Đang bị khóa
                                </Badge>
                            ) : (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100">
                                    <CheckCircleIcon className="w-3 h-3 mr-1" /> Hoạt động
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1.5"><EnvelopeIcon className="w-3.5 h-3.5" />{customer?.email || "-"}</span>
                            <span className="flex items-center gap-1.5"><PhoneIcon className="w-3.5 h-3.5" />{customer?.phone || "-"}</span>
                            <span className="flex items-center gap-1.5"><DocumentTextIcon className="w-3.5 h-3.5" />{customer?.contracts || 0} hợp đồng</span>
                        </div>
                    </div>
                </div>

                {/* ── Tabs ── */}
                <div className="flex gap-1 p-1 bg-muted/60 rounded-xl border border-border/50 w-fit mb-6">
                    {[
                        { key: "overview", icon: BuildingOffice2Icon, label: "Tổng quan" },
                        { key: "warnings", icon: ExclamationTriangleIcon, label: "Cảnh báo & Thông báo" },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as typeof activeTab)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab.key
                                    ? "bg-white text-foreground shadow-sm border border-border/40"
                                    : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {tab.key === "warnings" && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-50 text-rose-500 text-xs font-semibold">
                                    {timeline.filter(t => t.type === "WARNING" || t.type === "ERROR").length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* ── Tab: Overview (placeholder) ── */}
                {activeTab === "overview" && (
                    <div className="bg-white rounded-2xl border border-border shadow-sm p-8 text-center">
                        <BuildingOffice2Icon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                        <p className="text-sm text-muted-foreground">Thông tin tổng quan của khách hàng</p>
                    </div>
                )}

                {/* ── Tab: Warnings & Notifications ── */}
                {activeTab === "warnings" && (
                    <div className="space-y-4">
                        {/* Section Header with Quick Action Button */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-semibold text-foreground">Lịch sử Cảnh báo & Thông báo</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Tất cả thông báo hệ thống đã gửi cho khách hàng này</p>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setShowSendForm(!showSendForm)}
                                className="gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm shadow-amber-200"
                            >
                                <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                                Gửi Cảnh báo Thủ công
                            </Button>
                        </div>

                        {/* ── Quick Send Mini Form ── */}
                        {showSendForm && (
                            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                        <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-amber-500" />
                                        Gửi thông báo đến <span className="text-amber-600">{customer?.name || "Khách hàng"}</span>
                                    </h3>
                                    <button aria-label="Đóng form gửi cảnh báo" onClick={() => setShowSendForm(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Recipient tag (pre-filled) */}
                                <div className="flex items-center gap-2 bg-muted/40 rounded-xl px-3 py-2 border border-border/50">
                                    <span className="text-xs text-muted-foreground">Người nhận:</span>
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand/10 text-brand text-xs font-medium border border-brand/20">
                                        {(customer?.name || "Khách hàng")} ({customer?.id || "-"})
                                    </span>
                                </div>

                                {/* Type Select */}
                                <div className="grid grid-cols-4 gap-2">
                                    {(["WARNING", "ERROR", "INFO", "SUCCESS"] as NotificationType[]).map(t => {
                                        const cfg = TYPE_CONFIG[t];
                                        const Icon = cfg.icon;
                                        return (
                                            <button
                                                key={t}
                                                onClick={() => setSendFormData(s => ({ ...s, type: t }))}
                                                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${sendFormData.type === t
                                                        ? `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor} shadow-sm`
                                                        : "bg-muted/40 text-muted-foreground border-border hover:border-border/80"
                                                    }`}
                                            >
                                                <Icon className="w-3.5 h-3.5" />
                                                {cfg.label}
                                            </button>
                                        );
                                    })}
                                </div>

                                <Input
                                    placeholder="Tiêu đề thông báo (tối đa 255 ký tự)"
                                    value={sendFormData.title}
                                    onChange={e => setSendFormData(s => ({ ...s, title: e.target.value }))}
                                    className="rounded-xl"
                                    maxLength={255}
                                />
                                <textarea
                                    placeholder="Nội dung chi tiết..."
                                    value={sendFormData.content}
                                    onChange={e => setSendFormData(s => ({ ...s, content: e.target.value }))}
                                    className="w-full h-24 rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                />

                                <div className="flex gap-2 justify-end">
                                    <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setShowSendForm(false)}>
                                        Hủy
                                    </Button>
                                    <Button
                                        size="sm"
                                        className={`rounded-xl gap-2 ${TYPE_CONFIG[sendFormData.type].bgColor} ${TYPE_CONFIG[sendFormData.type].textColor} ${TYPE_CONFIG[sendFormData.type].borderColor} border hover:opacity-90`}
                                        onClick={handleSendWarning}
                                        disabled={!sendFormData.title.trim() || !sendFormData.content.trim()}
                                    >
                                        <PaperAirplaneIcon className="w-3.5 h-3.5" />
                                        Gửi ngay
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* ── Timeline ── */}
                        <div className="relative">
                            {/* Legend */}
                            <div className="flex items-center gap-4 mb-5 pl-6">
                                {(Object.entries(TYPE_CONFIG) as [NotificationType, typeof TYPE_CONFIG[NotificationType]][]).map(([type, cfg]) => {
                                    const count = timeline.filter(t => t.type === type).length;
                                    if (!count) return null;
                                    return (
                                        <span key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <span className={`w-2 h-2 rounded-full ${cfg.dotColor}`} />
                                            {cfg.label} ({count})
                                        </span>
                                    );
                                })}
                            </div>

                            {/* Timeline items */}
                            <div className="relative pl-6">
                                {/* Vertical line */}
                                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border/60" />

                                <div className="space-y-4">
                                    {timeline.map((item) => {
                                        const cfg = TYPE_CONFIG[item.type];
                                        const Icon = cfg.icon;
                                        const isHighlight = item.type === "WARNING" || item.type === "ERROR";

                                        return (
                                            <div key={item.id} className="relative flex gap-4">
                                                {/* Dot */}
                                                <div className={`absolute -left-6 mt-3 w-5 h-5 rounded-full ${cfg.dotColor} flex items-center justify-center ring-4 ring-background shrink-0 z-10`}>
                                                    <Icon className="w-2.5 h-2.5 text-white" />
                                                </div>

                                                {/* Card */}
                                                <div className={`flex-1 rounded-2xl border p-4 transition-all ${isHighlight
                                                        ? `${cfg.bgColor} ${cfg.borderColor} shadow-sm`
                                                        : "bg-white border-border hover:border-border/80"
                                                    }`}>
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap mb-1">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
                                                                    <Icon className="w-3 h-3" />
                                                                    {cfg.label}
                                                                </span>
                                                                {!item.is_read && (
                                                                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
                                                                        Chưa đọc
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <h4 className={`font-semibold text-sm ${isHighlight ? cfg.textColor : "text-foreground"}`}>
                                                                {item.title}
                                                            </h4>
                                                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                                                                {item.content}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1">
                                                            <ClockIcon className="w-3 h-3" />
                                                            {formatDateTimeVN(item.created_at)}
                                                        </span>
                                                        {item.sender && (
                                                            <span className="flex items-center gap-1">
                                                                <BellIcon className="w-3 h-3" />
                                                                {item.sender}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* ── Confirm Dialog (send warning) ── */}
            <Dialog open={confirmOpen} onOpenChange={o => { if (!isSending) setConfirmOpen(o); }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                            Xác nhận gửi thông báo
                        </DialogTitle>
                        <DialogDescription className="text-sm leading-relaxed">
                            Bạn sắp gửi <strong className="text-foreground">{TYPE_CONFIG[sendFormData.type].label}</strong> đến tài khoản{" "}
                            <strong className="text-foreground">{customer?.name || "khách hàng"}</strong>. Hành động này sẽ ghi lại vào lịch sử vĩnh viễn.
                        </DialogDescription>
                    </DialogHeader>

                    {/* Preview */}
                    <div className={`rounded-xl border p-4 space-y-1 ${TYPE_CONFIG[sendFormData.type].bgColor} ${TYPE_CONFIG[sendFormData.type].borderColor}`}>
                        <p className={`font-semibold text-sm ${TYPE_CONFIG[sendFormData.type].textColor}`}>{sendFormData.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{sendFormData.content}</p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isSending} className="rounded-xl">
                            Hủy
                        </Button>
                        <Button
                            onClick={handleConfirmSend}
                            disabled={isSending}
                            className="rounded-xl gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                        >
                            {isSending ? (
                                <>
                                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Đang gửi...
                                </>
                            ) : (
                                <>
                                    <PaperAirplaneIcon className="w-4 h-4" />
                                    Xác nhận gửi
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

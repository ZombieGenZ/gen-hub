"use client";

import { useEffect, useState, useCallback, type ComponentType, type SVGProps } from "react";
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
    EnvelopeIcon,
    ExclamationTriangleIcon,
    InformationCircleIcon,
    LockClosedIcon,
    LockOpenIcon,
    PaperAirplaneIcon,
    PhoneIcon,
    UserCircleIcon,
    XCircleIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { NotificationService } from "@/services/notification/notification.service";
import {
    UserManagementService,
    type User,
    type Warning,
} from "@/services/user-management/user-management.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { toast } from "sonner";
import { useBreadcrumbLabel } from "@/components/providers/breadcrumb-provider";

// ─── Types ────────────────────────────────────────────────────────────────────
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

const TYPE_CONFIG: Record<NotificationType, {
    icon: ComponentType<SVGProps<SVGSVGElement> & { title?: string; titleId?: string }>;
    dotColor: string; bgColor: string; textColor: string; borderColor: string; label: string;
}> = {
    INFO:    { icon: InformationCircleIcon, dotColor: "bg-blue-400",   bgColor: "bg-blue-50",   textColor: "text-blue-700",   borderColor: "border-blue-200",   label: "Thông tin" },
    SUCCESS: { icon: CheckCircleIcon,       dotColor: "bg-emerald-400", bgColor: "bg-emerald-50", textColor: "text-emerald-700", borderColor: "border-emerald-200", label: "Thành công" },
    WARNING: { icon: ExclamationTriangleIcon, dotColor: "bg-amber-400", bgColor: "bg-amber-50",  textColor: "text-amber-700",  borderColor: "border-amber-200",  label: "Cảnh báo" },
    ERROR:   { icon: XCircleIcon,           dotColor: "bg-red-400",    bgColor: "bg-red-50",    textColor: "text-red-700",    borderColor: "border-red-200",    label: "Lỗi" },
};

function fmt(iso: string) {
    return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function fmtDate(iso: string) {
    return new Date(iso).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const svc = new UserManagementService();
const notificationService = new NotificationService();

// ─── Component ────────────────────────────────────────────────────────────────
export default function CustomerDetailPage() {
    const router = useRouter();
    const params = useParams();
    const userId = params?.id as string;

    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<User | null>(null);
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [timeline, setTimeline] = useState<TimelineItem[]>([]);
    const [activeTab, setActiveTab] = useState<"overview" | "warnings">("overview");

    const [banDialogOpen, setBanDialogOpen] = useState(false);
    const [banReason, setBanReason] = useState("");
    const [isBanning, setIsBanning] = useState(false);

    const [showSendForm, setShowSendForm] = useState(false);
    const [sendFormData, setSendFormData] = useState({ title: "", content: "", type: "WARNING" as NotificationType });
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);

    useBreadcrumbLabel(user?.name || user?.full_name || user?.email);

    // ── Fetch user ──
    const fetchUser = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) { router.push("/login"); return; }
        setLoading(true);
        try {
            const res = await svc.findById(token, userId);
            setUser(res.data);
        } catch (err: any) {
            toast.error(err.message || "Không thể tải thông tin khách hàng");
            router.push("/dashboard/admin/customers");
        } finally {
            setLoading(false);
        }
    }, [userId, router]);

    // ── Fetch warnings ──
    const fetchWarnings = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        try {
            const res = await svc.findUserWarnings(token, userId, { limit: 50 });
            setWarnings(res?.data?.items ?? (res as any)?.items ?? []);
        } catch (err: any) {
            toast.error("Lỗi khi tải lịch sử cảnh cáo: " + (err.message || "Không xác định"));
        }
    }, [userId]);

    // ── Fetch notifications ──
    const fetchNotifications = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        try {
            const notifications = await notificationService.getUserNotifications(token, userId, { limit: 100, offset: 0 });
            setTimeline(
                (notifications.items || []).map((item: any) => ({
                    id: item.id,
                    type: item.type,
                    title: item.title,
                    content: item.content,
                    created_at: item.created_at,
                    is_read: item.is_read,
                    sender: "Hệ thống",
                }))
            );
        } catch (err: any) {
            toast.error("Lỗi khi tải lịch sử thông báo: " + (err.message || "Không xác định"));
        }
    }, [userId]);

    useEffect(() => { fetchUser(); }, [fetchUser]);
    useEffect(() => { fetchWarnings(); }, [fetchWarnings]);
    useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

    // ── Ban / Unban ──
    const handleBan = async () => {
        const token = authStorage.getAccessToken();
        if (!token || !user || !banReason.trim()) return;
        setIsBanning(true);
        try {
            await svc.banUser(token, user.id, { reason: banReason.trim(), is_permanent: false, duration_value: 7, duration_type: "days" });
            toast.success(`Đã khóa tài khoản ${displayName || user.email} thành công`);
            setBanDialogOpen(false);
            setBanReason("");
            fetchUser();
        } catch (err: any) {
            toast.error(err.message || "Không thể khóa tài khoản");
        } finally {
            setIsBanning(false);
        }
    };

    const handleUnban = async () => {
        const token = authStorage.getAccessToken();
        if (!token || !user) return;
        try {
            await svc.unbanUser(token, user.id);
            toast.success(`Đã mở khóa tài khoản ${displayName || user.email} thành công`);
            fetchUser();
        } catch (err: any) {
            toast.error(err.message || "Không thể mở khóa tài khoản");
        }
    };

    // ── Send notification ──
    const handleConfirmSend = async () => {
        const token = authStorage.getAccessToken();
        if (!token || !userId) return;
        setIsSending(true);
        try {
            const created = await notificationService.sendNotification(token, {
                user_id: userId,
                title: sendFormData.title,
                content: sendFormData.content,
                type: sendFormData.type,
            });
            setTimeline((prev) => [{
                id: created.id,
                type: created.type,
                title: created.title,
                content: created.content,
                created_at: created.created_at,
                is_read: created.is_read,
                sender: "Admin",
            }, ...prev]);
            setSendFormData({ title: "", content: "", type: "WARNING" });
            setShowSendForm(false);
            setConfirmOpen(false);
            toast.success("Đã gửi thông báo thành công");
        } catch (err: any) {
            toast.error(err.message || "Gửi thông báo thất bại");
        } finally {
            setIsSending(false);
        }
    };

    // ── Loading ──
    if (loading) {
        return (
            <div className="flex flex-col flex-1 h-full bg-muted/40">
                <div className="px-6 py-3 text-sm text-muted-foreground border-b bg-white">Đang tải dữ liệu khách hàng...</div>
            </div>
        );
    }

    if (!user) return null;

    const displayName = user.name || user.full_name || user.email || "Khách hàng";

    return (
        <div className="flex flex-col flex-1 h-full bg-muted/40">
            {/* Banned Banner */}
            {user.is_banned && (
                <div className="bg-red-700 text-white px-6 py-3.5 flex items-center gap-3">
                    <LockClosedIcon className="w-5 h-5 shrink-0" />
                    <span className="font-semibold text-sm">Tài khoản đang bị khóa</span>
                </div>
            )}

            <main className="flex-1 p-4 md:p-8">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
                    <button onClick={() => router.back()} className="flex items-center gap-1.5 hover:text-foreground transition-colors">
                        <ArrowLeftIcon className="w-3.5 h-3.5" />Quay lại
                    </button>
                    <ChevronRightIcon className="w-3 h-3" />
                    <span>Khách hàng</span>
                    <ChevronRightIcon className="w-3 h-3" />
                    <span className="text-foreground font-medium">{displayName}</span>
                </div>

                {/* Header */}
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand/20 to-brand/5 flex items-center justify-center text-brand text-xl font-bold border border-brand/20 shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h1 className="text-xl font-bold text-foreground">{displayName}</h1>
                            {user.is_banned ? (
                                <Button size="sm" variant="outline" onClick={handleUnban}
                                    className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50 rounded-xl text-xs">
                                    <LockOpenIcon className="w-3.5 h-3.5" />Mở khóa
                                </Button>
                            ) : (
                                <Button size="sm" variant="outline" onClick={() => setBanDialogOpen(true)}
                                    className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50 rounded-xl text-xs">
                                    <LockClosedIcon className="w-3.5 h-3.5" />Khóa tài khoản
                                </Button>
                            )}
                            {user.is_banned ? (
                                <Badge className="bg-red-100 text-red-700 border-red-200 hover:bg-red-100 text-xs">
                                    <LockClosedIcon className="w-3 h-3 mr-1" />Đang bị khóa
                                </Badge>
                            ) : user.is_verified ? (
                                <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100 text-xs">
                                    <CheckCircleIcon className="w-3 h-3 mr-1" />Đã xác thực
                                </Badge>
                            ) : (
                                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100 text-xs">
                                    Chưa xác thực
                                </Badge>
                            )}
                            {user.warning_count > 0 && (
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200 hover:bg-orange-100 text-xs">
                                    <ExclamationTriangleIcon className="w-3 h-3 mr-1" />{user.warning_count} cảnh cáo
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1.5"><EnvelopeIcon className="w-3.5 h-3.5" />{user.email}</span>
                            {user.phone && <span className="flex items-center gap-1.5"><PhoneIcon className="w-3.5 h-3.5" />{user.phone}</span>}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-muted/60 rounded-xl border border-border/50 w-fit mb-5">
                    {[
                        { key: "overview", icon: BuildingOffice2Icon, label: "Tổng quan" },
                        { key: "warnings", icon: ExclamationTriangleIcon, label: `Cảnh báo & Thông báo` },
                    ].map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as typeof activeTab)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === tab.key
                                    ? "bg-white text-foreground shadow-sm border border-border/40"
                                    : "text-muted-foreground hover:text-foreground"
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                            {tab.key === "warnings" && timeline.filter(t => t.type === "WARNING" || t.type === "ERROR").length > 0 && (
                                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-rose-50 text-rose-500 text-xs font-semibold">
                                    {timeline.filter(t => t.type === "WARNING" || t.type === "ERROR").length}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Tab: Overview */}
                {activeTab === "overview" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="rounded-2xl border-slate-200 shadow-sm">
                            <CardContent className="p-5 space-y-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Thông tin cá nhân</p>
                                <InfoRow icon={<UserCircleIcon className="w-4 h-4" />} label="Họ tên" value={user.name || user.full_name || "—"} />
                                <InfoRow icon={<EnvelopeIcon className="w-4 h-4" />} label="Email" value={user.email} />
                                <InfoRow icon={<PhoneIcon className="w-4 h-4" />} label="Điện thoại" value={user.phone || "—"} />
                                <InfoRow
                                    icon={<ClockIcon className="w-4 h-4" />}
                                    label="Ngày tham gia"
                                    value={fmtDate(user.created_at)}
                                />
                            </CardContent>
                        </Card>

                        <Card className="rounded-2xl border-slate-200 shadow-sm">
                            <CardContent className="p-5 space-y-3">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Lịch sử cảnh cáo</p>
                                {warnings.length === 0 ? (
                                    <p className="text-sm text-slate-400">Không có cảnh cáo nào</p>
                                ) : warnings.slice(0, 4).map((w) => (
                                    <div key={w.id} className="flex items-start justify-between gap-2 py-1 border-b border-slate-100 last:border-0">
                                        <div>
                                            <p className="text-sm text-slate-700 leading-snug">{w.reason}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">{fmtDate(w.created_at)}</p>
                                        </div>
                                        <Badge variant="outline" className={`text-xs shrink-0 ${w.is_active ? "bg-orange-50 text-orange-700 border-orange-200" : w.removed_by ? "bg-slate-50 text-slate-500 border-slate-200" : "bg-yellow-50 text-yellow-700 border-yellow-200"}`}>
                                            {w.is_active ? "Hiệu lực" : w.removed_by ? "Đã gỡ" : "Hết hạn"}
                                        </Badge>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Tab: Warnings & Notifications */}
                {activeTab === "warnings" && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-base font-semibold text-foreground">Lịch sử Cảnh báo & Thông báo</h2>
                                <p className="text-xs text-muted-foreground mt-0.5">Tất cả thông báo hệ thống đã gửi cho khách hàng này</p>
                            </div>
                            <Button size="sm" onClick={() => setShowSendForm(!showSendForm)}
                                className="gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl shadow-sm shadow-amber-200">
                                <ChatBubbleBottomCenterTextIcon className="w-4 h-4" />
                                Gửi Cảnh báo Thủ công
                            </Button>
                        </div>

                        {showSendForm && (
                            <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-sm text-foreground flex items-center gap-2">
                                        <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-amber-500" />
                                        Gửi thông báo đến <span className="text-amber-600">{displayName}</span>
                                    </h3>
                                    <button onClick={() => setShowSendForm(false)} className="text-muted-foreground hover:text-foreground">
                                        <XMarkIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="grid grid-cols-4 gap-2">
                                    {(["WARNING", "ERROR", "INFO", "SUCCESS"] as NotificationType[]).map(t => {
                                        const cfg = TYPE_CONFIG[t];
                                        const Icon = cfg.icon;
                                        return (
                                            <button key={t} onClick={() => setSendFormData(s => ({ ...s, type: t }))}
                                                className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                                                    sendFormData.type === t
                                                        ? `${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor} shadow-sm`
                                                        : "bg-muted/40 text-muted-foreground border-border"
                                                }`}>
                                                <Icon className="w-3.5 h-3.5" />{cfg.label}
                                            </button>
                                        );
                                    })}
                                </div>
                                <Input placeholder="Tiêu đề thông báo" value={sendFormData.title}
                                    onChange={e => setSendFormData(s => ({ ...s, title: e.target.value }))}
                                    className="rounded-xl" maxLength={255} />
                                <textarea placeholder="Nội dung chi tiết..."
                                    value={sendFormData.content}
                                    onChange={e => setSendFormData(s => ({ ...s, content: e.target.value }))}
                                    className="w-full h-24 rounded-xl border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
                                <div className="flex gap-2 justify-end">
                                    <Button variant="ghost" size="sm" className="rounded-xl" onClick={() => setShowSendForm(false)}>Hủy</Button>
                                    <Button size="sm"
                                        className={`rounded-xl gap-2 border hover:opacity-90 ${TYPE_CONFIG[sendFormData.type].bgColor} ${TYPE_CONFIG[sendFormData.type].textColor} ${TYPE_CONFIG[sendFormData.type].borderColor}`}
                                        onClick={() => setConfirmOpen(true)}
                                        disabled={!sendFormData.title.trim() || !sendFormData.content.trim()}>
                                        <PaperAirplaneIcon className="w-3.5 h-3.5" />Gửi ngay
                                    </Button>
                                </div>
                            </div>
                        )}

                        {/* Timeline */}
                        {timeline.length === 0 ? (
                            <div className="bg-white rounded-2xl border border-border p-8 text-center">
                                <BellIcon className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                                <p className="text-sm text-muted-foreground">Chưa có thông báo nào</p>
                            </div>
                        ) : (
                            <div className="relative pl-6">
                                <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-border/60" />
                                <div className="space-y-4">
                                    {timeline.map((item) => {
                                        const cfg = TYPE_CONFIG[item.type];
                                        const Icon = cfg.icon;
                                        const isHighlight = item.type === "WARNING" || item.type === "ERROR";
                                        return (
                                            <div key={item.id} className="relative flex gap-4">
                                                <div className={`absolute -left-6 mt-3 w-5 h-5 rounded-full ${cfg.dotColor} flex items-center justify-center ring-4 ring-background shrink-0 z-10`}>
                                                    <Icon className="w-2.5 h-2.5 text-white" />
                                                </div>
                                                <div className={`flex-1 rounded-2xl border p-4 ${isHighlight ? `${cfg.bgColor} ${cfg.borderColor} shadow-sm` : "bg-white border-border"}`}>
                                                    <div className="flex items-center gap-2 flex-wrap mb-1">
                                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
                                                            <Icon className="w-3 h-3" />{cfg.label}
                                                        </span>
                                                        {!item.is_read && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">Chưa đọc</span>}
                                                    </div>
                                                    <h4 className={`font-semibold text-sm ${isHighlight ? cfg.textColor : "text-foreground"}`}>{item.title}</h4>
                                                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.content}</p>
                                                    <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" />{fmt(item.created_at)}</span>
                                                        {item.sender && <span className="flex items-center gap-1"><BellIcon className="w-3 h-3" />{item.sender}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Ban Dialog */}
            <Dialog open={banDialogOpen} onOpenChange={(o) => { if (!isBanning) setBanDialogOpen(o); }}>
                <DialogContent className="sm:max-w-md p-6">
                    <DialogHeader className="mb-4">
                        <DialogTitle className="text-xl">Khóa tài khoản</DialogTitle>
                        <DialogDescription className="text-slate-500">
                            Bạn đang thực hiện khóa tài khoản <strong>{displayName}</strong> trong 7 ngày.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label htmlFor="ban-reason">Lý do khóa <span className="text-red-500">*</span></Label>
                            <Textarea
                                id="ban-reason"
                                placeholder="Nhập lý do chi tiết..."
                                value={banReason}
                                onChange={(e) => setBanReason(e.target.value)}
                                rows={4}
                                className="rounded-xl border-slate-200 focus:border-red-300 focus:ring-red-50"
                            />
                        </div>
                    </div>
                    <DialogFooter className="mt-6 gap-2">
                        <Button variant="outline" onClick={() => setBanDialogOpen(false)} disabled={isBanning} className="rounded-xl h-11 px-6">Hủy</Button>
                        <Button
                            variant="destructive"
                            onClick={handleBan}
                            disabled={!banReason.trim() || isBanning}
                            loading={isBanning}
                            className="rounded-xl h-11 px-8"
                        >
                            Xác nhận khóa
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Confirm Dialog */}
            <Dialog open={confirmOpen} onOpenChange={o => { if (!isSending) setConfirmOpen(o); }}>
                <DialogContent className="sm:max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                            Xác nhận gửi thông báo
                        </DialogTitle>
                        <DialogDescription>
                            Gửi <strong>{TYPE_CONFIG[sendFormData.type].label}</strong> đến <strong>{displayName}</strong>. Hành động sẽ ghi lại vĩnh viễn.
                        </DialogDescription>
                    </DialogHeader>
                    <div className={`rounded-xl border p-4 space-y-1 ${TYPE_CONFIG[sendFormData.type].bgColor} ${TYPE_CONFIG[sendFormData.type].borderColor}`}>
                        <p className={`font-semibold text-sm ${TYPE_CONFIG[sendFormData.type].textColor}`}>{sendFormData.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{sendFormData.content}</p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={isSending} className="rounded-xl">Hủy</Button>
                        <Button onClick={handleConfirmSend} disabled={isSending}
                            className="rounded-xl gap-2 bg-amber-500 hover:bg-amber-600 text-white">
                            {isSending ? "Đang gửi..." : <><PaperAirplaneIcon className="w-4 h-4" />Xác nhận gửi</>}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-center gap-3">
            <span className="text-slate-400 shrink-0">{icon}</span>
            <span className="text-xs text-slate-500 w-24 shrink-0">{label}</span>
            <span className="text-sm font-medium text-slate-800">{value}</span>
        </div>
    );
}

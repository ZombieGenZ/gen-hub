"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import {
    UserManagementService,
    type User,
    type Warning,
    type Session,
} from "@/services/user-management/user-management.service";
import { RoleService, type Role } from "@/services/role/role.service";
import { WarningCategoryService, type WarningCategory } from "@/services/warning-category/warning-category.service";
import { useBreadcrumbLabel } from "@/components/providers/breadcrumb-provider";
import { toast } from "sonner";
import { ArrowLeftIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";
import {
    ShieldOff, ShieldCheck, AlertTriangle, CheckCircle2, Clock, XCircle,
    KeyRound, Plus, Trash2, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const svc = new UserManagementService();
const roleSvc = new RoleService();
const warnCatSvc = new WarningCategoryService();

function formatDate(iso: string) {
    return new Date(iso).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function StatusBadge({ user }: { user: User }) {
    if (user.is_banned) return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1"><XCircle className="w-3 h-3" />Bị khóa</Badge>;
    if (!user.is_verified) return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1"><Clock className="w-3 h-3" />Chưa xác thực</Badge>;
    if (user.warning_count > 0) return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 gap-1"><AlertTriangle className="w-3 h-3" />{user.warning_count} cảnh cáo</Badge>;
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1"><CheckCircle2 className="w-3 h-3" />Hoạt động</Badge>;
}

function roleStyle(name: string) {
    const n = name.toLowerCase();
    if (n === "admin") return "bg-purple-50 text-purple-700 border-purple-200";
    if (n === "manager") return "bg-blue-50 text-blue-700 border-blue-200";
    if (n === "staff") return "bg-cyan-50 text-cyan-700 border-cyan-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
}

// ── Ban Dialog ──────────────────────────────────────────────────────────────
function BanDialog({ user, open, onClose, onSuccess }: {
    user: User | null; open: boolean; onClose: () => void; onSuccess: () => void;
}) {
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const handleBan = async () => {
        if (!user || !reason.trim()) return;
        const token = authStorage.getAccessToken();
        if (!token) return;
        setLoading(true);
        try {
            await svc.banUser(token, user.id, { reason: reason.trim(), is_permanent: false, duration_value: 7, duration_type: "days" });
            toast.success(`Đã khóa tài khoản ${user.name || user.full_name || user.email} trong 7 ngày`);
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Không thể khóa tài khoản");
        } finally {
            setLoading(false);
            setReason("");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-6">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl">Khóa tài khoản</DialogTitle>
                    <DialogDescription className="text-slate-500">
                        Bạn đang thực hiện khóa tài khoản <strong>{user?.name || user?.full_name || user?.email}</strong>.
                        Mặc định sẽ khóa trong 7 ngày.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Lý do khóa <span className="text-red-500">*</span></Label>
                        <Textarea
                            placeholder="Nhập lý do chi tiết để thông báo cho người dùng..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            className="rounded-xl border-slate-200 focus:border-red-300 focus:ring-red-50"
                        />
                    </div>
                </div>
                <DialogFooter className="mt-6 gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-xl h-11 px-6">Hủy</Button>
                    <Button
                        variant="destructive"
                        onClick={handleBan}
                        disabled={!reason.trim() || loading}
                        loading={loading}
                        className="rounded-xl h-11 px-8"
                    >
                        Xác nhận khóa
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Warn Dialog ─────────────────────────────────────────────────────────────
function WarnDialog({ userId, categories, open, onClose, onSuccess }: {
    userId: string; categories: WarningCategory[];
    open: boolean; onClose: () => void; onSuccess: () => void;
}) {
    const [categoryId, setCategoryId] = useState("");
    const [reason, setReason] = useState("");
    const [isPermanent, setIsPermanent] = useState(false);
    const [durationValue, setDurationValue] = useState("7");
    const [durationType, setDurationType] = useState<"hours" | "days" | "weeks" | "months">("days");
    const [loading, setLoading] = useState(false);

    const reset = () => { setCategoryId(""); setReason(""); setIsPermanent(false); setDurationValue("7"); setDurationType("days"); };

    const handleWarn = async () => {
        if (!categoryId || !reason.trim()) return;
        const token = authStorage.getAccessToken();
        if (!token) return;
        setLoading(true);
        try {
            await svc.warnUser(token, userId, {
                category_id: categoryId,
                reason: reason.trim(),
                is_permanent: isPermanent,
                ...(!isPermanent ? { duration_value: Number(durationValue), duration_type: durationType } : {}),
            });
            toast.success("Đã gửi cảnh cáo vi phạm thành công");
            onSuccess();
            onClose();
            reset();
        } catch (err: any) {
            toast.error(err.message || "Không thể gửi cảnh cáo");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
            <DialogContent className="sm:max-w-md p-6">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl">Gửi cảnh cáo mới</DialogTitle>
                    <DialogDescription className="text-slate-500">Cảnh cáo sẽ được ghi lại trong hồ sơ vi phạm của người dùng.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-2">
                    <div className="space-y-2">
                        <Label>Danh mục vi phạm <span className="text-red-500">*</span></Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                            <SelectTrigger className="rounded-xl h-11 border-slate-200">
                                <SelectValue placeholder="Chọn loại vi phạm..." />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {categories.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Lý do chi tiết <span className="text-red-500">*</span></Label>
                        <Textarea
                            placeholder="Mô tả cụ thể hành vi vi phạm..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={3}
                            className="rounded-xl border-slate-200"
                        />
                    </div>
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="space-y-0.5">
                            <Label htmlFor="permanent" className="text-sm font-semibold cursor-pointer">Cảnh cáo vĩnh viễn</Label>
                            <p className="text-xs text-slate-500">Hình phạt sẽ không bao giờ tự hết hạn</p>
                        </div>
                        <Switch id="permanent" checked={isPermanent} onCheckedChange={setIsPermanent} />
                    </div>
                    {!isPermanent && (
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Thời hạn hiệu lực</Label>
                                <Input type="number" min={1} value={durationValue}
                                    onChange={(e) => setDurationValue(e.target.value)}
                                    className="rounded-xl h-11 border-slate-200" />
                            </div>
                            <div className="space-y-2">
                                <Label>Đơn vị thời gian</Label>
                                <Select value={durationType} onValueChange={(v) => setDurationType(v as any)}>
                                    <SelectTrigger className="rounded-xl h-11 border-slate-200"><SelectValue /></SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="hours">Giờ</SelectItem>
                                        <SelectItem value="days">Ngày</SelectItem>
                                        <SelectItem value="weeks">Tuần</SelectItem>
                                        <SelectItem value="months">Tháng</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>
                <DialogFooter className="mt-6 gap-2">
                    <Button variant="outline" onClick={() => { onClose(); reset(); }} disabled={loading} className="rounded-xl h-11 px-6">Hủy</Button>
                    <Button
                        className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl h-11 px-8"
                        onClick={handleWarn}
                        disabled={!categoryId || !reason.trim() || loading}
                        loading={loading}
                    >
                        Xác nhận gửi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Assign Roles Dialog ─────────────────────────────────────────────────────
function AssignRolesDialog({ userId, allRoles, currentRoleIds, open, onClose, onSuccess }: {
    userId: string; allRoles: Role[]; currentRoleIds: string[];
    open: boolean; onClose: () => void; onSuccess: () => void;
}) {
    const [selected, setSelected] = useState<string[]>(currentRoleIds);
    const [loading, setLoading] = useState(false);

    useEffect(() => { if (open) setSelected(currentRoleIds); }, [open, currentRoleIds]);

    const toggle = (id: string) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);

    const handleSave = async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        setLoading(true);
        try {
            await svc.assignUserRolesAndPermissions(token, userId, { role_ids: selected });
            toast.success("Đã cập nhật vai trò");
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Không thể cập nhật vai trò");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Phân quyền vai trò</DialogTitle>
                    <DialogDescription>Chọn vai trò cho người dùng này.</DialogDescription>
                </DialogHeader>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {allRoles.length === 0 && <p className="text-sm text-slate-400 text-center py-4">Không có vai trò nào</p>}
                    {allRoles.map((role) => (
                        <label key={role.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            selected.includes(role.id) ? "border-brand bg-brand/5" : "border-slate-200 hover:border-slate-300"
                        }`}>
                            <input
                                type="checkbox"
                                checked={selected.includes(role.id)}
                                onChange={() => toggle(role.id)}
                                className="accent-brand w-4 h-4"
                            />
                            <div>
                                <p className="text-sm font-medium text-slate-800">{role.name}</p>
                                {role.description && <p className="text-xs text-slate-500">{role.description}</p>}
                            </div>
                        </label>
                    ))}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-xl">Hủy</Button>
                    <Button
                        className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl"
                        onClick={handleSave}
                        disabled={loading}
                        loading={loading}
                    >
                        {loading ? "Đang lưu..." : "Lưu thay đổi"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Main Page ────────────────────────────────────────────────────────────────
export default function UserDetailPage() {
    const router = useRouter();
    const params = useParams();
    const userId = params?.id as string;

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
    const [allRoles, setAllRoles] = useState<Role[]>([]);
    const [warnCategories, setWarnCategories] = useState<WarningCategory[]>([]);
    const [activeTab, setActiveTab] = useState("overview");
    const [banDialogOpen, setBanDialogOpen] = useState(false);
    const [warnDialogOpen, setWarnDialogOpen] = useState(false);
    const [assignRolesOpen, setAssignRolesOpen] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [resendVerifyOpen, setResendVerifyOpen] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useBreadcrumbLabel(user?.name || user?.full_name || user?.email);

    const fetchUser = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) { router.push("/login"); return; }
        setLoading(true);
        try {
            const res = await svc.findById(token, userId);
            setUser(res.data);
        } catch (err: any) {
            toast.error(err.message || "Không thể tải thông tin người dùng");
            router.push("/dashboard/admin/users");
        } finally {
            setLoading(false);
        }
    }, [userId, router]);

    const fetchWarnings = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        try {
            const res = await svc.findUserWarnings(token, userId, { limit: 50 });
            setWarnings(res?.data?.items ?? []);
        } catch (err: any) {
            toast.error("Lỗi khi tải lịch sử cảnh cáo: " + (err.message || "Không xác định"));
        }
    }, [userId]);

    const fetchSessions = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        try {
            const res = await svc.findUserSessions(token, userId, { limit: 20 });
            setSessions(res?.data?.items ?? []);
        } catch (err: any) {
            toast.error("Lỗi khi tải phiên đăng nhập: " + (err.message || "Không xác định"));
        }
    }, [userId]);

    const fetchRoles = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        try {
            const res = await svc.getUserRolesAndPermissions(token, userId);
            setRoles(res.data?.roles ?? []);
        } catch (err: any) {
            toast.error("Lỗi khi tải vai trò hiện tại: " + (err.message || "Không xác định"));
        }
    }, [userId]);

    useEffect(() => { fetchUser(); }, [fetchUser]);
    useEffect(() => { fetchRoles(); }, [fetchRoles]);
    useEffect(() => {
        if (activeTab === "warnings") fetchWarnings();
        if (activeTab === "sessions") fetchSessions();
    }, [activeTab, fetchWarnings, fetchSessions]);

    // Preload all roles and warn categories for dialogs
    useEffect(() => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        roleSvc.findMany(token, { limit: 100 }).then((res) => setAllRoles(res?.data?.items ?? [])).catch((err: any) => {
            toast.error("Lỗi khi tải danh sách vai trò: " + (err.message || "Không xác định"));
        });
        warnCatSvc.findAllActive(token).then((res) => setWarnCategories(res?.data ?? [])).catch((err: any) => {
            toast.error("Lỗi khi tải danh mục vi phạm: " + (err.message || "Không xác định"));
        });
    }, []);

    const handleUnban = async () => {
        const token = authStorage.getAccessToken();
        if (!token || !user) return;
        setProcessingId("unban");
        try {
            await svc.unbanUser(token, user.id);
            toast.success(`Đã mở khóa tài khoản ${user.name || user.full_name || user.email} thành công`);
            fetchUser();
        } catch (err: any) {
            toast.error(err.message || "Không thể mở khóa tài khoản");
        } finally {
            setProcessingId(null);
        }
    };

    const handleRevokeSession = async (sessionId: string) => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        setProcessingId(`revoke-${sessionId}`);
        try {
            await svc.revokeSession(token, userId, sessionId);
            toast.success("Đã thu hồi phiên đăng nhập thành công");
            fetchSessions();
        } catch (err: any) {
            toast.error(err.message || "Không thể thu hồi phiên");
        } finally {
            setProcessingId(null);
        }
    };

    const handleRevokeAllSessions = async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        setProcessingId("revoke-all");
        try {
            await svc.revokeAllSessions(token, userId);
            toast.success("Đã thu hồi toàn bộ phiên đăng nhập thành công");
            fetchSessions();
        } catch (err: any) {
            toast.error(err.message || "Không thể thu hồi phiên");
        } finally {
            setProcessingId(null);
        }
    };

    const handleUnwarn = async (warningId: string) => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        setProcessingId(`unwarn-${warningId}`);
        try {
            await svc.unwarnUser(token, userId, warningId);
            toast.success("Đã gỡ cảnh cáo vi phạm thành công");
            fetchWarnings();
            fetchUser();
        } catch (err: any) {
            toast.error(err.message || "Không thể gỡ cảnh cáo");
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <div className="p-4 md:p-6 space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
            </div>
        );
    }

    if (!user) return null;

    const displayRoles = roles.length > 0 ? roles : (user.roles ?? []);

    return (
        <div className="p-4 md:p-6 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full shrink-0"
                        onClick={() => router.push("/dashboard/admin/users")}>
                        <ArrowLeftIcon className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-lg font-semibold text-slate-900 leading-tight">{user.name || user.full_name || "Người dùng"}</h1>
                        <p className="text-xs text-slate-500">{user.email}</p>
                    </div>
                    <StatusBadge user={user} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {user.is_banned ? (
                        <Button variant="outline" size="sm" className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50 rounded-xl h-9 px-4"
                            onClick={handleUnban} loading={processingId === "unban"} disabled={!!processingId}>
                            <ShieldCheck className="w-4 h-4" />Mở khóa
                        </Button>
                    ) : (
                        <Button variant="outline" size="sm" className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50 rounded-xl h-9 px-4"
                            onClick={() => setBanDialogOpen(true)} disabled={!!processingId}>
                            <ShieldOff className="w-4 h-4" />Khóa tài khoản
                        </Button>
                    )}
                    {!user.is_verified && (
                        <Button variant="outline" size="sm" className="gap-1.5 text-blue-600 border-blue-300 hover:bg-blue-50 rounded-xl h-9 px-4"
                            onClick={() => setResendVerifyOpen(true)} disabled={!!processingId}>
                            <CheckCircle2 className="w-4 h-4" />Gửi xác thực
                        </Button>
                    )}
                    <Button variant="outline" size="sm" className="gap-1.5 text-brand border-brand/30 hover:bg-brand/5 rounded-xl h-9 px-4"
                        onClick={() => setPasswordDialogOpen(true)} disabled={!!processingId}>
                        <KeyRound className="w-4 h-4" />Đổi mật khẩu
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-muted/30 h-auto p-1 rounded-xl">
                    <TabsTrigger value="overview" className="rounded-lg text-sm">Tổng quan</TabsTrigger>
                    <TabsTrigger value="warnings" className="rounded-lg text-sm">
                        Cảnh cáo {user.warning_count > 0 && (
                            <span className="ml-1 bg-orange-100 text-orange-700 rounded-full px-1.5 text-xs">{user.warning_count}</span>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="sessions" className="rounded-lg text-sm">Phiên đăng nhập</TabsTrigger>
                </TabsList>

                {/* Overview */}
                <TabsContent value="overview" className="mt-4">
                    <Card className="rounded-2xl border-slate-200 shadow-sm">
                        <CardContent className="p-5 space-y-4">
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                                <InfoField label="Họ tên" value={user.name || user.full_name || "—"} />
                                <InfoField label="Email" value={user.email} />
                                <InfoField label="Điện thoại" value={user.phone || "—"} />
                                <InfoField label="Ngày tham gia" value={formatDate(user.created_at)} />
                            </dl>
                            <div className="border-t border-slate-100 pt-3">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                                        <span className="text-xs font-medium text-slate-500">Vai trò</span>
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2.5 text-xs rounded-lg gap-1"
                                        onClick={() => setAssignRolesOpen(true)}
                                    >
                                        <Plus className="w-3 h-3" />Phân quyền
                                    </Button>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {displayRoles.length === 0 ? (
                                        <span className="text-sm text-slate-400">Người dùng thông thường</span>
                                    ) : displayRoles.map((r) => (
                                        <Badge key={r.id} variant="outline" className={`text-xs ${roleStyle(r.name)}`}>{r.name}</Badge>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Warnings */}
                <TabsContent value="warnings" className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-slate-500">Danh sách cảnh cáo của người dùng</p>
                        <Button
                            size="sm"
                            className="gap-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs h-8"
                            onClick={() => setWarnDialogOpen(true)}
                        >
                            <AlertTriangle className="w-3.5 h-3.5" />Gửi cảnh cáo
                        </Button>
                    </div>
                    <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-600">Danh mục</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Lý do</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Trạng thái</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Hạn / Ngày tạo</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-600">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {warnings.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-10 text-slate-400 text-sm">Không có cảnh cáo nào</TableCell>
                                    </TableRow>
                                ) : warnings.map((w) => {
                                    const isExpired = !w.is_active && !w.removed_by && !!w.expires_at;
                                    const isRemoved = !w.is_active && !!w.removed_by;
                                    const statusLabel = w.is_active ? "Hiệu lực" : isRemoved ? "Đã gỡ" : "Hết hạn";
                                    const statusClass = w.is_active
                                        ? "bg-orange-50 text-orange-700 border-orange-200"
                                        : isRemoved
                                        ? "bg-slate-50 text-slate-500 border-slate-200"
                                        : "bg-yellow-50 text-yellow-700 border-yellow-200";
                                    const severityColor = !w.category ? "" :
                                        w.category.severity >= 4 ? "text-red-600" :
                                        w.category.severity >= 2 ? "text-orange-600" :
                                        "text-yellow-600";
                                    return (
                                        <TableRow key={w.id} className="hover:bg-slate-50/50">
                                            <TableCell>
                                                <div className="space-y-0.5">
                                                    <p className={`text-xs font-medium ${severityColor}`}>
                                                        {w.category?.name ?? "—"}
                                                    </p>
                                                    {w.category && (
                                                        <p className="text-xs text-slate-400">Mức {w.category.severity}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-700 max-w-[200px]">
                                                <p className="truncate" title={w.reason}>{w.reason}</p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-xs ${statusClass}`}>
                                                    {statusLabel}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-500 whitespace-nowrap">
                                                <p>{w.is_permanent ? "Vĩnh viễn" : w.expires_at ? formatDate(w.expires_at) : "—"}</p>
                                                <p className="text-slate-400">{formatDate(w.created_at)}</p>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {w.is_active && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg gap-1"
                                                        onClick={() => handleUnwarn(w.id)}
                                                        loading={processingId === `unwarn-${w.id}`}
                                                        disabled={!!processingId}
                                                    >
                                                        <Trash2 className="w-3 h-3" />Gỡ
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* Sessions */}
                <TabsContent value="sessions" className="mt-4">
                    <div className="flex items-center justify-between mb-3">
                        <p className="text-sm text-slate-500">
                            {sessions.length > 0 ? `${sessions.length} phiên đang hoạt động` : "Các phiên đăng nhập"}
                        </p>
                        {sessions.length > 1 && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 rounded-xl text-xs h-8"
                                onClick={handleRevokeAllSessions}
                            >
                                <LogOut className="w-3.5 h-3.5" />Thu hồi tất cả
                            </Button>
                        )}
                    </div>
                    <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-600">Thiết bị / Trình duyệt</TableHead>
                                    <TableHead className="font-semibold text-slate-600">IP</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Đăng nhập lúc</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-600">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10 text-slate-400 text-sm">Không có phiên nào</TableCell>
                                    </TableRow>
                                ) : sessions.map((s) => {
                                    const browser = parseBrowser(s.device);
                                    const osName = parseOs(s.os);
                                    const cleanIp = s.ip?.replace(/^::ffff:/, "") ?? "—";
                                    return (
                                        <TableRow key={s.id} className="hover:bg-slate-50/50">
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <ComputerDesktopIcon className="w-4 h-4 text-slate-400 shrink-0" />
                                                    <div>
                                                        <p className="text-sm text-slate-700">{browser}</p>
                                                        <p className="text-xs text-slate-400">{osName}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-500 font-mono">{cleanIp}</TableCell>
                                            <TableCell className="text-sm text-slate-500 whitespace-nowrap">{formatDate(s.created_at)}</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="sm"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs h-7 px-2"
                                                    onClick={() => handleRevokeSession(s.id)}
                                                    loading={processingId === `revoke-${s.id}`}
                                                    disabled={!!processingId}
                                                >
                                                    Thu hồi
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>

            <BanDialog user={user} open={banDialogOpen} onClose={() => setBanDialogOpen(false)} onSuccess={fetchUser} />
            <WarnDialog
                userId={userId}
                categories={warnCategories}
                open={warnDialogOpen}
                onClose={() => setWarnDialogOpen(false)}
                onSuccess={() => { fetchWarnings(); fetchUser(); }}
            />
            <AssignRolesDialog
                userId={userId}
                allRoles={allRoles}
                currentRoleIds={displayRoles.map((r) => r.id)}
                open={assignRolesOpen}
                onClose={() => setAssignRolesOpen(false)}
                onSuccess={() => { fetchRoles(); fetchUser(); }}
            />
            <ChangePasswordDialog
                userId={userId}
                open={passwordDialogOpen}
                onClose={() => setPasswordDialogOpen(false)}
                onSuccess={fetchUser}
            />
            <ResendVerificationDialog
                user={user}
                open={resendVerifyOpen}
                onClose={() => setResendVerifyOpen(false)}
                onSuccess={fetchUser}
            />
        </div>
    );
}

function parseBrowser(ua?: string): string {
    if (!ua) return "Trình duyệt không rõ";
    if (ua.includes("Edg/")) return "Microsoft Edge";
    if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
    if (ua.includes("Firefox/")) return "Firefox";
    if (ua.includes("Chrome/")) return "Chrome";
    if (ua.includes("Safari/")) return "Safari";
    return "Trình duyệt không rõ";
}

// ── Change Password Dialog ──────────────────────────────────────────────────
function ChangePasswordDialog({ userId, open, onClose, onSuccess }: {
    userId: string; open: boolean; onClose: () => void; onSuccess: () => void;
}) {
    const [newPassword, setNewPassword] = useState("");
    const [adminPassword, setAdminPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const reset = () => { setNewPassword(""); setAdminPassword(""); };

    const handleSave = async () => {
        if (!newPassword || !adminPassword) return;
        const token = authStorage.getAccessToken();
        if (!token) return;
        setLoading(true);
        try {
            await svc.changePassword(token, userId, {
                new_password: newPassword,
                admin_password: adminPassword,
            });
            toast.success("Đã đổi mật khẩu thành công");
            onSuccess();
            onClose();
            reset();
        } catch (err: any) {
            toast.error(err.message || "Không thể đổi mật khẩu");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
            <DialogContent className="sm:max-w-md p-6">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl">Đổi mật khẩu người dùng</DialogTitle>
                    <DialogDescription className="text-slate-500">Nhập mật khẩu mới cho người dùng và mật khẩu của bạn để xác nhận.</DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="new-password">Mật khẩu mới</Label>
                        <Input
                            id="new-password"
                            type="password"
                            placeholder="Nhập mật khẩu mới..."
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="rounded-xl h-11"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="admin-password">Mật khẩu Admin (Của bạn)</Label>
                        <Input
                            id="admin-password"
                            type="password"
                            placeholder="Xác nhận bằng mật khẩu của bạn..."
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            className="rounded-xl h-11"
                        />
                    </div>
                </div>
                <DialogFooter className="mt-6 gap-2">
                    <Button variant="outline" onClick={() => { onClose(); reset(); }} disabled={loading} className="rounded-xl">Hủy</Button>
                    <Button
                        className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl"
                        onClick={handleSave}
                        disabled={!newPassword || !adminPassword || loading}
                        loading={loading}
                    >
                        Xác nhận đổi
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Resend Verification Dialog ───────────────────────────────────────────────
function ResendVerificationDialog({ user, open, onClose, onSuccess }: {
    user: User | null; open: boolean; onClose: () => void; onSuccess: () => void;
}) {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!user) return;
        const token = authStorage.getAccessToken();
        if (!token) return;
        setLoading(true);
        try {
            await svc.resendVerification(token, user.id);
            toast.success(`Đã gửi email xác thực đến ${user.email}`);
            onSuccess();
            onClose();
        } catch (err: any) {
            toast.error(err.message || "Không thể gửi email xác thực");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md p-6">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl">Gửi lại email xác thực</DialogTitle>
                    <div className="text-slate-500 text-base">
                        Hệ thống sẽ gửi một email xác thực mới đến địa chỉ:
                        <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-900 text-center">
                            {user?.email}
                        </div>
                    </div>
                </DialogHeader>
                <DialogFooter className="mt-6 gap-2">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="rounded-xl h-11 px-6">Hủy</Button>
                    <Button
                        className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl h-11 px-8"
                        onClick={handleConfirm}
                        disabled={loading}
                        loading={loading}
                    >
                        Xác nhận gửi email
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function parseOs(os?: string): string {
    if (!os) return "Hệ điều hành không rõ";
    // API trả về chuỗi có dấu ngoặc kép thừa, vd: "\"Windows\""
    const cleaned = os.replace(/^"+|"+$/g, "").replace(/\\"/g, "").trim();
    return cleaned || "Hệ điều hành không rõ";
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-slate-400">{label}</dt>
            <dd className="text-sm font-medium text-slate-800">{value}</dd>
        </div>
    );
}

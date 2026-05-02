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
import { useBreadcrumbLabel } from "@/components/providers/breadcrumb-provider";
import { toast } from "sonner";
import { ArrowLeftIcon, ComputerDesktopIcon } from "@heroicons/react/24/outline";
import {
    ShieldOff,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    Clock,
    XCircle,
    KeyRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

const svc = new UserManagementService();

function formatDate(iso: string) {
    return new Date(iso).toLocaleString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function StatusBadge({ user }: { user: User }) {
    if (user.is_banned)
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 gap-1"><XCircle className="w-3 h-3" />Bị khóa</Badge>;
    if (!user.is_verified)
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 gap-1"><Clock className="w-3 h-3" />Chưa xác thực</Badge>;
    if (user.warning_count > 0)
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 gap-1"><AlertTriangle className="w-3 h-3" />{user.warning_count} cảnh cáo</Badge>;
    return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1"><CheckCircle2 className="w-3 h-3" />Hoạt động</Badge>;
}

function roleStyle(name: string) {
    const n = name.toLowerCase();
    if (n === "admin") return "bg-purple-50 text-purple-700 border-purple-200";
    if (n === "manager") return "bg-blue-50 text-blue-700 border-blue-200";
    if (n === "staff") return "bg-cyan-50 text-cyan-700 border-cyan-200";
    return "bg-slate-50 text-slate-600 border-slate-200";
}

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
            await svc.banUser(token, user.id, { reason: reason.trim(), is_permanent: false, duration_value: 7, duration_type: "DAYS" });
            toast.success(`Đã khóa tài khoản ${user.name || user.full_name || user.email}`);
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
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Khóa tài khoản</DialogTitle>
                    <DialogDescription>Khóa <strong>{user?.name || user?.full_name || user?.email}</strong> trong 7 ngày.</DialogDescription>
                </DialogHeader>
                <Textarea placeholder="Lý do khóa tài khoản..." value={reason} onChange={(e) => setReason(e.target.value)} rows={3} />
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>Hủy</Button>
                    <Button variant="destructive" onClick={handleBan} disabled={!reason.trim() || loading} loading={loading}>Xác nhận khóa</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function UserDetailPage() {
    const router = useRouter();
    const params = useParams();
    const userId = params?.id as string;

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [warnings, setWarnings] = useState<Warning[]>([]);
    const [sessions, setSessions] = useState<Session[]>([]);
    const [roles, setRoles] = useState<Array<{ id: string; name: string }>>([]);
    const [activeTab, setActiveTab] = useState("overview");
    const [banDialogOpen, setBanDialogOpen] = useState(false);

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
            const res = await svc.findUserWarnings(token, userId, { limit: 20 });
            setWarnings(res?.data?.items ?? (res as any)?.items ?? []);
        } catch { /* silent */ }
    }, [userId]);

    const fetchSessions = useCallback(async () => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        try {
            const res = await svc.findUserSessions(token, userId, { limit: 20 });
            setSessions(res?.data?.items ?? (res as any)?.items ?? []);
        } catch { /* silent */ }
    }, [userId]);

    useEffect(() => { fetchUser(); }, [fetchUser]);
    useEffect(() => {
        if (activeTab === "warnings") fetchWarnings();
        if (activeTab === "sessions") fetchSessions();
    }, [activeTab, fetchWarnings, fetchSessions]);
    useEffect(() => {
        const fetchRoles = async () => {
            const token = authStorage.getAccessToken();
            if (!token) return;
            try {
                const res = await svc.getUserRolesAndPermissions(token, userId);
                setRoles(res.data?.roles ?? []);
            } catch { /* silent */ }
        };
        if (userId) fetchRoles();
    }, [userId]);

    const handleUnban = async () => {
        const token = authStorage.getAccessToken();
        if (!token || !user) return;
        try {
            await svc.unbanUser(token, user.id);
            toast.success(`Đã mở khóa ${user.name || user.full_name || user.email}`);
            fetchUser();
        } catch (err: any) {
            toast.error(err.message || "Không thể mở khóa tài khoản");
        }
    };

    const handleRevokeSession = async (sessionId: string) => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        try {
            await svc.revokeSession(token, userId, sessionId);
            toast.success("Đã thu hồi phiên đăng nhập");
            fetchSessions();
        } catch (err: any) {
            toast.error(err.message || "Không thể thu hồi phiên");
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
                {user.is_banned ? (
                    <Button variant="outline" size="sm" className="gap-1.5 text-green-600 border-green-300 hover:bg-green-50 rounded-xl"
                        onClick={handleUnban}>
                        <ShieldCheck className="w-3.5 h-3.5" />Mở khóa
                    </Button>
                ) : (
                    <Button variant="outline" size="sm" className="gap-1.5 text-red-600 border-red-300 hover:bg-red-50 rounded-xl"
                        onClick={() => setBanDialogOpen(true)}>
                        <ShieldOff className="w-3.5 h-3.5" />Khóa tài khoản
                    </Button>
                )}
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="bg-muted/30 h-auto p-1 rounded-xl">
                    <TabsTrigger value="overview" className="rounded-lg text-sm">Tổng quan</TabsTrigger>
                    <TabsTrigger value="warnings" className="rounded-lg text-sm">
                        Cảnh cáo {user.warning_count > 0 && <span className="ml-1 bg-orange-100 text-orange-700 rounded-full px-1.5 text-xs">{user.warning_count}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="sessions" className="rounded-lg text-sm">Phiên đăng nhập</TabsTrigger>
                </TabsList>

                {/* Overview */}
                <TabsContent value="overview" className="mt-4">
                    <Card className="rounded-2xl border-slate-200 shadow-sm">
                        <CardContent className="p-5 space-y-4">
                            {/* Info grid */}
                            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                                <InfoField label="Họ tên" value={user.name || user.full_name || "—"} />
                                <InfoField label="Email" value={user.email} />
                                <InfoField label="Điện thoại" value={user.phone || "—"} />
                                <InfoField label="Ngày tham gia" value={formatDate(user.created_at)} />
                            </dl>

                            {/* Divider + Roles */}
                            <div className="border-t border-slate-100 pt-3">
                                <div className="flex items-center gap-2 mb-2">
                                    <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                                    <span className="text-xs font-medium text-slate-500">Vai trò</span>
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
                    <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-600">Lý do</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Trạng thái</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Hạn</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Ngày tạo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {warnings.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10 text-slate-400 text-sm">Không có cảnh cáo nào</TableCell>
                                    </TableRow>
                                ) : warnings.map((w) => (
                                    <TableRow key={w.id} className="hover:bg-slate-50/50">
                                        <TableCell className="text-sm text-slate-700 max-w-xs truncate">{w.reason}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={
                                                w.status === "active"
                                                    ? "bg-orange-50 text-orange-700 border-orange-200 text-xs"
                                                    : "bg-slate-50 text-slate-500 border-slate-200 text-xs"
                                            }>
                                                {w.status === "active" ? "Đang hiệu lực" : w.status === "expired" ? "Hết hạn" : "Đã gỡ"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-500 whitespace-nowrap">
                                            {w.is_permanent ? "Vĩnh viễn" : w.expires_at ? formatDate(w.expires_at) : "—"}
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-500 whitespace-nowrap">{formatDate(w.created_at)}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* Sessions */}
                <TabsContent value="sessions" className="mt-4">
                    <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="font-semibold text-slate-600">Thiết bị</TableHead>
                                    <TableHead className="font-semibold text-slate-600">IP</TableHead>
                                    <TableHead className="font-semibold text-slate-600">Hoạt động lần cuối</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-600">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sessions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-10 text-slate-400 text-sm">Không có phiên nào</TableCell>
                                    </TableRow>
                                ) : sessions.map((s) => (
                                    <TableRow key={s.id} className="hover:bg-slate-50/50">
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm text-slate-700">
                                                <ComputerDesktopIcon className="w-4 h-4 text-slate-400 shrink-0" />
                                                <span>{s.device_name || "Thiết bị không rõ"}</span>
                                                {s.is_current && <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">Hiện tại</Badge>}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-500 font-mono">{s.ip_address || "—"}</TableCell>
                                        <TableCell className="text-sm text-slate-500 whitespace-nowrap">{formatDate(s.last_active_at)}</TableCell>
                                        <TableCell className="text-right">
                                            {!s.is_current && (
                                                <Button variant="ghost" size="sm"
                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg text-xs h-7 px-2"
                                                    onClick={() => handleRevokeSession(s.id)}>
                                                    Thu hồi
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>

            <BanDialog user={user} open={banDialogOpen} onClose={() => setBanDialogOpen(false)} onSuccess={fetchUser} />
        </div>
    );
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-0.5">
            <dt className="text-xs text-slate-400">{label}</dt>
            <dd className="text-sm font-medium text-slate-800">{value}</dd>
        </div>
    );
}

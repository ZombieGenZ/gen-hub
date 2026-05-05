"use client";

import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
    DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    Search, Plus, MoreHorizontal, User, Eye,
    ShieldOff, ShieldCheck, AlertTriangle, CheckCircle2,
    Clock, XCircle, ChevronLeft, ChevronRight,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    UserManagementService,
    type User as ManagedUser,
} from "@/services/user-management/user-management.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { toast } from "sonner";

const svc = new UserManagementService();
const LIMIT = 20;

type StatusFilter = "all" | "active" | "banned" | "unverified";

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "Tất cả" },
    { key: "active", label: "Hoạt động" },
    { key: "banned", label: "Bị khóa" },
    { key: "unverified", label: "Chưa xác thực" },
];

function getStatusConfig(user: ManagedUser) {
    if (user.is_banned) return { label: "Bị khóa", icon: <XCircle className="w-3 h-3" />, className: "bg-red-50 text-red-700 border-red-200" };
    if (!user.is_verified) return { label: "Chưa xác thực", icon: <Clock className="w-3 h-3" />, className: "bg-yellow-50 text-yellow-700 border-yellow-200" };
    if (user.warning_count > 0) return { label: `Hoạt động · ${user.warning_count} cảnh cáo`, icon: <AlertTriangle className="w-3 h-3" />, className: "bg-orange-50 text-orange-700 border-orange-200" };
    return { label: "Hoạt động", icon: <CheckCircle2 className="w-3 h-3" />, className: "bg-green-50 text-green-700 border-green-200" };
}

// ── Create User Dialog ────────────────────────────────────────────────────────
function CreateUserDialog({ open, onClose, onSuccess }: {
    open: boolean; onClose: () => void; onSuccess: () => void;
}) {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    const reset = () => { setName(""); setEmail(""); setPassword(""); };

    const handleCreate = async () => {
        if (!name.trim() || !email.trim() || !password.trim()) return;
        const token = authStorage.getAccessToken();
        if (!token) return;
        setLoading(true);
        try {
            await svc.createUser(token, { name: name.trim(), email: email.trim(), password: password.trim() });
            toast.success(`Đã tạo tài khoản "${name}" thành công`);
            onSuccess();
            onClose();
            reset();
        } catch (err: any) {
            toast.error(err.message || "Không thể tạo tài khoản");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); reset(); } }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Thêm nhân viên mới</DialogTitle>
                    <DialogDescription>Tạo tài khoản mới cho nhân viên. Sau khi tạo, hãy phân quyền từ trang chi tiết.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                    <div className="space-y-1.5">
                        <Label>Họ tên <span className="text-red-500">*</span></Label>
                        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nguyễn Văn A" className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Email <span className="text-red-500">*</span></Label>
                        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" className="rounded-xl" />
                    </div>
                    <div className="space-y-1.5">
                        <Label>Mật khẩu <span className="text-red-500">*</span></Label>
                        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Tối thiểu 8 ký tự" className="rounded-xl" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => { onClose(); reset(); }} disabled={loading} className="rounded-xl">Hủy</Button>
                    <Button
                        className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-xl"
                        onClick={handleCreate}
                        disabled={!name.trim() || !email.trim() || !password.trim() || loading}
                        loading={loading}
                    >
                        {loading ? "Đang tạo..." : "Tạo tài khoản"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ── Ban Dialog ────────────────────────────────────────────────────────────────
function BanDialog({ user, open, onClose, onSuccess }: {
    user: ManagedUser | null; open: boolean; onClose: () => void; onSuccess: () => void;
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
                        Hệ thống sẽ tạm dừng quyền truy cập của người dùng này.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Lý do khóa <span className="text-red-500">*</span></Label>
                        <Textarea
                            placeholder="Nhập lý do chi tiết..."
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            rows={4}
                            className="rounded-xl border-slate-200 focus:border-red-300 focus:ring-red-50"
                        />
                        <p className="text-xs text-slate-400 italic">* Mặc định khóa trong 7 ngày. Bạn có thể thay đổi thời hạn trong trang chi tiết.</p>
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

// ── Main Page ────────────────────────────────────────────────────────────────
export default function StaffPage() {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [staffList, setStaffList] = useState<ManagedUser[]>([]);
    const [total, setTotal] = useState(0);
    const [offset, setOffset] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [banTarget, setBanTarget] = useState<ManagedUser | null>(null);
    const [resendTarget, setResendTarget] = useState<ManagedUser | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchStaff = async (kw = searchTerm, status = statusFilter, off = offset) => {
        setIsLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const query: any = { keywords: kw, limit: LIMIT, offset: off };
            if (status !== "all") query.status = status;
            const res = await svc.findMany(token, query);
            setStaffList(res?.data?.items ?? []);
            setTotal(res?.data?.total ?? 0);
        } catch (err: any) {
            toast.error(err.message || "Không thể tải danh sách người dùng");
            setStaffList([]);
            setTotal(0);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        setOffset(0);
    }, [searchTerm, statusFilter]);

    useEffect(() => {
        const timer = setTimeout(() => fetchStaff(searchTerm, statusFilter, offset), 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, statusFilter, offset]);

    const handleUnban = async (user: ManagedUser) => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        setProcessingId(`unban-${user.id}`);
        try {
            await svc.unbanUser(token, user.id);
            toast.success(`Đã mở khóa tài khoản ${user.name || user.full_name || user.email} thành công`);
            fetchStaff();
        } catch (err: any) {
            toast.error(err.message || "Không thể mở khóa tài khoản");
        } finally {
            setProcessingId(null);
        }
    };

    const totalPages = Math.ceil(total / LIMIT);
    const currentPage = Math.floor(offset / LIMIT) + 1;

    return (
        <div className="flex flex-col flex-1 h-full bg-slate-50/50">
            <main className="flex-1 p-4 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Người dùng</h1>
                        <p className="text-sm text-slate-500 mt-1">Quản lý nhân sự và phân quyền truy cập</p>
                    </div>
                    <Button
                        className="bg-brand hover:bg-brand-hover text-white gap-2 rounded-xl shadow-sm shadow-brand/20"
                        onClick={() => setCreateOpen(true)}
                    >
                        <Plus className="w-4 h-4" />
                        Thêm nhân viên
                    </Button>
                </div>

                {/* Search + Filter */}
                <div className="flex flex-col sm:flex-row gap-3 mb-5">
                    <div className="relative w-full max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm theo tên, email..."
                            className="pl-9 h-9 bg-white border-slate-200 focus:ring-brand/20 rounded-xl text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-1 p-1 bg-white border border-slate-200 rounded-xl">
                        {STATUS_TABS.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setStatusFilter(tab.key)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    statusFilter === tab.key
                                        ? "bg-slate-900 text-white shadow-sm"
                                        : "text-slate-500 hover:text-slate-700"
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="font-semibold text-slate-700">Người dùng</TableHead>
                                <TableHead className="font-semibold text-slate-700">Vai trò</TableHead>
                                <TableHead className="font-semibold text-slate-700">Cảnh cáo</TableHead>
                                <TableHead className="font-semibold text-slate-700">Trạng thái</TableHead>
                                <TableHead className="font-semibold text-slate-700 text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-slate-400 text-sm">Đang tải dữ liệu...</TableCell>
                                </TableRow>
                            ) : staffList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-slate-400 text-sm">Không tìm thấy người dùng nào</TableCell>
                                </TableRow>
                            ) : staffList.map((staff) => {
                                const status = getStatusConfig(staff);
                                return (
                                    <TableRow key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900 text-sm">{staff.name || staff.full_name || "—"}</div>
                                                    <div className="text-xs text-slate-500">{staff.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {(!staff.roles || staff.roles.length === 0) && (
                                                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs">Người dùng</Badge>
                                                )}
                                                {staff.roles?.map((r) => {
                                                    const n = r.name?.toLowerCase();
                                                    const cfg = n === "admin" ? "bg-purple-50 text-purple-700 border-purple-200"
                                                        : n === "manager" ? "bg-blue-50 text-blue-700 border-blue-200"
                                                        : n === "staff" ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                                        : "bg-slate-50 text-slate-600 border-slate-200";
                                                    return <Badge key={r.id} variant="outline" className={`text-xs ${cfg}`}>{r.name}</Badge>;
                                                })}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {staff.warning_count > 0 ? (
                                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs gap-1">
                                                    <AlertTriangle className="w-3 h-3" />{staff.warning_count}
                                                </Badge>
                                            ) : <span className="text-xs text-slate-400">—</span>}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-xs gap-1.5 ${status.className}`}>
                                                {status.icon}{status.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-xl">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-44">
                                                    <DropdownMenuItem className="gap-2 cursor-pointer" onClick={() => router.push(`/dashboard/admin/users/${staff.id}`)}>
                                                        <Eye className="w-4 h-4" />Xem chi tiết
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {staff.is_banned ? (
                                                        <DropdownMenuItem className="gap-2 cursor-pointer text-green-600 focus:text-green-700" onClick={() => handleUnban(staff)}>
                                                            <ShieldCheck className="w-4 h-4" />Mở khóa
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem className="gap-2 cursor-pointer text-red-600 focus:text-red-700" onClick={() => setBanTarget(staff)}>
                                                            <ShieldOff className="w-4 h-4" />Khóa tài khoản
                                                        </DropdownMenuItem>
                                                    )}
                                                    {(!staff.is_verified) && !staff.is_banned && (
                                                        <DropdownMenuItem className="gap-2 cursor-pointer text-blue-600 focus:text-blue-700" onClick={() => setResendTarget(staff)}>
                                                            <CheckCircle2 className="w-4 h-4" />Gửi xác thực
                                                        </DropdownMenuItem>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {total > LIMIT && (
                        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                            <p className="text-xs text-slate-500">
                                {offset + 1}–{Math.min(offset + LIMIT, total)} / {total} người dùng
                            </p>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg"
                                    disabled={offset === 0 || isLoading}
                                    onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                                >
                                    <ChevronLeft className="w-4 h-4" />
                                </Button>
                                <div className="flex items-center px-3 text-xs font-medium text-slate-700">
                                    {currentPage} / {totalPages}
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg"
                                    disabled={offset + LIMIT >= total || isLoading}
                                    onClick={() => setOffset(offset + LIMIT)}
                                >
                                    <ChevronRight className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <CreateUserDialog open={createOpen} onClose={() => setCreateOpen(false)} onSuccess={() => fetchStaff()} />
            <BanDialog user={banTarget} open={!!banTarget} onClose={() => setBanTarget(null)} onSuccess={() => fetchStaff()} />
            <ResendVerificationDialog user={resendTarget} open={!!resendTarget} onClose={() => setResendTarget(null)} onSuccess={() => fetchStaff()} />
        </div>
    );
}

// ── Resend Verification Dialog ───────────────────────────────────────────────
function ResendVerificationDialog({ user, open, onClose, onSuccess }: {
    user: ManagedUser | null; open: boolean; onClose: () => void; onSuccess: () => void;
}) {
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
        if (!user) return;
        const token = authStorage.getAccessToken();
        if (!token) return;
        setLoading(true);
        try {
            await svc.resendVerification(token, user.id);
            toast.success(`Đã gửi email xác thực đến ${user.email} thành công`);
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
                    <DialogDescription className="text-slate-500">
                        Hệ thống sẽ gửi một email xác thực mới đến địa chỉ:
                        <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 font-medium text-slate-900 text-center">
                            {user?.email}
                        </div>
                    </DialogDescription>
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

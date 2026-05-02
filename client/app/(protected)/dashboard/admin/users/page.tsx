"use client";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    Search,
    Plus,
    MoreHorizontal,
    MapPin,
    User,
    Eye,
    ShieldOff,
    ShieldCheck,
    AlertTriangle,
    CheckCircle2,
    Clock,
    XCircle,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
    UserManagementService,
    type User as ManagedUser,
} from "@/services/user-management/user-management.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import { toast } from "sonner";

const userManagementService = new UserManagementService();

// ── Status config ────────────────────────────────────────────────────────────
function getStatusConfig(user: ManagedUser) {
    if (user.is_banned) {
        return {
            label: "Bị khóa",
            icon: <XCircle className="w-3 h-3" />,
            className: "bg-red-50 text-red-700 border-red-200",
        };
    }
    if (!user.is_verified) {
        return {
            label: "Chưa xác thực",
            icon: <Clock className="w-3 h-3" />,
            className: "bg-yellow-50 text-yellow-700 border-yellow-200",
        };
    }
    if (user.warning_count > 0) {
        return {
            label: `Hoạt động · ${user.warning_count} cảnh cáo`,
            icon: <AlertTriangle className="w-3 h-3" />,
            className: "bg-orange-50 text-orange-700 border-orange-200",
        };
    }
    return {
        label: "Hoạt động",
        icon: <CheckCircle2 className="w-3 h-3" />,
        className: "bg-green-50 text-green-700 border-green-200",
    };
}

// ── Ban Dialog ────────────────────────────────────────────────────────────────
function BanDialog({
    user,
    open,
    onClose,
    onSuccess,
}: {
    user: ManagedUser | null;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}) {
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);

    const handleBan = async () => {
        if (!user || !reason.trim()) return;
        const token = authStorage.getAccessToken();
        if (!token) return;
        setLoading(true);
        try {
            await userManagementService.banUser(token, user.id, {
                reason: reason.trim(),
                is_permanent: false,
                duration_value: 7,
                duration_type: "DAYS",
            });
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
                    <DialogDescription>
                        Khóa tài khoản <strong>{user?.name || user?.full_name || user?.email}</strong> trong 7 ngày.
                    </DialogDescription>
                </DialogHeader>
                <Textarea
                    placeholder="Lý do khóa tài khoản..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                />
                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Hủy
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleBan}
                        disabled={!reason.trim() || loading}
                        loading={loading}
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
    const [staffList, setStaffList] = useState<ManagedUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [banTarget, setBanTarget] = useState<ManagedUser | null>(null);

    const fetchStaff = async (keywords = "") => {
        setIsLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const res = await userManagementService.findMany(token, { keywords, limit: 50 });
            setStaffList(res?.data?.items ?? (res as any)?.items ?? []);
        } catch (error) {
            console.error("Failed to fetch staff", error);
            setStaffList([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => fetchStaff(searchTerm), 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    const handleUnban = async (user: ManagedUser) => {
        const token = authStorage.getAccessToken();
        if (!token) return;
        try {
            await userManagementService.unbanUser(token, user.id);
            toast.success(`Đã mở khóa tài khoản ${user.name || user.full_name || user.email}`);
            fetchStaff(searchTerm);
        } catch (err: any) {
            toast.error(err.message || "Không thể mở khóa tài khoản");
        }
    };

    return (
        <div className="flex flex-col flex-1 h-full bg-slate-50/50">
            <main className="flex-1 p-4 md:p-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Người dùng</h1>
                        <p className="text-sm text-slate-500 mt-1">Quản lý nhân sự và phân quyền truy cập</p>
                    </div>
                    <Button className="bg-brand hover:bg-brand-hover text-white gap-2 rounded-xl shadow-sm shadow-brand/20">
                        <Plus className="w-4 h-4" />
                        Thêm nhân viên
                    </Button>
                </div>

                {/* Search */}
                <div className="mb-6">
                    <div className="relative w-full max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Tìm kiếm theo tên, email..."
                            className="pl-9 h-9 bg-white border-slate-200 focus:ring-brand/20 transition-all rounded-xl text-sm"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
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
                                    <TableCell colSpan={5} className="text-center py-10 text-slate-400 text-sm">
                                        Đang tải dữ liệu...
                                    </TableCell>
                                </TableRow>
                            ) : staffList.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-10 text-slate-400 text-sm">
                                        Không tìm thấy người dùng nào
                                    </TableCell>
                                </TableRow>
                            ) : staffList.map((staff) => {
                                const status = getStatusConfig(staff);
                                return (
                                    <TableRow key={staff.id} className="hover:bg-slate-50/50 transition-colors">
                                        {/* Người dùng */}
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-900 text-sm">
                                                        {staff.name || staff.full_name || "—"}
                                                    </div>
                                                    <div className="text-xs text-slate-500">{staff.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>

                                        {/* Vai trò */}
                                        <TableCell>
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                {(!staff.roles || staff.roles.length === 0) && (
                                                    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs">
                                                        Người dùng
                                                    </Badge>
                                                )}
                                                {staff.roles?.map((r) => {
                                                    const name = r.name?.toLowerCase();
                                                    const cfg =
                                                        name === "admin"
                                                            ? "bg-purple-50 text-purple-700 border-purple-200"
                                                            : name === "manager"
                                                            ? "bg-blue-50 text-blue-700 border-blue-200"
                                                            : name === "staff"
                                                            ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                                            : "bg-slate-50 text-slate-600 border-slate-200";
                                                    return (
                                                        <Badge key={r.id} variant="outline" className={`text-xs ${cfg}`}>
                                                            {r.name}
                                                        </Badge>
                                                    );
                                                })}
                                            </div>
                                        </TableCell>

                                        {/* Cảnh cáo */}
                                        <TableCell>
                                            {staff.warning_count > 0 ? (
                                                <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs gap-1">
                                                    <AlertTriangle className="w-3 h-3" />
                                                    {staff.warning_count}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-slate-400">—</span>
                                            )}
                                        </TableCell>

                                        {/* Trạng thái */}
                                        <TableCell>
                                            <Badge variant="outline" className={`text-xs gap-1.5 ${status.className}`}>
                                                {status.icon}
                                                {status.label}
                                            </Badge>
                                        </TableCell>

                                        {/* Thao tác */}
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-slate-400 hover:text-slate-900 rounded-xl"
                                                    >
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-44">
                                                    <DropdownMenuItem
                                                        className="gap-2 cursor-pointer"
                                                        onClick={() => router.push(`/dashboard/admin/users/${staff.id}`)}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                        Xem chi tiết
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    {staff.is_banned ? (
                                                        <DropdownMenuItem
                                                            className="gap-2 cursor-pointer text-green-600 focus:text-green-700"
                                                            onClick={() => handleUnban(staff)}
                                                        >
                                                            <ShieldCheck className="w-4 h-4" />
                                                            Mở khóa
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        <DropdownMenuItem
                                                            className="gap-2 cursor-pointer text-red-600 focus:text-red-700"
                                                            onClick={() => setBanTarget(staff)}
                                                        >
                                                            <ShieldOff className="w-4 h-4" />
                                                            Khóa tài khoản
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
                </div>
            </main>

            {/* Ban confirmation dialog */}
            <BanDialog
                user={banTarget}
                open={!!banTarget}
                onClose={() => setBanTarget(null)}
                onSuccess={() => fetchStaff(searchTerm)}
            />
        </div>
    );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import {
    warehouseVisitService,
    type WarehouseVisitBooking,
    type VisitStatus,
} from "@/services/warehouse-visit/warehouse-visit.service";
import WarehouseVisitBookingForm from "@/components/warehouse/WarehouseVisitBookingForm";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    Calendar,
    Loader2,
    Plus,
    Eye,
    Check,
    X,
    Clock,
    RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";

const STATUS_LABELS: Record<VisitStatus, string> = {
    PENDING: "Chờ duyệt",
    CONFIRMED: "Đã duyệt",
    CANCELLED: "Đã hủy",
    COMPLETED: "Hoàn thành",
};

const STATUS_VARIANTS: Record<VisitStatus, "default" | "secondary" | "destructive" | "outline"> = {
    PENDING: "secondary",
    CONFIRMED: "default",
    CANCELLED: "destructive",
    COMPLETED: "outline",
};

export default function OrgWarehouseVisitsPage() {
    const router = useRouter();
    const { showToast } = useToast();

    const [visits, setVisits] = useState<WarehouseVisitBooking[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<VisitStatus | "ALL">("ALL");
    const [total, setTotal] = useState(0);

    // Detail drawer
    const [selectedVisit, setSelectedVisit] = useState<WarehouseVisitBooking | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    // Approve/Reject
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [rejectingVisit, setRejectingVisit] = useState<WarehouseVisitBooking | null>(null);

    // Create form
    const [showCreateForm, setShowCreateForm] = useState(false);

    const fetchVisits = useCallback(async () => {
        setLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            const params: any = { limit: 50 };
            if (statusFilter !== "ALL") params.status = statusFilter;

            const result = await warehouseVisitService.getBookings(token, params);
            setVisits(result.data);
            setTotal(result.total);
        } catch (err) {
            console.error("Failed to fetch visits", err);
            showToast("Không thể tải danh sách lịch tham quan", "error");
        } finally {
            setLoading(false);
        }
    }, [statusFilter, showToast]);

    useEffect(() => {
        fetchVisits();
    }, [fetchVisits]);

    const handleApprove = async (visit: WarehouseVisitBooking) => {
        setProcessingId(visit.id);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await warehouseVisitService.approveBooking(token, visit.id, {
                action: "APPROVE",
                confirmation_notes: "Đã xác nhận lịch tham quan",
            });
            showToast("Đã duyệt lịch tham quan", "success");
            fetchVisits();
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Không thể duyệt lịch hẹn", "error");
        } finally {
            setProcessingId(null);
        }
    };

    const openRejectDialog = (visit: WarehouseVisitBooking) => {
        setRejectingVisit(visit);
        setRejectReason("");
        setShowRejectDialog(true);
    };

    const handleReject = async () => {
        if (!rejectingVisit) return;
        setProcessingId(rejectingVisit.id);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await warehouseVisitService.approveBooking(token, rejectingVisit.id, {
                action: "REJECT",
                rejection_reason: rejectReason || "Không phù hợp",
            });
            showToast("Đã từ chối lịch tham quan", "success");
            setShowRejectDialog(false);
            setRejectingVisit(null);
            fetchVisits();
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Không thể từ chối lịch hẹn", "error");
        } finally {
            setProcessingId(null);
        }
    };

    const handleCancel = async (visit: WarehouseVisitBooking) => {
        setProcessingId(visit.id);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await warehouseVisitService.deleteBooking(token, visit.id);
            showToast("Đã hủy lịch tham quan", "success");
            fetchVisits();
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Không thể hủy lịch hẹn", "error");
        } finally {
            setProcessingId(null);
        }
    };

    const formatDate = (str: string) => {
        try {
            return format(new Date(str), "dd/MM/yyyy");
        } catch {
            return str;
        }
    };

    const pendingCount = visits.filter((v) => v.status === "PENDING").length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Lịch tham quan kho</h1>
                    <p className="text-sm text-muted-foreground">
                        Quản lý lịch hẹn tham quan kho bãi
                        {pendingCount > 0 && (
                            <span className="ml-2 text-orange-600">
                                · {pendingCount} đang chờ duyệt
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchVisits} disabled={loading}>
                        <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                        Làm mới
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
                {(["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const).map((status) => (
                    <Button
                        key={status}
                        variant={statusFilter === status ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStatusFilter(status)}
                    >
                        {status === "ALL" ? "Tất cả" : STATUS_LABELS[status]}
                        {status === "PENDING" && pendingCount > 0 && (
                            <Badge variant="destructive" className="ml-1.5 h-5 px-1.5 text-xs">
                                {pendingCount}
                            </Badge>
                        )}
                    </Button>
                ))}
            </div>

            {/* Table */}
            <div className="rounded-xl border bg-card">
                {loading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : visits.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                        <Calendar className="w-10 h-10 mb-3 opacity-40" />
                        <p>Chưa có lịch tham quan nào</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Khách tham quan</TableHead>
                                <TableHead>Ngày</TableHead>
                                <TableHead>Giờ</TableHead>
                                <TableHead>Mục đích</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visits.map((visit) => (
                                <TableRow key={visit.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium text-sm">{visit.visitor_name}</p>
                                            <p className="text-xs text-muted-foreground">{visit.visitor_email}</p>
                                            {visit.visitor_phone && (
                                                <p className="text-xs text-muted-foreground">{visit.visitor_phone}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {formatDate(visit.visit_date)}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {visit.visit_time_start} - {visit.visit_time_end}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {visit.purpose === "RENTAL_INQUIRY" ? "Tìm hiểu thuê" : "Kiểm tra kho"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={STATUS_VARIANTS[visit.status]}>
                                            {STATUS_LABELS[visit.status]}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={() => {
                                                    setSelectedVisit(visit);
                                                    setShowDetail(true);
                                                }}
                                                title="Xem chi tiết"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Button>
                                            {visit.status === "PENDING" && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => handleApprove(visit)}
                                                        disabled={processingId === visit.id}
                                                        title="Duyệt"
                                                    >
                                                        {processingId === visit.id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Check className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => openRejectDialog(visit)}
                                                        disabled={processingId === visit.id}
                                                        title="Từ chối"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            )}
                                            {visit.status === "CONFIRMED" && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-red-600 hover:text-red-700"
                                                    onClick={() => handleCancel(visit)}
                                                    disabled={processingId === visit.id}
                                                >
                                                    Hủy
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}

                {!loading && total > 0 && (
                    <div className="px-4 py-3 border-t text-sm text-muted-foreground">
                        Hiển thị {visits.length} / {total} lịch hẹn
                    </div>
                )}
            </div>

            {/* Detail Dialog */}
            <Dialog open={showDetail} onOpenChange={setShowDetail}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5" />
                            Chi tiết lịch tham quan
                        </DialogTitle>
                    </DialogHeader>
                    {selectedVisit && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-muted-foreground">Khách</span>
                                    <p className="font-medium">{selectedVisit.visitor_name}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Trạng thái</span>
                                    <p>
                                        <Badge variant={STATUS_VARIANTS[selectedVisit.status]}>
                                            {STATUS_LABELS[selectedVisit.status]}
                                        </Badge>
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Email</span>
                                    <p className="font-medium">{selectedVisit.visitor_email}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Điện thoại</span>
                                    <p className="font-medium">{selectedVisit.visitor_phone || "—"}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Ngày</span>
                                    <p className="font-medium">{formatDate(selectedVisit.visit_date)}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Giờ</span>
                                    <p className="font-medium">
                                        {selectedVisit.visit_time_start} - {selectedVisit.visit_time_end}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Mục đích</span>
                                    <p className="font-medium">
                                        {selectedVisit.purpose === "RENTAL_INQUIRY" ? "Tìm hiểu thuê" : "Kiểm tra kho"}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Số người</span>
                                    <p className="font-medium">{selectedVisit.number_of_visitors || 1}</p>
                                </div>
                            </div>

                            {selectedVisit.confirmation_notes && (
                                <div className="text-sm">
                                    <span className="text-muted-foreground">Ghi chú xác nhận</span>
                                    <p className="mt-1 p-2 bg-muted rounded text-sm">{selectedVisit.confirmation_notes}</p>
                                </div>
                            )}

                            {selectedVisit.cancel_reason && (
                                <div className="text-sm">
                                    <span className="text-muted-foreground">Lý do hủy</span>
                                    <p className="mt-1 p-2 bg-red-50 dark:bg-red-950/20 rounded text-sm text-red-700 dark:text-red-400">
                                        {selectedVisit.cancel_reason}
                                    </p>
                                </div>
                            )}

                            <div className="text-xs text-muted-foreground">
                                Tạo lúc: {format(new Date(selectedVisit.created_at), "dd/MM/yyyy HH:mm")}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Từ chối lịch tham quan</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Từ chối lịch hẹn của <strong>{rejectingVisit?.visitor_name}</strong> vào ngày{" "}
                            {rejectingVisit && formatDate(rejectingVisit.visit_date)}
                        </p>
                        <Textarea
                            placeholder="Lý do từ chối..."
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            rows={3}
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            Hủy
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={processingId !== null}
                        >
                            {processingId !== null && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                            Từ chối
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

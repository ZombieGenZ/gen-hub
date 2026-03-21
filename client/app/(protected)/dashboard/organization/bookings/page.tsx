"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authStorage } from "@/services/auth/auth-storage.service";
import { rentalContractService } from "@/services/rental-contract/rental-contract.service";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Loader2, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";

interface Contract {
    id: string;
    code: string;
    status: string;
    created_at: string;
    total_price: number;
    details?: {
        warehouse_template?: {
            name: string;
        }
    }[];
}

export default function BookingManagementPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [bookings, setBookings] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const token = authStorage.getAccessToken();
                // Filter specifically for PENDING contracts (Bookings)
                const data: any = await rentalContractService.getRentalContracts(token || "", {
                    status: "PENDING",
                    limit: 20
                });
                if (data && data.items) {
                    setBookings(data.items);
                } else if (Array.isArray(data)) {
                    setBookings(data);
                }
            } catch (error) {
                console.error("Failed to fetch bookings", error);
                // showToast("Không thể tải danh sách yêu cầu", "error");
            } finally {
                setLoading(false);
            }
        };

        fetchBookings();
    }, [showToast]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "PENDING":
                return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Chờ xử lý</Badge>;
            case "APPROVED": // Assuming there might be an approved state before active
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Đã duyệt</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Yêu cầu thuê kho</h1>
                <p className="text-muted-foreground">Theo dõi và quản lý các yêu cầu đặt kho của bạn.</p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-brand" />
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">Chưa có yêu cầu nào</h3>
                        <p className="text-muted-foreground mb-4">Bạn chưa gửi yêu cầu thuê kho nào.</p>
                        <Button onClick={() => router.push("/dashboard/organization/warehouses")}>
                            Tìm kho ngay
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Mã yêu cầu</TableHead>
                                <TableHead>Thông tin kho</TableHead>
                                <TableHead>Ngày tạo</TableHead>
                                <TableHead>Giá trị (hàng tháng)</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="text-right">Hành động</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {bookings.map((booking) => (
                                <TableRow key={booking.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => {
                                    // Navigate to detail booking if needed
                                    // router.push(`/dashboard/organization/bookings/${booking.id}`)
                                }}>
                                    <TableCell className="font-medium">{booking.code}</TableCell>
                                    <TableCell>
                                        {booking.details?.[0]?.warehouse_template?.name || "Chi tiết đang cập nhật"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                                            {format(new Date(booking.created_at), "dd/MM/yyyy")}
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatCurrency(booking.total_price)}</TableCell>
                                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="gap-1">
                                            Chi tiết <ArrowRight className="w-3 h-3" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}

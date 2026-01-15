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
import { Calendar, FileCheck, Loader2, ArrowRight, Download } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";

interface Contract {
    id: string;
    code: string;
    status: string;
    started_at: string;
    expired_at?: string;
    total_price: number;
    details?: {
        warehouse_template?: {
            name: string;
        }
    }[];
}

export default function ContractManagementPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchContracts = async () => {
            try {
                const token = authStorage.getAccessToken();
                // Fetch ACTIVE, EXPIRED, etc. (Not PENDING)
                const data: any = await rentalContractService.getRentalContracts(token || "", {
                    status: "ACTIVE", // Or handle multiple statuses if API supports
                    limit: 100
                });
                if (data && data.items) {
                    setContracts(data.items);
                } else if (Array.isArray(data)) {
                    setContracts(data);
                }
            } catch (error) {
                console.error("Failed to fetch contracts", error);
            } finally {
                setLoading(false);
            }
        };

        fetchContracts();
    }, [showToast]);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "ACTIVE":
                return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Đang hiệu lực</Badge>;
            case "EXPIRED":
                return <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Đã hết hạn</Badge>;
            case "CANCELLED":
                return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Đã hủy</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Hợp đồng thuê kho</h1>
                <p className="text-muted-foreground">Quản lý các hợp đồng đang hoạt động và lịch sử thuê kho.</p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
                {loading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-brand" />
                    </div>
                ) : contracts.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <FileCheck className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold text-lg mb-1">Chưa có hợp đồng nào</h3>
                        <p className="text-muted-foreground">Các hợp đồng đã được duyệt sẽ xuất hiện tại đây.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Mã hợp đồng</TableHead>
                                <TableHead>Kho</TableHead>
                                <TableHead>Hiệu lực từ</TableHead>
                                <TableHead>Hết hạn</TableHead>
                                <TableHead>Giá trị</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="text-right">Hành động</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contracts.map((contract) => (
                                <TableRow key={contract.id} className="hover:bg-muted/40 cursor-pointer">
                                    <TableCell className="font-medium font-mono">{contract.code}</TableCell>
                                    <TableCell>
                                        {contract.details?.[0]?.warehouse_template?.name || "Kho"}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {format(new Date(contract.started_at), "dd/MM/yyyy")}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {contract.expired_at ? format(new Date(contract.expired_at), "dd/MM/yyyy") : "Vô thời hạn"}
                                    </TableCell>
                                    <TableCell>{formatCurrency(contract.total_price)}</TableCell>
                                    <TableCell>{getStatusBadge(contract.status)}</TableCell>
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" className="gap-1">
                                            <Download className="w-3 h-3" /> Tải về
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

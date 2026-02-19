"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    ArrowLeft,
    Download,
    RefreshCw,
    Ban,
    Loader2,
    FileText,
    CreditCard,
    History,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authStorage } from "@/services/auth/auth-storage.service";
import { rentalContractService } from "@/services/rental-contract/rental-contract.service";
import { getContractStatusBanner } from "@/components/contract/ContractStatusBadge";
import { ContractInfoSidebar } from "@/components/contract/ContractInfoSidebar";
import { PaymentHistory } from "@/components/contract/PaymentHistory";
import { StatusTimeline } from "@/components/contract/StatusTimeline";
import type { RentalContractDetail, ContractCancelType } from "@/types/rental-contracts/rental-contracts.type";

export default function AdminContractDetailPage() {
    const params = useParams();
    const router = useRouter();
    const contractId = params.id as string;

    const [contract, setContract] = useState<RentalContractDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("contract");

    // Cancel dialog
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelType, setCancelType] = useState<ContractCancelType>("ADMIN_REQUEST");
    const [cancelReason, setCancelReason] = useState("");
    const [cancelling, setCancelling] = useState(false);

    const fetchContract = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }
            setLoading(true);
            const res = await rentalContractService.getRentalContractById(token, contractId);
            const data = res?.data ?? res;
            setContract(data);
        } catch (err) {
            console.error("Failed to load contract", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchContract(); }, [contractId]);

    const handleCancel = async () => {
        if (!cancelReason.trim()) return;
        try {
            setCancelling(true);
            const token = authStorage.getAccessToken();
            if (!token) return;
            await rentalContractService.cancelRentalContract(token, contractId, {
                cancel_type: cancelType,
                cancel_reason: cancelReason,
            });
            setCancelOpen(false);
            setCancelReason("");
            fetchContract();
        } catch (err) {
            console.error("Cancel error", err);
        } finally {
            setCancelling(false);
        }
    };

    // ---------- Loading skeleton ----------
    if (loading) {
        return (
            <div className="flex flex-col flex-1 h-full bg-muted/40 p-4 md:p-8 space-y-6">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-6">
                    <div className="w-[320px] space-y-4 shrink-0">
                        <Skeleton className="h-24 w-full rounded-xl" />
                        <Skeleton className="h-40 w-full rounded-xl" />
                        <Skeleton className="h-32 w-full rounded-xl" />
                    </div>
                    <div className="flex-1 space-y-4">
                        <Skeleton className="h-14 w-full rounded-xl" />
                        <Skeleton className="h-64 w-full rounded-xl" />
                    </div>
                </div>
            </div>
        );
    }

    if (!contract) {
        return (
            <div className="flex flex-col items-center justify-center flex-1 h-full gap-4 text-muted-foreground p-8">
                <AlertTriangle className="w-12 h-12 opacity-40" />
                <p className="text-lg font-medium">Không tìm thấy hợp đồng</p>
                <Button variant="outline" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Quay lại
                </Button>
            </div>
        );
    }

    const banner = getContractStatusBanner(contract.status);
    const canCancel = ["PENDING", "ACTIVE", "OVERDUE_LEVEL_1"].includes(contract.status);
    const canRenew = ["ACTIVE", "OVERDUE_LEVEL_1"].includes(contract.status);

    return (
        <div className="flex flex-col flex-1 h-full bg-muted/40">
            <main className="flex-1 p-4 md:p-8 w-full space-y-6 max-w-[1440px] mx-auto">
                {/* Top nav */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/admin/contracts")}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-xl font-bold">{contract.code}</h1>
                            <p className="text-sm text-muted-foreground">{contract.name}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                            <Download className="w-4 h-4 mr-1.5" />
                            Tải PDF
                        </Button>
                        {canRenew && (
                            <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                                <RefreshCw className="w-4 h-4 mr-1.5" />
                                Gia hạn
                            </Button>
                        )}
                        {canCancel && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => setCancelOpen(true)}
                            >
                                <Ban className="w-4 h-4 mr-1.5" />
                                Hủy hợp đồng
                            </Button>
                        )}
                    </div>
                </div>

                {/* Status banner */}
                {banner && (
                    <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium", banner.className)}>
                        <banner.icon className="w-5 h-5 shrink-0" />
                        <span>{banner.message}</span>
                    </div>
                )}

                {/* Split layout: Sidebar (30%) + Content (70%) */}
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar */}
                    <aside className="w-full lg:w-[320px] shrink-0">
                        <ContractInfoSidebar
                            data={{
                                status: contract.status,
                                code: contract.code,
                                organization: contract.organization,
                                started_at: contract.started_at,
                                expired_at: contract.expired_at,
                                total_price: typeof contract.total_price === "string" ? parseFloat(contract.total_price) : contract.total_price,
                                discount_rate: contract.discount_rate,
                                final_price: typeof contract.final_price === "string" ? parseFloat(contract.final_price) : contract.final_price,
                                warehouses: contract.warehouses,
                                addons: contract.addons,
                                insurances: contract.insurances,
                                notes: contract.notes,
                                auto_renew: contract.auto_renew,
                                signers: contract.signers,
                            }}
                        />
                    </aside>

                    {/* Main content with tabs */}
                    <div className="flex-1 min-w-0">
                        <Tabs value={activeTab} onValueChange={setActiveTab}>
                            <TabsList className="bg-card border w-full justify-start">
                                <TabsTrigger value="contract" className="gap-1.5 data-[state=active]:bg-brand data-[state=active]:text-white">
                                    <FileText className="w-4 h-4" />
                                    Hợp đồng
                                </TabsTrigger>
                                <TabsTrigger value="payment" className="gap-1.5 data-[state=active]:bg-brand data-[state=active]:text-white">
                                    <CreditCard className="w-4 h-4" />
                                    Thanh toán
                                </TabsTrigger>
                                <TabsTrigger value="history" className="gap-1.5 data-[state=active]:bg-brand data-[state=active]:text-white">
                                    <History className="w-4 h-4" />
                                    Lịch sử
                                </TabsTrigger>
                            </TabsList>

                            {/* Contract tab — preview of the contract document */}
                            <TabsContent value="contract" className="mt-4">
                                <div className="bg-card rounded-xl border p-6 space-y-6">
                                    <div className="text-center space-y-1">
                                        <h2 className="text-lg font-bold">HỢP ĐỒNG THUÊ KHO</h2>
                                        <p className="text-sm text-muted-foreground">Mã: {contract.code}</p>
                                    </div>
                                    <Separator />

                                    {/* Basic contract info */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-muted-foreground">Bên cho thuê:</span>
                                            <p className="font-medium mt-0.5">GenHub Warehouse</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Bên thuê:</span>
                                            <p className="font-medium mt-0.5">{contract.organization?.name || "—"}</p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Kho thuê:</span>
                                            <p className="font-medium mt-0.5">
                                                {contract.warehouses?.map((w) => w.name).join(", ") || "—"}
                                            </p>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground">Phương thức thanh toán:</span>
                                            <p className="font-medium mt-0.5">
                                                {contract.payment_method === "TRANSFER" ? "Chuyển khoản" : contract.payment_method === "BALANCE" ? "Số dư" : contract.payment_method || "—"}
                                            </p>
                                        </div>
                                    </div>

                                    {contract.notes && (
                                        <>
                                            <Separator />
                                            <div>
                                                <span className="text-sm text-muted-foreground">Ghi chú:</span>
                                                <p className="text-sm mt-1 whitespace-pre-wrap">{contract.notes}</p>
                                            </div>
                                        </>
                                    )}

                                    {/* Cancel info */}
                                    {contract.status === "CANCELLED" && contract.cancel_reason && (
                                        <>
                                            <Separator />
                                            <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/50 rounded-lg p-4">
                                                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                                                    Lý do hủy: {contract.cancel_reason}
                                                </p>
                                                {contract.cancel_type && (
                                                    <p className="text-xs text-red-500 mt-1">
                                                        Loại: {contract.cancel_type === "CLIENT_REQUEST" ? "Yêu cầu khách" : contract.cancel_type === "ADMIN_REQUEST" ? "Admin" : contract.cancel_type === "VIOLATION" ? "Vi phạm" : contract.cancel_type}
                                                    </p>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </TabsContent>

                            {/* Payment tab */}
                            <TabsContent value="payment" className="mt-4">
                                <div className="bg-card rounded-xl border p-6">
                                    <PaymentHistory payments={contract.payments ?? []} />
                                </div>
                            </TabsContent>

                            {/* History tab */}
                            <TabsContent value="history" className="mt-4">
                                <div className="bg-card rounded-xl border p-6">
                                    <StatusTimeline
                                        events={
                                            contract.history?.map((h) => ({
                                                id: h.id,
                                                type: h.type as any,
                                                description: h.description,
                                                created_at: h.created_at,
                                                actor: h.actor,
                                                metadata: h.metadata,
                                            })) ?? []
                                        }
                                    />
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </main>

            {/* Cancel dialog */}
            <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Hủy hợp đồng</DialogTitle>
                        <DialogDescription>
                            Hành động này không thể hoàn tác. Hợp đồng <strong>{contract.code}</strong> sẽ chuyển sang trạng thái <em>Đã hủy</em>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Loại hủy</label>
                            <Select value={cancelType} onValueChange={(v) => setCancelType(v as ContractCancelType)}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ADMIN_REQUEST">Admin yêu cầu</SelectItem>
                                    <SelectItem value="CLIENT_REQUEST">Khách yêu cầu</SelectItem>
                                    <SelectItem value="VIOLATION">Vi phạm hợp đồng</SelectItem>
                                    <SelectItem value="NON_PAYMENT">Không thanh toán</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Lý do hủy <span className="text-red-500">*</span></label>
                            <Textarea
                                placeholder="Nhập lý do hủy hợp đồng..."
                                value={cancelReason}
                                onChange={(e) => setCancelReason(e.target.value)}
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCancelOpen(false)}>Đóng</Button>
                        <Button variant="destructive" onClick={handleCancel} disabled={!cancelReason.trim() || cancelling}>
                            {cancelling && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                            Xác nhận hủy
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

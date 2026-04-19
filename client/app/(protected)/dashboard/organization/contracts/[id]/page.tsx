"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
    ArrowLeft,
    Download,
    FileText,
    CreditCard,
    History,
    AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authStorage } from "@/services/auth/auth-storage.service";
import { rentalContractService } from "@/services/rental-contract/rental-contract.service";
import { orgHelper } from "@/lib/organization.utils";
import { getContractStatusBanner } from "@/components/contract/ContractStatusBadge";
import { ContractInfoSidebar } from "@/components/contract/ContractInfoSidebar";
import { PaymentHistory } from "@/components/contract/PaymentHistory";
import { StatusTimeline, type TimelineEvent } from "@/components/contract/StatusTimeline";
import { RequestRefundModal } from "@/components/contract/RequestRefundModal";
import { ManageAddonsModal } from "@/components/contract/ManageAddonsModal";
import { SePayQRModal, type SePayPaymentData } from "@/components/contract/SePayQRModal";
import type { RentalContractDetail } from "@/types/rental-contracts/rental-contracts.type";
import { useOrganizationRealtime } from "@/hooks/useOrganizationRealtime";
import { useUserRealtime } from "@/hooks/useUserRealtime";
import { useToast } from "@/contexts/ToastContext";
import { authService } from "@/services/auth/auth.service";

const CONTRACT_DETAIL_EVENTS = [
    "rentalContract:updated",
    "rentalContract:statusUpdated",
    "rentalContract:renewed",
    "rentalContract:deleted",
    "rentalContract:deletedMany",
];

export default function CustomerContractDetailPage() {
    const params = useParams();
    const router = useRouter();
    const contractId = params.id as string;
    const { showToast } = useToast();

    const [contract, setContract] = useState<RentalContractDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("contract");
    const [showRefundModal, setShowRefundModal] = useState(false);
    const [showAddonsModal, setShowAddonsModal] = useState(false);
    const [orgId, setOrgId] = useState<string | null>(null);
    const [userId, setUserId] = useState<string | null>(null);
    const [retryingPaymentId, setRetryingPaymentId] = useState<string | null>(null);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentData, setPaymentData] = useState<SePayPaymentData | null>(null);

    const refreshContract = async () => {
        try {
            const token = await authService.getValidAccessToken();
            if (!token) return;
            const currentOrgId = orgId || await orgHelper.getOrgId(token);
            if (!orgId) setOrgId(currentOrgId);
            const res = await rentalContractService.getOrgRentalContractFull(token, currentOrgId, contractId);
            setContract(res?.data ?? res);
            setFetchError(null);
        } catch (err) {
            console.error("Failed to refresh contract", err);
        }
    };

    useEffect(() => {
        const fetchContract = async () => {
            try {
                setLoading(true);
                setFetchError(null);

                const token = await authService.getValidAccessToken();
                if (!token) { router.push("/login"); return; }

                const currentUserId = authStorage.getUserID();
                setUserId(currentUserId);

                const currentOrgId = await orgHelper.getOrgId(token);
                setOrgId(currentOrgId);
                const res = await rentalContractService.getOrgRentalContractFull(token, currentOrgId, contractId);
                const data: RentalContractDetail = res?.data ?? res;
                setContract(data);
            } catch (err) {
                console.error("Failed to load contract", err);
                setFetchError(err instanceof Error ? err.message : "Không thể tải chi tiết hợp đồng");
            } finally {
                setLoading(false);
            }
        };
        fetchContract();
    }, [contractId, router]);

    const handleRetryPayment = async (paymentId?: string) => {
        try {
            const token = await authService.getValidAccessToken();
            if (!token) {
                router.push("/login");
                return;
            }

            const currentOrgId = orgId || await orgHelper.getOrgId(token);
            if (!orgId) {
                setOrgId(currentOrgId);
            }

            setRetryingPaymentId(paymentId ?? contractId);
            const result = await rentalContractService.retryPayment(token, currentOrgId, contractId);

            // Build payment data for QR modal
            const payment = result?.payment ?? result;
            const qrCode =
                payment?.qrCode ||
                payment?.qr_code_url ||
                payment?.qr_code;

            setPaymentData({
                paymentCode: payment?.payment_code || payment?.paymentCode,
                amount: payment?.amount,
                qrCode,
                qr_code: payment?.qr_code,
                qr_code_url: payment?.qr_code_url,
                payment_url: payment?.payment_url,
                expired_at: payment?.expired_at,
                description: payment?.description,
                bankInfo: result?.bankInfo ?? payment?.bankInfo,
                contractCode: contract?.code,
                contractName: contract?.name,
            });
            setShowPaymentModal(true);
        } catch (err) {
            const errMsg = err instanceof Error ? err.message : "";
            // If payment is still active, surface the existing pending payment
            if (errMsg.includes("payment_still_active")) {
                const pendingPayment = contract?.payments?.find(
                    (p) => p.status === "PENDING"
                );
                if (pendingPayment) {
                    setPaymentData({
                        paymentCode: pendingPayment.transaction_code,
                        amount: typeof pendingPayment.amount === "string"
                            ? parseFloat(pendingPayment.amount)
                            : pendingPayment.amount,
                        qrCode: pendingPayment.qr_code_url || pendingPayment.qr_code,
                        qr_code: pendingPayment.qr_code,
                        qr_code_url: pendingPayment.qr_code_url,
                        payment_url: pendingPayment.payment_url,
                        expired_at: pendingPayment.expired_at,
                        description: pendingPayment.description,
                        contractCode: contract?.code,
                        contractName: contract?.name,
                    });
                    setShowPaymentModal(true);
                } else {
                    await refreshContract();
                    setActiveTab("payment");
                    showToast("Giao dịch thanh toán vẫn đang hoạt động. Vui lòng kiểm tra ở tab Thanh toán.", "info");
                }
            } else {
                console.error("Failed to retry payment", err);
                showToast(errMsg || "Không thể tiếp tục thanh toán", "error");
            }
        } finally {
            setRetryingPaymentId(null);
        }
    };

    const handleSaveAddons = async (addonIds: string[], amenityIds: string[]) => {
        const token = await authService.getValidAccessToken();
        if (!token) throw new Error("Chưa đăng nhập");
        const currentOrgId = orgId || await orgHelper.getOrgId(token);
        if (!orgId) setOrgId(currentOrgId);
        await rentalContractService.updateOrgContractAddons(token, currentOrgId, contractId, addonIds);
        await refreshContract();
        showToast("Cập nhật dịch vụ thành công", "success");
    };

    useOrganizationRealtime({
        orgId,
        events: CONTRACT_DETAIL_EVENTS,
        enabled: !!orgId,
        onEvent: (eventName, payload) => {
            const data = payload as { contractId?: string; contractIds?: string[] } | undefined;
            const isExactContract = data?.contractId === contractId;
            const isDeletedManyContainCurrent = Array.isArray(data?.contractIds) && data.contractIds.includes(contractId);

            if (!isExactContract && !isDeletedManyContainCurrent) {
                return;
            }

            if (eventName === "rentalContract:deleted" || eventName === "rentalContract:deletedMany") {
                showToast("Hợp đồng đã bị hủy từ màn khác", "success");
                router.push("/dashboard/organization/contracts");
                return;
            }

            void refreshContract();
            showToast("Chi tiết hợp đồng đã được cập nhật realtime", "success");
        },
    });

    // Lắng nghe payment events từ user room
    useUserRealtime({
        userId,
        events: ["payment:paid", "contract:activated", "payment:expired", "payment:cancelled"],
        enabled: !!userId,
        onEvent: (eventName) => {
            if (eventName === "payment:paid" || eventName === "contract:activated") {
                void refreshContract();
                setActiveTab("payment");
                setShowPaymentModal(false);
                setPaymentData(null);
                showToast(
                    eventName === "payment:paid"
                        ? "Đã nhận được thanh toán thành công!"
                        : "Hợp đồng đã được kích hoạt",
                    "success"
                );
            } else if (eventName === "payment:expired" || eventName === "payment:cancelled") {
                void refreshContract();
                showToast("Giao dịch thanh toán đã hết hạn hoặc bị hủy", "info");
            }
        },
    });

    // ---------- Loading ----------
    if (loading) {
        return (
            <div className="space-y-6 p-4 md:p-8">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-6">
                    <div className="w-[320px] space-y-4 shrink-0">
                        <Skeleton className="h-24 w-full rounded-xl" />
                        <Skeleton className="h-40 w-full rounded-xl" />
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
                <p className="text-lg font-medium">
                    {fetchError || "Không tìm thấy hợp đồng"}
                </p>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Quầy lại
                    </Button>
                    {fetchError && (
                        <Button onClick={() => window.location.reload()}>
                            Thử lại
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    const banner = getContractStatusBanner(contract.status);

    return (
        <div className="space-y-6">
            {/* Top nav */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard/organization/contracts")}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold">{contract.code}</h1>
                        <p className="text-sm text-muted-foreground">{contract.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {contract.status === "PENDING" && (
                        <Button
                            size="sm"
                            onClick={() => handleRetryPayment()}
                            disabled={retryingPaymentId !== null}
                        >
                            <CreditCard className="w-4 h-4 mr-1.5" />
                            Tiếp tục thanh toán
                        </Button>
                    )}
                    {(contract.status === "ACTIVE" || contract.status.startsWith("OVERDUE")) && (
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowRefundModal(true)}
                        >
                            <AlertTriangle className="w-4 h-4 mr-1.5" />
                            Yêu cầu hoàn tiền / Thanh lý
                        </Button>
                    )}
                    <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-1.5" />
                        Tải PDF
                    </Button>
                </div>
            </div>

            {/* Status banner */}
            {banner && (
                <div className={cn("flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium", banner.className)}>
                    <banner.icon className="w-5 h-5 shrink-0" />
                    <span>{banner.message}</span>
                </div>
            )}

            {/* Split layout */}
            <div className="flex flex-col lg:flex-row gap-6">
                {/* Sidebar */}
                <aside className="w-full lg:w-[320px] shrink-0">
                    <ContractInfoSidebar
                        onManageAddons={
                            contract.status === "ACTIVE" || contract.status === "PENDING"
                                ? () => setShowAddonsModal(true)
                                : undefined
                        }
                        data={{
                            status: contract.status,
                            code: contract.code,
                            organization: contract.organization,
                            started_at: contract.started_at,
                            expired_at: contract.expired_at,
                            total_price: typeof contract.total_price === "string" ? parseFloat(contract.total_price) : contract.total_price,
                            discount_rate: contract.discount_rate,
                            vat_rate: contract.vat_rate,
                            vat_amount: contract.vat_amount,
                            final_price: typeof contract.final_price === "string" ? parseFloat(contract.final_price) : contract.final_price,
                            warehouses: contract.warehouses?.length ? contract.warehouses : contract.details?.map(d => ({
                                id: d.warehouse?.id || d.warehouse_template?.id || d.id,
                                name: d.warehouse?.name || d.warehouse_name || d.warehouse_template?.name || "—",
                            })) || [],
                            addons: contract.addons,
                            insurances: contract.insurances,
                            notes: contract.notes,
                            auto_renew: contract.auto_renew,
                            signers: contract.signers,
                        }}
                    />
                </aside>

                {/* Content tabs */}
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

                        {/* Contract tab */}
                        <TabsContent value="contract" className="mt-4">
                            <div className="bg-card rounded-xl border p-6 space-y-6">
                                <div className="text-center space-y-1">
                                    <h2 className="text-lg font-bold">HỢP ĐỒNG THUÊ KHO</h2>
                                    <p className="text-sm text-muted-foreground">Mã: {contract.code}</p>
                                </div>
                                <Separator />

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
                                            {contract.warehouses?.length
                                                ? contract.warehouses.map((w) => w.name).join(", ")
                                                : contract.details?.map((d) => d.warehouse?.name || d.warehouse_name || d.warehouse_template?.name).filter(Boolean).join(", ") || "—"}
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

                                {contract.status === "CANCELLED" && contract.cancel_reason && (
                                    <>
                                        <Separator />
                                        <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/50 rounded-lg p-4">
                                            <p className="text-sm font-medium text-red-700 dark:text-red-400">
                                                Lý do hủy: {contract.cancel_reason}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </TabsContent>

                        {/* Payment tab */}
                        <TabsContent value="payment" className="mt-4">
                            <div className="bg-card rounded-xl border p-6">
                                <PaymentHistory
                                    payments={contract.payments ?? []}
                                    showQrCode
                                    onRetryPayment={(payment) => handleRetryPayment(payment.id)}
                                    retryingPaymentId={retryingPaymentId}
                                />
                            </div>
                        </TabsContent>

                        {/* History tab */}
                        <TabsContent value="history" className="mt-4">
                            <div className="bg-card rounded-xl border p-6">
                                <StatusTimeline
                                    events={
                                        contract.history?.map((h) => ({
                                            id: h.id,
                                            type: h.type as TimelineEvent["type"],
                                            title: h.description,
                                            date: h.created_at,
                                            description: h.metadata
                                                ? Object.entries(h.metadata)
                                                    .map(([k, v]) => `${k}: ${v}`)
                                                    .join(" · ")
                                                : undefined,
                                            actor: h.actor?.name,
                                        })) ?? []
                                    }
                                />
                            </div>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            <RequestRefundModal
                isOpen={showRefundModal}
                onClose={() => setShowRefundModal(false)}
                contractId={contract.id}
                originalAmount={typeof contract.total_price === "string" ? parseFloat(contract.total_price) : contract.total_price}
                onSuccess={() => {
                    refreshContract();
                    router.push("/dashboard/organization/refund-requests");
                }}
            />

            <ManageAddonsModal
                open={showAddonsModal}
                onOpenChange={setShowAddonsModal}
                currentAddonIds={(contract as any).addons?.filter((a: any) => !a.is_cancelled).map((a: any) => a.addon_id || a.id) ?? []}
                currentAmenityIds={(() => {
                    const details = (contract as any).details || [];
                    const ids: string[] = [];
                    for (const d of details) {
                        for (const wa of (d.warehouse_template?.amenities || [])) {
                            if (wa.amenity?.id && !ids.includes(wa.amenity.id)) ids.push(wa.amenity.id);
                        }
                    }
                    return ids;
                })()}
                lockedAddonIds={(contract as any).addons?.filter((a: any) => !a.is_cancelled && !a.is_gift && (new Date().getTime() - new Date(a.created_at).getTime() > 2 * 24 * 60 * 60 * 1000)).map((a: any) => a.addon_id || a.id) ?? []}
                onSave={handleSaveAddons}
            />

            <SePayQRModal
                open={showPaymentModal}
                onOpenChange={(open) => {
                    setShowPaymentModal(open);
                    if (!open) setPaymentData(null);
                }}
                paymentData={paymentData}
                onPaymentSuccess={() => {
                    void refreshContract();
                    setActiveTab("payment");
                    showToast("Thanh toán thành công! Hợp đồng đã được kích hoạt.", "success");
                }}
                onPaymentExpired={() => {
                    void refreshContract();
                    showToast("Giao dịch đã hết hạn. Vui lòng thử lại.", "info");
                }}
            />
        </div>
    );
}

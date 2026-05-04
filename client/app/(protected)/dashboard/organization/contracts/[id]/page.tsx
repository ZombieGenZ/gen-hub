"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ArrowLeft,
    Printer,
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
import { ContractFullDocument } from "@/components/contract/ContractFullDocument";
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

    const handlePrintContract = () => {
        if (!contract) return;
        const fmtDate = (d?: string) => {
            if (!d) return "___/___/______";
            const dt = new Date(d);
            if (isNaN(dt.getTime())) return d;
            return `ngày ${String(dt.getDate()).padStart(2, "0")} tháng ${String(dt.getMonth() + 1).padStart(2, "0")} năm ${dt.getFullYear()}`;
        };
        const fmtMoney = (v?: number | string) => {
            const n = parseFloat(String(v ?? 0));
            return isNaN(n) ? "0" : new Intl.NumberFormat("vi-VN").format(n);
        };
        const pmLabel = (pm?: string) =>
            pm === "TRANSFER" ? "Chuyển khoản ngân hàng"
            : pm === "BALANCE" ? "Số dư tài khoản"
            : pm === "HYBRID" ? "Kết hợp (Số dư + Chuyển khoản)"
            : pm ?? "—";
        const whs = contract.warehouses?.length
            ? contract.warehouses
            : contract.details?.map(d => ({ id: d.id, name: d.warehouse?.name || d.warehouse_name || d.warehouse_template?.name || "—" })) ?? [];
        const signedBy = contract.signers?.find(s => s.signed);
        const whRows = whs.map(w => `<tr><td>${w.name}</td><td style="text-align:right">—</td></tr>`).join("");
        const addonRows = (contract.addons ?? []).map(a => `<tr><td>Dịch vụ: ${a.name}${a.is_gift ? " (Miễn phí)" : ""}</td><td style="text-align:right">${a.is_gift ? "0" : fmtMoney(a.price)} VNĐ</td></tr>`).join("");
        const insRows = (contract.insurances ?? []).map(ins => `<tr><td>Bảo hiểm: ${ins.name}</td><td style="text-align:right">${fmtMoney(ins.price)} VNĐ</td></tr>`).join("");
        const vatRow = (contract.vat_rate ?? 0) > 0 ? `<tr><td>VAT (${Math.round((contract.vat_rate ?? 0) * 100)}%)</td><td style="text-align:right">+${fmtMoney(contract.vat_amount)} VNĐ</td></tr>` : "";
        const discRow = (contract.discount_rate ?? 0) > 0 ? `<tr><td>Chiết khấu (${Math.round((contract.discount_rate ?? 0) * 100)}%)</td><td style="text-align:right">-${fmtMoney(parseFloat(String(contract.total_price ?? 0)) * (contract.discount_rate ?? 0))} VNĐ</td></tr>` : "";
        const cancelHtml = contract.status === "CANCELLED" && contract.cancel_reason ? `<div style="border:1px solid #c00;padding:12px;margin:16px 0"><p style="font-weight:bold;color:#c00;margin:0 0 4px">THÔNG TIN HỦY HỢP ĐỒNG</p><p style="color:#c00;margin:2px 0">Lý do: ${contract.cancel_reason}</p></div>` : "";
        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>Hợp đồng ${contract.code}</title>
<style>*{box-sizing:border-box}body{font-family:"Times New Roman",Times,serif;margin:0;padding:2cm 2.5cm;font-size:13px;color:#000;line-height:1.7}.center{text-align:center}hr{border:none;border-top:1px solid #000;margin:16px 0}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #555;padding:5px 10px}th{background:#f2f2f2;font-weight:bold;text-align:left}.row{display:grid;grid-template-columns:160px 1fr;gap:4px;margin-bottom:3px}.label{color:#444}.sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:40px;text-align:center}@media print{body{padding:1cm 1.5cm}}</style>
</head><body>
<div class="center" style="margin-bottom:16px"><p style="font-weight:bold;font-size:13px;margin:0;text-transform:uppercase">Cộng hòa xã hội chủ nghĩa Việt Nam</p><p style="font-style:italic;margin:2px 0">Độc lập - Tự do - Hạnh phúc</p><p style="margin:4px 0">────────────────</p></div>
<div class="center" style="margin-bottom:20px"><h2 style="font-size:16px;font-weight:bold;text-transform:uppercase;margin:0">Hợp đồng cho thuê kho hàng</h2><p style="margin:4px 0">Số: <strong>${contract.code}</strong></p><p style="margin:0;font-style:italic">Hà Nội, ${fmtDate(contract.created_at)}</p></div>
<p style="text-align:center;font-style:italic;margin-bottom:16px">Căn cứ vào nhu cầu và khả năng của hai bên, hôm nay chúng tôi gồm:</p><hr/>
<div style="margin-bottom:16px"><p style="font-weight:bold;text-transform:uppercase;margin-bottom:6px">Bên cho thuê (Gọi tắt là Bên A):</p><div style="margin-left:16px"><div class="row"><span class="label">Tên công ty:</span><strong>Công ty TNHH GenHub Warehouse</strong></div><div class="row"><span class="label">Địa chỉ:</span><span>Hà Nội, Việt Nam</span></div><div class="row"><span class="label">Người đại diện:</span><strong>Ban Giám Đốc</strong></div></div></div>
<div style="margin-bottom:16px"><p style="font-weight:bold;text-transform:uppercase;margin-bottom:6px">Bên thuê (Gọi tắt là Bên B):</p><div style="margin-left:16px"><div class="row"><span class="label">Tên tổ chức:</span><strong>${contract.organization?.name ?? "—"}</strong></div><div class="row"><span class="label">Người đại diện:</span><span>${signedBy?.name ?? "—"}</span></div></div></div>
<hr/>
<div style="margin-bottom:16px"><p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Điều 1: Đối tượng hợp đồng</p><p style="margin-left:16px;margin-top:0">Bên A đồng ý cho Bên B thuê kho hàng tại hệ thống GenHub, cụ thể:</p><ul style="margin-left:32px;padding:0">${whs.map(w => `<li style="list-style:disc;margin-bottom:2px">${w.name}</li>`).join("")}</ul></div>
<div style="margin-bottom:16px"><p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Điều 2: Thời hạn hợp đồng</p><ul style="margin-left:32px;padding:0;list-style:none"><li>- Ngày bắt đầu: <strong>${fmtDate(contract.started_at)}</strong></li><li>- Ngày kết thúc: <strong>${fmtDate(contract.expired_at)}</strong></li>${contract.auto_renew ? "<li>- Hợp đồng được tự động gia hạn khi hết hạn.</li>" : ""}</ul></div>
<div style="margin-bottom:16px"><p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Điều 3: Giá thuê và phương thức thanh toán</p><p style="margin-left:16px;margin-top:0">Phương thức: <strong>${pmLabel(contract.payment_method)}</strong></p><table><thead><tr><th>Hạng mục</th><th style="text-align:right">Đơn giá</th></tr></thead><tbody>${whRows}${addonRows}${insRows}<tr><td><strong>Tổng cộng (chưa VAT)</strong></td><td style="text-align:right"><strong>${fmtMoney(contract.total_price)} VNĐ</strong></td></tr>${vatRow}${discRow}<tr style="background:#f2f2f2"><td style="font-weight:bold">TỔNG THANH TOÁN</td><td style="text-align:right;font-weight:bold;font-size:14px">${fmtMoney(contract.final_price)} VNĐ</td></tr></tbody></table></div>
<div style="margin-bottom:16px"><p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Điều 4: Dịch vụ bổ sung</p>${(contract.addons?.length ?? 0) > 0 ? `<ul style="margin-left:32px;padding:0;list-style:none">${(contract.addons ?? []).map(a => `<li>- ${a.name}${a.is_gift ? " (Tặng kèm)" : ""}</li>`).join("")}</ul>` : `<p style="margin-left:16px;font-style:italic">Không có dịch vụ bổ sung.</p>`}</div>
<div style="margin-bottom:16px"><p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Điều 5: Bảo hiểm</p>${(contract.insurances?.length ?? 0) > 0 ? `<ul style="margin-left:32px;padding:0;list-style:none">${(contract.insurances ?? []).map(ins => `<li>- ${ins.name}</li>`).join("")}</ul>` : `<p style="margin-left:16px;font-style:italic">Không có gói bảo hiểm.</p>`}</div>
<div style="margin-bottom:16px"><p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Điều 6: Trách nhiệm của hai bên</p><p style="margin-left:16px;margin-top:0">Các bên cam kết thực hiện đúng và đầy đủ các điều khoản đã ký kết. Mọi thay đổi phải bằng văn bản và được cả hai bên đồng ý.</p></div>
<div style="margin-bottom:16px"><p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Điều 7: Giải quyết tranh chấp</p><p style="margin-left:16px;margin-top:0">Tranh chấp được giải quyết bằng thương lượng. Nếu không đạt thỏa thuận trong 30 ngày, tranh chấp sẽ do Tòa án nhân dân có thẩm quyền giải quyết theo pháp luật Việt Nam.</p></div>
<div style="margin-bottom:16px"><p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Điều 8: Hiệu lực hợp đồng</p><p style="margin-left:16px;margin-top:0">Hợp đồng có hiệu lực từ ngày ký đến ${fmtDate(contract.expired_at)}. Lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.</p></div>
${cancelHtml}<hr/>
<div class="sig-grid"><div><p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Đại diện Bên A</p><p style="font-style:italic;font-size:12px;margin:0 0 60px">(Ký, đóng dấu)</p><p style="font-weight:bold">Ban Giám Đốc GenHub Warehouse</p></div><div><p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Đại diện Bên B</p><p style="font-style:italic;font-size:12px;margin:0 0 8px">(Ký và ghi rõ họ tên)</p>${signedBy?.avatar ? `<img src="${signedBy.avatar}" alt="Chữ ký" style="max-height:56px;display:block;margin:0 auto"/>` : `<p style="height:56px;margin:0"></p>`}<p style="font-weight:bold;margin-top:8px">${contract.organization?.name ?? "—"}</p>${signedBy?.signedAt ? `<p style="font-style:italic;font-size:12px;margin:2px 0">${fmtDate(signedBy.signedAt)}</p>` : ""}</div></div>
</body></html>`;
        const win = window.open("", "_blank", "width=900,height=750");
        if (!win) return;
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
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
                        Quay lại
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
                    <Button variant="outline" size="sm" onClick={handlePrintContract}>
                        <Printer className="w-4 h-4 mr-1.5" />
                        In hợp đồng
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
                            <ContractFullDocument contract={contract} />
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

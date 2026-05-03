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
    Printer,
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
import { RentalDurationTierService } from "@/services/rental-duration-tier/rental-duration-tier.service";
import { getContractStatusBanner } from "@/components/contract/ContractStatusBadge";
import { ContractInfoSidebar } from "@/components/contract/ContractInfoSidebar";
import { PaymentHistory } from "@/components/contract/PaymentHistory";
import { StatusTimeline, type TimelineEvent } from "@/components/contract/StatusTimeline";
import type { RentalContractDetail, ContractCancelType } from "@/types/rental-contracts/rental-contracts.type";
import { useToast } from "@/contexts/ToastContext";

const rentalDurationTierService = new RentalDurationTierService();

export default function AdminContractDetailPage() {
    const params = useParams();
    const router = useRouter();
    const contractId = params.id as string;
    const { showToast } = useToast();

    const [contract, setContract] = useState<RentalContractDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("contract");

    // Cancel dialog
    const [cancelOpen, setCancelOpen] = useState(false);
    const [cancelType, setCancelType] = useState<ContractCancelType>("ADMIN_REQUEST");
    const [cancelReason, setCancelReason] = useState("");
    const [cancelling, setCancelling] = useState(false);

    // Renew dialog
    const [renewOpen, setRenewOpen] = useState(false);
    const [renewTierId, setRenewTierId] = useState("");
    const [renewing, setRenewing] = useState(false);
    const [tiers, setTiers] = useState<{ id: string; name: string; duration_months: number }[]>([]);
    const [tiersLoading, setTiersLoading] = useState(false);

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

    const handleOpenRenew = async () => {
        setRenewOpen(true);
        if (tiers.length > 0) return;
        setTiersLoading(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            const res = await rentalDurationTierService.getAllRentalDuratuion(token, { is_active: true, limit: 50 });
            const items: { id: string; name: string; duration_months: number }[] =
                res?.data?.items ?? res?.data ?? res?.items ?? [];
            setTiers(items);
        } catch {
            showToast("Không thể tải danh sách gói gia hạn", "error");
        } finally {
            setTiersLoading(false);
        }
    };

    const handleRenew = async () => {
        if (!renewTierId) return;
        try {
            setRenewing(true);
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }
            const orgId = contract?.organization?.id;
            if (!orgId) throw new Error("Không tìm thấy thông tin tổ chức");
            await rentalContractService.renewOrgRentalContract(token, orgId, contractId, {
                duration_tier_id: renewTierId,
            });
            setRenewOpen(false);
            setRenewTierId("");
            showToast("Gia hạn hợp đồng thành công", "success");
            fetchContract();
        } catch (err) {
            showToast(err instanceof Error ? err.message : "Không thể gia hạn hợp đồng", "error");
        } finally {
            setRenewing(false);
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
        const addonRows = (contract.addons ?? []).map(a =>
            `<tr><td>Dịch vụ bổ sung: ${a.name}${a.is_gift ? " (Miễn phí)" : ""}</td><td style="text-align:right">${a.is_gift ? "0" : fmtMoney(a.price)} VNĐ</td></tr>`
        ).join("");
        const insRows = (contract.insurances ?? []).map(ins =>
            `<tr><td>Bảo hiểm: ${ins.name}</td><td style="text-align:right">${fmtMoney(ins.price)} VNĐ</td></tr>`
        ).join("");
        const vatRow = (contract.vat_rate ?? 0) > 0
            ? `<tr><td>VAT (${Math.round((contract.vat_rate ?? 0) * 100)}%)</td><td style="text-align:right">+${fmtMoney(contract.vat_amount)} VNĐ</td></tr>` : "";
        const discRow = (contract.discount_rate ?? 0) > 0
            ? `<tr><td>Chiết khấu (${Math.round((contract.discount_rate ?? 0) * 100)}%)</td><td style="text-align:right">-${fmtMoney(parseFloat(String(contract.total_price ?? 0)) * (contract.discount_rate ?? 0))} VNĐ</td></tr>` : "";

        const cancelHtml = contract.status === "CANCELLED" && contract.cancel_reason
            ? `<div style="border:1px solid #c00;padding:12px;margin:16px 0">
                <p style="font-weight:bold;color:#c00;margin:0 0 4px">THÔNG TIN HỦY HỢP ĐỒNG</p>
                <p style="color:#c00;margin:2px 0">Lý do: ${contract.cancel_reason}</p>
                ${contract.cancelled_at ? `<p style="color:#c00;margin:0">Ngày hủy: ${fmtDate(contract.cancelled_at)}</p>` : ""}
               </div>` : "";
        const notesHtml = contract.notes
            ? `<div style="margin-bottom:16px"><p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Ghi chú</p><p style="margin-left:16px;white-space:pre-wrap">${contract.notes}</p></div>` : "";

        const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<title>Hợp đồng ${contract.code}</title>
<style>
*{box-sizing:border-box}
body{font-family:"Times New Roman",Times,serif;margin:0;padding:2cm 2.5cm;font-size:13px;color:#000;line-height:1.7}
.center{text-align:center}
hr{border:none;border-top:1px solid #000;margin:16px 0}
table{width:100%;border-collapse:collapse;margin:8px 0}
th,td{border:1px solid #555;padding:5px 10px}
th{background:#f2f2f2;font-weight:bold;text-align:left}
.row{display:grid;grid-template-columns:160px 1fr;gap:4px;margin-bottom:3px}
.label{color:#444}
.sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:40px;text-align:center}
@media print{body{padding:1cm 1.5cm}}
</style></head><body>
<div class="center" style="margin-bottom:16px">
  <p style="font-weight:bold;font-size:13px;margin:0;text-transform:uppercase">Cộng hòa xã hội chủ nghĩa Việt Nam</p>
  <p style="font-style:italic;margin:2px 0">Độc lập - Tự do - Hạnh phúc</p>
  <p style="margin:4px 0">────────────────</p>
</div>
<div class="center" style="margin-bottom:20px">
  <h2 style="font-size:16px;font-weight:bold;text-transform:uppercase;margin:0">Hợp đồng cho thuê kho hàng</h2>
  <p style="margin:4px 0">Số: <strong>${contract.code}</strong></p>
  <p style="margin:0;font-style:italic">Hà Nội, ${fmtDate(contract.created_at)}</p>
</div>
<p style="text-align:center;font-style:italic;margin-bottom:16px">Căn cứ vào nhu cầu và khả năng của hai bên, hôm nay chúng tôi gồm:</p>
<hr/>
<div style="margin-bottom:16px">
  <p style="font-weight:bold;text-transform:uppercase;margin-bottom:6px">Bên cho thuê (Gọi tắt là Bên A):</p>
  <div style="margin-left:16px">
    <div class="row"><span class="label">Tên công ty:</span><strong>Công ty TNHH GenHub Warehouse</strong></div>
    <div class="row"><span class="label">Địa chỉ:</span><span>Hà Nội, Việt Nam</span></div>
    <div class="row"><span class="label">Người đại diện:</span><strong>Ban Giám Đốc</strong></div>
  </div>
</div>
<div style="margin-bottom:16px">
  <p style="font-weight:bold;text-transform:uppercase;margin-bottom:6px">Bên thuê (Gọi tắt là Bên B):</p>
  <div style="margin-left:16px">
    <div class="row"><span class="label">Tên tổ chức:</span><strong>${contract.organization?.name ?? "—"}</strong></div>
    <div class="row"><span class="label">Người đại diện:</span><span>${signedBy?.name ?? "—"}</span></div>
  </div>
</div>
<hr/>
<div style="margin-bottom:16px">
  <p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Điều 1: Đối tượng hợp đồng</p>
  <p style="margin-left:16px;margin-top:0">Bên A đồng ý cho Bên B thuê kho hàng tại hệ thống GenHub, cụ thể:</p>
  <ul style="margin-left:32px;padding:0">${whs.map(w => `<li style="list-style:disc;margin-bottom:2px">${w.name}</li>`).join("")}</ul>
</div>
<div style="margin-bottom:16px">
  <p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Điều 2: Thời hạn hợp đồng</p>
  <ul style="margin-left:32px;padding:0;list-style:none">
    <li>- Ngày bắt đầu: <strong>${fmtDate(contract.started_at)}</strong></li>
    <li>- Ngày kết thúc: <strong>${fmtDate(contract.expired_at)}</strong></li>
    ${contract.auto_renew ? "<li>- Hợp đồng được tự động gia hạn khi hết hạn.</li>" : ""}
  </ul>
</div>
<div style="margin-bottom:16px">
  <p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Điều 3: Giá thuê và phương thức thanh toán</p>
  <p style="margin-left:16px;margin-top:0">Phương thức thanh toán: <strong>${pmLabel(contract.payment_method)}</strong></p>
  <table>
    <thead><tr><th>Hạng mục</th><th style="text-align:right">Đơn giá</th></tr></thead>
    <tbody>
      ${whRows}${addonRows}${insRows}
      <tr><td><strong>Tổng cộng (chưa VAT)</strong></td><td style="text-align:right"><strong>${fmtMoney(contract.total_price)} VNĐ</strong></td></tr>
      ${vatRow}${discRow}
      <tr style="background:#f2f2f2"><td style="font-weight:bold">TỔNG THANH TOÁN</td><td style="text-align:right;font-weight:bold;font-size:14px">${fmtMoney(contract.final_price)} VNĐ</td></tr>
    </tbody>
  </table>
</div>
<div style="margin-bottom:16px">
  <p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Điều 4: Dịch vụ bổ sung</p>
  ${(contract.addons?.length ?? 0) > 0 ? `<ul style="margin-left:32px;padding:0;list-style:none">${(contract.addons ?? []).map(a => `<li>- ${a.name}${a.is_gift ? " (Tặng kèm, miễn phí)" : ""}</li>`).join("")}</ul>` : `<p style="margin-left:16px;font-style:italic">Không có dịch vụ bổ sung.</p>`}
</div>
<div style="margin-bottom:16px">
  <p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Điều 5: Bảo hiểm</p>
  ${(contract.insurances?.length ?? 0) > 0 ? `<ul style="margin-left:32px;padding:0;list-style:none">${(contract.insurances ?? []).map(ins => `<li>- ${ins.name}</li>`).join("")}</ul>` : `<p style="margin-left:16px;font-style:italic">Không có gói bảo hiểm.</p>`}
</div>
<div style="margin-bottom:16px">
  <p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Điều 6: Trách nhiệm của hai bên</p>
  <p style="margin-left:16px;margin-top:0">Các bên cam kết thực hiện đúng và đầy đủ các điều khoản đã ký kết. Mọi thay đổi phải bằng văn bản và được cả hai bên đồng ý.</p>
</div>
<div style="margin-bottom:16px">
  <p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Điều 7: Giải quyết tranh chấp</p>
  <p style="margin-left:16px;margin-top:0">Tranh chấp được giải quyết bằng thương lượng. Nếu không đạt thỏa thuận trong 30 ngày, tranh chấp sẽ do Tòa án nhân dân có thẩm quyền giải quyết theo pháp luật Việt Nam.</p>
</div>
<div style="margin-bottom:16px">
  <p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Điều 8: Hiệu lực hợp đồng</p>
  <p style="margin-left:16px;margin-top:0">Hợp đồng có hiệu lực từ ngày ký đến ${fmtDate(contract.expired_at)}. Lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.</p>
</div>
${notesHtml}${cancelHtml}
<hr/>
<div class="sig-grid">
  <div>
    <p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Đại diện Bên A</p>
    <p style="font-style:italic;font-size:12px;margin:0 0 60px">(Ký, đóng dấu)</p>
    <p style="font-weight:bold">Ban Giám Đốc GenHub Warehouse</p>
  </div>
  <div>
    <p style="font-weight:bold;text-transform:uppercase;margin-bottom:4px">Đại diện Bên B</p>
    <p style="font-style:italic;font-size:12px;margin:0 0 8px">(Ký và ghi rõ họ tên)</p>
    ${signedBy?.avatar ? `<img src="${signedBy.avatar}" alt="Chữ ký" style="max-height:56px;display:block;margin:0 auto"/>` : `<p style="height:56px;margin:0"></p>`}
    <p style="font-weight:bold;margin-top:8px">${contract.organization?.name ?? "—"}</p>
    ${signedBy?.signedAt ? `<p style="font-style:italic;font-size:12px;margin:2px 0">${fmtDate(signedBy.signedAt)}</p>` : ""}
  </div>
</div>
</body></html>`;

        const win = window.open("", "_blank", "width=900,height=750");
        if (!win) return;
        win.document.write(html);
        win.document.close();
        setTimeout(() => win.print(), 500);
    };

    const handleCancel = async () => {
        if (!cancelReason.trim()) return;
        try {
            setCancelling(true);
            const token = authStorage.getAccessToken();
            if (!token) { router.push("/login"); return; }
            await rentalContractService.cancelRentalContract(token, contractId, {
                cancel_type: cancelType,
                cancel_reason: cancelReason,
            });
            setCancelOpen(false);
            setCancelReason("");
            showToast("Đã hủy hợp đồng thành công", "success");
            fetchContract();
        } catch (err) {
            console.error("Cancel error", err);
            showToast(err instanceof Error ? err.message : "Không thể hủy hợp đồng", "error");
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
            <main className="flex-1 p-4 md:p-8 w-full space-y-6 max-w-[1440px] mx-auto p-4">
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
                        <Button variant="outline" size="sm" onClick={handlePrintContract}>
                            <Printer className="w-4 h-4 mr-1.5" />
                            In hợp đồng
                        </Button>
                        {canRenew && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                                onClick={handleOpenRenew}
                            >
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

                            {/* Contract tab — full legal contract view */}
                            <TabsContent value="contract" className="mt-4">
                                <div className="bg-card rounded-xl border">
                                    {/* Contract document */}
                                    <ScrollArea className="h-[calc(100vh-260px)]">
                                        <div className="p-8 space-y-6 text-sm max-w-3xl mx-auto">
                                            {/* ── Header ── */}
                                            <div className="text-center space-y-1">
                                                <p className="font-bold text-xs uppercase tracking-widest">Cộng hòa xã hội chủ nghĩa Việt Nam</p>
                                                <p className="text-xs italic text-muted-foreground">Độc lập - Tự do - Hạnh phúc</p>
                                                <p className="text-xs text-muted-foreground">────────────────</p>
                                            </div>

                                            {/* ── Title ── */}
                                            <div className="text-center space-y-1 pt-2">
                                                <h2 className="text-base font-bold uppercase tracking-wide">Hợp đồng cho thuê kho hàng</h2>
                                                <p className="text-xs font-semibold text-muted-foreground">Số: {contract.code}</p>
                                                <p className="text-xs italic text-muted-foreground">
                                                    Hà Nội, {new Date(contract.created_at).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}
                                                </p>
                                            </div>

                                            <p className="text-xs italic text-center text-muted-foreground">
                                                Căn cứ vào nhu cầu và khả năng của hai bên, hôm nay chúng tôi gồm:
                                            </p>

                                            <Separator />

                                            {/* ── Parties ── */}
                                            <div className="space-y-5">
                                                <div>
                                                    <p className="font-bold text-xs uppercase mb-2">Bên cho thuê (Gọi tắt là Bên A):</p>
                                                    <div className="ml-4 space-y-1 text-xs">
                                                        {[
                                                            ["Tên công ty", "Công ty TNHH GenHub Warehouse"],
                                                            ["Địa chỉ", "Hà Nội, Việt Nam"],
                                                            ["Điện thoại", "1900 xxxx"],
                                                            ["Email", "contact@genhub.vn"],
                                                            ["Người đại diện", "Ban Giám Đốc"],
                                                        ].map(([label, value]) => (
                                                            <div key={label} className="grid grid-cols-[140px_1fr] gap-1">
                                                                <span className="text-muted-foreground">{label}:</span>
                                                                <span className="font-medium">{value}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="font-bold text-xs uppercase mb-2">Bên thuê (Gọi tắt là Bên B):</p>
                                                    <div className="ml-4 space-y-1 text-xs">
                                                        <div className="grid grid-cols-[140px_1fr] gap-1">
                                                            <span className="text-muted-foreground">Tên tổ chức:</span>
                                                            <span className="font-medium">{contract.organization?.name ?? "—"}</span>
                                                        </div>
                                                        <div className="grid grid-cols-[140px_1fr] gap-1">
                                                            <span className="text-muted-foreground">Người đại diện:</span>
                                                            <span className="font-medium">{contract.signers?.find(s => s.signed)?.name ?? "—"}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <Separator />

                                            {/* ── Articles ── */}
                                            <div className="space-y-5">
                                                {/* ĐIỀU 1 */}
                                                <div>
                                                    <p className="font-bold text-xs uppercase mb-1.5">Điều 1: Đối tượng hợp đồng</p>
                                                    <p className="text-xs text-muted-foreground ml-4 mb-1">Bên A đồng ý cho Bên B thuê kho hàng tại hệ thống GenHub, cụ thể:</p>
                                                    <ul className="ml-8 space-y-0.5">
                                                        {(contract.warehouses?.length
                                                            ? contract.warehouses
                                                            : contract.details?.map(d => ({
                                                                id: d.id,
                                                                name: d.warehouse?.name || d.warehouse_name || d.warehouse_template?.name || "—",
                                                            })) ?? []
                                                        ).map((w, i) => (
                                                            <li key={w.id ?? i} className="text-xs list-disc">{w.name}</li>
                                                        ))}
                                                    </ul>
                                                </div>

                                                {/* ĐIỀU 2 */}
                                                <div>
                                                    <p className="font-bold text-xs uppercase mb-1.5">Điều 2: Thời hạn hợp đồng</p>
                                                    <ul className="ml-8 space-y-0.5 text-xs list-disc">
                                                        <li>Ngày bắt đầu: <span className="font-medium">{new Date(contract.started_at).toLocaleDateString("vi-VN")}</span></li>
                                                        <li>Ngày kết thúc: <span className="font-medium">{new Date(contract.expired_at).toLocaleDateString("vi-VN")}</span></li>
                                                        {contract.auto_renew && <li>Hợp đồng được tự động gia hạn khi hết hạn.</li>}
                                                    </ul>
                                                </div>

                                                {/* ĐIỀU 3 */}
                                                <div>
                                                    <p className="font-bold text-xs uppercase mb-1.5">Điều 3: Giá thuê và phương thức thanh toán</p>
                                                    <p className="text-xs ml-4 mb-2">
                                                        Phương thức thanh toán:{" "}
                                                        <span className="font-medium">
                                                            {contract.payment_method === "TRANSFER" ? "Chuyển khoản ngân hàng"
                                                             : contract.payment_method === "BALANCE" ? "Số dư tài khoản"
                                                             : contract.payment_method === "HYBRID" ? "Kết hợp (Số dư + Chuyển khoản)"
                                                             : contract.payment_method ?? "—"}
                                                        </span>
                                                    </p>
                                                    <div className="border rounded-lg overflow-hidden text-xs">
                                                        <table className="w-full">
                                                            <thead>
                                                                <tr className="bg-muted/60 border-b">
                                                                    <th className="text-left px-3 py-2 font-semibold">Hạng mục</th>
                                                                    <th className="text-right px-3 py-2 font-semibold">Đơn giá</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y">
                                                                {(contract.warehouses?.length
                                                                    ? contract.warehouses
                                                                    : contract.details?.map(d => ({ id: d.id, name: d.warehouse?.name || d.warehouse_name || d.warehouse_template?.name || "—" })) ?? []
                                                                ).map((w, i) => (
                                                                    <tr key={w.id ?? i}>
                                                                        <td className="px-3 py-2">Kho: {w.name}</td>
                                                                        <td className="px-3 py-2 text-right text-muted-foreground">—</td>
                                                                    </tr>
                                                                ))}
                                                                {(contract.addons ?? []).map((a, i) => (
                                                                    <tr key={a.id ?? i}>
                                                                        <td className="px-3 py-2">Dịch vụ: {a.name}{a.is_gift ? " (Miễn phí)" : ""}</td>
                                                                        <td className="px-3 py-2 text-right">
                                                                            {a.is_gift ? "0" : new Intl.NumberFormat("vi-VN").format(a.price ?? 0)} VNĐ
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                {(contract.insurances ?? []).map((ins, i) => (
                                                                    <tr key={ins.id ?? i}>
                                                                        <td className="px-3 py-2">Bảo hiểm: {ins.name}</td>
                                                                        <td className="px-3 py-2 text-right">
                                                                            {new Intl.NumberFormat("vi-VN").format(ins.price ?? 0)} VNĐ
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                                <tr className="bg-muted/30">
                                                                    <td className="px-3 py-2 font-medium">Tổng cộng (chưa VAT)</td>
                                                                    <td className="px-3 py-2 text-right font-medium">
                                                                        {new Intl.NumberFormat("vi-VN").format(parseFloat(String(contract.total_price ?? 0)))} VNĐ
                                                                    </td>
                                                                </tr>
                                                                {(contract.vat_rate ?? 0) > 0 && (
                                                                    <tr>
                                                                        <td className="px-3 py-2">VAT ({Math.round((contract.vat_rate ?? 0) * 100)}%)</td>
                                                                        <td className="px-3 py-2 text-right">+{new Intl.NumberFormat("vi-VN").format(parseFloat(String(contract.vat_amount ?? 0)))} VNĐ</td>
                                                                    </tr>
                                                                )}
                                                                {(contract.discount_rate ?? 0) > 0 && (
                                                                    <tr>
                                                                        <td className="px-3 py-2">Chiết khấu ({Math.round((contract.discount_rate ?? 0) * 100)}%)</td>
                                                                        <td className="px-3 py-2 text-right text-green-600">
                                                                            -{new Intl.NumberFormat("vi-VN").format(parseFloat(String(contract.total_price ?? 0)) * (contract.discount_rate ?? 0))} VNĐ
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                                <tr className="bg-brand/5 border-t-2 border-brand/20">
                                                                    <td className="px-3 py-2.5 font-bold">TỔNG THANH TOÁN</td>
                                                                    <td className="px-3 py-2.5 text-right font-bold text-brand text-sm">
                                                                        {new Intl.NumberFormat("vi-VN").format(parseFloat(String(contract.final_price ?? 0)))} VNĐ
                                                                    </td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>

                                                {/* ĐIỀU 4 */}
                                                <div>
                                                    <p className="font-bold text-xs uppercase mb-1.5">Điều 4: Dịch vụ bổ sung</p>
                                                    {(contract.addons?.length ?? 0) > 0 ? (
                                                        <ul className="ml-8 space-y-0.5 text-xs list-disc">
                                                            {(contract.addons ?? []).map((a, i) => (
                                                                <li key={a.id ?? i}>{a.name}{a.is_gift ? " — Tặng kèm, miễn phí" : ""}</li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground italic ml-4">Không có dịch vụ bổ sung.</p>
                                                    )}
                                                </div>

                                                {/* ĐIỀU 5 */}
                                                <div>
                                                    <p className="font-bold text-xs uppercase mb-1.5">Điều 5: Bảo hiểm</p>
                                                    {(contract.insurances?.length ?? 0) > 0 ? (
                                                        <ul className="ml-8 space-y-0.5 text-xs list-disc">
                                                            {(contract.insurances ?? []).map((ins, i) => (
                                                                <li key={ins.id ?? i}>{ins.name}</li>
                                                            ))}
                                                        </ul>
                                                    ) : (
                                                        <p className="text-xs text-muted-foreground italic ml-4">Không có gói bảo hiểm.</p>
                                                    )}
                                                </div>

                                                {/* ĐIỀU 6-8 boilerplate */}
                                                {[
                                                    {
                                                        title: "Điều 6: Trách nhiệm của hai bên",
                                                        text: "Các bên cam kết thực hiện đúng và đầy đủ các điều khoản đã ký kết. Mọi thay đổi phải được lập thành văn bản và có sự đồng ý của cả hai bên.",
                                                    },
                                                    {
                                                        title: "Điều 7: Giải quyết tranh chấp",
                                                        text: "Mọi tranh chấp phát sinh sẽ được giải quyết bằng thương lượng thiện chí. Nếu không đạt thỏa thuận trong 30 ngày, tranh chấp sẽ do Tòa án nhân dân có thẩm quyền giải quyết theo pháp luật Việt Nam.",
                                                    },
                                                    {
                                                        title: "Điều 8: Hiệu lực hợp đồng",
                                                        text: `Hợp đồng có hiệu lực từ ngày ký đến ngày ${new Date(contract.expired_at).toLocaleDateString("vi-VN")}. Lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.`,
                                                    },
                                                ].map(({ title, text }) => (
                                                    <div key={title}>
                                                        <p className="font-bold text-xs uppercase mb-1.5">{title}</p>
                                                        <p className="text-xs text-muted-foreground ml-4">{text}</p>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* ── Notes ── */}
                                            {contract.notes && (
                                                <>
                                                    <Separator />
                                                    <div>
                                                        <p className="font-bold text-xs uppercase mb-1.5">Ghi chú</p>
                                                        <p className="text-xs ml-4 whitespace-pre-wrap text-muted-foreground">{contract.notes}</p>
                                                    </div>
                                                </>
                                            )}

                                            {/* ── Cancel info ── */}
                                            {contract.status === "CANCELLED" && contract.cancel_reason && (
                                                <div className="bg-red-50 dark:bg-red-950/20 border border-red-200/60 rounded-lg p-4">
                                                    <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase mb-1">Thông tin hủy hợp đồng</p>
                                                    <p className="text-xs text-red-700 dark:text-red-400">Lý do: {contract.cancel_reason}</p>
                                                    {contract.cancel_type && (
                                                        <p className="text-xs text-red-500 mt-0.5">
                                                            Loại: {contract.cancel_type === "CLIENT_REQUEST" ? "Yêu cầu khách hàng" : contract.cancel_type === "ADMIN_REQUEST" ? "Admin yêu cầu" : contract.cancel_type === "VIOLATION" ? "Vi phạm hợp đồng" : contract.cancel_type === "NON_PAYMENT" ? "Không thanh toán" : contract.cancel_type}
                                                        </p>
                                                    )}
                                                    {contract.cancelled_at && (
                                                        <p className="text-xs text-red-500">Ngày hủy: {new Date(contract.cancelled_at).toLocaleDateString("vi-VN")}</p>
                                                    )}
                                                </div>
                                            )}

                                            <Separator />

                                            {/* ── Signatures ── */}
                                            <div className="grid grid-cols-2 gap-8 pt-2">
                                                <div className="text-center space-y-2">
                                                    <p className="text-xs font-bold uppercase">Đại diện Bên A</p>
                                                    <p className="text-xs italic text-muted-foreground">(Ký, đóng dấu)</p>
                                                    <div className="h-14" />
                                                    <p className="text-xs font-semibold">Ban Giám Đốc GenHub Warehouse</p>
                                                </div>
                                                <div className="text-center space-y-2">
                                                    <p className="text-xs font-bold uppercase">Đại diện Bên B</p>
                                                    <p className="text-xs italic text-muted-foreground">(Ký và ghi rõ họ tên)</p>
                                                    {contract.signers?.find(s => s.signed)?.avatar
                                                        ? <img src={contract.signers.find(s => s.signed)!.avatar} alt="Chữ ký" className="h-14 mx-auto object-contain" />
                                                        : <div className="h-14" />
                                                    }
                                                    <p className="text-xs font-semibold">{contract.organization?.name ?? "—"}</p>
                                                    {contract.signers?.find(s => s.signed)?.signedAt && (
                                                        <p className="text-xs text-muted-foreground italic">
                                                            {new Date(contract.signers.find(s => s.signed)!.signedAt!).toLocaleDateString("vi-VN")}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </ScrollArea>
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
            </main>

            {/* Renew dialog */}
            <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Gia hạn hợp đồng</DialogTitle>
                        <DialogDescription>
                            Chọn gói thời gian gia hạn cho hợp đồng <strong>{contract.code}</strong>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">Gói gia hạn <span className="text-red-500">*</span></label>
                            {tiersLoading ? (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Đang tải gói gia hạn...
                                </div>
                            ) : (
                                <Select value={renewTierId} onValueChange={setRenewTierId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn gói gia hạn..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {tiers.length === 0 ? (
                                            <SelectItem value="__none" disabled>Không có gói nào khả dụng</SelectItem>
                                        ) : (
                                            tiers.map((tier) => (
                                                <SelectItem key={tier.id} value={tier.id}>
                                                    {tier.name} ({tier.duration_months} tháng)
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRenewOpen(false)}>Đóng</Button>
                        <Button
                            onClick={handleRenew}
                            disabled={!renewTierId || renewing || tiersLoading}
                        >
                            {renewing && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                            Xác nhận gia hạn
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

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

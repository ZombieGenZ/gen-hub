"use client";

import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft,
  MapPin,
  Calendar,
  FileText,
  Download,
  Printer,
  Share2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2,
  Phone,
  Mail,
  CreditCard,
  Plus,
  Loader2,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { authStorage } from '@/services/auth/auth-storage.service';
import { rentalContractService } from "@/services/rental-contract/rental-contract.service";
import { organizationService } from "@/services/organization/organization.service";
import { orgHelper } from '@/lib/organization.utils';
import { useToast } from '@/contexts/ToastContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { showToast } = useToast();
  const id = params.id as string;
  const [booking, setBooking] = useState<any>(null);
  const [organizationDetails, setOrganizationDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        setLoading(true);
        const token = authStorage.getAccessToken();
        if (!token) { router.push("/login"); return; }
        const currentOrgId = orgId || await orgHelper.getOrgId(token);
        const result = await rentalContractService.getOrgRentalContractFull(token, currentOrgId, id);
        setBooking(result);

        // Fetch organization details if company info is available
        if (result.organization?.id) {
          try {
            const orgDetail = await organizationService.getOrganizationById(token, result.organization.id);
            setOrganizationDetails(orgDetail);
          } catch (orgError) {
            console.log("Could not fetch organization details", orgError);
          }
        }
      } catch (error) {
        console.error("Failed to fetch booking", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id, router]);

  const handleRetryPayment = async () => {
    try {
      const token = authStorage.getAccessToken();
      if (!token) { router.push("/login"); return; }
      const currentOrgId = orgId || await orgHelper.getOrgId(token);
      setRetryingPayment(true);
      const result = await rentalContractService.retryPayment(token, currentOrgId, id);
      const paymentUrl = result?.payment?.payment_url || result?.payment_url;
      if (paymentUrl) {
        window.open(paymentUrl, "_blank", "noopener,noreferrer");
      } else {
        showToast("Không tìm thấy link thanh toán", "error");
      }
    } catch (err: any) {
      showToast(err?.message || "Không thể tạo lại link thanh toán", "error");
    } finally {
      setRetryingPayment(false);
    }
  };

  const handleCancel = async () => {
    try {
      const token = authStorage.getAccessToken();
      if (!token) { router.push("/login"); return; }
      const currentOrgId = orgId || await orgHelper.getOrgId(token);
      setCancelling(true);
      await rentalContractService.cancelOrgRentalContract(token, currentOrgId, id, "Khách hàng hủy yêu cầu");
      showToast("Đã hủy yêu cầu thuê kho thành công", "success");
      router.push("/dashboard/organization/bookings");
    } catch (err: any) {
      showToast(err?.message || "Không thể hủy yêu cầu", "error");
    } finally {
      setCancelling(false);
      setShowCancelDialog(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Đang tải thông tin hợp đồng...</div>;
  }

  if (!booking) {
    return <div className="p-12 text-center text-slate-500">Không tìm thấy hợp đồng hoặc có lỗi xảy ra.</div>;
  }

  // ── Computed helpers từ API data thực tế ──────────────────────────────────
  const STATUS_MAP: Record<string, { label: string; color: string }> = {
    PENDING: { label: "Chờ thanh toán", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
    ACTIVE: { label: "Đang hoạt động", color: "bg-green-50 text-green-700 border-green-200" },
    OVERDUE_LEVEL_1: { label: "Quá hạn", color: "bg-red-50 text-red-700 border-red-200" },
    OVERDUE_LEVEL_2: { label: "Quá hạn cấp 2", color: "bg-red-100 text-red-800 border-red-300" },
    OVERDUE_LEVEL_3: { label: "Quá hạn cấp 3", color: "bg-red-200 text-red-900 border-red-400" },
    SEALED: { label: "Đã phong tỏa", color: "bg-gray-50 text-gray-700 border-gray-200" },
    LIQUIDATED: { label: "Đã thanh lý", color: "bg-purple-50 text-purple-700 border-purple-200" },
    CANCELLED: { label: "Đã hủy", color: "bg-red-50 text-red-700 border-red-200" },
    COMPLETED: { label: "Đã hoàn thành", color: "bg-blue-50 text-blue-700 border-blue-200" },
  };
  const fmtDate = (d?: string) => d ? new Date(d).toLocaleDateString('vi-VN') : 'N/A';
  const fmtCurrency = (v?: number | string) => {
    if (v === undefined || v === null) return 'N/A';
    const n = typeof v === 'string' ? parseFloat(v) : v;
    return isNaN(n) ? 'N/A' : n.toLocaleString('vi-VN') + '₫';
  };

  const statusInfo = STATUS_MAP[booking.status] ?? { label: booking.status || '—', color: '' };
  const firstDetail = booking.details?.[0];
  const warehouseName = firstDetail?.warehouse_template?.name || firstDetail?.warehouse_name || firstDetail?.warehouse?.name || '—';
  const warehouseAddress = firstDetail?.warehouse_template?.address_detail || '—';
  const contractType = firstDetail ? (firstDetail.is_whole_warehouse ? 'Thuê Nguyên Kho' : 'Thuê Một Phần') : 'N/A';
  const rentalDays = firstDetail?.rental_days;
  const totalPriceNum = typeof booking.total_price === 'string' ? parseFloat(booking.total_price) : (booking.total_price ?? 0);
  const finalPriceNum = typeof booking.final_price === 'string' ? parseFloat(booking.final_price) : (booking.final_price ?? 0);
  const vatAmountNum = typeof booking.vat_amount === 'string' ? parseFloat(booking.vat_amount) : (booking.vat_amount ?? 0);
  const pendingPayment = booking.payments?.find((p: any) => p.status === 'PENDING');
  const addonsList = booking.addons?.map((a: any) => a.addon ?? a) ?? [];
  const logsList = (booking.logs ?? []) as any[];

  // Tính đơn giá / m²
  const templateBlockLength = parseFloat(firstDetail?.warehouse_template?.block_length ?? '0');
  const templateBlockWidth = parseFloat(firstDetail?.warehouse_template?.block_width ?? '0');
  const warehouseAreaM2 = templateBlockLength > 0 && templateBlockWidth > 0 ? templateBlockLength * templateBlockWidth : 0;
  const detailPricePerMonth = typeof firstDetail?.price_per_month === 'string' ? parseFloat(firstDetail.price_per_month) : (firstDetail?.price_per_month ?? 0);
  const pricePerM2 = warehouseAreaM2 > 0 ? detailPricePerMonth / warehouseAreaM2 : null;

  // Tính phí dịch vụ (tổng addons price_at_purchase, loại trừ đã hủy và quà tặng)
  const serviceFeeTotal = (booking.addons ?? []).reduce((sum: number, a: any) => {
    if (a.is_cancelled || a.is_gift) return sum;
    return sum + parseFloat(a.price_at_purchase ?? '0');
  }, 0);
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/organization" className="hover:text-emerald-600">Trang chủ</Link>
        <span className="text-muted-foreground/50">/</span>
        <Link href="/dashboard/organization/bookings" className="hover:text-emerald-600">Đơn thuê của tôi</Link>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-foreground font-medium">{booking?.id}</span>
      </div>

      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/organization/bookings">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              Mã Hợp đồng: {booking?.id?.length > 20 ? booking?.id?.substring(0, 8) + '...' : booking?.id}
              <Badge variant="outline" className={`${statusInfo.color} font-normal border`}>
                {statusInfo.label}
              </Badge>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Ngày tạo: {fmtDate(booking?.created_at)} • Cập nhật lần cuối: Hôm nay
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Printer className="h-4 w-4" /> In
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" /> Chia sẻ
          </Button>
          {booking?.status === 'PENDING' || booking?.status === 'pending' ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                onClick={() => setShowCancelDialog(true)}
                disabled={cancelling}
              >
                {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                Hủy yêu cầu
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                onClick={handleRetryPayment}
                disabled={retryingPayment}
              >
                {retryingPayment ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                Tiếp tục thanh toán
              </Button>
            </>
          ) : (
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Download className="h-4 w-4" /> Tải hợp đồng
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">

          {/* Organization Info (New) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                Thông tin doanh nghiệp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Tên công ty:</span>
                  <span className="font-medium text-base">{booking?.organization?.name ?? 'N/A'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Mã số thuế:</span>
                  <span className="font-medium">{organizationDetails?.tax_code || booking?.organization?.taxCode || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Người đại diện:</span>
                  <span className="font-medium">{organizationDetails?.representative_name || booking?.organization?.representative || "N/A"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Địa chỉ:</span>
                  <span className="font-medium truncate">{organizationDetails?.headquarters_address || booking.organization?.address || "N/A"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warehouse Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-600" />
                Thông tin kho bãi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-1/3 aspect-video bg-muted rounded-lg overflow-hidden border">
                  {/* Placeholder Image */}
                  <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                  </div>
                </div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="font-bold text-lg">{warehouseName}</h3>
                    <div className="flex items-start gap-2 text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span className="text-sm">{warehouseAddress}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block mb-1">Quản lý kho:</span>
                      <span className="font-medium">—</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Liên hệ:</span>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" /> —
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" /> —
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contract Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                Chi tiết hợp đồng
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Ngày bắt đầu</span>
                  <div className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {fmtDate(booking.started_at)}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Ngày kết thúc</span>
                  <div className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {fmtDate(booking.expired_at)}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Thời hạn</span>
                  <div className="font-medium">{rentalDays ? rentalDays + ' ngày' : 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Giá thuê</span>
                  <div className="font-medium text-emerald-600">{firstDetail?.price_per_month ? fmtCurrency(firstDetail.price_per_month) + '/tháng' : 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Loại kho</span>
                  <div className="font-medium">{contractType}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Chu kỳ thanh toán</span>
                  <div className="font-medium">{booking.payment_method === 'TRANSFER' ? 'Chuyển khoản' : booking.payment_method === 'BALANCE' ? 'Số dư' : booking.payment_method || 'N/A'}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Địa chỉ</span>
                  <div className="font-medium">{organizationDetails?.headquarters_address || booking.organization?.address || "N/A"}</div>
                </div>
              </div>

              <Separator className="my-6" />

              <h4 className="font-medium mb-4">Dịch vụ đi kèm</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {addonsList?.map((service: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-sm font-medium">{service.name}</span>
                    </div>
                    {service.price != null && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {fmtCurrency(service.price)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Activity History (Timeline) */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-600" />
                Tiến độ xử lý
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 border-l-2 border-muted space-y-8">
                {logsList?.map((item: any, index: number) => (
                  <div key={index} className="relative">
                    <div className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white ring-2 bg-emerald-500 ring-emerald-100`} />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-base font-medium text-slate-700">
                        {item.description || item.action || item.type || '—'}
                      </span>
                      <span className="text-xs text-muted-foreground">{fmtDate(item.created_at || item.date)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Người xử lý: {item.actor?.name || item.user || '—'}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Financial & Documents */}
        <div className="space-y-6">
          {/* Financial Summary */}
          <Card className="border-emerald-100 bg-emerald-50/30">
            <CardHeader className="pb-3 border-b border-emerald-100">
              <CardTitle className="text-lg flex items-center gap-2 text-emerald-800">
                <CreditCard className="h-5 w-5" />
                Thông tin thanh toán
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Đơn giá / m²</span>
                  <span>{pricePerM2 != null ? fmtCurrency(pricePerM2) : '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tiền thuê hàng tháng</span>
                  <span>{fmtCurrency(totalPriceNum)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phí dịch vụ</span>
                  <span>{serviceFeeTotal > 0 ? fmtCurrency(serviceFeeTotal) : '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT (10%)</span>
                  <span>{fmtCurrency(vatAmountNum)}</span>
                </div>
                <Separator className="bg-emerald-200/50" />
                <div className="flex justify-between font-bold text-lg text-emerald-700">
                  <span>Tổng cộng</span>
                  <span>{fmtCurrency(finalPriceNum)}</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Kỳ thanh toán tiếp theo</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Hạn thanh toán: <span className="font-medium text-foreground">{pendingPayment ? fmtDate(pendingPayment.expired_at) : 'N/A'}</span>
                    </p>
                  </div>
                </div>
                {(booking.status === 'PENDING' || booking.status === 'pending') && (
                  <Button
                    className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs"
                    onClick={handleRetryPayment}
                    disabled={retryingPayment}
                  >
                    {retryingPayment ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Thanh toán ngay
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Documents */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-600" />
                Tài liệu & Hợp đồng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {<span className="text-sm text-muted-foreground">Chưa có tài liệu nào.</span>}
              {([] as any[]).map((doc: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="h-8 w-8 rounded bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate group-hover:text-emerald-600 transition-colors">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.date} • {doc.size}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" className="w-full text-xs h-8 border-dashed">
                <Plus className="h-3 w-3 mr-2" /> Tải lên tài liệu
              </Button>
            </CardContent>
          </Card>

          {/* Support */}
          <Card className="bg-slate-900 text-white border-none">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-lg">Cần hỗ trợ?</h3>
              <p className="text-slate-300 text-sm">
                Đội ngũ CSKH của chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7.
              </p>
              <Button variant="secondary" className="w-full bg-white text-slate-900 hover:bg-slate-100">
                Liên hệ hỗ trợ
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialog xác nhận hủy yêu cầu */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xác nhận hủy yêu cầu thuê kho</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn hủy yêu cầu thuê kho này không? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCancelDialog(false)} disabled={cancelling}>
              Quay lại
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleCancel}
              disabled={cancelling}
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Xác nhận hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

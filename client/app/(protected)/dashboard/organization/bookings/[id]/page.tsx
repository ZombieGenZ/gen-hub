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
  Plus
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { authStorage } from '@/services/auth/auth-storage.service';
import { rentalContractService } from '@/services/rental-contract/rental-contract.service';

export default function BookingDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [booking, setBooking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const token = authStorage.getAccessToken();
        if (!token) return;

        const data: any = await rentalContractService.getRentalContractById(token, id);

        if (data) {
          const createdDate = new Date(data.created_at || Date.now());

          // Construct Timeline based on status logic requested
          // 1. Sent (Green)
          // 2. Pending (Blue - Current)
          // 3. Sign (Gray - Future)

          // Dynamic helper to determine styling based on current contract status
          const getStepStatus = (stepIndex: number, currentStatus: string) => {
            // Simplified map: 'pending' -> step 2 active. 'active' -> step 3 completed/active.
            if (currentStatus === 'pending') {
              if (stepIndex === 0) return 'completed';
              if (stepIndex === 1) return 'current';
              return 'pending';
            }
            if (currentStatus === 'active') {
              return 'completed';
            }
            return 'pending';
          };

          const timeline = [
            {
              date: createdDate.toLocaleDateString('vi-VN'),
              action: "Gửi yêu cầu thuê",
              user: "Khách hàng",
              status: 'completed'
            },
            {
              date: data.status === 'pending' ? "Hiện tại" : (data.approved_at ? new Date(data.approved_at).toLocaleDateString('vi-VN') : "Đang xử lý"),
              action: "Chờ xác nhận",
              user: "Hệ thống",
              status: getStepStatus(1, data.status)
            },
            {
              date: data.status === 'active' ? (data.signed_at ? new Date(data.signed_at).toLocaleDateString('vi-VN') : "Hoàn tất") : "Dự kiến",
              action: "Ký hợp đồng",
              user: "Admin",
              status: getStepStatus(2, data.status)
            }
          ];

          const mappedBooking = {
            id: data.code || data.order_code || data.id,
            status: data.status || 'pending',
            statusLabel: data.status === 'active' ? 'Đang hoạt động' : (data.status === 'pending' ? 'Chờ xác nhận' : data.status),
            statusColor: data.status === 'active' ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-amber-100 text-amber-700 border-amber-200",
            createdDate: createdDate.toLocaleDateString('vi-VN'),

            warehouse: {
              name: data.warehouse_name || "Kho không tên",
              address: data.warehouse_address || "Chưa cập nhật",
              manager: "Quản lý kho",
              phone: "1900 1234",
              email: "support@genhub.vn",
              image: "/placeholder-warehouse-1.jpg"
            },

            organization: {
              name: data.organization?.name || data.organization_name || "Chưa cập nhật",
              taxCode: data.organization?.tax_code || "N/A",
              representative: data.organization?.representative_name || "N/A",
              address: data.organization?.headquarters_address || "N/A"
            },

            contract: {
              startDate: data.started_at ? new Date(data.started_at).toLocaleDateString('vi-VN') : "N/A",
              endDate: data.ended_at ? new Date(data.ended_at).toLocaleDateString('vi-VN') : "N/A",
              duration: `${data.duration_months || 0} tháng`,
              area: "N/A",
              type: data.rental_type === 'whole' ? "Thuê nguyên kho" : "Thuê theo dãy",
              paymentCycle: "Hàng tháng",
              deposit: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.deposit_amount || 0)
            },

            financial: {
              pricePerSqm: "N/A",
              monthlyRent: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.quotation?.basePrice || 0),
              serviceFee: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.quotation?.serviceFee || 0),
              vat: "Included/N/A",
              totalMonthly: new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.quotation?.grandTotal || 0),
              nextPaymentDate: "N/A",
              paymentStatus: "Chưa thanh toán"
            },

            services: (data.addon_ids || []).map((addonId: string) => ({ name: addonId, included: true })).concat(
              data.insurance_id ? [{ name: data.insurance_id, included: true }] : []
            ),

            documents: [],

            history: timeline
          };
          setBooking(mappedBooking);
        }
      } catch (error) {
        console.error("Failed to fetch booking", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [id]);

  if (loading) {
    return <div className="p-12 text-center text-slate-500">Đang tải thông tin hợp đồng...</div>;
  }

  if (!booking) {
    return <div className="p-12 text-center text-slate-500">Không tìm thấy hợp đồng hoặc có lỗi xảy ra.</div>;
  }

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/organization" className="hover:text-emerald-600">Trang chủ</Link>
        <span className="text-muted-foreground/50">/</span>
        <Link href="/dashboard/organization/bookings" className="hover:text-emerald-600">Đơn thuê của tôi</Link>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-foreground font-medium">{booking.id}</span>
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
              Mã Hợp đồng: {booking.id.length > 20 ? booking.id.substring(0, 8) + '...' : booking.id}
              <Badge variant="outline" className={`${booking.statusColor} font-normal border`}>
                {booking.statusLabel}
              </Badge>
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Ngày tạo: {booking.createdDate} • Cập nhật lần cuối: Hôm nay
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
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Download className="h-4 w-4" /> Tải hợp đồng
          </Button>
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
                  <span className="font-medium text-base">{booking.organization?.name}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Mã số thuế:</span>
                  <span className="font-medium">{booking.organization?.taxCode}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Người đại diện:</span>
                  <span className="font-medium">{booking.organization?.representative}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Địa chỉ:</span>
                  <span className="font-medium truncate">{booking.organization?.address}</span>
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
                    <h3 className="font-bold text-lg">{booking.warehouse.name}</h3>
                    <div className="flex items-start gap-2 text-muted-foreground mt-1">
                      <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                      <span className="text-sm">{booking.warehouse.address}</span>
                    </div>
                  </div>
                  <Separator />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground block mb-1">Quản lý kho:</span>
                      <span className="font-medium">{booking.warehouse.manager}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block mb-1">Liên hệ:</span>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" /> {booking.warehouse.phone}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" /> {booking.warehouse.email}
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
                    {booking.contract.startDate}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Ngày kết thúc</span>
                  <div className="font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {booking.contract.endDate}
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Thời hạn</span>
                  <div className="font-medium">{booking.contract.duration}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Diện tích thuê</span>
                  <div className="font-medium text-emerald-600">{booking.contract.area}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Loại kho</span>
                  <div className="font-medium">{booking.contract.type}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Chu kỳ thanh toán</span>
                  <div className="font-medium">{booking.contract.paymentCycle}</div>
                </div>
                <div className="space-y-1">
                  <span className="text-sm text-muted-foreground">Tiền cọc</span>
                  <div className="font-medium">{booking.contract.deposit}</div>
                </div>
              </div>

              <Separator className="my-6" />

              <h4 className="font-medium mb-4">Dịch vụ đi kèm</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {booking.services.map((service: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
                    <div className="flex items-center gap-2">
                      {service.included ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      <span className="text-sm font-medium">{service.name}</span>
                    </div>
                    {!service.included && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        {service.price}
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
                {booking.history.map((item: any, index: number) => (
                  <div key={index} className="relative">
                    <div className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-white ring-2 ${item.status === 'completed' ? 'bg-emerald-500 ring-emerald-100' :
                        item.status === 'current' ? 'bg-blue-500 ring-blue-100 animate-pulse' :
                          'bg-slate-200 ring-slate-100'
                      }`} />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className={`text-base font-medium ${item.status === 'current' ? 'text-blue-600' :
                          item.status === 'completed' ? 'text-emerald-700' : 'text-slate-500'
                        }`}>
                        {item.action}
                      </span>
                      <span className="text-xs text-muted-foreground">{item.date}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Người xử lý: {item.user}</p>
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
                  <span>{booking.financial.pricePerSqm}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tiền thuê hàng tháng</span>
                  <span>{booking.financial.monthlyRent}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Phí dịch vụ</span>
                  <span>{booking.financial.serviceFee}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">VAT (10%)</span>
                  <span>{booking.financial.vat}</span>
                </div>
                <Separator className="bg-emerald-200/50" />
                <div className="flex justify-between font-bold text-lg text-emerald-700">
                  <span>Tổng cộng</span>
                  <span>{booking.financial.totalMonthly}</span>
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Kỳ thanh toán tiếp theo</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Hạn thanh toán: <span className="font-medium text-foreground">{booking.financial.nextPaymentDate}</span>
                    </p>
                  </div>
                </div>
                <Button className="w-full mt-3 bg-emerald-600 hover:bg-emerald-700 text-white h-8 text-xs">
                  Thanh toán ngay
                </Button>
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
              {booking.documents.length === 0 && <span className="text-sm text-muted-foreground">Chưa có tài liệu nào.</span>}
              {booking.documents.map((doc: any, index: number) => (
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
    </div>
  );
}

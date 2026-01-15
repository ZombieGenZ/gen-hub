import React from 'react';
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
  CreditCard
} from 'lucide-react';
import Link from 'next/link';

export default async function BookingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Mock Data - In a real app, fetch based on params.id
  const booking = {
    id: id || "HD-2023-001",
    status: "active", // active, pending, ended
    statusLabel: "Đang hoạt động",
    statusColor: "bg-emerald-100 text-emerald-700 border-emerald-200",
    createdDate: "28/12/2022",

    warehouse: {
      name: "Kho Tân Bình - Khu A",
      address: "123 Đường Cộng Hòa, Phường 12, Quận Tân Bình, TP. Hồ Chí Minh",
      manager: "Nguyễn Văn Quản Lý",
      phone: "0909 123 456",
      email: "quanly.tanbinh@genhub.vn",
      image: "/placeholder-warehouse-1.jpg"
    },

    contract: {
      startDate: "01/01/2023",
      endDate: "31/12/2023",
      duration: "12 tháng",
      area: "500 m²",
      type: "Kho thường",
      paymentCycle: "Hàng tháng",
      deposit: "30.000.000 đ"
    },

    financial: {
      pricePerSqm: "240.000 đ",
      monthlyRent: "120.000.000 đ",
      serviceFee: "5.000.000 đ",
      vat: "12.500.000 đ",
      totalMonthly: "137.500.000 đ",
      nextPaymentDate: "05/11/2023",
      paymentStatus: "Đã thanh toán T10/2023"
    },

    services: [
      { name: "Bảo vệ 24/7", included: true },
      { name: "PCCC tiêu chuẩn", included: true },
      { name: "Điện 3 pha", included: true },
      { name: "Xe nâng (theo giờ)", included: false, price: "200.000đ/giờ" },
      { name: "Bốc xếp", included: false, price: "Thỏa thuận" }
    ],

    documents: [
      { name: "Hợp đồng thuê kho.pdf", date: "28/12/2022", size: "2.4 MB" },
      { name: "Biên bản bàn giao.pdf", date: "01/01/2023", size: "1.1 MB" },
      { name: "Phụ lục gia hạn.pdf", date: "15/06/2023", size: "0.8 MB" }
    ],

    history: [
      { date: "05/10/2023", action: "Thanh toán tiền thuê tháng 10/2023", user: "Kế toán" },
      { date: "05/09/2023", action: "Thanh toán tiền thuê tháng 09/2023", user: "Kế toán" },
      { date: "15/06/2023", action: "Ký phụ lục gia hạn thêm dịch vụ xe nâng", user: "Admin" },
      { date: "01/01/2023", action: "Bàn giao kho và bắt đầu hợp đồng", user: "Quản lý kho" },
      { date: "28/12/2022", action: "Ký hợp đồng thuê kho", user: "Admin" }
    ]
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header Navigation */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/dashboard/customer" className="hover:text-emerald-600">Trang chủ</Link>
        <span className="text-muted-foreground/50">/</span>
        <Link href="/dashboard/customer/bookings" className="hover:text-emerald-600">Đơn thuê của tôi</Link>
        <span className="text-muted-foreground/50">/</span>
        <span className="text-foreground font-medium">{booking.id}</span>
      </div>

      {/* Title & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/customer/bookings">
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
              Hợp đồng #{booking.id}
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
          {/* Warehouse Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
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
                {booking.services.map((service, index) => (
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

          {/* Activity History */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-600" />
                Lịch sử hoạt động
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 border-l-2 border-muted space-y-6">
                {booking.history.map((item, index) => (
                  <div key={index} className="relative">
                    <div className="absolute -left-7 top-1 h-3 w-3 rounded-full bg-emerald-600 border-2 border-background ring-2 ring-muted" />
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-sm font-medium">{item.action}</span>
                      <span className="text-xs text-muted-foreground">{item.date}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Thực hiện bởi: {item.user}</p>
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
              {booking.documents.map((doc, index) => (
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

function Plus(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  )
}

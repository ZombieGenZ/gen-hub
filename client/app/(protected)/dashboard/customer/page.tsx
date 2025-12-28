import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Package, 
  AlertCircle, 
  Ticket, 
  Plus, 
  CreditCard, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2,
  MoreVertical
} from 'lucide-react';
import Link from 'next/link';

export default function CustomerDashboardPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tổng quan tài khoản</h1>
          <p className="text-muted-foreground">Chào mừng trở lại, Công ty ABC. Dưới đây là tình hình kho hàng của bạn.</p>
        </div>
        <div className="flex gap-2">
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
            <Plus className="w-4 h-4" /> Tạo yêu cầu thuê
          </Button>
          <Button variant="outline" className="gap-2">
            <CreditCard className="w-4 h-4" /> Thanh toán ngay
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hợp đồng hoạt động</p>
                <div className="text-3xl font-bold mt-2">3</div>
              </div>
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <FileText className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="secondary" className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100">
                <ArrowUpRight className="w-3 h-3 mr-1" /> Ổn định
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dung lượng kho</p>
                <div className="text-3xl font-bold mt-2">85%</div>
              </div>
              <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                <Package className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="secondary" className="text-orange-600 bg-orange-50 hover:bg-orange-100">
                <ArrowUpRight className="w-3 h-3 mr-1" /> +5% tháng này
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hóa đơn chờ TT</p>
                <div className="text-3xl font-bold mt-2">1</div>
              </div>
              <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="secondary" className="text-red-600 bg-red-50 hover:bg-red-100">
                <AlertCircle className="w-3 h-3 mr-1" /> Hết hạn trong 3 ngày
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex flex-col justify-between h-full">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Vé hỗ trợ</p>
                <div className="text-3xl font-bold mt-2">2</div>
              </div>
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                <Ticket className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-4">
              <Badge variant="secondary" className="text-slate-600 bg-slate-100 hover:bg-slate-200">
                Đang xử lý
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Chart Section Placeholder */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-bold">Chi phí thuê kho theo tháng</CardTitle>
              <Badge variant="outline">6 tháng qua</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full flex items-end justify-between gap-2 px-4 pb-2">
              {/* Mock Bars */}
              {[30, 45, 35, 50, 40, 60].map((h, i) => (
                <div key={i} className="flex flex-col items-center gap-2 w-full">
                  <div 
                    className="w-full max-w-10 bg-emerald-500 rounded-t-sm hover:bg-emerald-600 transition-all"
                    style={{ height: `${h}%` }}
                  ></div>
                  <span className="text-xs text-muted-foreground">T{i + 1}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base font-bold">Thông báo quan trọng</CardTitle>
              <Button variant="link" className="text-xs h-auto p-0 text-emerald-600">Xem tất cả</Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-bold text-red-700">Hóa đơn #INV-2024-05 quá hạn</h4>
                <p className="text-xs text-red-600 mt-1">Vui lòng thanh toán trước ngày 15/06 để tránh phí phạt.</p>
                <Button variant="link" className="text-xs h-auto p-0 text-red-700 font-bold mt-2">Thanh toán ngay</Button>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-blue-600">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Bảo trì Khu vực B</h4>
                <p className="text-xs text-muted-foreground mt-1">Hệ thống điện kho B sẽ được bảo trì vào ngày 20/06 (08:00 - 12:00).</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Yêu cầu nhập kho hoàn tất</h4>
                <p className="text-xs text-muted-foreground mt-1">Đơn #REQ-998 đã được xử lý xong lúc 10:30 AM.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-base font-bold">Hợp đồng & Đơn thuê gần đây</CardTitle>
            <div className="flex gap-2 items-center">
              <Link href="/dashboard/customer/bookings">
                <Button variant="link" className="text-xs h-auto p-0 text-emerald-600 mr-2">Xem tất cả</Button>
              </Link>
              <Button variant="outline" size="sm">Lọc</Button>
              <Button variant="outline" size="sm">Xuất Excel</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-4 py-3 rounded-tl-lg">Mã đơn</th>
                  <th className="px-4 py-3">Khu vực kho</th>
                  <th className="px-4 py-3">Ngày tạo</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Chi phí</th>
                  <th className="px-4 py-3 rounded-tr-lg text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">#CTR-2024-003</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">A</div>
                      Kho Lạnh A2
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">12/06/2024</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0">Đang hoạt động</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">15.000.000 đ</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
                <tr className="hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-medium">#ORD-9921</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">B</div>
                      Kho Thường B1
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">10/06/2024</td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-0">Chờ xác nhận</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">5.500.000 đ</td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

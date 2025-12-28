"use client"

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '../../../../../components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Calendar, 
  Plus, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// Mock Data
const bookings = [
  {
    id: "HD-2023-001",
    warehouseName: "Kho Tân Bình - Khu A",
    location: "TP. Hồ Chí Minh",
    image: "/placeholder-warehouse-1.jpg",
    startDate: "01/01/2023",
    endDate: "31/12/2023",
    area: "500",
    totalCost: "120.000.000",
    status: "Đang hoạt động",
    statusColor: "bg-emerald-100 text-emerald-700"
  },
  {
    id: "HD-2023-089",
    warehouseName: "Kho lạnh Long Hậu",
    location: "Long An",
    image: "/placeholder-warehouse-2.jpg",
    startDate: "15/11/2023",
    endDate: "15/05/2024",
    area: "200",
    totalCost: "45.000.000",
    status: "Đang chờ duyệt",
    statusColor: "bg-yellow-100 text-yellow-700"
  },
  {
    id: "HD-2022-115",
    warehouseName: "Kho mini Quận 7",
    location: "TP. Hồ Chí Minh",
    image: "/placeholder-warehouse-3.jpg",
    startDate: "01/06/2022",
    endDate: "01/06/2023",
    area: "80",
    totalCost: "18.000.000",
    status: "Đã kết thúc",
    statusColor: "bg-slate-100 text-slate-700"
  },
  {
    id: "HD-2023-220",
    warehouseName: "Trung tâm Logistics Sóng Thần",
    location: "Bình Dương",
    image: "/placeholder-warehouse-4.jpg",
    startDate: "01/09/2023",
    endDate: "01/09/2025",
    area: "1,200",
    totalCost: "350.000.000",
    status: "Đang hoạt động",
    statusColor: "bg-emerald-100 text-emerald-700"
  },
  {
    id: "HD-2024-005",
    warehouseName: "Kho trung chuyển Đà Nẵng",
    location: "Đà Nẵng",
    image: "/placeholder-warehouse-5.jpg",
    startDate: "01/02/2024",
    endDate: "01/02/2025",
    area: "450",
    totalCost: "85.000.000",
    status: "Đang chờ duyệt",
    statusColor: "bg-yellow-100 text-yellow-700"
  }
];

export default function CustomerBookingsPage() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center text-sm text-muted-foreground mb-1">
            <Link href="/dashboard/customer" className="hover:text-emerald-600">Trang chủ</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground">Đơn thuê của tôi</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Đơn thuê của tôi</h1>
          <p className="text-muted-foreground">Quản lý và theo dõi tất cả các hợp đồng thuê kho của bạn tại đây.</p>
        </div>
        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
          <Plus className="w-4 h-4" /> Tạo đơn thuê mới
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-background p-4 rounded-lg border shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Tìm kiếm theo mã hợp đồng hoặc tên kho..." className="pl-9" />
        </div>
        <div className="w-full md:w-52">
          <Select>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Trạng thái: Tất cả" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Trạng thái: Tất cả</SelectItem>
              <SelectItem value="active">Đang hoạt động</SelectItem>
              <SelectItem value="pending">Đang chờ duyệt</SelectItem>
              <SelectItem value="ended">Đã kết thúc</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-full md:w-52">
          <Select>
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <SelectValue placeholder="Thời gian" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả thời gian</SelectItem>
              <SelectItem value="this_month">Tháng này</SelectItem>
              <SelectItem value="last_month">Tháng trước</SelectItem>
              <SelectItem value="this_year">Năm nay</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-background rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Tên kho</th>
                <th className="px-6 py-4 font-medium">Mã hợp đồng</th>
                <th className="px-6 py-4 font-medium">Thời gian thuê</th>
                <th className="px-6 py-4 font-medium text-right">Diện tích</th>
                <th className="px-6 py-4 font-medium text-right">Tổng chi phí</th>
                <th className="px-6 py-4 font-medium text-center">Trạng thái</th>
                <th className="px-6 py-4 font-medium text-center"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bookings.map((booking) => (
                <tr key={booking.id} className="hover:bg-muted/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0 border">
                        {/* Placeholder Image */}
                        <div className="w-full h-full bg-slate-200 flex items-center justify-center text-slate-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        </div>
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{booking.warehouseName}</div>
                        <div className="text-xs text-muted-foreground">{booking.location}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium text-foreground">#{booking.id}</td>
                  <td className="px-6 py-4 text-muted-foreground">
                    <div className="flex flex-col text-xs">
                      <span>{booking.startDate}</span>
                      <span>đến {booking.endDate}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-bold">{booking.area}</span> <span className="text-xs text-muted-foreground">m²</span>
                  </td>
                  <td className="px-6 py-4 text-right font-bold">
                    {booking.totalCost} <span className="text-xs font-normal text-muted-foreground">đ</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant="secondary" className={`border-0 font-normal ${booking.statusColor}`}>
                      {booking.status.replace('Đang ', '').replace('Đã ', '')}
                      {booking.status.includes('Đang') && <span className="ml-1">...</span>}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link href={`/dashboard/customer/bookings/${booking.id}`}>
                      <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50">
                        Xem chi tiết
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t bg-muted/20">
          <div className="text-sm text-muted-foreground">
            Hiển thị <span className="font-medium text-foreground">1</span> đến <span className="font-medium text-foreground">5</span> của <span className="font-medium text-foreground">12</span> kết quả
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled className="h-8 px-3">Trước</Button>
            <Button variant="default" size="sm" className="h-8 w-8 p-0 bg-emerald-600 hover:bg-emerald-700">1</Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">2</Button>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0">3</Button>
            <Button variant="outline" size="sm" className="h-8 px-3">Sau</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

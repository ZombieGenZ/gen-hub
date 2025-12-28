import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import Link from 'next/link';

// Mock Data
const warehouses = [
  {
    id: 1,
    name: "Kho Fulfillment Tân Bình",
    location: "KCN Tân Bình, TP.HCM",
    area: "12,000 m²",
    type: "Kho lạnh",
    tags: ["PCCC Tiêu chuẩn", "CCTV 24/7", "Dock Levelers"],
    image: "/placeholder-warehouse-1.jpg",
    status: "Còn trống",
    statusColor: "bg-emerald-500"
  },
  {
    id: 2,
    name: "Kho Ngoại Quan VSIP 1",
    location: "VSIP 1, Thuận An, Bình Dương",
    area: "25,000 m²",
    type: "Ngoại quan",
    tags: ["Bảo vệ 24/7", "Gần cảng biển"],
    image: "/placeholder-warehouse-2.jpg",
    status: "Sắp đầy",
    statusColor: "bg-warning"
  },
  {
    id: 3,
    name: "Kho Phân Phối Long Biên",
    location: "Long Biên, Hà Nội",
    area: "8,500 m²",
    type: "Phân phối",
    tags: ["Xe trung tâm", "Xe container 40ft"],
    image: "/placeholder-warehouse-3.jpg",
    status: "Còn trống",
    statusColor: "bg-emerald-500"
  },
  {
    id: 4,
    name: "Kho Mát Đà Nẵng",
    location: "Hòa Cầm, Cẩm Lệ, Đà Nẵng",
    area: "5,000 m²",
    type: "Kho mát",
    tags: ["Kiểm soát nhiệt độ", "Chứng chỉ ISO"],
    image: "/placeholder-warehouse-4.jpg",
    status: "Còn trống",
    statusColor: "bg-emerald-500"
  },
  {
    id: 5,
    name: "Kho Mini Quận 7",
    location: "Tân Thuận Đông, Quận 7, TP.HCM",
    area: "1,200 m²",
    type: "Kho tự quản",
    tags: ["Linh hoạt thời gian", "An ninh cao"],
    image: "/placeholder-warehouse-5.jpg",
    status: "Còn trống",
    statusColor: "bg-emerald-500"
  },
  {
    id: 6,
    name: "Trung Tâm Logistics Amata",
    location: "KCN Amata, Biên Hòa, Đồng Nai",
    area: "50,000 m²",
    type: "Logistics Hub",
    tags: ["Hệ thống tự động hóa", "Cảng cạn ICD"],
    image: "/placeholder-warehouse-6.jpg",
    status: "Đã đầy",
    statusColor: "bg-red-500"
  }
];

export default function WarehousesPage() {
  return (
    <div className="flex flex-col min-h-screen bg-muted/10">
      {/* Header */}
      <div className="bg-background border-b">
        <div className="container px-4 py-10 md:px-6">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Hệ thống Kho Bãi Toàn Quốc</h1>
          <p className="text-muted-foreground max-w-[700px]">
            Khám phá mạng lưới kho bãi hiện đại, tiện nghi và được xác thực của chúng tôi. Tìm kiếm không gian lưu trữ hoàn hảo cho doanh nghiệp của bạn.
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="container px-4 py-6 md:px-6">
        <div className="bg-background p-4 rounded-lg border shadow-sm flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <Input placeholder="Tìm kiếm theo tên kho, vị trí hoặc mã số..." className="pl-10" />
          </div>
          <div className="w-full md:w-[200px]">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Khu vực: Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Khu vực: Tất cả</SelectItem>
                <SelectItem value="hcm">TP. Hồ Chí Minh</SelectItem>
                <SelectItem value="hn">Hà Nội</SelectItem>
                <SelectItem value="dn">Đà Nẵng</SelectItem>
                <SelectItem value="bd">Bình Dương</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-[200px]">
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Loại kho: Tất cả" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Loại kho: Tất cả</SelectItem>
                <SelectItem value="cold">Kho lạnh</SelectItem>
                <SelectItem value="bonded">Ngoại quan</SelectItem>
                <SelectItem value="distribution">Phân phối</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="outline" size="icon" className="shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="21" x2="14" y1="4" y2="4" /><line x1="10" x2="3" y1="4" y2="4" /><line x1="21" x2="12" y1="12" y2="12" /><line x1="8" x2="3" y1="12" y2="12" /><line x1="21" x2="16" y1="20" y2="20" /><line x1="12" x2="3" y1="20" y2="20" /><line x1="14" x2="14" y1="2" y2="6" /><line x1="8" x2="8" y1="10" y2="14" /><line x1="16" x2="16" y1="18" y2="22" /></svg>
          </Button>
        </div>

        {/* Active Filters */}
        <div className="flex gap-2 mt-4 flex-wrap">
          <span className="text-sm text-muted-foreground self-center mr-2">ĐANG LỌC:</span>
          <Badge variant="secondary" className="rounded-sm font-normal flex gap-1 items-center px-2 py-1">
            TP. Hồ Chí Minh <button className="hover:text-foreground"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
          </Badge>
          <Badge variant="secondary" className="rounded-sm font-normal flex gap-1 items-center px-2 py-1">
            Kho lạnh <button className="hover:text-foreground"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg></button>
          </Badge>
          <Button variant="link" size="sm" className="text-muted-foreground h-auto p-0 ml-auto">Xóa tất cả</Button>
        </div>
      </div>

      {/* Warehouse Grid */}
      <div className="container px-4 py-6 md:px-6 mb-12">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {warehouses.map((warehouse) => (
            <div key={warehouse.id} className="group rounded-xl border bg-card text-card-foreground shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="relative aspect-[4/3] bg-muted overflow-hidden">
                {/* Placeholder Image */}
                <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                  <span className="text-sm">Image: {warehouse.name}</span>
                </div>
                <div className="absolute top-3 left-3">
                  <Badge className="bg-white/90 text-foreground hover:bg-white/100 shadow-sm backdrop-blur-sm border-0">
                    <span className={`w-2 h-2 rounded-full mr-2 ${warehouse.statusColor}`}></span>
                    {warehouse.status}
                  </Badge>
                </div>
                <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded flex items-center gap-1 backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" /></svg>
                  8 ảnh
                </div>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="font-bold text-lg line-clamp-1 group-hover:text-brand transition-colors">{warehouse.name}</h3>
                  <div className="flex items-center text-muted-foreground text-sm mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 shrink-0"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                    <span className="line-clamp-1">{warehouse.location}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-dashed">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Diện tích</p>
                    <div className="flex items-center font-medium text-brand">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" /><path d="m14.5 12.5 2-2" /><path d="m11.5 9.5 2-2" /><path d="m8.5 6.5 2-2" /><path d="m17.5 15.5 2-2" /></svg>
                      {warehouse.area}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase font-semibold mb-1">Loại kho</p>
                    <div className="flex items-center font-medium">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 text-warning"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg>
                      {warehouse.type}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {warehouse.tags.map((tag, i) => (
                    <Badge key={i} variant="secondary" className="text-xs font-normal bg-muted text-muted-foreground hover:bg-muted">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <Button className="w-full bg-brand-subtle hover:bg-brand/10 text-brand border-brand/20 border shadow-none">
                  Xem chi tiết
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex justify-center mt-12 gap-2">
          <Button variant="outline" size="icon" disabled>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
          </Button>
          <Button variant="default" className="bg-brand hover:bg-brand-hover w-9 h-9 p-0">1</Button>
          <Button variant="outline" className="w-9 h-9 p-0">2</Button>
          <Button variant="outline" className="w-9 h-9 p-0">3</Button>
          <span className="flex items-center justify-center w-9 h-9 text-muted-foreground">...</span>
          <Button variant="outline" className="w-9 h-9 p-0">8</Button>
          <Button variant="outline" size="icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
          </Button>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';

export default function WarehouseDetailPage({ params }: { params: { id: string } }) {
  // Mock data based on the ID (in a real app, fetch this)
  const warehouse = {
    id: params.id,
    name: "Kho lạnh tiêu chuẩn A - KCN Tân Bình",
    code: "WH-TB-001",
    updated: "2 giờ trước",
    address: "12 Lê Trọng Tấn, P. Tây Thạnh, Q. Tân Phú, TP.HCM",
    status: "Đã xác minh",
    type: "Kho lạnh",
    price: "120.000đ",
    unit: "/m²/tháng",
    availability: "ĐANG TRỐNG",
    specs: [
      { label: "Diện tích", value: "5.000 m²", icon: "area" },
      { label: "Chiều cao", value: "12m", icon: "height" },
      { label: "Tải trọng sàn", value: "3 tấn/m²", icon: "weight" },
      { label: "Sức chứa", value: "8.000 Pallets", icon: "pallet" },
    ],
    description: `Kho lạnh tiêu chuẩn A tọa lạc tại vị trí chiến lược trong KCN Tân Bình, thuận tiện kết nối với Quốc lộ 1A và sân bay Tân Sơn Nhất. Được thiết kế chuyên biệt cho ngành thực phẩm, dược phẩm và hàng tiêu dùng nhanh (FMCG).

Hệ thống kho được trang bị công nghệ kiểm soát nhiệt độ tự động, đảm bảo dải nhiệt độ ổn định từ -25°C đến +10°C tùy theo nhu cầu. Hệ thống kệ racking selective hiện đại, tối ưu hóa khả năng lưu trữ và vận hành xe nâng.`,
    amenities: [
      "Hệ thống PCCC tự động (Sprinkler)",
      "Camera an ninh 24/7 (CCTV)",
      "Hệ thống Dock Levelers (10 cửa)",
      "Trạm biến áp riêng 3 pha",
      "Văn phòng điều hành tại chỗ",
      "Bãi đậu xe Container rộng rãi"
    ],
    rating: 4.8,
    reviewCount: 12,
    reviews: [
      {
        user: "Công ty Logistics Hùng Cường",
        avatar: "/placeholder-avatar.jpg",
        rating: 5,
        date: "1 tháng trước",
        comment: "Kho rất sạch sẽ, hệ thống làm lạnh hoạt động ổn định. Ban quản lý hỗ trợ nhiệt tình. Rất hài lòng khi thuê tại đây."
      }
    ]
  };

  const relatedWarehouses = [
    { id: 1, name: "Kho B2 - KCN Sóng Thần", location: "Dĩ An, Bình Dương", area: "3.000 m²", height: "10m", price: "100.000đ/m²" },
    { id: 2, name: "Kho Xưởng Long Hậu", location: "Cần Giuộc, Long An", area: "2.500 m²", height: "9m", price: "95.000đ/m²" },
    { id: 3, name: "Kho KCN VSIP 1", location: "Thuận An, Bình Dương", area: "6.000 m²", height: "14m", price: "135.000đ/m²" },
  ];

  return (
    <div className="min-h-screen bg-muted/10 pb-20">
      {/* Breadcrumb & Header */}
      <div className="bg-background border-b">
        <div className="container px-4 py-4 md:px-6">
          <div className="flex items-center text-sm text-muted-foreground mb-4">
            <Link href="/" className="hover:text-brand">Trang chủ</Link>
            <span className="mx-2">/</span>
            <Link href="/warehouses" className="hover:text-brand">Danh sách kho</Link>
            <span className="mx-2">/</span>
            <span className="text-foreground font-medium truncate">{warehouse.name}</span>
          </div>

          <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{warehouse.name}</h1>
                <Badge className="bg-brand-subtle text-brand hover:bg-brand/10 border-0 gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></svg>
                  {warehouse.status}
                </Badge>
                <Badge variant="outline" className="text-slate-600 gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><circle cx="12" cy="12" r="3" /></svg>
                  {warehouse.type}
                </Badge>
              </div>
              <div className="flex items-center text-sm text-muted-foreground gap-4 flex-wrap">
                <span>Mã kho: <span className="font-medium text-foreground">{warehouse.code}</span></span>
                <span className="hidden md:inline">•</span>
                <span>Cập nhật: {warehouse.updated}</span>
                <span className="hidden md:inline">•</span>
                <span className="flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                  {warehouse.address}
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" className="gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.59" x2="15.42" y1="13.51" y2="17.49" /><line x1="15.41" x2="8.59" y1="6.51" y2="10.49" /></svg>
                Chia sẻ
              </Button>
              <Button variant="outline" size="sm" className="gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></svg>
                Lưu tin
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container px-4 py-6 md:px-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[400px] rounded-xl overflow-hidden">
              <div className="col-span-2 row-span-2 bg-muted relative group cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-slate-200">Main Image</div>
              </div>
              <div className="bg-muted relative group cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-slate-200">Img 2</div>
              </div>
              <div className="bg-muted relative group cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-slate-200">Img 3</div>
              </div>
              <div className="bg-muted relative group cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-slate-200">Img 4</div>
              </div>
              <div className="bg-muted relative group cursor-pointer">
                <div className="absolute inset-0 flex items-center justify-center text-white bg-slate-800/50 font-medium backdrop-blur-sm hover:bg-slate-800/60 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                  Xem tất cả 12 ảnh
                </div>
              </div>
            </div>

            {/* Specs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-background p-6 rounded-xl border shadow-sm">
              {warehouse.specs.map((spec, index) => (
                <div key={index} className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground flex items-center gap-2">
                    {/* Icons based on label would go here */}
                    {spec.label}
                  </span>
                  <span className="font-bold text-lg">{spec.value}</span>
                </div>
              ))}
            </div>

            {/* Description */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Giới thiệu về kho</h2>
              <div className="text-muted-foreground whitespace-pre-line leading-relaxed">
                {warehouse.description}
              </div>
            </div>

            {/* Amenities */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Tiện ích & An toàn</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {warehouse.amenities.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 text-slate-700">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-brand shrink-0"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Map */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold">Vị trí</h2>
                <a href="#" className="text-sm text-brand hover:underline font-medium">Xem trên Google Maps</a>
              </div>
              <div className="aspect-video bg-muted rounded-xl relative overflow-hidden border">
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-slate-100">
                  Map Placeholder
                </div>
                <div className="absolute bottom-4 left-4 bg-white p-3 rounded-lg shadow-md max-w-xs">
                  <p className="font-bold text-sm">{warehouse.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">Cách QL1A: 2km • Cách Sân bay: 5km</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Reviews */}
            <div className="space-y-6">
              <h2 className="text-xl font-bold">Đánh giá từ khách thuê</h2>
              <div className="flex items-center gap-4">
                <div className="text-5xl font-bold text-slate-900">{warehouse.rating}</div>
                <div className="space-y-1">
                  <div className="flex text-yellow-400">
                    {[1, 2, 3, 4, 5].map(i => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">Dựa trên {warehouse.reviewCount} đánh giá</p>
                </div>
              </div>

              {/* Review Item */}
              {warehouse.reviews.map((review, index) => (
                <div key={index} className="bg-background p-4 rounded-xl border">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-500">
                      {review.user.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{review.user}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex text-yellow-400 text-xs">
                          {[1, 2, 3, 4, 5].map(i => (
                            <svg key={i} xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">{review.date}</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">{review.comment}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Price Card */}
              <div className="bg-background p-6 rounded-xl border shadow-sm space-y-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Giá thuê tham khảo</p>
                  <div className="flex items-end gap-1">
                    <span className="text-3xl font-bold text-brand">{warehouse.price}</span>
                    <span className="text-sm text-muted-foreground mb-1">{warehouse.unit}</span>
                    <Badge variant="secondary" className="ml-auto bg-brand-subtle text-brand hover:bg-brand/10">
                      {warehouse.availability}
                    </Badge>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <h3 className="font-bold">Liên hệ thuê</h3>
                  <div className="space-y-3">
                    <Input placeholder="Họ và tên" />
                    <Input placeholder="Số điện thoại" />
                    <Textarea placeholder="Nội dung cần tư vấn..." className="min-h-[80px]" />
                  </div>
                  <Button className="w-full bg-brand hover:bg-brand-hover text-white font-bold">
                    Gửi yêu cầu tư vấn
                  </Button>
                  <Button variant="outline" className="w-full border-brand text-brand hover:bg-brand-subtle font-bold">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                    0909 123 456
                  </Button>
                </div>
              </div>

              {/* Agent Card */}
              <div className="bg-background p-4 rounded-xl border shadow-sm flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden">
                  {/* Avatar Placeholder */}
                  <div className="w-full h-full flex items-center justify-center bg-slate-300 text-slate-500">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm">Nguyễn Văn A</p>
                  <p className="text-xs text-muted-foreground">Chuyên viên tư vấn - SmartWarehouse</p>
                </div>
                <Button variant="ghost" size="icon" className="text-brand">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                </Button>
              </div>

              {/* Documents */}
              <div className="bg-background p-4 rounded-xl border shadow-sm space-y-3">
                <h3 className="font-bold text-sm">Tài liệu đính kèm</h3>
                <a href="#" className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group">
                  <div className="w-8 h-8 rounded bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /></svg>
                  </div>
                  <span className="text-sm text-slate-600 group-hover:text-brand transition-colors">Brochure giới thiệu.pdf</span>
                </a>
                <a href="#" className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg transition-colors group">
                  <div className="w-8 h-8 rounded bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12h20" /><path d="M2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6" /><path d="M12 2v10" /><path d="m17 7-5 5-5-5" /></svg>
                  </div>
                  <span className="text-sm text-slate-600 group-hover:text-brand transition-colors">Sơ đồ mặt bằng (CAD)</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Related Warehouses */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-6">Kho tương tự có thể bạn quan tâm</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedWarehouses.map((item) => (
              <div key={item.id} className="bg-background rounded-xl border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                <div className="aspect-[4/3] bg-muted relative">
                  <div className="absolute top-3 left-3">
                    <Badge className="bg-white/90 text-foreground hover:bg-white/100 shadow-sm backdrop-blur-sm border-0 text-xs">
                      CHO THUÊ
                    </Badge>
                  </div>
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">Image</div>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">{item.location}</p>
                  <div className="flex items-center gap-4 text-sm font-medium text-slate-700 mb-4">
                    <span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z" /><path d="m14.5 12.5 2-2" /><path d="m11.5 9.5 2-2" /><path d="m8.5 6.5 2-2" /><path d="m17.5 15.5 2-2" /></svg> {item.area}</span>
                    <span className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7a5 5 0 0 0-5-5H8a5 5 0 0 0-5 5v5" /><path d="M3 12v9a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-9" /><path d="M3 12h18" /></svg> {item.height}</span>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-dashed">
                    <span className="font-bold text-brand">{item.price}</span>
                    <button className="text-xs font-bold text-muted-foreground hover:text-brand uppercase tracking-wide">Chi tiết</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

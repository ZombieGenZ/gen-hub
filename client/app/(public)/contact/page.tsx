import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export default function ContactPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-slate-900 text-white py-20 lg:py-32 overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-30">
          {/* Background Image Placeholder */}
          <div className="w-full h-full bg-gradient-to-r from-slate-950 to-brand/40"></div>
        </div>
        <div className="container relative z-10 px-4 md:px-6 text-center">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl mb-4">Liên hệ với chúng tôi</h1>
          <p className="max-w-[700px] mx-auto text-slate-300 md:text-xl">
            Đội ngũ SmartWarehouse Pro luôn sẵn sàng lắng nghe và hỗ trợ bạn. Hãy gửi tin nhắn hoặc kết nối trực tiếp để được giải đáp mọi thắc mắc về quản lý kho hàng.
          </p>
        </div>
      </section>

      <div className="container px-4 md:px-6 -mt-16 relative z-20 mb-20">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-background p-6 rounded-xl shadow-lg border space-y-6">
              <h3 className="text-sm font-bold text-brand uppercase tracking-wide mb-4">Kênh hỗ trợ</h3>
              <h2 className="text-2xl font-bold mb-6">Thông tin liên hệ</h2>
              <p className="text-muted-foreground mb-8">
                Kết nối ngay với bộ phận hỗ trợ kỹ thuật hoặc kinh doanh qua các kênh chính thức dưới đây.
              </p>

              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-lg border bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-brand-subtle text-brand flex items-center justify-center shrink-0 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Hotline Hỗ trợ</h4>
                    <p className="text-sm text-muted-foreground mb-1">1900 xxxx (8:00 - 17:30)</p>
                    <a href="tel:1900xxxx" className="text-sm font-bold text-brand hover:underline">Gọi ngay</a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg border bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-brand-subtle text-brand flex items-center justify-center shrink-0 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Email Liên hệ</h4>
                    <p className="text-sm text-muted-foreground mb-1">support@smartwarehouse.vn</p>
                    <a href="mailto:support@smartwarehouse.vn" className="text-sm font-bold text-brand hover:underline">Gửi email</a>
                  </div>
                </div>

                <div className="flex items-start gap-4 p-4 rounded-lg border bg-slate-50/50 hover:bg-slate-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-brand-subtle text-brand flex items-center justify-center shrink-0 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Trụ sở Chính</h4>
                    <p className="text-sm text-muted-foreground mb-1">Tầng 12, Tòa nhà TechPark, Quận Cầu Giấy, Hà Nội</p>
                    <a href="#" className="text-sm font-bold text-brand hover:underline">Xem bản đồ</a>
                  </div>
                </div>
              </div>

              <div className="pt-6">
                <h4 className="font-bold text-sm mb-3">Mạng xã hội</h4>
                <div className="flex gap-3">
                  <Button variant="outline" size="icon" className="rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>
                  </Button>
                  <Button variant="outline" size="icon" className="rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <div className="bg-background p-8 rounded-xl shadow-lg border h-full">
              <h2 className="text-2xl font-bold mb-2">Gửi tin nhắn trực tuyến</h2>
              <p className="text-muted-foreground mb-8 text-sm">
                Điền thông tin vào biểu mẫu dưới đây, chúng tôi sẽ phản hồi trong vòng 24 giờ làm việc.
              </p>

              <form className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name">Họ và tên <span className="text-red-500">*</span></Label>
                    <Input id="name" placeholder="Nguyễn Văn A" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email doanh nghiệp <span className="text-red-500">*</span></Label>
                    <Input id="email" type="email" placeholder="name@company.com" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Chủ đề <span className="text-red-500">*</span></Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn vấn đề cần hỗ trợ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sales">Tư vấn dịch vụ & Báo giá</SelectItem>
                      <SelectItem value="support">Hỗ trợ kỹ thuật</SelectItem>
                      <SelectItem value="partnership">Hợp tác đối tác</SelectItem>
                      <SelectItem value="other">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Nội dung tin nhắn <span className="text-red-500">*</span></Label>
                  <Textarea id="message" placeholder="Mô tả chi tiết yêu cầu của bạn..." className="min-h-[150px]" />
                </div>

                <div className="flex items-center justify-between pt-4">
                  <Button size="lg" className="bg-brand hover:bg-brand-hover text-white min-w-[150px]">
                    Gửi tin nhắn
                  </Button>
                  <p className="text-xs text-muted-foreground italic">* Chúng tôi cam kết bảo mật thông tin của bạn.</p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <section className="h-[400px] bg-muted relative w-full">
        <div className="absolute inset-0 flex items-center justify-center bg-slate-200 text-slate-500">
          {/* Map Placeholder */}
          <div className="text-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></svg>
            <p className="text-lg font-medium">Google Maps Embed Placeholder</p>
          </div>
        </div>

        {/* Map Overlay Card */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white p-4 rounded-xl shadow-lg flex items-center gap-4 max-w-sm w-full mx-4 md:mx-0">
          <div className="w-12 h-12 bg-brand-subtle rounded-full flex items-center justify-center text-brand shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
          </div>
          <div>
            <h4 className="font-bold text-sm">SmartWarehouse Pro</h4>
            <p className="text-xs text-muted-foreground">Tòa nhà TechPark, Cầu Giấy</p>
            <a href="#" className="text-xs font-bold text-brand flex items-center gap-1 mt-1">
              XEM TRÊN GOOGLE MAPS <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" x2="21" y1="14" y2="3" /></svg>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

import React from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="bg-background py-20 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="flex flex-col justify-center space-y-4">
              <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                Cách mạng hóa quy trình Logistics của bạn với SmartWarehouse Pro
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl">
                Nền tảng toàn diện cho quản lý kho hàng hiện đại. Trải nghiệm theo dõi thời gian thực, quy trình tự động và thông tin chi tiết được hỗ trợ bởi AI.
              </p>
              <div className="flex flex-col gap-2 min-[400px]:flex-row">
                <Button size="lg" className="bg-brand hover:bg-brand-hover text-white">
                  Dùng thử miễn phí
                </Button>
                <Button size="lg" variant="outline">
                  Xem Demo
                </Button>
              </div>
            </div>
            <div className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last">
              {/* Placeholder for Hero Image */}
              <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                <span className="text-lg">Hero Image Placeholder</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-12 bg-muted/50">
        <div className="container px-4 md:px-6">
          <p className="text-center text-sm font-semibold text-muted-foreground tracking-wide uppercase mb-8">
            Được tin dùng bởi các nhà lãnh đạo ngành trên toàn cầu
          </p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
            <div className="flex items-center gap-2 font-bold text-xl"><span className="h-6 w-6 bg-current rounded-full"></span> LogisticsInc</div>
            <div className="flex items-center gap-2 font-bold text-xl"><span className="h-6 w-6 bg-current rounded-full"></span> SwiftCargo</div>
            <div className="flex items-center gap-2 font-bold text-xl"><span className="h-6 w-6 bg-current rounded-full"></span> GlobalFreight</div>
            <div className="flex items-center gap-2 font-bold text-xl"><span className="h-6 w-6 bg-current rounded-full"></span> WarehouseX</div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-20 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full">
              {/* Placeholder for Mission Image */}
              <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                <span className="text-lg">Mission Image Placeholder</span>
              </div>
            </div>
            <div className="flex flex-col justify-center space-y-4">
              <div className="inline-block rounded-lg bg-brand-subtle px-3 py-1 text-sm text-brand w-fit">
                Sứ mệnh của chúng tôi
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Nâng cao sự minh bạch trong chuỗi cung ứng
              </h2>
              <p className="max-w-[600px] text-muted-foreground md:text-lg">
                Chúng tôi tồn tại để loại bỏ những điểm mù trong logistics toàn cầu. Bằng cách cung cấp các công cụ mang lại khả năng hiển thị và kiểm soát chi tiết, chúng tôi trao quyền cho các doanh nghiệp thực hiện lời hứa, không chỉ là giao hàng. Sứ mệnh của chúng tôi là đảm bảo mọi sản phẩm đến đích một cách hiệu quả và minh bạch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-20 lg:py-32 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="grid gap-6 lg:grid-cols-2 lg:gap-12 items-center">
            <div className="flex flex-col justify-center space-y-4">
              <div className="inline-block rounded-lg bg-brand-subtle px-3 py-1 text-sm text-brand w-fit">
                Tầm nhìn của chúng tôi
              </div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">
                Tương lai của kho vận là sự thông minh
              </h2>
              <p className="max-w-[600px] text-muted-foreground md:text-lg">
                Chúng tôi hình dung một thế giới nơi các nhà kho là những hệ sinh thái tự tối ưu hóa. Thông qua sức mạnh của Trí tuệ Nhân tạo và IoT, SmartWarehouse Pro hướng tới mục tiêu trở thành tiêu chuẩn toàn cầu cho kho bãi thông minh, giảm thiểu lãng phí và tối đa hóa hiệu quả cho hành tinh.
              </p>
            </div>
            <div className="mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center sm:w-full lg:order-last">
              {/* Placeholder for Vision Image */}
              <div className="w-full h-full bg-muted flex items-center justify-center text-muted-foreground">
                <span className="text-lg">Vision Image Placeholder</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 lg:py-32">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">Tại sao chọn SmartWarehouse Pro?</h2>
            <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Khai phá toàn bộ tiềm năng của chuỗi cung ứng với các tính năng được thiết kế cho doanh nghiệp hiện đại.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            <div className="flex flex-col space-y-4 p-6 border rounded-xl bg-card shadow-sm">
              <div className="p-3 w-fit rounded-lg bg-brand-subtle text-brand">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clock"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              </div>
              <h3 className="text-xl font-bold">Theo dõi Thời gian thực</h3>
              <p className="text-muted-foreground">
                Giám sát từng mặt hàng trong kho của bạn với các cập nhật trực tiếp. Biết chính xác hàng tồn kho của bạn đang ở đâu vào bất kỳ giây phút nào.
              </p>
            </div>
            <div className="flex flex-col space-y-4 p-6 border rounded-xl bg-card shadow-sm">
              <div className="p-3 w-fit rounded-lg bg-brand-subtle text-brand">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-bar-chart-3"><path d="M3 3v18h18" /><path d="M18 17V9" /><path d="M13 17V5" /><path d="M8 17v-3" /></svg>
              </div>
              <h3 className="text-xl font-bold">Phân tích AI</h3>
              <p className="text-muted-foreground">
                Dự đoán nhu cầu và tối ưu hóa mức tồn kho bằng các thuật toán máy học, học hỏi từ lịch sử dữ liệu của bạn.
              </p>
            </div>
            <div className="flex flex-col space-y-4 p-6 border rounded-xl bg-card shadow-sm">
              <div className="p-3 w-fit rounded-lg bg-brand-subtle text-brand">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-piggy-bank"><path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-.3-11 5 0 1.8 0 3 2 4.5V20h4v-2h3v2h4v-4c1-.5 1.7-1 2-2h2v-4h-2c0-1-.5-1.5-1-2h0V5z" /><path d="M2 9v1" /><path d="M16 11h0" /></svg>
              </div>
              <h3 className="text-xl font-bold">Giảm Chi Phí</h3>
              <p className="text-muted-foreground">
                Giảm chi phí vận hành lên đến 30% với quy trình làm việc tự động và các chiến lược giảm thiểu lỗi.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-20 lg:py-32 bg-muted/30">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col items-start space-y-4 mb-12">
            <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Giá Trị Cốt Lõi</h2>
            <p className="max-w-[700px] text-muted-foreground md:text-lg">
              Những nguyên tắc hướng dẫn mọi quyết định chúng tôi đưa ra và từng dòng mã chúng tôi viết.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col space-y-2 p-6 bg-background rounded-xl shadow-sm">
              <div className="text-brand mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shield-check"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" /></svg>
              </div>
              <h3 className="text-lg font-bold">Chính Trực</h3>
              <p className="text-sm text-muted-foreground">Giá cả minh bạch và giao tiếp trung thực.</p>
            </div>
            <div className="flex flex-col space-y-2 p-6 bg-background rounded-xl shadow-sm">
              <div className="text-brand mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-rocket"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" /><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" /><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" /><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" /></svg>
              </div>
              <h3 className="text-lg font-bold">Đổi Mới</h3>
              <p className="text-sm text-muted-foreground">Không ngừng đẩy ranh giới của công nghệ logistics.</p>
            </div>
            <div className="flex flex-col space-y-2 p-6 bg-background rounded-xl shadow-sm">
              <div className="text-brand mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-lock"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              </div>
              <h3 className="text-lg font-bold">Bảo Mật</h3>
              <p className="text-sm text-muted-foreground">Dữ liệu của bạn được bảo vệ bởi các giao thức cấp doanh nghiệp.</p>
            </div>
            <div className="flex flex-col space-y-2 p-6 bg-background rounded-xl shadow-sm">
              <div className="text-brand mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-smile"><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" x2="9.01" y1="9" y2="9" /><line x1="15" x2="15.01" y1="9" y2="9" /></svg>
              </div>
              <h3 className="text-lg font-bold">Khách Hàng Là Trên Hết</h3>
              <p className="text-sm text-muted-foreground">Thành công của bạn là thước đo chính cho sự phát triển của chúng tôi.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-brand text-white">
        <div className="container px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl">Sẵn sàng tối ưu hóa kho hàng của bạn?</h2>
              <p className="text-brand-subtle md:text-lg opacity-80">
                Gia nhập cùng hơn 500 công ty đang sử dụng SmartWarehouse Pro.
              </p>
            </div>
            <Button size="lg" variant="secondary" className="bg-white text-brand hover:bg-bg-subtle border-0">
              Liên hệ kinh doanh
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

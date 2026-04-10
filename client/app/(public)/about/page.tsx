import React from 'react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import Link from 'next/link';
import { ShieldCheck, Rocket, Lock, Smile, Clock, BarChart3, PiggyBank, CheckCircle2, Image as ImageIcon } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground selection:bg-brand/20">

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-24 pb-20 lg:pt-36 lg:pb-28">
        {/* Subtle Background Effects */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] opacity-20 bg-gradient-to-b from-brand/40 to-transparent blur-3xl pointer-events-none rounded-full" />
        <div className="absolute -top-24 right-0 w-96 h-96 bg-brand/10 blur-3xl rounded-full pointer-events-none" />

        <div className="container mx-auto relative px-4 md:px-6 z-10">
          <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
            <div className="inline-flex items-center rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 text-sm font-medium text-brand shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-brand mr-2 animate-pulse"></span>
              Nền tảng Quản lý Logistics Thế hệ mới
            </div>

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
              Cách mạng hóa quy trình Logistics của bạn với <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-brand/70">SmartWarehouse Pro</span>
            </h1>

            <p className="max-w-[700px] text-lg text-muted-foreground md:text-xl leading-relaxed">
              Nền tảng toàn diện cho quản lý kho hàng hiện đại. Trải nghiệm theo dõi thời gian thực, quy trình tự động và thông tin chi tiết được hỗ trợ bởi AI.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4 w-full sm:w-auto">
              <Button size="lg" className="bg-brand hover:bg-brand/90 text-white shadow-lg shadow-brand/20 h-14 px-8 text-base transition-all hover:scale-105 active:scale-95">
                Dùng thử miễn phí
              </Button>
              <Button size="lg" variant="outline" className="h-14 px-8 text-base border-border hover:bg-muted/50 transition-all hover:scale-105 active:scale-95">
                Xem Demo
              </Button>
            </div>
          </div>

          {/* Hero Image Section */}
          <div className="mt-16 md:mt-24 relative mx-auto max-w-5xl">
            <div className="absolute -inset-1 sm:-inset-4 bg-gradient-to-r from-brand/20 to-brand/10 rounded-[2rem] sm:rounded-[2.5rem] blur-xl opacity-50"></div>
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl sm:rounded-3xl border border-border/50 bg-background/50 shadow-2xl backdrop-blur-sm group">
              {/* Fake UI Header for aesthetic */}
              <div className="absolute top-0 left-0 right-0 h-12 border-b border-border/50 flex items-center px-4 gap-2 bg-muted/30">
                <div className="w-3 h-3 rounded-full bg-red-400/80"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400/80"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400/80"></div>
              </div>
              <div className="w-full h-full pt-12 relative flex items-center justify-center bg-muted/10 group-hover:bg-muted/5 transition-colors duration-500 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1633959592096-9d9a339b99fa?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MTV8fHdhcmVob3VzZXxlbnwwfHwwfHx8MA%3D%3D" alt="Hero" className="absolute inset-0 w-full h-full object-cover opacity-100 transition-transform duration-700 group-hover:scale-105 z-10" />

                <span className="relative z-0 text-muted-foreground font-medium flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Gắn link ảnh Hero vào code
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-12 border-y border-border/50 bg-muted/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 md:px-6">
          <p className="text-center text-sm font-medium tracking-widest text-muted-foreground uppercase mb-10">
            Được tin tưởng bởi các nhà lãnh đạo doanh nghiệp hàng đầu
          </p>
          <div className="flex flex-wrap justify-center items-center gap-10 md:gap-20 opacity-60 hover:opacity-100 transition-opacity duration-500 delay-75">
            <div className="flex items-center gap-3 font-bold text-xl lg:text-2xl text-foreground/80 hover:text-foreground transition-colors"><div className="h-6 w-6 lg:h-8 lg:w-8 bg-brand/80 rounded-lg shrink-0"></div> LogisticsInc</div>
            <div className="flex items-center gap-3 font-bold text-xl lg:text-2xl text-foreground/80 hover:text-foreground transition-colors"><div className="h-6 w-6 lg:h-8 lg:w-8 bg-foreground/80 rounded-lg shrink-0"></div> SwiftCargo</div>
            <div className="flex items-center gap-3 font-bold text-xl lg:text-2xl text-foreground/80 hover:text-foreground transition-colors"><div className="h-6 w-6 lg:h-8 lg:w-8 bg-brand/80 rounded-full shrink-0"></div> GlobalFreight</div>
            <div className="flex items-center gap-3 font-bold text-xl lg:text-2xl text-foreground/80 hover:text-foreground transition-colors"><div className="h-6 w-6 lg:h-8 lg:w-8 bg-foreground/80 rotate-45 shrink-0"></div> WarehouseX</div>
          </div>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-24 lg:py-32 relative">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="relative group mx-auto aspect-[4/3] w-full max-w-xl lg:max-w-none">
              <div className="absolute -inset-2 bg-gradient-to-tr from-brand/20 to-transparent rounded-3xl blur-lg transition-opacity duration-500 group-hover:opacity-100 opacity-50"></div>
              <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="w-full h-full relative flex items-center justify-center text-muted-foreground bg-muted/20 overflow-hidden">
                  <img src="https://images.unsplash.com/photo-1587293852726-70cdb56c2866?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8Mnx8d2FyZWhvdXNlfGVufDB8fDB8fHww" alt="Sứ mệnh" className="absolute inset-0 w-full h-full object-cover opacity-100 transition-transform duration-700 group-hover:scale-105 z-10" />

                  <span className="relative z-0 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" /> Gắn link ảnh Sứ Mệnh
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col justify-center space-y-6">
              <div className="inline-flex items-center space-x-2">
                <span className="h-px w-8 bg-brand"></span>
                <span className="text-sm font-semibold uppercase tracking-wider text-brand">Sứ mệnh của chúng tôi</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Nâng cao sự minh bạch trong chuỗi cung ứng
              </h2>
              <p className="text-muted-foreground md:text-lg leading-relaxed">
                Chúng tôi tồn tại để loại bỏ những điểm mù trong logistics toàn cầu. Bằng cách cung cấp các công cụ mang lại khả năng hiển thị và kiểm soát chi tiết, chúng tôi trao quyền cho các doanh nghiệp thực hiện lời hứa, không chỉ là giao hàng. Sứ mệnh của chúng tôi là đảm bảo mọi sản phẩm đến đích một cách hiệu quả và minh bạch.
              </p>
              <ul className="space-y-3 pt-2">
                {['Hiệu quả tối ưu trong từng quy trình', 'Minh bạch dữ liệu theo thời gian thực', 'Cam kết hoàn thành trọn vẹn lời hứa'].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-muted-foreground">
                    <CheckCircle2 className="h-5 w-5 text-brand" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Vision Section */}
      <section className="py-24 lg:py-32 bg-muted/30 border-y border-border/50 relative">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
            <div className="flex flex-col justify-center space-y-6 lg:order-1 order-2">
              <div className="inline-flex items-center space-x-2">
                <span className="h-px w-8 bg-brand"></span>
                <span className="text-sm font-semibold uppercase tracking-wider text-brand">Tầm nhìn của chúng tôi</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">
                Tương lai của kho vận là sự thông minh
              </h2>
              <p className="text-muted-foreground md:text-lg leading-relaxed">
                Chúng tôi hình dung một thế giới nơi các nhà kho là những hệ sinh thái tự tối ưu hóa. Thông qua sức mạnh của Trí tuệ Nhân tạo và IoT, SmartWarehouse Pro hướng tới mục tiêu trở thành tiêu chuẩn toàn cầu cho kho bãi thông minh, giảm thiểu lãng phí và tối đa hóa hiệu quả cho hành tinh.
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="border border-border p-4 rounded-xl bg-background/60 backdrop-blur-sm hover:border-brand/30 transition-colors">
                  <div className="text-3xl font-bold text-foreground mb-1">Zero</div>
                  <div className="text-sm text-muted-foreground">Lãng phí vận hành</div>
                </div>
                <div className="border border-border p-4 rounded-xl bg-background/60 backdrop-blur-sm hover:border-brand/30 transition-colors">
                  <div className="text-3xl font-bold text-foreground mb-1">100%</div>
                  <div className="text-sm text-muted-foreground">Kiểm soát dữ liệu</div>
                </div>
              </div>
            </div>
            <div className="relative group mx-auto aspect-[4/3] w-full max-w-xl lg:max-w-none lg:order-2 order-1">
              <div className="absolute -inset-2 bg-gradient-to-bl from-brand/20 to-transparent rounded-3xl blur-lg transition-opacity duration-500 group-hover:opacity-100 opacity-50"></div>
              <div className="relative h-full w-full overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                <div className="w-full h-full relative flex items-center justify-center text-muted-foreground bg-muted/20 overflow-hidden">
                  <img src="https://plus.unsplash.com/premium_photo-1681426710520-7c56c9f563d2?w=700&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8OXx8d2FyZWhvdXNlfGVufDB8fDB8fHww" alt="Tầm nhìn" className="absolute inset-0 w-full h-full object-cover opacity-100 transition-transform duration-700 group-hover:scale-105 z-10" />

                  <span className="relative z-0 flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" /> Gắn link ảnh Tầm Nhìn
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-24 lg:py-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(var(--brand),0.05),transparent_50%)]"></div>
        <div className="container mx-auto relative px-4 md:px-6 z-10">
          <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Tại sao chọn SmartWarehouse Pro?</h2>
            <p className="max-w-[700px] text-muted-foreground md:text-xl">
              Khai phá toàn bộ tiềm năng của chuỗi cung ứng với các tính năng được thiết kế cho doanh nghiệp hiện đại.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                icon: <Clock className="h-6 w-6" />,
                title: 'Theo dõi Thời gian thực',
                desc: 'Giám sát từng mặt hàng trong kho của bạn với các cập nhật trực tiếp. Biết chính xác hàng tồn kho của bạn đang ở đâu vào bất kỳ giây phút nào.',
              },
              {
                icon: <BarChart3 className="h-6 w-6" />,
                title: 'Phân tích AI',
                desc: 'Dự đoán nhu cầu và tối ưu hóa mức tồn kho bằng các thuật toán máy học, học hỏi từ lịch sử dữ liệu của bạn.',
              },
              {
                icon: <PiggyBank className="h-6 w-6" />,
                title: 'Giảm Chi Phí',
                desc: 'Giảm chi phí vận hành lên đến 30% với quy trình làm việc tự động và các chiến lược giảm thiểu lỗi.',
              }
            ].map((feature, i) => (
              <div key={i} className="group relative flex flex-col space-y-5 p-8 border border-border/60 rounded-2xl bg-card hover:border-brand/40 hover:shadow-xl hover:shadow-brand/5 transition-all duration-300">
                <div className="relative z-10">
                  <div className="p-3 w-fit rounded-xl bg-brand/10 text-brand mb-4 group-hover:bg-brand group-hover:text-white transition-colors duration-300">
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values Section */}
      <section className="py-24 lg:py-32 bg-muted/30 border-y border-border/50">
        <div className="container mx-auto px-4 md:px-6">
          <div className="text-center md:text-left md:flex justify-between items-end mb-16">
            <div className="max-w-2xl space-y-4">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">Giá Trị Cốt Lõi</h2>
              <p className="text-muted-foreground md:text-lg">
                Những nguyên tắc hướng dẫn mọi quyết định chúng tôi đưa ra và từng dòng mã chúng tôi viết.
              </p>
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: <ShieldCheck className="w-7 h-7" />, title: 'Chính Trực', desc: 'Giá cả minh bạch và giao tiếp trung thực.' },
              { icon: <Rocket className="w-7 h-7" />, title: 'Đổi Mới', desc: 'Không ngừng đẩy ranh giới của công nghệ logistics.' },
              { icon: <Lock className="w-7 h-7" />, title: 'Bảo Mật', desc: 'Dữ liệu của bạn được bảo vệ bởi các giao thức cấp doanh nghiệp.' },
              { icon: <Smile className="w-7 h-7" />, title: 'Khách Hàng Là Trên Hết', desc: 'Thành công của bạn là thước đo chính cho sự phát triển của chúng tôi.' },
            ].map((value, i) => (
              <div key={i} className="group relative overflow-hidden rounded-2xl border border-border bg-background p-8 hover:border-brand/30 transition-colors shadow-sm">
                <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-brand/80 to-brand scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></div>
                <div className="text-brand mb-5 bg-brand/10 w-fit p-3 rounded-lg">
                  {value.icon}
                </div>
                <h3 className="text-xl font-bold mb-2">{value.title}</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  {value.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-brand"></div>
        {/* Abstract pattern */}
        <div className="absolute inset-0 opacity-10 mix-blend-overlay" style={{ backgroundImage: "url('data:image/svg+xml,%3Csvg width=\\'60\\' height=\\'60\\' viewBox=\\'0 0 60 60\\' xmlns=\\'http://www.w3.org/2000/svg\\'%3E%3Cg fill=\\'none\\' fill-rule=\\'evenodd\\'%3E%3Cg fill=\\'%23ffffff\\' fill-opacity=\\'1\\'%3E%3Cpath d=\\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')" }}></div>
        <div className="absolute -top-24 right-0 md:w-96 md:h-96 w-64 h-64 bg-white/10 blur-[100px] rounded-full"></div>

        <div className="container mx-auto relative px-4 md:px-6 z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 bg-black/10 p-8 md:p-12 rounded-3xl backdrop-blur-sm border border-white/10">
            <div className="space-y-4 max-w-2xl text-white">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Sẵn sàng tối ưu hóa kho hàng của bạn?</h2>
              <p className="md:text-lg opacity-90 leading-relaxed">
                Gia nhập cùng hơn 500 công ty đang sử dụng SmartWarehouse Pro.
              </p>
            </div>
            <Button size="lg" className="bg-white text-brand hover:bg-white/90 h-14 px-8 text-base font-semibold shadow-xl shrink-0 transition-transform hover:scale-105 active:scale-95">
              Liên hệ kinh doanh
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

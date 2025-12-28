import React from 'react';
import { Globe, Calendar, Settings, Plus } from 'lucide-react';

export function StepsSection() {
    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                    {/* Left Content */}
                    <div className="order-2 lg:order-1">
                        <h2 className="text-4xl md:text-5xl font-extrabold text-[#1E293B] mb-6 leading-tight">
                            Mở Rộng Vận Hành Cùng <span className="text-[#0F766E]">GenHub</span>
                        </h2>
                        <p className="text-[#64748B] mb-12 text-sm max-w-lg leading-relaxed">
                            Chúng tôi đơn giản hóa sự phức tạp của logistics. Kết nối cửa hàng của bạn, chọn kho bãi và để hệ thống tự động của chúng tôi xử lý phần còn lại.
                        </p>

                        <div className="space-y-8">
                            <StepItem
                                icon={Globe}
                                title="Kết nối Cửa hàng"
                                desc="Tích hợp một cú nhấp chuột với Shopify, WooCommerce, Haravan, và API tùy chỉnh."
                            />
                            <StepItem
                                icon={Calendar}
                                title="Gửi Hàng Hóa"
                                desc="Vận chuyển sản phẩm của bạn đến mạng lưới trung tâm hoàn tất đơn hàng được tối ưu hóa của chúng tôi."
                            />
                            <StepItem
                                icon={Settings}
                                title="Tự động hóa Xử lý"
                                desc="Chúng tôi lấy hàng, đóng gói và vận chuyển đơn hàng của bạn tự động với độ chính xác 99,9%."
                            />
                        </div>
                    </div>

                    {/* Right Image Collage */}
                    <div className="order-1 lg:order-2 relative h-[500px]">
                        {/* Creating the collage layout */}
                        <div className="absolute top-0 right-0 w-[55%] h-[55%] bg-[#F1F5F9] rounded-3xl overflow-hidden shadow-xl border-4 border-white z-10">
                            <img src="https://images.unsplash.com/photo-1556740758-90de374c12ad?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover" alt="Dashboard" />
                        </div>

                        <div className="absolute bottom-0 left-0 w-[45%] h-[45%] bg-[#F1F5F9] rounded-3xl overflow-hidden shadow-xl border-4 border-white z-20">
                            <img src="https://images.unsplash.com/photo-1580674684081-7617fbf3d745?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover" alt="Workers" />
                        </div>

                        <div className="absolute bottom-10 right-10 w-[45%] h-[40%] bg-[#F1F5F9] rounded-3xl overflow-hidden shadow-xl border-4 border-white z-0 opacity-80">
                            <img src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=600&auto=format&fit=crop" className="w-full h-full object-cover" alt="Rack" />
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}

function StepItem({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="flex gap-4 group">
            <div className="w-12 h-12 shrink-0 rounded-full border border-[#E2E8F0] flex items-center justify-center text-[#1E293B] group-hover:border-[#0F766E] group-hover:text-[#0F766E] transition-colors bg-white shadow-sm">
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <h3 className="font-bold text-[#1E293B] text-lg mb-1">{title}</h3>
                <p className="text-[#64748B] text-xs leading-relaxed max-w-sm">{desc}</p>
            </div>
        </div>
    )
}

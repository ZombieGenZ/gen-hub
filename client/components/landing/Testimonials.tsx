import React from 'react';
import { Quote, ChevronLeft, ChevronRight, Star } from 'lucide-react';

export function Testimonials() {
    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-6">
                <div className="text-center mb-16">
                    <h2 className="text-3xl md:text-4xl font-extrabold text-[#1E293B]">Được Tin Cậy Bởi Các Nhà Lãnh Đạo Ngành</h2>
                </div>

                <div className="bg-white rounded-[3rem] p-4 md:p-6 shadow-sm border border-[#E2E8F0] flex flex-col md:flex-row gap-8 items-center max-w-5xl mx-auto">
                    {/* Left Image */}
                    <div className="w-full md:w-1/2 h-[300px] md:h-[400px] rounded-[2.5rem] overflow-hidden relative">
                        <img
                            src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1000&auto=format&fit=crop"
                            alt="Director"
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 bg-[#0F766E] w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg">
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </div>
                    </div>

                    {/* Right Content */}
                    <div className="w-full md:w-1/2 p-4 md:p-8 relative">
                        <div className="mb-6 text-[#F59E0B] flex gap-1">
                            <Star className="w-4 h-4 fill-current" />
                            <Star className="w-4 h-4 fill-current" />
                            <Star className="w-4 h-4 fill-current" />
                            <Star className="w-4 h-4 fill-current" />
                            <Star className="w-4 h-4 fill-current" />
                        </div>

                        <h3 className="text-[#0F766E] font-bold mb-1 uppercase tracking-wide text-xs">Nguyễn Thu Hà</h3>
                        <p className="text-[#64748B] text-xs mb-6">Giám đốc Hậu cần, RetailCorp Vietnam</p>

                        <p className="text-[#334155] text-sm md:text-base leading-relaxed italic mb-8">
                            "GenHub đã thay đổi hoàn toàn chuỗi cung ứng của chúng tôi. Nền tảng SaaS mang lại khả năng hiển thị mà chúng tôi chưa từng có, và mạng lưới kho phân tán giúp cắt giảm 40% thời gian giao hàng. Một bước ngoặt thực sự."
                        </p>

                        <div className="absolute top-8 right-8 text-[#F1F5F9]">
                            <Quote className="w-16 h-16 fill-current rotate-180 transform scale-x-[-1]" />
                        </div>

                        <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 bg-[#0F766E] w-12 h-12 rounded-full flex items-center justify-center border-4 border-white shadow-lg cursor-pointer hover:bg-[#0D5A52] transition-colors">
                            <ChevronRight className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </div>

                {/* Dots */}
                <div className="flex justify-center gap-2 mt-12">
                    <div className="w-8 h-2 bg-[#0F766E] rounded-full"></div>
                    <div className="w-2 h-2 bg-[#CBD5E1] rounded-full"></div>
                    <div className="w-2 h-2 bg-[#CBD5E1] rounded-full"></div>
                    <div className="w-2 h-2 bg-[#CBD5E1] rounded-full"></div>
                    <div className="w-2 h-2 bg-[#CBD5E1] rounded-full"></div>
                </div>
            </div>
        </section>
    );
}

import React from 'react';
import { Button } from "@/components/ui/button";
import { Move, Warehouse, ArrowRight } from 'lucide-react';

export function Listings() {
    return (
        <section className="py-24 bg-[#F8FAFC]">
            <div className="container mx-auto px-6">
                <div className="flex flex-col items-center text-center mb-16">
                    <h2 className="text-4xl font-extrabold text-[#1E293B] mb-4">Mạng Lưới Kho Chiến Lược</h2>
                    <p className="text-[#64748B] max-w-lg">Mở rộng quy mô ngay lập tức với các đối tác kho đạt chuẩn của chúng tôi.</p>

                    <div className="flex gap-2 p-1 bg-white rounded-full border border-[#E2E8F0] mt-8">
                        <button className="px-6 py-2 rounded-full bg-[#0F766E] text-white text-sm font-bold shadow-md">Kho lạnh</button>
                        <button className="px-6 py-2 rounded-full text-[#64748B] hover:bg-[#F1F5F9] text-sm font-medium">Hoàn tất đơn B2B</button>
                        <button className="px-6 py-2 rounded-full text-[#64748B] hover:bg-[#F1F5F9] text-sm font-medium">Cross-docking</button>
                    </div>
                </div>

                {/* Big Listing Focus */}
                <div className="bg-white rounded-4xl p-8 border border-[#E2E8F0] shadow-xl">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <div className="space-y-4">
                            <img
                                src="https://images.unsplash.com/photo-1590247813693-5541d1c609fd?q=80&w=2670&auto=format&fit=crop"
                                alt="Warehouse Main"
                                className="w-full h-100 object-cover rounded-2xl"
                            />
                        </div>
                        <div className="grid grid-rows-2 gap-4">
                            <div className="grid grid-cols-2 gap-4">
                                <img src="https://images.unsplash.com/photo-1628624747186-a94194361516?q=80&w=2670&auto=format&fit=crop" className="w-full h-full object-cover rounded-2xl" alt="Interior" />
                                <img src="https://images.unsplash.com/photo-1530124566582-a618bc2615dc?q=80&w=2574&auto=format&fit=crop" className="w-full h-full object-cover rounded-2xl" alt="View" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <img src="https://images.unsplash.com/photo-1647427060118-4911c9821b82?q=80&w=2400&auto=format&fit=crop" className="w-full h-full object-cover rounded-2xl" alt="Pool" />
                                <div className="relative">
                                    <img src="https://images.unsplash.com/photo-1578575437130-527eed3abbec?q=80&w=2670&auto=format&fit=crop" className="w-full h-full object-cover rounded-2xl brightness-50" alt="More" />
                                    <button className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg hover:scale-105 transition-transform">Xem Thông Số</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex flex-col md:flex-row justify-between items-end">
                        <div>
                            <h3 className="text-3xl font-extrabold text-[#1E293B] mb-2">Trung tâm Miền Bắc (HAN-01)</h3>
                            <p className="text-4xl font-extrabold text-[#0F766E] mb-6">Sẵn sàng hoạt động</p>

                            <div className="flex flex-wrap gap-4 text-sm text-[#334155] mb-6">
                                <div className="flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] rounded-lg">
                                    <Move className="w-4 h-4" /> 50,000 m²
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] rounded-lg">
                                    <Warehouse className="w-4 h-4" /> 52 Cửa Loading
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-[#F1F5F9] rounded-lg">
                                    <ArrowRight className="w-4 h-4" /> Gần Cao tốc Hà Nội - HP
                                </div>
                            </div>

                            <p className="text-[#64748B] max-w-2xl leading-relaxed">
                                Cơ sở hiện đại được trang bị hệ thống AS/RS tự động, các vùng nhiệt độ cho chuỗi cung ứng lạnh và tích hợp với các đơn vị vận chuyển lớn để giao hàng nhanh 24h.
                            </p>
                        </div>

                        <Button variant="outline" className="mt-6 md:mt-0 rounded-full border-[#0F766E] text-[#0F766E] hover:bg-[#F8FAFC] h-12 px-8 font-bold">
                            Xem chi tiết kho
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}

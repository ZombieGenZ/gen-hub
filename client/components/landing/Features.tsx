import React from 'react';
import { Network, BarChart2, ShieldCheck } from 'lucide-react';
import { Button } from "@/components/ui/button";

export function Features() {
    return (
        <section className="py-24 bg-white">
            <div className="container mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

                    {/* Left Image Group */}
                    <div className="relative">
                        <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#E2E8F0] h-full min-h-125">
                            <img
                                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2670&auto=format&fit=crop"
                                alt="Data Analytics"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    {/* Right Content */}
                    <div className="space-y-8">
                        <div className="space-y-4">
                            <h2 className="text-4xl md:text-5xl font-extrabold text-[#1E293B] leading-tight">
                                Hậu Cần Doanh Nghiệp <br /> <span className="text-[#0F766E]">Đơn Giản Hóa</span>
                            </h2>
                            <p className="text-[#64748B] text-lg leading-relaxed">
                                GenHub hợp nhất toàn bộ kho, đơn hàng và quy trình hoàn tất của bạn vào một hệ điều hành mạnh mẽ. Đội ngũ chuyên gia của chúng tôi hỗ trợ ở mọi bước.
                            </p>
                        </div>

                        {/* Feature Cards - Horizontal Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
                            <FeatureCard
                                icon={Network}
                                title="Mạng lưới Phân phối"
                                desc="Đặt hàng gần khách hàng hơn để giảm chi phí."
                            />
                            <FeatureCard
                                icon={BarChart2}
                                title="Phân tích Thời gian thực"
                                desc="Thông tin luân chuyển hàng tồn kho và chi phí."
                            />
                            <FeatureCard
                                icon={ShieldCheck}
                                title="An toàn & Tuân thủ"
                                desc="Bảo mật SOC2 và hỗ trợ chuyên dụng 24/7."
                            />
                        </div>

                        <div className="pt-4">
                            <Button className="bg-[#0F766E] hover:bg-[#0D5A52] text-white rounded-full px-8 py-6 font-bold shadow-lg shadow-[#0F766E]/20">
                                Khám phá Nền tảng
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function FeatureCard({ icon: Icon, title, desc }: { icon: any, title: string, desc: string }) {
    return (
        <div className="flex flex-col gap-4 p-5 rounded-2xl bg-[#F8FAFC] border border-transparent hover:border-[#E2E8F0] hover:shadow-lg transition-all duration-300">
            <div className="shrink-0 w-12 h-12 bg-white rounded-xl flex items-center justify-center text-[#0F766E] shadow-sm ring-1 ring-[#E2E8F0]">
                <Icon className="w-6 h-6" />
            </div>
            <div className="space-y-2">
                <h3 className="text-base font-bold text-[#1E293B] leading-tight">{title}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">{desc}</p>
            </div>
        </div>
    )
}

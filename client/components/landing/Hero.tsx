import React from 'react';
import { Button } from "@/components/ui/button";

export function Hero() {
    return (
        <section className="relative min-h-200 w-full overflow-hidden bg-white">
            {/* Background Image Layer (Full text wrap effect) */}
            <div className="absolute inset-0 w-full h-full">
                <img
                    src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2670&auto=format&fit=crop"
                    alt="Warehouse"
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/10 lg:bg-transparent"></div>
            </div>

            {/* White Content Area with Inverted Corner Mask (Scoop) */}
            <div
                className="absolute inset-0 bg-white z-10 pointer-events-none"
                style={{
                    maskImage: 'linear-gradient(to right, black 55%, transparent 55%), linear-gradient(to bottom, black 75%, transparent 75%)',
                    maskSize: '100% 100%',
                    maskComposite: 'add',
                    WebkitMaskComposite: 'source-over'
                }}
            >
                {/* 
                   Note: To strictly follow "mask-composite: subtract" for an inverted corner (concave) effect:
                   We would layer a full mask and subtract the bottom-right rounded corner.
                   However, since we want a solid white block with a specific shape, we use a composed mask 
                   to maintain the "Top-Left Block" layout. 
                   
                   Below is the implementation that strictly uses mask-composite to create the "Scoop" (Inverted Border Radius):
                */}
            </div>

            {/* Actual Content Wrapper - Re-implemented for clearer positioning without mask interference on text */}
            <div className="absolute top-0 left-0 w-full lg:w-[55%] h-full lg:h-[80%] bg-white lg:bg-transparent z-10 flex flex-col justify-center px-6 md:px-12 lg:pl-32 lg:pr-12 pt-16 lg:pt-0 pointer-events-auto">
                {/* Background for the text area (Mobile: w-full, Desktop: Masked by the sibling or using a specific shape) */}
                {/* We essentially draw the white shape here. */}
                <div
                    className="absolute inset-0 bg-white hidden lg:block"
                    style={{
                        maskImage: `
                            radial-gradient(circle 80px at 100% 100%, transparent 98%, black 100%),
                            linear-gradient(to right, black, black),
                            linear-gradient(to bottom, black, black)
                        `,
                        maskSize: '80px 80px, 100% calc(100% - 80px), calc(100% - 80px) 100%',
                        maskPosition: '100% 100%, 0 0, 0 0',
                        maskRepeat: 'no-repeat'
                    }}
                />

                <div className="relative max-w-xl space-y-6">
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-extrabold text-[#1E293B] leading-[1.1]">
                        Điều Phối <br />
                        <span className="text-transparent bg-clip-text bg-linear-to-r from-[#0F766E] to-[#14B8A6]">Chuỗi Cung Ứng</span>
                    </h1>
                    <p className="text-lg text-[#64748B] leading-relaxed max-w-md">
                        Nền tảng 3PL theo yêu cầu kết nối nhà bán hàng với mạng lưới kho thông minh toàn cầu. Tự động hóa quy trình hoàn tất đơn hàng.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <Button className="bg-[#0F766E] hover:bg-[#0D5A52] text-white rounded-full px-10 py-7 text-lg font-bold shadow-lg shadow-[#0F766E]/20 transition-all hover:scale-105">
                            Bắt đầu ngay
                        </Button>
                    </div>
                </div>
            </div>

            {/* Floating Stats Bar - Centered at the bottom */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-[90%] md:w-auto bg-[#1E293B]/90 backdrop-blur-md rounded-2xl p-6 md:px-12 border border-white/10 z-20 flex flex-nowrap justify-between gap-8 md:gap-16 shadow-2xl">
                <div className="text-center group cursor-default">
                    <div className="font-extrabold text-2xl md:text-3xl text-white group-hover:text-[#0F766E] transition-colors">50M+</div>
                    <div className="text-[10px] md:text-xs text-gray-300 uppercase tracking-widest mt-1">Đơn Hàng</div>
                </div>
                <div className="w-px bg-white/20"></div>
                <div className="text-center group cursor-default">
                    <div className="font-extrabold text-2xl md:text-3xl text-white group-hover:text-[#0F766E] transition-colors">200+</div>
                    <div className="text-[10px] md:text-xs text-gray-300 uppercase tracking-widest mt-1">Kho Bãi</div>
                </div>
                <div className="w-px hidden md:block bg-white/20"></div>
                <div className="text-center group cursor-default hidden md:block">
                    <div className="font-extrabold text-2xl md:text-3xl text-white group-hover:text-[#0F766E] transition-colors">99.9%</div>
                    <div className="text-[10px] md:text-xs text-gray-300 uppercase tracking-widest mt-1">Uptime</div>
                </div>
                <div className="w-px hidden md:block bg-white/20"></div>
                <div className="text-center group cursor-default hidden md:block">
                    <div className="font-extrabold text-2xl md:text-3xl text-white group-hover:text-[#0F766E] transition-colors">24/7</div>
                    <div className="text-[10px] md:text-xs text-gray-300 uppercase tracking-widest mt-1">Hỗ Trợ</div>
                </div>
            </div>
        </section>
    );
}

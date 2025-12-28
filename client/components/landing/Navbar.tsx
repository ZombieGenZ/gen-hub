import React from 'react';
import { Button } from "@/components/ui/button";
import { Box } from 'lucide-react';

export function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0]">
            <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <div className="text-[#0F766E]">
                        <Box className="w-8 h-8 fill-current" />
                    </div>
                    <span className="text-2xl font-bold text-[#1E293B]">GenHub</span>
                </div>

                {/* Links */}
                <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#64748B]">
                    <a href="#" className="hover:text-[#0F766E] transition-colors">Giải pháp</a>
                    <a href="#" className="hover:text-[#0F766E] transition-colors">Mạng lưới</a>
                    <a href="#" className="hover:text-[#0F766E] transition-colors">Tích hợp</a>
                    <a href="#" className="hover:text-[#0F766E] transition-colors">Bảng giá</a>
                    <a href="#" className="hover:text-[#0F766E] transition-colors">Doanh nghiệp</a>
                </div>

                {/* CTA */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" className="text-[#334155] hover:text-[#0F766E]">Đăng nhập</Button>
                    <Button variant="outline" className="rounded-full bg-[#0F766E] border-[#0F766E] text-white hover:bg-[#0D5A52] hover:text-white px-6 font-semibold">
                        Đăng ký Demo
                    </Button>
                </div>
            </div>
        </nav>
    );
}

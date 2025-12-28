"use client";

import React from 'react';
import { Button } from "@/components/ui/button";
import { ChevronDown, Box, Star, ShieldCheck, Users, Truck, Warehouse, BarChart3, Clock, Lock, Globe } from "lucide-react";

export default function AcmeDemoPage() {
    return (
        <div className="min-h-screen bg-white font-sans text-gray-900 selection:bg-teal-100">
            <Navbar />
            <main>
                <Hero />
                <div className="h-20" />
                <Services />
                <div className="h-40 bg-gray-50 mt-20" />
            </main>
        </div>
    );
}

// --- Navbar Component ---

function Navbar() {
    return (
        <nav className="sticky top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100/50">
            <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                {/* Logo */}
                <div className="flex items-center gap-2 cursor-pointer">
                    <div className="w-8 h-8 bg-teal-800 rounded-lg flex items-center justify-center">
                        <Box className="text-white w-5 h-5" />
                    </div>
                    <span className="text-2xl font-bold text-teal-900 tracking-tight">GenHub</span>
                </div>

                {/* Navigation Links - Desktop */}
                <div className="hidden lg:flex items-center gap-8">
                    <NavItem text="Chủ sở hữu" />
                    <NavItem text="Cư dân" />
                    <NavItem text="Nhà đầu tư" />
                    <NavItem text="Tài nguyên" />
                    <NavItem text="Vị trí" />
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" className="hidden sm:inline-flex text-gray-600 hover:text-teal-800 font-medium text-base">
                        Đăng nhập
                    </Button>
                    <Button className="bg-teal-800 hover:bg-teal-700 text-white rounded-full px-6 py-5 font-semibold text-base shadow-lg shadow-teal-900/20">
                        Phân tích miễn phí
                    </Button>
                </div>
            </div>
        </nav>
    );
}

function NavItem({ text }: { text: string }) {
    return (
        <div className="flex items-center gap-1 cursor-pointer group">
            <span className="text-sm font-medium text-gray-600 group-hover:text-teal-800 transition-colors">{text}</span>
            <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-teal-800 transition-colors" />
        </div>
    )
}

// --- Hero Component ---

function Hero() {
    return (
        <section className="relative px-4 py-6 md:px-6 lg:px-8 max-w-[1440px] mx-auto">
            {/* Main Container - Rounded */}
            <div className="relative w-full h-[600px] md:h-[700px] rounded-[2.5rem] overflow-hidden group">

                {/* Background Image with Overlay */}
                <div className="absolute inset-0">
                    {/* Using a placeholder warehouse image that matches the vibe */}
                    <img
                        src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2670&auto=format&fit=crop"
                        alt="Warehouse"
                        className="w-full h-full object-cover brightness-50"
                    />
                    {/* Dark Gradient Overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/40 to-transparent" />
                </div>

                {/* Content Centered - explicitly ensuring text-white works with higher specificity if needed */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10 pt-10">

                    {/* Top Pills */}
                    <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
                        <Pill text="Kho lạnh" />
                        <Pill text="Dịch vụ 3PL" />
                        <Pill text="Hoàn tất đơn hàng" />
                    </div>

                    {/* Main Headline */}
                    <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold text-white tracking-tight leading-tight mb-6 drop-shadow-2xl">
                        <span className="block opacity-90">Thuê ngoài rắc rối.</span>
                        <span className="block">Nâng tầm hiệu quả.</span>
                    </h1>

                    {/* Subtext */}
                    <p className="max-w-3xl text-lg md:text-xl text-white/90 mb-10 leading-relaxed drop-shadow-lg font-medium">
                        Quản lý kho bãi trọn gói cho doanh nghiệp muốn tối ưu hóa logistics mà không phức tạp.
                        Kiểm soát, chứng từ xử lý hoàn tất đơn hàng và phân phối đến 50+ thị trường.
                    </p>

                    {/* CTA Button */}
                    <Button className="bg-teal-700 hover:bg-teal-600 text-white rounded-full h-14 px-8 text-lg font-bold shadow-xl transition-all hover:scale-105 border border-teal-500/20">
                        Nhận phân tích kho bãi miễn phí
                    </Button>
                </div>

                {/* Bottom Right Stats Card - absolute positioned with custom shape styling */}
                <div className="absolute bottom-0 right-0 z-20 hidden md:block">
                    {/* 
               To create the 'inverted border radius' effect seen in the screenshot, 
               we can mask or use SVG, but a simple way is a white container 
               with a pseudo-element for the curve.
            */}
                    <div className="relative bg-white py-6 px-10 rounded-tl-[2rem] flex items-center gap-12 min-w-[600px] shadow-[-10px_-10px_30px_rgba(0,0,0,0.1)]">
                        {/* Decorative Curve Fix (Visual Hack) - Optional
                    Since Tailwind doesn't have easy inverted radius, we keep it simple with rounded-tl.
                */}

                        <StatItem
                            value="100,000+"
                            label="Khách hàng kết nối"
                        />
                        <div className="w-px h-12 bg-gray-200" />
                        <StatItem
                            value="Hơn 15.7K"
                            label="Đánh giá 5 sao"
                            highlight
                        />
                        <div className="w-px h-12 bg-gray-200" />
                        <StatItem
                            value="Hơn 10K"
                            label="Chủ sở hữu tin dùng"
                        />
                    </div>
                </div>
            </div>
        </section>
    );
}

function Pill({ text }: { text: string }) {
    return (
        <span className="px-5 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-white text-sm font-medium hover:bg-white/30 transition-colors cursor-default">
            {text}
        </span>
    )
}

function StatItem({ value, label, highlight = false }: { value: string, label: string, highlight?: boolean }) {
    return (
        <div className="flex flex-col items-start gap-1">
            <span className={`text-2xl font-extrabold ${highlight ? 'text-red-500' : 'text-teal-900'}`}>
                {value}
            </span>
            <span className="text-sm font-bold text-gray-500">
                {label}
            </span>
        </div>
    )
}

// --- Services Component ---

const services = [
    {
        icon: Warehouse,
        title: "Smart Storage",
        description: "Climate-controlled, secure, and scalable storage solutions tailored to your inventory needs."
    },
    {
        icon: Truck,
        title: "Rapid Fulfillment",
        description: "Same-day pick and pack with automated routing to ensure fastest delivery times."
    },
    {
        icon: BarChart3,
        title: "Real-time Analytics",
        description: "Track inventory, sales, and returns in real-time through our proprietary dashboard."
    },
    {
        icon: Globe,
        title: "Global Distribution",
        description: "Access our network of international centers to reach customers worldwide efficiently."
    },
    {
        icon: Clock,
        title: "24/7 Operations",
        description: "Round-the-clock operations ensure your business never stops moving."
    },
    {
        icon: Lock,
        title: "Secure Vaulting",
        description: "High-security zones for high-value merchandise with 24/7 surveillance."
    }
];

function Services() {
    return (
        <section className="py-24 bg-black">
            <div className="container mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <div className="max-w-xl">
                        <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                            Comprehensive <br /> Logistics Solutions
                        </h2>
                        <p className="text-zinc-400 text-lg">
                            We combine physical infrastructure with digital intelligence to streamline your supply chain.
                        </p>
                    </div>
                    <a href="#" className="text-blue-400 hover:text-blue-300 flex items-center gap-2 font-medium">
                        View all services <span aria-hidden="true">&rarr;</span>
                    </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {services.map((service, index) => (
                        <div key={index} className="group p-8 rounded-2xl bg-zinc-900/50 border border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-900 transition-all duration-300">
                            <div className="w-12 h-12 rounded-lg bg-zinc-800 flex items-center justify-center mb-6 group-hover:bg-blue-500/10 group-hover:text-blue-400 transition-colors">
                                <service.icon className="w-6 h-6 text-white group-hover:text-blue-400" />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-3">{service.title}</h3>
                            <p className="text-zinc-400 leading-relaxed">
                                {service.description}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

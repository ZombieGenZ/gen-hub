"use client";

import React, { useState } from 'react';
import { PrimeNestHeader } from '@/app/(public)/homepage/Header';
import { PrimeNestFooter } from '@/app/(public)/homepage/Footer';
import { Check, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

interface PricingTier {
    name: string;
    description: string;
    price: string;
    period: string;
    features: string[];
    isPopular?: boolean;
    buttonText: string;
    buttonVariant: "default" | "outline" | "secondary" | "ghost" | "link";
}

const tiers: PricingTier[] = [
    {
        name: "Cơ Bản",
        description: "Dành cho cá nhân và doanh nghiệp nhỏ mới bắt đầu.",
        price: "1.990.000",
        period: "/tháng",
        features: [
            "Quản lý tối đa 500m² kho",
            "5 tài khoản nhân viên",
            "Báo cáo cơ bản",
            "Hỗ trợ qua Email",
            "Backup dữ liệu hàng tuần"
        ],
        buttonText: "Bắt đầu ngay",
        buttonVariant: "outline"
    },
    {
        name: "Tiêu Chuẩn",
        description: "Giải pháp tối ưu cho doanh nghiệp đang phát triển.",
        price: "4.990.000",
        period: "/tháng",
        isPopular: true,
        features: [
            "Quản lý tối đa 2.000m² kho",
            "20 tài khoản nhân viên",
            "Báo cáo nâng cao & Real-time",
            "Hỗ trợ 24/7 qua Hotline & Email",
            "Backup dữ liệu hàng ngày",
            "Tích hợp API vận chuyển"
        ],
        buttonText: "Đăng ký ngay",
        buttonVariant: "default"
    },
    {
        name: "Cao Cấp",
        description: "Dành cho tập đoàn và chuỗi kho vận quy mô lớn.",
        price: "Liên hệ",
        period: "",
        features: [
            "Không giới hạn diện tích kho",
            "Không giới hạn tài khoản",
            "Báo cáo chuyên sâu & tùy chỉnh",
            "Quản lý đa kho (Multi-warehouse)",
            "Đội ngũ hỗ trợ kỹ thuật riêng",
            "Triển khai On-premise tùy chọn"
        ],
        buttonText: "Liên hệ tư vấn",
        buttonVariant: "outline"
    }
];

const faqs = [
    {
        question: "Tôi có thể thay đổi gói dịch vụ sau khi đăng ký không?",
        answer: "Có, bạn hoàn toàn có thể nâng cấp hoặc hạ cấp gói dịch vụ bất cứ lúc nào. Chi phí sẽ được tính toán lại dựa trên thời gian sử dụng thực tế."
    },
    {
        question: "Có chi phí ẩn nào không?",
        answer: "Không, bảng giá trên là trọn gói cho phần mềm. Nếu bạn sử dụng các dịch vụ cộng thêm như thuê kho vật lý, phí sẽ được tính riêng theo hợp đồng thuê kho."
    },
    {
        question: "Tôi có được dùng thử miễn phí không?",
        answer: "Chúng tôi cung cấp gói dùng thử 14 ngày full tính năng cho gói Tiêu Chuẩn để bạn trải nghiệm trước khi quyết định."
    },
    {
        question: "Hệ thống bảo mật như thế nào?",
        answer: "Dữ liệu của bạn được mã hóa SSL/TLS và lưu trữ trên hệ thống cloud chuẩn quốc tế với cơ chế backup định kỳ, đảm bảo an toàn tuyệt đối."
    }
];

export default function PricingPage() {
    // Mock user/login status for now, or fetch strictly if needed.
    // For a public page, simplicity is key.
    const isLogin = false; // Could be derived from context/storage similar to other pages

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-900">
            <PrimeNestHeader isLogin={isLogin} />

            <main className="flex-1 w-full flex flex-col items-center">
                {/* Hero Section */}
                <section className="w-full py-20 px-4 md:px-6 lg:px-8 bg-gradient-to-b from-white to-slate-50 dark:from-slate-950 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <div className="max-w-7xl mx-auto text-center space-y-4">
                        <Badge variant="secondary" className="mb-4 px-4 py-1.5 text-sm font-medium bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800">
                            Bảng giá linh hoạt
                        </Badge>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 dark:text-white">
                            Chọn giải pháp phù hợp với <span className="text-teal-600 dark:text-teal-400">quy mô của bạn</span>
                        </h1>
                        <p className="max-w-2xl mx-auto text-lg text-slate-600 dark:text-slate-400">
                            Minh bạch, không chi phí ẩn. Bắt đầu miễn phí và mở rộng khi doanh nghiệp của bạn phát triển.
                        </p>
                    </div>
                </section>

                {/* Pricing Cards */}
                <section className="w-full py-20 px-4 md:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {tiers.map((tier, index) => (
                                <div
                                    key={index}
                                    className={`relative flex flex-col p-8 bg-white dark:bg-slate-800 rounded-2xl border ${tier.isPopular
                                            ? 'border-teal-500 shadow-xl scale-105 z-10'
                                            : 'border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow'
                                        }`}
                                >
                                    {tier.isPopular && (
                                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                                            <Badge className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-1">Phổ biến nhất</Badge>
                                        </div>
                                    )}

                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white">{tier.name}</h3>
                                        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 min-h-[40px]">{tier.description}</p>
                                    </div>

                                    <div className="mb-6">
                                        <span className="text-4xl font-bold text-slate-900 dark:text-white">{tier.price}</span>
                                        {tier.period && (
                                            <span className="text-slate-500 dark:text-slate-400">₫{tier.period}</span>
                                        )}
                                    </div>

                                    <Button
                                        className={`w-full mb-8 ${tier.isPopular ? 'bg-teal-600 hover:bg-teal-700' : ''}`}
                                        variant={tier.buttonVariant}
                                    >
                                        {tier.buttonText}
                                    </Button>

                                    <div className="flex-1 space-y-4">
                                        <p className="text-sm font-semibold text-slate-900 dark:text-white">Tính năng nổi bật:</p>
                                        <ul className="space-y-3">
                                            {tier.features.map((feature, i) => (
                                                <li key={i} className="flex items-start gap-3 text-sm text-slate-600 dark:text-slate-300">
                                                    <Check className="w-5 h-5 text-teal-500 shrink-0" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* FAQ Section */}
                <section className="w-full py-20 px-4 md:px-6 lg:px-8 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
                    <div className="max-w-3xl mx-auto">
                        <div className="text-center mb-12">
                            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">Câu hỏi thường gặp</h2>
                            <p className="text-slate-600 dark:text-slate-400">
                                Nếu bạn không tìm thấy câu trả lời ở đây, hãy liên hệ với đội ngũ hỗ trợ của chúng tôi.
                            </p>
                        </div>

                        <Accordion type="single" collapsible className="w-full">
                            {faqs.map((faq, index) => (
                                <AccordionItem key={index} value={`item-${index}`}>
                                    <AccordionTrigger className="text-left text-slate-900 dark:text-white hover:text-teal-600 dark:hover:text-teal-400">
                                        {faq.question}
                                    </AccordionTrigger>
                                    <AccordionContent className="text-slate-600 dark:text-slate-400">
                                        {faq.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="w-full py-20 px-4 md:px-6 lg:px-8 bg-slate-50 dark:bg-slate-900">
                    <div className="max-w-4xl mx-auto text-center p-10 bg-teal-600 rounded-3xl shadow-2xl overflow-hidden relative">
                        {/* decorative circles */}
                        <div className="absolute top-0 left-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
                        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

                        <div className="relative z-10">
                            <h2 className="text-3xl font-bold text-white mb-6">Sẵn sàng để tối ưu hóa vận hành?</h2>
                            <p className="text-teal-100 text-lg mb-8 max-w-2xl mx-auto">
                                Tham gia cùng hơn 1000+ doanh nghiệp đang sử dụng nền tảng của chúng tôi để quản lý kho vận hiệu quả hơn.
                            </p>
                            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                                <Button size="lg" className="bg-white text-teal-600 hover:bg-teal-50 border-0 w-full sm:w-auto font-semibold">
                                    Bắt đầu miễn phí
                                </Button>
                                <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 w-full sm:w-auto">
                                    Liên hệ Sales
                                </Button>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <PrimeNestFooter />
        </div>
    );
}

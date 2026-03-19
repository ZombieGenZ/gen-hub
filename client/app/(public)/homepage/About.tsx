"use client";

import React from "react";
import {
    ArchiveBoxIcon,
    CurrencyDollarIcon,
    UserGroupIcon,
    ArrowRightIcon
} from "@heroicons/react/24/outline";
import Image from "next/image";

interface Feature {
    title: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

const FEATURES: Feature[] = [
    {
        title: "Nguồn Kho Đa Dạng",
        description: "Tiếp cận hệ thống kho phong phú, từ kho thường đến kho chung.",
        icon: ArchiveBoxIcon,
    },
    {
        title: "Giá Cả Minh Bạch",
        description: "Chúng tôi cam kết minh bạch về giá cả và thông tin chi tiết, giúp bạn quyết định tự tin.",
        icon: CurrencyDollarIcon,
    },
    {
        title: "Chuyên Gia Tư Vấn",
        description: "Đội ngũ giàu kinh nghiệm luôn sẵn sàng hỗ trợ bạn nắm bắt thị trường.",
        icon: UserGroupIcon,
    },
];

export function PrimeNestAbout() {
    return (
        <section id="about" className="py-12 md:py-20 bg-background text-foreground">
            <div className="max-w-[1440px] mx-auto px-4 md:px-6">
                <div className="grid lg:grid-cols-2 gap-8 md:gap-12 items-center">
                    {/* Image Section */}
                    <div className="relative">
                        <div className="relative rounded-3xl overflow-hidden bg-muted border border-border h-90 min-h-[500px]">
                            <Image
                                src="/assets/unnamed.jpg"
                                alt="About GenHub"
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover"
                            />
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-[32px] leading-[130%] md:text-4xl font-bold mb-4">
                                Cam Kết Của Chúng Tôi Về{" "}
                                <span className="text-primary">Dịch Vụ Kho Bãi</span>
                            </h2>
                            <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                                Tại GenHub, chúng tôi đơn giản hóa quy trình tìm kiếm và vận hành kho bãi.
                                Đội ngũ chuyên gia của chúng tôi luôn đồng hành và hỗ trợ bạn trong mọi bước đi,
                                đảm bảo sự an tâm tuyệt đối.
                            </p>
                        </div>

                        {/* Features Grid */}
                        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-4">
                            {FEATURES.map((feature, index) => (
                                <div
                                    key={feature.title}
                                    className="bg-card rounded-xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                                        <feature.icon className="w-6 h-6 text-primary" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-foreground mb-2">
                                        {feature.title}
                                    </h3>
                                    <p className="text-xs text-muted-foreground leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* CTA Button */}
                        <button className="px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-full transition-colors inline-flex items-center gap-2">
                            Tìm Hiểu Thêm
                            <ArrowRightIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

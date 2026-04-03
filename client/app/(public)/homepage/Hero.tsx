"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";

const WAREHOUSE_TYPES = ['Kho TMĐT', 'Kho Chung'] as const;

const ANIMATION_DURATION = 0.5;

export function PrimeNestHero() {
    return (
        <section className="relative max-w-[1440px] pt-12 mx-auto w-full flex flex-col">
            {/* Main Content Wrapper */}
            <div className="relative w-full overflow-hidden min-h-[500px] md:min-h-[700px] flex flex-col md:block rounded-xl border-white">

                {/* Background Image & Overlay */}
                <div className="absolute inset-0 z-0">
                    <Image
                        src="/assets/unnamed.jpg"
                        alt="Nền Tảng Thuê Kho & Fulfillment Toàn Diện GenHub"
                        fill
                        priority
                        sizes="100vw"
                        className="object-cover"
                    />
                    {/* Dark Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/25 to-black/20" />
                </div>

                {/* Hero Text Content */}
                <div className="relative z-10 px-6 py-12 md:px-16 md:py-20 lg:pb-48 max-w-7xl mx-auto h-full flex flex-col justify-center items-center text-center">
                    {/* Pills */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: ANIMATION_DURATION }}
                        className="flex flex-wrap gap-3 mb-8 justify-center"
                    >
                        {WAREHOUSE_TYPES.map((warehouseType) => (
                            <span
                                key={warehouseType}
                                className="px-5 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/20 text-white text-sm font-medium hover:bg-white/30 transition-colors cursor-default"
                            >
                                {warehouseType}
                            </span>
                        ))}
                    </motion.div>

                    {/* Headline */}
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: ANIMATION_DURATION, delay: 0.1 }}
                        className="text-[32px] md:text-6xl lg:text-7xl !text-white mb-6 leading-[130%] md:leading-[1.1] tracking-tight drop-shadow-md"
                    >
                        Nền Tảng Thuê Kho & Fulfillment Toàn Diện
                    </motion.h1>

                    {/* Subheadline */}
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: ANIMATION_DURATION, delay: 0.2 }}
                        className="text-lg md:text-xl !text-gray-100 mb-10 leading-relaxed max-w-3xl font-light drop-shadow-sm"
                    >
                        Kết nối doanh nghiệp với mạng lưới kho bãi chất lượng cao trên toàn quốc.
                        Quản lý tồn kho, vận hành và báo cáo minh bạch trên một nền tảng duy nhất.
                    </motion.p>

                    {/* CTA Button */}
                    <motion.button
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: ANIMATION_DURATION, delay: 0.3 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="w-full sm:w-fit px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg rounded-full shadow-lg transition-colors flex justify-center items-center gap-2 cursor-pointer"
                    >
                        Nhận Tư Vấn Ngay
                    </motion.button>
                </div>

                {/* Stats Block (The Scoop) */}
                <div className="flex w-full relative lg:absolute right-0 bottom-0 flex-col overflow-hidden rounded-tl-[2rem] sm:w-auto sm:flex-row md:flex-wrap mt-8 lg:mt-0 z-20">

                    <div className="flex z-10 w-full flex-col gap-6 px-6 py-6 md:gap-[2rem] md:px-[3rem] md:py-[2rem] sm:flex-row lg:gap-[4rem] lg:px-[5rem]">
                        <div className="flex w-auto flex-col gap-[0.5rem]">
                            <div className="flex w-auto">
                                <h3 className="text-3xl md:text-4xl font-bold"><span className="text-primary">100,000+</span></h3>
                            </div>
                            <h5 className="font-medium text-muted-foreground">m² Kho Bãi</h5>
                        </div>
                        <div className="flex w-auto flex-col gap-[0.5rem]">
                            <div className="flex w-auto items-baseline gap-2">
                                <span className="text-foreground text-lg font-bold">Hơn</span>
                                <h3 className="text-3xl md:text-4xl font-bold"><span className="text-destructive-foreground">50K+</span></h3>
                            </div>
                            <h5 className="font-medium text-muted-foreground">Đơn Hàng/Tháng</h5>
                        </div>
                        <div className="flex w-auto flex-col gap-[0.5rem]">
                            <div className="flex w-auto items-baseline gap-2">
                                <span className="text-foreground text-lg font-bold">Hơn</span>
                                <h3 className="text-3xl md:text-4xl font-bold"><span className="text-primary">500+</span></h3>
                            </div>
                            <h5 className="font-medium text-muted-foreground">Đối Tác Tin Cậy</h5>
                        </div>
                    </div>
                    <div className="flex absolute inset-[-1] -left-[1rem] z-0 w-[110%] -skew-x-[10deg] rounded-tl-[1rem] bg-background sm:-right-[4rem] sm:left-[2rem] sm:w-auto sm:-skew-x-[20deg] md:-right-[20rem]"></div>
                </div>
            </div>
        </section>
    );
}

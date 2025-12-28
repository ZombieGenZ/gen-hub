'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { WarehouseHeader } from './WarehouseHeader';
import Image from 'next/image';

const categories = ['Kho lạnh', 'Dịch vụ 3PL', 'Hoàn tất đơn hàng'];

const stats = [
    { label: 'Khách hàng kết nối', value: '100,000+', color: 'text-brand' },
    { label: 'Đánh giá 5 sao', value: 'Hơn 15.7K', color: 'text-error' },
    { label: 'Chủ sở hữu tin dùng', value: 'Hơn 10K', color: 'text-brand' },
];

export function WarehouseHero() {
    return (
        <div className="relative min-h-screen bg-bg overflow-hidden flex flex-col">
            <WarehouseHeader />

            {/* Hero Container */}
            <div className="flex w-full lg:max-w-[64rem] xl:max-w-[90rem] 2xl:max-w-[120rem] relative flex-col justify-center overflow-hidden pb-[15rem] sm:pb-0 lg:p-[2rem] mx-auto">

                {/* Background Image */}
                <div className="relative h-[46rem] max-h-[46rem] lg:h-auto lg:rounded-hero overflow-hidden shadow-premium">
                    <img
                        alt="Warehouse Hero"
                        loading="lazy"
                        width={2000}
                        height={1367}
                        decoding="async"
                        className="h-[46rem] max-h-[46rem] object-cover brightness-[0.4] lg:h-auto lg:rounded-hero w-full"
                        src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop"
                    />

                    {/* Centered Content Overlay */}
                    <div className="flex w-full absolute top-[7.8rem] right-0 items-center justify-center lg:top-[10.11rem]">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                            className="flex w-auto flex-col flex-wrap items-center justify-center gap-[2rem] px-[.5rem] lg:gap-[2.5rem]"
                        >
                            {/* Category Pills */}
                            <div className="flex w-auto gap-[0.5rem] lg:gap-[1rem]">
                                {categories.map((category, index) => (
                                    <motion.p
                                        key={index}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: 0.2 + index * 0.1, duration: 0.5 }}
                                        className="text-[0.875rem] rounded-full bg-white/20 px-[0.75rem] py-[0.5rem] leading-[1.3125rem] text-white backdrop-blur-[11px] lg:px-[1.5rem] lg:text-[1.25rem] lg:leading-[1.875rem] font-semibold"
                                    >
                                        {category}
                                    </motion.p>
                                ))}
                            </div>

                            {/* Headline and Subheadline */}
                            <div className="flex w-auto flex-col gap-[0.25rem]">
                                <div className="flex w-auto justify-center">
                                    <h1 className="text-center text-white text-4xl lg:text-6xl xl:text-7xl font-extrabold tracking-tight leading-tight">
                                        Thuê ngoài rắc rối. <br />
                                        Nâng tầm hiệu quả.
                                    </h1>
                                </div>
                                <h5 className="text-center text-white sm:px-[10%] lg:px-[20%] text-lg lg:text-xl font-medium leading-relaxed mt-4">
                                    Quản lý kho bãi trọn gói cho doanh nghiệp muốn hiệu quả logistics mà không phức tạp.
                                    Bạn giữ quyền kiểm soát. Chúng tôi xử lý hoàn tất đơn hàng và phân phối trên 30+ thị trường.
                                </h5>
                            </div>

                            {/* CTA Button */}
                            <div className="flex w-full flex-col items-center gap-[1.5rem] sm:flex-row sm:justify-center md:w-auto md:flex-wrap">
                                <Button className="cursor-pointer text-[1.125rem] leading-[1.6875rem] font-semibold text-white duration-300 hover:opacity-90 sm:w-auto bg-brand hover:bg-brand-hover rounded-pill px-[3rem] py-[1rem] text-center w-auto border-none shadow-premium transition-transform hover:scale-105 active:scale-95">
                                    Nhận phân tích kho bãi miễn phí
                                </Button>
                            </div>
                        </motion.div>
                    </div>

                    {/* Stats Bar at Bottom */}
                    <div className="flex w-full absolute right-0 bottom-0 flex-col overflow-hidden rounded-tl-4xl sm:w-auto sm:flex-row md:flex-wrap">
                        <motion.div
                            initial={{ opacity: 0, y: 40 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                            className="flex z-10 w-full flex-col gap-[2.7rem] px-[2rem] py-[2.58rem] sm:flex-row sm:px-[6.5rem] lg:gap-[6.4rem] lg:px-[6.9rem]"
                        >
                            {stats.map((stat, index) => (
                                <div key={index} className="flex w-auto flex-col gap-[0.5rem]">
                                    <div className="flex w-auto">
                                        <h3 className="text-2xl lg:text-3xl font-bold">
                                            <span className={stat.color}>{stat.value}</span>
                                        </h3>
                                    </div>
                                    <h5 className="font-medium text-text-muted">{stat.label}</h5>
                                </div>
                            ))}
                        </motion.div>

                        {/* Angled White Background */}
                        <div className="flex absolute inset-0 -left-[1rem] z-0 w-[110%] -skew-x-[10deg] rounded-tl-[1rem] bg-bg-elevated sm:-right-[4rem] sm:left-[2rem] sm:w-auto sm:-skew-x-[20deg] md:-right-[20rem]" />
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Zap, BarChart3, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const facilities = [
    {
        title: 'Bảo mật tiên tiến',
        description: 'Hệ thống giám sát và kiểm soát truy cập hiện đại bảo vệ hàng hóa của bạn 24/7.',
        icon: Shield,
        link: '#',
    },
    {
        title: 'Dịch vụ 3PL',
        description: 'Giải pháp hoàn tất đơn hàng toàn diện bao gồm lấy hàng, đóng gói và vận chuyển toàn cầu.',
        icon: Zap,
        link: '#',
    },
    {
        title: 'Theo dõi thời gian thực',
        description: 'Giám sát mức tồn kho và vận chuyển với hệ thống quản lý kho dựa trên đám mây tích hợp.',
        icon: BarChart3,
        link: '#',
    },
];

export function WarehouseFacilities() {
    return (
        <section id="features" className="py-24 bg-bg">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="text-center mb-16">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-sm font-black uppercase tracking-[0.2em] text-brand mb-4"
                    >
                        Tiện ích kho bãi cao cấp
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl font-black tracking-tighter text-text sm:text-5xl"
                    >
                        Hiệu quả quy mô cùng doanh nghiệp bạn
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 gap-12 sm:grid-cols-2 lg:grid-cols-3">
                    {facilities.map((item, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="group relative flex flex-col p-10 bg-bg-subtle rounded-card border border-transparent hover:border-brand/20 hover:bg-bg hover:shadow-premium transition-all duration-500"
                        >
                            <div className="mb-8 p-4 bg-bg rounded-2xl w-fit shadow-sm group-hover:bg-brand transition-colors duration-500">
                                <item.icon className="h-8 w-8 text-brand group-hover:text-white transition-colors duration-500" />
                            </div>
                            <h3 className="text-2xl font-black text-text mb-4 tracking-tight">{item.title}</h3>
                            <p className="text-text-muted leading-relaxed mb-8 flex-grow">
                                {item.description}
                            </p>
                            <a
                                href={item.link}
                                className="flex items-center gap-2 text-sm font-black text-brand uppercase tracking-wider group/link"
                            >
                                Xem chi tiết
                                <ArrowRight className="h-4 w-4 transition-transform group-hover/link:translate-x-1" />
                            </a>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

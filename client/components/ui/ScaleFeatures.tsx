'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
    BarChart,
    Settings,
    Users,
    Workflow,
    Smartphone,
    Globe
} from 'lucide-react';

const features = [
    {
        title: 'Tích hợp OMS/WMS',
        description: 'Kết nối liền mạch hệ thống quản lý đơn hàng với nền t dụng kho bãi đám mây.',
        icon: Workflow,
    },
    {
        title: 'Nghiệp vụ Cross-Docking',
        description: 'Tối ưu hóa logistics đầu vào và đầu ra với dịch vụ trung chuyển hiệu quả cao.',
        icon: Settings,
    },
    {
        title: 'Phân tích nâng cao',
        description: 'Nhận thông tin chuyên sâu về tốc độ tồn kho, độ chính xác và hiệu suất vận chuyển.',
        icon: BarChart,
    },
    {
        title: 'Hỗ trợ tận tâm',
        description: 'Các chuyên gia logistics của chúng tôi luôn sẵn sàng 24/7 để hỗ trợ vận hành 3PL.',
        icon: Users,
    },
    {
        title: 'Truy cập di động',
        description: 'Quản lý toàn bộ chuỗi cung ứng từ bất cứ đâu với ứng dụng di động doanh nghiệp.',
        icon: Smartphone,
    },
    {
        title: 'Mạng lưới toàn cầu',
        description: 'Truy cập mạng lưới trung tâm hoàn tất đơn hàng tại các vị trí chiến lược toàn cầu.',
        icon: Globe,
    },
];

export function ScaleFeatures() {
    return (
        <section className="py-24 bg-bg overflow-hidden relative">
            {/* Background decoration */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand/5 blur-[150px] rounded-full -z-10" />

            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="text-center mb-20">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-sm font-black uppercase tracking-[0.2em] text-brand mb-4"
                    >
                        Thiết kế cho sự vận hành xuất sắc
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.1 }}
                        className="text-4xl font-black tracking-tighter text-text sm:text-5xl"
                    >
                        Mọi thứ bạn cần để mở rộng quy mô
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.05 }}
                            className="p-10 rounded-card bg-bg-elevated border border-border hover:border-brand/30 hover:shadow-premium transition-all duration-500"
                        >
                            <div className="h-14 w-14 bg-brand/10 rounded-2xl flex items-center justify-center mb-8">
                                <feature.icon className="h-7 w-7 text-brand" />
                            </div>
                            <h3 className="text-xl font-black text-text mb-4 tracking-tight">
                                {feature.title}
                            </h3>
                            <p className="text-text-muted text-sm leading-relaxed font-medium">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

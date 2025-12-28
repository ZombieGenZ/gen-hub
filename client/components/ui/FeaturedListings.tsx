'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Box, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const listings = [
    {
        id: 1,
        title: 'Khu công nghiệp Metro',
        location: 'Khu vực phía Bắc, Singapore',
        price: '12$/sqft',
        size: '50.000 sqft',
        type: 'Kho lạnh',
        image: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop',
        tag: 'Sẵn sàng Fulfillment',
    },
    {
        id: 2,
        title: 'Phân phối East Coast',
        location: 'Công viên kinh doanh Changi',
        price: '9$/sqft',
        size: '120.000 sqft',
        type: 'Kho khô',
        image: 'https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=2070&auto=format&fit=crop',
        tag: 'Đã có 3PL quản lý',
    },
    {
        id: 3,
        title: 'Logitech Hub West',
        location: 'Khu công nghiệp Tuas',
        price: '15$/sqft',
        size: '85.000 sqft',
        type: 'Tải trọng nặng',
        image: 'https://images.unsplash.com/photo-1565891741441-64926e441838?q=80&w=2070&auto=format&fit=crop',
        tag: 'Kho ngoại quan',
    },
];

export function FeaturedListings() {
    return (
        <section id="solutions" className="py-24 bg-bg-subtle">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
                    <div className="max-w-2xl">
                        <motion.h2
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="text-sm font-black uppercase tracking-[0.2em] text-brand mb-4"
                        >
                            Danh sách nổi bật
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl font-black tracking-tighter text-text sm:text-5xl"
                        >
                            Tìm kiếm không gian hoàn hảo <br />
                            cho hàng hóa của bạn
                        </motion.p>
                    </div>
                    <Button variant="ghost" className="text-brand font-black border-2 border-brand/20 rounded-pill px-8 py-6 hover:bg-brand-subtle hover:text-brand overflow-hidden group transition-all">
                        <span className="mr-2">Tất cả vị trí</span>
                        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {listings.map((item, index) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            className="group bg-bg-elevated rounded-card overflow-hidden shadow-md hover:shadow-premium transition-all duration-500 border border-border"
                        >
                            <div className="relative h-72 overflow-hidden">
                                <img
                                    src={item.image}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                />
                                <div className="absolute top-6 left-6 px-4 py-2 bg-white/90 backdrop-blur-md rounded-pill text-[10px] font-black uppercase tracking-widest text-brand shadow-xl">
                                    {item.tag}
                                </div>
                                <div className="absolute bottom-6 right-6 px-5 py-3 bg-bg-elevated/90 backdrop-blur-md rounded-2xl text-text font-black border border-border/50">
                                    {item.price}
                                </div>
                            </div>

                            <div className="p-10">
                                <h3 className="text-2xl font-black text-text mb-3 tracking-tight group-hover:text-brand transition-colors">
                                    {item.title}
                                </h3>
                                <div className="flex items-center gap-2 text-text-muted mb-8 font-medium">
                                    <MapPin className="h-4 w-4 text-text-muted/60" />
                                    <span className="text-sm">{item.location}</span>
                                </div>

                                <div className="flex justify-between items-center pt-8 border-t border-border/50">
                                    <div className="flex items-center gap-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Diện tích</span>
                                            <span className="text-sm font-black text-text">{item.size}</span>
                                        </div>
                                        <div className="w-px h-8 bg-border" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-1">Loại</span>
                                            <span className="text-sm font-black text-text">{item.type}</span>
                                        </div>
                                    </div>
                                    <div className="bg-bg p-4 rounded-pill group-hover:bg-brand transition-colors duration-500 shadow-sm">
                                        <ArrowRight className="h-5 w-5 text-text-muted group-hover:text-white transition-colors duration-500" />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}

"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

import { Square2StackIcon, HomeModernIcon, BuildingOfficeIcon, BoltIcon, MapPinIcon, TruckIcon } from "@heroicons/react/24/outline";

const filters = ["Kho Thường", "Kho Chung"];

const propertyDetails = [
    { icon: Square2StackIcon, label: "500m2" },
    { icon: HomeModernIcon, label: "2 Cửa" },
    { icon: BuildingOfficeIcon, label: "Văn Phòng" },
    { icon: BoltIcon, label: "Điện 3 Pha" },
    { icon: MapPinIcon, label: "Nội Thành" },
    { icon: TruckIcon, label: "Xe Cont" },
];

export function PrimeNestFeatured() {
    const [activeFilter, setActiveFilter] = useState("Kho Thường");

    return (
        <section id="properties" className="py-12 md:py-24 bg-background text-foreground">
            <div className="max-w-[1440px] mx-auto px-4">
                {/* Header */}
                <div className="text-center mb-10">
                    <h2 className="text-[32px] leading-[130%] md:text-4xl font-bold mb-3">Kho Nổi Bật</h2>
                    <p className="text-slate-600 max-w-xl mx-auto text-sm">
                        Khám phá các kho bãi hàng đầu hiện có trên GenHub, phù hợp với mọi quy mô doanh nghiệp
                    </p>

                    {/* Filter Tabs */}
                    <div className="flex items-center justify-center gap-3 mt-6">
                        {filters.map((filter) => (
                            <Button
                                key={filter}
                                type="button"
                                size="sm"
                                onClick={() => setActiveFilter(filter)}
                                className={`px-5 py-2 rounded-full text-sm font-medium border ${activeFilter === filter
                                    ? "bg-primary text-primary-foreground border-primary"
                                    : "bg-background text-muted-foreground border-border hover:border-primary/50"
                                    }`}
                            >
                                {filter}
                            </Button>
                        ))}
                    </div>
                </div>

                {/* Property Grid */}
                <div className="grid lg:grid-cols-2 gap-8 items-start">
                    {/* Images */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 h-48 md:h-64 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden relative">
                            <Image src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2670&auto=format&fit=crop" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" alt="Warehouse Main" />
                        </div>
                        <div className="h-28 md:h-36 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden relative">
                            <Image src="https://images.unsplash.com/photo-1553413077-190dd305871c?q=80&w=2535&auto=format&fit=crop" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" alt="Warehouse Detail 1" />
                        </div>
                        <div className="h-28 md:h-36 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden relative">
                            <Image src="https://images.unsplash.com/photo-1565610222536-ef125c59da2e?q=80&w=2670&auto=format&fit=crop" fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" alt="Warehouse Detail 2" />
                        </div>
                    </div>

                    {/* Details */}
                    <div className="bg-card rounded-3xl p-4 border border-border shadow-sm">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h3 className="text-2xl font-bold">Kho Xưởng Hiện Đại</h3>
                                <p className="text-primary text-xl font-bold mt-2">
                                    35.000.000 VND/tháng
                                </p>
                            </div>
                            <Button type="button" variant="outline" size="sm" className="px-4 py-2 border-border rounded-full text-sm text-foreground hover:border-primary hover:text-primary">
                                Xem Tất Cả
                            </Button>
                        </div>

                        {/* Specs */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {propertyDetails.map((detail, index) => (
                                <div
                                    key={index}
                                    className="bg-muted/50 rounded-xl p-4 border border-border flex items-center gap-3"
                                >
                                    <detail.icon className="w-6 h-6 text-primary" />
                                    <span className="text-foreground text-sm">{detail.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:items-center">
                            <Button type="button" className="w-full sm:w-auto px-5 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl">
                                Xem Chi Tiết
                            </Button>
                            <Button type="button" variant="outline" className="w-full sm:w-auto px-5 py-3 border-border text-foreground rounded-xl hover:border-primary hover:text-primary">
                                Tham Quan 3D
                            </Button>
                            <div className="flex items-center gap-2 text-muted-foreground w-full sm:w-auto justify-center sm:justify-start mt-2 sm:mt-0">
                                <span className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-sm">Đang Trống</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

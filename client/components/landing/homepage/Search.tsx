"use client";

import React from "react";

export function PrimeNestSearch() {
    return (
        <section className="py-24 bg-white text-slate-900">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    {/* Search Content */}
                    <div>
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">
                            Tìm Kiếm Kho Bãi <br />
                            <span className="text-[#0F766E]">Tại Vị Trí Ưu Thích</span>
                        </h2>
                        <p className="text-slate-600 mb-8">
                            Khám phá bản đồ tương tác để tìm kho bãi tại vị trí chiến lược. Lọc theo giá, diện tích và tiện ích để tìm không gian lưu trữ lý tưởng.
                        </p>

                        {/* Search Form */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm text-slate-600 mb-2" htmlFor="search-location">Vị Trí</label>
                                    <input
                                        type="text"
                                        placeholder="Nhập Thành phố, Quận/Huyện"
                                        id="search-location"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:border-[#0F766E] transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-600 mb-2" htmlFor="search-property-type">Loại Kho</label>
                                    <select id="search-property-type" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:border-[#0F766E] transition-colors appearance-none">
                                        <option>Tất Cả</option>
                                        <option>Kho Mát</option>
                                        <option>Kho Thường</option>
                                        <option>Fulfillment</option>
                                        <option>Kho Ngoại Quan</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm text-slate-600 mb-2" htmlFor="search-price-range">Mức Giá</label>
                                    <select id="search-price-range" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:border-[#0F766E] transition-colors appearance-none">
                                        <option>Dưới 50 Tr</option>
                                        <option>50 Tr - 100 Tr</option>
                                        <option>Trên 100 Tr</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-600 mb-2" htmlFor="search-area">Diện Tích</label>
                                    <select id="search-area" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:border-[#0F766E] transition-colors appearance-none">
                                        <option>Mọi Diện Tích</option>
                                        <option>Dưới 500m2</option>
                                        <option>500 - 1000m2</option>
                                        <option>Trên 1000m2</option>
                                    </select>
                                </div>
                            </div>

                            <button className="w-full bg-[#0F766E] hover:bg-[#0D5A52] text-white font-semibold py-3 rounded-lg transition-colors">
                                Tìm Kiếm Ngay
                            </button>
                        </div>
                    </div>

                    {/* Map Visual */}
                    <div className="relative h-130 rounded-2xl overflow-hidden border border-slate-200 bg-white">
                        <div className="absolute inset-0 bg-slate-100" />
                        <div className="absolute top-4 left-4 right-4 h-12 rounded-lg bg-white border border-slate-200 shadow-sm" />
                        <div className="absolute bottom-4 left-4 right-4 flex gap-4">
                            <div className="flex-1 h-28 rounded-xl bg-white border border-slate-200 shadow-sm" />
                            <div className="w-40 h-28 rounded-xl bg-white border border-slate-200 shadow-sm" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

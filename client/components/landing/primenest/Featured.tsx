"use client";

import React, { useState } from "react";

const filters = ["Luxury", "Premium", "Standard"];

const propertyDetails = [
    { icon: "📐", label: "140m2" },
    { icon: "🛏️", label: "2 Bedrooms" },
    { icon: "🛁", label: "2 Bathrooms" },
    { icon: "🍳", label: "1 Kitchen" },
    { icon: "📍", label: "Metropolitan Area" },
    { icon: "🚗", label: "1 Garage" },
];

export function PrimeNestFeatured() {
    const [activeFilter, setActiveFilter] = useState("Luxury");

    return (
        <section id="properties" className="py-24 bg-white text-slate-900">
            <div className="max-w-7xl mx-auto px-6">
                {/* Header */}
                <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold mb-3">Featured Listings</h2>
                    <p className="text-slate-600 max-w-xl mx-auto text-sm">
                        Explore some of the top properties currently available on PrimeNest
                    </p>

                    {/* Filter Tabs */}
                    <div className="flex items-center justify-center gap-3 mt-6">
                        {filters.map((filter) => (
                            <button
                                key={filter}
                                onClick={() => setActiveFilter(filter)}
                                className={`px-5 py-2 rounded-full text-sm font-medium transition-all border ${activeFilter === filter
                                        ? "bg-orange-500 text-white border-orange-500"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-orange-300"
                                    }`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Property Grid */}
                <div className="grid lg:grid-cols-2 gap-8 items-start">
                    {/* Images */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 h-64 rounded-2xl bg-slate-100 border border-slate-200" />
                        <div className="h-36 rounded-2xl bg-slate-100 border border-slate-200" />
                        <div className="h-36 rounded-2xl bg-slate-100 border border-slate-200" />
                        <div className="col-span-2 h-36 rounded-2xl bg-slate-100 border border-slate-200" />
                        <div className="col-span-2 h-36 rounded-2xl bg-slate-100 border border-slate-200" />
                    </div>

                    {/* Details */}
                    <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h3 className="text-2xl font-bold">Modern Penthouse</h3>
                                <p className="text-orange-500 text-xl font-bold mt-2">
                                    $1,500,000
                                </p>
                            </div>
                            <button className="px-4 py-2 border border-slate-200 rounded-full text-sm text-slate-700 hover:border-orange-400 hover:text-orange-500 transition-colors">
                                See All Property
                            </button>
                        </div>

                        {/* Specs */}
                        <div className="grid grid-cols-2 gap-3 mb-6">
                            {propertyDetails.map((detail, index) => (
                                <div
                                    key={index}
                                    className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex items-center gap-3"
                                >
                                    <span className="text-lg">{detail.icon}</span>
                                    <span className="text-slate-700 text-sm">{detail.label}</span>
                                </div>
                            ))}
                        </div>

                        {/* CTA */}
                        <div className="flex flex-wrap gap-3 items-center">
                            <button className="px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl transition-colors">
                                View Details
                            </button>
                            <button className="px-5 py-3 border border-slate-200 text-slate-700 rounded-xl hover:border-orange-400 hover:text-orange-500 transition-colors">
                                Virtual Tour
                            </button>
                            <div className="flex items-center gap-2 text-slate-600">
                                <span className="w-2 h-2 bg-green-500 rounded-full" />
                                <span className="text-sm">Available</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

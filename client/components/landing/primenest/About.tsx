"use client";

import React from "react";

const features = [
    {
        icon: (
            <svg
                className="w-6 h-6 text-orange-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
            </svg>
        ),
        title: "Exclusive Listings",
        description:
            "Access exclusive, high-quality properties, from luxury apartments to beautiful family homes",
    },
    {
        icon: (
            <svg
                className="w-6 h-6 text-orange-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
        ),
        title: "Transparent Pricing",
        description:
            "We ensure transparency with clear pricing and property details, helping you decide confidently",
    },
    {
        icon: (
            <svg
                className="w-6 h-6 text-orange-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
            </svg>
        ),
        title: "Trusted Advisors",
        description:
            "Our experienced agents are here to help you navigate the market",
    },
];

export function PrimeNestAbout() {
    return (
        <section id="about" className="py-20 bg-white text-slate-900">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Image Section */}
                    <div className="relative">
                        <div className="relative rounded-3xl overflow-hidden bg-slate-100 border border-slate-200 h-90" />
                    </div>

                    {/* Content Section */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                Our Commitment to Making {""}
                                <span className="text-orange-500">Home Ownership Easy</span>
                            </h2>
                            <p className="text-slate-600 leading-relaxed">
                                At PrimeNest, we simplify the journey to homeownership. Our expert team provides guidance and support at every step, ensuring you feel confident in your decisions.
                            </p>
                        </div>

                        {/* Features Grid */}
                        <div className="grid md:grid-cols-3 gap-4">
                            {features.map((feature, index) => (
                                <div
                                    key={index}
                                    className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="w-10 h-10 bg-orange-50 rounded-full flex items-center justify-center mb-3">
                                        {feature.icon}
                                    </div>
                                    <h3 className="text-sm font-semibold text-slate-900 mb-2">
                                        {feature.title}
                                    </h3>
                                    <p className="text-xs text-slate-600 leading-relaxed">
                                        {feature.description}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* CTA Button */}
                        <button className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-full transition-colors inline-flex items-center gap-2">
                            Learn More
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
}

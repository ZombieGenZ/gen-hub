"use client";

import React from "react";

const features = [
    {
        title: "Browse Properties",
        description: "Explore our vast database of premium listings to find the home that matches your lifestyle.",
        icon: (
            <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
        ),
    },
    {
        title: "Schedule a Visit",
        description: "Book a viewing at your convenience with our easy-to-use scheduling system.",
        icon: (
            <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        ),
    },
    {
        title: "Meet Our Agent",
        description: "Connect with our expert agents who will guide you through every step of the process.",
        icon: (
            <svg className="w-8 h-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
        ),
    },
];

export function PrimeNestFeatures() {
    return (
        <section className="py-24 bg-white text-slate-900">
            <div className="max-w-7xl mx-auto px-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    {/* Left Image Column */}
                    <div className="relative">
                        <div className="rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 h-full min-h-[500px]">
                            <img
                                src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=2670&auto=format&fit=crop"
                                alt="Modern Interior"
                                className="w-full h-full object-cover"
                            />
                        </div>
                    </div>

                    {/* Right Content Column */}
                    <div className="space-y-10">
                        <div className="space-y-4">
                            <h2 className="text-3xl md:text-4xl font-bold leading-tight">
                                Find Your Dream Home <br />
                                <span className="text-orange-500">With PrimeNest</span>
                            </h2>
                            <p className="text-slate-600 text-lg leading-relaxed">
                                We make the home buying process simple and stress-free with our comprehensive services tailored just for you.
                            </p>
                        </div>

                        {/* Feature Cards Row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {features.map((feature, index) => (
                                <div
                                    key={index}
                                    className="bg-slate-50 p-4 rounded-xl border border-transparent hover:border-orange-200 hover:bg-white hover:shadow-lg transition-all duration-300 flex flex-col gap-3 group"
                                >
                                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm text-orange-500 group-hover:scale-110 transition-transform">
                                        {React.cloneElement(feature.icon as React.ReactElement, { className: "w-5 h-5" })}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-slate-900 mb-1">{feature.title}</h3>
                                        <p className="text-xs text-slate-500 leading-relaxed">
                                            {feature.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* CTA Button */}
                        <div className="pt-2">
                            <button className="bg-orange-500 hover:bg-orange-600 text-white rounded-full px-8 py-4 font-bold shadow-lg shadow-orange-500/20 transition-all hover:-translate-y-1">
                                Learn More
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

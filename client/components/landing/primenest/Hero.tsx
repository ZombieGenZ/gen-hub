"use client";

import React from "react";

export function PrimeNestHero() {
    return (
        <section className="relative min-h-200 overflow-hidden bg-slate-200 text-slate-900">
            {/* Background decorative blocks */}
            <div aria-hidden="true" className="absolute inset-0 z-0">
                {/* Top-right large rounded block */}
                <div className="absolute right-6 top-24 hidden lg:block">
                    <div className="h-90 w-152 rounded-4xl bg-slate-300" />
                </div>

                {/* Middle-left smaller rounded block */}
                <div className="absolute left-[42%] top-40 hidden lg:block">
                    <div className="h-64 w-96 rounded-4xl bg-slate-300" />
                </div>
            </div>

            {/* White cutout mask - Convex Corner implemented via Subtraction (User Request) */}
            <div
                aria-hidden="true"
                className="absolute inset-0 z-10 pointer-events-none bg-white"
                style={{
                    // Logic: Full Canvas (Source) SUBTRACT The "Image Hole" (Destination Layers).
                    // The "Hole" is composed of:
                    // 1. Right Strip (x > 46% + 80px)
                    // 2. Bottom Strip (y > 70% + 80px)
                    // 3. Corner Circle (centered at 46% + 80px, 70% + 80px) which rounds the junction.

                    // Refactored Mask Logic for Subtract (L-Shape):
                    // 1. Full Canvas (Base)
                    // 2. Right Bottom Block (Subtract)
                    // 3. Bottom Right Block (Subtract)
                    // 4. Corner Circle (Subtract)
                    maskImage: `
                        linear-gradient(black, black),
                        linear-gradient(black, black),
                        linear-gradient(black, black),
                        radial-gradient(circle 80px at calc(46% + 80px) calc(70% + 80px), black 100%, transparent 100%)
                    `,
                    maskSize: `
                        100% 100%,
                        calc(54% - 80px) 30%,
                        54% calc(30% - 80px),
                        160px 160px
                    `,
                    maskPosition: `
                        0 0,
                        100% 100%,
                        100% 100%,
                        calc(46%) calc(70%)
                    `,
                    maskComposite: 'subtract',
                    WebkitMaskComposite: 'destination-out',
                    maskRepeat: 'no-repeat'
                }}
            />

            <div className="relative z-20 max-w-7xl mx-auto px-6 pt-20 pb-36 lg:pt-24 lg:pb-40">
                <div className="max-w-xl">
                    <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                        Simplifying the Path to
                        <br />
                        Your Perfect Home
                    </h1>
                    <p className="mt-4 text-slate-600 max-w-sm text-sm md:text-base leading-relaxed">
                        Explore a Range of Modern Homes Tailored to Your Needs, Backed by Our Expert Guidance Every Step of the Way
                    </p>
                    <button className="mt-6 inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-orange-500 text-white text-sm font-semibold hover:bg-orange-600 transition-colors">
                        Explore Now
                    </button>
                </div>

                {/* Mobile decorative block */}
                <div className="mt-10 lg:hidden">
                    <div className="h-80 rounded-4xl bg-slate-300" />
                </div>

                {/* Stats pill */}
                <div className="absolute left-1/2 -translate-x-1/2 bottom-10 w-[92%] max-w-2xl">
                    <div className="mx-auto rounded-full bg-stone-800 text-white px-8 py-4 shadow-lg flex items-center justify-between gap-6 text-xs md:text-sm">
                        <div className="text-center">
                            <div className="font-bold">5000+</div>
                            <div className="text-slate-300">Luxury House</div>
                        </div>
                        <div className="w-px h-8 bg-white/20" />
                        <div className="text-center">
                            <div className="font-bold">500+</div>
                            <div className="text-slate-300">Reliable Agents</div>
                        </div>
                        <div className="w-px h-8 bg-white/20" />
                        <div className="text-center">
                            <div className="font-bold">5000+</div>
                            <div className="text-slate-300">Happy Customers</div>
                        </div>
                        <div className="w-px h-8 bg-white/20 hidden sm:block" />
                        <div className="text-center hidden sm:block">
                            <div className="font-bold">50+</div>
                            <div className="text-slate-300">Awards</div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

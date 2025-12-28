"use client";

import React from "react";

export function PrimeNestContact() {
    return (
        <section className="py-24 bg-white text-slate-900">
            <div className="max-w-7xl mx-auto px-6">
                <div className="bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-sm">
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        {/* Content Side */}
                        <div className="p-12 lg:p-14 flex flex-col justify-center">
                            <h2 className="text-3xl md:text-4xl font-bold mb-4">
                                Ready to Find Your <br />
                                <span className="text-orange-500">Next Home?</span>
                            </h2>
                            <p className="text-slate-600 mb-8 max-w-md">
                                Discover the latest and best properties. Our team is ready to help you every step of the way.
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <button className="px-8 py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-lg transition-colors">
                                    Contact Us
                                </button>
                                <button className="px-8 py-3.5 bg-white border border-slate-200 hover:border-orange-400 text-slate-800 font-bold rounded-lg transition-colors">
                                    Browse Properties
                                </button>
                            </div>
                        </div>

                        {/* Image Side */}
                        <div className="relative h-90 lg:h-full bg-slate-100 border-l border-slate-200">
                            <div className="absolute inset-0 bg-slate-100" />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

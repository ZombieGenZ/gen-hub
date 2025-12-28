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
                            Find Your Perfect Home <br />
                            <span className="text-orange-500">In Your Favorite Area</span>
                        </h2>
                        <p className="text-slate-600 mb-8">
                            Explore our interactive map to find properties in the neighborhoods you love. Filter by price, size, and amenities to discover your dream home.
                        </p>

                        {/* Search Form */}
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-sm text-slate-600 mb-2" htmlFor="search-location">Location</label>
                                    <input
                                        type="text"
                                        placeholder="Enter City, Zip, or Address"
                                        id="search-location"
                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:border-orange-500 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-600 mb-2" htmlFor="search-property-type">Property Type</label>
                                    <select id="search-property-type" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:border-orange-500 transition-colors appearance-none">
                                        <option>All Types</option>
                                        <option>House</option>
                                        <option>Apartment</option>
                                        <option>Villa</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-sm text-slate-600 mb-2" htmlFor="search-price-range">Price Range</label>
                                    <select id="search-price-range" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:border-orange-500 transition-colors appearance-none">
                                        <option>$100k - $500k</option>
                                        <option>$500k - $1M</option>
                                        <option>$1M+</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-slate-600 mb-2" htmlFor="search-bedrooms">Bedrooms</label>
                                    <select id="search-bedrooms" className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:border-orange-500 transition-colors appearance-none">
                                        <option>Any</option>
                                        <option>1+</option>
                                        <option>2+</option>
                                        <option>3+</option>
                                        <option>4+</option>
                                    </select>
                                </div>
                            </div>

                            <button className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-lg transition-colors">
                                Search Properties
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

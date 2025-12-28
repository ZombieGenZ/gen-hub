"use client";

import React from "react";
import Link from "next/link";

export function PrimeNestHeader() {
    return (
        <header className="sticky top-4 z-50 px-4 flex justify-center">
            <div className="w-full max-w-6xl bg-white rounded-full border border-slate-200 shadow-sm px-6 py-4 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                        <svg
                            className="w-5 h-5 text-white"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                        >
                            <path d="M12 3L4 9v12h16V9l-8-6zm0 2.5L18 10v9H6v-9l6-4.5z" />
                        </svg>
                    </div>
                    <span className="text-xl font-bold text-slate-900">Primenest</span>
                </Link>

                {/* Navigation */}
                <nav className="hidden md:flex items-center gap-8 text-slate-900 text-sm font-medium">
                    <Link href="#" className="text-amber-500">Home</Link>
                    <Link href="#about" className="hover:text-amber-500 transition-colors">About Us</Link>
                    <Link href="#services" className="hover:text-amber-500 transition-colors">Service</Link>
                    <Link href="#properties" className="hover:text-amber-500 transition-colors">Property</Link>
                    <Link href="#blog" className="hover:text-amber-500 transition-colors">Blog</Link>
                </nav>

                {/* CTA Button */}
                <button className="hidden md:block px-6 py-2.5 text-sm font-semibold text-amber-500 border border-amber-500 rounded-full hover:bg-amber-500 hover:text-white transition-colors">
                    Contact Us
                </button>

                {/* Mobile Menu Button */}
                <button className="md:hidden text-slate-900 p-2" aria-label="Open menu">
                    <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 12h16M4 18h16"
                        />
                    </svg>
                </button>
            </div>
        </header>
    );
}

"use client";

import React, { useState } from "react";
import Image from "next/image";

const testimonials = [
    {
        id: 1,
        name: "Sarah Johnson",
        role: "Homeowner",
        image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=1887&auto=format&fit=crop",
        quote: "PrimeNest made finding our dream home an absolute breeze. The agents were incredibly helpful and the platform was so easy to use. We couldn't be happier with our new place!",
    },
    {
        id: 2,
        name: "Michael Chen",
        role: "Property Investor",
        image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1887&auto=format&fit=crop",
        quote: "As an investor, I need reliable data and quick access to listings. PrimeNest provides exactly that. It's become my go-to tool for finding new investment opportunities.",
    },
    {
        id: 3,
        name: "Emily Davis",
        role: "First-time Buyer",
        image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=1888&auto=format&fit=crop",
        quote: "I was nervous about buying my first home, but the team at PrimeNest guided me through every step. Their transparency and expertise gave me the confidence I needed.",
    },
];

export function PrimeNestTestimonials() {
    const [activeIndex, setActiveIndex] = useState(0);

    const nextTestimonial = () => {
        setActiveIndex((prev) => (prev + 1) % testimonials.length);
    };

    const prevTestimonial = () => {
        setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
    };

    return (
        <section className="py-24 bg-white text-slate-900">
            <div className="max-w-7xl mx-auto px-6">
                <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Customer Testimonials</h2>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
                    {/* Quote card */}
                    <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative">
                        <svg className="w-10 h-10 text-orange-500 mb-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21L14.017 18C14.017 16.8954 14.9124 16 16.017 16H19.017C19.5693 16 20.017 15.5523 20.017 15V9C20.017 8.44772 19.5693 8 19.017 8H15.017C14.4647 8 14.017 8.44772 14.017 9V11C14.017 11.5523 13.5693 12 13.017 12H12.017V5H22.017V15C22.017 18.3137 19.3307 21 16.017 21H14.017ZM5.0166 21L5.0166 18C5.0166 16.8954 5.91203 16 7.0166 16H10.0166C10.5689 16 11.0166 15.5523 11.0166 15V9C11.0166 8.44772 10.5689 8 10.0166 8H6.0166C5.46432 8 5.0166 8.44772 5.0166 9V11C5.0166 11.5523 4.56889 12 4.0166 12H3.0166V5H13.0166V15C13.0166 18.3137 10.3303 21 7.0166 21H5.0166Z" />
                        </svg>
                        <p className="text-lg md:text-xl text-slate-700 leading-relaxed mb-6">
                            &ldquo;{testimonials[activeIndex].quote}&rdquo;
                        </p>
                        <div>
                            <h4 className="text-lg font-bold">{testimonials[activeIndex].name}</h4>
                            <p className="text-orange-500 text-sm">{testimonials[activeIndex].role}</p>
                        </div>

                        {/* Dots */}
                        <div className="flex gap-2 mt-6">
                            {testimonials.map((_, idx) => (
                                <span
                                    key={idx}
                                    className={`w-8 h-1 rounded-full ${idx === activeIndex ? "bg-orange-500" : "bg-slate-200"}`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Image + nav */}
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-full max-w-md aspect-4/3 rounded-3xl bg-slate-100 border border-slate-200 overflow-hidden relative">
                            <Image
                                src={testimonials[activeIndex].image}
                                alt={testimonials[activeIndex].name}
                                fill
                                sizes="(max-width: 768px) 100vw, 400px"
                                className="object-cover"
                                priority
                            />
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={prevTestimonial}
                                className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center hover:border-orange-400 hover:text-orange-500 transition-colors"
                                aria-label="Previous testimonial"
                            >
                                <span className="sr-only">Previous testimonial</span>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            <button
                                onClick={nextTestimonial}
                                className="w-11 h-11 rounded-full border border-slate-200 flex items-center justify-center hover:border-orange-400 hover:text-orange-500 transition-colors"
                                aria-label="Next testimonial"
                            >
                                <span className="sr-only">Next testimonial</span>
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

"use client";

import React, { useState } from "react";

const faqs = [
    {
        question: "How do I start the process of buying a home?",
        answer: "Starting is easy! Simply browse our listings or contact one of our agents. We'll guide you through pre-approval, finding properties, and making an offer.",
    },
    {
        question: "What fees are involved in buying a property?",
        answer: "Typical fees include the down payment, closing costs (2-5% of loan amount), inspection fees, and appraisal fees. Our agents will provide a detailed breakdown.",
    },
    {
        question: "Can I sell my current home while buying a new one?",
        answer: "Yes, this is very common. We can help coordinate the sale of your current home with the purchase of your new one to ensure a smooth transition.",
    },
    {
        question: "How long does the home buying process take?",
        answer: "On average, it takes 30-45 days from offer acceptance to closing. However, finding the right home can take anywhere from a few weeks to several months.",
    },
    {
        question: "Do you offer property management services?",
        answer: "Yes, we offer comprehensive property management services for investors, including tenant screening, rent collection, and maintenance.",
    },
];

export function PrimeNestFAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggleFAQ = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <section className="py-24 bg-white text-slate-900">
            <div className="max-w-4xl mx-auto px-6">
                <div className="text-center mb-14">
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">
                        Frequently Asked <br />
                        <span className="text-orange-500">Questions</span>
                    </h2>
                    <p className="text-slate-600">
                        Find answers to common questions about buying, selling, and renting properties.
                    </p>
                </div>

                <div className="space-y-3">
                    {faqs.map((faq, index) => (
                        <div
                            key={index}
                            className={`bg-white rounded-xl overflow-hidden border transition-all duration-300 ${openIndex === index ? "border-orange-300 shadow-sm" : "border-slate-200 hover:border-orange-200"
                                }`}
                        >
                            <button
                                onClick={() => toggleFAQ(index)}
                                className="w-full px-6 py-5 flex items-center justify-between text-left focus:outline-none"
                            >
                                <span className={`font-semibold text-lg ${openIndex === index ? "text-orange-500" : "text-slate-900"}`}>
                                    {faq.question}
                                </span>
                                <span className={`transform transition-transform duration-300 ${openIndex === index ? "rotate-180" : ""}`}>
                                    <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </span>
                            </button>

                            <div
                                className={`px-6 transition-all duration-300 ease-in-out overflow-hidden ${openIndex === index ? "max-h-48 pb-6 opacity-100" : "max-h-0 opacity-0"
                                    }`}
                            >
                                <p className="text-slate-600 leading-relaxed">
                                    {faq.answer}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

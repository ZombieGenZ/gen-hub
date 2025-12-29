"use client";

import React from "react";
import { PrimeNestHeader } from "@/components/landing/homepage/Header";
import { PrimeNestHero } from "@/components/landing/homepage/Hero";
import { PrimeNestSearch } from "@/components/landing/homepage/Search";
import { PrimeNestFeatures } from "@/components/landing/homepage/Features";
import { PrimeNestAbout } from "@/components/landing/homepage/About";
import { PrimeNestFeatured } from "@/components/landing/homepage/Featured";
import { PrimeNestTestimonials } from "@/components/landing/homepage/Testimonials";
import { PrimeNestFAQ } from "@/components/landing/homepage/FAQ";
import { PrimeNestContact } from "@/components/landing/homepage/Contact";
import { PrimeNestFooter } from "@/components/landing/homepage/Footer";

export default function Home() {
    return (
        <div className="min-h-screen bg-white text-slate-900">
            <PrimeNestHeader />
            <main>
                <PrimeNestHero />
                <PrimeNestSearch />
                <PrimeNestFeatures />
                <PrimeNestAbout />
                <PrimeNestFeatured />
                <PrimeNestTestimonials />
                <PrimeNestFAQ />
                <PrimeNestContact />
            </main>
            <PrimeNestFooter />
        </div>
    );
}

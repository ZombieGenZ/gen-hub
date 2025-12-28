"use client";

import React from "react";
import { PrimeNestHeader } from "@/components/landing/primenest/Header";
import { PrimeNestHero } from "@/components/landing/primenest/Hero";
import { PrimeNestSearch } from "@/components/landing/primenest/Search";
import { PrimeNestFeatures } from "@/components/landing/primenest/Features";
import { PrimeNestAbout } from "@/components/landing/primenest/About";
import { PrimeNestFeatured } from "@/components/landing/primenest/Featured";
import { PrimeNestTestimonials } from "@/components/landing/primenest/Testimonials";
import { PrimeNestFAQ } from "@/components/landing/primenest/FAQ";
import { PrimeNestContact } from "@/components/landing/primenest/Contact";
import { PrimeNestFooter } from "@/components/landing/primenest/Footer";

export default function PrimeNestPage() {
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

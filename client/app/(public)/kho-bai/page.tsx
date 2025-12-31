"use client";

import React from 'react';
import { PrimeNestHeader } from '@/app/(public)/homepage/Header';
import { PrimeNestFooter } from '@/app/(public)/homepage/Footer';
import PropertySearch from '@/components/search/PropertySearch';

export default function KhoBaiPage() {
    return (
        <div className="flex flex-col min-h-screen bg-slate-50">
            <PrimeNestHeader isLogin={false} />
            <main className="flex-1 w-full flex flex-col">
                <PropertySearch />
            </main>
            <PrimeNestFooter />
        </div>
    );
}

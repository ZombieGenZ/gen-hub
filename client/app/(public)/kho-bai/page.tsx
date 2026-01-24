"use client";

import React, { Suspense } from 'react';
import { PrimeNestHeader } from '@/app/(public)/homepage/Header';
import { PrimeNestFooter } from '@/app/(public)/homepage/Footer';
import PropertySearch from '@/components/search/PropertySearch';
import './kho-bai.css';

export default function KhoBaiPage() {
    return (
        <div className="kho-bai-page">
            {/* Header - Sticky at top */}
            <PrimeNestHeader isLogin={false} />

            {/* Main Content Area - Contains List + Map layout */}
            <Suspense fallback={<div className="p-10 text-center">Đang tải...</div>}>
                <PropertySearch />
            </Suspense>

            {/* Footer - Appears naturally when scrolling past the list */}
            <PrimeNestFooter />
        </div>
    );
}

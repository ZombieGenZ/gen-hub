"use client";

import React, { Suspense } from 'react';
import { PrimeNestFooter } from '@/app/(public)/homepage/Footer';
import PropertySearch from '@/components/search/PropertySearch';
import './kho-bai.css';

export default function KhoBaiPage() {
    return (
        <div className="kho-bai-page">
            <Suspense fallback={<div className="p-10 text-center">Đang tải...</div>}>
                <PropertySearch />
            </Suspense>
            <PrimeNestFooter />
        </div>
    );
}

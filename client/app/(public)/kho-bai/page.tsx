"use client";

import React, { Suspense } from 'react';
import { PrimeNestHeader } from '@/app/(public)/homepage/Header';
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

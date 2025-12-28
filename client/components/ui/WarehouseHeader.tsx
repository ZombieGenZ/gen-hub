'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronDown, Box, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const navItems = [
    { name: 'Chủ sở hữu', href: '#' },
    { name: 'Cư dân', href: '#' },
    { name: 'Nhà đầu tư', href: '#' },
    { name: 'Tài nguyên', href: '#' },
    { name: 'Vị trí', href: '#' },
];

export const WarehouseHeader = () => {
    return (
        <header className="bg-bg py-4 px-6 lg:px-12 border-b border-border">
            <nav className="max-w-[1400px] mx-auto flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2">
                    <div className="bg-brand p-1.5 rounded-lg shadow-sm">
                        <Box className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-xl lg:text-2xl font-black tracking-tight text-text">
                        Gen<span className="text-brand">Hub</span>
                    </span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden xl:flex items-center gap-8">
                    {navItems.map((item) => (
                        <Link
                            key={item.name}
                            href={item.href}
                            className="group flex items-center gap-1 text-sm font-semibold text-text-muted hover:text-text transition-colors"
                        >
                            {item.name}
                            <ChevronDown className="h-4 w-4 text-text-muted/60 group-hover:text-text-muted" />
                        </Link>
                    ))}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="outline"
                        className="hidden md:flex items-center gap-2 rounded-pill border-brand text-brand hover:bg-brand-subtle font-bold px-6 h-11"
                    >
                        Đăng nhập
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                    <Button className="bg-brand hover:bg-brand-hover text-white rounded-pill font-bold px-6 h-11 shadow-md border-none">
                        Phân tích miễn phí
                    </Button>
                </div>
            </nav>
        </header>
    );
};

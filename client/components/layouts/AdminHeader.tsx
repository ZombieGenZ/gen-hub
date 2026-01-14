"use client";

import React from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Bars3Icon, BellIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { AdminSidebarNav } from "./AdminSidebar";

interface AdminHeaderProps {
    children?: React.ReactNode;
}

export function AdminHeader({ children }: AdminHeaderProps) {
    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
            <div className="flex items-center justify-between px-4 md:px-8 py-3 md:py-4 gap-4">
                {/* Mobile Menu & Search/Title Area */}
                <div className="flex items-center gap-4 flex-1">
                    <Sheet>
                        <SheetTrigger asChild>
                            <button className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg">
                                <Bars3Icon className="w-6 h-6" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-72">
                            <AdminSidebarNav />
                        </SheetContent>
                    </Sheet>

                    {/* Search Bar (Optional, can be added later) or Children (Breadcrumbs) */}
                    <div className="flex-1 max-w-xl">
                        {children || (
                            <div className="relative hidden md:block w-full max-w-sm">
                                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Tìm kiếm..."
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Actions */}
                <div className="flex items-center gap-2 md:gap-4">
                    <button className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-all">
                        <BellIcon className="w-5 h-5" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                </div>
            </div>
        </header>
    );
}

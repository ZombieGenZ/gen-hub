"use client";

import React from "react";

import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { DashboardSidebarNav } from "./DashboardSidebar";

interface DashboardHeaderProps {
    children?: React.ReactNode;
}

export function DashboardHeader({ children }: DashboardHeaderProps) {
    return (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
            <div className="flex flex-col md:flex-row items-center justify-between px-4 md:px-8 py-3 md:py-4 gap-4 md:gap-0">
                <div className="flex items-center gap-4 w-full md:w-auto md:flex-1">
                    <Sheet>
                        <SheetTrigger asChild>
                            <button className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-lg flex-shrink-0">
                                <Menu className="w-6 h-6" />
                            </button>
                        </SheetTrigger>
                        <SheetContent side="left" className="p-0 w-72">
                            <DashboardSidebarNav />
                        </SheetContent>
                    </Sheet>

                    <div className="flex-1 w-full">
                        {children}
                    </div>
                </div>

                <div className="flex items-center gap-2 md:gap-4 lg:gap-6 ml-0 md:ml-4 w-full md:w-auto justify-end">
                    <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
                        <i className="fas fa-bell text-lg"></i>
                        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                    <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 transition-colors">
                        <i className="fas fa-cog"></i>
                        <span className="text-sm font-medium hidden lg:inline whitespace-nowrap">Cài đặt</span>
                    </button>

                    <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

                    <div className="flex items-center gap-3 cursor-pointer group">
                        <div className="text-right hidden xl:block">
                            <p className="text-sm font-medium text-slate-900 leading-none">Admin User</p>
                            <p className="text-xs text-slate-500 mt-1">admin@example.com</p>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-primary-light flex items-center justify-center text-white text-xs font-bold shadow-md ring-2 ring-white group-hover:ring-primary/20 transition-all flex-shrink-0">
                            AD
                        </div>
                        <i className="fas fa-chevron-down text-xs text-slate-400 group-hover:text-primary transition-colors"></i>
                    </div>
                </div>
            </div>
        </header>
    );
}

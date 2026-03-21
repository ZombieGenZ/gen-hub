import React from "react";
import { Button } from "@/components/ui/button";
import { DocumentTextIcon, PlusIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";

interface ContractHeaderProps {
    setIsCreateModalOpen: (val: boolean) => void;
}

export function ContractHeader({ setIsCreateModalOpen }: ContractHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                    <DocumentTextIcon className="w-8 h-8 text-brand bg-brand-subtle p-1.5 rounded-lg" />
                    Quản lý Hợp đồng
                </h1>
                <p className="text-muted-foreground mt-1 text-sm">
                    Quản lý danh sách các hợp đồng thuê kho trong hệ thống.
                </p>
            </div>
            <div className="flex items-center gap-3">
                <Button variant="outline" className="bg-card shadow-sm">
                    <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
                    Xuất báo cáo
                </Button>
                <Button className="gap-2 rounded-xl" onClick={() => setIsCreateModalOpen(true)}>
                    <PlusIcon className="w-4 h-4" />
                    <span className="hidden sm:inline">Tạo hợp đồng</span>
                    <span className="sm:hidden">Tạo</span>
                </Button>
            </div>
        </div>
    );
}

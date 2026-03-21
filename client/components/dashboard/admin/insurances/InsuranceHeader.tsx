import React from "react";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "@heroicons/react/24/outline";

interface InsuranceHeaderProps {
    setIsCreateOpen: (val: boolean) => void;
    setTargetInsurance: (val: any) => void;
}

export function InsuranceHeader({ setIsCreateOpen, setTargetInsurance }: InsuranceHeaderProps) {
    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-[32px] leading-[130%] font-bold tracking-tight">
                    Bảo hiểm hàng hóa
                </h1>
                <p className="text-muted-foreground mt-1">
                    Quản lý các gói bảo hiểm và phí liên quan
                </p>
            </div>
            <Button
                onClick={() => {
                    setTargetInsurance(null);
                    setIsCreateOpen(true);
                }}
                className="gap-2 rounded-xl bg-[#0F766E] hover:bg-[#0F766E]/90 text-white transition-all duration-200 active:scale-[0.97] hover:shadow-md"
            >
                <PlusIcon className="w-4 h-4" />
                Thêm bảo hiểm
            </Button>
        </div>
    );
}

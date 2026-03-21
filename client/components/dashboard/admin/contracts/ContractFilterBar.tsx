import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    ChevronDownIcon,
    CheckIcon,
    XMarkIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

interface ContractFilterBarProps {
    mainTabs: { value: string; label: string }[];
    activeTab: string;
    handleMainTabChange: (tabValue: string) => void;
    extraStatuses: { value: string; label: string }[];
    extraFilter: string | null;
    handleExtraFilterChange: (status: string) => void;
    searchTerm: string;
    setSearchTerm: (val: string) => void;
    setPage: (val: number) => void;
    setExtraFilter: (val: string | null) => void;
}

export function ContractFilterBar({
    mainTabs,
    activeTab,
    handleMainTabChange,
    extraStatuses,
    extraFilter,
    handleExtraFilterChange,
    searchTerm,
    setSearchTerm,
    setPage,
    setExtraFilter,
}: ContractFilterBarProps) {
    return (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden mb-6">
            <div className="flex items-stretch border-b border-border">
                {/* Underline Tabs */}
                <div className="flex items-center overflow-x-auto no-scrollbar">
                    {mainTabs.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => handleMainTabChange(tab.value)}
                            className={cn(
                                "px-4 py-3 text-sm whitespace-nowrap transition-colors -mb-px border-b-2",
                                activeTab === tab.value && !extraFilter
                                    ? "border-primary text-primary font-semibold"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                            )}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Divider */}
                <div className="self-center w-px h-5 bg-border mx-1 shrink-0" />

                {/* Extra status filter */}
                <div className="flex items-center px-1">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn(
                                    "h-8 gap-1.5 text-xs",
                                    extraFilter
                                        ? "text-primary font-semibold bg-primary/10"
                                        : "text-muted-foreground font-medium"
                                )}
                            >
                                <FunnelIcon className="w-3.5 h-3.5 shrink-0" />
                                <span className="hidden sm:inline">
                                    {extraFilter
                                        ? extraStatuses.find((s) => s.value === extraFilter)?.label
                                        : "Trạng thái khác"}
                                </span>
                                <ChevronDownIcon className="w-3 h-3 shrink-0 opacity-60" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-52">
                            <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                                Lọc trạng thái nâng cao
                            </DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {extraStatuses.map((s) => (
                                <DropdownMenuItem
                                    key={s.value}
                                    className={cn(
                                        "cursor-pointer",
                                        extraFilter === s.value && "text-primary font-medium bg-primary/5"
                                    )}
                                    onClick={() => handleExtraFilterChange(s.value)}
                                >
                                    <span className="inline-flex items-center gap-2 w-full">
                                        <CheckIcon
                                            className={cn(
                                                "w-3.5 h-3.5 shrink-0",
                                                extraFilter === s.value ? "opacity-100 text-primary" : "opacity-0"
                                            )}
                                        />
                                        {s.label}
                                    </span>
                                </DropdownMenuItem>
                            ))}
                            {extraFilter && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-xs text-muted-foreground cursor-pointer"
                                        onClick={() => setExtraFilter(null)}
                                    >
                                        <span className="inline-flex items-center gap-1.5">
                                            <XMarkIcon className="w-3.5 h-3.5" />
                                            Xóa bộ lọc
                                        </span>
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Search */}
                <div className="flex items-center px-3 py-2 border-l border-border">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                        <Input
                            placeholder="Tìm mã HĐ, tên tổ chức..."
                            className="pl-8 h-9 w-56 text-sm border-slate-200 rounded-md bg-transparent focus-visible:ring-1 focus-visible:ring-primary/30"
                            value={searchTerm}
                            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

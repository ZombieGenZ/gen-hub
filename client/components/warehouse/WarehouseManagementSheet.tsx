"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { authStorage } from "@/services/auth/auth-storage.service";
import { InventoryService } from "@/services/inventory/inventory.service";
import { useDebounce } from "@/hooks/use-debounce";
import { useToast } from "@/contexts/ToastContext";

// Inbound Components
import { InboundHeader } from "@/components/dashboard/organization/inbound/InboundHeader";
import { InboundTable, ITEMS_PER_PAGE as INBOUND_PAGE } from "@/components/dashboard/organization/inbound/InboundTable";
import { InboundCancelDialog } from "@/components/dashboard/organization/inbound/InboundCancelDialog";
import { CreateInboundDialog } from "@/components/dashboard/organization/inbound/CreateInboundDialog";
import type { InboundRequest, ReceiptStatus } from "@/services/inventory/inventory.types";

// Outbound Components
import { OutboundHeader } from "@/components/dashboard/organization/outbound/OutboundHeader";
import { OutboundTable, ITEMS_PER_PAGE as OUTBOUND_PAGE } from "@/components/dashboard/organization/outbound/OutboundTable";
import { OutboundCancelDialog } from "@/components/dashboard/organization/outbound/OutboundCancelDialog";
import { CreateOutboundDialog } from "@/components/dashboard/organization/outbound/CreateOutboundDialog";
import type { OutboundRequest, ExportStatus } from "@/services/inventory/inventory.types";

const inventoryService = new InventoryService();

interface WarehouseManagementSheetProps {
    type: "inbound" | "outbound";
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export const WarehouseManagementSheet = ({
    type,
    open,
    onOpenChange,
}: WarehouseManagementSheetProps) => {
    const router = useRouter();
    const { showToast } = useToast();

    // ── Common state ──
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const debouncedKeywords = useDebounce(searchTerm, 500);

    // ── Inbound specific ──
    const [inboundItems, setInboundItems] = useState<InboundRequest[]>([]);
    const [inboundTab, setInboundTab] = useState<ReceiptStatus | "ALL">("ALL");
    const [inboundCancelOpen, setInboundCancelOpen] = useState(false);
    const [inboundCancelTarget, setInboundCancelTarget] = useState<InboundRequest | null>(null);
    const [inboundCreateOpen, setInboundCreateOpen] = useState(false);

    // ── Outbound specific ──
    const [outboundItems, setOutboundItems] = useState<OutboundRequest[]>([]);
    const [outboundTab, setOutboundTab] = useState<ExportStatus | "ALL">("ALL");
    const [outboundCancelOpen, setOutboundCancelOpen] = useState(false);
    const [outboundCancelTarget, setOutboundCancelTarget] = useState<OutboundRequest | null>(null);
    const [outboundCreateOpen, setOutboundCreateOpen] = useState(false);

    const [isProcessing, setIsProcessing] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    // ── Fetch Inbound ──
    const fetchInbound = useCallback(async () => {
        if (!open || type !== "inbound") return;
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            setLoading(true);
            const res = await inventoryService.listInbound(token, {
                limit: INBOUND_PAGE,
                offset: (currentPage - 1) * INBOUND_PAGE,
                keywords: debouncedKeywords || undefined,
                status: inboundTab === "ALL" ? undefined : inboundTab,
            });

            if (res?.data) {
                setInboundItems(res.data.items || []);
                setTotalItems(res.data.total || (res.data.items?.length || 0));
            }
        } catch (err) {
            setError("Lỗi khi tải phiếu nhập.");
        } finally {
            setLoading(false);
        }
    }, [open, type, debouncedKeywords, inboundTab, currentPage]);

    // ── Fetch Outbound ──
    const fetchOutbound = useCallback(async () => {
        if (!open || type !== "outbound") return;
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;

            setLoading(true);
            const res = await inventoryService.listOutbound(token, {
                limit: OUTBOUND_PAGE,
                offset: (currentPage - 1) * OUTBOUND_PAGE,
                keywords: debouncedKeywords || undefined,
                status: outboundTab === "ALL" ? undefined : outboundTab,
            });

            if (res?.data) {
                setOutboundItems(res.data.items || []);
                setTotalItems(res.data.total || (res.data.items?.length || 0));
            }
        } catch (err) {
            setError("Lỗi khi tải phiếu xuất.");
        } finally {
            setLoading(false);
        }
    }, [open, type, debouncedKeywords, outboundTab, currentPage]);

    useEffect(() => {
        if (type === "inbound") fetchInbound();
        else fetchOutbound();
    }, [type, fetchInbound, fetchOutbound]);

    // ── Handlers ──
    const handleInboundCancel = async () => {
        if (!inboundCancelTarget) return;
        setIsProcessing(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await inventoryService.cancelInbound(token, inboundCancelTarget.id, "Hủy qua 3D Panel");
            showToast(`Đã hủy phiếu ${inboundCancelTarget.code}`, "success");
            setInboundCancelOpen(false);
            fetchInbound();
        } catch (err) {
            showToast("Hủy thất bại", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleOutboundCancel = async () => {
        if (!outboundCancelTarget) return;
        setIsProcessing(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            await inventoryService.cancelOutbound(token, outboundCancelTarget.id, "Hủy qua 3D Panel");
            showToast(`Đã hủy phiếu ${outboundCancelTarget.code}`, "success");
            setOutboundCancelOpen(false);
            fetchOutbound();
        } catch (err) {
            showToast("Hủy thất bại", "error");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent 
                    side="right" 
                    className="w-full sm:max-w-[85vw] backdrop-blur-xl bg-background/90 border-l border-white/10 shadow-2xl p-0"
                >
                    <div className="h-full flex flex-col">
                        <SheetHeader className="p-6 border-b bg-muted/20">
                            <SheetTitle className="text-2xl font-bold flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${type === 'inbound' ? 'bg-[#0F766E]/10' : 'bg-[#C2410C]/10'}`}>
                                    {type === 'inbound' ? (
                                        <div className="w-5 h-5 bg-[#0F766E] rounded-md" />
                                    ) : (
                                        <div className="w-5 h-5 bg-[#C2410C] rounded-md" />
                                    )}
                                </div>
                                Quản lý {type === 'inbound' ? 'Phiếu Nhập Kho' : 'Phiếu Xuất Kho'}
                            </SheetTitle>
                        </SheetHeader>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6">
                            {type === "inbound" ? (
                                <>
                                    <InboundHeader
                                        totalItems={totalItems}
                                        searchTerm={searchTerm}
                                        onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
                                        activeTab={inboundTab}
                                        onTabChange={(t) => { setInboundTab(t); setCurrentPage(1); }}
                                        onCreateClick={() => setInboundCreateOpen(true)}
                                        onExportClick={() => {}}
                                        isExporting={false}
                                    />
                                    <InboundTable
                                        items={inboundItems}
                                        loading={loading}
                                        error={error}
                                        searchTerm={searchTerm}
                                        currentPage={currentPage}
                                        totalPages={Math.ceil(totalItems / INBOUND_PAGE)}
                                        totalItems={totalItems}
                                        onCreateClick={() => setInboundCreateOpen(true)}
                                        onCancelClick={(item) => { setInboundCancelTarget(item); setInboundCancelOpen(true); }}
                                        onPageChange={setCurrentPage}
                                    />
                                </>
                            ) : (
                                <>
                                    <OutboundHeader
                                        totalItems={totalItems}
                                        searchTerm={searchTerm}
                                        onSearchChange={(v) => { setSearchTerm(v); setCurrentPage(1); }}
                                        activeTab={outboundTab}
                                        onTabChange={(t) => { setOutboundTab(t); setCurrentPage(1); }}
                                        onCreateClick={() => setOutboundCreateOpen(true)}
                                        onExportClick={() => {}}
                                        isExporting={false}
                                    />
                                    <OutboundTable
                                        items={outboundItems}
                                        loading={loading}
                                        error={error}
                                        searchTerm={searchTerm}
                                        currentPage={currentPage}
                                        totalPages={Math.ceil(totalItems / OUTBOUND_PAGE)}
                                        totalItems={totalItems}
                                        onPageChange={setCurrentPage}
                                        onCreateClick={() => setOutboundCreateOpen(true)}
                                        onCancelClick={(item) => { setOutboundCancelTarget(item); setOutboundCancelOpen(true); }}
                                    />
                                </>
                            )}
                        </div>
                    </div>
                </SheetContent>
            </Sheet>

            {/* Dialogs for Inbound */}
            {type === 'inbound' && (
                <>
                    <InboundCancelDialog
                        open={inboundCancelOpen}
                        onOpenChange={setInboundCancelOpen}
                        cancelTarget={inboundCancelTarget}
                        isCancelling={isProcessing}
                        onConfirm={handleInboundCancel}
                    />
                    <CreateInboundDialog
                        open={inboundCreateOpen}
                        onOpenChange={setInboundCreateOpen}
                        onSuccess={fetchInbound}
                    />
                </>
            )}

            {/* Dialogs for Outbound */}
            {type === 'outbound' && (
                <>
                    <OutboundCancelDialog
                        open={outboundCancelOpen}
                        onOpenChange={setOutboundCancelOpen}
                        cancelTarget={outboundCancelTarget}
                        isCancelling={isProcessing}
                        onConfirm={handleOutboundCancel}
                    />
                    <CreateOutboundDialog
                        open={outboundCreateOpen}
                        onOpenChange={setOutboundCreateOpen}
                        onSuccess={fetchOutbound}
                    />
                </>
            )}
        </>
    );
};

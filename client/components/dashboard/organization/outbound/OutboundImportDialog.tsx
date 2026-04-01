"use client";

import React, { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CloudArrowUpIcon, DocumentTextIcon, XMarkIcon, CheckCircleIcon, ExclamationCircleIcon, ArrowDownTrayIcon } from "@heroicons/react/24/outline";
import { useToast } from "@/contexts/ToastContext";
import { InventoryService } from "@/services/inventory/inventory.service";
import { authStorage } from "@/services/auth/auth-storage.service";

interface OutboundImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

const inventoryService = new InventoryService();

export function OutboundImportDialog({ open, onOpenChange, onSuccess }: OutboundImportDialogProps) {
    const { showToast } = useToast();
    const [file, setFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ successCount: number; errors: string[] } | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (!selectedFile.name.endsWith(".xlsx") && !selectedFile.name.endsWith(".xls")) {
                showToast("Vui lòng chọn file Excel (.xlsx hoặc .xls)", "error");
                return;
            }
            setFile(selectedFile);
            setImportResult(null);
        }
    };

    const handleImport = async () => {
        if (!file) return;

        setIsImporting(true);
        try {
            const token = authStorage.getAccessToken();
            if (!token) throw new Error("Unauthorized");

            const res = await inventoryService.importOutbound(token, file);
            if (res.success) {
                setImportResult(res.data);
                if (res.data.successCount > 0) {
                    showToast(`Đã nhập thành công ${res.data.successCount} phiếu xuất kho!`, "success");
                    onSuccess();
                } else {
                    showToast("Không có phiếu nào được nhập thành công. Vui lòng kiểm tra lại file.", "warning");
                }
            } else {
                throw new Error(res.message || "Lỗi khi nhập file");
            }
        } catch (error: any) {
            showToast(error.message || "Nhập file thất bại", "error");
        } finally {
            setIsImporting(false);
        }
    };

    const handleDownloadTemplate = async () => {
        try {
            const token = authStorage.getAccessToken();
            if (!token) return;
            
            const blob = await inventoryService.getOutboundTemplate(token);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `mau-xuat-kho-import.xlsx`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            showToast("Không thể tải file mẫu", "error");
        }
    };

    const handleClose = () => {
        if (isImporting) return;
        setFile(null);
        setImportResult(null);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] rounded-[24px] p-6">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                        <CloudArrowUpIcon className="w-6 h-6 text-[#0F766E]" />
                        Nhập phiếu xuất kho từ Excel
                    </DialogTitle>
                    <DialogDescription className="text-slate-500 pt-2">
                        Tải lên file Excel (.xlsx) chứa danh sách các phiếu xuất kho và chi tiết sản phẩm.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6">
                    {!file && !importResult && (
                        <div 
                            className="border-2 border-dashed border-slate-200 rounded-[24px] p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative group"
                        >
                            <input
                                type="file"
                                className="absolute inset-0 opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                                accept=".xlsx, .xls"
                            />
                            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                                <DocumentTextIcon className="w-6 h-6 text-[#0F766E]" />
                            </div>
                            <p className="text-sm font-medium text-slate-700">Kéo thả hoặc nhấp để chọn file</p>
                            <p className="text-xs text-slate-400 mt-1">Hỗ trợ .xlsx, .xls (Tối đa 10MB)</p>
                        </div>
                    )}

                    {file && !importResult && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-[16px] p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-[12px] bg-white flex items-center justify-center shadow-sm">
                                    <DocumentTextIcon className="w-5 h-5 text-[#0F766E]" />
                                </div>
                                <div className="overflow-hidden">
                                    <p className="text-sm font-medium text-slate-900 truncate max-w-[250px]">{file.name}</p>
                                    <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="rounded-full hover:bg-white"
                                onClick={() => setFile(null)}
                                disabled={isImporting}
                            >
                                <XMarkIcon className="w-4 h-4 text-slate-400" />
                            </Button>
                        </div>
                    )}

                    {importResult && (
                        <div className="space-y-4">
                            <div className={`p-4 rounded-[16px] flex items-start gap-3 ${importResult.errors.length > 0 ? "bg-amber-50 border border-amber-100" : "bg-emerald-50 border border-emerald-100"}`}>
                                {importResult.errors.length > 0 ? (
                                    <ExclamationCircleIcon className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                                ) : (
                                    <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                                )}
                                <div>
                                    <p className="text-sm font-medium text-slate-900">
                                        Kết quả: Nhập thành công {importResult.successCount} phiếu
                                    </p>
                                    {importResult.errors.length > 0 && (
                                        <p className="text-xs text-amber-700 mt-1">
                                            Có {importResult.errors.length} dòng gặp lỗi không thể nhập.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {importResult.errors.length > 0 && (
                                <div className="max-h-[200px] overflow-y-auto rounded-[16px] border border-slate-100 bg-slate-50 p-3">
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-1">Chi tiết lỗi</p>
                                    <ul className="space-y-2">
                                        {importResult.errors.map((error, idx) => (
                                            <li key={idx} className="text-xs text-red-500 flex items-start gap-1.5 px-1 bg-white p-2 rounded-lg border border-red-50 shadow-sm">
                                                <span className="shrink-0 text-red-300">•</span>
                                                <span>{error}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {!importResult && (
                        <div className="mt-4 flex justify-center">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleDownloadTemplate}
                                className="text-sm text-[#0F766E] hover:underline flex items-center gap-2 font-medium bg-[#0F766E]/5 px-4 py-2 rounded-full transition-colors hover:bg-[#0F766E]/10"
                            >
                                <ArrowDownTrayIcon className="w-4 h-4" />
                                Tải file mẫu xuất kho (.xlsx)
                            </Button>
                        </div>
                    )}
                </div>

                <DialogFooter className="gap-3 sm:gap-0">
                    <Button variant="outline" className="rounded-[12px] flex-1 sm:flex-none border-slate-200" onClick={handleClose} disabled={isImporting}>
                        Hủy bỏ
                    </Button>
                    {!importResult ? (
                        <Button 
                            className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-[12px] flex-1 sm:flex-none"
                            onClick={handleImport}
                            disabled={!file || isImporting}
                        >
                            {isImporting ? "Đang xử lý..." : "Bắt đầu nhập"}
                        </Button>
                    ) : (
                        <Button 
                            className="bg-[#0F766E] hover:bg-[#0D6B63] text-white rounded-[12px] flex-1 sm:flex-none"
                            onClick={handleClose}
                        >
                            Đóng
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

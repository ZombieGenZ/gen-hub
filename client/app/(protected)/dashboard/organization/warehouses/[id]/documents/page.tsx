"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
    ShieldCheckIcon,
    DocumentArrowUpIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    ClockIcon,
    ArrowPathIcon,
    TrashIcon,
    EyeIcon,
} from "@heroicons/react/24/outline";
import { TrustBadge } from "@/components/marketplace/TrustBadge";
import { warehouseTrustService } from "@/services/warehouse-trust/warehouse-trust.service";
import type {
    LegalDocument,
    TrustProfile,
    WarehouseLegalDocType,
} from "@/services/warehouse-trust/warehouse-trust.types";
import { DOC_TYPE_LABELS } from "@/services/warehouse-trust/warehouse-trust.types";

const DOC_TYPES: WarehouseLegalDocType[] = [
    "BUSINESS_LICENSE",
    "WAREHOUSE_CERTIFICATE",
    "FIRE_SAFETY_CERTIFICATE",
    "LAND_USE_RIGHT",
    "FOOD_SAFETY_CERTIFICATE",
    "OTHER",
];

const REVIEW_STATUS_CONFIG = {
    PENDING: { label: "Chờ duyệt", icon: ClockIcon, color: "text-gray-500 bg-gray-100" },
    APPROVED: { label: "Đã duyệt", icon: CheckCircleIcon, color: "text-green-700 bg-green-100" },
    REJECTED: { label: "Từ chối", icon: XCircleIcon, color: "text-red-700 bg-red-100" },
    NEEDS_RESUBMIT: { label: "Cần bổ sung", icon: ExclamationTriangleIcon, color: "text-amber-700 bg-amber-100" },
};

export default function WarehouseDocumentsPage() {
    const params = useParams<{ id: string }>();
    const warehouseId = params.id;

    const [documents, setDocuments] = useState<LegalDocument[]>([]);
    const [trustProfile, setTrustProfile] = useState<TrustProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedType, setSelectedType] = useState<WarehouseLegalDocType>("BUSINESS_LICENSE");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const refresh = useCallback(async () => {
        setIsLoading(true);
        try {
            const [docs, profile] = await Promise.allSettled([
                warehouseTrustService.getDocuments(warehouseId),
                warehouseTrustService.getTrustProfile(warehouseId),
            ]);
            if (docs.status === "fulfilled") setDocuments(docs.value);
            if (profile.status === "fulfilled") setTrustProfile(profile.value);
        } finally {
            setIsLoading(false);
        }
    }, [warehouseId]);

    useEffect(() => {
        void refresh();
    }, [refresh]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            await warehouseTrustService.uploadDocument(warehouseId, selectedType, file);
            void refresh();
        } catch {
            alert("Upload thất bại. Vui lòng thử lại.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    const handleDelete = async (docId: string) => {
        if (!confirm("Xóa tài liệu này?")) return;
        await warehouseTrustService.deleteDocument(docId);
        void refresh();
    };

    const handleView = async (docId: string) => {
        try {
            const url = await warehouseTrustService.getSignedUrl(docId);
            window.open(url, "_blank");
        } catch {
            alert("Không thể mở file.");
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ShieldCheckIcon className="h-7 w-7 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Tài liệu pháp lý</h1>
                        <p className="text-sm text-gray-500">
                            Upload tài liệu để nhận Trust Badge trên marketplace
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => void refresh()}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                >
                    <ArrowPathIcon className="h-4 w-4" />
                    Làm mới
                </button>
            </div>

            {/* Trust Profile card */}
            <div className="border border-gray-200 rounded-xl bg-white p-5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Trạng thái xác minh</p>
                        {trustProfile ? (
                            <div className="space-y-2">
                                <TrustBadge
                                    level={trustProfile.badge_level}
                                    size="md"
                                    showLabel
                                />
                                <p className="text-sm text-gray-500">
                                    Điểm uy tín:{" "}
                                    <span className="font-semibold text-gray-900">{trustProfile.trust_score}/55</span>
                                </p>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-600">Chưa có dữ liệu xác minh</p>
                        )}
                    </div>
                    <div className="text-right text-xs text-gray-600">
                        <p className="font-medium text-gray-700 mb-1">Cần đạt để lên badge</p>
                        <p>• VERIFIED: ≥1 tài liệu được duyệt</p>
                        <p>• PREMIUM: ≥1 tài liệu + điểm ≥45</p>
                    </div>
                </div>
            </div>

            {/* Upload section */}
            <div className="border border-dashed border-blue-300 rounded-xl bg-blue-50/50 p-5">
                <p className="text-sm font-medium text-gray-700 mb-3">Upload tài liệu mới</p>
                <div className="flex items-center gap-3 flex-wrap">
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as WarehouseLegalDocType)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {DOC_TYPES.map((t) => (
                            <option key={t} value={t}>
                                {DOC_TYPE_LABELS[t]}
                            </option>
                        ))}
                    </select>

                    <label className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium cursor-pointer transition-colors ${
                        uploading
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}>
                        <DocumentArrowUpIcon className="h-4 w-4" />
                        {uploading ? "Đang upload..." : "Chọn file"}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            onChange={handleUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                    </label>
                    <p className="text-xs text-gray-500">Hỗ trợ: JPG, PNG, WEBP, PDF (max 10MB)</p>
                </div>
            </div>

            {/* Document list */}
            {isLoading ? (
                <div className="text-center py-12 text-gray-600">Đang tải...</div>
            ) : documents.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                    <ShieldCheckIcon className="h-12 w-12 mx-auto mb-2 opacity-40" />
                    <p className="text-gray-500">Chưa có tài liệu nào. Hãy upload tài liệu pháp lý để xác minh kho.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {documents.map((doc) => {
                        const reviewConfig = REVIEW_STATUS_CONFIG[doc.review_status];
                        const ReviewIcon = reviewConfig.icon;

                        return (
                            <div
                                key={doc.id}
                                className="border border-gray-200 rounded-xl bg-white p-4 flex items-start justify-between gap-4"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="font-medium text-sm text-gray-900">
                                            {DOC_TYPE_LABELS[doc.document_type]}
                                        </p>
                                        <span
                                            className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${reviewConfig.color}`}
                                        >
                                            <ReviewIcon className="h-3 w-3" />
                                            {reviewConfig.label}
                                        </span>
                                    </div>
                                    <p className="text-xs text-gray-600 truncate">{doc.file_name}</p>

                                    {/* AI Analysis summary */}
                                    {doc.ai_status === "DONE" && doc.ai_extracted_data && (
                                        <p className="text-xs text-gray-600 mt-1 line-clamp-1">
                                            AI: {doc.ai_extracted_data.summary}
                                        </p>
                                    )}
                                    {doc.ai_status === "PROCESSING" && (
                                        <p className="text-xs text-blue-500 mt-1">Đang phân tích bằng AI...</p>
                                    )}
                                    {doc.ai_status === "FAILED" && (
                                        <p className="text-xs text-red-500 mt-1">AI phân tích thất bại</p>
                                    )}

                                    {/* Review note */}
                                    {doc.review_note && (
                                        <p className="text-xs text-amber-700 mt-1 bg-amber-50 rounded px-2 py-1">
                                            Ghi chú Admin: {doc.review_note}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                    <button
                                        onClick={() => void handleView(doc.id)}
                                        className="p-1.5 rounded-lg text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                        title="Xem file"
                                    >
                                        <EyeIcon className="h-4 w-4" />
                                    </button>
                                    {doc.review_status !== "APPROVED" && (
                                        <button
                                            onClick={() => void handleDelete(doc.id)}
                                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Xóa"
                                        >
                                            <TrashIcon className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

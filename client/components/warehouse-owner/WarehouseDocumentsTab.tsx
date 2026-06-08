"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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

const AI_STATUS_CONFIG = {
    PENDING: { label: "Chờ phân tích", color: "text-gray-400" },
    PROCESSING: { label: "Đang phân tích AI...", color: "text-blue-500" },
    DONE: { label: null, color: "" },
    FAILED: { label: "AI phân tích thất bại", color: "text-red-500" },
};

interface Props {
    warehouseId: string;
}

export function WarehouseDocumentsTab({ warehouseId }: Props) {
    const [documents, setDocuments] = useState<LegalDocument[]>([]);
    const [trustProfile, setTrustProfile] = useState<TrustProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedType, setSelectedType] = useState<WarehouseLegalDocType>("BUSINESS_LICENSE");
    const [uploadError, setUploadError] = useState<string | null>(null);
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

    useEffect(() => { void refresh(); }, [refresh]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploadError(null);
        setUploading(true);
        try {
            await warehouseTrustService.uploadDocument(warehouseId, selectedType, file);
            void refresh();
        } catch {
            setUploadError("Upload thất bại. Kiểm tra định dạng file và thử lại.");
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
        <div className="space-y-5 pt-4">

            {/* ── Trust profile card ── */}
            <div className="border border-gray-200 rounded-xl bg-white p-5 flex items-start justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Trạng thái xác minh</p>
                    {trustProfile ? (
                        <div className="space-y-1.5">
                            <TrustBadge level={trustProfile.badge_level} size="md" showLabel />
                            <p className="text-sm text-gray-500">
                                Điểm uy tín:{" "}
                                <span className="font-semibold text-slate-900">{trustProfile.trust_score}/55</span>
                            </p>
                            {trustProfile.score_breakdown && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                    {Object.entries(trustProfile.score_breakdown as Record<string, number>).map(([k, v]) => (
                                        <span
                                            key={k}
                                            className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                                v > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"
                                            }`}
                                        >
                                            {SCORE_LABELS[k] ?? k}: {v} điểm
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">Chưa có dữ liệu xác minh</p>
                    )}
                </div>
                <div className="text-right text-xs text-gray-500 shrink-0 space-y-0.5">
                    <p className="font-semibold text-slate-700 mb-1.5">Điều kiện đạt badge</p>
                    <p>• <span className="text-blue-600 font-medium">VERIFIED</span>: ≥1 tài liệu được duyệt</p>
                    <p>• <span className="text-amber-600 font-medium">PREMIUM</span>: ≥1 tài liệu + điểm ≥45</p>
                </div>
            </div>

            {/* ── Upload section ── */}
            <div className="border border-dashed border-blue-300 rounded-xl bg-blue-50/40 p-4 space-y-3">
                <p className="text-sm font-semibold text-slate-700">Upload tài liệu mới</p>
                <div className="flex items-center gap-3 flex-wrap">
                    <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value as WarehouseLegalDocType)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        {DOC_TYPES.map((t) => (
                            <option key={t} value={t}>{DOC_TYPE_LABELS[t]}</option>
                        ))}
                    </select>

                    <label className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium cursor-pointer transition-colors ${
                        uploading
                            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                    }`}>
                        <DocumentArrowUpIcon className="h-4 w-4" />
                        {uploading ? "Đang upload..." : "Chọn file & Upload"}
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".jpg,.jpeg,.png,.webp,.pdf"
                            onChange={handleUpload}
                            disabled={uploading}
                            className="hidden"
                        />
                    </label>

                    <button
                        onClick={() => void refresh()}
                        className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors text-gray-500"
                        title="Làm mới danh sách"
                    >
                        <ArrowPathIcon className="h-4 w-4" />
                    </button>
                </div>
                <p className="text-xs text-gray-500">Hỗ trợ: JPG, PNG, WEBP, PDF (tối đa 10MB)</p>
                {uploadError && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{uploadError}</p>
                )}
            </div>

            {/* ── Document list ── */}
            {isLoading ? (
                <div className="text-center py-10 text-gray-500 text-sm">Đang tải...</div>
            ) : documents.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-gray-200 rounded-xl">
                    <ShieldCheckIcon className="h-11 w-11 mx-auto mb-2 text-gray-300" />
                    <p className="text-gray-500 text-sm font-medium">Chưa có tài liệu pháp lý</p>
                    <p className="text-gray-400 text-xs mt-1">Upload tài liệu để xác minh kho và nhận Trust Badge</p>
                </div>
            ) : (
                <div className="space-y-3">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {documents.length} tài liệu
                    </p>
                    {documents.map((doc) => {
                        const reviewCfg = REVIEW_STATUS_CONFIG[doc.review_status];
                        const ReviewIcon = reviewCfg.icon;
                        const aiCfg = AI_STATUS_CONFIG[doc.ai_status];

                        return (
                            <div
                                key={doc.id}
                                className="border border-gray-200 rounded-xl bg-white p-4 flex items-start justify-between gap-4"
                            >
                                <div className="flex-1 min-w-0 space-y-1">
                                    {/* Top row: type + review status */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-semibold text-sm text-slate-900">
                                            {DOC_TYPE_LABELS[doc.document_type]}
                                        </p>
                                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${reviewCfg.color}`}>
                                            <ReviewIcon className="h-3 w-3" />
                                            {reviewCfg.label}
                                        </span>
                                        {doc.ai_confidence !== null && doc.ai_confidence !== undefined && (
                                            <span className="text-[10px] text-gray-400">
                                                AI: {Math.round(doc.ai_confidence * 100)}%
                                            </span>
                                        )}
                                    </div>

                                    {/* File name */}
                                    <p className="text-xs text-gray-500 truncate">{doc.file_name}</p>

                                    {/* AI summary */}
                                    {doc.ai_status === "DONE" && doc.ai_extracted_data?.summary && (
                                        <p className="text-xs text-gray-600 italic line-clamp-1">
                                            {doc.ai_extracted_data.summary}
                                        </p>
                                    )}
                                    {aiCfg.label && (
                                        <p className={`text-xs ${aiCfg.color}`}>{aiCfg.label}</p>
                                    )}

                                    {/* AI extracted fields */}
                                    {doc.ai_status === "DONE" && doc.ai_extracted_data && (
                                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[10px] text-gray-500">
                                            {doc.ai_extracted_data.issuer && (
                                                <span>Cơ quan: {doc.ai_extracted_data.issuer.slice(0, 50)}</span>
                                            )}
                                            {doc.ai_extracted_data.license_number && (
                                                <span>Số: {doc.ai_extracted_data.license_number}</span>
                                            )}
                                            {doc.ai_extracted_data.issue_date && (
                                                <span>Cấp: {doc.ai_extracted_data.issue_date}</span>
                                            )}
                                            {doc.ai_extracted_data.expiry_date && (
                                                <span className={doc.ai_extracted_data.is_expired ? "text-red-500 font-medium" : ""}>
                                                    Hết hạn: {doc.ai_extracted_data.expiry_date}
                                                    {doc.ai_extracted_data.is_expired ? " ⚠️" : ""}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    {/* AI issues */}
                                    {doc.ai_issues.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {doc.ai_issues.slice(0, 2).map((issue, i) => (
                                                <span key={i} className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded">
                                                    {issue}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    {/* Admin review note */}
                                    {doc.review_note && (
                                        <p className="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1">
                                            <span className="font-medium">Ghi chú Admin:</span> {doc.review_note}
                                        </p>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button
                                        onClick={() => void handleView(doc.id)}
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                        title="Xem file"
                                    >
                                        <EyeIcon className="h-4 w-4" />
                                    </button>
                                    {doc.review_status !== "APPROVED" && (
                                        <button
                                            onClick={() => void handleDelete(doc.id)}
                                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            title="Xóa tài liệu"
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

const SCORE_LABELS: Record<string, string> = {
    legal_docs: "Tài liệu pháp lý",
    has_contracts: "Có hợp đồng",
    contract_success: "Tỉ lệ thành công",
    tenure: "Thâm niên",
};

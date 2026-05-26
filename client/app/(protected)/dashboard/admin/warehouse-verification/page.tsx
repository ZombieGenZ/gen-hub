"use client";

import { useState, useEffect, useCallback } from "react";
import {
    ShieldCheckIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    EyeIcon,
} from "@heroicons/react/24/outline";
import { warehouseTrustService } from "@/services/warehouse-trust/warehouse-trust.service";
import type { LegalDocument, DocReviewStatus } from "@/services/warehouse-trust/warehouse-trust.types";
import { DOC_TYPE_LABELS } from "@/services/warehouse-trust/warehouse-trust.types";

const STATUS_TABS: { label: string; value: DocReviewStatus | "ALL" }[] = [
    { label: "Chờ duyệt", value: "PENDING" },
    { label: "Đã duyệt", value: "APPROVED" },
    { label: "Từ chối", value: "REJECTED" },
    { label: "Cần bổ sung", value: "NEEDS_RESUBMIT" },
];

const AI_STATUS_COLORS: Record<string, string> = {
    PENDING: "bg-gray-100 text-gray-600",
    PROCESSING: "bg-blue-100 text-blue-700",
    DONE: "bg-green-100 text-green-700",
    FAILED: "bg-red-100 text-red-700",
};

export default function WarehouseVerificationPage() {
    const [activeTab, setActiveTab] = useState<DocReviewStatus | "ALL">("PENDING");
    const [documents, setDocuments] = useState<LegalDocument[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<LegalDocument | null>(null);
    const [reviewNote, setReviewNote] = useState("");
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [isReviewing, setIsReviewing] = useState(false);

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await warehouseTrustService.listPendingDocuments(
                activeTab === "ALL" ? undefined : activeTab,
            );
            setDocuments(data);
        } catch {
            // silent
        } finally {
            setIsLoading(false);
        }
    }, [activeTab]);

    useEffect(() => {
        void fetchDocuments();
    }, [fetchDocuments]);

    const handleViewDoc = async (doc: LegalDocument) => {
        setSelectedDoc(doc);
        setReviewNote("");
        setSignedUrl(null);
        try {
            const url = await warehouseTrustService.getSignedUrl(doc.id);
            setSignedUrl(url);
        } catch {
            // silent
        }
    };

    const handleReview = async (status: "APPROVED" | "REJECTED" | "NEEDS_RESUBMIT") => {
        if (!selectedDoc) return;
        setIsReviewing(true);
        try {
            await warehouseTrustService.reviewDocument(selectedDoc.id, status, reviewNote || undefined);
            setSelectedDoc(null);
            void fetchDocuments();
        } catch {
            // silent
        } finally {
            setIsReviewing(false);
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ShieldCheckIcon className="h-7 w-7 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Xác minh kho bãi</h1>
                        <p className="text-sm text-gray-500">Duyệt tài liệu pháp lý & cấp Trust Badge</p>
                    </div>
                </div>
                <button
                    onClick={() => void fetchDocuments()}
                    className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                >
                    <ArrowPathIcon className="h-4 w-4" />
                    Làm mới
                </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-0">
                    {STATUS_TABS.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => setActiveTab(tab.value)}
                            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                activeTab === tab.value
                                    ? "border-blue-600 text-blue-600"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Document list */}
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="text-center py-12 text-gray-400">Đang tải...</div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 opacity-40" />
                            <p>Không có tài liệu nào</p>
                        </div>
                    ) : (
                        documents.map((doc) => (
                            <div
                                key={doc.id}
                                onClick={() => void handleViewDoc(doc)}
                                className={`border rounded-xl p-4 cursor-pointer transition-all hover:border-blue-300 hover:shadow-sm ${
                                    selectedDoc?.id === doc.id
                                        ? "border-blue-500 bg-blue-50"
                                        : "border-gray-200 bg-white"
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-sm text-gray-900 truncate">
                                            {doc.warehouse_template?.name ?? "Kho không tên"}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(doc.created_at).toLocaleDateString("vi-VN")}
                                        </p>
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                                AI_STATUS_COLORS[doc.ai_status] ?? AI_STATUS_COLORS.PENDING
                                            }`}
                                        >
                                            AI: {doc.ai_status}
                                        </span>
                                        {doc.ai_confidence != null && (
                                            <span className="text-xs text-gray-400">
                                                {Math.round(doc.ai_confidence * 100)}% tin cậy
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Detail panel */}
                {selectedDoc ? (
                    <div className="border border-gray-200 rounded-xl bg-white p-5 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-gray-900">Chi tiết tài liệu</h2>
                            <button
                                onClick={() => setSelectedDoc(null)}
                                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
                            >
                                ×
                            </button>
                        </div>

                        {/* File preview link */}
                        {signedUrl && (
                            <a
                                href={signedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-blue-600 hover:underline text-sm"
                            >
                                <EyeIcon className="h-4 w-4" />
                                Xem file tài liệu ({selectedDoc.file_name})
                            </a>
                        )}

                        {/* AI Analysis */}
                        {selectedDoc.ai_extracted_data && (
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                                    Kết quả phân tích AI
                                </p>
                                <p className="text-sm text-gray-800">
                                    {selectedDoc.ai_extracted_data.summary}
                                </p>
                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-2">
                                    {selectedDoc.ai_extracted_data.issuer && (
                                        <div>
                                            <span className="font-medium">Cơ quan cấp:</span>{" "}
                                            {selectedDoc.ai_extracted_data.issuer}
                                        </div>
                                    )}
                                    {selectedDoc.ai_extracted_data.license_number && (
                                        <div>
                                            <span className="font-medium">Số GP:</span>{" "}
                                            {selectedDoc.ai_extracted_data.license_number}
                                        </div>
                                    )}
                                    {selectedDoc.ai_extracted_data.issue_date && (
                                        <div>
                                            <span className="font-medium">Ngày cấp:</span>{" "}
                                            {selectedDoc.ai_extracted_data.issue_date}
                                        </div>
                                    )}
                                    {selectedDoc.ai_extracted_data.expiry_date && (
                                        <div>
                                            <span className={`font-medium ${selectedDoc.ai_extracted_data.is_expired ? "text-red-600" : ""}`}>
                                                Hết hạn:
                                            </span>{" "}
                                            <span className={selectedDoc.ai_extracted_data.is_expired ? "text-red-600 font-medium" : ""}>
                                                {selectedDoc.ai_extracted_data.expiry_date}
                                                {selectedDoc.ai_extracted_data.is_expired && " (ĐÃ HẾT HẠN)"}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                {selectedDoc.ai_extracted_data.issues.length > 0 && (
                                    <div className="mt-2">
                                        <p className="text-xs font-medium text-amber-700 mb-1">Vấn đề phát hiện:</p>
                                        <ul className="space-y-0.5">
                                            {selectedDoc.ai_extracted_data.issues.map((issue, i) => (
                                                <li key={i} className="flex items-start gap-1 text-xs text-amber-700">
                                                    <ExclamationTriangleIcon className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                                                    {issue}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Review note */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Ghi chú duyệt (tuỳ chọn)
                            </label>
                            <textarea
                                value={reviewNote}
                                onChange={(e) => setReviewNote(e.target.value)}
                                rows={3}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Nhận xét cho chủ kho..."
                            />
                        </div>

                        {/* Action buttons */}
                        {selectedDoc.review_status !== "APPROVED" && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => void handleReview("APPROVED")}
                                    disabled={isReviewing || selectedDoc.ai_status !== "DONE"}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                                >
                                    <CheckCircleIcon className="h-4 w-4" />
                                    Duyệt
                                </button>
                                <button
                                    onClick={() => void handleReview("NEEDS_RESUBMIT")}
                                    disabled={isReviewing}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
                                >
                                    <ExclamationTriangleIcon className="h-4 w-4" />
                                    Cần bổ sung
                                </button>
                                <button
                                    onClick={() => void handleReview("REJECTED")}
                                    disabled={isReviewing}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                                >
                                    <XCircleIcon className="h-4 w-4" />
                                    Từ chối
                                </button>
                            </div>
                        )}
                        {selectedDoc.ai_status !== "DONE" && selectedDoc.review_status === "PENDING" && (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                                <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                                AI chưa phân tích xong. Bạn vẫn có thể duyệt thủ công.
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 min-h-[300px]">
                        <div className="text-center">
                            <DocumentTextIcon className="h-10 w-10 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">Chọn tài liệu để xem chi tiết</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

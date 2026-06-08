"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
    ShieldCheckIcon,
    DocumentTextIcon,
    CheckCircleIcon,
    XCircleIcon,
    ExclamationTriangleIcon,
    ArrowPathIcon,
    EyeIcon,
    ClockIcon,
} from "@heroicons/react/24/outline";
import { warehouseTrustService } from "@/services/warehouse-trust/warehouse-trust.service";
import type { LegalDocument, DocReviewStatus } from "@/services/warehouse-trust/warehouse-trust.types";
import { DOC_TYPE_LABELS } from "@/services/warehouse-trust/warehouse-trust.types";

const STATUS_TABS: { label: string; value: DocReviewStatus | "ALL"; icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string }[] = [
    { label: "Chờ duyệt",  value: "PENDING",         icon: ClockIcon,             color: "text-gray-500 bg-gray-100" },
    { label: "Đã duyệt",   value: "APPROVED",        icon: CheckCircleIcon,       color: "text-green-700 bg-green-100" },
    { label: "Từ chối",    value: "REJECTED",        icon: XCircleIcon,           color: "text-red-700 bg-red-100" },
    { label: "Cần bổ sung",value: "NEEDS_RESUBMIT",  icon: ExclamationTriangleIcon,color: "text-amber-700 bg-amber-100" },
];

const REVIEW_STATUS_LABEL: Record<DocReviewStatus, string> = {
    PENDING:        "Chờ duyệt",
    APPROVED:       "Đã duyệt",
    REJECTED:       "Từ chối",
    NEEDS_RESUBMIT: "Cần bổ sung",
};

const REVIEW_STATUS_COLOR: Record<DocReviewStatus, string> = {
    PENDING:        "text-gray-600 bg-gray-100",
    APPROVED:       "text-green-700 bg-green-100",
    REJECTED:       "text-red-700 bg-red-100",
    NEEDS_RESUBMIT: "text-amber-700 bg-amber-100",
};

const AI_STATUS_COLORS: Record<string, string> = {
    PENDING:    "bg-gray-100 text-gray-600",
    PROCESSING: "bg-blue-100 text-blue-700",
    DONE:       "bg-green-100 text-green-700",
    FAILED:     "bg-red-100 text-red-700",
};

export default function WarehouseVerificationPage() {
    const [activeTab, setActiveTab] = useState<DocReviewStatus | "ALL">("PENDING");
    const [allDocuments, setAllDocuments] = useState<LegalDocument[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<LegalDocument | null>(null);
    const [reviewNote, setReviewNote] = useState("");
    const [signedUrl, setSignedUrl] = useState<string | null>(null);
    const [isReviewing, setIsReviewing] = useState(false);
    const [reviewError, setReviewError] = useState<string | null>(null);

    // Fetch ALL documents — filter client-side so tab counts are always accurate
    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await warehouseTrustService.listPendingDocuments(undefined);
            setAllDocuments(data);
        } catch {
            // silent
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => { void fetchDocuments(); }, [fetchDocuments]);

    // Filtered list for current tab
    const documents = useMemo(
        () => activeTab === "ALL"
            ? allDocuments
            : allDocuments.filter((d) => d.review_status === activeTab),
        [allDocuments, activeTab],
    );

    // Count per status for tab badges
    const tabCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const tab of STATUS_TABS) {
            counts[tab.value] = allDocuments.filter((d) => d.review_status === tab.value).length;
        }
        return counts;
    }, [allDocuments]);

    const handleViewDoc = async (doc: LegalDocument) => {
        setSelectedDoc(doc);
        setReviewNote("");
        setSignedUrl(null);
        setReviewError(null);
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
        setReviewError(null);
        try {
            // API returns the updated document — use it to update local state immediately
            const updated = await warehouseTrustService.reviewDocument(
                selectedDoc.id,
                status,
                reviewNote.trim() || undefined,
            );

            // Update the doc in local list without re-fetching
            setAllDocuments((prev) => prev.map((d) => d.id === updated.id ? updated : d));
            // Keep panel open with the updated doc (buttons will auto-hide due to status change)
            setSelectedDoc(updated);
        } catch {
            setReviewError("Thao tác thất bại. Vui lòng thử lại.");
        } finally {
            setIsReviewing(false);
        }
    };

    const isPending = selectedDoc?.review_status === "PENDING";

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <ShieldCheckIcon className="h-7 w-7 text-blue-600" />
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Xác minh kho bãi</h1>
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

            {/* Status tabs with counts */}
            <div className="border-b border-gray-200">
                <nav className="flex gap-0">
                    {STATUS_TABS.map((tab) => {
                        const Icon = tab.icon;
                        const count = tabCounts[tab.value] ?? 0;
                        const isActive = activeTab === tab.value;
                        return (
                            <button
                                key={tab.value}
                                onClick={() => setActiveTab(tab.value)}
                                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                                    isActive
                                        ? "border-blue-600 text-blue-600"
                                        : "border-transparent text-gray-500 hover:text-slate-700"
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {tab.label}
                                {/* Count badge */}
                                <span className={`ml-1 min-w-[20px] h-5 px-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center ${
                                    isActive
                                        ? "bg-blue-100 text-blue-700"
                                        : count > 0
                                        ? tab.color
                                        : "bg-gray-100 text-gray-400"
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </nav>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Document list */}
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="text-center py-12 text-gray-600">Đang tải...</div>
                    ) : documents.length === 0 ? (
                        <div className="text-center py-12 text-gray-600">
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
                                        <p className="font-medium text-sm text-slate-900 truncate">
                                            {doc.warehouse_template?.name ?? "Kho không tên"}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {DOC_TYPE_LABELS[doc.document_type] ?? doc.document_type}
                                        </p>
                                        <p className="text-xs text-gray-400 mt-1">
                                            {new Date(doc.created_at).toLocaleDateString("vi-VN")}
                                        </p>
                                        {/* Show review note snippet in list if reviewed */}
                                        {doc.review_status !== "PENDING" && doc.review_note && (
                                            <p className="text-xs text-gray-500 italic mt-1 line-clamp-1">
                                                "{doc.review_note}"
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                                        {/* Review status badge */}
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REVIEW_STATUS_COLOR[doc.review_status]}`}>
                                            {REVIEW_STATUS_LABEL[doc.review_status]}
                                        </span>
                                        {/* AI status badge */}
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${AI_STATUS_COLORS[doc.ai_status] ?? AI_STATUS_COLORS.PENDING}`}>
                                            AI: {doc.ai_status}
                                        </span>
                                        {doc.ai_confidence != null && (
                                            <span className="text-xs text-gray-400">
                                                {Math.round(doc.ai_confidence * 100)}%
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
                    <div className="border border-gray-200 rounded-xl bg-white p-5 space-y-4 sticky top-6 self-start">
                        {/* Panel header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h2 className="font-semibold text-slate-900">Chi tiết tài liệu</h2>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REVIEW_STATUS_COLOR[selectedDoc.review_status]}`}>
                                    {REVIEW_STATUS_LABEL[selectedDoc.review_status]}
                                </span>
                            </div>
                            <button
                                onClick={() => setSelectedDoc(null)}
                                className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1"
                            >
                                ×
                            </button>
                        </div>

                        {/* Doc meta */}
                        <div className="text-sm text-gray-600 space-y-0.5">
                            <p>
                                <span className="font-medium text-slate-700">Loại tài liệu:</span>{" "}
                                {DOC_TYPE_LABELS[selectedDoc.document_type] ?? selectedDoc.document_type}
                            </p>
                            <p>
                                <span className="font-medium text-slate-700">Kho:</span>{" "}
                                {selectedDoc.warehouse_template?.name ?? "—"}
                            </p>
                            <p>
                                <span className="font-medium text-slate-700">Nộp lúc:</span>{" "}
                                {new Date(selectedDoc.created_at).toLocaleString("vi-VN")}
                            </p>
                            {selectedDoc.reviewed_at && (
                                <p>
                                    <span className="font-medium text-slate-700">Xử lý lúc:</span>{" "}
                                    {new Date(selectedDoc.reviewed_at).toLocaleString("vi-VN")}
                                </p>
                            )}
                        </div>

                        {/* View file link */}
                        {signedUrl ? (
                            <a
                                href={signedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 text-blue-600 hover:underline text-sm"
                            >
                                <EyeIcon className="h-4 w-4" />
                                Xem file tài liệu ({selectedDoc.file_name})
                            </a>
                        ) : (
                            <p className="text-xs text-gray-400">Đang tải link xem file...</p>
                        )}

                        {/* AI Analysis result */}
                        {selectedDoc.ai_extracted_data && (
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
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
                                                    <ExclamationTriangleIcon className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                                    {issue}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── Admin review note section ── */}
                        {isPending ? (
                            /* Editable textarea — only for PENDING */
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">
                                    Ghi chú duyệt <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
                                </label>
                                <textarea
                                    value={reviewNote}
                                    onChange={(e) => setReviewNote(e.target.value)}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="Nhận xét cho chủ kho..."
                                />
                            </div>
                        ) : selectedDoc.review_note ? (
                            /* Read-only display of admin's stored note */
                            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1">
                                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                                    Ghi chú của Admin
                                </p>
                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {selectedDoc.review_note}
                                </p>
                            </div>
                        ) : null}

                        {/* Error message */}
                        {reviewError && (
                            <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                                {reviewError}
                            </p>
                        )}

                        {/* ── Action buttons — ONLY for PENDING docs ── */}
                        {isPending && (
                            <div className="flex gap-2">
                                <button
                                    onClick={() => void handleReview("APPROVED")}
                                    disabled={isReviewing || selectedDoc.ai_status !== "DONE"}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    title={selectedDoc.ai_status !== "DONE" ? "AI chưa phân tích xong" : ""}
                                >
                                    <CheckCircleIcon className="h-4 w-4" />
                                    {isReviewing ? "Đang xử lý..." : "Duyệt"}
                                </button>
                                <button
                                    onClick={() => void handleReview("NEEDS_RESUBMIT")}
                                    disabled={isReviewing}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50 transition-colors"
                                >
                                    <ExclamationTriangleIcon className="h-4 w-4" />
                                    {isReviewing ? "..." : "Cần bổ sung"}
                                </button>
                                <button
                                    onClick={() => void handleReview("REJECTED")}
                                    disabled={isReviewing}
                                    className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
                                >
                                    <XCircleIcon className="h-4 w-4" />
                                    {isReviewing ? "..." : "Từ chối"}
                                </button>
                            </div>
                        )}

                        {/* Manual review hint when AI not ready */}
                        {isPending && selectedDoc.ai_status !== "DONE" && (
                            <p className="text-xs text-amber-600 flex items-center gap-1">
                                <ExclamationTriangleIcon className="h-3.5 w-3.5 shrink-0" />
                                AI chưa phân tích xong — nút "Duyệt" bị khóa. Dùng "Cần bổ sung" hoặc "Từ chối" nếu muốn xử lý thủ công.
                            </p>
                        )}

                        {/* Success indicator after action */}
                        {!isPending && selectedDoc.reviewed_at && (
                            <div className={`rounded-lg px-3 py-2.5 text-sm flex items-center gap-2 ${REVIEW_STATUS_COLOR[selectedDoc.review_status]}`}>
                                {selectedDoc.review_status === "APPROVED" && <CheckCircleIcon className="h-4 w-4 shrink-0" />}
                                {selectedDoc.review_status === "REJECTED" && <XCircleIcon className="h-4 w-4 shrink-0" />}
                                {selectedDoc.review_status === "NEEDS_RESUBMIT" && <ExclamationTriangleIcon className="h-4 w-4 shrink-0" />}
                                <span className="font-medium">
                                    {REVIEW_STATUS_LABEL[selectedDoc.review_status]}
                                </span>
                                <span className="text-xs opacity-75">
                                    — {new Date(selectedDoc.reviewed_at).toLocaleString("vi-VN")}
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="border border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-500 min-h-[300px]">
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

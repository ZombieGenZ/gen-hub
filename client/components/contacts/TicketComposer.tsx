"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
    PaperAirplaneIcon,
    SparklesIcon,
    PaperClipIcon,
    LockClosedIcon,
    ChatBubbleLeftIcon,
    ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { TiptapEditor } from "./TiptapEditor";

interface TicketComposerProps {
    onSendReply: (content: string, isInternal: boolean) => void;
    isLoading?: boolean;
}

export function TicketComposer({ onSendReply, isLoading }: TicketComposerProps) {
    const [content, setContent] = useState("");
    const [activeTab, setActiveTab] = useState<"reply" | "note">("reply");

    const handleSubmit = () => {
        if (!content.trim()) return;
        onSendReply(content.trim(), activeTab === "note");
        setContent("");
    };

    return (
        <div
            className="border border-slate-200 bg-white shadow-sm"
            style={{ borderRadius: "16px" }}
        >
            {/* Tabs */}
            <div className="flex items-center border-b border-slate-100 px-4">
                <button
                    onClick={() => setActiveTab("reply")}
                    className={cn(
                        "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                        activeTab === "reply"
                            ? "border-primary text-primary"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                >
                    <ChatBubbleLeftIcon className="w-4 h-4" />
                    Trả lời
                </button>
                <button
                    onClick={() => setActiveTab("note")}
                    className={cn(
                        "flex items-center gap-1.5 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                        activeTab === "note"
                            ? "border-amber-500 text-amber-600"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                >
                    <LockClosedIcon className="w-4 h-4" />
                    Ghi chú nội bộ
                </button>

                <div className="ml-auto">
                    <button
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors"
                        style={{ borderRadius: "12px" }}
                        title="AI gợi ý câu trả lời"
                    >
                        <SparklesIcon className="w-3.5 h-3.5" />
                        AI Gợi ý
                    </button>
                </div>
            </div>

            {/* Internal note warning */}
            {activeTab === "note" && (
                <div className="mx-4 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-700" style={{ borderRadius: "8px" }}>
                    <LockClosedIcon className="w-3.5 h-3.5" />
                    Ghi chú này chỉ hiển thị với nhân viên, khách hàng sẽ không thấy.
                </div>
            )}

            {/* Editor Area */}
            <div className="p-4">
                <TiptapEditor
                    content={content}
                    onChange={setContent}
                    onSubmit={handleSubmit}
                    placeholder={
                        activeTab === "reply"
                            ? "Nhập nội dung trả lời... (Ctrl+Enter để gửi)"
                            : "Viết ghi chú nội bộ... (Ctrl+Enter để gửi)"
                    }
                />
            </div>

            {/* Bottom Bar */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                    <button
                        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                        style={{ borderRadius: "8px" }}
                        title="Đính kèm tệp"
                    >
                        <PaperClipIcon className="w-4 h-4" />
                    </button>
                    <span className="text-xs text-slate-400">Gõ / để chèn câu trả lời mẫu</span>
                </div>

                <button
                    onClick={handleSubmit}
                    disabled={!content.trim() || isLoading}
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all shadow-sm",
                        activeTab === "reply"
                            ? "bg-primary hover:bg-teal-700 shadow-primary/20"
                            : "bg-amber-500 hover:bg-amber-600 shadow-amber-500/20",
                        (!content.trim() || isLoading) && "opacity-50 cursor-not-allowed"
                    )}
                    style={{ borderRadius: "12px" }}
                >
                    {isLoading ? (
                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    ) : (
                        <PaperAirplaneIcon className="w-4 h-4" />
                    )}
                    {isLoading
                        ? (activeTab === "reply" ? "Đang gửi..." : "Đang lưu...")
                        : (activeTab === "reply" ? "Gửi trả lời" : "Lưu ghi chú")
                    }
                </button>
            </div>
        </div>
    );
}

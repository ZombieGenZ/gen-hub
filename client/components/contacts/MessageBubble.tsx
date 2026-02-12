"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
    LockClosedIcon,
    CpuChipIcon,
    PaperClipIcon,
} from "@heroicons/react/24/outline";
import { ContactMessage } from "@/types/contact/contact.type";

interface MessageBubbleProps {
    message: ContactMessage;
}

function formatTime(dateStr: string) {
    try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
    } catch {
        return dateStr;
    }
}

function formatDate(dateStr: string) {
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    } catch {
        return dateStr;
    }
}

export function MessageBubble({ message }: MessageBubbleProps) {
    const isCustomer = message.sender_type === "CUSTOMER";
    const isStaff = message.sender_type === "STAFF";
    const isInternal = message.is_internal;
    const isBot = message.sender_type === "BOT";

    // Internal Note
    if (isInternal) {
        return (
            <div className="flex justify-center my-4">
                <div
                    className="max-w-[80%] bg-amber-50 border border-amber-200 px-4 py-3"
                    style={{ borderRadius: "16px" }}
                >
                    <div className="flex items-center gap-2 mb-1">
                        <LockClosedIcon className="w-3.5 h-3.5 text-amber-600" />
                        <span className="text-xs font-semibold text-amber-700">
                            Ghi chú nội bộ — {message.sender_name}
                        </span>
                        <span className="text-xs text-amber-500 ml-auto">{formatTime(message.created_at)}</span>
                    </div>
                    <div
                        className="text-sm text-amber-900 leading-relaxed prose prose-sm max-w-none [&_p]:mb-1 [&_p:last-child]:mb-0"
                        dangerouslySetInnerHTML={{ __html: message.content }}
                    />
                </div>
            </div>
        );
    }

    // Bot message
    if (isBot) {
        return (
            <div className="flex justify-start my-3">
                <div className="flex items-start gap-2 max-w-[75%]">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center flex-shrink-0 mt-1">
                        <CpuChipIcon className="w-4 h-4 text-violet-600" />
                    </div>
                    <div>
                        <div
                            className="bg-violet-50 border border-violet-100 px-4 py-3"
                            style={{ borderRadius: "4px 16px 16px 16px" }}
                        >
                            <div
                                className="text-sm text-violet-900 leading-relaxed prose prose-sm max-w-none [&_p]:mb-1 [&_p:last-child]:mb-0"
                                dangerouslySetInnerHTML={{ __html: message.content }}
                            />
                        </div>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                            AI Bot • {formatTime(message.created_at)}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // Customer message (left)
    if (isCustomer) {
        return (
            <div className="flex justify-start my-3">
                <div className="flex items-start gap-2 max-w-[75%]">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0 mt-1 text-sm font-semibold text-slate-600">
                        {message.sender_name?.charAt(0)?.toUpperCase() || "K"}
                    </div>
                    <div>
                        <div
                            className="bg-white border border-slate-200 px-4 py-3 shadow-sm"
                            style={{ borderRadius: "4px 16px 16px 16px" }}
                        >
                            <div
                                className="text-sm text-slate-800 leading-relaxed prose prose-sm max-w-none [&_p]:mb-1 [&_p:last-child]:mb-0"
                                dangerouslySetInnerHTML={{ __html: message.content }}
                            />
                            {message.attachments && message.attachments.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                    {message.attachments.map((att, i) => (
                                        <a
                                            key={i}
                                            href={att}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline bg-blue-50 px-2 py-1"
                                            style={{ borderRadius: "8px" }}
                                        >
                                            <PaperClipIcon className="w-3 h-3" />
                                            Tệp đính kèm {i + 1}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                        <span className="text-[11px] text-slate-400 mt-1 block">
                            {message.sender_name} • {formatTime(message.created_at)}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // Staff message (right)
    return (
        <div className="flex justify-end my-3">
            <div className="flex items-start gap-2 max-w-[75%] flex-row-reverse">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1 text-sm font-semibold text-primary">
                    {message.sender_name?.charAt(0)?.toUpperCase() || "S"}
                </div>
                <div className="text-right">
                    <div
                        className="bg-primary text-white px-4 py-3 shadow-md shadow-primary/10"
                        style={{ borderRadius: "16px 4px 16px 16px" }}
                    >
                        <div
                            className="text-sm leading-relaxed text-left prose prose-sm max-w-none prose-invert text-white [&_p]:text-white [&_p]:mb-1 [&_p:last-child]:mb-0"
                            dangerouslySetInnerHTML={{ __html: message.content }}
                        />
                        {message.attachments && message.attachments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-2 justify-start">
                                {message.attachments.map((att, i) => (
                                    <a
                                        key={i}
                                        href={att}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-white/80 hover:text-white bg-white/20 px-2 py-1"
                                        style={{ borderRadius: "8px" }}
                                    >
                                        <PaperClipIcon className="w-3 h-3" />
                                        Tệp đính kèm {i + 1}
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-1 block">
                        {message.sender_name} • {formatTime(message.created_at)}
                    </span>
                </div>
            </div>
        </div>
    );
}

interface MessageDateDividerProps {
    date: string;
}

export function MessageDateDivider({ date }: MessageDateDividerProps) {
    return (
        <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-xs text-slate-400 font-medium">{formatDate(date)}</span>
            <div className="flex-1 h-px bg-slate-200" />
        </div>
    );
}

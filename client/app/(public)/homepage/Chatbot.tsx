"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
    MessageCircle,
    X,
    Send,
    Bot,
    User,
    Phone,
    Calendar,
    ArrowLeft,
    Clock,
    MapPin,
    Ruler,
    DollarSign,
    CheckCircle,
    Loader2,
    UserRound,
    Wifi,
    WifiOff,
} from "lucide-react";
import { useLiveChat } from "@/hooks/useLiveChat";
import { LiveChatMessage } from "@/types/live-chat/live-chat.type";
import { publicWarehouseService } from "@/services/public-warehouse/public-warehouse.service";
import { authStorage } from "@/services/auth/auth-storage.service";
import type { WarehouseVisitBooking } from "@/services/warehouse-visit/warehouse-visit.service";
import { CozeChatbot } from "./CozeChatbot";
import { DifyChatbot } from "./DifyChatbot";
import { aiPluginService, type WarehouseRecommendationItem } from '@/services/ai-plugin/ai-plugin.service';

interface QuickReply {
    id: string;
    label: string;
    icon: React.ReactNode;
    message: string;
}

interface LeadForm {
    name: string;
    phone: string;
    email: string;
    note: string;
}

interface AppointmentForm {
    name: string;
    phone: string;
    email: string;
    date: string;
    time: string;
    warehouseId: string;
    note: string;
}

interface WarehouseOption {
    id: string;
    name: string;
}

type ChatMode = "bot" | "appointment" | "lead-form";
type VisitIntent = "RESCHEDULE" | "CANCEL" | null;

interface VisitManagementState {
    visible: boolean;
    loading: boolean;
    error: string | null;
    booking: WarehouseVisitBooking | null;
    actionMessage: string | null;
    showRescheduleForm: boolean;
    rescheduleDate: string;
    rescheduleTime: string;
    submitting: boolean;
    suggestionTimes: string[];
}

const quickReplies: QuickReply[] = [
    {
        id: "area",
        label: "Diện tích",
        icon: <Ruler className="w-3 h-3" />,
        message: "Tôi muốn hỏi về các diện tích kho có sẵn",
    },
    {
        id: "price",
        label: "Giá thuê",
        icon: <DollarSign className="w-3 h-3" />,
        message: "Cho tôi hỏi về giá thuê kho",
    },
    {
        id: "location",
        label: "Vị trí",
        icon: <MapPin className="w-3 h-3" />,
        message: "Các kho của bạn ở đâu?",
    },
    {
        id: "time",
        label: "Thời gian",
        icon: <Clock className="w-3 h-3" />,
        message: "Thời gian thuê tối thiểu là bao lâu?",
    },
];

const API = process.env.NEXT_PUBLIC_API_URL || "";
const PREFERRED_RESCHEDULE_SLOTS = ["09:00", "10:30", "14:00", "15:30"];

function detectWarehouseIntent(text: string): boolean {
    return /(cần kho|thuê kho|tìm kho|muốn kho|kho lạnh|kho tại|warehouse|tìm thuê|diện tích kho|ngân sách.*kho|kho.*ngân sách)/i.test(text);
}

function detectVisitIntent(text: string): VisitIntent {
    const normalized = text.toLowerCase();

    const isCancel =
        /(hủy|huỷ).*(lịch|hẹn|ngày|giờ|xem kho|tham quan)/i.test(normalized) ||
        /(cancel).*(visit|booking|appointment)/i.test(normalized);
    if (isCancel) {
        return "CANCEL";
    }

    const isReschedule =
        /(đổi|dời|chuyển).*(lịch|ngày|giờ|xem kho|tham quan)/i.test(normalized) ||
        /(reschedule|change).*(visit|booking|appointment|time|date)/i.test(
            normalized,
        );
    if (isReschedule) {
        return "RESCHEDULE";
    }

    return null;
}

function extractSuggestedTimes(text: string): string[] {
    if (!text) return [];
    const matches = text.match(/\b([01]\d|2[0-3]):[0-5]\d\b/g) || [];
    return Array.from(new Set(matches));
}

function extractBookingItems(payload: unknown): WarehouseVisitBooking[] {
    if (!payload || typeof payload !== "object") {
        return [];
    }

    const p = payload as Record<string, unknown>;
    const rootItems = p.items;
    if (Array.isArray(rootItems)) {
        return rootItems as WarehouseVisitBooking[];
    }

    const data = p.data;
    if (data && typeof data === "object") {
        const dataRecord = data as Record<string, unknown>;
        if (Array.isArray(dataRecord.items)) {
            return dataRecord.items as WarehouseVisitBooking[];
        }
        if (Array.isArray(dataRecord.data)) {
            return dataRecord.data as WarehouseVisitBooking[];
        }
    }

    return [];
}

function extractBookingData(payload: unknown): WarehouseVisitBooking | null {
    if (!payload || typeof payload !== "object") {
        return null;
    }

    const p = payload as Record<string, unknown>;
    if (p.data && typeof p.data === "object") {
        return p.data as WarehouseVisitBooking;
    }

    return null;
}

function formatTime(dateStr: string) {
    try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "";
    }
}

// Parse markdown-like syntax to React elements
function parseMarkdown(text: string): React.ReactNode[] {
    // Split by newlines first, then process each line
    const lines = text.split("\n");
    const result: React.ReactNode[] = [];

    lines.forEach((line, lineIndex) => {
        if (lineIndex > 0) {
            result.push(<br key={`br-${lineIndex}`} />);
        }

        // Regex to match: **bold**, *italic*, `code`, ~~strikethrough~~
        const pattern = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|~~(.+?)~~)/g;
        let lastIndex = 0;
        let match: RegExpExecArray | null;
        const lineNodes: React.ReactNode[] = [];

        while ((match = pattern.exec(line)) !== null) {
            // Push text before match
            if (match.index > lastIndex) {
                lineNodes.push(line.slice(lastIndex, match.index));
            }

            if (match[2] !== undefined) {
                // **bold**
                lineNodes.push(
                    <strong key={`${lineIndex}-${match.index}-b`}>{match[2]}</strong>,
                );
            } else if (match[3] !== undefined) {
                // *italic*
                lineNodes.push(
                    <em key={`${lineIndex}-${match.index}-i`}>{match[3]}</em>,
                );
            } else if (match[4] !== undefined) {
                // `code`
                lineNodes.push(
                    <code
                        key={`${lineIndex}-${match.index}-c`}
                        className="bg-black/10 rounded px-1 py-0.5 font-mono text-[0.85em]"
                    >
                        {match[4]}
                    </code>,
                );
            } else if (match[5] !== undefined) {
                // ~~strikethrough~~
                lineNodes.push(<s key={`${lineIndex}-${match.index}-s`}>{match[5]}</s>);
            }

            lastIndex = match.index + match[0].length;
        }

        // Push remaining text
        if (lastIndex < line.length) {
            lineNodes.push(line.slice(lastIndex));
        }

        result.push(...lineNodes);
    });

    return result;
}



// ---------------------------------------------------------------------------
// Chatbot provider type
// ---------------------------------------------------------------------------
type ChatbotProvider = "api" | "coze" | "dify";

const CHATBOT_PROVIDER: ChatbotProvider =
    (process.env.NEXT_PUBLIC_CHATBOT_PROVIDER as ChatbotProvider) || "coze";

// ---------------------------------------------------------------------------
// Internal API Chatbot (original implementation)
// ---------------------------------------------------------------------------
function ApiChatbot() {

    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<ChatMode>("bot");
    const [inputValue, setInputValue] = useState("");
    const [leadForm, setLeadForm] = useState<LeadForm>({
        name: "",
        phone: "",
        email: "",
        note: "",
    });
    const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>({
        name: "",
        phone: "",
        email: "",
        date: "",
        time: "",
        warehouseId: "",
        note: "",
    });
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [chatStarted, setChatStarted] = useState(false);
    const [availableWarehouses, setAvailableWarehouses] = useState<
        WarehouseOption[]
    >([]);
    const [isWarehouseLoading, setIsWarehouseLoading] = useState(false);
    const [appointmentError, setAppointmentError] = useState<string | null>(null);
    const [isAppointmentSubmitting, setIsAppointmentSubmitting] = useState(false);
    const [appointmentConflictSuggestions, setAppointmentConflictSuggestions] =
        useState<string[]>([]);
    const [visitManagement, setVisitManagement] = useState<VisitManagementState>({
        visible: false,
        loading: false,
        error: null,
        booking: null,
        actionMessage: null,
        showRescheduleForm: false,
        rescheduleDate: "",
        rescheduleTime: "",
        submitting: false,
        suggestionTimes: [],
    });

    const {
        messages,
        sessionId,
        isConnected,
        isLoading,
        isSending,
        unreadCount,
        isAutoStarted,
        lastNewMessage,
        clearLastNewMessage,
        startChat,
        sendMessage,
        resetUnread,
    } = useLiveChat();

    const [tooltipVisible, setTooltipVisible] = useState(false);
    const tooltipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // AI warehouse recommendation state
    const [aiRecLoading, setAiRecLoading] = useState(false);
    const [aiRecommendations, setAiRecommendations] = useState<WarehouseRecommendationItem[] | null>(null);
    const [aiRecNote, setAiRecNote] = useState('');

    // Hiển thị tooltip khi có tin nhắn mới và chat đang đóng
    useEffect(() => {
        if (!isOpen && lastNewMessage) {
            setTooltipVisible(true);
            // Tự ẩn sau 6 giây
            if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
            tooltipTimerRef.current = setTimeout(() => {
                setTooltipVisible(false);
            }, 6000);
        }
        return () => {
            if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
        };
    }, [lastNewMessage, isOpen]);

    const handleDismissTooltip = useCallback(() => {
        setTooltipVisible(false);
        clearLastNewMessage();
        if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);
    }, [clearLastNewMessage]);

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Focus input when opening
    useEffect(() => {
        if (isOpen && mode === "bot") {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, mode]);

    // Reset unread khi mở chat
    useEffect(() => {
        if (isOpen) {
            resetUnread();
        }
    }, [isOpen, resetUnread]);

    // Nếu đã có session từ trước → mark as started
    useEffect(() => {
        if (sessionId) {
            setChatStarted(true);
        }
    }, [sessionId]);

    // Auto-open chat khi auto-start hoàn tất
    useEffect(() => {
        if (isAutoStarted && sessionId) {
            setIsOpen(true);
        }
    }, [isAutoStarted, sessionId]);

    useEffect(() => {
        if (
            mode !== "appointment" ||
            availableWarehouses.length > 0 ||
            isWarehouseLoading
        ) {
            return;
        }

        const loadWarehouses = async () => {
            setIsWarehouseLoading(true);
            setAppointmentError(null);
            try {
                const result = await publicWarehouseService.getPublicWarehouses({
                    limit: 100,
                });
                const items = Array.isArray(result)
                    ? result
                    : Array.isArray((result as { items?: unknown[] }).items)
                        ? (result as { items: unknown[] }).items
                        : [];

                const normalized = items
                    .map((item) => {
                        const raw = item as { id?: unknown; name?: unknown };
                        if (typeof raw.id !== "string" || typeof raw.name !== "string") {
                            return null;
                        }

                        return {
                            id: raw.id,
                            name: raw.name,
                        };
                    })
                    .filter((item): item is WarehouseOption => item !== null);

                setAvailableWarehouses(normalized);
            } catch (error) {
                console.error("Failed to load warehouses:", error);
                setAppointmentError(
                    "Không tải được danh sách kho. Vui lòng thử lại sau.",
                );
            } finally {
                setIsWarehouseLoading(false);
            }
        };

        loadWarehouses();
    }, [mode, availableWarehouses.length, isWarehouseLoading]);

    const buildVisitEndTime = (startTime: string) => {
        const [hours, minutes] = startTime.split(":").map(Number);
        if (Number.isNaN(hours) || Number.isNaN(minutes)) {
            return startTime;
        }

        const endDate = new Date();
        endDate.setHours(hours, minutes + 60, 0, 0);
        return `${endDate.getHours().toString().padStart(2, "0")}:${endDate
            .getMinutes()
            .toString()
            .padStart(2, "0")}`;
    };

    const fetchBookingsByStatus = useCallback(
        async (token: string, status: "PENDING" | "CONFIRMED") => {
            const response = await fetch(
                `${API}/warehouse-visit?status=${status}&page=1&limit=20`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                },
            );

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                const errorMessage =
                    (payload as { message?: string } | null)?.message ||
                    "Không thể lấy danh sách lịch hẹn.";
                throw new Error(errorMessage);
            }

            return extractBookingItems(payload);
        },
        [],
    );

    const openVisitManagementFromIntent = useCallback(
        async (intent: VisitIntent) => {
            if (!intent) {
                return;
            }

            const token = authStorage.getAccessToken();

            if (!token) {
                setVisitManagement((prev) => ({
                    ...prev,
                    visible: true,
                    loading: false,
                    booking: null,
                    actionMessage: null,
                    showRescheduleForm: false,
                    error: "Bạn cần đăng nhập để xem và quản lý lịch hẹn của mình.",
                }));
                return;
            }

            setVisitManagement((prev) => ({
                ...prev,
                visible: true,
                loading: true,
                error: null,
                actionMessage: null,
                suggestionTimes: [],
            }));

            try {
                const [pendingBookings, confirmedBookings] = await Promise.all([
                    fetchBookingsByStatus(token, "PENDING"),
                    fetchBookingsByStatus(token, "CONFIRMED"),
                ]);

                const latestBooking =
                    [...pendingBookings, ...confirmedBookings].sort(
                        (a, b) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime(),
                    )[0] || null;

                if (!latestBooking) {
                    setVisitManagement((prev) => ({
                        ...prev,
                        loading: false,
                        booking: null,
                        showRescheduleForm: false,
                        error: "Mình chưa tìm thấy lịch hẹn PENDING/CONFIRMED nào của bạn.",
                    }));
                    return;
                }

                setVisitManagement((prev) => ({
                    ...prev,
                    loading: false,
                    booking: latestBooking,
                    error: null,
                    showRescheduleForm: intent === "RESCHEDULE",
                    rescheduleDate: new Date(latestBooking.visit_date)
                        .toISOString()
                        .split("T")[0],
                    rescheduleTime: latestBooking.visit_time_start,
                }));
            } catch (error) {
                setVisitManagement((prev) => ({
                    ...prev,
                    loading: false,
                    booking: null,
                    showRescheduleForm: false,
                    error:
                        error instanceof Error
                            ? error.message
                            : "Không thể tải lịch hẹn lúc này.",
                }));
            }
        },
        [fetchBookingsByStatus],
    );

    const handleVisitCancel = async () => {
        const token = authStorage.getAccessToken();
        const booking = visitManagement.booking;

        if (!token || !booking) {
            return;
        }

        setVisitManagement((prev) => ({
            ...prev,
            submitting: true,
            error: null,
            actionMessage: null,
        }));

        try {
            const response = await fetch(`${API}/warehouse-visit/${booking.id}`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    status: "CANCELLED",
                    cancel_reason: "Khách hủy từ chatbot",
                }),
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                throw new Error(
                    (payload as { message?: string } | null)?.message ||
                    "Không thể hủy lịch hẹn.",
                );
            }

            const updatedBooking = extractBookingData(payload) || {
                ...booking,
                status: "CANCELLED",
            };

            setVisitManagement((prev) => ({
                ...prev,
                submitting: false,
                booking: updatedBooking,
                showRescheduleForm: false,
                actionMessage: "Đã hủy lịch hẹn thành công.",
                suggestionTimes: [],
            }));
        } catch (error) {
            setVisitManagement((prev) => ({
                ...prev,
                submitting: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Hủy lịch thất bại. Vui lòng thử lại.",
            }));
        }
    };

    const handleVisitReschedule = async () => {
        const token = authStorage.getAccessToken();
        const booking = visitManagement.booking;

        if (!token || !booking) {
            return;
        }

        if (!visitManagement.rescheduleDate || !visitManagement.rescheduleTime) {
            setVisitManagement((prev) => ({
                ...prev,
                error: "Vui lòng chọn ngày và giờ mới trước khi đổi lịch.",
            }));
            return;
        }

        setVisitManagement((prev) => ({
            ...prev,
            submitting: true,
            error: null,
            actionMessage: null,
        }));

        try {
            const response = await fetch(
                `${API}/warehouse-visit/${booking.id}/reschedule`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        visit_date: visitManagement.rescheduleDate,
                        visit_time_start: visitManagement.rescheduleTime,
                        visit_time_end: buildVisitEndTime(visitManagement.rescheduleTime),
                        reason: "Khách đổi lịch từ chatbot",
                    }),
                },
            );

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                const message =
                    (payload as { message?: string } | null)?.message ||
                    "Không thể đổi lịch hẹn.";
                const suggestions = extractSuggestedTimes(message)
                    .concat(PREFERRED_RESCHEDULE_SLOTS)
                    .filter((slot, index, arr) => arr.indexOf(slot) === index)
                    .slice(0, 4);

                setVisitManagement((prev) => ({
                    ...prev,
                    suggestionTimes: suggestions,
                }));
                throw new Error(message);
            }

            const updatedBooking = extractBookingData(payload) || {
                ...booking,
                visit_date: visitManagement.rescheduleDate,
                visit_time_start: visitManagement.rescheduleTime,
                visit_time_end: buildVisitEndTime(visitManagement.rescheduleTime),
                status: "PENDING",
            };

            setVisitManagement((prev) => ({
                ...prev,
                submitting: false,
                booking: updatedBooking,
                showRescheduleForm: false,
                actionMessage:
                    "Đã gửi yêu cầu đổi lịch thành công. Hệ thống sẽ xác nhận lại sớm nhất.",
                suggestionTimes: [],
            }));
        } catch (error) {
            setVisitManagement((prev) => ({
                ...prev,
                submitting: false,
                error:
                    error instanceof Error
                        ? error.message
                        : "Đổi lịch thất bại. Vui lòng thử lại.",
            }));
        }
    };

    const handleOpen = () => {
        setIsOpen(true);
        resetUnread();
        // Ẩn tooltip khi mở chat
        setTooltipVisible(false);
        clearLastNewMessage();
        if (tooltipTimerRef.current) clearTimeout(tooltipTimerRef.current);

        // Tự động startChat nếu chưa có session và chưa start
        if (!chatStarted && !sessionId && !isLoading) {
            setChatStarted(true);
            startChat().catch((err) => {
                console.error("Failed to start chat:", err);
                setChatStarted(false);
            });
        }
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isSending) return;

        const content = inputValue.trim();
        const visitIntent = detectVisitIntent(content);
        setInputValue("");

        // Parallel AI warehouse recommendation if user describes warehouse need
        if (detectWarehouseIntent(content)) {
            setAiRecLoading(true);
            setAiRecommendations(null);
            aiPluginService.recommendWarehouses(content)
                .then((result) => {
                    setAiRecommendations(result.recommendations);
                    setAiRecNote(result.ai_note);
                })
                .catch(() => setAiRecommendations([]))
                .finally(() => setAiRecLoading(false));
        }

        // Nếu chưa start session → start với initialMessage
        if (!chatStarted || !sessionId) {
            setChatStarted(true);
            try {
                await startChat(content);
                if (visitIntent) {
                    await openVisitManagementFromIntent(visitIntent);
                }
            } catch (err) {
                console.error("Failed to start chat:", err);
                setChatStarted(false);
            }
            return;
        }

        // Đã có session → gửi message bình thường
        try {
            await sendMessage(content);
            if (visitIntent) {
                await openVisitManagementFromIntent(visitIntent);
            }
        } catch (err) {
            console.error("Failed to send message:", err);
        }
    };

    const handleQuickReply = async (reply: QuickReply) => {
        setInputValue("");

        if (!chatStarted || !sessionId) {
            setChatStarted(true);
            try {
                await startChat(reply.message);
            } catch (err) {
                console.error("Failed to start chat:", err);
                setChatStarted(false);
            }
            return;
        }

        try {
            await sendMessage(reply.message);
        } catch (err) {
            console.error("Failed to send message:", err);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleLeadFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // console.log("Lead form submitted:", leadForm);
        setFormSubmitted(true);
        setTimeout(() => {
            setFormSubmitted(false);
            setMode("bot");
            setLeadForm({ name: "", phone: "", email: "", note: "" });
        }, 2000);
    };

    const handleAppointmentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!appointmentForm.warehouseId) {
            setAppointmentError("Vui lòng chọn kho quan tâm.");
            return;
        }

        const phoneDigits = appointmentForm.phone.replace(/\D/g, "");
        const fallbackEmail = `guest-${phoneDigits || Date.now()}@genhub.vn`;
        const submitEmail = appointmentForm.email.trim() || fallbackEmail;

        setAppointmentError(null);
        setIsAppointmentSubmitting(true);
        setAppointmentConflictSuggestions([]);

        try {
            const response = await fetch("/api/ai-plugin/visit-booking", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    warehouse_id: appointmentForm.warehouseId,
                    visitor_name: appointmentForm.name.trim(),
                    visitor_email: submitEmail,
                    visitor_phone: appointmentForm.phone.trim(),
                    visit_date: appointmentForm.date,
                    visit_time_start: appointmentForm.time,
                    visit_time_end: buildVisitEndTime(appointmentForm.time),
                    purpose: "RENTAL_INQUIRY",
                    purpose_details: appointmentForm.note.trim() || undefined,
                    number_of_visitors: 1,
                }),
            });

            const data = await response.json().catch(() => null);

            if (!response.ok) {
                const conflictSuggestions = Array.isArray(data?.suggestions)
                    ? (data.suggestions as unknown[])
                        .filter((item): item is string => typeof item === "string")
                        .slice(0, 4)
                    : extractSuggestedTimes(data?.message || "");

                if (response.status === 409 && conflictSuggestions.length > 0) {
                    setAppointmentConflictSuggestions(conflictSuggestions);
                }

                throw new Error(data?.message || "Không thể đặt lịch lúc này.");
            }

            setFormSubmitted(true);
            setTimeout(() => {
                setFormSubmitted(false);
                setMode("bot");
                setAppointmentForm({
                    name: "",
                    phone: "",
                    email: "",
                    date: "",
                    time: "",
                    warehouseId: "",
                    note: "",
                });
                setAppointmentConflictSuggestions([]);
            }, 2200);
        } catch (error) {
            console.error("Failed to create visit booking:", error);
            setAppointmentError(
                error instanceof Error
                    ? error.message
                    : "Đặt lịch thất bại. Vui lòng thử lại.",
            );
        } finally {
            setIsAppointmentSubmitting(false);
        }
    };

    const goBackToBot = () => {
        setMode("bot");
        setFormSubmitted(false);
    };

    const renderMessage = (message: LiveChatMessage) => {
        const isCustomer = message.sender_type === "CUSTOMER";
        const isAI = message.sender_type === "AI";

        return (
            <div
                key={message.id}
                className={`flex gap-2 mb-3 ${isCustomer ? "flex-row-reverse" : "flex-row"}`}
            >
                {/* Avatar */}
                <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isCustomer
                            ? "bg-primary text-white"
                            : isAI
                                ? "bg-violet-100 text-violet-600"
                                : "bg-blue-100 text-blue-600"
                        }`}
                >
                    {isCustomer ? (
                        <User className="w-4 h-4" />
                    ) : isAI ? (
                        <Bot className="w-4 h-4" />
                    ) : (
                        <UserRound className="w-4 h-4" />
                    )}
                </div>

                {/* Message Bubble */}
                <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isCustomer
                            ? "bg-primary text-white rounded-tr-sm"
                            : isAI
                                ? "bg-violet-50 text-slate-800 rounded-tl-sm border border-violet-100"
                                : "bg-blue-50 text-slate-800 rounded-tl-sm border border-blue-100"
                        }`}
                >
                    {/* Sender label for AI/Staff */}
                    {!isCustomer && (
                        <div
                            className={`text-[10px] font-medium mb-0.5 ${isAI ? "text-violet-500" : "text-blue-500"}`}
                        >
                            {message.sender_name}
                        </div>
                    )}
                    {/<[a-z][\s\S]*>/i.test(message.content) ? (
                        <div
                            className={`leading-relaxed prose prose-sm max-w-none [&_p]:mb-1 [&_p:last-child]:mb-0 ${isCustomer ? "prose-invert text-white [&_p]:text-white" : ""}`}
                            dangerouslySetInnerHTML={{ __html: message.content }}
                        />
                    ) : (
                        <div className="leading-relaxed">
                            {parseMarkdown(message.content)}
                        </div>
                    )}
                    <div
                        className={`text-[10px] mt-1 ${isCustomer ? "text-white/70" : "text-slate-400"}`}
                    >
                        {formatTime(message.created_at)}
                    </div>
                </div>
            </div>
        );
    };

    const renderTypingIndicator = () => (
        <div className="flex gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-violet-600" />
            </div>
            <div className="bg-violet-50 border border-violet-100 px-4 py-3 rounded-2xl rounded-tl-sm">
                <div className="flex gap-1">
                    <span
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: "0ms" }}
                    />
                    <span
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: "150ms" }}
                    />
                    <span
                        className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"
                        style={{ animationDelay: "300ms" }}
                    />
                </div>
            </div>
        </div>
    );

    const renderLeadForm = () => (
        <div className="p-4">
            <button
                onClick={goBackToBot}
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-primary mb-4 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Quay lại chat
            </button>

            <h3 className="text-lg font-semibold text-slate-800 mb-1">
                Để lại thông tin
            </h3>
            <p className="text-sm text-slate-500 mb-4">
                Chúng tôi sẽ liên hệ tư vấn cho bạn
            </p>

            {formSubmitted ? (
                <div className="flex flex-col items-center justify-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                    <p className="text-green-600 font-medium">Gửi thành công!</p>
                </div>
            ) : (
                <form onSubmit={handleLeadFormSubmit} className="space-y-3">
                    <input
                        type="text"
                        placeholder="Họ và tên *"
                        required
                        value={leadForm.name}
                        onChange={(e) =>
                            setLeadForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <input
                        type="tel"
                        placeholder="Số điện thoại *"
                        required
                        value={leadForm.phone}
                        onChange={(e) =>
                            setLeadForm((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={leadForm.email}
                        onChange={(e) =>
                            setLeadForm((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <textarea
                        placeholder="Ghi chú (nhu cầu, diện tích mong muốn...)"
                        value={leadForm.note}
                        onChange={(e) =>
                            setLeadForm((prev) => ({ ...prev, note: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                        rows={3}
                    />
                    <button
                        type="submit"
                        className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors"
                    >
                        Gửi thông tin
                    </button>
                </form>
            )}
        </div>
    );

    const renderAppointmentForm = () => (
        <div className="p-4">
            <button
                onClick={goBackToBot}
                className="flex items-center gap-1 text-sm text-slate-600 hover:text-primary mb-4 transition-colors"
            >
                <ArrowLeft className="w-4 h-4" /> Quay lại chat
            </button>

            <h3 className="text-lg font-semibold text-slate-800 mb-1">
                Đặt lịch xem kho
            </h3>
            <p className="text-sm text-slate-500 mb-4">
                Chọn thời gian phù hợp với bạn
            </p>

            {formSubmitted ? (
                <div className="flex flex-col items-center justify-center py-8">
                    <CheckCircle className="w-12 h-12 text-green-500 mb-3" />
                    <p className="text-green-600 font-medium">Đặt lịch thành công!</p>
                </div>
            ) : (
                <form onSubmit={handleAppointmentSubmit} className="space-y-3">
                    <input
                        type="text"
                        placeholder="Họ và tên *"
                        required
                        value={appointmentForm.name}
                        onChange={(e) =>
                            setAppointmentForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <input
                        type="tel"
                        placeholder="Số điện thoại *"
                        required
                        value={appointmentForm.phone}
                        onChange={(e) =>
                            setAppointmentForm((prev) => ({ ...prev, phone: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <input
                        type="email"
                        placeholder="Email (Bắt buộc) *"
                        required
                        value={appointmentForm.email}
                        onChange={(e) =>
                            setAppointmentForm((prev) => ({ ...prev, email: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="date"
                            required
                            title="Chọn ngày tham quan"
                            aria-label="Ngày tham quan"
                            value={appointmentForm.date}
                            onChange={(e) =>
                                setAppointmentForm((prev) => ({
                                    ...prev,
                                    date: e.target.value,
                                }))
                            }
                            min={new Date().toISOString().split("T")[0]}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <select
                            required
                            title="Chọn giờ tham quan"
                            aria-label="Giờ tham quan"
                            value={appointmentForm.time}
                            onChange={(e) =>
                                setAppointmentForm((prev) => ({
                                    ...prev,
                                    time: e.target.value,
                                }))
                            }
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        >
                            <option value="">Chọn giờ</option>
                            <option value="09:00">09:00</option>
                            <option value="10:00">10:00</option>
                            <option value="11:00">11:00</option>
                            <option value="14:00">14:00</option>
                            <option value="15:00">15:00</option>
                            <option value="16:00">16:00</option>
                        </select>
                    </div>
                    <select
                        required
                        title="Chọn kho quan tâm"
                        aria-label="Kho quan tâm"
                        value={appointmentForm.warehouseId}
                        onChange={(e) =>
                            setAppointmentForm((prev) => ({
                                ...prev,
                                warehouseId: e.target.value,
                            }))
                        }
                        disabled={isWarehouseLoading}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        <option value="">
                            {isWarehouseLoading
                                ? "Đang tải danh sách kho..."
                                : "Chọn kho quan tâm"}
                        </option>
                        {availableWarehouses.map((warehouse) => (
                            <option key={warehouse.id} value={warehouse.id}>
                                {warehouse.name}
                            </option>
                        ))}
                    </select>
                    <textarea
                        placeholder="Ghi chú thêm..."
                        value={appointmentForm.note}
                        onChange={(e) =>
                            setAppointmentForm((prev) => ({ ...prev, note: e.target.value }))
                        }
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                        rows={2}
                    />
                    {appointmentError && (
                        <div className="space-y-2">
                            <p className="text-xs text-red-500">{appointmentError}</p>
                            {appointmentConflictSuggestions.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {appointmentConflictSuggestions.map((slot) => (
                                        <button
                                            key={slot}
                                            type="button"
                                            onClick={() =>
                                                setAppointmentForm((prev) => ({ ...prev, time: slot }))
                                            }
                                            className="px-2.5 py-1 text-xs rounded-full border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                                        >
                                            Chọn {slot}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={isAppointmentSubmitting}
                        className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {isAppointmentSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Calendar className="w-4 h-4" />
                        )}
                        {isAppointmentSubmitting ? "Đang đặt lịch..." : "Đặt lịch hẹn"}
                    </button>
                </form>
            )}
        </div>
    );

    const renderVisitManagementCard = () => {
        if (!visitManagement.visible) {
            return null;
        }

        const booking = visitManagement.booking;

        return (
            <div className="px-4 pb-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-slate-700">
                            Quản lý lịch hẹn gần nhất
                        </p>
                        <button
                            type="button"
                            onClick={() =>
                                setVisitManagement((prev) => ({ ...prev, visible: false }))
                            }
                            className="text-[11px] text-slate-500 hover:text-slate-700"
                        >
                            Đóng
                        </button>
                    </div>

                    {visitManagement.loading && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Đang tải lịch hẹn...
                        </div>
                    )}

                    {visitManagement.error && !visitManagement.loading && (
                        <p className="text-xs text-red-500">{visitManagement.error}</p>
                    )}

                    {booking && !visitManagement.loading && (
                        <>
                            <div className="text-xs text-slate-700 space-y-1">
                                <p>
                                    <span className="font-medium">Ngày:</span>{" "}
                                    {new Date(booking.visit_date).toLocaleDateString("vi-VN")}
                                </p>
                                <p>
                                    <span className="font-medium">Giờ:</span>{" "}
                                    {booking.visit_time_start} - {booking.visit_time_end}
                                </p>
                                <p>
                                    <span className="font-medium">Trạng thái:</span>{" "}
                                    <span className="inline-flex px-1.5 py-0.5 rounded-full bg-white border border-slate-200 text-[11px]">
                                        {booking.status}
                                    </span>
                                </p>
                            </div>

                            {visitManagement.showRescheduleForm && (
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="date"
                                        title="Chọn ngày đổi lịch"
                                        aria-label="Ngày đổi lịch"
                                        value={visitManagement.rescheduleDate}
                                        min={new Date().toISOString().split("T")[0]}
                                        onChange={(e) =>
                                            setVisitManagement((prev) => ({
                                                ...prev,
                                                rescheduleDate: e.target.value,
                                            }))
                                        }
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                                    />
                                    <select
                                        title="Chọn giờ đổi lịch"
                                        aria-label="Giờ đổi lịch"
                                        value={visitManagement.rescheduleTime}
                                        onChange={(e) =>
                                            setVisitManagement((prev) => ({
                                                ...prev,
                                                rescheduleTime: e.target.value,
                                            }))
                                        }
                                        className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs"
                                    >
                                        <option value="">Chọn giờ mới</option>
                                        <option value="09:00">09:00</option>
                                        <option value="10:30">10:30</option>
                                        <option value="14:00">14:00</option>
                                        <option value="15:30">15:30</option>
                                    </select>
                                </div>
                            )}

                            {visitManagement.suggestionTimes.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {visitManagement.suggestionTimes.map((slot) => (
                                        <button
                                            key={slot}
                                            type="button"
                                            onClick={() =>
                                                setVisitManagement((prev) => ({
                                                    ...prev,
                                                    rescheduleTime: slot,
                                                }))
                                            }
                                            className="px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[11px]"
                                        >
                                            {slot}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {visitManagement.actionMessage && (
                                <p className="text-xs text-green-600">
                                    {visitManagement.actionMessage}
                                </p>
                            )}

                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    disabled={
                                        visitManagement.submitting || booking.status === "CANCELLED"
                                    }
                                    onClick={() => {
                                        if (visitManagement.showRescheduleForm) {
                                            handleVisitReschedule();
                                            return;
                                        }
                                        setVisitManagement((prev) => ({
                                            ...prev,
                                            showRescheduleForm: true,
                                        }));
                                    }}
                                    className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50"
                                >
                                    {visitManagement.showRescheduleForm
                                        ? "Xác nhận đổi lịch"
                                        : "Đổi thời gian"}
                                </button>
                                <button
                                    type="button"
                                    disabled={
                                        visitManagement.submitting || booking.status === "CANCELLED"
                                    }
                                    onClick={handleVisitCancel}
                                    className="flex-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                                >
                                    Hủy lịch hẹn
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        );
    };

    const renderChatContent = () => (
        <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {/* Loading history */}
                {isLoading && messages.length === 0 && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span className="ml-2 text-sm text-slate-500">
                            Đang tải lịch sử...
                        </span>
                    </div>
                )}

                {messages.map(renderMessage)}
                {isSending && renderTypingIndicator()}
                <div ref={messagesEndRef} />
            </div>

            {/* AI Warehouse Recommendation Panel */}
            {(aiRecLoading || aiRecommendations !== null) && (
                <div className="px-4 pb-2">
                    <div className="border border-blue-200 rounded-xl bg-blue-50/50 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-blue-800 flex items-center gap-1">
                                ✨ AI Gợi ý kho phù hợp
                            </p>
                            <button
                                type="button"
                                onClick={() => { setAiRecommendations(null); setAiRecNote(''); }}
                                className="text-[11px] text-slate-500 hover:text-slate-700"
                            >
                                Đóng
                            </button>
                        </div>

                        {aiRecLoading && (
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Đang phân tích nhu cầu...
                            </div>
                        )}

                        {!aiRecLoading && aiRecommendations && aiRecommendations.length === 0 && (
                            <p className="text-xs text-slate-500">{aiRecNote || 'Không tìm được kho phù hợp.'}</p>
                        )}

                        {!aiRecLoading && aiRecommendations && aiRecommendations.length > 0 && (
                            <div className="space-y-2">
                                {aiRecommendations.slice(0, 3).map((rec: WarehouseRecommendationItem) => (
                                    <div key={rec.warehouse_id} className="bg-white rounded-lg border border-slate-200 p-2.5 space-y-1.5">
                                        <div className="flex items-start justify-between gap-1">
                                            <p className="text-xs font-semibold text-slate-800 line-clamp-1">{rec.name}</p>
                                            <span className={`shrink-0 text-[11px] font-bold px-1.5 py-0.5 rounded-full ${
                                                rec.match_score >= 80 ? 'bg-green-100 text-green-800' :
                                                rec.match_score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-slate-100 text-slate-600'
                                            }`}>{rec.match_score}%</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {rec.highlights.slice(0, 3).map((h, i) => (
                                                <span key={i} className="text-[11px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">{h}</span>
                                            ))}
                                        </div>
                                        <p className="text-[11px] text-slate-500 italic line-clamp-1">{rec.match_reason}</p>
                                        <div className="flex gap-1.5 pt-0.5">
                                            <a href={`/warehouse/${rec.warehouse_id}`} className="flex-1 text-center text-[11px] py-1 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors text-slate-700">Xem kho</a>
                                            <a href={rec.checkout_url} className="flex-1 text-center text-[11px] py-1 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors">Thuê ngay</a>
                                        </div>
                                    </div>
                                ))}
                                {aiRecNote && <p className="text-[11px] text-slate-500 italic">{aiRecNote}</p>}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Quick Replies - chỉ hiện khi chưa chat */}
            {messages.length <= 1 && !isSending && !isLoading && (
                <div className="px-4 pb-2">
                    <p className="text-xs text-slate-500 mb-2">Câu hỏi phổ biến:</p>
                    <div className="flex flex-wrap gap-1.5">
                        {quickReplies.map((reply) => (
                            <button
                                key={reply.id}
                                onClick={() => handleQuickReply(reply)}
                                disabled={isSending || isLoading}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-full transition-colors disabled:opacity-50"
                            >
                                {reply.icon}
                                {reply.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {renderVisitManagementCard()}

            {/* Action Buttons */}
            <div className="px-4 pb-2">
                <div className="flex gap-2">
                    <button
                        onClick={() => openVisitManagementFromIntent("RESCHEDULE")}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition-colors"
                    >
                        <Clock className="w-3.5 h-3.5" />
                        Đổi/Hủy lịch
                    </button>
                    <button
                        onClick={() => setMode("appointment")}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-lg transition-colors"
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        Đặt lịch xem kho
                    </button>
                    <button
                        onClick={() => setMode("lead-form")}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-lg transition-colors"
                    >
                        <Phone className="w-3.5 h-3.5" />
                        Gọi lại cho tôi
                    </button>
                </div>
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-slate-100">
                <div className="flex items-center gap-2">
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={
                            chatStarted ? "Nhập tin nhắn..." : "Nhập để bắt đầu chat..."
                        }
                        disabled={isSending || isLoading}
                        className="flex-1 px-4 py-2.5 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isSending || isLoading}
                        className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSending || isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </div>
            </div>
        </>
    );

    return (
        <>
            {/* Tooltip thông báo tin nhắn mới khi chat đang đóng */}
            {!isOpen && tooltipVisible && lastNewMessage && (
                <div
                    className="fixed bottom-24 right-6 z-50 max-w-[260px] animate-in fade-in slide-in-from-bottom-2 duration-300"
                    style={{ animation: "chatTooltipIn 0.3s ease-out" }}
                >
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
                        {/* Header */}
                        <div className="bg-primary px-3 py-2 flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                                    {lastNewMessage.sender_type === "AI" ? (
                                        <Bot className="w-3.5 h-3.5 text-white" />
                                    ) : (
                                        <UserRound className="w-3.5 h-3.5 text-white" />
                                    )}
                                </div>
                                <span className="text-white text-xs font-medium truncate">
                                    {lastNewMessage.sender_name ||
                                        (lastNewMessage.sender_type === "AI"
                                            ? "GEN-HUB AI"
                                            : "Staff")}
                                </span>
                            </div>
                            <button
                                onClick={handleDismissTooltip}
                                className="w-5 h-5 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors shrink-0"
                                aria-label="Đóng thông báo"
                            >
                                <X className="w-3 h-3 text-white" />
                            </button>
                        </div>
                        {/* Body */}
                        <div
                            className="px-3 py-2.5 text-sm text-slate-700 leading-relaxed cursor-pointer hover:bg-slate-50 transition-colors"
                            onClick={handleOpen}
                        >
                            <div className="line-clamp-3 overflow-hidden text-ellipsis [&_p]:inline [&_br]:content-[' ']">
                                {/<[a-z][\s\S]*>/i.test(lastNewMessage.content) ? (
                                    <span
                                        dangerouslySetInnerHTML={{ __html: lastNewMessage.content }}
                                    />
                                ) : (
                                    parseMarkdown(lastNewMessage.content)
                                )}
                            </div>
                        </div>
                        {/* Arrow */}
                        <div className="absolute -bottom-2 right-7 w-4 h-4 bg-white border-r border-b border-slate-100 rotate-45" />
                    </div>
                </div>
            )}

            {/* Chat Button (FAB) */}
            <button
                onClick={handleOpen}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-dark transition-all duration-300 ${isOpen ? "scale-0 opacity-0" : "scale-100 opacity-100"
                    }`}
            >
                <MessageCircle className="w-6 h-6" />
                {/* Notification Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Chat Window */}
            <div
                className={`fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${isOpen
                        ? "opacity-100 translate-y-0 scale-100"
                        : "opacity-0 translate-y-4 scale-95 pointer-events-none"
                    }`}
                style={{
                    height: "min(600px, calc(100vh - 100px))",
                    maxHeight: "calc(100vh - 100px)",
                }}
            >
                {/* Header */}
                <div className="bg-primary text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-sm">Tư vấn kho bãi</h4>
                            <p className="text-xs text-white/80 flex items-center gap-1">
                                {isConnected ? (
                                    <>
                                        <Wifi className="w-3 h-3" />
                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                                        Đang kết nối
                                    </>
                                ) : chatStarted ? (
                                    <>
                                        <WifiOff className="w-3 h-3" />
                                        Đang kết nối lại...
                                    </>
                                ) : (
                                    <>
                                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                                        Bot tự động
                                    </>
                                )}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        aria-label="Đóng chatbot"
                        title="Đóng chatbot"
                        className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-col" style={{ height: "calc(100% - 60px)" }}>
                    {mode === "lead-form" && renderLeadForm()}
                    {mode === "appointment" && renderAppointmentForm()}
                    {mode === "bot" && renderChatContent()}
                </div>
            </div>
        </>
    );
}

// ---------------------------------------------------------------------------
// Public export – switches between chatbot providers based on env
// ---------------------------------------------------------------------------
/**
 * Smart Chatbot component that renders the appropriate chatbot based on
 * the `NEXT_PUBLIC_CHATBOT_PROVIDER` environment variable.
 *
 * - `"api"`  → Original custom API chatbot (PrimeNest live-chat)
 * - `"coze"` → Coze AI embedded chatbot (default)
 * - `"dify"` → Dify AI embedded chatbot
 */
export function PrimeNestChatbot() {
    switch (CHATBOT_PROVIDER) {
        case "api":
            return <ApiChatbot />;
        case "dify":
            return <DifyChatbot />;
        case "coze":
        default:
            return <CozeChatbot />;
    }
}

"use client";

import React, { useState, useRef, useEffect } from "react";
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
    date: string;
    time: string;
    warehouseType: string;
    note: string;
}

type ChatMode = 'bot' | 'appointment' | 'lead-form';

const quickReplies: QuickReply[] = [
    {
        id: 'area',
        label: 'Diện tích',
        icon: <Ruler className="w-3 h-3" />,
        message: 'Tôi muốn hỏi về các diện tích kho có sẵn'
    },
    {
        id: 'price',
        label: 'Giá thuê',
        icon: <DollarSign className="w-3 h-3" />,
        message: 'Cho tôi hỏi về giá thuê kho'
    },
    {
        id: 'location',
        label: 'Vị trí',
        icon: <MapPin className="w-3 h-3" />,
        message: 'Các kho của bạn ở đâu?'
    },
    {
        id: 'time',
        label: 'Thời gian',
        icon: <Clock className="w-3 h-3" />,
        message: 'Thời gian thuê tối thiểu là bao lâu?'
    }
];

function formatTime(dateStr: string) {
    try {
        const d = new Date(dateStr);
        return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

export function PrimeNestChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<ChatMode>('bot');
    const [inputValue, setInputValue] = useState('');
    const [leadForm, setLeadForm] = useState<LeadForm>({ name: '', phone: '', email: '', note: '' });
    const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>({
        name: '', phone: '', date: '', time: '', warehouseType: '', note: ''
    });
    const [formSubmitted, setFormSubmitted] = useState(false);
    const [chatStarted, setChatStarted] = useState(false);

    const {
        messages,
        sessionId,
        isConnected,
        isLoading,
        isSending,
        unreadCount,
        startChat,
        sendMessage,
        resetUnread,
    } = useLiveChat();

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Auto scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus input when opening
    useEffect(() => {
        if (isOpen && mode === 'bot') {
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

    const handleOpen = () => {
        setIsOpen(true);
        resetUnread();
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim() || isSending) return;

        const content = inputValue.trim();
        setInputValue('');

        // Nếu chưa start session → start với initialMessage
        if (!chatStarted || !sessionId) {
            setChatStarted(true);
            try {
                await startChat(content);
            } catch (err) {
                console.error('Failed to start chat:', err);
                setChatStarted(false);
            }
            return;
        }

        // Đã có session → gửi message bình thường
        try {
            await sendMessage(content);
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    const handleQuickReply = async (reply: QuickReply) => {
        setInputValue('');

        if (!chatStarted || !sessionId) {
            setChatStarted(true);
            try {
                await startChat(reply.message);
            } catch (err) {
                console.error('Failed to start chat:', err);
                setChatStarted(false);
            }
            return;
        }

        try {
            await sendMessage(reply.message);
        } catch (err) {
            console.error('Failed to send message:', err);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleLeadFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Lead form submitted:', leadForm);
        setFormSubmitted(true);
        setTimeout(() => {
            setFormSubmitted(false);
            setMode('bot');
            setLeadForm({ name: '', phone: '', email: '', note: '' });
        }, 2000);
    };

    const handleAppointmentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Appointment submitted:', appointmentForm);
        setFormSubmitted(true);
        setTimeout(() => {
            setFormSubmitted(false);
            setMode('bot');
            setAppointmentForm({ name: '', phone: '', date: '', time: '', warehouseType: '', note: '' });
        }, 2000);
    };

    const goBackToBot = () => {
        setMode('bot');
        setFormSubmitted(false);
    };

    const renderMessage = (message: LiveChatMessage) => {
        const isCustomer = message.sender_type === 'CUSTOMER';
        const isAI = message.sender_type === 'AI';

        return (
            <div key={message.id} className={`flex gap-2 mb-3 ${isCustomer ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isCustomer
                    ? 'bg-primary text-white'
                    : isAI
                        ? 'bg-violet-100 text-violet-600'
                        : 'bg-blue-100 text-blue-600'
                    }`}>
                    {isCustomer ? <User className="w-4 h-4" /> : isAI ? <Bot className="w-4 h-4" /> : <UserRound className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isCustomer
                    ? 'bg-primary text-white rounded-tr-sm'
                    : isAI
                        ? 'bg-violet-50 text-slate-800 rounded-tl-sm border border-violet-100'
                        : 'bg-blue-50 text-slate-800 rounded-tl-sm border border-blue-100'
                    }`}>
                    {/* Sender label for AI/Staff */}
                    {!isCustomer && (
                        <div className={`text-[10px] font-medium mb-0.5 ${isAI ? 'text-violet-500' : 'text-blue-500'}`}>
                            {message.sender_name}
                        </div>
                    )}
                    <div className="whitespace-pre-line">{message.content}</div>
                    <div className={`text-[10px] mt-1 ${isCustomer ? 'text-white/70' : 'text-slate-400'}`}>
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
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
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

            <h3 className="text-lg font-semibold text-slate-800 mb-1">Để lại thông tin</h3>
            <p className="text-sm text-slate-500 mb-4">Chúng tôi sẽ liên hệ tư vấn cho bạn</p>

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
                        onChange={e => setLeadForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <input
                        type="tel"
                        placeholder="Số điện thoại *"
                        required
                        value={leadForm.phone}
                        onChange={e => setLeadForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <input
                        type="email"
                        placeholder="Email"
                        value={leadForm.email}
                        onChange={e => setLeadForm(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <textarea
                        placeholder="Ghi chú (nhu cầu, diện tích mong muốn...)"
                        value={leadForm.note}
                        onChange={e => setLeadForm(prev => ({ ...prev, note: e.target.value }))}
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

            <h3 className="text-lg font-semibold text-slate-800 mb-1">Đặt lịch xem kho</h3>
            <p className="text-sm text-slate-500 mb-4">Chọn thời gian phù hợp với bạn</p>

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
                        onChange={e => setAppointmentForm(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <input
                        type="tel"
                        placeholder="Số điện thoại *"
                        required
                        value={appointmentForm.phone}
                        onChange={e => setAppointmentForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <div className="grid grid-cols-2 gap-2">
                        <input
                            type="date"
                            required
                            value={appointmentForm.date}
                            onChange={e => setAppointmentForm(prev => ({ ...prev, date: e.target.value }))}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                        />
                        <select
                            required
                            value={appointmentForm.time}
                            onChange={e => setAppointmentForm(prev => ({ ...prev, time: e.target.value }))}
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
                        value={appointmentForm.warehouseType}
                        onChange={e => setAppointmentForm(prev => ({ ...prev, warehouseType: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    >
                        <option value="">Loại kho quan tâm</option>
                        <option value="kho-thuong">Kho thường</option>
                        <option value="kho-mat">Kho mát</option>
                        <option value="kho-lanh">Kho lạnh</option>
                        <option value="kho-chuyen-dung">Kho chuyên dụng</option>
                    </select>
                    <textarea
                        placeholder="Ghi chú thêm..."
                        value={appointmentForm.note}
                        onChange={e => setAppointmentForm(prev => ({ ...prev, note: e.target.value }))}
                        className="w-full px-3 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
                        rows={2}
                    />
                    <button
                        type="submit"
                        className="w-full bg-primary text-white py-2.5 rounded-lg font-medium hover:bg-primary-dark transition-colors flex items-center justify-center gap-2"
                    >
                        <Calendar className="w-4 h-4" />
                        Đặt lịch hẹn
                    </button>
                </form>
            )}
        </div>
    );

    const renderChatContent = () => (
        <>
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {/* Greeting khi chưa có message nào */}
                {messages.length === 0 && !isLoading && (
                    <div className="flex gap-2 mb-3">
                        <div className="w-7 h-7 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                            <Bot className="w-4 h-4 text-violet-600" />
                        </div>
                        <div className="max-w-[75%] px-3 py-2 rounded-2xl rounded-tl-sm bg-violet-50 text-slate-800 text-sm border border-violet-100">
                            <div className="text-[10px] font-medium mb-0.5 text-violet-500">
                                GEN-HUB AI
                            </div>
                            <div className="whitespace-pre-line">
                                Xin chào! 👋 Tôi là trợ lý tư vấn kho bãi của GenHub. Tôi có thể giúp bạn tìm kiếm kho phù hợp với nhu cầu. Bạn cần hỗ trợ gì ạ?
                            </div>
                        </div>
                    </div>
                )}

                {/* Loading history */}
                {isLoading && messages.length === 0 && (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                        <span className="ml-2 text-sm text-slate-500">Đang tải lịch sử...</span>
                    </div>
                )}

                {messages.map(renderMessage)}
                {isSending && renderTypingIndicator()}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies - chỉ hiện khi chưa chat */}
            {messages.length <= 1 && !isSending && !isLoading && (
                <div className="px-4 pb-2">
                    <p className="text-xs text-slate-500 mb-2">Câu hỏi phổ biến:</p>
                    <div className="flex flex-wrap gap-1.5">
                        {quickReplies.map(reply => (
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

            {/* Action Buttons */}
            <div className="px-4 pb-2">
                <div className="flex gap-2">
                    <button
                        onClick={() => setMode('appointment')}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-medium rounded-lg transition-colors"
                    >
                        <Calendar className="w-3.5 h-3.5" />
                        Đặt lịch xem kho
                    </button>
                    <button
                        onClick={() => setMode('lead-form')}
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
                        onChange={e => setInputValue(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder={chatStarted ? "Nhập tin nhắn..." : "Nhập để bắt đầu chat..."}
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
            {/* Chat Button (FAB) */}
            <button
                onClick={handleOpen}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-dark transition-all duration-300 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
                    }`}
            >
                <MessageCircle className="w-6 h-6" />
                {/* Notification Badge */}
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Chat Window */}
            <div className={`fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-48px)] bg-white rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 ${isOpen
                ? 'opacity-100 translate-y-0 scale-100'
                : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
                }`}
                style={{
                    height: 'min(600px, calc(100vh - 100px))',
                    maxHeight: 'calc(100vh - 100px)'
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
                        className="w-8 h-8 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex flex-col" style={{ height: 'calc(100% - 60px)' }}>
                    {mode === 'lead-form' && renderLeadForm()}
                    {mode === 'appointment' && renderAppointmentForm()}
                    {mode === 'bot' && renderChatContent()}
                </div>
            </div>
        </>
    );
}

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
    Loader2
} from "lucide-react";

const CLAUDE_API_KEY = ""; // Thêm API key Claude của bạn vào đây
const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";

interface Message {
    id: string;
    type: 'user' | 'bot' | 'system';
    content: string;
    timestamp: Date;
    isTyping?: boolean;
}

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

type ChatMode = 'bot' | 'live' | 'appointment' | 'lead-form';

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

const botResponses: Record<string, string> = {
    'diện tích': `Chúng tôi có nhiều lựa chọn diện tích kho:
• **Kho nhỏ:** 50 - 100m² (phù hợp startup, hàng nhẹ)
• **Kho vừa:** 100 - 500m² (phù hợp SME)
• **Kho lớn:** 500 - 2000m² (phù hợp doanh nghiệp lớn)
• **Kho siêu lớn:** Trên 2000m² (theo yêu cầu)

Bạn cần diện tích khoảng bao nhiêu ạ?`,

    'giá': `Giá thuê kho phụ thuộc vào nhiều yếu tố:
• **Vị trí:** Khu vực trung tâm/ngoại thành
• **Loại kho:** Kho thường/kho mát/kho lạnh
• **Diện tích:** Thuê nhiều có ưu đãi
• **Thời hạn:** Thuê dài hạn giá tốt hơn

**Giá tham khảo:**
• Kho thường: từ 80.000đ/m²/tháng
• Kho mát: từ 150.000đ/m²/tháng
• Kho lạnh: từ 250.000đ/m²/tháng

Bạn muốn tìm hiểu loại kho nào?`,

    'vị trí': `Hệ thống kho của chúng tôi phân bố tại:

**TP. Hồ Chí Minh:**
• Quận 7, Quận 9, Thủ Đức
• Bình Tân, Bình Chánh, Củ Chi

**Hà Nội:**
• Long Biên, Gia Lâm
• Thanh Trì, Hoàng Mai

**Các tỉnh:**
• Bình Dương, Đồng Nai, Long An

Bạn đang tìm kho ở khu vực nào?`,

    'thời gian': `Thời gian thuê kho linh hoạt:
• **Tối thiểu:** 1 tháng
• **Ngắn hạn:** 1-6 tháng
• **Trung hạn:** 6-12 tháng
• **Dài hạn:** Trên 12 tháng (ưu đãi đặc biệt)

Thuê dài hạn sẽ được hưởng:
✓ Giảm giá 5-15%
✓ Miễn phí setup ban đầu
✓ Hỗ trợ vận hành 24/7

Bạn dự định thuê trong bao lâu?`,

    'default': `Cảm ơn bạn đã liên hệ! 

Tôi có thể hỗ trợ bạn về:
• Thông tin diện tích kho
• Báo giá thuê kho
• Vị trí các kho
• Thời gian & điều khoản thuê

Hoặc bạn có thể:
• Đặt lịch xem kho trực tiếp
• Chat với nhân viên tư vấn
• Để lại thông tin để được gọi lại

Bạn cần hỗ trợ gì ạ?`
};

async function getAIResponse(userMessage: string, conversationHistory: Message[]): Promise<string> {
    // Nếu không có API key, sử dụng responses có sẵn
    if (!CLAUDE_API_KEY) {
        return getFallbackResponse(userMessage);
    }

    try {
        const messages = conversationHistory
            .filter(m => m.type !== 'system' && !m.isTyping)
            .map(m => ({
                role: m.type === 'user' ? 'user' : 'assistant',
                content: m.content
            }));

        messages.push({ role: 'user', content: userMessage });

        const response = await fetch(CLAUDE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': CLAUDE_API_KEY,
                'anthropic-version': '2023-06-01'
            },
            body: JSON.stringify({
                model: 'claude-3-haiku-20240307',
                max_tokens: 1024,
                system: `Bạn là trợ lý tư vấn kho bãi của GenHub - nền tảng cho thuê kho chuyên nghiệp.
Nhiệm vụ: Tư vấn khách hàng về thuê kho (diện tích, giá, vị trí, thời gian).
Phong cách: Thân thiện, chuyên nghiệp, ngắn gọn, dễ hiểu.
Luôn trả lời bằng tiếng Việt.
Khi khách hỏi giá cụ thể, khuyến khích để lại thông tin hoặc đặt lịch xem kho.`,
                messages: messages
            })
        });

        if (!response.ok) {
            throw new Error('API request failed');
        }

        const data = await response.json();
        return data.content[0].text;
    } catch (error) {
        console.error('AI API Error:', error);
        return getFallbackResponse(userMessage);
    }
}

function getFallbackResponse(message: string): string {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('diện tích') || lowerMessage.includes('m2') || lowerMessage.includes('mét vuông')) {
        return botResponses['diện tích'];
    }
    if (lowerMessage.includes('giá') || lowerMessage.includes('phí') || lowerMessage.includes('bao nhiêu')) {
        return botResponses['giá'];
    }
    if (lowerMessage.includes('vị trí') || lowerMessage.includes('ở đâu') || lowerMessage.includes('địa chỉ')) {
        return botResponses['vị trí'];
    }
    if (lowerMessage.includes('thời gian') || lowerMessage.includes('bao lâu') || lowerMessage.includes('tháng')) {
        return botResponses['thời gian'];
    }

    return botResponses['default'];
}

export function PrimeNestChatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<ChatMode>('bot');
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '1',
            type: 'bot',
            content: 'Xin chào! 👋 Tôi là trợ lý tư vấn kho bãi của GenHub. Tôi có thể giúp bạn tìm kiếm kho phù hợp với nhu cầu. Bạn cần hỗ trợ gì ạ?',
            timestamp: new Date()
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [leadForm, setLeadForm] = useState<LeadForm>({ name: '', phone: '', email: '', note: '' });
    const [appointmentForm, setAppointmentForm] = useState<AppointmentForm>({
        name: '', phone: '', date: '', time: '', warehouseType: '', note: ''
    });
    const [formSubmitted, setFormSubmitted] = useState(false);

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

    const generateId = () => Math.random().toString(36).substr(2, 9);

    const addMessage = (type: Message['type'], content: string) => {
        const newMessage: Message = {
            id: generateId(),
            type,
            content,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, newMessage]);
        return newMessage;
    };

    const simulateTyping = async (response: string) => {
        setIsTyping(true);

        // Simulate typing delay (50-100ms per character, max 3s)
        const typingDelay = Math.min(response.length * 30, 3000);
        await new Promise(resolve => setTimeout(resolve, typingDelay));

        setIsTyping(false);
        addMessage('bot', response);
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userMessage = inputValue.trim();
        setInputValue('');
        addMessage('user', userMessage);

        // Get AI or fallback response
        const response = await getAIResponse(userMessage, messages);
        await simulateTyping(response);
    };

    const handleQuickReply = async (reply: QuickReply) => {
        addMessage('user', reply.message);
        const response = await getAIResponse(reply.message, messages);
        await simulateTyping(response);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const switchToLiveChat = () => {
        setMode('live');
        addMessage('system', '🔄 Đang kết nối với nhân viên tư vấn...');
        setTimeout(() => {
            addMessage('bot', 'Xin chào! Tôi là Minh - nhân viên tư vấn của GenHub. Tôi có thể hỗ trợ gì cho bạn ạ?');
        }, 2000);
    };

    const handleLeadFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        console.log('Lead form submitted:', leadForm);
        setFormSubmitted(true);
        setTimeout(() => {
            setFormSubmitted(false);
            setMode('bot');
            addMessage('system', '✅ Thông tin của bạn đã được ghi nhận. Chúng tôi sẽ liên hệ trong vòng 24h!');
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
            addMessage('system', `✅ Đã đặt lịch xem kho thành công!
📅 Ngày: ${appointmentForm.date}
⏰ Giờ: ${appointmentForm.time}
Chúng tôi sẽ gọi xác nhận lịch hẹn sớm nhất!`);
            setAppointmentForm({ name: '', phone: '', date: '', time: '', warehouseType: '', note: '' });
        }, 2000);
    };

    const goBackToBot = () => {
        setMode('bot');
        setFormSubmitted(false);
    };

    const renderMessage = (message: Message) => {
        const isUser = message.type === 'user';
        const isSystem = message.type === 'system';

        if (isSystem) {
            return (
                <div key={message.id} className="flex justify-center my-2">
                    <div className="bg-slate-100 text-slate-600 text-xs px-3 py-1.5 rounded-full">
                        {message.content}
                    </div>
                </div>
            );
        }

        return (
            <div key={message.id} className={`flex gap-2 mb-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
                {/* Avatar */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${isUser ? 'bg-primary text-white' : 'bg-slate-100 text-primary'
                    }`}>
                    {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${isUser
                        ? 'bg-primary text-white rounded-tr-sm'
                        : 'bg-slate-100 text-slate-800 rounded-tl-sm'
                    }`}>
                    <div className="whitespace-pre-line" dangerouslySetInnerHTML={{
                        __html: message.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    }} />
                    <div className={`text-[10px] mt-1 ${isUser ? 'text-white/70' : 'text-slate-400'}`}>
                        {message.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                </div>
            </div>
        );
    };

    const renderTypingIndicator = () => (
        <div className="flex gap-2 mb-3">
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary" />
            </div>
            <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm">
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
                {messages.map(renderMessage)}
                {isTyping && renderTypingIndicator()}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Replies */}
            {messages.length <= 2 && !isTyping && (
                <div className="px-4 pb-2">
                    <p className="text-xs text-slate-500 mb-2">Câu hỏi phổ biến:</p>
                    <div className="flex flex-wrap gap-1.5">
                        {quickReplies.map(reply => (
                            <button
                                key={reply.id}
                                onClick={() => handleQuickReply(reply)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-full transition-colors"
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
                        onKeyPress={handleKeyPress}
                        placeholder="Nhập tin nhắn..."
                        disabled={isTyping}
                        className="flex-1 px-4 py-2.5 bg-slate-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim() || isTyping}
                        className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isTyping ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Send className="w-4 h-4" />
                        )}
                    </button>
                </div>

                {/* Live Chat Option */}
                {mode === 'bot' && (
                    <button
                        onClick={switchToLiveChat}
                        className="w-full mt-2 text-xs text-slate-500 hover:text-primary transition-colors"
                    >
                        💬 Chat với nhân viên tư vấn
                    </button>
                )}
            </div>
        </>
    );

    return (
        <>
            {/* Chat Button */}
            <button
                onClick={() => setIsOpen(true)}
                className={`fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary text-white rounded-full shadow-lg flex items-center justify-center hover:bg-primary-dark transition-all duration-300 ${isOpen ? 'scale-0 opacity-0' : 'scale-100 opacity-100'
                    }`}
            >
                <MessageCircle className="w-6 h-6" />
                {/* Notification Badge */}
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    1
                </span>
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
                            <h4 className="font-semibold text-sm">
                                {mode === 'live' ? 'Nhân viên tư vấn' : 'Tư vấn kho bãi'}
                            </h4>
                            <p className="text-xs text-white/80 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                                {mode === 'live' ? 'Đang online' : 'Bot tự động'}
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
                    {(mode === 'bot' || mode === 'live') && renderChatContent()}
                </div>
            </div>
        </>
    );
}

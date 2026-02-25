'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { liveChatService } from '@/services/live-chat/live-chat.service';
import {
    LiveChatMessage,
    WsMessageCreatedPayload,
} from '@/types/live-chat/live-chat.type';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '';
const CHAT_UID_KEY =
    process.env.NEXT_PUBLIC_CHAT_UID_KEY || 'genhub_chat_uid';
const CHAT_SESSION_KEY =
    process.env.NEXT_PUBLIC_CHAT_SESSION_KEY || 'genhub_chat_session';
const CHAT_AUTO_START_DELAY = Number(
    process.env.NEXT_PUBLIC_CHAT_AUTO_START_DELAY || '10000'
);


// Tạo hoặc lấy UID từ localStorage
function getOrCreateUid(): string {
    if (typeof window === 'undefined') return '';
    let uid = localStorage.getItem(CHAT_UID_KEY);
    if (!uid) {
        uid = crypto.randomUUID();
        localStorage.setItem(CHAT_UID_KEY, uid);
    }
    return uid;
}

function getSavedSessionId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(CHAT_SESSION_KEY);
}

function saveSessionId(sessionId: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CHAT_SESSION_KEY, sessionId);
}

export interface UseLiveChatReturn {
    messages: LiveChatMessage[];
    sessionId: string | null;
    isConnected: boolean;
    isLoading: boolean;
    isSending: boolean;
    welcomeMessage: string | null;
    unreadCount: number;
    isAutoStarted: boolean;
    lastNewMessage: LiveChatMessage | null;
    clearLastNewMessage: () => void;
    startChat: (initialMessage?: string) => Promise<void>;
    sendMessage: (content: string) => Promise<void>;
    resetUnread: () => void;
}

// Phát âm thanh notification
function playNotificationSound() {
    try {
        const audio = new Audio('/live-chat-notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
            // Bỏ qua lỗi nếu trình duyệt chặn autoplay
        });
    } catch {
        // Ignore
    }
}

export function useLiveChat(): UseLiveChatReturn {
    const [messages, setMessages] = useState<LiveChatMessage[]>([]);
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isAutoStarted, setIsAutoStarted] = useState(false);
    const [lastNewMessage, setLastNewMessage] = useState<LiveChatMessage | null>(null);

    const socketRef = useRef<Socket | null>(null);
    const sessionIdRef = useRef<string | null>(null);

    // Sync ref with state
    useEffect(() => {
        sessionIdRef.current = sessionId;
    }, [sessionId]);

    // --- WebSocket setup ---
    const connectWebSocket = useCallback((sid: string) => {
        // Disconnect existing
        if (socketRef.current) {
            socketRef.current.disconnect();
        }

        const socket = io(API_URL, {
            transports: ['polling', 'websocket'],
            // Guest không cần auth
        });

        socket.on('connect', () => {
            console.log('[LiveChat] Socket connected, socket.id:', socket.id);
            setIsConnected(true);
            // Join chat room
            socket.emit('chat:join', { sessionId: sid });
            console.log('[LiveChat] Emitted chat:join with sessionId:', sid);
        });

        socket.on('chat:joined', (data: unknown) => {
            console.log('[LiveChat] chat:joined event received:', data);
        });

        socket.on('contact:messageCreated', (data: WsMessageCreatedPayload) => {
            console.log('[LiveChat] contact:messageCreated event received:', JSON.stringify(data, null, 2));
            const msg = data.message;
            console.log('[LiveChat] Message sender_type:', msg.sender_type, 'content:', msg.content);
            // Chỉ append tin nhắn từ STAFF hoặc AI (guest messages đã được thêm optimistically)
            if (msg.sender_type !== 'CUSTOMER') {
                setMessages((prev) => {
                    // Tránh duplicate
                    if (prev.some((m) => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
                setUnreadCount((prev) => prev + 1);
                // Lưu tin nhắn mới nhất để hiển thị tooltip khi chat đang đóng
                setLastNewMessage(msg);
                // Phát âm thanh thông báo
                playNotificationSound();
            }
        });

        socket.on('chat:error', (err: { code: string; message: string }) => {
            console.error('[LiveChat] chat:error event received:', err);
        });

        socket.on('disconnect', (reason: string) => {
            console.log('[LiveChat] Socket disconnected, reason:', reason);
            setIsConnected(false);
        });

        socket.on('connect_error', (err: Error) => {
            console.error('[LiveChat] connect_error:', err.message);
            setIsConnected(false);
        });

        // Log tất cả events nhận được từ server
        socket.onAny((eventName: string, ...args: unknown[]) => {
            console.log('[LiveChat] [onAny] Event:', eventName, 'Data:', args);
        });

        socketRef.current = socket;
    }, []);

    // --- Resume session on mount ---
    useEffect(() => {
        const savedSessionId = getSavedSessionId();
        if (savedSessionId) {
            setIsLoading(true);
            liveChatService
                .getChatHistory(savedSessionId)
                .then((res) => {
                    if (res.success && res.data) {
                        setSessionId(savedSessionId);
                        setMessages(res.data.messages || []);
                        connectWebSocket(savedSessionId);
                    }
                })
                .catch((err) => {
                    console.error('[LiveChat] Failed to resume session:', err);
                    // Session invalid, clear it
                    localStorage.removeItem(CHAT_SESSION_KEY);
                })
                .finally(() => {
                    setIsLoading(false);
                });
        }

        return () => {
            if (socketRef.current) {
                const sid = sessionIdRef.current;
                if (sid) {
                    socketRef.current.emit('chat:leave', { sessionId: sid });
                }
                socketRef.current.disconnect();
                socketRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // --- Start a new chat session ---
    const startChat = useCallback(
        async (initialMessage?: string) => {
            if (sessionId) return; // Already has a session

            setIsLoading(true);
            try {
                const uid = getOrCreateUid();
                const res = await liveChatService.startChatSession(
                    uid,
                    initialMessage
                );

                if (res.success && res.data) {
                    const sid = res.data.sessionId;
                    setSessionId(sid);
                    saveSessionId(sid);

                    if (res.data.welcomeMessage) {
                        setWelcomeMessage(res.data.welcomeMessage);
                        // Add welcome message as first message
                        const welcomeMsg: LiveChatMessage = {
                            id: `welcome-${Date.now()}`,
                            sender_type: 'AI',
                            sender_name: 'GEN-HUB AI',
                            content: res.data.welcomeMessage,
                            created_at: new Date().toISOString(),
                        };
                        setMessages([welcomeMsg]);
                    }

                    connectWebSocket(sid);
                }
            } catch (err) {
                console.error('[LiveChat] Failed to start chat:', err);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        [sessionId, connectWebSocket]
    );

    // --- Auto-start chat after delay (nếu chưa có session trong localStorage) ---
    useEffect(() => {
        if (typeof window === 'undefined') return;
        // Disabled if delay is 0 or negative
        if (CHAT_AUTO_START_DELAY <= 0) return;
        // Already has a session (resumed or started)
        if (sessionId) return;
        // Nếu localStorage đã có session id thì không auto-start
        if (getSavedSessionId()) return;

        const timer = setTimeout(async () => {
            // Double-check session hasn't been created while waiting
            if (sessionIdRef.current) return;
            try {
                await startChat();
                setIsAutoStarted(true);
            } catch (err) {
                console.error('[LiveChat] Auto-start failed:', err);
            }
        }, CHAT_AUTO_START_DELAY);

        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId, startChat]);

    // --- Send message ---
    const sendMessage = useCallback(
        async (content: string) => {
            if (!sessionId || !content.trim()) return;

            // Optimistic: thêm tin nhắn vào UI ngay
            const optimisticMsg: LiveChatMessage = {
                id: `temp-${Date.now()}`,
                sender_type: 'CUSTOMER',
                sender_name: 'Bạn',
                content: content.trim(),
                created_at: new Date().toISOString(),
            };
            setMessages((prev) => [...prev, optimisticMsg]);

            setIsSending(true);
            try {
                const res = await liveChatService.sendMessage(
                    sessionId,
                    content.trim()
                );
                console.log('[LiveChat] sendMessage REST response:', JSON.stringify(res, null, 2));

                if (res.success && res.data) {
                    // Replace optimistic message with real one
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === optimisticMsg.id ? res.data.message : m
                        )
                    );

                    // Nếu có aiResponse trong REST response (AI sync reply)
                    if (res.data.aiResponse) {
                        setMessages((prev) => {
                            if (
                                prev.some(
                                    (m) => m.id === res.data.aiResponse!.id
                                )
                            )
                                return prev;
                            return [...prev, res.data.aiResponse!];
                        });
                    }
                }
            } catch (err) {
                console.error('[LiveChat] Failed to send message:', err);
                // Remove optimistic message on error
                setMessages((prev) =>
                    prev.filter((m) => m.id !== optimisticMsg.id)
                );
                throw err;
            } finally {
                setIsSending(false);
            }
        },
        [sessionId]
    );

    const resetUnread = useCallback(() => {
        setUnreadCount(0);
    }, []);

    const clearLastNewMessage = useCallback(() => {
        setLastNewMessage(null);
    }, []);

    return {
        messages,
        sessionId,
        isConnected,
        isLoading,
        isSending,
        welcomeMessage,
        unreadCount,
        isAutoStarted,
        lastNewMessage,
        clearLastNewMessage,
        startChat,
        sendMessage,
        resetUnread,
    };
}

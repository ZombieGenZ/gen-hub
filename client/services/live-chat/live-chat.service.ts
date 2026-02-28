// Live Chat Service – Public REST APIs (no auth required)

import {
    StartChatResponse,
    SendMessageResponse,
    ChatSessionResponse,
} from '@/types/live-chat/live-chat.type';

const API = process.env.NEXT_PUBLIC_API_URL;

class LiveChatService {
    /**
     * Tạo phiên chat mới cho guest
     */
    async startChatSession(
        uid: string,
        initialMessage?: string,
        token?: string
    ): Promise<StartChatResponse> {
        const body: Record<string, string> = { uid };
        if (initialMessage) {
            body.initialMessage = initialMessage;
        }

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${API}/contact/chat/start`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(
                errorData?.message || `Start chat failed: ${response.status}`
            );
        }

        return response.json();
    }

    /**
     * Guest gửi tin nhắn
     */
    async sendMessage(
        sessionId: string,
        content: string,
        token?: string
    ): Promise<SendMessageResponse> {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(
            `${API}/contact/chat/${sessionId}/message`,
            {
                method: 'POST',
                headers,
                body: JSON.stringify({ content }),
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(
                errorData?.message || `Send message failed: ${response.status}`
            );
        }

        return response.json();
    }

    /**
     * Lấy lịch sử chat của session
     */
    async getChatHistory(sessionId: string, token?: string): Promise<ChatSessionResponse> {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(
            `${API}/contact/chat/${sessionId}`,
            {
                method: 'GET',
                headers,
            }
        );

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(
                errorData?.message || `Get history failed: ${response.status}`
            );
        }

        return response.json();
    }
}

export const liveChatService = new LiveChatService();

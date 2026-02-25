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
        initialMessage?: string
    ): Promise<StartChatResponse> {
        const body: Record<string, string> = { uid };
        if (initialMessage) {
            body.initialMessage = initialMessage;
        }

        const response = await fetch(`${API}/contact/chat/start`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        content: string
    ): Promise<SendMessageResponse> {
        const response = await fetch(
            `${API}/contact/chat/${sessionId}/message`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
    async getChatHistory(sessionId: string): Promise<ChatSessionResponse> {
        const response = await fetch(
            `${API}/contact/chat/${sessionId}`,
            {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
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

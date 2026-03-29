// ────────────────────────────────────────────────
// Organization Chat Service
// Route: /organizations/:orgId/chat
// ────────────────────────────────────────────────

import type {
    RtmTokenResponse,
    RtcTokenResponse,
    ChatMessagesPaginated,
    SyncMessageItem,
    SyncMessagesResponse,
    ChatCallsPaginated,
    ChatCall,
    StartCallResponse,
    JoinCallResponse,
    CallType,
    QueryMessagesParams,
    QueryCallsParams,
} from './org-chat.types';

const API = process.env.NEXT_PUBLIC_API_URL;

export class OrgChatService {
    private getHeaders(token: string): HeadersInit {
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        };
    }

    // ==================== TOKENS ====================

    /**
     * Lấy Agora RTM token cho chat messaging
     * GET /organizations/:orgId/chat/token/rtm
     */
    async getRtmToken(token: string, orgId: string): Promise<RtmTokenResponse> {
        const response = await fetch(`${API}/organizations/${orgId}/chat/token/rtm`, {
            method: 'GET',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy RTM token');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy Agora RTC token cho video/voice call
     * GET /organizations/:orgId/chat/token/rtc/:callId
     */
    async getRtcToken(token: string, orgId: string, callId: string): Promise<RtcTokenResponse> {
        const response = await fetch(`${API}/organizations/${orgId}/chat/token/rtc/${callId}`, {
            method: 'GET',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy RTC token');
        }

        const res = await response.json();
        return res.data;
    }

    // ==================== MESSAGES ====================

    /**
     * Lấy danh sách tin nhắn chat
     * GET /organizations/:orgId/chat/messages
     */
    async getMessages(token: string, orgId: string, params: QueryMessagesParams = {}): Promise<ChatMessagesPaginated> {
        const query = new URLSearchParams();

        if (params.limit) query.append('limit', String(params.limit));
        if (params.offset !== undefined) query.append('offset', String(params.offset));
        if (params.keywords) query.append('keywords', params.keywords);

        const response = await fetch(`${API}/organizations/${orgId}/chat/messages?${query.toString()}`, {
            method: 'GET',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách tin nhắn');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Sync tin nhắn từ client về server (batch)
     * POST /organizations/:orgId/chat/messages/sync
     */
    async syncMessages(token: string, orgId: string, messages: SyncMessageItem[]): Promise<SyncMessagesResponse> {
        const response = await fetch(`${API}/organizations/${orgId}/chat/messages/sync`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify({ messages }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể sync tin nhắn');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Xóa tin nhắn
     * DELETE /organizations/:orgId/chat/messages/:id
     */
    async deleteMessage(token: string, orgId: string, messageId: string): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/chat/messages/${messageId}`, {
            method: 'DELETE',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể xóa tin nhắn');
        }
    }

    // ==================== CALLS ====================

    /**
     * Lấy danh sách cuộc gọi
     * GET /organizations/:orgId/chat/calls
     */
    async getCalls(token: string, orgId: string, params: QueryCallsParams = {}): Promise<ChatCallsPaginated> {
        const query = new URLSearchParams();

        if (params.limit) query.append('limit', String(params.limit));
        if (params.offset !== undefined) query.append('offset', String(params.offset));
        if (params.status) query.append('status', params.status);

        const response = await fetch(`${API}/organizations/${orgId}/chat/calls?${query.toString()}`, {
            method: 'GET',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy danh sách cuộc gọi');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Lấy cuộc gọi đang diễn ra
     * GET /organizations/:orgId/chat/calls/active
     */
    async getActiveCall(token: string, orgId: string): Promise<ChatCall | null> {
        const response = await fetch(`${API}/organizations/${orgId}/chat/calls/active`, {
            method: 'GET',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể lấy cuộc gọi đang diễn ra');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Bắt đầu cuộc gọi mới
     * POST /organizations/:orgId/chat/calls
     */
    async startCall(token: string, orgId: string, callType: CallType): Promise<StartCallResponse> {
        const response = await fetch(`${API}/organizations/${orgId}/chat/calls`, {
            method: 'POST',
            headers: this.getHeaders(token),
            body: JSON.stringify({ call_type: callType }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể bắt đầu cuộc gọi');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Tham gia cuộc gọi
     * POST /organizations/:orgId/chat/calls/:id/join
     */
    async joinCall(token: string, orgId: string, callId: string): Promise<JoinCallResponse> {
        const response = await fetch(`${API}/organizations/${orgId}/chat/calls/${callId}/join`, {
            method: 'POST',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể tham gia cuộc gọi');
        }

        const res = await response.json();
        return res.data;
    }

    /**
     * Rời cuộc gọi
     * POST /organizations/:orgId/chat/calls/:id/leave
     */
    async leaveCall(token: string, orgId: string, callId: string): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/chat/calls/${callId}/leave`, {
            method: 'POST',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể rời cuộc gọi');
        }
    }

    /**
     * Kết thúc cuộc gọi
     * POST /organizations/:orgId/chat/calls/:id/end
     */
    async endCall(token: string, orgId: string, callId: string): Promise<void> {
        const response = await fetch(`${API}/organizations/${orgId}/chat/calls/${callId}/end`, {
            method: 'POST',
            headers: this.getHeaders(token),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Không thể kết thúc cuộc gọi');
        }
    }
}

export const orgChatService = new OrgChatService();

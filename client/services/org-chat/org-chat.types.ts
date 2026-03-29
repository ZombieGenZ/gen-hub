// ────────────────────────────────────────────────
// Types cho Organization Chat API
// ────────────────────────────────────────────────

export type CallType = 'VIDEO' | 'VOICE';
export type CallStatus = 'ONGOING' | 'ENDED' | 'MISSED';

export interface RtmTokenResponse {
    token: string;
    user_id: string;
    expires_at: number;
}

export interface RtcTokenResponse {
    token: string;
    channel: string;
    uid: number;
    expires_at: number;
}

export interface ChatMessage {
    id: string;
    content: string;
    sender_id: string;
    sender?: {
        id: string;
        full_name: string;
        email: string;
    };
    agora_message_id?: string;
    sent_at: string;
}

export interface ChatMessagesPaginated {
    items: ChatMessage[];
    total: number;
    limit: number;
    offset: number;
}

export interface SyncMessageItem {
    agora_message_id: string;
    content: string;
    sent_at: string;
}

export interface SyncMessagesResponse {
    synced_count: number;
    messages: { id: string; agora_message_id: string }[];
}

export interface ChatCall {
    id: string;
    call_type: CallType;
    status: CallStatus;
    channel_name?: string;
    started_at?: string;
    ended_at?: string;
    participants_count?: number;
    started_by?: {
        id: string;
        full_name: string;
    };
}

export interface ChatCallsPaginated {
    items: ChatCall[];
    total: number;
    limit: number;
    offset: number;
}

export interface StartCallResponse {
    id: string;
    channel_name: string;
    token: string;
    uid: number;
}

export interface JoinCallResponse {
    id: string;
    channel_name: string;
    token: string;
    uid: number;
}

export interface QueryMessagesParams {
    limit?: number;
    offset?: number;
    keywords?: string;
}

export interface QueryCallsParams {
    limit?: number;
    offset?: number;
    status?: CallStatus;
}

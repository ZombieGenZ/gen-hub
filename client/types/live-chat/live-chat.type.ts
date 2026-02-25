// Types cho Guest Live Chat (Public APIs)

export interface LiveChatMessage {
    id: string;
    conversation_id?: string;
    sender_type: 'CUSTOMER' | 'STAFF' | 'AI';
    sender_name: string;
    content: string;
    message_type?: string;
    is_ai_response?: boolean;
    created_at: string;
}

export interface StartChatResponse {
    code: string;
    message: string;
    success: boolean;
    data: {
        sessionId: string;
        code: string;
        welcomeMessage?: string;
    };
}

export interface SendMessageResponse {
    code: string;
    message: string;
    success: boolean;
    data: {
        message: LiveChatMessage;
        aiResponse?: LiveChatMessage | null;
    };
}

export interface ChatSessionResponse {
    code: string;
    message: string;
    success: boolean;
    data: {
        id: string;
        code: string;
        session_id: string;
        customer_name: string;
        channel: string;
        status: string;
        messages: LiveChatMessage[];
    };
}

// WebSocket event payloads
export interface WsMessageCreatedPayload {
    conversationId: string;
    message: LiveChatMessage;
    timestamp: string;
}

export interface WsChatJoinedPayload {
    sessionId: string;
    room: string;
    timestamp: string;
}

export interface WsChatErrorPayload {
    code: string;
    message: string;
}

export interface WsConnectedPayload {
    socketId: string;
    userId: string | null;
    authenticated: boolean;
    timestamp: string;
}

/**
 * WebSocket Event Interfaces
 * Định nghĩa các interface cho socket events
 */

// ========================
// Server → Client Events
// ========================

/**
 * Event khi user logout khỏi 1 thiết bị
 */
export interface UserLogoutEvent {
    userId: string;
    tokenId: string;
    timestamp: string;
    message: string;
}

/**
 * Event khi user logout tất cả thiết bị
 */
export interface UserLogoutAllEvent {
    userId: string;
    timestamp: string;
    message: string;
    excludeSocketId: string | null;
}

/**
 * Event khi token bị revoke
 */
export interface UserTokenRevokedEvent {
    userId: string;
    reason: 'password_changed' | 'admin_revoke' | 'security_alert';
    timestamp: string;
    message: string;
}

/**
 * Event khi profile được cập nhật
 */
export interface UserProfileUpdatedEvent {
    userId: string;
    updatedFields: string[];
    profile: {
        id: string;
        name: string;
        email: string | null;
        language?: string;
    };
    timestamp: string;
}

// ========================
// Client → Server Events
// ========================

/**
 * Payload cho subscribe event
 */
export interface SubscribePayload {
    rooms: string[];
}

// ========================
// Error Event
// ========================

/**
 * Socket error event
 */
export interface SocketError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

// ========================
// Socket with Auth
// ========================

/**
 * Socket với user data đã authenticate
 */
export interface AuthenticatedSocket {
    id: string;
    userId?: string;
    handshake: {
        auth: {
            token?: string;
        };
    };
    join: (room: string) => void;
    leave: (room: string) => void;
    emit: (event: string, data: unknown) => void;
}

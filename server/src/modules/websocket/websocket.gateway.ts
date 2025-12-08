import {
    WebSocketGateway,
    WebSocketServer,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    MessageBody,
    ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

import {
    UserLogoutEvent,
    UserLogoutAllEvent,
    UserTokenRevokedEvent,
    UserProfileUpdatedEvent,
    SocketError,
} from './websocket.interfaces';

/**
 * WebSocket Gateway
 * Xử lý realtime communication với clients
 */
@Injectable()
@WebSocketGateway({
    cors: {
        origin: '*', // Sẽ được config từ env trong production
        credentials: true,
    },
    namespace: '/',
    transports: ['websocket', 'polling'],
})
export class WebsocketGateway
    implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(WebsocketGateway.name);

    /** Map userId -> Set of socketIds */
    private userSockets = new Map<string, Set<string>>();

    /** Map socketId -> userId */
    private socketUsers = new Map<string, string>();

    constructor(
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService,
    ) { }

    afterInit() {
        this.logger.log('🔌 WebSocket Gateway initialized');
    }

    /**
     * Xử lý khi client kết nối
     */
    async handleConnection(socket: Socket) {
        try {
            // Lấy token từ auth header
            const token = this.extractToken(socket);
            if (!token) {
                this.sendError(socket, 'UNAUTHORIZED', 'Token is required');
                socket.disconnect();
                return;
            }

            // Verify token
            const payload = await this.verifyToken(token);
            if (!payload || !payload.userId) {
                this.sendError(socket, 'UNAUTHORIZED', 'Invalid or expired token');
                socket.disconnect();
                return;
            }

            const userId = payload.userId;

            // Lưu mapping
            this.socketUsers.set(socket.id, userId);
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId)!.add(socket.id);

            // Join user room
            socket.join(`user:${userId}`);

            this.logger.log(`✅ Client connected: ${socket.id} (User: ${userId})`);

            // Gửi xác nhận kết nối thành công
            socket.emit('connected', {
                socketId: socket.id,
                userId: userId,
                timestamp: new Date().toISOString(),
            });
        } catch (error) {
            this.logger.error(`Connection error: ${error}`);
            this.sendError(socket, 'INTERNAL_ERROR', 'Connection failed');
            socket.disconnect();
        }
    }

    /**
     * Xử lý khi client ngắt kết nối
     */
    handleDisconnect(socket: Socket) {
        const userId = this.socketUsers.get(socket.id);
        if (userId) {
            this.socketUsers.delete(socket.id);
            const userSocketSet = this.userSockets.get(userId);
            if (userSocketSet) {
                userSocketSet.delete(socket.id);
                if (userSocketSet.size === 0) {
                    this.userSockets.delete(userId);
                }
            }
        }
        this.logger.log(`❌ Client disconnected: ${socket.id}`);
    }

    // ========================
    // EMIT METHODS
    // ========================

    /**
     * Emit event logout cho user
     */
    emitUserLogout(userId: string, tokenId: string, message: string) {
        const event: UserLogoutEvent = {
            userId,
            tokenId,
            timestamp: new Date().toISOString(),
            message,
        };
        this.server.to(`user:${userId}`).emit('user:logout', event);
        this.logger.debug(`Emitted user:logout to user:${userId}`);
    }

    /**
     * Emit event logout all devices
     */
    emitUserLogoutAll(userId: string, message: string, excludeSocketId?: string) {
        const event: UserLogoutAllEvent = {
            userId,
            timestamp: new Date().toISOString(),
            message,
            excludeSocketId: excludeSocketId || null,
        };
        this.server.to(`user:${userId}`).emit('user:logoutAll', event);
        this.logger.debug(`Emitted user:logoutAll to user:${userId}`);
    }

    /**
     * Emit event token revoked
     */
    emitTokenRevoked(
        userId: string,
        reason: 'password_changed' | 'admin_revoke' | 'security_alert',
        message: string,
    ) {
        const event: UserTokenRevokedEvent = {
            userId,
            reason,
            timestamp: new Date().toISOString(),
            message,
        };
        this.server.to(`user:${userId}`).emit('user:tokenRevoked', event);
        this.logger.debug(`Emitted user:tokenRevoked to user:${userId}`);
    }

    /**
     * Emit event profile updated
     */
    emitProfileUpdated(
        userId: string,
        updatedFields: string[],
        profile: UserProfileUpdatedEvent['profile'],
    ) {
        const event: UserProfileUpdatedEvent = {
            userId,
            updatedFields,
            profile,
            timestamp: new Date().toISOString(),
        };
        this.server.to(`user:${userId}`).emit('user:profileUpdated', event);
        this.logger.debug(`Emitted user:profileUpdated to user:${userId}`);
    }

    // ========================
    // MESSAGE HANDLERS
    // ========================

    @SubscribeMessage('ping')
    handlePing(@ConnectedSocket() socket: Socket) {
        socket.emit('pong', { timestamp: new Date().toISOString() });
    }

    @SubscribeMessage('subscribe')
    handleSubscribe(
        @ConnectedSocket() socket: Socket,
        @MessageBody() payload: { rooms: string[] },
    ) {
        const userId = this.socketUsers.get(socket.id);
        if (!userId) {
            this.sendError(socket, 'UNAUTHORIZED', 'Not authenticated');
            return;
        }

        // Chỉ cho phép subscribe vào rooms được phép
        const allowedRooms = payload.rooms.filter(room =>
            room === 'notifications' || room === 'announcements',
        );

        allowedRooms.forEach(room => socket.join(room));

        socket.emit('subscribed', {
            rooms: allowedRooms,
            success: true,
        });
    }

    // ========================
    // HELPER METHODS
    // ========================

    /**
     * Extract token từ socket handshake
     */
    private extractToken(socket: Socket): string | null {
        const authHeader = socket.handshake.auth?.token;
        if (authHeader && typeof authHeader === 'string') {
            return authHeader.replace('Bearer ', '');
        }
        return null;
    }

    /**
     * Verify JWT token
     */
    private async verifyToken(token: string): Promise<{ userId: string } | null> {
        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
            });
            return payload;
        } catch {
            return null;
        }
    }

    /**
     * Send error event to socket
     */
    private sendError(socket: Socket, code: string, message: string) {
        const error: SocketError = { code, message };
        socket.emit('error', error);
    }

    /**
     * Get all socket IDs for a user
     */
    getUserSocketIds(userId: string): string[] {
        const sockets = this.userSockets.get(userId);
        return sockets ? Array.from(sockets) : [];
    }

    /**
     * Check if user is online
     */
    isUserOnline(userId: string): boolean {
        const sockets = this.userSockets.get(userId);
        return sockets ? sockets.size > 0 : false;
    }

    /**
     * Get online users count
     */
    getOnlineUsersCount(): number {
        return this.userSockets.size;
    }

    /**
     * Get total connections count
     */
    getTotalConnectionsCount(): number {
        return this.socketUsers.size;
    }
}

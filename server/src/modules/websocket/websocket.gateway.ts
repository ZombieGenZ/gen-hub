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
import { Logger, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';

import {
  UserLogoutEvent,
  UserLogoutAllEvent,
  UserTokenRevokedEvent,
  UserProfileUpdatedEvent,
  SocketError,
  WarehouseTemplateCreatedEvent,
  WarehouseTemplateUpdatedEvent,
  WarehouseTemplateDeletedEvent,
  WarehouseTemplateLayoutUpdatedEvent,
  OrganizationCreatedEvent,
  OrganizationUpdatedEvent,
  OrganizationDeletedEvent,
  MemberInvitedEvent,
  MemberRemovedEvent,
  OwnershipTransferredEvent,
  UserOnlineStatusEvent,
} from './websocket.interfaces';
import { UserRepository } from '../user/user.repository';

/**
 * WebSocket Gateway
 * Xử lý realtime communication với clients
 * Theo dõi trạng thái online của user
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
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);

  /** Map userId -> Set of socketIds */
  private userSockets = new Map<string, Set<string>>();

  /** Map socketId -> userId */
  private socketUsers = new Map<string, string>();

  /** Map userId -> timestamp của lần heartbeat cuối */
  private userLastHeartbeat = new Map<string, number>();

  /** Interval để kiểm tra user offline */
  private offlineCheckInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userRepository: UserRepository,
  ) { }

  /**
   * Khởi tạo module - bắt đầu interval check offline users
   */
  onModuleInit() {
    const checkIntervalMs = this.configService.get<number>(
      'USER_ONLINE_CHECK_INTERVAL_MS',
      30000,
    );

    this.offlineCheckInterval = setInterval(() => {
      this.checkAndSetOfflineUsers();
    }, checkIntervalMs);

    this.logger.log(`⏰ User online status check interval started (${checkIntervalMs}ms)`);
  }

  /**
   * Cleanup khi module bị destroy
   */
  onModuleDestroy() {
    if (this.offlineCheckInterval) {
      clearInterval(this.offlineCheckInterval);
      this.offlineCheckInterval = null;
      this.logger.log('⏰ User online status check interval stopped');
    }
  }

  afterInit() {
    this.logger.log('🔌 WebSocket Gateway initialized');
  }

  /**
   * Xử lý khi client kết nối
   * Hỗ trợ Optional Authentication - có thể kết nối không cần token
   */
  async handleConnection(socket: Socket) {
    try {
      // Lấy token từ auth header (optional)
      const token = this.extractToken(socket);
      let userId: string | null = null;
      let isAuthenticated = false;

      if (token) {
        // Có token -> xác thực
        const payload = await this.verifyToken(token);
        if (payload?.userId) {
          userId = payload.userId;
          isAuthenticated = true;

          // Lưu mapping cho authenticated user
          this.socketUsers.set(socket.id, userId);
          const isFirstConnection = !this.userSockets.has(userId) || this.userSockets.get(userId)!.size === 0;
          if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
          }
          this.userSockets.get(userId)!.add(socket.id);

          // Cập nhật heartbeat
          this.userLastHeartbeat.set(userId, Date.now());

          // Join user room
          socket.join(`user:${userId}`);

          // Nếu đây là connection đầu tiên của user, set user online
          if (isFirstConnection) {
            await this.setUserOnlineStatus(userId, true);
          }

          this.logger.log(`✅ Client connected: ${socket.id} (User: ${userId})`);
        } else {
          // Token không hợp lệ
          this.sendError(socket, 'UNAUTHORIZED', 'Invalid or expired token');
          socket.disconnect();
          return;
        }
      } else {
        // Không có token -> guest connection
        this.logger.log(`✅ Guest connected: ${socket.id}`);
      }

      // Tất cả đều join public room
      socket.join('public');

      // Gửi xác nhận kết nối thành công
      socket.emit('connected', {
        socketId: socket.id,
        userId: userId,
        authenticated: isAuthenticated,
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
  async handleDisconnect(socket: Socket) {
    const userId = this.socketUsers.get(socket.id);
    if (userId) {
      this.socketUsers.delete(socket.id);
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socket.id);
        // Nếu không còn socket nào, set user offline
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
          this.userLastHeartbeat.delete(userId);
          await this.setUserOnlineStatus(userId, false);
        }
      }
    }
    this.logger.log(`❌ Client disconnected: ${socket.id}`);
  }

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
  }

  /**
   * Emit event khi tạo mới WarehouseTemplate
   */
  emitWarehouseTemplateCreated(warehouseTemplateId: string, name: string, createdBy: string) {
    const event: WarehouseTemplateCreatedEvent = {
      warehouseTemplateId,
      name,
      createdBy,
      timestamp: new Date().toISOString(),
    };
    this.server.emit('warehouseTemplate:created', event);
  }

  /**
   * Emit event khi cập nhật WarehouseTemplate
   */
  emitWarehouseTemplateUpdated(
    warehouseTemplateId: string,
    name: string,
    updatedFields: string[],
    updatedBy: string,
  ) {
    const event: WarehouseTemplateUpdatedEvent = {
      warehouseTemplateId,
      name,
      updatedFields,
      updatedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.emit('warehouseTemplate:updated', event);
  }

  /**
   * Emit event khi xóa WarehouseTemplate
   */
  emitWarehouseTemplateDeleted(warehouseTemplateId: string, name: string, deletedBy: string) {
    const event: WarehouseTemplateDeletedEvent = {
      warehouseTemplateId,
      name,
      deletedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.emit('warehouseTemplate:deleted', event);
  }

  /**
   * Emit event khi cập nhật layout WarehouseTemplate
   */
  emitWarehouseTemplateLayoutUpdated(
    warehouseTemplateId: string,
    name: string,
    updatedBy: string,
    summary: WarehouseTemplateLayoutUpdatedEvent['summary'],
  ) {
    const event: WarehouseTemplateLayoutUpdatedEvent = {
      warehouseTemplateId,
      name,
      updatedBy,
      summary,
      timestamp: new Date().toISOString(),
    };
    this.server.emit('warehouseTemplate:layoutUpdated', event);
  }

  /**
   * Emit event khi tạo Organization
   */
  emitOrganizationCreated(ownerId: string, org: { id: string; name: string }) {
    const event: OrganizationCreatedEvent = {
      organizationId: org.id,
      name: org.name,
      ownerId,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`user:${ownerId}`).emit('organization:created', event);
  }

  /**
   * Emit event khi cập nhật Organization
   */
  emitOrganizationUpdated(ownerId: string, org: { id: string; name: string }) {
    const event: OrganizationUpdatedEvent = {
      organizationId: org.id,
      name: org.name,
      updatedBy: ownerId,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`user:${ownerId}`).emit('organization:updated', event);
  }

  /**
   * Emit event khi xóa Organization
   */
  emitOrganizationDeleted(deletedBy: string, orgId: string) {
    const event: OrganizationDeletedEvent = {
      organizationId: orgId,
      deletedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`user:${deletedBy}`).emit('organization:deleted', event);
  }

  /**
   * Emit event khi mời thành viên
   */
  emitMemberInvited(invitedUserId: string, data: { organization: { id: string; name: string }; member: unknown }) {
    const event: MemberInvitedEvent = {
      organizationId: data.organization.id,
      organizationName: data.organization.name,
      invitedUserId,
      invitedBy: '',
      timestamp: new Date().toISOString(),
    };
    this.server.to(`user:${invitedUserId}`).emit('organization:memberInvited', event);
  }

  /**
   * Emit event khi xóa thành viên
   */
  emitMemberRemoved(removedUserId: string, data: { organizationId: string; memberId: string }) {
    const event: MemberRemovedEvent = {
      organizationId: data.organizationId,
      memberId: data.memberId,
      removedBy: '',
      timestamp: new Date().toISOString(),
    };
    this.server.to(`user:${removedUserId}`).emit('organization:memberRemoved', event);
  }

  /**
   * Emit event khi chuyển quyền sở hữu
   */
  emitOwnershipTransferred(oldOwnerId: string, newOwnerId: string, org: { id: string; name: string }) {
    const event: OwnershipTransferredEvent = {
      organizationId: org.id,
      organizationName: org.name,
      oldOwnerId,
      newOwnerId,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`user:${oldOwnerId}`).emit('organization:ownershipTransferred', event);
    this.server.to(`user:${newOwnerId}`).emit('organization:ownershipTransferred', event);
  }

  /**
   * Emit event khi tạo GlobalNotification - broadcast đến tất cả
   */
  emitGlobalNotificationCreated(notificationId: string, title: string, createdBy: string) {
    this.server.emit('globalNotification:created', {
      notificationId,
      title,
      createdBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi cập nhật GlobalNotification
   */
  emitGlobalNotificationUpdated(
    notificationId: string,
    title: string,
    updatedFields: string[],
    updatedBy: string,
  ) {
    this.server.emit('globalNotification:updated', {
      notificationId,
      title,
      updatedFields,
      updatedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi xóa GlobalNotification
   */
  emitGlobalNotificationDeleted(notificationId: string, title: string, deletedBy: string) {
    this.server.emit('globalNotification:deleted', {
      notificationId,
      title,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi user nhận thông báo mới
   */
  emitUserNotificationReceived(userId: string, notification: { id: string; title: string; content: string; type: string }) {
    this.server.to(`user:${userId}`).emit('userNotification:received', {
      notificationId: notification.id,
      title: notification.title,
      content: notification.content,
      type: notification.type,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi đánh dấu đã đọc một thông báo
   */
  emitUserNotificationRead(userId: string, notificationId: string) {
    this.server.to(`user:${userId}`).emit('userNotification:read', {
      notificationId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi đánh dấu tất cả đã đọc
   */
  emitUserNotificationAllRead(userId: string) {
    this.server.to(`user:${userId}`).emit('userNotification:allRead', {
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi tạo OrganizationNotification
   */
  emitOrgNotificationCreated(orgId: string, notificationId: string, title: string, createdBy: string) {
    this.server.to(`organization:${orgId}`).emit('orgNotification:created', {
      organizationId: orgId,
      notificationId,
      title,
      createdBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi cập nhật OrganizationNotification
   */
  emitOrgNotificationUpdated(
    orgId: string,
    notificationId: string,
    title: string,
    updatedFields: string[],
    updatedBy: string,
  ) {
    this.server.to(`organization:${orgId}`).emit('orgNotification:updated', {
      organizationId: orgId,
      notificationId,
      title,
      updatedFields,
      updatedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi xóa OrganizationNotification
   */
  emitOrgNotificationDeleted(orgId: string, notificationId: string, title: string, deletedBy: string) {
    this.server.to(`organization:${orgId}`).emit('orgNotification:deleted', {
      organizationId: orgId,
      notificationId,
      title,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Generic emit to organization room - dùng cho các entity khác nhau
   */
  emitToOrganization(orgId: string, event: string, data: Record<string, unknown>) {
    this.server.to(`organization:${orgId}`).emit(event, {
      ...data,
      organizationId: orgId,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() socket: Socket) {
    // Cập nhật heartbeat nếu user đã authenticated
    const userId = this.socketUsers.get(socket.id);
    if (userId) {
      this.updateUserHeartbeat(userId);
    }
    socket.emit('pong', { timestamp: new Date().toISOString() });
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { rooms: string[] },
  ) {
    const userId = this.socketUsers.get(socket.id);

    // Định nghĩa rooms
    const publicRooms = ['announcements', 'system-status'];
    const privateRooms = ['notifications'];

    const joinedRooms: string[] = [];
    const rejectedRooms: string[] = [];

    payload.rooms.forEach((room) => {
      if (publicRooms.includes(room)) {
        // Public rooms - ai cũng join được
        socket.join(room);
        joinedRooms.push(room);
      } else if (privateRooms.includes(room)) {
        // Private rooms - chỉ authenticated users
        if (userId) {
          socket.join(room);
          joinedRooms.push(room);
        } else {
          rejectedRooms.push(room);
        }
      }
    });

    socket.emit('subscribed', {
      rooms: joinedRooms,
      rejected: rejectedRooms.length > 0 ? rejectedRooms : undefined,
      success: true,
    });
  }

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

  /**
   * Cập nhật trạng thái online của user vào database và emit event
   */
  private async setUserOnlineStatus(userId: string, isOnline: boolean): Promise<void> {
    try {
      if (isOnline) {
        await this.userRepository.setUserOnline(userId);
      } else {
        await this.userRepository.setUserOffline(userId);
      }

      // Emit event thay đổi trạng thái online
      this.emitUserOnlineStatus(userId, isOnline);
    } catch (error) {
      this.logger.error(`Failed to update online status for user ${userId}: ${error}`);
    }
  }

  /**
   * Emit event trạng thái online của user
   */
  emitUserOnlineStatus(userId: string, isOnline: boolean, lastOnline?: Date) {
    const event: UserOnlineStatusEvent = {
      userId,
      isOnline,
      lastOnline: lastOnline?.toISOString() || (isOnline ? null : new Date().toISOString()),
      timestamp: new Date().toISOString(),
    };

    // Broadcast cho tất cả authenticated users
    this.server.emit('user:onlineStatus', event);
  }

  /**
   * Kiểm tra và set offline cho các user không có heartbeat
   */
  private async checkAndSetOfflineUsers(): Promise<void> {
    const timeoutSeconds = this.configService.get<number>(
      'USER_ONLINE_TIMEOUT_SECONDS',
      60,
    );
    const timeoutMs = timeoutSeconds * 1000;
    const now = Date.now();

    const usersToSetOffline: string[] = [];

    // Kiểm tra từng user trong database đang online
    try {
      const onlineUsers = await this.userRepository.getOnlineUsers();

      for (const user of onlineUsers) {
        // Nếu user không có socket kết nối
        if (!this.userSockets.has(user.id) || this.userSockets.get(user.id)!.size === 0) {
          const lastHeartbeat = this.userLastHeartbeat.get(user.id);

          // Nếu không có heartbeat hoặc heartbeat quá timeout
          if (!lastHeartbeat || now - lastHeartbeat > timeoutMs) {
            usersToSetOffline.push(user.id);
          }
        }
      }

      if (usersToSetOffline.length > 0) {
        // Bulk update offline
        const count = await this.userRepository.setUsersOffline(usersToSetOffline);

        // Emit events cho từng user
        for (const userId of usersToSetOffline) {
          this.userLastHeartbeat.delete(userId);
          this.emitUserOnlineStatus(userId, false);
        }

        this.logger.log(`⏰ Set ${count} users offline due to timeout`);
      }
    } catch (error) {
      this.logger.error(`Error checking offline users: ${error}`);
    }
  }

  /**
   * Cập nhật heartbeat cho user (được gọi khi nhận ping)
   */
  updateUserHeartbeat(userId: string): void {
    this.userLastHeartbeat.set(userId, Date.now());
  }
}

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
import {
  Logger,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
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
  SystemLogEvent,
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
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit,
    OnModuleDestroy
{
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
  ) {}

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

    this.logger.log(
      `⏰ User online status check interval started (${checkIntervalMs}ms)`,
    );
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
          const isFirstConnection =
            !this.userSockets.has(userId) ||
            this.userSockets.get(userId)!.size === 0;
          if (!this.userSockets.has(userId)) {
            this.userSockets.set(userId, new Set());
          }
          this.userSockets.get(userId)!.add(socket.id);

          // Cập nhật heartbeat
          this.userLastHeartbeat.set(userId, Date.now());

          // Join user room
          socket.join(`user:${userId}`);

          const organizationIds =
            await this.userRepository.getUserOrganizations(userId);
          organizationIds.forEach((orgId) => {
            socket.join(`organization:${orgId}`);
          });

          // Nếu là System Admin, join admin_room để nhận các sự kiện inventory từ mọi tổ chức
          const isAdmin = await this.userRepository.isSystemAdmin(userId);
          if (isAdmin) {
            socket.join('admin_room');
          }

          // Nếu đây là connection đầu tiên của user, set user online
          if (isFirstConnection) {
            await this.setUserOnlineStatus(userId, true);
          }

          this.logger.log(
            `✅ Client connected: ${socket.id} (User: ${userId})`,
          );
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
   * Emit event password changed
   */
  emitPasswordChanged(userId: string, message: string) {
    this.server.to(`user:${userId}`).emit('user:passwordChanged', {
      userId,
      timestamp: new Date().toISOString(),
      message,
    });
  }

  /**
   * Emit event email verified
   */
  emitEmailVerified(userId: string, email: string, message: string) {
    this.server.to(`user:${userId}`).emit('user:emailVerified', {
      userId,
      email,
      timestamp: new Date().toISOString(),
      message,
    });
  }

  /**
   * Emit event 2FA status changed
   */
  emit2FAStatusChanged(userId: string, enabled: boolean, message: string) {
    this.server.to(`user:${userId}`).emit('user:2faStatusChanged', {
      userId,
      enabled,
      action: enabled ? 'enabled' : 'disabled',
      timestamp: new Date().toISOString(),
      message,
    });
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
  emitWarehouseTemplateCreated(
    warehouseTemplateId: string,
    name: string,
    createdBy: string,
  ) {
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
  emitWarehouseTemplateDeleted(
    warehouseTemplateId: string,
    name: string,
    deletedBy: string,
  ) {
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
   * Emit event khi xóa nhiều Organizations
   */
  emitOrganizationsDeletedMany(deletedBy: string, orgIds: string[]) {
    this.server.to(`user:${deletedBy}`).emit('organization:deletedMany', {
      organizationIds: orgIds,
      count: orgIds.length,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi mời thành viên
   */
  emitMemberInvited(
    invitedUserId: string,
    data: { organization: { id: string; name: string }; member: unknown },
  ) {
    const event: MemberInvitedEvent = {
      organizationId: data.organization.id,
      organizationName: data.organization.name,
      invitedUserId,
      invitedBy: '',
      timestamp: new Date().toISOString(),
    };
    this.server
      .to(`user:${invitedUserId}`)
      .emit('organization:memberInvited', event);
  }

  /**
   * Emit event khi xóa thành viên
   */
  emitMemberRemoved(
    removedUserId: string,
    data: { organizationId: string; memberId: string },
  ) {
    const event: MemberRemovedEvent = {
      organizationId: data.organizationId,
      memberId: data.memberId,
      removedBy: '',
      timestamp: new Date().toISOString(),
    };
    this.server
      .to(`user:${removedUserId}`)
      .emit('organization:memberRemoved', event);
  }

  /**
   * Emit event khi chuyển quyền sở hữu
   */
  emitOwnershipTransferred(
    oldOwnerId: string,
    newOwnerId: string,
    org: { id: string; name: string },
  ) {
    const event: OwnershipTransferredEvent = {
      organizationId: org.id,
      organizationName: org.name,
      oldOwnerId,
      newOwnerId,
      timestamp: new Date().toISOString(),
    };
    this.server
      .to(`user:${oldOwnerId}`)
      .emit('organization:ownershipTransferred', event);
    this.server
      .to(`user:${newOwnerId}`)
      .emit('organization:ownershipTransferred', event);
  }

  /**
   * Emit event khi thành viên chấp nhận lời mời
   */
  emitMemberAccepted(
    orgId: string,
    orgName: string,
    memberId: string,
    userId: string,
  ) {
    this.server
      .to(`organization:${orgId}`)
      .emit('organization:memberAccepted', {
        organizationId: orgId,
        organizationName: orgName,
        memberId,
        userId,
        timestamp: new Date().toISOString(),
      });
  }

  /**
   * Emit event khi thành viên từ chối lời mời
   */
  emitMemberRejected(orgId: string, userId: string) {
    this.server
      .to(`organization:${orgId}`)
      .emit('organization:memberRejected', {
        organizationId: orgId,
        userId,
        timestamp: new Date().toISOString(),
      });
  }

  /**
   * Emit event khi thành viên rời tổ chức
   */
  emitMemberLeft(orgId: string, memberId: string, userId: string) {
    this.server.to(`organization:${orgId}`).emit('organization:memberLeft', {
      organizationId: orgId,
      memberId,
      userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi cập nhật roles của thành viên
   */
  emitMemberRolesUpdated(
    orgId: string,
    memberId: string,
    roleIds: string[],
    updatedBy: string,
  ) {
    this.server
      .to(`organization:${orgId}`)
      .emit('organization:memberRolesUpdated', {
        organizationId: orgId,
        memberId,
        roleIds,
        updatedBy,
        timestamp: new Date().toISOString(),
      });
  }

  /**
   * Emit event khi cập nhật permissions của thành viên
   */
  emitMemberPermissionsUpdated(
    orgId: string,
    memberId: string,
    permissionIds: string[],
    updatedBy: string,
  ) {
    this.server
      .to(`organization:${orgId}`)
      .emit('organization:memberPermissionsUpdated', {
        organizationId: orgId,
        memberId,
        permissionIds,
        updatedBy,
        timestamp: new Date().toISOString(),
      });
  }

  /**
   * Emit event khi tạo GlobalNotification - broadcast đến tất cả
   */
  emitGlobalNotificationCreated(
    notificationId: string,
    title: string,
    createdBy: string,
  ) {
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
  emitGlobalNotificationDeleted(
    notificationId: string,
    title: string,
    deletedBy: string,
  ) {
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
  emitUserNotificationReceived(
    userId: string,
    notification: { id: string; title: string; content: string; type: string },
  ) {
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
  emitOrgNotificationCreated(
    orgId: string,
    notificationId: string,
    title: string,
    createdBy: string,
  ) {
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
  emitOrgNotificationDeleted(
    orgId: string,
    notificationId: string,
    title: string,
    deletedBy: string,
  ) {
    this.server.to(`organization:${orgId}`).emit('orgNotification:deleted', {
      organizationId: orgId,
      notificationId,
      title,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi tạo Organization Role
   */
  emitOrgRoleCreated(
    orgId: string,
    roleId: string,
    roleName: string,
    createdBy: string,
  ) {
    this.server.to(`organization:${orgId}`).emit('orgRole:created', {
      organizationId: orgId,
      roleId,
      roleName,
      createdBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi cập nhật Organization Role
   */
  emitOrgRoleUpdated(
    orgId: string,
    roleId: string,
    roleName: string,
    updatedBy: string,
  ) {
    this.server.to(`organization:${orgId}`).emit('orgRole:updated', {
      organizationId: orgId,
      roleId,
      roleName,
      updatedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi xóa Organization Role
   */
  emitOrgRoleDeleted(orgId: string, roleId: string, deletedBy: string) {
    this.server.to(`organization:${orgId}`).emit('orgRole:deleted', {
      organizationId: orgId,
      roleId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi xóa nhiều Organization Roles
   */
  emitOrgRolesDeletedMany(orgId: string, roleIds: string[], deletedBy: string) {
    this.server.to(`organization:${orgId}`).emit('orgRole:deletedMany', {
      organizationId: orgId,
      roleIds,
      count: roleIds.length,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi tạo API Key
   */
  emitApiKeyCreated(
    orgId: string,
    apiKeyId: string,
    name: string,
    createdBy: string,
  ) {
    this.server.to(`organization:${orgId}`).emit('apiKey:created', {
      organizationId: orgId,
      apiKeyId,
      name,
      createdBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi cập nhật API Key
   */
  emitApiKeyUpdated(
    orgId: string,
    apiKeyId: string,
    name: string,
    updatedBy: string,
  ) {
    this.server.to(`organization:${orgId}`).emit('apiKey:updated', {
      organizationId: orgId,
      apiKeyId,
      name,
      updatedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi xóa API Key
   */
  emitApiKeyDeleted(orgId: string, apiKeyId: string, deletedBy: string) {
    this.server.to(`organization:${orgId}`).emit('apiKey:deleted', {
      organizationId: orgId,
      apiKeyId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi xóa nhiều API Keys
   */
  emitApiKeysDeletedMany(
    orgId: string,
    apiKeyIds: string[],
    deletedBy: string,
  ) {
    this.server.to(`organization:${orgId}`).emit('apiKey:deletedMany', {
      organizationId: orgId,
      apiKeyIds,
      count: apiKeyIds.length,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi cập nhật Warehouse
   */
  emitWarehouseUpdated(
    orgId: string,
    warehouseId: string,
    name: string,
    updatedFields: string[],
    updatedBy: string,
  ) {
    this.server.to(`organization:${orgId}`).emit('warehouse:updated', {
      organizationId: orgId,
      warehouseId,
      name,
      updatedFields,
      updatedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi xóa Warehouse
   */
  emitWarehouseDeleted(orgId: string, warehouseId: string, deletedBy: string) {
    this.server.to(`organization:${orgId}`).emit('warehouse:deleted', {
      organizationId: orgId,
      warehouseId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi xóa nhiều Warehouses
   */
  emitWarehousesDeletedMany(
    orgId: string,
    warehouseIds: string[],
    deletedBy: string,
  ) {
    this.server.to(`organization:${orgId}`).emit('warehouse:deletedMany', {
      organizationId: orgId,
      warehouseIds,
      count: warehouseIds.length,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi cập nhật layout Warehouse
   */
  emitWarehouseLayoutUpdated(
    orgId: string,
    warehouseId: string,
    name: string,
    updatedBy: string,
    summary: Record<string, number>,
  ) {
    this.server.to(`organization:${orgId}`).emit('warehouse:layoutUpdated', {
      organizationId: orgId,
      warehouseId,
      name,
      updatedBy,
      summary,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi tạo Rental Contract
   */
  emitRentalContractCreated(
    orgId: string,
    contractId: string,
    contractNumber: string,
    createdBy: string,
  ) {
    this.server.to(`organization:${orgId}`).emit('rentalContract:created', {
      organizationId: orgId,
      contractId,
      contractNumber,
      createdBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi cập nhật trạng thái hợp đồng thuê
   */
  emitRentalContractStatusUpdated(
    orgId: string,
    contractId: string,
    contractNumber: string,
    status: string,
    updatedBy: string,
  ) {
    this.server
      .to(`organization:${orgId}`)
      .emit('rentalContract:statusUpdated', {
        organizationId: orgId,
        contractId,
        contractNumber,
        status,
        updatedBy,
        timestamp: new Date().toISOString(),
      });
  }

  /**
   * Emit event khi có lịch tham quan kho mới
   */
  emitWarehouseVisitCreated(
    bookingId: string,
    warehouseId: string,
    createdBy: string,
  ) {
    this.server.emit('warehouseVisit:created', {
      bookingId,
      warehouseId,
      createdBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi cập nhật Rental Contract
   */
  emitRentalContractUpdated(
    orgId: string,
    contractId: string,
    contractNumber: string,
    updatedBy: string,
    status?: string,
  ) {
    this.server.to(`organization:${orgId}`).emit('rentalContract:updated', {
      organizationId: orgId,
      contractId,
      contractNumber,
      status,
      updatedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi gán Warehouse Manager
   */
  emitWarehouseManagerAssigned(
    templateId: string,
    managerId: string,
    userId: string,
    createdBy: string,
  ) {
    this.server.emit('warehouseManager:assigned', {
      templateId,
      managerId,
      userId,
      createdBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi cập nhật Warehouse Manager
   */
  emitWarehouseManagerUpdated(
    templateId: string,
    managerId: string,
    updatedBy: string,
  ) {
    this.server.emit('warehouseManager:updated', {
      templateId,
      managerId,
      updatedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi xóa Warehouse Manager
   */
  emitWarehouseManagerRemoved(
    templateId: string,
    managerId: string,
    removedBy: string,
  ) {
    this.server.emit('warehouseManager:removed', {
      templateId,
      managerId,
      removedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi xóa Rental Contract
   */
  emitRentalContractDeleted(
    orgId: string,
    contractId: string,
    deletedBy: string,
  ) {
    this.server.to(`organization:${orgId}`).emit('rentalContract:deleted', {
      organizationId: orgId,
      contractId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi xóa nhiều Rental Contracts
   */
  emitRentalContractsDeletedMany(
    orgId: string,
    contractIds: string[],
    deletedBy: string,
  ) {
    this.server.to(`organization:${orgId}`).emit('rentalContract:deletedMany', {
      organizationId: orgId,
      contractIds,
      count: contractIds.length,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi gia hạn Rental Contract
   */
  emitRentalContractRenewed(
    orgId: string,
    contractId: string,
    contractNumber: string,
    newEndDate: string,
    renewedBy: string,
  ) {
    this.server.to(`organization:${orgId}`).emit('rentalContract:renewed', {
      organizationId: orgId,
      contractId,
      contractNumber,
      newEndDate,
      renewedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi upload ảnh cho template
   */
  emitWarehouseTemplateImagesUploaded(
    templateId: string,
    count: number,
    uploadedBy: string,
  ) {
    this.server.emit('warehouseTemplateImage:created', {
      templateId,
      count,
      uploadedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi xóa ảnh của template
   */
  emitWarehouseTemplateImageDeleted(
    templateId: string,
    imageId: string,
    deletedBy: string,
  ) {
    this.server.emit('warehouseTemplateImage:deleted', {
      templateId,
      imageId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi xóa nhiều ảnh của template
   */
  emitWarehouseTemplateImagesDeletedMany(
    templateId: string,
    imageIds: string[],
    deletedBy: string,
  ) {
    this.server.emit('warehouseTemplateImage:deletedMany', {
      templateId,
      imageIds,
      count: imageIds.length,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi reorder ảnh của template
   */
  emitWarehouseTemplateImagesReordered(templateId: string, updatedBy: string) {
    this.server.emit('warehouseTemplateImage:updated', {
      templateId,
      action: 'reorder',
      updatedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi cập nhật config - broadcast đến tất cả clients
   * @param action - Loại hành động: 'updated', 'reset', 'reloaded'
   * @param configData - Dữ liệu config mới sau khi thay đổi
   * @param updatedBy - User ID của người thực hiện thao tác
   */
  emitConfigUpdated(
    action: 'updated' | 'reset' | 'reloaded',
    configData: Record<string, unknown>,
    updatedBy?: string,
  ) {
    this.server.emit(`config:${action}`, {
      action,
      data: configData,
      updatedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Generic emit to organization room - dùng cho các entity khác nhau
   * Đồng thời emit tới admin_room để admin nhận được real-time updates
   */
  emitToOrganization(
    orgId: string,
    event: string,
    data: Record<string, unknown>,
  ) {
    const payload = {
      ...data,
      organizationId: orgId,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`organization:${orgId}`).emit(event, payload);
    // Admin cũng cần nhận các sự kiện này để cập nhật trang duyệt phiếu
    this.server.to('admin_room').emit(event, payload);
  }

  /**
   * Emit event khi assign staff vào ticket
   */
  emitContactStaffAssigned(
    conversationId: string,
    code: string,
    staff: Array<{ staffId: string; staffName: string }>,
    assignedBy: string,
  ) {
    this.server.to('admin_room').emit('contact:staffAssigned', {
      conversationId,
      code,
      staff,
      assignedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi unassign staff khỏi ticket
   */
  emitContactStaffUnassigned(
    conversationId: string,
    code: string,
    staffId: string,
    unassignedBy: string,
  ) {
    this.server.to('admin_room').emit('contact:staffUnassigned', {
      conversationId,
      code,
      staffId,
      unassignedBy,
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

  /**
   * Guest join vào room chat của phiên live chat
   * Client emit: { sessionId: '<uuid>' }
   * Server response: chat:joined hoặc chat:error
   */
  @SubscribeMessage('chat:join')
  handleChatJoin(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    const { sessionId } = payload || {};

    if (
      !sessionId ||
      typeof sessionId !== 'string' ||
      sessionId.trim() === ''
    ) {
      socket.emit('chat:error', {
        code: 'INVALID_SESSION',
        message: 'sessionId is required',
      });
      return;
    }

    const roomName = `chat:${sessionId.trim()}`;
    socket.join(roomName);

    this.logger.log(`💬 Socket ${socket.id} joined chat room: ${roomName}`);

    socket.emit('chat:joined', {
      sessionId: sessionId.trim(),
      room: roomName,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Guest rời khỏi room chat
   * Client emit: { sessionId: '<uuid>' }
   */
  @SubscribeMessage('chat:leave')
  handleChatLeave(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { sessionId: string },
  ) {
    const { sessionId } = payload || {};

    if (!sessionId || typeof sessionId !== 'string') {
      return;
    }

    const roomName = `chat:${sessionId.trim()}`;
    socket.leave(roomName);

    this.logger.log(`💬 Socket ${socket.id} left chat room: ${roomName}`);

    socket.emit('chat:left', {
      sessionId: sessionId.trim(),
      room: roomName,
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('subscribe')
  async handleSubscribe(
    @ConnectedSocket() socket: Socket,
    @MessageBody() payload: { rooms?: string[] },
  ) {
    const userId = this.socketUsers.get(socket.id);
    const requestRooms = Array.isArray(payload?.rooms) ? payload.rooms : [];

    // Định nghĩa rooms
    const publicRooms = ['announcements', 'system-status'];
    const privateRooms = ['notifications'];
    const userOrganizationIds = userId
      ? await this.userRepository.getUserOrganizations(userId)
      : [];

    const joinedRooms: string[] = [];
    const rejectedRooms: string[] = [];

    requestRooms.forEach((room) => {
      if (publicRooms.includes(room)) {
        // Public rooms - ai cũng join được
        socket.join(room);
        joinedRooms.push(room);
      } else if (room.startsWith('organization:')) {
        // Organization rooms - chỉ user thuộc organization mới join được
        if (!userId) {
          rejectedRooms.push(room);
          return;
        }

        const orgId = room.replace('organization:', '').trim();
        if (orgId && userOrganizationIds.includes(orgId)) {
          socket.join(room);
          joinedRooms.push(room);
        } else {
          rejectedRooms.push(room);
        }
      } else if (privateRooms.includes(room)) {
        // Private rooms - chỉ authenticated users
        if (userId) {
          socket.join(room);
          joinedRooms.push(room);
        } else {
          rejectedRooms.push(room);
        }
      } else {
        rejectedRooms.push(room);
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
  private async setUserOnlineStatus(
    userId: string,
    isOnline: boolean,
  ): Promise<void> {
    try {
      let user;
      if (isOnline) {
        user = await this.userRepository.setUserOnline(userId);
      } else {
        user = await this.userRepository.setUserOffline(userId);
      }

      // 1. Emit Global (bảo thù - giữ lại nếu frontend cũ đang dùng)
      this.emitUserOnlineStatus(userId, isOnline);

      // 2. Emit to Organizations
      const orgIds = await this.userRepository.getUserOrganizations(userId);
      const timestamp = new Date().toISOString();

      orgIds.forEach((orgId) => {
        this.server
          .to(`organization:${orgId}`)
          .emit('organization:memberOnlineStatus', {
            organizationId: orgId,
            userId,
            isOnline,
            lastOnline: user.last_online,
            timestamp,
          });
      });
    } catch (error) {
      this.logger.error(
        `Failed to update online status for user ${userId}: ${error}`,
      );
    }
  }

  /**
   * Emit event trạng thái online của user
   */
  emitUserOnlineStatus(userId: string, isOnline: boolean, lastOnline?: Date) {
    const event: UserOnlineStatusEvent = {
      userId,
      isOnline,
      lastOnline:
        lastOnline?.toISOString() ||
        (isOnline ? null : new Date().toISOString()),
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
        if (
          !this.userSockets.has(user.id) ||
          this.userSockets.get(user.id)!.size === 0
        ) {
          const lastHeartbeat = this.userLastHeartbeat.get(user.id);

          // Nếu không có heartbeat hoặc heartbeat quá timeout
          if (!lastHeartbeat || now - lastHeartbeat > timeoutMs) {
            usersToSetOffline.push(user.id);
          }
        }
      }

      if (usersToSetOffline.length > 0) {
        // Bulk update offline
        const count =
          await this.userRepository.setUsersOffline(usersToSetOffline);

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
  /**
   * Emit event khi có conversation mới
   */
  emitContactConversationCreated(
    conversationId: string,
    code: string,
    email: string,
  ) {
    this.server.to('admin_room').emit('contact:created', {
      conversationId,
      code,
      email,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi conversation được cập nhật
   */
  emitContactConversationUpdated(
    conversationId: string,
    code: string,
    updatedFields: string[],
    updatedBy: string,
  ) {
    this.server.to('admin_room').emit('contact:updated', {
      conversationId,
      code,
      updatedFields,
      updatedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi xóa conversation
   */
  emitContactConversationDeleted(conversationId: string, deletedBy: string) {
    this.server.to('admin_room').emit('contact:deleted', {
      conversationId,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit event khi có message mới trong conversation
   * @param conversationId - UUID của conversation
   * @param message - Nội dung message
   * @param sessionId - (Optional) session_id của LIVE_CHAT để emit realtime cho guest
   */
  emitContactMessageCreated(
    conversationId: string,
    message: any,
    sessionId?: string,
  ) {
    const payload = {
      conversationId,
      message,
      timestamp: new Date().toISOString(),
    };

    // Gửi cho admin/staff
    this.server.to('admin_room').emit('contact:messageCreated', payload);

    // Nếu là LIVE_CHAT, gửi thêm vào room của guest để nhận realtime
    if (sessionId) {
      this.server
        .to(`chat:${sessionId}`)
        .emit('contact:messageCreated', payload);
    }
  }

  /**
   * Emit event khi conversation bị đóng
   */
  emitContactConversationClosed(
    conversationId: string,
    code: string,
    closedBy: string,
    sessionId?: string,
  ) {
    const payload = {
      conversationId,
      code,
      closedBy,
      timestamp: new Date().toISOString(),
    };

    this.server.to('admin_room').emit('contact:closed', payload);

    if (sessionId) {
      this.server.to(`chat:${sessionId}`).emit('contact:closed', payload);
    }
  }

  /**
   * Emit event khi conversation được mở lại
   */
  emitContactConversationReopened(
    conversationId: string,
    code: string,
    reopenedBy: string,
    sessionId?: string,
  ) {
    const payload = {
      conversationId,
      code,
      reopenedBy,
      timestamp: new Date().toISOString(),
    };

    this.server.to('admin_room').emit('contact:reopened', payload);

    if (sessionId) {
      this.server.to(`chat:${sessionId}`).emit('contact:reopened', payload);
    }
  }

  /**
   * Emit event khi xóa nhiều conversations
   */
  emitContactConversationsDeletedMany(
    requestedIds: string[],
    count: number,
    deletedBy: string,
  ) {
    this.server.to('admin_room').emit('contact:deletedMany', {
      requestedIds,
      count,
      deletedBy,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Emit system log event to subscribed admin clients
   */
  emitSystemLog(log: SystemLogEvent) {
    this.server.to('systemLogs').emit('systemLog:new', log);
  }

  /**
   * Subscribe to realtime system logs (admin only)
   */
  @SubscribeMessage('systemLog:subscribe')
  handleSystemLogSubscribe(@ConnectedSocket() socket: Socket) {
    socket.join('systemLogs');
    this.logger.log(`📋 Socket ${socket.id} subscribed to system logs`);
    socket.emit('systemLog:subscribed', { success: true });
  }

  /**
   * Unsubscribe from realtime system logs
   */
  @SubscribeMessage('systemLog:unsubscribe')
  handleSystemLogUnsubscribe(@ConnectedSocket() socket: Socket) {
    socket.leave('systemLogs');
    this.logger.log(`📋 Socket ${socket.id} unsubscribed from system logs`);
    socket.emit('systemLog:unsubscribed', { success: true });
  }

  // --- User Management Events ---

  /**
   * Emit event khi user bị ban
   */
  emitUserBanned(
    userId: string,
    reason: string,
    isPermanent: boolean,
    bannedEnd: string | null,
    bannedBy: string,
  ) {
    const event = {
      userId,
      reason,
      isPermanent,
      bannedEnd,
      bannedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`user:${userId}`).emit('user:banned', event);
    this.server.to('admin_room').emit('user:banned', event);
  }

  /**
   * Emit event khi user được unban
   */
  emitUserUnbanned(userId: string, unbannedBy: string) {
    const event = {
      userId,
      unbannedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`user:${userId}`).emit('user:unbanned', event);
    this.server.to('admin_room').emit('user:unbanned', event);
  }

  /**
   * Emit event khi user bị warn
   */
  emitUserWarned(
    userId: string,
    warningId: string,
    reason: string,
    expiresAt: string | null,
    warnedBy: string,
  ) {
    const event = {
      userId,
      warningId,
      reason,
      expiresAt,
      warnedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`user:${userId}`).emit('user:warned', event);
    this.server.to('admin_room').emit('user:warned', event);
  }

  /**
   * Emit event khi user được unwarn
   */
  emitUserUnwarned(userId: string, warningId: string, unwarnedBy: string) {
    const event = {
      userId,
      warningId,
      unwarnedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`user:${userId}`).emit('user:unwarned', event);
    this.server.to('admin_room').emit('user:unwarned', event);
  }

  /**
   * Emit event khi session bị revoke
   */
  emitUserSessionRevoked(userId: string, sessionId: string, revokedBy: string) {
    const event = {
      userId,
      sessionId,
      revokedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`user:${userId}`).emit('user:sessionRevoked', event);
    this.server.to('admin_room').emit('user:sessionRevoked', event);
  }

  /**
   * Emit event khi tất cả sessions bị revoke
   */
  emitAllUserSessionsRevoked(userId: string, revokedBy: string) {
    const event = {
      userId,
      revokedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`user:${userId}`).emit('user:allSessionsRevoked', event);
    this.server.to('admin_room').emit('user:allSessionsRevoked', event);
  }

  // --- Warning Category Events ---

  /**
   * Emit event khi Warning Category được tạo
   */
  emitWarningCategoryCreated(
    id: string,
    name: string,
    severity: string,
    createdBy: string,
  ) {
    const event = {
      id,
      name,
      severity,
      createdBy,
      timestamp: new Date().toISOString(),
    };
    this.server.emit('warningCategory:created', event);
  }

  /**
   * Emit event khi Warning Category được update
   */
  emitWarningCategoryUpdated(id: string, name: string, updatedBy: string) {
    const event = {
      id,
      name,
      updatedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.emit('warningCategory:updated', event);
  }

  /**
   * Emit event khi Warning Category bị xóa
   */
  emitWarningCategoryDeleted(id: string, deletedBy: string) {
    const event = {
      id,
      deletedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.emit('warningCategory:deleted', event);
  }

  /**
   * Emit event khi xóa nhiều Warning Category
   */
  emitWarningCategoryDeletedMany(ids: string[], deletedBy: string) {
    const event = {
      ids,
      deletedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.emit('warningCategory:deletedMany', event);
  }

  // --- Warn Penalty Events ---

  /**
   * Emit event khi Warn Penalty được tạo
   */
  emitWarnPenaltyCreated(
    id: string,
    minWarnCount: number,
    maxWarnCount: number | null,
    createdBy: string,
  ) {
    const event = {
      id,
      minWarnCount,
      maxWarnCount,
      createdBy,
      timestamp: new Date().toISOString(),
    };
    this.server.emit('warnPenalty:created', event);
  }

  /**
   * Emit event khi Warn Penalty được cập nhật
   */
  emitWarnPenaltyUpdated(
    id: string,
    minWarnCount: number,
    maxWarnCount: number | null,
    updatedBy: string,
  ) {
    const event = {
      id,
      minWarnCount,
      maxWarnCount,
      updatedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.emit('warnPenalty:updated', event);
  }

  /**
   * Emit event khi Warn Penalty bị xóa
   */
  emitWarnPenaltyDeleted(id: string, deletedBy: string) {
    const event = {
      id,
      deletedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.emit('warnPenalty:deleted', event);
  }

  /**
   * Emit event khi xóa nhiều Warn Penalty
   */
  emitWarnPenaltyDeletedMany(ids: string[], deletedBy: string) {
    const event = {
      ids,
      deletedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.emit('warnPenalty:deletedMany', event);
  }

  // --- System Role Events ---

  /**
   * Emit event khi Role hệ thống được tạo
   */
  emitRoleCreated(roleId: string, name: string, createdBy: string) {
    const event = {
      roleId,
      name,
      createdBy,
      timestamp: new Date().toISOString(),
    };
    this.server.to('admin_room').emit('role:created', event);
  }

  /**
   * Emit event khi Role hệ thống được cập nhật
   */
  emitRoleUpdated(roleId: string, name: string, updatedBy: string) {
    const event = {
      roleId,
      name,
      updatedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.to('admin_room').emit('role:updated', event);
  }

  /**
   * Emit event khi Role hệ thống bị xóa
   */
  emitRoleDeleted(roleId: string, deletedBy: string) {
    const event = {
      roleId,
      deletedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.to('admin_room').emit('role:deleted', event);
  }

  /**
   * Emit event khi xóa nhiều Role hệ thống
   */
  emitRoleDeletedMany(roleIds: string[], deletedBy: string) {
    const event = {
      roleIds,
      deletedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.to('admin_room').emit('role:deletedMany', event);
  }

  /**
   * Emit event khi roles của user được cập nhật
   */
  emitUserRolesUpdated(userId: string, roleIds: string[], updatedBy: string) {
    const event = {
      userId,
      roleIds,
      updatedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`user:${userId}`).emit('user:rolesUpdated', event);
    this.server.to('admin_room').emit('user:rolesUpdated', event);
  }

  /**
   * Emit event khi permissions của user được cập nhật
   */
  emitUserPermissionsUpdated(
    userId: string,
    permissionIds: string[],
    updatedBy: string,
  ) {
    const event = {
      userId,
      permissionIds,
      updatedBy,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`user:${userId}`).emit('user:permissionsUpdated', event);
    this.server.to('admin_room').emit('user:permissionsUpdated', event);
  }

  /**
   * Emit event khi user tải dữ liệu cá nhân
   */
  emitUserDataDownloaded(userId: string) {
    const event = {
      userId,
      timestamp: new Date().toISOString(),
    };
    this.server.to(`user:${userId}`).emit('user:dataDownloaded', event);
  }

  /**
   * Emit event khi user tự xóa tài khoản
   */
  emitUserAccountDeleted(userId: string) {
    const event = {
      userId,
      reason: 'self_delete',
      timestamp: new Date().toISOString(),
    };
    // Emit đến user room để force logout tất cả devices
    this.server.to(`user:${userId}`).emit('user:accountDeleted', event);
    // Emit đến admin room để thông báo
    this.server.to('admin_room').emit('user:accountDeleted', event);
  }

  /**
   * Emit event khi admin xóa 1 user
   */
  emitUserDeleted(userId: string, deletedBy: string) {
    const event = {
      userId,
      deletedBy,
      reason: 'admin_delete',
      timestamp: new Date().toISOString(),
    };
    // Emit đến user room để force logout
    this.server.to(`user:${userId}`).emit('user:accountDeleted', event);
    // Emit đến admin room
    this.server.to('admin_room').emit('user:deleted', event);
  }

  /**
   * Emit event khi admin xóa nhiều users
   */
  emitUsersDeletedMany(userIds: string[], deletedBy: string) {
    const event = {
      userIds,
      count: userIds.length,
      deletedBy,
      timestamp: new Date().toISOString(),
    };
    // Emit đến từng user room để force logout
    for (const userId of userIds) {
      this.server.to(`user:${userId}`).emit('user:accountDeleted', {
        userId,
        deletedBy,
        reason: 'admin_delete',
        timestamp: new Date().toISOString(),
      });
    }
    // Emit đến admin room
    this.server.to('admin_room').emit('user:deletedMany', event);
  }
}

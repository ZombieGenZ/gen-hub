/**
 * WebSocket Event Interfaces
 * Định nghĩa các interface cho socket events
 */

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
 * Event khi password được thay đổi
 */
export interface UserPasswordChangedEvent {
  userId: string;
  timestamp: string;
  message: string;
}

/**
 * Event khi email được xác thực
 */
export interface UserEmailVerifiedEvent {
  userId: string;
  email: string;
  timestamp: string;
  message: string;
}

/**
 * Event khi 2FA status thay đổi
 */
export interface User2FAStatusChangedEvent {
  userId: string;
  enabled: boolean;
  action: 'enabled' | 'disabled';
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
    avatar?: string | null;
    language?: string;
  };
  timestamp: string;
}

/**
 * Payload cho subscribe event
 */
export interface SubscribePayload {
  rooms: string[];
}

/**
 * Socket error event
 */
export interface SocketError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

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

/**
 * Event khi tạo mới WarehouseTemplate
 */
export interface WarehouseTemplateCreatedEvent {
  warehouseTemplateId: string;
  name: string;
  createdBy: string;
  timestamp: string;
}

/**
 * Event khi cập nhật WarehouseTemplate
 */
export interface WarehouseTemplateUpdatedEvent {
  warehouseTemplateId: string;
  name: string;
  updatedFields: string[];
  updatedBy: string;
  timestamp: string;
}

/**
 * Event khi xóa WarehouseTemplate
 */
export interface WarehouseTemplateDeletedEvent {
  warehouseTemplateId: string;
  name: string;
  deletedBy: string;
  timestamp: string;
}

/**
 * Event khi cập nhật layout WarehouseTemplate
 */
export interface WarehouseTemplateLayoutUpdatedEvent {
  warehouseTemplateId: string;
  name: string;
  updatedBy: string;
  summary: {
    rowsCreated: number;
    rowsUpdated: number;
    rowsDeleted: number;
    racksCreated: number;
    racksUpdated: number;
    racksDeleted: number;
    shelvesCreated: number;
    shelvesUpdated: number;
    shelvesDeleted: number;
    blocksCreated: number;
    blocksUpdated: number;
    blocksDeleted: number;
  };
  timestamp: string;
}

/**
 * Event khi tạo mới Organization
 */
export interface OrganizationCreatedEvent {
  organizationId: string;
  name: string;
  ownerId: string;
  timestamp: string;
}

/**
 * Event khi cập nhật Organization
 */
export interface OrganizationUpdatedEvent {
  organizationId: string;
  name: string;
  updatedBy: string;
  timestamp: string;
}

/**
 * Event khi xóa Organization
 */
export interface OrganizationDeletedEvent {
  organizationId: string;
  deletedBy: string;
  timestamp: string;
}

/**
 * Event khi mời thành viên vào Organization
 */
export interface MemberInvitedEvent {
  organizationId: string;
  organizationName: string;
  invitedUserId: string;
  invitedBy: string;
  timestamp: string;
}

/**
 * Event khi xóa thành viên khỏi Organization
 */
export interface MemberRemovedEvent {
  organizationId: string;
  memberId: string;
  removedBy: string;
  timestamp: string;
}

/**
 * Event khi thành viên chấp nhận lời mời
 */
export interface MemberAcceptedEvent {
  organizationId: string;
  organizationName: string;
  memberId: string;
  userId: string;
  timestamp: string;
}

/**
 * Event khi thành viên từ chối lời mời
 */
export interface MemberRejectedEvent {
  organizationId: string;
  userId: string;
  timestamp: string;
}

/**
 * Event khi thành viên rời khỏi tổ chức
 */
export interface MemberLeftEvent {
  organizationId: string;
  memberId: string;
  userId: string;
  timestamp: string;
}

/**
 * Event khi cập nhật roles của thành viên
 */
export interface MemberRolesUpdatedEvent {
  organizationId: string;
  memberId: string;
  roleIds: string[];
  updatedBy: string;
  timestamp: string;
}

/**
 * Event khi cập nhật permissions của thành viên
 */
export interface MemberPermissionsUpdatedEvent {
  organizationId: string;
  memberId: string;
  permissionIds: string[];
  updatedBy: string;
  timestamp: string;
}

/**
 * Event khi cập nhật display name của thành viên
 */
export interface MemberDisplayNameUpdatedEvent {
  organizationId: string;
  memberId: string;
  displayName: string;
  updatedBy: string;
  timestamp: string;
}

/**
 * Event khi chuyển quyền sở hữu Organization
 */
export interface OwnershipTransferredEvent {
  organizationId: string;
  organizationName: string;
  oldOwnerId: string;
  newOwnerId: string;
  timestamp: string;
}

/**
 * Event khi trạng thái online của user thay đổi
 */
export interface UserOnlineStatusEvent {
  userId: string;
  isOnline: boolean;
  lastOnline: string | null;
  timestamp: string;
}

/**
 * Event khi tạo Organization Role
 */
export interface OrgRoleCreatedEvent {
  organizationId: string;
  roleId: string;
  roleName: string;
  createdBy: string;
  timestamp: string;
}

/**
 * Event khi cập nhật Organization Role
 */
export interface OrgRoleUpdatedEvent {
  organizationId: string;
  roleId: string;
  roleName: string;
  updatedBy: string;
  timestamp: string;
}

/**
 * Event khi xóa Organization Role
 */
export interface OrgRoleDeletedEvent {
  organizationId: string;
  roleId: string;
  deletedBy: string;
  timestamp: string;
}

/**
 * Event khi tạo API Key
 */
export interface ApiKeyCreatedEvent {
  organizationId: string;
  apiKeyId: string;
  name: string;
  createdBy: string;
  timestamp: string;
}

/**
 * Event khi cập nhật API Key
 */
export interface ApiKeyUpdatedEvent {
  organizationId: string;
  apiKeyId: string;
  name: string;
  updatedBy: string;
  timestamp: string;
}

/**
 * Event khi xóa API Key
 */
export interface ApiKeyDeletedEvent {
  organizationId: string;
  apiKeyId: string;
  deletedBy: string;
  timestamp: string;
}

/**
 * Event khi có system log mới (realtime)
 */
export interface SystemLogEvent {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  module: string;
  action: string;
  message: string;
  meta_data?: Record<string, unknown>;
  user_id?: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Event khi user bị ban
 */
export interface UserBannedEvent {
  userId: string;
  reason: string;
  isPermanent: boolean;
  bannedEnd: string | null;
  bannedBy: string;
  timestamp: string;
}

/**
 * Event khi user được unban
 */
export interface UserUnbannedEvent {
  userId: string;
  unbannedBy: string;
  timestamp: string;
}

/**
 * Event khi user bị warn
 */
export interface UserWarnedEvent {
  userId: string;
  warningId: string;
  reason: string;
  expiresAt: string | null;
  warnedBy: string;
  timestamp: string;
}

/**
 * Event khi user được unwarn
 */
export interface UserUnwarnedEvent {
  userId: string;
  warningId: string;
  unwarnedBy: string;
  timestamp: string;
}

/**
 * Event khi session bị revoke
 */
export interface UserSessionRevokedEvent {
  userId: string;
  sessionId: string;
  revokedBy: string;
  timestamp: string;
}

/**
 * Event khi tất cả sessions bị revoke
 */
export interface UserAllSessionsRevokedEvent {
  userId: string;
  revokedBy: string;
  timestamp: string;
}

/**
 * Event khi Warning Category được tạo
 */
export interface WarningCategoryCreatedEvent {
  id: string;
  name: string;
  severity: string;
  createdBy: string;
  timestamp: string;
}

/**
 * Event khi Warning Category được update
 */
export interface WarningCategoryUpdatedEvent {
  id: string;
  name: string;
  updatedBy: string;
  timestamp: string;
}

/**
 * Event khi Warning Category bị xóa
 */
export interface WarningCategoryDeletedEvent {
  id: string;
  deletedBy: string;
  timestamp: string;
}

/**
 * Event khi xóa nhiều Warning Category
 */
export interface WarningCategoryDeletedManyEvent {
  ids: string[];
  deletedBy: string;
  timestamp: string;
}


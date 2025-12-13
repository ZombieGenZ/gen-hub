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

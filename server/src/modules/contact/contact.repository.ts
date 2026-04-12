import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ContactConversation,
  ContactMessage,
  ContactStatus,
  ContactChannel,
  MessageType,
  Prisma,
  ContactActionType,
  ContactActionPerformedByType,
  ContactActionLog,
} from '@prisma/client';
import {
  IContactConversationWithMessages,
  IPaginatedContactResponse,
  ICreateMessageData,
  IContactConversationListItem,
  IContactConversationStaff,
} from './interfaces';
import { QueryContactDto } from './dto';

/**
 * Repository xử lý database operations cho Contact
 * Đã tối ưu hóa với select thay vì include và parallel queries
 */
@Injectable()
export class ContactRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate ticket code: TICKET-YYYYMMDD-XXX
   */
  async generateTicketCode(prefix: string = 'TICKET'): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');

    // Đếm số ticket trong ngày
    const count = await this.prisma.contactConversation.count({
      where: {
        code: { startsWith: `${prefix}-${dateStr}` },
      },
    });

    const seq = String(count + 1).padStart(3, '0');
    return `${prefix}-${dateStr}-${seq}`;
  }

  /**
   * Tạo conversation mới
   */
  async createConversation(
    data: Prisma.ContactConversationCreateInput,
  ): Promise<ContactConversation> {
    return this.prisma.contactConversation.create({ data });
  }

  /**
   * Tạo message
   */
  async createMessage(data: ICreateMessageData): Promise<ContactMessage> {
    return this.prisma.contactMessage.create({
      data: {
        conversation_id: data.conversation_id,
        sender_type: data.sender_type,
        sender_id: data.sender_id,
        sender_name: data.sender_name,
        sender_email: data.sender_email,
        message_type: data.message_type || MessageType.TEXT,
        content: data.content,
        content_html: data.content_html,
        email_message_id: data.email_message_id,
        email_in_reply_to: data.email_in_reply_to,
        email_subject: data.email_subject,
        is_internal: data.is_internal || false,
        created_by: data.created_by,
      },
    });
  }

  /**
   * Cập nhật message
   */
  async updateMessage(
    id: string,
    data: Prisma.ContactMessageUpdateInput,
  ): Promise<ContactMessage> {
    return this.prisma.contactMessage.update({
      where: { id },
      data: {
        ...data,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Tìm conversation theo ID - OPTIMIZED với select cụ thể
   */
  async findById(id: string): Promise<IContactConversationWithMessages | null> {
    const result = await this.prisma.contactConversation.findFirst({
      where: { id, is_deleted: false },
      include: {
        messages: {
          where: { is_deleted: false },
          orderBy: { created_at: 'asc' },
          select: {
            id: true,
            sender_type: true,
            sender_id: true,
            sender_name: true,
            sender_email: true,
            message_type: true,
            content: true,
            content_html: true,
            is_internal: true,
            is_read: true,
            read_at: true,
            created_at: true,
            attachments: true,
          },
        },
        assigned_staff: {
          select: { id: true, name: true, email: true },
        },
        assigned_staff_list: {
          where: { is_deleted: false, is_active: true },
          select: {
            id: true,
            staff_id: true,
            assigned_by: true,
            assigned_at: true,
            staff: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        tag_mappings: {
          where: { is_deleted: false },
          include: {
            tag: { select: { id: true, name: true, color: true } },
          },
        },
      },
    });

    return result as unknown as IContactConversationWithMessages | null;
  }

  /**
   * Tìm conversation theo code
   */
  async findByCode(code: string): Promise<ContactConversation | null> {
    return this.prisma.contactConversation.findFirst({
      where: { code, is_deleted: false },
    });
  }

  /**
   * Tìm conversation theo session_id (Live Chat)
   */
  async findBySessionId(
    sessionId: string,
  ): Promise<ContactConversation | null> {
    return this.prisma.contactConversation.findFirst({
      where: { session_id: sessionId, is_deleted: false },
    });
  }

  /**
   * Lấy danh sách phiên live chat của user (theo user_id)
   */
  async findLiveChatConversationsByUserId(
    userId: string,
  ): Promise<ContactConversation[]> {
    return this.prisma.contactConversation.findMany({
      where: {
        user_id: userId,
        channel: ContactChannel.LIVE_CHAT,
        is_deleted: false,
      },
      orderBy: { last_activity_at: 'desc' },
    });
  }

  /**
   * Lấy tất cả messages của conversation
   */
  async getMessages(conversationId: string): Promise<ContactMessage[]> {
    return this.prisma.contactMessage.findMany({
      where: { conversation_id: conversationId, is_deleted: false },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * Tìm conversation by email thread ID
   */
  async findByEmailThreadId(
    emailThreadId: string,
  ): Promise<ContactConversation | null> {
    return this.prisma.contactConversation.findFirst({
      where: { email_thread_id: emailThreadId, is_deleted: false },
    });
  }

  /**
   * Tìm conversation theo Discord Channel ID
   */
  async findByDiscordChannelId(
    channelId: string,
  ): Promise<ContactConversation | null> {
    return this.prisma.contactConversation.findFirst({
      where: { discord_channel_id: channelId, is_deleted: false },
    });
  }

  /**
   * Tìm conversation theo email_message_id (In-Reply-To match)
   * Cải thiện: tìm kiếm trong cả email_references để hỗ trợ reply chains
   */
  async findByEmailMessageId(
    messageId: string,
  ): Promise<ContactConversation | null> {
    // 1. Tìm trong messages table theo email_message_id
    const message = await this.prisma.contactMessage.findFirst({
      where: { email_message_id: messageId, is_deleted: false },
      include: { conversation: true },
    });
    if (message?.conversation) {
      return message.conversation;
    }

    // 2. Tìm trong conversation theo email_message_id
    const conversation = await this.prisma.contactConversation.findFirst({
      where: { email_message_id: messageId, is_deleted: false },
    });
    if (conversation) {
      return conversation;
    }

    // 3. Tìm trong email_references array (hỗ trợ reply chains)
    return this.prisma.contactConversation.findFirst({
      where: {
        email_references: { has: messageId },
        is_deleted: false,
      },
    });
  }

  /**
   * Lấy danh sách conversations với phân trang và lọc - OPTIMIZED
   * Sử dụng select thay vì include để giảm data transfer
   */
  async findMany(
    query: QueryContactDto,
  ): Promise<IPaginatedContactResponse<IContactConversationListItem>> {
    const {
      limit = 10,
      offset = 0,
      keywords,
      status,
      priority,
      assigned_staff_id,
      is_priority_customer,
      is_skipped,
    } = query;

    const where: Prisma.ContactConversationWhereInput = {
      is_deleted: false,
    };

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assigned_staff_id) where.assigned_staff_id = assigned_staff_id;
    if (is_priority_customer !== undefined)
      where.is_priority_customer = is_priority_customer;
    if (is_skipped !== undefined) where.is_skipped = is_skipped;

    if (keywords) {
      where.OR = [
        { code: { contains: keywords, mode: 'insensitive' } },
        { customer_name: { contains: keywords, mode: 'insensitive' } },
        { customer_email: { contains: keywords, mode: 'insensitive' } },
        { subject: { contains: keywords, mode: 'insensitive' } },
      ];
    }

    // Parallel queries để tối ưu performance
    const [items, total] = await Promise.all([
      this.prisma.contactConversation.findMany({
        where,
        orderBy: [
          { priority: 'desc' },
          { last_activity_at: 'desc' },
          { created_at: 'desc' },
        ],
        skip: offset,
        take: limit,
        select: {
          id: true,
          code: true,
          customer_name: true,
          customer_email: true,
          customer_phone: true,
          customer_company: true,
          subject: true,
          status: true,
          priority: true,
          channel: true,
          assigned_staff_id: true,
          last_activity_at: true,
          created_at: true,
          assigned_staff: {
            select: { id: true, name: true, email: true },
          },
          assigned_staff_list: {
            where: { is_deleted: false, is_active: true },
            select: {
              id: true,
              staff_id: true,
              staff: {
                select: { id: true, name: true, email: true },
              },
            },
          },
          tag_mappings: {
            where: { is_deleted: false },
            select: {
              tag: { select: { id: true, name: true, color: true } },
            },
          },
          _count: {
            select: {
              messages: { where: { is_deleted: false } },
              assigned_staff_list: {
                where: { is_deleted: false, is_active: true },
              },
            },
          },
        },
      }),
      this.prisma.contactConversation.count({ where }),
    ]);

    // Transform để match interface
    const transformedItems: IContactConversationListItem[] = items.map(
      (item) => ({
        id: item.id,
        code: item.code,
        customer_name: item.customer_name,
        customer_email: item.customer_email,
        customer_phone: item.customer_phone ?? undefined,
        customer_company: item.customer_company ?? undefined,
        subject: item.subject ?? undefined,
        status: item.status,
        priority: item.priority,
        channel: item.channel,
        assigned_staff_id: item.assigned_staff_id ?? undefined,
        assigned_staff: item.assigned_staff
          ? {
              id: item.assigned_staff.id,
              name: item.assigned_staff.name,
              email: item.assigned_staff.email ?? undefined,
            }
          : undefined,
        assigned_staff_list: item.assigned_staff_list.map((s) => ({
          id: s.staff.id,
          name: s.staff.name,
          email: s.staff.email ?? undefined,
        })),
        tags: item.tag_mappings.map((t) => ({
          id: t.tag.id,
          name: t.tag.name,
          color: t.tag.color ?? undefined,
        })),
        assigned_staff_count: item._count.assigned_staff_list,
        messages_count: item._count.messages,
        last_activity_at: item.last_activity_at ?? undefined,
        created_at: item.created_at,
      }),
    );

    return {
      items: transformedItems,
      total,
      limit,
      offset,
      hasMore: offset + items.length < total,
    };
  }

  /**
   * Lấy messages của conversation
   */
  async findMessagesByConversationId(
    conversationId: string,
  ): Promise<ContactMessage[]> {
    return this.prisma.contactMessage.findMany({
      where: { conversation_id: conversationId, is_deleted: false },
      orderBy: { created_at: 'asc' },
    });
  }

  /**
   * Cập nhật conversation
   */
  async update(
    id: string,
    data: Prisma.ContactConversationUpdateInput,
  ): Promise<ContactConversation> {
    return this.prisma.contactConversation.update({
      where: { id },
      data: {
        ...data,
        last_activity_at: new Date(),
        updated_at: new Date(),
      },
    });
  }

  /**
   * Soft delete conversation
   */
  async softDelete(id: string, userId: string): Promise<void> {
    await this.prisma.contactConversation.update({
      where: { id },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }

  /**
   * Soft delete many conversations
   */
  async softDeleteMany(ids: string[], userId: string): Promise<number> {
    const result = await this.prisma.contactConversation.updateMany({
      where: { id: { in: ids } },
      data: {
        is_deleted: true,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
    return result.count;
  }

  /**
   * Đóng conversation
   */
  async closeConversation(
    id: string,
    userId: string,
  ): Promise<ContactConversation> {
    return this.prisma.contactConversation.update({
      where: { id },
      data: {
        status: ContactStatus.CLOSED,
        closed_at: new Date(),
        updated_by: userId,
        updated_at: new Date(),
      },
    });
  }

  /**
   * Cập nhật first_response_at nếu chưa có
   */
  async updateFirstResponseIfNeeded(id: string): Promise<void> {
    await this.prisma.contactConversation.updateMany({
      where: { id, first_response_at: null },
      data: { first_response_at: new Date() },
    });
  }

  /**
   * Assign nhiều staff vào conversation
   */
  async assignStaff(
    conversationId: string,
    staffIds: string[],
    assignedBy: string,
  ): Promise<IContactConversationStaff[]> {
    // Lọc bỏ những staff đã được assign
    const existingAssignments =
      await this.prisma.contactConversationStaff.findMany({
        where: {
          conversation_id: conversationId,
          staff_id: { in: staffIds },
          is_deleted: false,
        },
        select: { staff_id: true },
      });

    const existingStaffIds = new Set(
      existingAssignments.map((a) => a.staff_id),
    );
    const newStaffIds = staffIds.filter((id) => !existingStaffIds.has(id));

    if (newStaffIds.length === 0) {
      return [];
    }

    // Tạo assignments mới
    await this.prisma.contactConversationStaff.createMany({
      data: newStaffIds.map((staffId) => ({
        conversation_id: conversationId,
        staff_id: staffId,
        assigned_by: assignedBy,
        created_by: assignedBy,
      })),
    });

    // Trả về danh sách đã tạo
    return this.prisma.contactConversationStaff.findMany({
      where: {
        conversation_id: conversationId,
        staff_id: { in: newStaffIds },
        is_deleted: false,
      },
      include: {
        staff: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  /**
   * Unassign nhiều staff khỏi conversation
   */
  async unassignManyStaff(
    conversationId: string,
    staffIds: string[],
    deletedBy: string,
  ): Promise<number> {
    const result = await this.prisma.contactConversationStaff.updateMany({
      where: {
        conversation_id: conversationId,
        staff_id: { in: staffIds },
        is_deleted: false,
      },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
        deleted_by: deletedBy,
      },
    });
    return result.count;
  }

  /**
   * Lấy danh sách staff được assign vào conversation
   */
  async getAssignedStaff(
    conversationId: string,
  ): Promise<IContactConversationStaff[]> {
    return this.prisma.contactConversationStaff.findMany({
      where: {
        conversation_id: conversationId,
        is_deleted: false,
        is_active: true,
      },
      include: {
        staff: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { assigned_at: 'asc' },
    });
  }

  /**
   * Đồng bộ danh sách staff (thêm mới hoặc xóa dựa trên danh sách input)
   */
  async syncStaff(
    conversationId: string,
    staffIds: string[],
    updatedBy: string,
  ): Promise<{ added: string[]; removed: string[] }> {
    // Lấy danh sách đang active
    const current = await this.prisma.contactConversationStaff.findMany({
      where: {
        conversation_id: conversationId,
        is_deleted: false,
        is_active: true,
      },
      select: { staff_id: true },
    });
    const currentIds = new Set(current.map((c) => c.staff_id));
    const targetIds = new Set(staffIds);

    const toAdd = staffIds.filter((id) => !currentIds.has(id));
    const toRemove = Array.from(currentIds).filter((id) => !targetIds.has(id));

    if (toAdd.length) {
      await this.assignStaff(conversationId, toAdd, updatedBy);
    }

    if (toRemove.length) {
      await this.unassignManyStaff(conversationId, toRemove, updatedBy);
    }

    return { added: toAdd, removed: toRemove };
  }

  /**
   * Đồng bộ danh sách tags (thêm mới hoặc xóa dựa trên danh sách input)
   */
  async syncTags(
    conversationId: string,
    tagIds: string[],
    updatedBy: string,
  ): Promise<void> {
    // Lấy tất cả mappings hiện có (kể cả deleted) để xử lý unique constraint
    const currentAll = await this.prisma.contactTagOnConversation.findMany({
      where: { conversation_id: conversationId },
      select: { tag_id: true, id: true, is_deleted: true },
    });

    const currentMap = new Map(currentAll.map((t) => [t.tag_id, t]));
    const ops: any[] = [];

    // 1. Duyệt danh sách mới: thêm hoặc active lại
    for (const tagId of tagIds) {
      const existing = currentMap.get(tagId);
      if (existing) {
        if (existing.is_deleted) {
          // Restore
          ops.push(
            this.prisma.contactTagOnConversation.update({
              where: { id: existing.id },
              data: {
                is_deleted: false,
                is_active: true,
                updated_at: new Date(),
              },
            }),
          );
        }
        // Nếu đã active thì thôi
      } else {
        // Create new
        ops.push(
          this.prisma.contactTagOnConversation.create({
            data: {
              conversation_id: conversationId,
              tag_id: tagId,
              created_by: updatedBy,
            },
          }),
        );
      }
    }

    // 2. Duyệt danh sách cũ: xóa nếu không có trong danh sách mới
    for (const [tagId, existing] of currentMap) {
      if (!tagIds.includes(tagId) && !existing.is_deleted) {
        // Delete (soft)
        ops.push(
          this.prisma.contactTagOnConversation.update({
            where: { id: existing.id },
            data: {
              is_deleted: true,
              is_active: false,
              deleted_by: updatedBy,
              deleted_at: new Date(),
            },
          }),
        );
      }
    }

    if (ops.length > 0) {
      await this.prisma.$transaction(ops);
    }
  }

  /**
   * Cập nhật trạng thái assignment khi User bị thay đổi is_active/is_deleted
   */
  async updateStaffAssignmentsOnUserChange(
    userId: string,
    isActive: boolean,
  ): Promise<number> {
    const result = await this.prisma.contactConversationStaff.updateMany({
      where: {
        staff_id: userId,
        is_deleted: false,
      },
      data: {
        is_active: isActive,
      },
    });
    return result.count;
  }

  /**
   * Tạo action log cho conversation
   * Ghi lại lịch sử các hành động: close, reopen, delete, whitelist, blacklist, priority, skip
   */
  async createActionLog(data: {
    conversationId: string;
    actionType: ContactActionType;
    reason?: string;
    listType?: string;
    matchType?: string;
    matchValue?: string;
    priority?: string;
    oldStatus?: string;
    newStatus?: string;
    performedById?: string;
    performedByName?: string;
    performedByType?: ContactActionPerformedByType;
  }): Promise<ContactActionLog> {
    return this.prisma.contactActionLog.create({
      data: {
        conversation_id: data.conversationId,
        action_type: data.actionType,
        reason: data.reason,
        list_type: data.listType,
        match_type: data.matchType,
        match_value: data.matchValue,
        priority: data.priority,
        old_status: data.oldStatus,
        new_status: data.newStatus,
        performed_by_id: data.performedById,
        performed_by_name: data.performedByName,
        performed_by_type:
          data.performedByType || ContactActionPerformedByType.SYSTEM,
      },
    });
  }

  /**
   * Lấy danh sách action logs của conversation
   */
  async findActionLogsByConversationId(
    conversationId: string,
  ): Promise<ContactActionLog[]> {
    return this.prisma.contactActionLog.findMany({
      where: { conversation_id: conversationId },
      orderBy: { created_at: 'desc' },
    });
  }
}

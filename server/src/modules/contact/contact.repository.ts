import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    ContactConversation,
    ContactMessage,
    ContactStatus,
    ContactChannel,
    MessageSender,
    MessageType,
    Prisma,
} from '@prisma/client';
import {
    IContactConversationWithMessages,
    IPaginatedContactResponse,
    ICreateMessageData,
} from './interfaces';
import { QueryContactDto } from './dto';

/**
 * Repository xử lý database operations cho Contact
 */
@Injectable()
export class ContactRepository {
    constructor(private readonly prisma: PrismaService) { }

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
     * Tìm conversation theo ID
     */
    async findById(id: string): Promise<IContactConversationWithMessages | null> {
        return this.prisma.contactConversation.findFirst({
            where: { id, is_deleted: false },
            include: {
                messages: {
                    where: { is_deleted: false },
                    orderBy: { created_at: 'asc' },
                },
                assigned_staff: {
                    select: { id: true, name: true, email: true },
                },
                tag_mappings: {
                    where: { is_deleted: false },
                    include: {
                        tag: { select: { id: true, name: true, color: true } },
                    },
                },
            },
        });
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
     * Tìm conversation theo email_message_id (In-Reply-To match)
     */
    async findByEmailMessageId(
        messageId: string,
    ): Promise<ContactConversation | null> {
        // Tìm trong messages trước
        const message = await this.prisma.contactMessage.findFirst({
            where: { email_message_id: messageId, is_deleted: false },
            include: { conversation: true },
        });
        if (message?.conversation) {
            return message.conversation;
        }

        // Tìm trong conversation
        return this.prisma.contactConversation.findFirst({
            where: { email_message_id: messageId, is_deleted: false },
        });
    }

    /**
     * Lấy danh sách conversations với phân trang và lọc
     */
    async findMany(
        query: QueryContactDto,
    ): Promise<IPaginatedContactResponse<ContactConversation>> {
        const { limit = 10, offset = 0, keywords, status, priority, assigned_staff_id } = query;

        const where: Prisma.ContactConversationWhereInput = {
            is_deleted: false,
        };

        if (status) where.status = status;
        if (priority) where.priority = priority;
        if (assigned_staff_id) where.assigned_staff_id = assigned_staff_id;

        if (keywords) {
            where.OR = [
                { code: { contains: keywords, mode: 'insensitive' } },
                { customer_name: { contains: keywords, mode: 'insensitive' } },
                { customer_email: { contains: keywords, mode: 'insensitive' } },
                { subject: { contains: keywords, mode: 'insensitive' } },
            ];
        }

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
            }),
            this.prisma.contactConversation.count({ where }),
        ]);

        return {
            items,
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
    async closeConversation(id: string, userId: string): Promise<ContactConversation> {
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
}

import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { ContactStatus, ContactChannel, MessageSender, MessageType, ContactConversation } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

import { ContactRepository } from './contact.repository';
import {
    CreateContactDto,
    QueryContactDto,
    UpdateContactDto,
    ReplyContactDto,
} from './dto';
import {
    IContactConversationWithMessages,
    IPaginatedContactResponse,
} from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { EmailService } from '../notification/email.service';

/**
 * Service xử lý business logic cho Contact module
 */
@Injectable()
export class ContactService {
    private readonly CACHE_TTL: number;
    private readonly LIST_CACHE_TTL: number;
    private readonly TICKET_PREFIX: string;

    constructor(
        private readonly repository: ContactRepository,
        private readonly redisService: RedisService,
        private readonly websocketGateway: WebsocketGateway,
        private readonly systemLogService: SystemLogService,
        private readonly emailService: EmailService,
        private readonly configService: ConfigService,
        private readonly i18n: I18nService,
    ) {
        this.CACHE_TTL = this.configService.get<number>('REDIS_CONTACT_CACHE_TTL') || 300;
        this.LIST_CACHE_TTL = this.configService.get<number>('REDIS_CONTACT_LIST_CACHE_TTL') || 60;
        this.TICKET_PREFIX = this.configService.get<string>('CONTACT_TICKET_PREFIX') || 'TICKET';
    }

    private getCacheKey(id: string): string {
        return `contact:detail:${id}`;
    }

    private getListCachePattern(): string {
        return 'contact:list:*';
    }

    private getListCacheKey(query: QueryContactDto): string {
        const hash = Buffer.from(JSON.stringify(query)).toString('base64');
        return `contact:list:${hash}`;
    }

    private async invalidateCache(id: string): Promise<void> {
        await this.redisService.del(this.getCacheKey(id));
    }

    private async invalidateListCache(): Promise<void> {
        await this.redisService.delByPattern(this.getListCachePattern());
    }

    /**
     * Tạo ticket từ form website (public)
     */
    async createFromWebForm(
        dto: CreateContactDto,
        lang: string = 'vi',
    ): Promise<{ code: string; message: string }> {
        // Generate ticket code
        const code = await this.repository.generateTicketCode(this.TICKET_PREFIX);

        // Generate email thread ID
        const supportEmail = this.configService.get<string>('EMAIL_SUPPORT_ADDRESS');
        const emailMessageId = `<${code.toLowerCase()}-${Date.now()}@${supportEmail?.split('@')[1] || 'genhub.dev'}>`;

        // Tạo conversation
        const conversation = await this.repository.createConversation({
            code,
            customer_name: dto.name,
            customer_email: dto.email.toLowerCase(),
            customer_phone: dto.phone,
            customer_company: dto.company,
            subject: dto.subject,
            status: ContactStatus.OPEN,
            channel: ContactChannel.WEBSITE_FORM,
            email_thread_id: `thread-${code}`,
            email_message_id: emailMessageId,
            last_activity_at: new Date(),
        });

        // Tạo message đầu tiên
        await this.repository.createMessage({
            conversation_id: conversation.id,
            sender_type: MessageSender.CUSTOMER,
            sender_name: dto.name,
            sender_email: dto.email.toLowerCase(),
            message_type: MessageType.TEXT,
            content: dto.message,
            email_subject: dto.subject,
        });

        // Gửi email xác nhận
        try {
            await this.emailService.sendContactConfirmationEmail(
                dto.email,
                dto.name,
                code,
                dto.phone,
                dto.subject,
                dto.message,
                emailMessageId,
                lang,
            );
        } catch (error) {
            this.systemLogService.error('contact', 'email', `Failed to send confirmation email: ${error}`, {
                metaData: { conversationId: conversation.id, code },
            });
        }

        // Log
        this.systemLogService.info('contact', 'create', `Created contact ticket: ${code}`, {
            metaData: { conversationId: conversation.id, channel: 'WEBSITE_FORM', customerEmail: dto.email },
        });

        // Emit WebSocket - thông báo admin có ticket mới
        this.websocketGateway.emitContactConversationCreated(conversation.id, code, dto.email);

        // Invalidate list cache
        await this.invalidateListCache();

        const message = await this.i18n.t('contact.success.created', { lang });
        return { code, message };
    }

    /**
     * Lấy danh sách tickets (admin)
     */
    async findMany(
        query: QueryContactDto,
        lang: string = 'vi',
    ): Promise<IPaginatedContactResponse<IContactConversationWithMessages>> {
        const cacheKey = this.getListCacheKey(query);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Cache invalid
            }
        }

        const result = await this.repository.findMany(query);

        await this.redisService.set(cacheKey, JSON.stringify(result), this.LIST_CACHE_TTL);
        return result as IPaginatedContactResponse<IContactConversationWithMessages>;
    }

    /**
     * Lấy chi tiết ticket
     */
    async findById(
        id: string,
        lang: string = 'vi',
    ): Promise<IContactConversationWithMessages> {
        const cacheKey = this.getCacheKey(id);
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Cache invalid
            }
        }

        const conversation = await this.repository.findById(id);
        if (!conversation) {
            throw new NotFoundException(
                await this.i18n.t('contact.errors.not_found', { lang }),
            );
        }

        await this.redisService.set(cacheKey, JSON.stringify(conversation), this.CACHE_TTL);
        return conversation;
    }

    /**
     * Lấy messages của ticket
     */
    async findMessages(id: string, lang: string = 'vi') {
        const conversation = await this.repository.findById(id);
        if (!conversation) {
            throw new NotFoundException(
                await this.i18n.t('contact.errors.not_found', { lang }),
            );
        }
        return this.repository.findMessagesByConversationId(id);
    }

    /**
     * Cập nhật ticket (status, priority, assign)
     */
    async update(
        id: string,
        dto: UpdateContactDto,
        userId: string,
        staffName: string,
        lang: string = 'vi',
    ): Promise<IContactConversationWithMessages> {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new NotFoundException(
                await this.i18n.t('contact.errors.not_found', { lang }),
            );
        }

        const updateData: any = { updated_by: userId };

        if (dto.status !== undefined) updateData.status = dto.status;
        if (dto.priority !== undefined) updateData.priority = dto.priority;
        if (dto.tags !== undefined) updateData.tags = dto.tags;

        if (dto.assigned_staff_id !== undefined) {
            updateData.assigned_staff_id = dto.assigned_staff_id;
            updateData.assigned_by = userId;
            updateData.assigned_at = new Date();
        }

        const updated = await this.repository.update(id, updateData);

        // Invalidate cache
        await Promise.all([
            this.invalidateCache(id),
            this.invalidateListCache(),
        ]);

        // Log
        this.systemLogService.info('contact', 'update', `Updated ticket: ${existing.code}`, {
            userId,
            metaData: { conversationId: id, changes: dto },
        });

        // WebSocket
        this.websocketGateway.emitContactConversationUpdated(
            id,
            existing.code,
            Object.keys(dto),
            userId,
        );

        return { ...updated, messages: existing.messages };
    }

    /**
     * Staff reply
     */
    async reply(
        id: string,
        dto: ReplyContactDto,
        userId: string,
        staffName: string,
        staffEmail: string,
        lang: string = 'vi',
    ): Promise<{ message: string }> {
        const conversation = await this.repository.findById(id);
        if (!conversation) {
            throw new NotFoundException(
                await this.i18n.t('contact.errors.not_found', { lang }),
            );
        }

        if (conversation.status === ContactStatus.CLOSED) {
            throw new BadRequestException(
                await this.i18n.t('contact.errors.already_closed', { lang }),
            );
        }

        // Generate email message ID cho reply
        const supportEmail = this.configService.get<string>('EMAIL_SUPPORT_ADDRESS');
        const emailDomain = supportEmail?.split('@')[1] || 'genhub.dev';
        const emailMessageId = `<${conversation.code.toLowerCase()}-reply-${Date.now()}@${emailDomain}>`;

        // Tạo message
        const message = await this.repository.createMessage({
            conversation_id: id,
            sender_type: MessageSender.STAFF,
            sender_id: userId,
            sender_name: staffName,
            sender_email: staffEmail,
            message_type: dto.is_internal ? MessageType.SYSTEM_NOTE : MessageType.EMAIL,
            content: dto.content,
            email_message_id: emailMessageId,
            email_in_reply_to: conversation.email_message_id || undefined,
            is_internal: dto.is_internal,
            created_by: userId,
        });

        // Cập nhật first_response_at nếu chưa có
        await this.repository.updateFirstResponseIfNeeded(id);

        // Cập nhật status thành PENDING nếu đang OPEN
        if (conversation.status === ContactStatus.OPEN) {
            await this.repository.update(id, { status: ContactStatus.PENDING });
        }

        // Gửi email nếu không phải internal note
        if (!dto.is_internal) {
            try {
                // Collect references từ messages trước
                const references = conversation.email_references || [];
                if (conversation.email_message_id) {
                    references.push(conversation.email_message_id);
                }

                await this.emailService.sendContactReplyEmail(
                    conversation.customer_email,
                    conversation.customer_name,
                    conversation.code,
                    conversation.subject || 'Phản hồi yêu cầu hỗ trợ',
                    dto.content,
                    conversation.email_message_id || undefined,
                    references,
                    emailMessageId,
                    lang,
                );
            } catch (error) {
                this.systemLogService.error('contact', 'email', `Failed to send reply email: ${error}`, {
                    userId,
                    metaData: { conversationId: id, messageId: message.id },
                });
            }
        }

        // Invalidate cache
        await Promise.all([
            this.invalidateCache(id),
            this.invalidateListCache(),
        ]);

        // Log
        this.systemLogService.info('contact', 'reply', `Staff replied to ticket: ${conversation.code}`, {
            userId,
            metaData: { conversationId: id, isInternal: dto.is_internal },
        });

        // WebSocket
        this.websocketGateway.emitContactMessageCreated(
            id,
            {
                id: message.id,
                sender_type: message.sender_type,
                sender_name: staffName,
                content: dto.content,
                is_internal: dto.is_internal || false,
                created_at: message.created_at,
            },
        );

        return { message: await this.i18n.t('contact.success.replied', { lang }) };
    }

    /**
     * Đóng ticket
     */
    async close(
        id: string,
        userId: string,
        lang: string = 'vi',
    ): Promise<{ message: string }> {
        const conversation = await this.repository.findById(id);
        if (!conversation) {
            throw new NotFoundException(
                await this.i18n.t('contact.errors.not_found', { lang }),
            );
        }

        if (conversation.status === ContactStatus.CLOSED) {
            throw new BadRequestException(
                await this.i18n.t('contact.errors.already_closed', { lang }),
            );
        }

        await this.repository.closeConversation(id, userId);

        // Invalidate cache
        await Promise.all([
            this.invalidateCache(id),
            this.invalidateListCache(),
        ]);

        // Log
        this.systemLogService.info('contact', 'close', `Closed ticket: ${conversation.code}`, {
            userId,
            metaData: { conversationId: id },
        });

        // WebSocket
        this.websocketGateway.emitContactConversationClosed(id, conversation.code, userId);

        return { message: await this.i18n.t('contact.success.closed', { lang }) };
    }

    /**
     * Xóa ticket
     */
    async delete(id: string, userId: string, lang: string = 'vi'): Promise<void> {
        const conversation = await this.repository.findById(id);
        if (!conversation) {
            throw new NotFoundException(
                await this.i18n.t('contact.errors.not_found', { lang }),
            );
        }

        await this.repository.softDelete(id, userId);

        // Invalidate cache
        await Promise.all([
            this.invalidateCache(id),
            this.invalidateListCache(),
        ]);

        // Log
        this.systemLogService.info('contact', 'delete', `Deleted ticket: ${conversation.code}`, {
            userId,
            metaData: { conversationId: id },
        });

        // WebSocket
        this.websocketGateway.emitContactConversationDeleted(id, userId);
    }

    /**
     * Xóa nhiều tickets
     */
    async deleteMany(ids: string[], userId: string, lang: string = 'vi'): Promise<{ count: number }> {
        const count = await this.repository.softDeleteMany(ids, userId);

        // Invalidate cache
        await Promise.all([
            ...ids.map(id => this.invalidateCache(id)),
            this.invalidateListCache(),
        ]);

        // Log
        this.systemLogService.info('contact', 'delete_many', `Deleted ${count} tickets`, {
            userId,
            metaData: { ids },
        });

        return { count };
    }

    /**
     * Xử lý email inbound từ khách reply
     * Được gọi từ EmailInboundProvider
     */
    async processInboundEmail(
        senderEmail: string,
        senderName: string,
        subject: string,
        content: string,
        messageId: string,
        inReplyTo?: string,
        references?: string[],
    ): Promise<boolean> {
        // Tìm conversation theo In-Reply-To hoặc ticket code trong subject
        let conversation: ContactConversation | null = null;

        if (inReplyTo) {
            conversation = await this.repository.findByEmailMessageId(inReplyTo);
        }

        if (!conversation && references?.length) {
            for (const ref of references) {
                conversation = await this.repository.findByEmailMessageId(ref);
                if (conversation) break;
            }
        }

        // Parse ticket code từ subject: [#TICKET-20260101-001]
        if (!conversation) {
            const ticketMatch = subject.match(/\[#([A-Z]+-\d{8}-\d{3})\]/);
            if (ticketMatch) {
                conversation = await this.repository.findByCode(ticketMatch[1]);
            }
        }

        if (!conversation) {
            // Không tìm thấy conversation - có thể tạo mới
            return false;
        }

        // Tạo message mới
        const message = await this.repository.createMessage({
            conversation_id: conversation.id,
            sender_type: MessageSender.CUSTOMER,
            sender_name: senderName,
            sender_email: senderEmail,
            message_type: MessageType.EMAIL,
            content,
            email_message_id: messageId,
            email_in_reply_to: inReplyTo,
            email_subject: subject,
        });

        // Cập nhật conversation
        await this.repository.update(conversation.id, {
            status: ContactStatus.OPEN, // Re-open nếu khách reply
            email_references: [...(conversation.email_references || []), messageId],
        });

        // Invalidate cache
        await Promise.all([
            this.invalidateCache(conversation.id),
            this.invalidateListCache(),
        ]);

        // Log
        this.systemLogService.info('contact', 'inbound_email', `Customer replied to ticket: ${conversation.code}`, {
            metaData: { conversationId: conversation.id, messageId: message.id },
        });

        // WebSocket - thông báo admin có reply mới
        this.websocketGateway.emitContactMessageCreated(
            conversation.id,
            {
                id: message.id,
                sender_type: MessageSender.CUSTOMER,
                sender_name: senderName,
                content,
                is_internal: false,
                created_at: message.created_at,
            },
        );

        return true;
    }
}

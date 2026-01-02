import {
    Injectable,
    NotFoundException,
    BadRequestException,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { ContactStatus, ContactChannel, MessageSender, MessageType, ContactConversation } from '@prisma/client';

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
    IContactConversationListItem,
    IContactConversationStaff,
} from './interfaces';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { EmailService } from '../notification/email.service';
import { DiscordService } from '../discord/discord.service';

/**
 * Service xử lý business logic cho Contact module
 * Đã tối ưu hóa với caching và parallel queries
 */
@Injectable()
export class ContactService implements OnModuleInit {
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
        private readonly discordService: DiscordService,
    ) {
        this.CACHE_TTL = this.configService.get<number>('REDIS_CONTACT_CACHE_TTL') || 300;
        this.LIST_CACHE_TTL = this.configService.get<number>('REDIS_CONTACT_LIST_CACHE_TTL') || 60;
        this.TICKET_PREFIX = this.configService.get<string>('CONTACT_TICKET_PREFIX') || 'TICKET';
    }

    private readonly UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    private processUserId(userId: string) {
        const isUuid = this.UUID_REGEX.test(userId);
        return {
            validUserId: isUuid ? userId : undefined,
            logUserId: isUuid ? userId : undefined,
            actorName: isUuid ? undefined : userId
        };
    }

    onModuleInit() {
        this.discordService.registerActionCallback({
            onClose: async (channelId, userId, userName) => {
                const conversation = await this.repository.findByDiscordChannelId(channelId);
                if (conversation) {
                    // Discord users don't have UUIDs, so we pass undefined for userId and rely on metadata/log message
                    await this.close(conversation.id, `[Discord] ${userName}`);
                }
            },
            onReopen: async (channelId, userId, userName) => {
                const conversation = await this.repository.findByDiscordChannelId(channelId);
                if (conversation) {
                    await this.reopen(conversation.id, `[Discord] ${userName}`);
                }
            },
            onDelete: async (channelId, userId, userName) => {
                const conversation = await this.repository.findByDiscordChannelId(channelId);
                if (conversation) {
                    await this.delete(conversation.id, `[Discord] ${userName}`);
                }
            },
            onReply: async (ticketCode, content, authorName, authorId) => {
                const conversation = await this.repository.findByCode(ticketCode);
                if (conversation) {
                    await this.replyFromDiscord(
                        ticketCode,
                        content,
                        authorName,
                        authorId,
                    );
                }
            }
        });
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

    private getStaffCacheKey(id: string): string {
        return `contact:staff:${id}`;
    }

    private async invalidateCache(id: string): Promise<void> {
        await Promise.all([
            this.redisService.del(this.getCacheKey(id)),
            this.redisService.del(this.getStaffCacheKey(id)),
        ]);
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
            const sentMessageId = await this.emailService.sendContactConfirmationEmail(
                dto.email,
                dto.name,
                code,
                dto.phone,
                dto.subject,
                dto.message,
                emailMessageId,
                lang,
            );

            if (sentMessageId && sentMessageId !== emailMessageId) {
                // Update with real message ID from Gmail if different
                await this.repository.update(conversation.id, {
                    email_message_id: sentMessageId,
                });

                // Update the message log as well
                const firstMessage = await this.repository.findMessagesByConversationId(conversation.id);
                if (firstMessage && firstMessage.length > 0) {
                    // Assuming first message is the one we want to link
                    // Actually we don't need to update the message itself if only conversation ID is used for threading
                    // But for consistency let's update conversation. 
                }
            }
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
     * Lấy danh sách tickets (admin) - OPTIMIZED
     */
    async findMany(
        query: QueryContactDto,
        lang: string = 'vi',
    ): Promise<IPaginatedContactResponse<IContactConversationListItem>> {
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
        return result;
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
     * Cập nhật ticket (status, priority, assign, staff)
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
        // dto.tags handled via syncTags below, not scalar column

        const updated = await this.repository.update(id, updateData);

        // Sync staff if provided
        if (dto.staff_ids) {
            const { added, removed } = await this.repository.syncStaff(id, dto.staff_ids, userId);
            // Có thể emit events riêng cho added/removed nếu cần, hoặc dùng updated event chung
        }

        // Sync tags if provided
        if (dto.tags) {
            await this.repository.syncTags(id, dto.tags, userId);
        }

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

        // Re-fetch để có data mới nhất
        const refreshed = await this.repository.findById(id);
        return refreshed || { ...updated, messages: existing.messages };
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
        options: { fromDiscord?: boolean } = {},
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

        const { validUserId, logUserId, actorName } = this.processUserId(userId);

        // Generate email message ID cho reply
        const supportEmail = this.configService.get<string>('EMAIL_SUPPORT_ADDRESS');
        const emailDomain = supportEmail?.split('@')[1] || 'genhub.dev';
        const emailMessageId = `<${conversation.code.toLowerCase()}-reply-${Date.now()}@${emailDomain}>`;

        // Tạo message
        const message = await this.repository.createMessage({
            conversation_id: id,
            sender_type: MessageSender.STAFF,
            sender_id: options.fromDiscord ? undefined : validUserId, // Fix: sender_id MUST be UUID or undefined if from Discord
            sender_name: staffName,
            sender_email: staffEmail,
            message_type: dto.is_internal ? MessageType.SYSTEM_NOTE : MessageType.EMAIL,
            content: dto.content,
            email_message_id: emailMessageId,
            email_in_reply_to: conversation.email_message_id || undefined,
            is_internal: dto.is_internal,
            created_by: userId, // created_by is just String, can store Discord ID
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

                const sentMessageId = await this.emailService.sendContactReplyEmail(
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

                if (sentMessageId && sentMessageId !== emailMessageId) {
                    // Update message with real ID
                    await this.repository.updateMessage(message.id, {
                        email_message_id: sentMessageId
                    });
                }
            } catch (error) {
                this.systemLogService.error('contact', 'email', `Failed to send reply email: ${error}`, {
                    userId: logUserId,
                    metaData: { conversationId: id, messageId: message.id, actor: actorName },
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
            userId: logUserId,
            metaData: { conversationId: id, isInternal: dto.is_internal, actor: actorName },
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

        // Sync to Discord (if NOT from Discord)
        if (conversation.discord_channel_id && !dto.is_internal && !options.fromDiscord) {
            this.discordService.sendMessageToTicket(
                conversation.discord_channel_id,
                `**${staffName}**: ${dto.content}`,
                false, // Is from staff (not customer)
            );
        }

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

        const { validUserId, logUserId, actorName } = this.processUserId(userId);

        await this.repository.closeConversation(id, validUserId || 'SYSTEM'); // Fallback if needed, closeConversation might expect nullable UUID? 
        // Based on previous delete method, repository.softDelete takes strictly UUID? 
        // Logic: if closeConversation calls prisma update on user_id, pass validUserId (string|undefined).

        // Sync to Discord
        if (conversation.discord_channel_id) {
            // Lấy tên user đóng ticket (nếu cần thiết có thể query thêm từ userId)
            // Hiện tại truyền userId hoặc "Admin"
            await this.discordService.closeTicketChannel(
                conversation.discord_channel_id,
                false, // Just close, don't delete (embed shows Closed)
                actorName || 'Admin/Staff', // Use actorName if from Discord
            );
        }

        // Invalidate cache
        await Promise.all([
            this.invalidateCache(id),
            this.invalidateListCache(),
        ]);

        // Send ticket closed email to customer
        try {
            const references = conversation.email_references || [];
            if (conversation.email_message_id) {
                references.push(conversation.email_message_id);
            }

            // Generate distinct message ID for the closing notification
            const supportEmail = this.configService.get<string>('EMAIL_SUPPORT_ADDRESS');
            const emailDomain = supportEmail?.split('@')[1] || 'gen-hub.dev';
            const closingMessageId = `<${conversation.code.toLowerCase()}-close-${Date.now()}@${emailDomain}>`;

            await this.emailService.sendContactClosedEmail(
                conversation.customer_email,
                conversation.customer_name,
                conversation.code,
                conversation.subject || 'Support Ticket',
                conversation.email_message_id || undefined,
                references,
                closingMessageId,
                lang
            );
        } catch (error) {
            this.systemLogService.error('contact', 'email', `Failed to send closed ticket email: ${error}`, {
                metaData: { conversationId: id }
            });
        }

        // Log
        this.systemLogService.info('contact', 'close', `Closed ticket: ${conversation.code}`, {
            userId: logUserId,
            metaData: { conversationId: id, actor: actorName },
        });

        // WebSocket
        this.websocketGateway.emitContactConversationClosed(id, conversation.code, userId);

        return { message: await this.i18n.t('contact.success.closed', { lang }) };
    }

    /**
     * Mở lại ticket
     */
    async reopen(
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

        if (conversation.status !== ContactStatus.CLOSED) {
            throw new BadRequestException(
                await this.i18n.t('contact.errors.not_closed', { lang }),
            );
        }

        const { validUserId, logUserId, actorName } = this.processUserId(userId);

        // Update DB back to PENDING or IN_PROGRESS
        await this.repository.update(id, {
            status: ContactStatus.PENDING,
            closed_at: null,
            updated_by: validUserId,
        });

        // Sync to Discord
        if (conversation.discord_channel_id) {
            await this.discordService.reopenTicketChannel(
                conversation.discord_channel_id,
                actorName || 'Admin/Staff',
            );
        }

        // Invalidate cache
        await Promise.all([
            this.invalidateCache(id),
            this.invalidateListCache(),
        ]);

        // Send ticket reopened email to customer
        try {
            const references = conversation.email_references || [];
            if (conversation.email_message_id) {
                references.push(conversation.email_message_id);
            }

            // Generate distinct message ID for the reopening notification
            const supportEmail = this.configService.get<string>('EMAIL_SUPPORT_ADDRESS');
            const emailDomain = supportEmail?.split('@')[1] || 'gen-hub.dev';
            const reopeningMessageId = `<${conversation.code.toLowerCase()}-reopen-${Date.now()}@${emailDomain}>`;

            await this.emailService.sendContactReopenedEmail(
                conversation.customer_email,
                conversation.customer_name,
                conversation.code,
                conversation.subject || 'Support Ticket',
                conversation.email_message_id || undefined,
                references,
                reopeningMessageId,
                lang
            );
        } catch (error) {
            this.systemLogService.error('contact', 'email', `Failed to send reopened ticket email: ${error}`, {
                metaData: { conversationId: id }
            });
        }

        // Log
        this.systemLogService.info('contact', 'reopen', `Reopened ticket: ${conversation.code}`, {
            userId,
            metaData: { conversationId: id },
        });

        this.websocketGateway.emitContactConversationReopened(id, conversation.code, userId);

        return { message: await this.i18n.t('contact.success.reopened', { lang }) };
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

        const { validUserId, logUserId, actorName } = this.processUserId(userId);

        await this.repository.softDelete(id, validUserId || 'SYSTEM');

        // Sync to Discord
        if (conversation.discord_channel_id) {
            // Close channel visually as Deleted
            await this.discordService.closeTicketChannel(
                conversation.discord_channel_id,
                true, // Deleted context
                'Admin/Staff',
            );
        }

        // Invalidate cache
        await Promise.all([
            this.invalidateCache(id),
            this.invalidateListCache(),
        ]);

        // Log
        this.systemLogService.info('contact', 'delete', `Deleted ticket: ${conversation.code}`, {
            userId: logUserId,
            metaData: { conversationId: id, actor: actorName },
        });

        // WebSocket
        this.websocketGateway.emitContactConversationDeleted(id, userId);
    }

    /**
     * Xóa nhiều tickets
     */
    async deleteMany(ids: string[], userId: string, lang: string = 'vi'): Promise<{ count: number }> {
        const count = await this.repository.softDeleteMany(ids, userId);

        // TODO: Sync delete many to Discord if needed (might be heavy to loop all)
        // For now skip sync for bulk delete or implement background job

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

        // Nếu ticket đã đóng thì không xử lý reply
        if (conversation.status === ContactStatus.CLOSED) {
            this.systemLogService.warn('contact', 'inbound_email_ignored', `Ignored reply to closed ticket: ${conversation.code}`, {
                metaData: { conversationId: conversation.id, senderEmail },
            });
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

    /**
     * Tạo contact mới từ email đến (được gọi từ EmailInboundProvider)
     * Sử dụng khi email được phân loại là contact từ người dùng qua Gemini AI
     */
    async createFromInboundEmail(
        senderEmail: string,
        senderName: string,
        subject: string,
        content: string,
        gmailMessageId: string,
        emailMessageId?: string,
        emailInReplyTo?: string,
        emailReferences?: string[],
    ): Promise<{ id: string; code: string }> {
        // Tạo mã ticket
        const code = await this.repository.generateTicketCode(this.TICKET_PREFIX);

        // Tạo email message ID nếu chưa có
        const finalEmailMessageId = emailMessageId || `<${code}-${Date.now()}@gen-hub.dev>`;

        // Tạo conversation
        const conversation = await this.repository.createConversation({
            code,
            customer_name: senderName,
            customer_email: senderEmail.toLowerCase(),
            subject: subject || 'Liên hệ hỗ trợ',
            status: ContactStatus.OPEN,
            channel: ContactChannel.EMAIL,
            email_thread_id: `thread-${code}`,
            email_message_id: finalEmailMessageId,
            email_in_reply_to: emailInReplyTo,
            email_references: emailReferences || [],
            last_activity_at: new Date(),
        });

        // Tạo message đầu tiên
        await this.repository.createMessage({
            conversation_id: conversation.id,
            sender_type: MessageSender.CUSTOMER,
            sender_name: senderName,
            sender_email: senderEmail.toLowerCase(),
            message_type: MessageType.EMAIL,
            content,
            email_subject: subject,
            email_message_id: finalEmailMessageId,
        });

        // Gửi email xác nhận (fire-and-forget)
        this.emailService.sendContactConfirmationEmail(
            senderEmail,
            senderName,
            code,
            undefined,
            subject,
            content,
            finalEmailMessageId,
            'vi',
        ).catch((error) => {
            this.systemLogService.error('contact', 'email', `Failed to send confirmation email: ${error}`, {
                metaData: { conversationId: conversation.id, code },
            });
        });

        // Log
        this.systemLogService.info('contact', 'create_from_email', `Created contact ticket from inbound email: ${code}`, {
            metaData: { conversationId: conversation.id, channel: 'EMAIL', customerEmail: senderEmail },
        });

        // Emit WebSocket
        this.websocketGateway.emitContactConversationCreated(conversation.id, code, senderEmail);

        // Invalidate cache
        await this.invalidateListCache();

        return { id: conversation.id, code };
    }

    /**
     * Cập nhật discord_channel_id cho conversation
     */
    async updateDiscordChannelId(conversationId: string, discordChannelId: string): Promise<void> {
        await this.repository.update(conversationId, {
            discord_channel_id: discordChannelId,
        });

        // Invalidate cache
        await this.invalidateCache(conversationId);
    }

    /**
     * Xử lý reply từ Discord (staff reply)
     * Được gọi từ DiscordService callback
     */
    async replyFromDiscord(
        ticketCode: string,
        content: string,
        staffName: string,
        staffDiscordId: string,
    ): Promise<boolean> {
        // Tìm conversation theo code
        const conversation = await this.repository.findByCode(ticketCode);
        if (!conversation) {
            return false;
        }

        // Tạo message mới - đây là staff reply
        const message = await this.repository.createMessage({
            conversation_id: conversation.id,
            sender_type: MessageSender.STAFF,
            sender_name: staffName,
            message_type: MessageType.DISCORD,
            content,
        });

        // Cập nhật status
        await this.repository.update(conversation.id, {
            status: ContactStatus.PENDING,
        });

        // Invalidate cache
        await Promise.all([
            this.invalidateCache(conversation.id),
            this.invalidateListCache(),
        ]);

        // Log
        this.systemLogService.info('contact', 'discord_reply', `Staff replied via Discord: ${ticketCode}`, {
            metaData: { conversationId: conversation.id, messageId: message.id, staffDiscordId },
        });

        // WebSocket - thông báo có reply mới
        this.websocketGateway.emitContactMessageCreated(
            conversation.id,
            {
                id: message.id,
                sender_type: MessageSender.STAFF,
                sender_name: staffName,
                content,
                is_internal: false,
                created_at: message.created_at,
            },
        );

        // Gửi email cho khách hàng - nằm trong thread email xác nhận (fire-and-forget)
        if (conversation.customer_email) {
            const supportEmail = this.configService.get<string>('EMAIL_SUPPORT_ADDRESS');
            const newEmailMessageId = `<${conversation.code.toLowerCase()}-reply-${Date.now()}@${supportEmail?.split('@')[1] || 'genhub.dev'}>`;

            // Reply vào email xác nhận ban đầu (email_message_id là Message-ID của email xác nhận)
            // In-Reply-To: ID của email xác nhận
            // References: ID của email xác nhận (để gmail/outlook nhận diện thread)
            const inReplyTo = conversation.email_message_id;
            const references = conversation.email_message_id ? [conversation.email_message_id] : [];

            // Subject dựa trên subject gốc của conversation (nếu có)
            const originalSubject = conversation.subject || 'Hỗ trợ từ GEN-HUB';

            this.emailService.sendContactReplyEmail(
                conversation.customer_email,
                conversation.customer_name,
                conversation.code,
                originalSubject,
                `${staffName} đã phản hồi:\n\n${content}`,
                inReplyTo || undefined,
                references,
                newEmailMessageId,
                'vi',
            ).catch((error) => {
                this.systemLogService.error('contact', 'email', `Failed to send reply email: ${error}`, {
                    metaData: { conversationId: conversation.id },
                });
            });
        }

        return true;
    }

    /**
     * Lấy conversation theo code (để lấy discord_channel_id)
     */
    async getByCode(code: string): Promise<ContactConversation | null> {
        return this.repository.findByCode(code);
    }
}

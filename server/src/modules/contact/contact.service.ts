import {
    Injectable,
    NotFoundException,
    BadRequestException,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import {
    ContactStatus,
    ContactChannel,
    MessageSender,
    MessageType,
    ContactConversation,
    PriorityCustomerSource,
    ContactActionType,
    ContactActionPerformedByType,
    ContactPriority,
    ContactListType,
    ContactListMatchType,
} from '@prisma/client';

import { ContactRepository } from './contact.repository';
import {
    CreateContactDto,
    QueryContactDto,
    UpdateContactDto,
    ReplyContactDto,
    StartChatDto,
    SendMessageDto,
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
import { AppConfigService } from '../../common/config/app-config.service';
import { CozeService } from '../coze/coze.service';
import { GeminiService } from '../../common/services/gemini.service';
import { ContactListService } from '../contact-list/contact-list.service';

/**
 * Service xử lý business logic cho Contact module
 * Tích hợp Gemini AI (phân loại) và Coze AI (tư vấn)
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
        private readonly appConfigService: AppConfigService,
        private readonly cozeService: CozeService,
        private readonly geminiService: GeminiService,
        private readonly contactListService: ContactListService,
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
            onClose: async (channelId, userId, userName, reason) => {
                const conversation = await this.repository.findByDiscordChannelId(channelId);
                if (conversation) {
                    await this.closeWithReason(conversation.id, `[Discord] ${userName}`, reason, userName);
                }
            },
            onReopen: async (channelId, userId, userName, reason) => {
                const conversation = await this.repository.findByDiscordChannelId(channelId);
                if (conversation) {
                    await this.reopenWithReason(conversation.id, `[Discord] ${userName}`, reason, userName);
                }
            },
            onDelete: async (channelId, userId, userName, reason) => {
                const conversation = await this.repository.findByDiscordChannelId(channelId);
                if (conversation) {
                    await this.deleteWithReason(conversation.id, `[Discord] ${userName}`, reason, userName);
                }
            },
            onReply: async (ticketCode, content, authorName, authorId) => {
                let conversation = await this.repository.findByCode(ticketCode);
                if (!conversation) {
                    conversation = await this.repository.findByCode(`TICKET-${ticketCode}`);
                }
                if (conversation) {
                    await this.replyFromDiscord(conversation.code, content, authorName, authorId);
                }
            },
            onWhitelist: async (channelId, userId, userName, matchType, value, reason) => {
                const conversation = await this.repository.findByDiscordChannelId(channelId);
                if (conversation) {
                    await this.addToListFromDiscord(
                        conversation, 'WHITELIST', matchType, value, reason, userName
                    );
                }
            },
            onBlacklist: async (channelId, userId, userName, matchType, value, reason) => {
                const conversation = await this.repository.findByDiscordChannelId(channelId);
                if (conversation) {
                    await this.addToListFromDiscord(
                        conversation, 'BLACKLIST', matchType, value, reason, userName
                    );
                }
            },
            onRemoveWhitelist: async (channelId, userId, userName, matchType, value) => {
                const conversation = await this.repository.findByDiscordChannelId(channelId);
                if (conversation) {
                    await this.removeFromListFromDiscord(
                        conversation, 'WHITELIST', matchType, value, userName
                    );
                }
            },
            onRemoveBlacklist: async (channelId, userId, userName, matchType, value) => {
                const conversation = await this.repository.findByDiscordChannelId(channelId);
                if (conversation) {
                    await this.removeFromListFromDiscord(
                        conversation, 'BLACKLIST', matchType, value, userName
                    );
                }
            },
            onSetPriority: async (channelId, userId, userName, priority) => {
                const conversation = await this.repository.findByDiscordChannelId(channelId);
                if (conversation) {
                    await this.setPriorityFromDiscord(conversation, priority, userName);
                }
            },
            onSkip: async (channelId, userId, userName, reason) => {
                const conversation = await this.repository.findByDiscordChannelId(channelId);
                if (conversation) {
                    await this.setSkippedFromDiscord(conversation, reason, userName);
                }
            },
            onUnsetSkip: async (channelId, userId, userName) => {
                const conversation = await this.repository.findByDiscordChannelId(channelId);
                if (conversation) {
                    await this.unsetSkippedFromDiscord(conversation, userName);
                }
            },
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
     * Tích hợp Gemini AI (phân loại) và Coze AI (tư vấn tự động)
     */
    async createFromWebForm(
        dto: CreateContactDto,
        lang: string = 'vi',
    ): Promise<{ code: string; message: string; aiResponse?: string }> {
        // Generate ticket code
        const code = await this.repository.generateTicketCode(this.TICKET_PREFIX);

        // Generate email thread ID
        const supportEmail = this.configService.get<string>('EMAIL_SUPPORT_ADDRESS');
        const emailMessageId = `<${code.toLowerCase()}-${Date.now()}@${supportEmail?.split('@')[1] || 'genhub.dev'}>`;

        // Lấy config AI auto-reply (có thể là boolean hoặc string từ JSON file)
        const enableAiReplyConfig = this.appConfigService.get('enableAiAutoReply') as unknown;
        const enableAiReply = enableAiReplyConfig === true || enableAiReplyConfig === 'true';

        let isSkippedByBlacklist = false;
        let isWhitelisted = false;
        let skipReason: string | undefined;

        try {
            const listCheckResult = await this.contactListService.checkEmail(dto.email.toLowerCase());

            if (listCheckResult.isBlacklisted) {
                isSkippedByBlacklist = true;
                skipReason = listCheckResult.reason || 'Email is blacklisted';
                this.systemLogService.info('contact', 'blacklist_matched', `Email ${dto.email} matched blacklist`, {
                    metaData: { code, email: dto.email, matchType: listCheckResult.matchType },
                });
            }

            if (listCheckResult.isWhitelisted) {
                isWhitelisted = true;
                this.systemLogService.info('contact', 'whitelist_matched', `Email ${dto.email} matched whitelist`, {
                    metaData: { code, email: dto.email, matchType: listCheckResult.matchType },
                });
            }
        } catch (error) {
            // Không block nếu check list fail
            this.systemLogService.error('contact', 'list_check_failed', `Failed to check email list: ${error}`, {
                metaData: { code, email: dto.email },
            });
        }

        // Tạo conversation với các flag từ blacklist/whitelist check
        const conversation = await this.repository.createConversation({
            code,
            customer_name: dto.name,
            customer_email: dto.email.toLowerCase(),
            customer_phone: dto.phone,
            customer_company: dto.company,
            subject: dto.subject,
            status: isSkippedByBlacklist ? ContactStatus.SPAM : ContactStatus.OPEN,
            channel: ContactChannel.WEBSITE_FORM,
            email_thread_id: `thread-${code}`,
            email_message_id: emailMessageId,
            last_activity_at: new Date(),
            enable_ai_reply: isSkippedByBlacklist ? false : enableAiReply, // Không AI reply nếu blacklisted
            is_skipped: isSkippedByBlacklist,
            skip_reason: skipReason,
            is_priority_customer: isWhitelisted,
            priority_source: isWhitelisted ? PriorityCustomerSource.WHITELIST : undefined,
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

        // AI Processing: Gemini phân loại (nếu có) + Coze tư vấn
        let aiResponseContent: string | undefined;
        let isSpam = isSkippedByBlacklist; // Mặc định là spam nếu blacklisted
        let isPotentialCustomer = isWhitelisted; // Mặc định là potential nếu whitelisted

        // Bước 1: Phân loại spam bằng Gemini (nếu Gemini được bật và QUAN TRỌNG: không nằm trong whitelist)
        // Nếu đã blacklist -> skip AI
        // Nếu đã whitelist -> skip spam check (nhưng vẫn có thể chạy để analyze nếu cần, ở đây ta skip spam check cho whitelist để tối ưu)
        if (enableAiReply && this.geminiService.enabled && !isSkippedByBlacklist) {
            try {
                const classification = await this.geminiService.classifyWebform(
                    dto.email,
                    dto.name,
                    dto.company,
                    dto.phone,
                    dto.subject || '',
                    dto.message,
                );

                // Chỉ đánh dấu spam nếu KHÔNG nằm trong whitelist
                if (classification.isSpamOrAdvertising && !isWhitelisted) {
                    isSpam = true;
                    await this.repository.update(conversation.id, { status: ContactStatus.SPAM });
                    this.systemLogService.info('contact', 'ai_spam_detected', `AI detected spam: ${code}`, {
                        metaData: { conversationId: conversation.id, confidence: classification.confidence, category: classification.category },
                    });
                }

                // Lưu thông tin khách hàng tiềm năng (nếu chưa phải là whitelisted)
                if (classification.isPotentialCustomer && !isWhitelisted) {
                    isPotentialCustomer = true;
                    await this.repository.update(conversation.id, { is_priority_customer: true, priority_source: PriorityCustomerSource.AI_POTENTIAL });
                }
            } catch (error) {
                this.systemLogService.error('contact', 'gemini_classification', `Gemini webform classification failed: ${error}`, {
                    metaData: { conversationId: conversation.id, code },
                });
                // Không đánh dấu spam nếu lỗi, tiếp tục xử lý Coze
            }
        }

        // Bước 2: Gọi Coze AI để tư vấn tự động (nếu không phải spam và Coze được bật)
        if (enableAiReply && !isSpam && this.cozeService.isEnabled()) {
            try {
                const aiResult = await this.cozeService.chat(
                    dto.message,
                    conversation.id,
                    dto.email,
                );

                if (aiResult.success && aiResult.content) {
                    aiResponseContent = aiResult.content;

                    // Generate email message ID cho AI reply
                    const supportEmail = this.configService.get<string>('EMAIL_SUPPORT_ADDRESS');
                    const emailDomain = supportEmail?.split('@')[1] || 'genhub.dev';
                    const aiEmailMessageId = `<${code.toLowerCase()}-ai-${Date.now()}@${emailDomain}>`;

                    // Lưu AI response message
                    const aiMessage = await this.repository.createMessage({
                        conversation_id: conversation.id,
                        sender_type: MessageSender.AI,
                        sender_name: 'GEN-HUB AI',
                        content: aiResult.content,
                        message_type: MessageType.EMAIL,
                        is_ai_response: true,
                        ai_model: aiResult.model,
                        ai_confidence: aiResult.confidence,
                        email_message_id: aiEmailMessageId,
                        email_in_reply_to: emailMessageId,
                    });

                    this.systemLogService.info('contact', 'ai_reply', `AI replied to contact: ${code}`, {
                        metaData: { conversationId: conversation.id, model: aiResult.model },
                    });

                    // Emit WebSocket cho AI message
                    this.websocketGateway.emitContactMessageCreated(
                        conversation.id,
                        {
                            id: aiMessage.id,
                            sender_type: MessageSender.AI,
                            sender_name: 'GEN-HUB AI',
                            content: aiResult.content,
                            is_internal: false,
                            created_at: aiMessage.created_at,
                        },
                    );

                    // Gửi email phản hồi từ AI cho khách hàng (giống staff reply)
                    try {
                        await this.emailService.sendContactReplyEmail(
                            dto.email,
                            dto.name,
                            code,
                            dto.subject || 'Phản hồi yêu cầu hỗ trợ',
                            aiResult.content,
                            emailMessageId,
                            [emailMessageId],
                            aiEmailMessageId,
                            'vi',
                        );
                    } catch (emailError) {
                        this.systemLogService.error('contact', 'ai_email', `Failed to send AI reply email: ${emailError}`, {
                            metaData: { conversationId: conversation.id, code },
                        });
                    }
                }
            } catch (error) {
                this.systemLogService.error('contact', 'coze_reply', `Coze AI reply failed: ${error}`, {
                    metaData: { conversationId: conversation.id, code },
                });
            }
        }

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
                await this.repository.update(conversation.id, {
                    email_message_id: sentMessageId,
                });
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

        // Tạo Discord channel (fire-and-forget)
        let discordChannelId: string | undefined;
        try {
            const discordResult = await this.discordService.createContactChannel(
                code,
                dto.name,
                dto.email,
                dto.subject,
                isPotentialCustomer, // Tạo trong priority category nếu là khách hàng tiềm năng
                dto.message, // Nội dung tin nhắn để hiển thị trong Discord embed
            );
            if (discordResult.success && discordResult.channelId) {
                discordChannelId = discordResult.channelId;
                await this.repository.update(conversation.id, {
                    discord_channel_id: discordResult.channelId,
                });

                // Nếu có AI response, gửi vào Discord channel
                if (aiResponseContent) {
                    this.discordService.sendMessageToTicket(
                        discordResult.channelId,
                        `**🤖 GEN-HUB AI**: ${aiResponseContent}`,
                        false,
                    );
                }
            }
        } catch (error) {
            this.systemLogService.error('contact', 'discord', `Failed to create Discord channel: ${error}`, {
                metaData: { conversationId: conversation.id, code },
            });
        }

        // Invalidate list cache
        await this.invalidateListCache();

        const message = await this.i18n.t('contact.success.created', { lang });
        return { code, message, aiResponse: aiResponseContent };
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
     * Lấy danh sách tickets ưu tiên (is_priority_customer = true)
     */
    async findManyPriority(
        query: QueryContactDto,
        lang: string = 'vi',
    ): Promise<IPaginatedContactResponse<IContactConversationListItem>> {
        const priorityQuery = { ...query, is_priority_customer: true };
        const cacheKey = `contact:list:priority:${JSON.stringify(priorityQuery)}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Cache invalid
            }
        }

        const result = await this.repository.findMany(priorityQuery);

        await this.redisService.set(cacheKey, JSON.stringify(result), this.LIST_CACHE_TTL);
        return result;
    }

    /**
     * Lấy danh sách tickets bình thường (is_priority_customer = false, is_skipped = false)
     */
    async findManyNormal(
        query: QueryContactDto,
        lang: string = 'vi',
    ): Promise<IPaginatedContactResponse<IContactConversationListItem>> {
        const normalQuery = { ...query, is_priority_customer: false, is_skipped: false };
        const cacheKey = `contact:list:normal:${JSON.stringify(normalQuery)}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Cache invalid
            }
        }

        const result = await this.repository.findMany(normalQuery);

        await this.redisService.set(cacheKey, JSON.stringify(result), this.LIST_CACHE_TTL);
        return result;
    }

    /**
     * Lấy danh sách tickets bị bỏ qua (is_skipped = true)
     */
    async findManySkipped(
        query: QueryContactDto,
        lang: string = 'vi',
    ): Promise<IPaginatedContactResponse<IContactConversationListItem>> {
        const skippedQuery = { ...query, is_skipped: true };
        const cacheKey = `contact:list:skipped:${JSON.stringify(skippedQuery)}`;
        const cached = await this.redisService.get(cacheKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch {
                // Cache invalid
            }
        }

        const result = await this.repository.findMany(skippedQuery);

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
        if (dto.enable_ai_reply !== undefined) updateData.enable_ai_reply = dto.enable_ai_reply;
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

        // AI Auto-Reply cho customer (chỉ customer, không reply cho staff)
        const enableAiReplyConfigRaw = this.appConfigService.get('enableAiAutoReply') as unknown;
        const defaultAiReply = enableAiReplyConfigRaw === true || enableAiReplyConfigRaw === 'true';
        const shouldAiReply = conversation.enable_ai_reply ?? defaultAiReply;
        if (shouldAiReply && this.cozeService.isEnabled()) {
            try {
                const aiResult = await this.cozeService.chat(
                    content,
                    conversation.id,
                    senderEmail,
                );

                if (aiResult.success && aiResult.content) {
                    // Generate email message ID cho AI reply
                    const supportEmail = this.configService.get<string>('EMAIL_SUPPORT_ADDRESS');
                    const emailDomain = supportEmail?.split('@')[1] || 'genhub.dev';
                    const aiEmailMessageId = `<${conversation.code.toLowerCase()}-ai-${Date.now()}@${emailDomain}>`;

                    // Lưu AI response message
                    const aiMessage = await this.repository.createMessage({
                        conversation_id: conversation.id,
                        sender_type: MessageSender.AI,
                        sender_name: 'GEN-HUB AI',
                        content: aiResult.content,
                        message_type: MessageType.EMAIL,
                        is_ai_response: true,
                        ai_model: aiResult.model,
                        ai_confidence: aiResult.confidence,
                        email_message_id: aiEmailMessageId,
                        email_in_reply_to: messageId,
                    });

                    this.systemLogService.info('contact', 'ai_reply', `AI replied to customer email: ${conversation.code}`, {
                        metaData: { conversationId: conversation.id, model: aiResult.model },
                    });

                    // Emit WebSocket cho AI message
                    this.websocketGateway.emitContactMessageCreated(
                        conversation.id,
                        {
                            id: aiMessage.id,
                            sender_type: MessageSender.AI,
                            sender_name: 'GEN-HUB AI',
                            content: aiResult.content,
                            is_internal: false,
                            created_at: aiMessage.created_at,
                        },
                    );

                    // Gửi email phản hồi từ AI cho khách hàng
                    try {
                        const emailReferences = conversation.email_references || [];
                        if (conversation.email_message_id) {
                            emailReferences.push(conversation.email_message_id);
                        }
                        if (messageId) {
                            emailReferences.push(messageId);
                        }

                        await this.emailService.sendContactReplyEmail(
                            senderEmail,
                            senderName,
                            conversation.code,
                            conversation.subject || 'Phản hồi yêu cầu hỗ trợ',
                            aiResult.content,
                            messageId || conversation.email_message_id || undefined,
                            emailReferences,
                            aiEmailMessageId,
                            'vi',
                        );
                    } catch (emailError) {
                        this.systemLogService.error('contact', 'ai_email', `Failed to send AI reply email: ${emailError}`, {
                            metaData: { conversationId: conversation.id, code: conversation.code },
                        });
                    }

                    // Gửi AI reply vào Discord channel (nếu có)
                    if (conversation.discord_channel_id) {
                        this.discordService.sendMessageToTicket(
                            conversation.discord_channel_id,
                            `**🤖 GEN-HUB AI**: ${aiResult.content}`,
                            false,
                        );
                    }
                }
            } catch (error) {
                this.systemLogService.error('contact', 'ai_reply_failed', `AI reply failed: ${error}`, {
                    metaData: { conversationId: conversation.id },
                });
            }
        }

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

        // Lấy config AI auto-reply
        const enableAiReplyConfig = this.appConfigService.get('enableAiAutoReply') as unknown;
        const enableAiReply = enableAiReplyConfig === true || enableAiReplyConfig === 'true';

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
            enable_ai_reply: enableAiReply,
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

        // Coze AI auto-reply cho inbound email
        if (enableAiReply && this.cozeService.isEnabled()) {
            try {
                const aiResult = await this.cozeService.chat(
                    content,
                    conversation.id,
                    senderEmail,
                );

                if (aiResult.success && aiResult.content) {
                    // Generate email message ID cho AI reply
                    const supportEmail = this.configService.get<string>('EMAIL_SUPPORT_ADDRESS');
                    const emailDomain = supportEmail?.split('@')[1] || 'genhub.dev';
                    const aiEmailMessageId = `<${code.toLowerCase()}-ai-${Date.now()}@${emailDomain}>`;

                    // Lưu AI response message
                    const aiMessage = await this.repository.createMessage({
                        conversation_id: conversation.id,
                        sender_type: MessageSender.AI,
                        sender_name: 'GEN-HUB AI',
                        content: aiResult.content,
                        message_type: MessageType.EMAIL,
                        is_ai_response: true,
                        ai_model: aiResult.model,
                        ai_confidence: aiResult.confidence,
                        email_message_id: aiEmailMessageId,
                        email_in_reply_to: finalEmailMessageId,
                    });

                    this.systemLogService.info('contact', 'ai_reply', `AI replied to inbound email: ${code}`, {
                        metaData: { conversationId: conversation.id, model: aiResult.model },
                    });

                    // Emit WebSocket cho AI message
                    this.websocketGateway.emitContactMessageCreated(
                        conversation.id,
                        {
                            id: aiMessage.id,
                            sender_type: MessageSender.AI,
                            sender_name: 'GEN-HUB AI',
                            content: aiResult.content,
                            is_internal: false,
                            created_at: aiMessage.created_at,
                        },
                    );

                    // Gửi email phản hồi từ AI cho khách hàng
                    try {
                        await this.emailService.sendContactReplyEmail(
                            senderEmail,
                            senderName,
                            code,
                            subject || 'Phản hồi yêu cầu hỗ trợ',
                            aiResult.content,
                            finalEmailMessageId,
                            [finalEmailMessageId],
                            aiEmailMessageId,
                            'vi',
                        );
                    } catch (emailError) {
                        this.systemLogService.error('contact', 'ai_email', `Failed to send AI reply email: ${emailError}`, {
                            metaData: { conversationId: conversation.id, code },
                        });
                    }
                }
            } catch (error) {
                this.systemLogService.error('contact', 'coze_reply', `Coze AI reply failed for inbound email: ${error}`, {
                    metaData: { conversationId: conversation.id, code },
                });
            }
        }

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

    /**
     * Khởi tạo phiên live chat (Guest)
     */
    async startChatSession(
        dto: StartChatDto,
        lang: string = 'vi',
    ): Promise<{ sessionId: string; code: string; welcomeMessage?: string }> {
        // Tạo session_id unique
        const sessionId = require('crypto').randomUUID();

        // Lấy giá trị mặc định enable_ai_reply từ config
        const enableAiReply = this.appConfigService.get('enableAiAutoReply');

        // Tạo conversation với channel LIVE_CHAT
        const code = await this.repository.generateTicketCode(this.TICKET_PREFIX);
        const conversation = await this.repository.createConversation({
            code,
            session_id: sessionId,
            customer_name: dto.name,
            customer_email: dto.email,
            customer_phone: dto.phone,
            customer_company: dto.company,
            channel: ContactChannel.LIVE_CHAT,
            enable_ai_reply: enableAiReply,
        });

        // Tạo welcome message từ AI nếu enabled
        let welcomeMessage: string | undefined;
        if (enableAiReply && this.cozeService.isEnabled()) {
            const aiResult = await this.cozeService.chat(
                dto.initialMessage || 'Xin chào',
                conversation.id,
                sessionId,
            );
            if (aiResult.success) {
                welcomeMessage = aiResult.content;
                // Lưu AI message vào database
                await this.repository.createMessage({
                    conversation_id: conversation.id,
                    sender_type: MessageSender.AI,
                    sender_name: 'GEN-HUB AI',
                    content: welcomeMessage,
                    message_type: MessageType.TEXT,
                    is_ai_response: true,
                    ai_model: aiResult.model,
                    ai_confidence: aiResult.confidence,
                });
            }
        }

        // Nếu có initialMessage, lưu vào database
        if (dto.initialMessage) {
            await this.repository.createMessage({
                conversation_id: conversation.id,
                sender_type: MessageSender.CUSTOMER,
                sender_name: dto.name,
                sender_email: dto.email,
                content: dto.initialMessage,
                message_type: MessageType.TEXT,
            });
        }

        // Log
        this.systemLogService.info('contact', 'live_chat_start', `Session ${sessionId} started`, {
            metaData: { sessionId, code: conversation.code },
        });

        return {
            sessionId,
            code: conversation.code,
            welcomeMessage,
        };
    }

    /**
     * Gửi tin nhắn trong live chat (Guest)
     */
    async sendGuestMessage(
        sessionId: string,
        dto: SendMessageDto,
        lang: string = 'vi',
    ): Promise<{ message: any; aiResponse?: any }> {
        // Tìm conversation theo session_id
        const conversation = await this.repository.findBySessionId(sessionId);
        if (!conversation) {
            throw new NotFoundException(
                this.i18n.t('contact.live_chat.session_not_found', { lang }),
            );
        }

        // Lưu message của guest
        const message = await this.repository.createMessage({
            conversation_id: conversation.id,
            sender_type: MessageSender.CUSTOMER,
            sender_name: conversation.customer_name,
            sender_email: conversation.customer_email,
            content: dto.content,
            message_type: MessageType.TEXT,
        });

        // Cập nhật last_activity_at
        await this.repository.update(conversation.id, {
            last_activity_at: new Date(),
        });

        // Kiểm tra AI auto-reply
        let aiResponse: any = undefined;
        const shouldAiReply = conversation.enable_ai_reply ?? this.appConfigService.get('enableAiAutoReply');

        if (shouldAiReply && this.cozeService.isEnabled()) {
            const aiResult = await this.cozeService.chat(
                dto.content,
                conversation.id,
                sessionId,
            );

            if (aiResult.success) {
                // Lưu AI message
                aiResponse = await this.repository.createMessage({
                    conversation_id: conversation.id,
                    sender_type: MessageSender.AI,
                    sender_name: 'GEN-HUB AI',
                    content: aiResult.content,
                    message_type: MessageType.TEXT,
                    is_ai_response: true,
                    ai_model: aiResult.model,
                    ai_confidence: aiResult.confidence,
                });

                // Emit realtime event cho AI response
            }
        }

        // Invalidate cache
        await this.invalidateCache(conversation.id);

        return { message, aiResponse };
    }

    /**
     * Lấy conversation của session (Guest)
     */
    async getChatSession(
        sessionId: string,
        lang: string = 'vi',
    ): Promise<IContactConversationWithMessages> {
        const conversation = await this.repository.findBySessionId(sessionId);
        if (!conversation) {
            throw new NotFoundException(
                this.i18n.t('contact.live_chat.session_not_found', { lang }),
            );
        }

        // Lấy messages
        const messages = await this.repository.getMessages(conversation.id);

        return {
            ...conversation,
            messages,
        } as IContactConversationWithMessages;
    }

    // ========================================
    // Discord callback methods with action logging
    // ========================================

    /**
     * Đóng conversation với lý do (từ Discord)
     */
    async closeWithReason(id: string, userId: string, reason: string, performerName: string): Promise<void> {
        const conversation = await this.repository.findById(id);
        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        const oldStatus = conversation.status;
        await this.close(id, userId);

        // Ghi action log
        await this.repository.createActionLog({
            conversationId: id,
            actionType: ContactActionType.CLOSE,
            reason,
            oldStatus,
            newStatus: ContactStatus.CLOSED,
            performedByName: performerName,
            performedByType: ContactActionPerformedByType.DISCORD,
        });
    }

    /**
     * Mở lại conversation với lý do (từ Discord)
     */
    async reopenWithReason(id: string, userId: string, reason: string, performerName: string): Promise<void> {
        const conversation = await this.repository.findById(id);
        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        const oldStatus = conversation.status;
        await this.reopen(id, userId);

        // Ghi action log
        await this.repository.createActionLog({
            conversationId: id,
            actionType: ContactActionType.REOPEN,
            reason,
            oldStatus,
            newStatus: ContactStatus.OPEN,
            performedByName: performerName,
            performedByType: ContactActionPerformedByType.DISCORD,
        });
    }

    /**
     * Xóa conversation với lý do (từ Discord)
     */
    async deleteWithReason(id: string, userId: string, reason: string, performerName: string): Promise<void> {
        const conversation = await this.repository.findById(id);
        if (!conversation) {
            throw new NotFoundException('Conversation not found');
        }

        // Ghi action log trước khi xóa
        await this.repository.createActionLog({
            conversationId: id,
            actionType: ContactActionType.DELETE,
            reason,
            performedByName: performerName,
            performedByType: ContactActionPerformedByType.DISCORD,
        });

        await this.delete(id, userId);
    }

    /**
     * Thêm vào whitelist/blacklist từ Discord
     */
    async addToListFromDiscord(
        conversation: ContactConversation,
        listType: 'WHITELIST' | 'BLACKLIST',
        matchType: string,
        value: string,
        reason: string,
        performerName: string,
    ): Promise<void> {
        const matchTypeEnum = matchType as keyof typeof ContactListMatchType;
        const contactListType = listType === 'WHITELIST' ? ContactListType.WHITELIST : ContactListType.BLACKLIST;

        // Thêm vào contact list
        await this.contactListService.create({
            list_type: contactListType,
            match_type: ContactListMatchType[matchTypeEnum] || ContactListMatchType.EMAIL,
            value,
            reason,
        }, `[Discord] ${performerName}`, 'vi');

        // Ghi action log
        const actionType = listType === 'WHITELIST'
            ? ContactActionType.ADD_WHITELIST
            : ContactActionType.ADD_BLACKLIST;

        await this.repository.createActionLog({
            conversationId: conversation.id,
            actionType,
            reason,
            listType,
            matchType,
            matchValue: value,
            performedByName: performerName,
            performedByType: ContactActionPerformedByType.DISCORD,
        });
    }

    /**
     * Xóa khỏi whitelist/blacklist từ Discord
     */
    async removeFromListFromDiscord(
        conversation: ContactConversation,
        listType: 'WHITELIST' | 'BLACKLIST',
        matchType: string,
        value: string,
        performerName: string,
    ): Promise<void> {
        // Gọi service để xóa
        const contactListType = listType === 'WHITELIST'
            ? ContactListType.WHITELIST
            : ContactListType.BLACKLIST;

        const matchTypeEnum = matchType as keyof typeof ContactListMatchType;

        await this.contactListService.removeQuickEntry(
            contactListType,
            ContactListMatchType[matchTypeEnum] || ContactListMatchType.EMAIL,
            value,
            `[Discord] ${performerName}`,
        );

        // Ghi action log
        const actionType = listType === 'WHITELIST'
            ? ContactActionType.REMOVE_WHITELIST
            : ContactActionType.REMOVE_BLACKLIST;

        await this.repository.createActionLog({
            conversationId: conversation.id,
            actionType,
            listType,
            matchType,
            matchValue: value,
            performedByName: performerName,
            performedByType: ContactActionPerformedByType.DISCORD,
        });
    }

    /**
     * Đặt độ ưu tiên từ Discord
     */
    async setPriorityFromDiscord(
        conversation: ContactConversation,
        priority: string,
        performerName: string,
    ): Promise<void> {
        const oldPriority = conversation.priority;
        const newPriority = ContactPriority[priority as keyof typeof ContactPriority];

        // Cập nhật priority
        await this.repository.update(conversation.id, {
            priority: newPriority,
            updated_by: `[Discord] ${performerName}`,
        });

        // Ghi action log
        await this.repository.createActionLog({
            conversationId: conversation.id,
            actionType: ContactActionType.SET_PRIORITY,
            priority: newPriority,
            oldStatus: oldPriority,
            newStatus: newPriority,
            performedByName: performerName,
            performedByType: ContactActionPerformedByType.DISCORD,
        });

        // Invalidate cache
        await this.invalidateCache(conversation.id);
    }

    /**
     * Bỏ qua ticket từ Discord
     */
    async setSkippedFromDiscord(
        conversation: ContactConversation,
        reason: string,
        performerName: string,
    ): Promise<void> {
        // Cập nhật is_skipped
        await this.repository.update(conversation.id, {
            is_skipped: true,
            skip_reason: reason,
            updated_by: `[Discord] ${performerName}`,
        });

        // Ghi action log
        await this.repository.createActionLog({
            conversationId: conversation.id,
            actionType: ContactActionType.SET_SKIP,
            reason,
            performedByName: performerName,
            performedByType: ContactActionPerformedByType.DISCORD,
        });

        // Invalidate cache
        await this.invalidateCache(conversation.id);
    }

    /**
     * Hủy bỏ qua ticket từ Discord
     */
    async unsetSkippedFromDiscord(
        conversation: ContactConversation,
        performerName: string,
    ): Promise<void> {
        // Cập nhật is_skipped
        await this.repository.update(conversation.id, {
            is_skipped: false,
            skip_reason: null,
            updated_by: `[Discord] ${performerName}`,
        });

        // Ghi action log
        await this.repository.createActionLog({
            conversationId: conversation.id,
            actionType: ContactActionType.UNSET_SKIP,
            performedByName: performerName,
            performedByType: ContactActionPerformedByType.DISCORD,
        });

        // Invalidate cache
        await this.invalidateCache(conversation.id);
    }
}

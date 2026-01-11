/**
 * Service cho Organization Chat
 * Xử lý business logic cho chat và calls
 */
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { OrgChatRepository } from './org-chat.repository';
import { AgoraService } from './agora.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { RedisService } from '../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ChatCallType } from '@prisma/client';
import {
    QueryMessagesDto,
    SyncMessagesDto,
    QueryCallsDto,
    StartCallDto,
} from './dto';

@Injectable()
export class OrgChatService {
    private readonly logger = new Logger(OrgChatService.name);

    constructor(
        private readonly repository: OrgChatRepository,
        private readonly agoraService: AgoraService,
        private readonly websocket: WebsocketGateway,
        private readonly redisService: RedisService,
        private readonly prisma: PrismaService,
        private readonly i18n: I18nService,
    ) { }

    // ========== Token Endpoints ==========

    /**
     * Lấy RTM token cho chat messaging
     */
    async getRtmToken(orgId: string, userId: string, lang: string) {
        // Verify user là member của org
        await this.verifyMembership(orgId, userId, lang);

        const token = this.agoraService.generateRtmToken(userId);
        const appId = this.agoraService.getAppId();

        return {
            token,
            appId,
            userId,
            channelName: orgId, // Sử dụng orgId làm channel name cho RTM
        };
    }

    /**
     * Lấy RTC token cho video/voice call
     */
    async getRtcToken(orgId: string, callId: string, userId: string, lang: string) {
        await this.verifyMembership(orgId, userId, lang);

        const call = await this.repository.findCallById(callId);
        if (!call) {
            throw new NotFoundException(
                this.i18n.t('org-chat.CALL_NOT_FOUND', { lang }),
            );
        }

        if (call.status === 'ENDED') {
            throw new BadRequestException(
                this.i18n.t('org-chat.CALL_ALREADY_ENDED', { lang }),
            );
        }

        const agoraUid = this.agoraService.generateAgoraUid(userId);
        const token = this.agoraService.generateRtcToken(call.agora_channel_name, agoraUid);
        const appId = this.agoraService.getAppId();

        return {
            token,
            appId,
            channelName: call.agora_channel_name,
            uid: agoraUid,
        };
    }

    // ========== Messages ==========

    /**
     * Lấy danh sách tin nhắn
     */
    async getMessages(orgId: string, query: QueryMessagesDto, userId: string, lang: string) {
        await this.verifyMembership(orgId, userId, lang);

        const cacheKey = this.redisService.getOrgChatMessageListCacheKey(orgId, {
            limit: query.limit,
            offset: query.offset,
            keywords: query.keywords || '',
        });

        const cached = await this.redisService.getOrgChatMessageListCache(cacheKey);
        if (cached) return cached;

        const result = await this.repository.findMessages(orgId, {
            limit: query.limit,
            offset: query.offset,
            keywords: query.keywords,
        });

        await this.redisService.setOrgChatMessageListCache(cacheKey, result);
        return result;
    }

    /**
     * Sync tin nhắn từ client
     */
    async syncMessages(
        orgId: string,
        dto: SyncMessagesDto,
        userId: string,
        lang: string,
    ) {
        await this.verifyMembership(orgId, userId, lang);

        const messagesToCreate = dto.messages.map((msg) => ({
            organization_id: orgId,
            content: msg.content,
            agora_message_id: msg.agora_message_id,
            created_by: userId,
            created_at: msg.sent_at ? new Date(msg.sent_at) : new Date(),
        }));

        const results = await this.repository.createManyMessages(messagesToCreate);

        // Invalidate cache
        await this.redisService.invalidateOrgChatMessageListCache(orgId);

        // Log to SystemLog
        await this.logToSystemLog(orgId, 'chat.sync', userId, {
            synced_count: results.length,
        });

        return {
            synced: results.length,
            messages: results,
        };
    }

    /**
     * Xóa tin nhắn
     */
    async deleteMessage(orgId: string, messageId: string, userId: string, lang: string) {
        await this.verifyMembership(orgId, userId, lang);

        const message = await this.repository.findMessageById(messageId);
        if (!message) {
            throw new NotFoundException(
                this.i18n.t('org-chat.MESSAGE_NOT_FOUND', { lang }),
            );
        }

        if (message.organization_id !== orgId) {
            throw new BadRequestException(
                this.i18n.t('org-chat.MESSAGE_NOT_FOUND', { lang }),
            );
        }

        await this.repository.deleteMessage(messageId, userId);

        // Invalidate cache
        await this.redisService.invalidateOrgChatMessageListCache(orgId);

        // Emit socket event
        this.websocket.emitToOrganization(orgId, 'chat:messageDeleted', {
            messageId,
            deletedBy: userId,
        });

        // Log to SystemLog
        await this.logToSystemLog(orgId, 'chat.delete', userId, { messageId });
    }

    // ========== Calls ==========

    /**
     * Lấy danh sách cuộc gọi
     */
    async getCalls(orgId: string, query: QueryCallsDto, userId: string, lang: string) {
        await this.verifyMembership(orgId, userId, lang);

        const result = await this.repository.findCalls(orgId, {
            limit: query.limit,
            offset: query.offset,
            status: query.status,
        });

        return result;
    }

    /**
     * Lấy cuộc gọi đang diễn ra
     */
    async getActiveCall(orgId: string, userId: string, lang: string) {
        await this.verifyMembership(orgId, userId, lang);

        const call = await this.repository.findActiveCall(orgId);
        return call;
    }

    /**
     * Bắt đầu cuộc gọi mới
     */
    async startCall(orgId: string, dto: StartCallDto, userId: string, lang: string) {
        await this.verifyMembership(orgId, userId, lang);

        // Kiểm tra đã có cuộc gọi active chưa
        const activeCall = await this.repository.findActiveCall(orgId);
        if (activeCall) {
            throw new BadRequestException(
                this.i18n.t('org-chat.CALL_IN_PROGRESS', { lang }),
            );
        }

        // Tạo channel name unique
        const channelName = `org_${orgId}_${Date.now()}`;

        const call = await this.repository.createCall({
            organization_id: orgId,
            call_type: dto.call_type,
            agora_channel_name: channelName,
            created_by: userId,
        });

        // Emit socket event
        this.websocket.emitToOrganization(orgId, 'chat:callStarted', {
            call: {
                id: call.id,
                callType: call.call_type,
                channelName: call.agora_channel_name,
                status: call.status,
                createdBy: userId,
            },
        });

        // Log to SystemLog
        await this.logToSystemLog(orgId, 'chat.call.start', userId, {
            callId: call.id,
            callType: dto.call_type,
        });

        return call;
    }

    /**
     * Tham gia cuộc gọi
     */
    async joinCall(orgId: string, callId: string, userId: string, lang: string) {
        await this.verifyMembership(orgId, userId, lang);

        const call = await this.repository.findCallById(callId);
        if (!call) {
            throw new NotFoundException(
                this.i18n.t('org-chat.CALL_NOT_FOUND', { lang }),
            );
        }

        if (call.status === 'ENDED') {
            throw new BadRequestException(
                this.i18n.t('org-chat.CALL_ALREADY_ENDED', { lang }),
            );
        }

        // Tạo Agora UID
        const agoraUid = this.agoraService.generateAgoraUid(userId);

        // Thêm participant
        await this.repository.addParticipant({
            call_id: callId,
            user_id: userId,
            agora_uid: agoraUid,
        });

        // Nếu call đang WAITING, chuyển sang ONGOING
        if (call.status === 'WAITING') {
            await this.repository.updateCallStatus(callId, 'ONGOING');
        }

        // Generate RTC token
        const token = this.agoraService.generateRtcToken(call.agora_channel_name, agoraUid);
        const appId = this.agoraService.getAppId();

        // Emit socket event
        this.websocket.emitToOrganization(orgId, 'chat:participantJoined', {
            callId,
            userId,
            agoraUid,
        });

        // Log to SystemLog
        await this.logToSystemLog(orgId, 'chat.call.join', userId, { callId });

        return {
            token,
            appId,
            channelName: call.agora_channel_name,
            uid: agoraUid,
        };
    }

    /**
     * Rời cuộc gọi
     */
    async leaveCall(orgId: string, callId: string, userId: string, lang: string) {
        await this.verifyMembership(orgId, userId, lang);

        const call = await this.repository.findCallById(callId);
        if (!call) {
            throw new NotFoundException(
                this.i18n.t('org-chat.CALL_NOT_FOUND', { lang }),
            );
        }

        await this.repository.removeParticipant(callId, userId);

        // Kiểm tra còn participant không
        const activeCount = await this.repository.getActiveParticipantsCount(callId);

        // Nếu không còn ai, tự động end call
        if (activeCount === 0) {
            await this.repository.updateCallStatus(callId, 'ENDED', userId);

            this.websocket.emitToOrganization(orgId, 'chat:callEnded', {
                callId,
                endedBy: userId,
                reason: 'no_participants',
            });
        } else {
            this.websocket.emitToOrganization(orgId, 'chat:participantLeft', {
                callId,
                userId,
            });
        }

        // Log to SystemLog
        await this.logToSystemLog(orgId, 'chat.call.leave', userId, { callId });
    }

    /**
     * Kết thúc cuộc gọi
     */
    async endCall(orgId: string, callId: string, userId: string, lang: string) {
        await this.verifyMembership(orgId, userId, lang);

        const call = await this.repository.findCallById(callId);
        if (!call) {
            throw new NotFoundException(
                this.i18n.t('org-chat.CALL_NOT_FOUND', { lang }),
            );
        }

        if (call.status === 'ENDED') {
            throw new BadRequestException(
                this.i18n.t('org-chat.CALL_ALREADY_ENDED', { lang }),
            );
        }

        await this.repository.updateCallStatus(callId, 'ENDED', userId);

        // Emit socket event
        this.websocket.emitToOrganization(orgId, 'chat:callEnded', {
            callId,
            endedBy: userId,
        });

        // Log to SystemLog
        await this.logToSystemLog(orgId, 'chat.call.end', userId, { callId });
    }

    // ========== Helpers ==========

    /**
     * Verify user là member của organization
     */
    private async verifyMembership(orgId: string, userId: string, lang: string) {
        const org = await this.prisma.organization.findFirst({
            where: { id: orgId, is_deleted: false },
            select: { owner_id: true },
        });

        if (!org) {
            throw new NotFoundException(
                this.i18n.t('organization.NOT_FOUND', { lang }),
            );
        }

        // Owner có quyền
        if (org.owner_id === userId) return true;

        // Kiểm tra member
        const member = await this.prisma.organizationMember.findFirst({
            where: {
                organization_id: orgId,
                user_id: userId,
                is_deleted: false,
                is_active: true,
                is_accepted: true,
            },
        });

        if (!member) {
            throw new BadRequestException(
                this.i18n.t('organization.NOT_A_MEMBER', { lang }),
            );
        }

        return true;
    }

    /**
     * Log hành động vào SystemLog
     */
    private async logToSystemLog(
        orgId: string,
        action: string,
        userId: string,
        metadata?: Record<string, unknown>,
    ) {
        try {
            await this.prisma.systemLog.create({
                data: {
                    user_id: userId,
                    module: 'org-chat',
                    action,
                    message: `Organization Chat: ${action}`,
                    meta_data: {
                        organization_id: orgId,
                        ...metadata,
                    },
                },
            });
        } catch (error) {
            this.logger.error(`Failed to log to SystemLog: ${error}`);
        }
    }
}

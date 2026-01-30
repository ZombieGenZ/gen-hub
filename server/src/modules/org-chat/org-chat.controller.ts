/**
 * Controller cho Organization Chat
 * Route: /organizations/:orgId/chat
 * Yêu cầu: owner hoặc member của organization (với permission tương ứng)
 */
import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { OrgChatService } from './org-chat.service';
import {
    QueryMessagesDto,
    SyncMessagesDto,
    QueryCallsDto,
    StartCallDto,
} from './dto';
import { CombinedAuthGuard, OrgPermissionGuard } from '../../common/guards';
import { CurrentUser, CurrentActor, RequireOrgPermission, ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import {
    GetResponse,
    CreatedResponse,
    DeletedResponse,
    ResponseCode,
} from '../../common/responses';

@ApiTags('Organization Chat')
@ApiBearerAuth('JWT-auth')
@Controller('organizations/:orgId/chat')
@UseGuards(CombinedAuthGuard, OrgPermissionGuard)
export class OrgChatController {
    constructor(private readonly service: OrgChatService) { }

    /**
     * Lấy RTM token cho chat messaging (Agora RTM)
     */
    @Get('token/rtm')
    @RequireOrgPermission('chat.view')
    @ApiOperation({
        summary: 'Lấy Agora RTM token cho chat',
        description: 'Lấy token RTM để kết nối Agora Signalling, dùng cho tính năng chat thời gian thực. Token có thời hạn sử dụng.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Lấy RTM token thành công',
        schema: {
            example: {
                code: 'ORG_CHAT_TOKEN_SUCCESS',
                message: 'Lấy RTM token thành công',
                success: true,
                data: {
                    token: '006appId...token',
                    user_id: '550e8400-e29b-41d4-a716-446655440001',
                    expires_at: 1738221600
                }
            }
        }
    })
    @ApiAuthResponses()
    async getRtmToken(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @CurrentActor('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.service.getRtmToken(orgId, userId, lang);
        return new GetResponse(
            ResponseCode.ORG_CHAT_TOKEN_SUCCESS,
            data,
            'Lấy RTM token thành công',
        );
    }

    /**
     * Lấy RTC token cho video/voice call (Agora RTC)
     */
    @Get('token/rtc/:callId')
    @RequireOrgPermission('chat.call.join')
    @ApiOperation({
        summary: 'Lấy Agora RTC token cho cuộc gọi',
        description: 'Lấy token RTC để tham gia cuộc gọi video/voice. Cần cung cấp ID cuộc gọi hợp lệ.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiParam({ name: 'callId', description: 'ID của cuộc gọi (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Lấy RTC token thành công',
        schema: {
            example: {
                code: 'ORG_CHAT_TOKEN_SUCCESS',
                message: 'Lấy RTC token thành công',
                success: true,
                data: {
                    token: '006appId...token',
                    channel: 'call-channel-uuid',
                    uid: 123456,
                    expires_at: 1738221600
                }
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy cuộc gọi hoặc cuộc gọi đã kết thúc' })
    @ApiAuthResponses()
    async getRtcToken(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('callId', ParseUUIDPipe) callId: string,
        @CurrentActor('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.service.getRtcToken(orgId, callId, userId, lang);
        return new GetResponse(
            ResponseCode.ORG_CHAT_TOKEN_SUCCESS,
            data,
            'Lấy RTC token thành công',
        );
    }

    /**
     * Lấy danh sách tin nhắn (phân trang, mặc định 25/trang)
     */
    @Get('messages')
    @RequireOrgPermission('chat.view')
    @ApiOperation({
        summary: 'Lấy danh sách tin nhắn chat',
        description: 'Lấy lịch sử tin nhắn trong tổ chức với phân trang và tìm kiếm.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng tin nhắn (mặc định 25)', example: 25 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu (mặc định 0)', example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm kiếm trong nội dung' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách tin nhắn thành công',
        schema: {
            example: {
                code: 'ORG_CHAT_MESSAGES_SUCCESS',
                message: 'Lấy danh sách tin nhắn thành công',
                success: true,
                data: {
                    items: [
                        {
                            id: 'msg-uuid-1',
                            content: 'Hello everyone',
                            sender_id: 'user-uuid-1',
                            sender: {
                                id: 'user-uuid-1',
                                full_name: 'Nguyễn Văn A',
                                email: 'a@example.com'
                            },
                            sent_at: '2026-01-30T07:00:00.000Z'
                        }
                    ],
                    total: 100,
                    limit: 25,
                    offset: 0
                }
            }
        }
    })
    @ApiAuthResponses()
    async getMessages(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query() query: QueryMessagesDto,
        @CurrentActor('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.service.getMessages(orgId, query, userId, lang);
        return new GetResponse(
            ResponseCode.ORG_CHAT_MESSAGES_SUCCESS,
            data,
            'Lấy danh sách tin nhắn thành công',
        );
    }

    /**
     * Sync tin nhắn từ client (batch)
     */
    @Post('messages/sync')
    @RequireOrgPermission('chat.send')
    @ApiOperation({
        summary: 'Sync tin nhắn từ client về server',
        description: 'Đồng bộ danh sách tin nhắn đã gửi từ client (thông qua Agora RTM) về database server để lưu trữ.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiBody({
        type: SyncMessagesDto,
        description: 'Danh sách tin nhắn cần đồng bộ',
        examples: {
            sync: {
                summary: 'Đồng bộ 1 tin nhắn',
                value: {
                    messages: [
                        {
                            agora_message_id: 'agora-msg-id-1',
                            content: 'Hello World',
                            sent_at: '2026-01-30T07:00:00.000Z'
                        }
                    ]
                }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Sync tin nhắn thành công',
        schema: {
            example: {
                code: 'ORG_CHAT_SYNC_SUCCESS',
                message: 'Sync tin nhắn thành công',
                success: true,
                data: {
                    synced_count: 1,
                    messages: [
                        { id: 'msg-uuid-1', agora_message_id: 'agora-msg-id-1' }
                    ]
                }
            }
        }
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async syncMessages(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Body() dto: SyncMessagesDto,
        @CurrentActor('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.service.syncMessages(orgId, dto, userId, lang);
        return new CreatedResponse(
            ResponseCode.ORG_CHAT_SYNC_SUCCESS,
            data,
            'Sync tin nhắn thành công',
        );
    }

    /**
     * Xóa tin nhắn
     */
    @Delete('messages/:id')
    @RequireOrgPermission('chat.delete')
    @ApiOperation({
        summary: 'Xóa tin nhắn',
        description: 'Xóa mềm một tin nhắn. Chỉ người gửi hoặc admin mới có quyền xóa.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID của tin nhắn (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Xóa tin nhắn thành công',
        schema: {
            example: {
                code: 'ORG_CHAT_DELETE_SUCCESS',
                message: 'Xóa tin nhắn thành công',
                success: true,
                data: null
            }
        }
    })
    @ApiResponse({ status: 403, description: 'Không có quyền xóa tin nhắn này' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy tin nhắn' })
    @ApiAuthResponses()
    async deleteMessage(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.deleteMessage(orgId, id, userId, lang);
        return new DeletedResponse(
            ResponseCode.ORG_CHAT_DELETE_SUCCESS,
            null,
            'Xóa tin nhắn thành công',
        );
    }

    /**
     * Lấy danh sách cuộc gọi
     */
    @Get('calls')
    @RequireOrgPermission('chat.call.view')
    @ApiOperation({
        summary: 'Lấy danh sách cuộc gọi',
        description: 'Lấy lịch sử cuộc gọi trogn tổ chức với phân trang và lọc theo trạng thái.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng cuộc gọi (mặc định 25)' })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu (mặc định 0)' })
    @ApiQuery({ name: 'status', required: false, enum: ['ONGOING', 'ENDED', 'MISSED'], description: 'Trạng thái cuộc gọi' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách cuộc gọi thành công',
        schema: {
            example: {
                code: 'ORG_CHAT_CALLS_SUCCESS',
                message: 'Lấy danh sách cuộc gọi thành công',
                success: true,
                data: {
                    items: [
                        {
                            id: 'call-uuid-1',
                            call_type: 'VIDEO',
                            status: 'ENDED',
                            started_at: '2026-01-30T06:00:00.000Z',
                            ended_at: '2026-01-30T06:30:00.000Z',
                            started_by: {
                                id: 'user-uuid-1',
                                full_name: 'Nguyễn Văn A'
                            }
                        }
                    ],
                    total: 5,
                    limit: 25,
                    offset: 0
                }
            }
        }
    })
    @ApiAuthResponses()
    async getCalls(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query() query: QueryCallsDto,
        @CurrentActor('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.service.getCalls(orgId, query, userId, lang);
        return new GetResponse(
            ResponseCode.ORG_CHAT_CALLS_SUCCESS,
            data,
            'Lấy danh sách cuộc gọi thành công',
        );
    }

    /**
     * Lấy cuộc gọi đang diễn ra
     */
    @Get('calls/active')
    @RequireOrgPermission('chat.call.view')
    @ApiOperation({
        summary: 'Lấy cuộc gọi đang diễn ra',
        description: 'Lấy thông tin cuộc gọi đang ACTIVE (nếu có) trong tổ chức.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Lấy cuộc gọi đang diễn ra thành công',
        schema: {
            example: {
                code: 'ORG_CHAT_CALL_SUCCESS',
                message: 'Lấy cuộc gọi đang diễn ra thành công',
                success: true,
                data: {
                    id: 'call-uuid-1',
                    call_type: 'VOICE',
                    status: 'ONGOING',
                    channel_name: 'org-chat-uuid',
                    participants_count: 3
                }
            }
        }
    })
    @ApiAuthResponses()
    async getActiveCall(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @CurrentActor('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.service.getActiveCall(orgId, userId, lang);
        return new GetResponse(
            ResponseCode.ORG_CHAT_CALL_SUCCESS,
            data,
            'Lấy cuộc gọi đang diễn ra thành công',
        );
    }

    /**
     * Bắt đầu cuộc gọi mới
     */
    @Post('calls')
    @RequireOrgPermission('chat.call.start')
    @ApiOperation({
        summary: 'Bắt đầu cuộc gọi mới',
        description: 'Khởi tạo một cuộc gọi mới (Video/Voice). Chỉ có thể có 1 cuộc gọi active tại một thời điểm.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiBody({
        type: StartCallDto,
        examples: {
            video_call: {
                summary: 'Cuộc gọi Video',
                value: { call_type: 'VIDEO' }
            },
            voice_call: {
                summary: 'Cuộc gọi Thoại',
                value: { call_type: 'VOICE' }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Bắt đầu cuộc gọi thành công',
        schema: {
            example: {
                code: 'ORG_CHAT_CALL_STARTED',
                message: 'Bắt đầu cuộc gọi thành công',
                success: true,
                data: {
                    id: 'call-uuid-new',
                    channel_name: 'channel-uuid',
                    token: 'agorartctoken...',
                    uid: 123456
                }
            }
        }
    })
    @ApiResponse({ status: 409, description: 'Đang có cuộc gọi khác diễn ra' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async startCall(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Body() dto: StartCallDto,
        @CurrentActor('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.service.startCall(orgId, dto, userId, lang);
        return new CreatedResponse(
            ResponseCode.ORG_CHAT_CALL_STARTED,
            data,
            'Bắt đầu cuộc gọi thành công',
        );
    }

    /**
     * Tham gia cuộc gọi
     */
    @Post('calls/:id/join')
    @RequireOrgPermission('chat.call.join')
    @ApiOperation({
        summary: 'Tham gia cuộc gọi',
        description: 'Tham gia vào một cuộc gọi đang diễn ra. Trả về thông tin kết nối Agora.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID cuộc gọi (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Tham gia cuộc gọi thành công',
        schema: {
            example: {
                code: 'ORG_CHAT_CALL_JOINED',
                message: 'Tham gia cuộc gọi thành công',
                success: true,
                data: {
                    id: 'call-uuid-1',
                    channel_name: 'channel-uuid',
                    token: 'agorartctoken...',
                    uid: 654321
                }
            }
        }
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy cuộc gọi hoặc đã kết thúc' })
    @ApiAuthResponses()
    async joinCall(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.service.joinCall(orgId, id, userId, lang);
        return new GetResponse(
            ResponseCode.ORG_CHAT_CALL_JOINED,
            data,
            'Tham gia cuộc gọi thành công',
        );
    }

    /**
     * Rời cuộc gọi
     */
    @Post('calls/:id/leave')
    @RequireOrgPermission('chat.call.join')
    @ApiOperation({
        summary: 'Rời cuộc gọi',
        description: 'Rời khỏi cuộc gọi đang tham gia.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID cuộc gọi (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Rời cuộc gọi thành công',
        schema: {
            example: {
                code: 'ORG_CHAT_CALL_LEFT',
                message: 'Rời cuộc gọi thành công',
                success: true,
                data: null
            }
        }
    })
    @ApiAuthResponses()
    async leaveCall(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.leaveCall(orgId, id, userId, lang);
        return new GetResponse(
            ResponseCode.ORG_CHAT_CALL_LEFT,
            null,
            'Rời cuộc gọi thành công',
        );
    }

    /**
     * Kết thúc cuộc gọi
     */
    @Post('calls/:id/end')
    @RequireOrgPermission('chat.call.start')
    @ApiOperation({
        summary: 'Kết thúc cuộc gọi',
        description: 'Kết thúc hoàn toàn cuộc gọi cho tất cả mọi người. Chỉ người tạo cuộc gọi hoặc có quyền mới được thực hiện.'
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)' })
    @ApiParam({ name: 'id', description: 'ID cuộc gọi (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Kết thúc cuộc gọi thành công',
        schema: {
            example: {
                code: 'ORG_CHAT_CALL_ENDED',
                message: 'Kết thúc cuộc gọi thành công',
                success: true,
                data: null
            }
        }
    })
    @ApiAuthResponses()
    async endCall(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentActor('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.endCall(orgId, id, userId, lang);
        return new GetResponse(
            ResponseCode.ORG_CHAT_CALL_ENDED,
            null,
            'Kết thúc cuộc gọi thành công',
        );
    }
}

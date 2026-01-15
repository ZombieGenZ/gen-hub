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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { OrgChatService } from './org-chat.service';
import {
    QueryMessagesDto,
    SyncMessagesDto,
    QueryCallsDto,
    StartCallDto,
} from './dto';
import { CombinedAuthGuard, OrgPermissionGuard } from '../../common/guards';
import { CurrentUser, CurrentActor, RequireOrgPermission } from '../../common/decorators';
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
    @ApiOperation({ summary: 'Lấy Agora RTM token cho chat' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
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
    @ApiOperation({ summary: 'Lấy Agora RTC token cho cuộc gọi' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiParam({ name: 'callId', description: 'ID của cuộc gọi' })
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
    @ApiOperation({ summary: 'Lấy danh sách tin nhắn chat' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
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
    @ApiOperation({ summary: 'Sync tin nhắn từ client về server' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
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
    @ApiOperation({ summary: 'Xóa tin nhắn' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiParam({ name: 'id', description: 'ID của tin nhắn' })
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
    @ApiOperation({ summary: 'Lấy danh sách cuộc gọi' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
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
    @ApiOperation({ summary: 'Lấy cuộc gọi đang diễn ra' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
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
    @ApiOperation({ summary: 'Bắt đầu cuộc gọi mới' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
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
    @ApiOperation({ summary: 'Tham gia cuộc gọi' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiParam({ name: 'id', description: 'ID của cuộc gọi' })
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
    @ApiOperation({ summary: 'Rời cuộc gọi' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiParam({ name: 'id', description: 'ID của cuộc gọi' })
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
    @ApiOperation({ summary: 'Kết thúc cuộc gọi' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @ApiParam({ name: 'id', description: 'ID của cuộc gọi' })
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

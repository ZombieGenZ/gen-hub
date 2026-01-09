import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { ContactService } from './contact.service';
import { UserRepository } from '../user/user.repository';
import {
    CreateContactDto,
    QueryContactDto,
    UpdateContactDto,
    ReplyContactDto,
    StartChatDto,
    SendMessageDto,
} from './dto';
import { Public } from '../../common/decorators/public.decorator';
import {
    CreatedResponse,
    GetResponse,
    UpdatedResponse,
    DeletedResponse,
    OkResponse,
} from '../../common/responses/success.response';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

/**
 * Controller cho Contact module
 * Bao gồm public endpoint và admin endpoints
 */
@ApiTags('Contact')
@Controller()
export class ContactController {
    constructor(
        private readonly contactService: ContactService,
        private readonly userRepository: UserRepository,
    ) { }

    /**
     * Tạo ticket từ form website (public - không cần auth)
     */
    @Post('contact')
    @Public()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Gửi yêu cầu liên hệ từ form website (public)' })
    async createPublic(
        @Body() dto: CreateContactDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.createFromWebForm(dto, lang);
        return new CreatedResponse('contact.created', result, result.message);
    }

    // ==================== LIVE CHAT ENDPOINTS (PUBLIC) ====================

    /**
     * Khởi tạo phiên live chat (Guest không cần đăng nhập)
     */
    @Post('contact/chat/start')
    @Public()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Khởi tạo phiên live chat (public)' })
    async startChatSession(
        @Body() dto: StartChatDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.startChatSession(dto, lang);
        return new CreatedResponse('contact.live_chat.session_created', result);
    }

    /**
     * Gửi tin nhắn trong live chat (Guest)
     */
    @Post('contact/chat/:sessionId/message')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Gửi tin nhắn trong live chat (public)' })
    async sendGuestMessage(
        @Param('sessionId') sessionId: string,
        @Body() dto: SendMessageDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.sendGuestMessage(sessionId, dto, lang);
        return new OkResponse('contact.live_chat.message_sent', result);
    }

    /**
     * Lấy conversation của session (Guest)
     */
    @Get('contact/chat/:sessionId')
    @Public()
    @ApiOperation({ summary: 'Lấy conversation của session (public)' })
    async getChatSession(
        @Param('sessionId') sessionId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.getChatSession(sessionId, lang);
        return new GetResponse('contact.live_chat.session', result);
    }

    // ==================== ADMIN ENDPOINTS ====================

    /**
     * Lấy danh sách tickets - OPTIMIZED
     */
    @Get('admin/contacts')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.list')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy danh sách tickets liên hệ (optimized)' })
    async findAll(
        @Query() query: QueryContactDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.findMany(query, lang);
        return new GetResponse('contact.list', result);
    }

    /**
     * Lấy chi tiết ticket
     */
    @Get('admin/contacts/:id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.read')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy chi tiết ticket liên hệ' })
    async findOne(
        @Param('id') id: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.findById(id, lang);
        return new GetResponse('contact.read', result);
    }

    /**
     * Lấy messages của ticket
     */
    @Get('admin/contacts/:id/messages')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.read')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Lấy danh sách messages của ticket' })
    async findMessages(
        @Param('id') id: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.findMessages(id, lang);
        return new GetResponse('contact.messages', result);
    }



    /**
     * Cập nhật ticket
     */
    @Patch('admin/contacts/:id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.update')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Cập nhật ticket (status, priority, assign, staff)' })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateContactDto,
        @CurrentUser() user: { userId: string; name?: string },
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.update(id, dto, user.userId, user.name || 'Admin', lang);
        return new UpdatedResponse('contact.updated', result);
    }



    /**
     * Staff reply
     */
    @Post('admin/contacts/:id/reply')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.reply')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Staff trả lời ticket' })
    async reply(
        @Param('id') id: string,
        @Body() dto: ReplyContactDto,
        @CurrentUser() user: { userId: string; name?: string; email?: string },
        @I18nLang() lang: string,
    ) {
        // Fetch real user name
        let staffName = user.name || 'Staff';
        const userDetails = await this.userRepository.findById(user.userId);
        if (userDetails) {
            staffName = userDetails.name;
        }

        const result = await this.contactService.reply(
            id,
            dto,
            user.userId,
            staffName,
            user.email || '',
            lang,
        );
        return new OkResponse('contact.replied', null, result.message);
    }

    /**
     * Đóng ticket
     */
    @Post('admin/contacts/:id/close')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.update')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Đóng ticket' })
    async close(
        @Param('id') id: string,
        @CurrentUser() user: { userId: string },
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.close(id, user.userId, lang);
        return new OkResponse('contact.closed', null, result.message);
    }

    /**
     * Mở lại ticket
     */
    @Post('admin/contacts/:id/reopen')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.update')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Mở lại ticket' })
    async reopen(
        @Param('id') id: string,
        @CurrentUser() user: { userId: string },
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.reopen(id, user.userId, lang);
        return new OkResponse('contact.reopened', null, result.message);
    }



    /**
     * Xóa ticket
     */
    @Delete('admin/contacts/:id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.delete')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Xóa ticket' })
    async delete(
        @Param('id') id: string,
        @CurrentUser() user: { userId: string },
        @I18nLang() lang: string,
    ) {
        await this.contactService.delete(id, user.userId, lang);
        return new DeletedResponse('contact.deleted');
    }

    /**
     * Xóa nhiều tickets
     */
    @Delete('admin/contacts/delete/many')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.delete')
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Xóa nhiều tickets' })
    async deleteMany(
        @Body('ids') ids: string[],
        @CurrentUser() user: { userId: string },
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.deleteMany(ids, user.userId, lang);
        return new DeletedResponse('contact.deleted_many', result);
    }
}

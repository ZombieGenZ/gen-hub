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
    BadRequestException,
    Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
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
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators/api-common-responses.decorator';

/**
 * Controller cho Contact module
 * Bao gồm public endpoint và admin endpoints
 */
@ApiTags('Contact & Live Chat')
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
    @ApiOperation({
        summary: 'Gửi yêu cầu liên hệ (Public)',
        description: 'API dành cho form liên hệ trên website. Khách vãng lai có thể gửi yêu cầu hỗ trợ.'
    })
    @ApiValidationErrorResponse()
    @ApiBody({
        type: CreateContactDto,
        description: 'Thông tin liên hệ',
        examples: {
            support: {
                summary: 'Yêu cầu hỗ trợ',
                value: {
                    name: 'Nguyễn Văn A',
                    email: 'nguyenvana@example.com',
                    phone: '0901234567',
                    subject: 'Hỗ trợ kỹ thuật',
                    message: 'Tôi gặp lỗi khi đăng nhập...',
                    type: 'SUPPORT'
                }
            }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Gửi liên hệ thành công',
        schema: {
            example: {
                code: 'contact.created',
                message: 'Gửi yêu cầu thành công, chúng tôi sẽ phản hồi sớm nhất.',
                success: true,
                data: {
                    id: '...',
                    ticket_number: 'TK-123456'
                }
            }
        }
    })
    async createPublic(
        @Body() dto: CreateContactDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.createFromWebForm(dto, lang);
        return new CreatedResponse('contact.created', result, result.message);
    }

    /**
     * Khởi tạo phiên live chat.
     * Có JWT: không cần truyền session. Không JWT: bắt buộc truyền session (hoặc uid).
     */
    @Post('contact/chat/start')
    @Public()
    @UseGuards(OptionalJwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Khởi tạo Live Chat (Public)',
        description: 'Bắt đầu phiên chat.\n- **Có JWT (đã đăng nhập)**: Không bắt buộc truyền trường `session` hay `uid`. Hệ thống sẽ tự tạo `session_id` và gắn với user.\n- **Không JWT (khách vãng lai)**: Bắt buộc truyền `session` (có thể dùng uuid hoặc chuỗi ngẫu nhiên ở client) để định danh và duy trì phiên chat cho khách.\n- **Tin nhắn đầu tiên**: Có thể đính kèm qua trường `initialMessage`.'
    })
    @ApiValidationErrorResponse()
    @ApiBody({
        type: StartChatDto,
        description: 'Dữ liệu khởi tạo phiên chat. Bắt buộc truyền `session` nếu không có JWT.',
        examples: {
            guest: { summary: 'Khách vãng lai (không JWT)', value: { session: 'random-uuid-for-guest', initialMessage: 'Xin chào, tôi cần hỗ trợ.' } },
            withJwt: { summary: 'User đã đăng nhập (Có JWT)', value: { initialMessage: 'Tôi muốn hỏi về sản phẩm.' } }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Session chat được tạo',
        schema: {
            example: {
                code: 'contact.live_chat.session_created',
                message: 'Đã tạo phiên chat',
                success: true,
                data: { session_id: 'uuid-session', code: 'TK-123456' }
            }
        }
    })
    async startChatSession(
        @Body() dto: StartChatDto,
        @I18nLang() lang: string,
        @CurrentUser() user: { userId: string; email?: string } | null,
        @Req() req: { ip?: string; headers?: { 'x-forwarded-for'?: string; 'x-real-ip'?: string } },
    ) {
        const hasSession = !!(dto.session?.trim() || dto.uid?.trim());
        if (!user && !hasSession) {
            throw new BadRequestException(
                this.contactService.requireSessionMessage(lang),
            );
        }
        const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
            || req?.headers?.['x-real-ip']
            || req?.ip
            || undefined;
        const result = await this.contactService.startChatSession(dto, lang, {
            userId: user?.userId,
            ip,
        });
        return new CreatedResponse('contact.live_chat.session_created', result);
    }

    /**
     * Gửi tin nhắn trong live chat (Guest)
     */
    @Post('contact/chat/:sessionId/message')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Guest gửi tin nhắn (Public)',
        description: 'Khách gửi tin nhắn trong phiên chat đã tạo.'
    })
    @ApiParam({ name: 'sessionId', description: 'ID phiên chat (UUID)' })
    @ApiBody({
        type: SendMessageDto,
        description: 'Nội dung tin nhắn',
        examples: {
            text: {
                summary: 'Tin nhắn văn bản',
                value: { content: 'Xin chào, tôi cần giúp đỡ.' }
            }
        }
    })
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
    @ApiOperation({
        summary: 'Lấy nội dung đoạn chat (Public)',
        description: 'Lấy lịch sử tin nhắn của phiên chat cho khách.'
    })
    @ApiParam({ name: 'sessionId', description: 'ID phiên chat (UUID)' })
    @ApiResponse({
        status: 200,
        description: 'Lấy lịch sử thành công',
        schema: {
            example: {
                code: 'contact.live_chat.session',
                message: 'Lấy thông tin thành công',
                success: true,
                data: {
                    id: '...',
                    messages: []
                }
            }
        }
    })
    async getChatSession(
        @Param('sessionId') sessionId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.getChatSession(sessionId, lang);
        return new GetResponse('contact.live_chat.session', result);
    }

    /**
     * Lấy lịch sử đoạn chat (live chat) của user đăng nhập
     */
    @Get('contact/chat/history')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Lấy lịch sử live chat của user',
        description: 'Trả về danh sách phiên live chat của user hiện tại (có user_id), mỗi phiên kèm tin nhắn.',
    })
    @ApiAuthResponses()
    @ApiResponse({
        status: 200,
        description: 'Lấy lịch sử thành công',
        schema: {
            example: {
                code: 'contact.live_chat.history',
                message: 'Lấy lịch sử thành công',
                success: true,
                data: [{ id: '...', code: '...', session_id: '...', messages: [] }],
            },
        },
    })
    async getChatHistory(@CurrentUser() user: { userId: string }) {
        const result = await this.contactService.getChatHistoryByUserId(user.userId);
        return new GetResponse('contact.live_chat.history', result);
    }

    /**
     * Lấy danh sách tickets - OPTIMIZED
     */
    @Get('admin/contacts')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.list')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Lấy danh sách tickets (Admin)',
        description: 'API lấy danh sách yêu cầu liên hệ với bộ lọc nâng cao.'
    })
    @ApiAuthResponses()
    @ApiQuery({ name: 'limit', required: false, example: 10 })
    @ApiQuery({ name: 'offset', required: false, example: 0 })
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'PROCESSING', 'RESOLVED', 'CLOSED'] })
    @ApiQuery({ name: 'type', required: false, enum: ['SUPPORT', 'SALES', 'PARTNERSHIP'] })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách thành công',
        schema: {
            example: {
                code: 'contact.list',
                message: 'Lấy danh sách thành công',
                success: true,
                data: { items: [], total: 0 }
            }
        }
    })
    async findAll(
        @Query() query: QueryContactDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.findMany(query, lang);
        return new GetResponse('contact.list', result);
    }

    /**
     * Lấy danh sách tickets ưu tiên (is_priority_customer = true)
     */
    @Get('admin/contacts/priority')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.list')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Lấy danh sách tickets ưu tiên' })
    @ApiAuthResponses()
    async findPriority(
        @Query() query: QueryContactDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.findManyPriority(query, lang);
        return new GetResponse('contact.list_priority', result);
    }

    /**
     * Lấy danh sách tickets bình thường (is_priority_customer = false, is_skipped = false)
     */
    @Get('admin/contacts/normal')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.list')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Lấy danh sách tickets thường' })
    @ApiAuthResponses()
    async findNormal(
        @Query() query: QueryContactDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.findManyNormal(query, lang);
        return new GetResponse('contact.list_normal', result);
    }

    /**
     * Lấy danh sách tickets bị bỏ qua (is_skipped = true)
     */
    @Get('admin/contacts/skipped')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.list')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Lấy danh sách tickets bị bỏ qua (Spam/Skipped)' })
    @ApiAuthResponses()
    async findSkipped(
        @Query() query: QueryContactDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.findManySkipped(query, lang);
        return new GetResponse('contact.list_skipped', result);
    }

    /**
     * Lấy chi tiết ticket
     */
    @Get('admin/contacts/:id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.read')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Lấy chi tiết ticket' })
    @ApiParam({ name: 'id', description: 'ID ticket (UUID)' })
    @ApiAuthResponses()
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
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Lấy nội dung trao đổi của ticket' })
    @ApiParam({ name: 'id', description: 'ID ticket (UUID)' })
    @ApiAuthResponses()
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
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Cập nhật thông tin ticket',
        description: 'Cập nhật trạng thái, độ ưu tiên, gán nhân viên...'
    })
    @ApiParam({ name: 'id', description: 'ID ticket (UUID)' })
    @ApiBody({ type: UpdateContactDto })
    @ApiAuthResponses()
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
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Nhân viên trả lời ticket',
        description: 'Gửi email phản hồi cho khách hàng.'
    })
    @ApiParam({ name: 'id', description: 'ID ticket (UUID)' })
    @ApiBody({ type: ReplyContactDto })
    @ApiAuthResponses()
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
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Đóng ticket (Hoàn tất)' })
    @ApiParam({ name: 'id', description: 'ID ticket (UUID)' })
    @ApiAuthResponses()
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
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Mở lại ticket đã đóng' })
    @ApiParam({ name: 'id', description: 'ID ticket (UUID)' })
    @ApiAuthResponses()
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
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Xóa ticket (Soft delete)' })
    @ApiParam({ name: 'id', description: 'ID ticket (UUID)' })
    @ApiAuthResponses()
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
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Xóa nhiều tickets cùng lúc' })
    @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
    @ApiAuthResponses()
    async deleteMany(
        @Body('ids') ids: string[],
        @CurrentUser() user: { userId: string },
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.deleteMany(ids, user.userId, lang);
        return new DeletedResponse('contact.deleted_many', result);
    }
}

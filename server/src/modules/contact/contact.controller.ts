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
import {
    ApiAuthResponses,
    ApiUnauthorizedResponses,
    ApiValidationErrorResponse,
} from '../../common/decorators/api-common-responses.decorator';

@ApiTags('Contact & Live Chat')
@Controller()
export class ContactController {
    constructor(
        private readonly contactService: ContactService,
        private readonly userRepository: UserRepository,
    ) { }

    @Post('contact')
    @Public()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Gửi yêu cầu liên hệ (Public)',
        description: 'API dành cho form liên hệ công khai trên website. Khách vãng lai có thể gửi yêu cầu hỗ trợ hoặc liên hệ tư vấn.',
    })
    @ApiBody({
        type: CreateContactDto,
        description: 'Thông tin liên hệ từ khách hàng',
        examples: {
            contact_support: {
                summary: 'Yêu cầu hỗ trợ kỹ thuật',
                value: {
                    name: 'Nguyễn Văn A',
                    email: 'nguyenvana@example.com',
                    phone: '0901234567',
                    company: 'Công ty ABC',
                    subject: 'Hỗ trợ kỹ thuật',
                    message: 'Tôi cần hỗ trợ xử lý lỗi khi đăng nhập vào hệ thống.',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Gửi yêu cầu liên hệ thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'contact.created' },
                message: { type: 'string', example: 'Gửi yêu cầu thành công, chúng tôi sẽ phản hồi sớm nhất.' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440081' },
                        ticket_number: { type: 'string', example: 'TK-123456' },
                    },
                },
            },
        },
    })
    @ApiValidationErrorResponse()
    async createPublic(
        @Body() dto: CreateContactDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.createFromWebForm(dto, lang);
        return new CreatedResponse('contact.created', result, result.message);
    }

    @Post('contact/chat/start')
    @Public()
    @UseGuards(OptionalJwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Khởi tạo Live Chat (Public)',
        description: 'Bắt đầu một phiên live chat. Nếu đã đăng nhập thì hệ thống tự gắn user vào phiên chat; nếu là khách vãng lai thì cần truyền `session` hoặc `uid` để duy trì phiên.',
    })
    @ApiBody({
        type: StartChatDto,
        description: 'Dữ liệu khởi tạo phiên chat',
        examples: {
            guest_chat: {
                summary: 'Khởi tạo chat cho khách vãng lai',
                value: {
                    session: 'session-guest-001',
                    initialMessage: 'Xin chào, tôi cần tư vấn dịch vụ thuê kho.',
                },
            },
            logged_in_user: {
                summary: 'Khởi tạo chat cho user đã đăng nhập',
                value: {
                    initialMessage: 'Tôi muốn hỏi về giá thuê kho hiện tại.',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Khởi tạo phiên chat thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'contact.live_chat.session_created' },
                message: { type: 'string', example: 'Đã tạo phiên chat' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        session_id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440082' },
                        code: { type: 'string', example: 'TK-123456' },
                    },
                },
            },
        },
    })
    @ApiValidationErrorResponse()
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

    @Post('contact/chat/:sessionId/message')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Guest gửi tin nhắn (Public)',
        description: 'Khách gửi tin nhắn trong một phiên chat đã được khởi tạo trước đó.',
    })
    @ApiParam({ name: 'sessionId', description: 'ID phiên chat', example: '550e8400-e29b-41d4-a716-446655440082' })
    @ApiBody({
        type: SendMessageDto,
        description: 'Nội dung tin nhắn khách gửi',
        examples: {
            text_message: {
                summary: 'Tin nhắn văn bản',
                value: {
                    content: 'Xin chào, tôi cần giúp đỡ về hợp đồng thuê kho.',
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Gửi tin nhắn thành công' })
    @ApiValidationErrorResponse()
    async sendGuestMessage(
        @Param('sessionId') sessionId: string,
        @Body() dto: SendMessageDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.sendGuestMessage(sessionId, dto, lang);
        return new OkResponse('contact.live_chat.message_sent', result);
    }

    @Get('contact/chat/:sessionId')
    @Public()
    @ApiOperation({
        summary: 'Lấy nội dung đoạn chat (Public)',
        description: 'Lấy lịch sử tin nhắn của một phiên chat cho khách hoặc người dùng đang theo dõi cuộc trò chuyện.',
    })
    @ApiParam({ name: 'sessionId', description: 'ID phiên chat', example: '550e8400-e29b-41d4-a716-446655440082' })
    @ApiResponse({ status: 200, description: 'Lấy nội dung đoạn chat thành công' })
    async getChatSession(
        @Param('sessionId') sessionId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.getChatSession(sessionId, lang);
        return new GetResponse('contact.live_chat.session', result);
    }

    @Get('contact/chat/history')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Lấy lịch sử live chat của user',
        description: 'Trả về danh sách các phiên live chat của người dùng hiện tại. Endpoint này chỉ yêu cầu xác thực tài khoản.',
    })
    @ApiUnauthorizedResponses()
    @ApiResponse({ status: 200, description: 'Lấy lịch sử live chat thành công' })
    async getChatHistory(@CurrentUser() user: { userId: string }) {
        const result = await this.contactService.getChatHistoryByUserId(user.userId);
        return new GetResponse('contact.live_chat.history', result);
    }

    @Get('admin/contacts')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.list')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Lấy danh sách tickets (Admin)',
        description: 'Lấy danh sách yêu cầu liên hệ với đầy đủ bộ lọc phân trang, từ khóa, trạng thái, ưu tiên và nhân viên phụ trách. Yêu cầu quyền `contact.list`.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Số lượng ticket tối đa trên một trang' })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0, description: 'Vị trí bắt đầu của trang hiện tại' })
    @ApiQuery({ name: 'keywords', required: false, type: String, example: 'đăng nhập', description: 'Từ khóa tìm kiếm theo mã ticket, tên, email hoặc nội dung' })
    @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED', 'SPAM'], description: 'Lọc theo trạng thái ticket' })
    @ApiQuery({ name: 'priority', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], description: 'Lọc theo mức độ ưu tiên' })
    @ApiQuery({ name: 'assigned_staff_id', required: false, type: String, example: '550e8400-e29b-41d4-a716-446655440088', description: 'Lọc theo nhân viên được gán xử lý' })
    @ApiQuery({ name: 'is_priority_customer', required: false, type: Boolean, description: 'Lọc theo khách hàng ưu tiên' })
    @ApiQuery({ name: 'is_skipped', required: false, type: Boolean, description: 'Lọc theo ticket bị bỏ qua/spam' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách tickets thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async findAll(
        @Query() query: QueryContactDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.findMany(query, lang);
        return new GetResponse('contact.list', result);
    }

    @Get('admin/contacts/priority')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.list')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Lấy danh sách tickets ưu tiên',
        description: 'Lấy danh sách ticket của nhóm khách hàng ưu tiên. Yêu cầu quyền `contact.list`.',
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async findPriority(
        @Query() query: QueryContactDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.findManyPriority(query, lang);
        return new GetResponse('contact.list_priority', result);
    }

    @Get('admin/contacts/normal')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.list')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Lấy danh sách tickets thường',
        description: 'Lấy danh sách ticket không thuộc nhóm ưu tiên và chưa bị bỏ qua. Yêu cầu quyền `contact.list`.',
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async findNormal(
        @Query() query: QueryContactDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.findManyNormal(query, lang);
        return new GetResponse('contact.list_normal', result);
    }

    @Get('admin/contacts/skipped')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.list')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Lấy danh sách tickets bị bỏ qua (Spam/Skipped)',
        description: 'Lấy danh sách ticket đã bị đánh dấu bỏ qua hoặc spam. Yêu cầu quyền `contact.list`.',
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async findSkipped(
        @Query() query: QueryContactDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.findManySkipped(query, lang);
        return new GetResponse('contact.list_skipped', result);
    }

    @Get('admin/contacts/:id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.read')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Lấy chi tiết ticket',
        description: 'Lấy thông tin chi tiết của một ticket theo ID. Yêu cầu quyền `contact.read`.',
    })
    @ApiParam({ name: 'id', description: 'ID ticket', example: '550e8400-e29b-41d4-a716-446655440081' })
    @ApiResponse({ status: 200, description: 'Lấy chi tiết ticket thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy ticket' })
    @ApiAuthResponses()
    async findOne(
        @Param('id') id: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.findById(id, lang);
        return new GetResponse('contact.read', result);
    }

    @Get('admin/contacts/:id/messages')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.read')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Lấy nội dung trao đổi của ticket',
        description: 'Lấy toàn bộ nội dung trao đổi của ticket, bao gồm phản hồi của nhân viên và tin nhắn từ khách hàng. Yêu cầu quyền `contact.read`.',
    })
    @ApiParam({ name: 'id', description: 'ID ticket', example: '550e8400-e29b-41d4-a716-446655440081' })
    @ApiResponse({ status: 200, description: 'Lấy nội dung trao đổi của ticket thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy ticket hoặc lịch sử trao đổi' })
    @ApiAuthResponses()
    async findMessages(
        @Param('id') id: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.findMessages(id, lang);
        return new GetResponse('contact.messages', result);
    }

    @Patch('admin/contacts/:id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.update')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Cập nhật thông tin ticket',
        description: 'Cập nhật trạng thái, độ ưu tiên, tags, nhân viên phụ trách hoặc cài đặt AI trả lời cho ticket. Yêu cầu quyền `contact.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID ticket', example: '550e8400-e29b-41d4-a716-446655440081' })
    @ApiBody({
        type: UpdateContactDto,
        description: 'Dữ liệu cập nhật ticket',
        examples: {
            update_status: {
                summary: 'Cập nhật trạng thái và mức ưu tiên',
                value: {
                    status: 'PENDING',
                    priority: 'HIGH',
                },
            },
            assign_staff: {
                summary: 'Gán nhân viên và tag',
                value: {
                    staff_ids: ['550e8400-e29b-41d4-a716-446655440088'],
                    tags: ['550e8400-e29b-41d4-a716-446655440089'],
                    enable_ai_reply: false,
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Cập nhật ticket thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy ticket' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateContactDto,
        @CurrentUser() user: { userId: string; name?: string },
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.update(id, dto, user.userId, user.name || 'Admin', lang);
        return new UpdatedResponse('contact.updated', result);
    }

    @Post('admin/contacts/:id/reply')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.reply')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Nhân viên trả lời ticket',
        description: 'Gửi phản hồi cho khách hàng hoặc tạo ghi chú nội bộ trong ticket. Yêu cầu quyền `contact.reply`.',
    })
    @ApiParam({ name: 'id', description: 'ID ticket', example: '550e8400-e29b-41d4-a716-446655440081' })
    @ApiBody({
        type: ReplyContactDto,
        description: 'Nội dung phản hồi ticket',
        examples: {
            public_reply: {
                summary: 'Phản hồi gửi ra ngoài',
                value: {
                    content: 'Chúng tôi đã tiếp nhận yêu cầu và sẽ phản hồi thêm trong hôm nay.',
                    is_internal: false,
                },
            },
            internal_note: {
                summary: 'Ghi chú nội bộ',
                value: {
                    content: 'Khách hàng đã được gọi xác nhận thông tin bổ sung.',
                    is_internal: true,
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Phản hồi ticket thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy ticket để phản hồi' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async reply(
        @Param('id') id: string,
        @Body() dto: ReplyContactDto,
        @CurrentUser() user: { userId: string; name?: string; email?: string },
        @I18nLang() lang: string,
    ) {
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

    @Post('admin/contacts/:id/close')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.update')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Đóng ticket (Hoàn tất)',
        description: 'Đóng ticket khi quá trình hỗ trợ đã hoàn tất. Yêu cầu quyền `contact.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID ticket', example: '550e8400-e29b-41d4-a716-446655440081' })
    @ApiResponse({ status: 200, description: 'Đóng ticket thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy ticket' })
    @ApiResponse({ status: 409, description: 'Ticket không ở trạng thái có thể đóng' })
    @ApiAuthResponses()
    async close(
        @Param('id') id: string,
        @CurrentUser() user: { userId: string },
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.close(id, user.userId, lang);
        return new OkResponse('contact.closed', null, result.message);
    }

    @Post('admin/contacts/:id/reopen')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.update')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Mở lại ticket đã đóng',
        description: 'Mở lại ticket đã đóng để tiếp tục xử lý. Yêu cầu quyền `contact.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID ticket', example: '550e8400-e29b-41d4-a716-446655440081' })
    @ApiResponse({ status: 200, description: 'Mở lại ticket thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy ticket' })
    @ApiResponse({ status: 409, description: 'Ticket không ở trạng thái có thể mở lại' })
    @ApiAuthResponses()
    async reopen(
        @Param('id') id: string,
        @CurrentUser() user: { userId: string },
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.reopen(id, user.userId, lang);
        return new OkResponse('contact.reopened', null, result.message);
    }

    @Delete('admin/contacts/:id')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.delete')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Xóa ticket (Soft delete)',
        description: 'Xóa mềm một ticket theo ID. Yêu cầu quyền `contact.delete`.',
    })
    @ApiParam({ name: 'id', description: 'ID ticket', example: '550e8400-e29b-41d4-a716-446655440081' })
    @ApiResponse({ status: 200, description: 'Xóa ticket thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy ticket' })
    @ApiAuthResponses()
    async delete(
        @Param('id') id: string,
        @CurrentUser() user: { userId: string },
        @I18nLang() lang: string,
    ) {
        await this.contactService.delete(id, user.userId, lang);
        return new DeletedResponse('contact.deleted');
    }

    @Delete('admin/contacts/delete/many')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.delete')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Xóa nhiều tickets cùng lúc',
        description: 'Xóa mềm nhiều ticket theo danh sách ID. Yêu cầu quyền `contact.delete`.',
    })
    @ApiBody({
        schema: {
            type: 'object',
            properties: {
                ids: {
                    type: 'array',
                    items: { type: 'string', format: 'uuid' },
                },
            },
            example: {
                ids: [
                    '550e8400-e29b-41d4-a716-446655440081',
                    '550e8400-e29b-41d4-a716-446655440082',
                ],
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Xóa nhiều ticket thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async deleteMany(
        @Body('ids') ids: string[],
        @CurrentUser() user: { userId: string },
        @I18nLang() lang: string,
    ) {
        const result = await this.contactService.deleteMany(ids, user.userId, lang);
        return new DeletedResponse('contact.deleted_many', result);
    }
}

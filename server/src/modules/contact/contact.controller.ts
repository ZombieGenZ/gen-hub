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
import {
    buildErrorResponseSchema,
    buildPaginationDataSchema,
    buildSuccessResponseSchema,
} from '../../common/swagger/swagger-response.helper';

@ApiTags('Contact & Live Chat')
@Controller()
export class ContactController {
    constructor(
        private readonly contactService: ContactService,
        private readonly userRepository: UserRepository,
    ) { }

    private static readonly ticketSchema = {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440081' },
            ticket_number: { type: 'string', example: 'TK-123456' },
            subject: { type: 'string', example: 'Há»— trá»£ ká»¹ thuáº­t' },
            status: { type: 'string', example: 'OPEN' },
            priority: { type: 'string', example: 'HIGH' },
            customer_name: { type: 'string', example: 'Nguyá»…n VÄƒn A' },
            customer_email: { type: 'string', example: 'nguyenvana@example.com' },
            enable_ai_reply: { type: 'boolean', example: false },
            created_at: { type: 'string', format: 'date-time', example: '2026-03-13T09:30:00.000Z' },
            updated_at: { type: 'string', format: 'date-time', example: '2026-03-13T10:00:00.000Z' },
        },
    };

    private static readonly messageSchema = {
        type: 'object',
        properties: {
            id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440091' },
            content: { type: 'string', example: 'ChĂºng tĂ´i Ä‘Ă£ tiáº¿p nháº­n yĂªu cáº§u vĂ  sáº½ pháº£n há»“i thĂªm trong hĂ´m nay.' },
            sender_type: { type: 'string', example: 'STAFF' },
            is_internal: { type: 'boolean', example: false },
            created_at: { type: 'string', format: 'date-time', example: '2026-03-13T10:05:00.000Z' },
        },
    };

    @Post('contact')
    @Public()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({
        summary: 'Gá»­i yĂªu cáº§u liĂªn há»‡ (Public)',
        description: 'API dĂ nh cho form liĂªn há»‡ cĂ´ng khai trĂªn website. KhĂ¡ch vĂ£ng lai cĂ³ thá»ƒ gá»­i yĂªu cáº§u há»— trá»£ hoáº·c liĂªn há»‡ tÆ° váº¥n.',
    })
    @ApiBody({
        type: CreateContactDto,
        description: 'ThĂ´ng tin liĂªn há»‡ tá»« khĂ¡ch hĂ ng',
        examples: {
            contact_support: {
                summary: 'YĂªu cáº§u há»— trá»£ ká»¹ thuáº­t',
                value: {
                    name: 'Nguyá»…n VÄƒn A',
                    email: 'nguyenvana@example.com',
                    phone: '0901234567',
                    company: 'CĂ´ng ty ABC',
                    subject: 'Há»— trá»£ ká»¹ thuáº­t',
                    message: 'TĂ´i cáº§n há»— trá»£ xá»­ lĂ½ lá»—i khi Ä‘Äƒng nháº­p vĂ o há»‡ thá»‘ng.',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Gá»­i yĂªu cáº§u liĂªn há»‡ thĂ nh cĂ´ng',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'contact.created' },
                message: { type: 'string', example: 'Gá»­i yĂªu cáº§u thĂ nh cĂ´ng, chĂºng tĂ´i sáº½ pháº£n há»“i sá»›m nháº¥t.' },
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
        summary: 'Khá»Ÿi táº¡o Live Chat (Public)',
        description: 'Báº¯t Ä‘áº§u má»™t phiĂªn live chat. Náº¿u Ä‘Ă£ Ä‘Äƒng nháº­p thĂ¬ há»‡ thá»‘ng tá»± gáº¯n user vĂ o phiĂªn chat; náº¿u lĂ  khĂ¡ch vĂ£ng lai thĂ¬ cáº§n truyá»n `session` hoáº·c `uid` Ä‘á»ƒ duy trĂ¬ phiĂªn.',
    })
    @ApiBody({
        type: StartChatDto,
        description: 'Dá»¯ liá»‡u khá»Ÿi táº¡o phiĂªn chat',
        examples: {
            guest_chat: {
                summary: 'Khá»Ÿi táº¡o chat cho khĂ¡ch vĂ£ng lai',
                value: {
                    session: 'session-guest-001',
                    initialMessage: 'Xin chĂ o, tĂ´i cáº§n tÆ° váº¥n dá»‹ch vá»¥ thuĂª kho.',
                },
            },
            logged_in_user: {
                summary: 'Khá»Ÿi táº¡o chat cho user Ä‘Ă£ Ä‘Äƒng nháº­p',
                value: {
                    initialMessage: 'TĂ´i muá»‘n há»i vá» giĂ¡ thuĂª kho hiá»‡n táº¡i.',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Khá»Ÿi táº¡o phiĂªn chat thĂ nh cĂ´ng',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'contact.live_chat.session_created' },
                message: { type: 'string', example: 'ÄĂ£ táº¡o phiĂªn chat' },
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
        summary: 'Guest gá»­i tin nháº¯n (Public)',
        description: 'KhĂ¡ch gá»­i tin nháº¯n trong má»™t phiĂªn chat Ä‘Ă£ Ä‘Æ°á»£c khá»Ÿi táº¡o trÆ°á»›c Ä‘Ă³.',
    })
    @ApiParam({ name: 'sessionId', description: 'ID phiĂªn chat', example: '550e8400-e29b-41d4-a716-446655440082' })
    @ApiBody({
        type: SendMessageDto,
        description: 'Ná»™i dung tin nháº¯n khĂ¡ch gá»­i',
        examples: {
            text_message: {
                summary: 'Tin nháº¯n vÄƒn báº£n',
                value: {
                    content: 'Xin chĂ o, tĂ´i cáº§n giĂºp Ä‘á»¡ vá» há»£p Ä‘á»“ng thuĂª kho.',
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Gửi tin nhắn thành công',
        schema: buildSuccessResponseSchema({
            code: 'contact.live_chat.message_sent',
            message: 'Gửi tin nhắn thành công',
            dataSchema: ContactController.messageSchema,
            dataExample: {
                id: '550e8400-e29b-41d4-a716-446655440091',
                content: 'Xin chào, tôi cần giúp đỡ về hợp đồng thuê kho.',
                sender_type: 'GUEST',
                is_internal: false,
                created_at: '2026-03-13T10:05:00.000Z',
            },
        }),
    })
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
        summary: 'Láº¥y ná»™i dung Ä‘oáº¡n chat (Public)',
        description: 'Láº¥y lá»‹ch sá»­ tin nháº¯n cá»§a má»™t phiĂªn chat cho khĂ¡ch hoáº·c ngÆ°á»i dĂ¹ng Ä‘ang theo dĂµi cuá»™c trĂ² chuyá»‡n.',
    })
    @ApiParam({ name: 'sessionId', description: 'ID phiĂªn chat', example: '550e8400-e29b-41d4-a716-446655440082' })
    @ApiResponse({
        status: 200,
        description: 'Lấy nội dung đoạn chat thành công',
        schema: buildSuccessResponseSchema({
            code: 'contact.live_chat.session',
            message: 'Lấy nội dung đoạn chat thành công',
            dataSchema: {
                type: 'object',
                properties: {
                    session_id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440082' },
                    messages: { type: 'array', items: ContactController.messageSchema },
                },
            },
            dataExample: {
                session_id: '550e8400-e29b-41d4-a716-446655440082',
                messages: [{ id: '550e8400-e29b-41d4-a716-446655440091', content: 'Chúng tôi đã tiếp nhận yêu cầu và sẽ phản hồi thêm trong hôm nay.', sender_type: 'STAFF', is_internal: false, created_at: '2026-03-13T10:05:00.000Z' }],
            },
        }),
    })
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
        summary: 'Láº¥y lá»‹ch sá»­ live chat cá»§a user',
        description: 'Tráº£ vá» danh sĂ¡ch cĂ¡c phiĂªn live chat cá»§a ngÆ°á»i dĂ¹ng hiá»‡n táº¡i. Endpoint nĂ y chá»‰ yĂªu cáº§u xĂ¡c thá»±c tĂ i khoáº£n.',
    })
    @ApiUnauthorizedResponses()
    @ApiResponse({
        status: 200,
        description: 'Lấy lịch sử live chat thành công',
        schema: buildSuccessResponseSchema({
            code: 'contact.live_chat.history',
            message: 'Lấy lịch sử live chat thành công',
            dataSchema: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: {
                        session_id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440082' },
                        code: { type: 'string', example: 'TK-123456' },
                        last_message: { type: 'string', example: 'Tôi muốn hỏi về giá thuê kho hiện tại.' },
                        updated_at: { type: 'string', format: 'date-time', example: '2026-03-13T10:05:00.000Z' },
                    },
                },
            },
            dataExample: [{ session_id: '550e8400-e29b-41d4-a716-446655440082', code: 'TK-123456', last_message: 'Tôi muốn hỏi về giá thuê kho hiện tại.', updated_at: '2026-03-13T10:05:00.000Z' }],
        }),
    })
    async getChatHistory(@CurrentUser() user: { userId: string }) {
        const result = await this.contactService.getChatHistoryByUserId(user.userId);
        return new GetResponse('contact.live_chat.history', result);
    }

    @Get('admin/contacts')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact.list')
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Láº¥y danh sĂ¡ch tickets (Admin)',
        description: 'Láº¥y danh sĂ¡ch yĂªu cáº§u liĂªn há»‡ vá»›i Ä‘áº§y Ä‘á»§ bá»™ lá»c phĂ¢n trang, tá»« khĂ³a, tráº¡ng thĂ¡i, Æ°u tiĂªn vĂ  nhĂ¢n viĂªn phá»¥ trĂ¡ch. YĂªu cáº§u quyá»n `contact.list`.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Sá»‘ lÆ°á»£ng ticket tá»‘i Ä‘a trĂªn má»™t trang' })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0, description: 'Vá»‹ trĂ­ báº¯t Ä‘áº§u cá»§a trang hiá»‡n táº¡i' })
    @ApiQuery({ name: 'keywords', required: false, type: String, example: 'Ä‘Äƒng nháº­p', description: 'Tá»« khĂ³a tĂ¬m kiáº¿m theo mĂ£ ticket, tĂªn, email hoáº·c ná»™i dung' })
    @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED', 'SPAM'], description: 'Lá»c theo tráº¡ng thĂ¡i ticket' })
    @ApiQuery({ name: 'priority', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], description: 'Lá»c theo má»©c Ä‘á»™ Æ°u tiĂªn' })
    @ApiQuery({ name: 'assigned_staff_id', required: false, type: String, example: '550e8400-e29b-41d4-a716-446655440088', description: 'Lá»c theo nhĂ¢n viĂªn Ä‘Æ°á»£c gĂ¡n xá»­ lĂ½' })
    @ApiQuery({ name: 'is_priority_customer', required: false, type: Boolean, description: 'Lá»c theo khĂ¡ch hĂ ng Æ°u tiĂªn' })
    @ApiQuery({ name: 'is_skipped', required: false, type: Boolean, description: 'Lá»c theo ticket bá»‹ bá» qua/spam' })
    @ApiResponse({
        status: 200,
        description: 'Láº¥y danh sĂ¡ch tickets thĂ nh cĂ´ng',
        schema: buildSuccessResponseSchema({
            code: 'contact.list',
            message: 'Láº¥y danh sĂ¡ch tickets thĂ nh cĂ´ng',
            dataSchema: buildPaginationDataSchema(ContactController.ticketSchema),
            dataExample: {
                items: [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440081',
                        ticket_number: 'TK-123456',
                        subject: 'Há»— trá»£ ká»¹ thuáº­t',
                        status: 'OPEN',
                        priority: 'HIGH',
                        customer_name: 'Nguyá»…n VÄƒn A',
                        customer_email: 'nguyenvana@example.com',
                        enable_ai_reply: false,
                        created_at: '2026-03-13T09:30:00.000Z',
                        updated_at: '2026-03-13T10:00:00.000Z',
                    },
                ],
                total: 1,
                limit: 10,
                offset: 0,
                hasMore: false,
            },
        }),
    })
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
        summary: 'Láº¥y danh sĂ¡ch tickets Æ°u tiĂªn',
        description: 'Láº¥y danh sĂ¡ch ticket cá»§a nhĂ³m khĂ¡ch hĂ ng Æ°u tiĂªn. YĂªu cáº§u quyá»n `contact.list`.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Số lượng ticket tối đa trên một trang' })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0, description: 'Vị trí bắt đầu của trang hiện tại' })
    @ApiQuery({ name: 'keywords', required: false, type: String, example: 'đăng nhập', description: 'Từ khóa tìm kiếm theo mã ticket, tên, email hoặc nội dung' })
    @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED', 'SPAM'], description: 'Lọc theo trạng thái ticket' })
    @ApiQuery({ name: 'priority', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], description: 'Lọc theo mức độ ưu tiên' })
    @ApiQuery({ name: 'assigned_staff_id', required: false, type: String, example: '550e8400-e29b-41d4-a716-446655440088', description: 'Lọc theo nhân viên được gán xử lý' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách tickets ưu tiên thành công',
        schema: buildSuccessResponseSchema({
            code: 'contact.list_priority',
            message: 'Lấy danh sách tickets ưu tiên thành công',
            dataSchema: buildPaginationDataSchema(ContactController.ticketSchema),
            dataExample: {
                items: [{ id: '550e8400-e29b-41d4-a716-446655440081', ticket_number: 'TK-123456', subject: 'Hỗ trợ kỹ thuật', status: 'OPEN', priority: 'HIGH', customer_name: 'Nguyễn Văn A', customer_email: 'nguyenvana@example.com', enable_ai_reply: false, created_at: '2026-03-13T09:30:00.000Z', updated_at: '2026-03-13T10:00:00.000Z' }],
                total: 1, limit: 10, offset: 0, hasMore: false,
            },
        }),
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
        summary: 'Láº¥y danh sĂ¡ch tickets thÆ°á»ng',
        description: 'Láº¥y danh sĂ¡ch ticket khĂ´ng thuá»™c nhĂ³m Æ°u tiĂªn vĂ  chÆ°a bá»‹ bá» qua. YĂªu cáº§u quyá»n `contact.list`.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Số lượng ticket tối đa trên một trang' })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0, description: 'Vị trí bắt đầu của trang hiện tại' })
    @ApiQuery({ name: 'keywords', required: false, type: String, example: 'đăng nhập', description: 'Từ khóa tìm kiếm theo mã ticket, tên, email hoặc nội dung' })
    @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED', 'SPAM'], description: 'Lọc theo trạng thái ticket' })
    @ApiQuery({ name: 'priority', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], description: 'Lọc theo mức độ ưu tiên' })
    @ApiQuery({ name: 'assigned_staff_id', required: false, type: String, example: '550e8400-e29b-41d4-a716-446655440088', description: 'Lọc theo nhân viên được gán xử lý' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách tickets thường thành công',
        schema: buildSuccessResponseSchema({
            code: 'contact.list_normal',
            message: 'Lấy danh sách tickets thường thành công',
            dataSchema: buildPaginationDataSchema(ContactController.ticketSchema),
            dataExample: {
                items: [{ id: '550e8400-e29b-41d4-a716-446655440081', ticket_number: 'TK-123456', subject: 'Tư vấn thuê kho', status: 'OPEN', priority: 'MEDIUM', customer_name: 'Nguyễn Văn A', customer_email: 'nguyenvana@example.com', enable_ai_reply: false, created_at: '2026-03-13T09:30:00.000Z', updated_at: '2026-03-13T10:00:00.000Z' }],
                total: 1, limit: 10, offset: 0, hasMore: false,
            },
        }),
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
        summary: 'Láº¥y danh sĂ¡ch tickets bá»‹ bá» qua (Spam/Skipped)',
        description: 'Láº¥y danh sĂ¡ch ticket Ä‘Ă£ bá»‹ Ä‘Ă¡nh dáº¥u bá» qua hoáº·c spam. YĂªu cáº§u quyá»n `contact.list`.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 10, description: 'Số lượng ticket tối đa trên một trang' })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0, description: 'Vị trí bắt đầu của trang hiện tại' })
    @ApiQuery({ name: 'keywords', required: false, type: String, example: 'đăng nhập', description: 'Từ khóa tìm kiếm theo mã ticket, tên, email hoặc nội dung' })
    @ApiQuery({ name: 'status', required: false, enum: ['OPEN', 'PENDING', 'RESOLVED', 'CLOSED', 'SPAM'], description: 'Lọc theo trạng thái ticket' })
    @ApiQuery({ name: 'priority', required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], description: 'Lọc theo mức độ ưu tiên' })
    @ApiQuery({ name: 'assigned_staff_id', required: false, type: String, example: '550e8400-e29b-41d4-a716-446655440088', description: 'Lọc theo nhân viên được gán xử lý' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách tickets bị bỏ qua thành công',
        schema: buildSuccessResponseSchema({
            code: 'contact.list_skipped',
            message: 'Lấy danh sách tickets bị bỏ qua thành công',
            dataSchema: buildPaginationDataSchema(ContactController.ticketSchema),
            dataExample: {
                items: [{ id: '550e8400-e29b-41d4-a716-446655440081', ticket_number: 'TK-123456', subject: 'Nội dung spam', status: 'SPAM', priority: 'LOW', customer_name: 'Nguyễn Văn A', customer_email: 'nguyenvana@example.com', enable_ai_reply: false, created_at: '2026-03-13T09:30:00.000Z', updated_at: '2026-03-13T10:00:00.000Z' }],
                total: 1, limit: 10, offset: 0, hasMore: false,
            },
        }),
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
        summary: 'Láº¥y chi tiáº¿t ticket',
        description: 'Láº¥y thĂ´ng tin chi tiáº¿t cá»§a má»™t ticket theo ID. YĂªu cáº§u quyá»n `contact.read`.',
    })
    @ApiParam({ name: 'id', description: 'ID ticket', example: '550e8400-e29b-41d4-a716-446655440081' })
    @ApiResponse({
        status: 200,
        description: 'Láº¥y chi tiáº¿t ticket thĂ nh cĂ´ng',
        schema: buildSuccessResponseSchema({
            code: 'contact.read',
            message: 'Láº¥y chi tiáº¿t ticket thĂ nh cĂ´ng',
            dataSchema: ContactController.ticketSchema,
            dataExample: {
                id: '550e8400-e29b-41d4-a716-446655440081',
                ticket_number: 'TK-123456',
                subject: 'Há»— trá»£ ká»¹ thuáº­t',
                status: 'OPEN',
                priority: 'HIGH',
                customer_name: 'Nguyá»…n VÄƒn A',
                customer_email: 'nguyenvana@example.com',
                enable_ai_reply: false,
                created_at: '2026-03-13T09:30:00.000Z',
                updated_at: '2026-03-13T10:00:00.000Z',
            },
        }),
    })
    @ApiResponse({
        status: 404,
        description: 'KhĂ´ng tĂ¬m tháº¥y ticket',
        schema: buildErrorResponseSchema({
            code: 'contact.not_found',
            message: 'KhĂ´ng tĂ¬m tháº¥y ticket',
        }),
    })
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
        summary: 'Láº¥y ná»™i dung trao Ä‘á»•i cá»§a ticket',
        description: 'Láº¥y toĂ n bá»™ ná»™i dung trao Ä‘á»•i cá»§a ticket, bao gá»“m pháº£n há»“i cá»§a nhĂ¢n viĂªn vĂ  tin nháº¯n tá»« khĂ¡ch hĂ ng. YĂªu cáº§u quyá»n `contact.read`.',
    })
    @ApiParam({ name: 'id', description: 'ID ticket', example: '550e8400-e29b-41d4-a716-446655440081' })
    @ApiResponse({
        status: 200,
        description: 'Láº¥y ná»™i dung trao Ä‘á»•i cá»§a ticket thĂ nh cĂ´ng',
        schema: buildSuccessResponseSchema({
            code: 'contact.messages',
            message: 'Láº¥y ná»™i dung trao Ä‘á»•i cá»§a ticket thĂ nh cĂ´ng',
            dataSchema: {
                type: 'array',
                items: ContactController.messageSchema,
            },
            dataExample: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440091',
                    content: 'ChĂºng tĂ´i Ä‘Ă£ tiáº¿p nháº­n yĂªu cáº§u vĂ  sáº½ pháº£n há»“i thĂªm trong hĂ´m nay.',
                    sender_type: 'STAFF',
                    is_internal: false,
                    created_at: '2026-03-13T10:05:00.000Z',
                },
            ],
        }),
    })
    @ApiResponse({
        status: 404,
        description: 'KhĂ´ng tĂ¬m tháº¥y ticket hoáº·c lá»‹ch sá»­ trao Ä‘á»•i',
        schema: buildErrorResponseSchema({
            code: 'contact.messages_not_found',
            message: 'KhĂ´ng tĂ¬m tháº¥y ticket hoáº·c lá»‹ch sá»­ trao Ä‘á»•i',
        }),
    })
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
        summary: 'Cáº­p nháº­t thĂ´ng tin ticket',
        description: 'Cáº­p nháº­t tráº¡ng thĂ¡i, Ä‘á»™ Æ°u tiĂªn, tags, nhĂ¢n viĂªn phá»¥ trĂ¡ch hoáº·c cĂ i Ä‘áº·t AI tráº£ lá»i cho ticket. YĂªu cáº§u quyá»n `contact.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID ticket', example: '550e8400-e29b-41d4-a716-446655440081' })
    @ApiBody({
        type: UpdateContactDto,
        description: 'Dá»¯ liá»‡u cáº­p nháº­t ticket',
        examples: {
            update_status: {
                summary: 'Cáº­p nháº­t tráº¡ng thĂ¡i vĂ  má»©c Æ°u tiĂªn',
                value: {
                    status: 'PENDING',
                    priority: 'HIGH',
                },
            },
            assign_staff: {
                summary: 'GĂ¡n nhĂ¢n viĂªn vĂ  tag',
                value: {
                    staff_ids: ['550e8400-e29b-41d4-a716-446655440088'],
                    tags: ['550e8400-e29b-41d4-a716-446655440089'],
                    enable_ai_reply: false,
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Cáº­p nháº­t ticket thĂ nh cĂ´ng',
        schema: buildSuccessResponseSchema({
            code: 'contact.updated',
            message: 'Cáº­p nháº­t ticket thĂ nh cĂ´ng',
            dataSchema: ContactController.ticketSchema,
            dataExample: {
                id: '550e8400-e29b-41d4-a716-446655440081',
                ticket_number: 'TK-123456',
                subject: 'Há»— trá»£ ká»¹ thuáº­t',
                status: 'PENDING',
                priority: 'HIGH',
                customer_name: 'Nguyá»…n VÄƒn A',
                customer_email: 'nguyenvana@example.com',
                enable_ai_reply: false,
                created_at: '2026-03-13T09:30:00.000Z',
                updated_at: '2026-03-13T10:00:00.000Z',
            },
        }),
    })
    @ApiResponse({
        status: 404,
        description: 'KhĂ´ng tĂ¬m tháº¥y ticket',
        schema: buildErrorResponseSchema({
            code: 'contact.not_found',
            message: 'KhĂ´ng tĂ¬m tháº¥y ticket',
        }),
    })
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
        summary: 'NhĂ¢n viĂªn tráº£ lá»i ticket',
        description: 'Gá»­i pháº£n há»“i cho khĂ¡ch hĂ ng hoáº·c táº¡o ghi chĂº ná»™i bá»™ trong ticket. YĂªu cáº§u quyá»n `contact.reply`.',
    })
    @ApiParam({ name: 'id', description: 'ID ticket', example: '550e8400-e29b-41d4-a716-446655440081' })
    @ApiBody({
        type: ReplyContactDto,
        description: 'Ná»™i dung pháº£n há»“i ticket',
        examples: {
            public_reply: {
                summary: 'Pháº£n há»“i gá»­i ra ngoĂ i',
                value: {
                    content: 'ChĂºng tĂ´i Ä‘Ă£ tiáº¿p nháº­n yĂªu cáº§u vĂ  sáº½ pháº£n há»“i thĂªm trong hĂ´m nay.',
                    is_internal: false,
                },
            },
            internal_note: {
                summary: 'Ghi chĂº ná»™i bá»™',
                value: {
                    content: 'KhĂ¡ch hĂ ng Ä‘Ă£ Ä‘Æ°á»£c gá»i xĂ¡c nháº­n thĂ´ng tin bá»• sung.',
                    is_internal: true,
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Pháº£n há»“i ticket thĂ nh cĂ´ng',
        schema: buildSuccessResponseSchema({
            code: 'contact.replied',
            message: 'Pháº£n há»“i ticket thĂ nh cĂ´ng',
        }),
    })
    @ApiResponse({
        status: 404,
        description: 'KhĂ´ng tĂ¬m tháº¥y ticket Ä‘á»ƒ pháº£n há»“i',
        schema: buildErrorResponseSchema({
            code: 'contact.not_found',
            message: 'KhĂ´ng tĂ¬m tháº¥y ticket Ä‘á»ƒ pháº£n há»“i',
        }),
    })
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
        summary: 'ÄĂ³ng ticket (HoĂ n táº¥t)',
        description: 'ÄĂ³ng ticket khi quĂ¡ trĂ¬nh há»— trá»£ Ä‘Ă£ hoĂ n táº¥t. YĂªu cáº§u quyá»n `contact.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID ticket', example: '550e8400-e29b-41d4-a716-446655440081' })
    @ApiResponse({
        status: 200,
        description: 'ÄĂ³ng ticket thĂ nh cĂ´ng',
        schema: buildSuccessResponseSchema({
            code: 'contact.closed',
            message: 'ÄĂ³ng ticket thĂ nh cĂ´ng',
        }),
    })
    @ApiResponse({
        status: 404,
        description: 'KhĂ´ng tĂ¬m tháº¥y ticket',
        schema: buildErrorResponseSchema({
            code: 'contact.not_found',
            message: 'KhĂ´ng tĂ¬m tháº¥y ticket',
        }),
    })
    @ApiResponse({
        status: 409,
        description: 'Ticket khĂ´ng á»Ÿ tráº¡ng thĂ¡i cĂ³ thá»ƒ Ä‘Ă³ng',
        schema: buildErrorResponseSchema({
            code: 'contact.invalid_close_status',
            message: 'Ticket khĂ´ng á»Ÿ tráº¡ng thĂ¡i cĂ³ thá»ƒ Ä‘Ă³ng',
        }),
    })
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
        summary: 'Má»Ÿ láº¡i ticket Ä‘Ă£ Ä‘Ă³ng',
        description: 'Má»Ÿ láº¡i ticket Ä‘Ă£ Ä‘Ă³ng Ä‘á»ƒ tiáº¿p tá»¥c xá»­ lĂ½. YĂªu cáº§u quyá»n `contact.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID ticket', example: '550e8400-e29b-41d4-a716-446655440081' })
    @ApiResponse({
        status: 200,
        description: 'Má»Ÿ láº¡i ticket thĂ nh cĂ´ng',
        schema: buildSuccessResponseSchema({
            code: 'contact.reopened',
            message: 'Má»Ÿ láº¡i ticket thĂ nh cĂ´ng',
        }),
    })
    @ApiResponse({
        status: 404,
        description: 'KhĂ´ng tĂ¬m tháº¥y ticket',
        schema: buildErrorResponseSchema({
            code: 'contact.not_found',
            message: 'KhĂ´ng tĂ¬m tháº¥y ticket',
        }),
    })
    @ApiResponse({
        status: 409,
        description: 'Ticket khĂ´ng á»Ÿ tráº¡ng thĂ¡i cĂ³ thá»ƒ má»Ÿ láº¡i',
        schema: buildErrorResponseSchema({
            code: 'contact.invalid_reopen_status',
            message: 'Ticket khĂ´ng á»Ÿ tráº¡ng thĂ¡i cĂ³ thá»ƒ má»Ÿ láº¡i',
        }),
    })
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
        summary: 'XĂ³a ticket (Soft delete)',
        description: 'XĂ³a má»m má»™t ticket theo ID. YĂªu cáº§u quyá»n `contact.delete`.',
    })
    @ApiParam({ name: 'id', description: 'ID ticket', example: '550e8400-e29b-41d4-a716-446655440081' })
    @ApiResponse({
        status: 200,
        description: 'XĂ³a ticket thĂ nh cĂ´ng',
        schema: buildSuccessResponseSchema({
            code: 'contact.deleted',
            message: 'XĂ³a ticket thĂ nh cĂ´ng',
        }),
    })
    @ApiResponse({
        status: 404,
        description: 'KhĂ´ng tĂ¬m tháº¥y ticket',
        schema: buildErrorResponseSchema({
            code: 'contact.not_found',
            message: 'KhĂ´ng tĂ¬m tháº¥y ticket',
        }),
    })
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
        summary: 'XĂ³a nhiá»u tickets cĂ¹ng lĂºc',
        description: 'XĂ³a má»m nhiá»u ticket theo danh sĂ¡ch ID. YĂªu cáº§u quyá»n `contact.delete`.',
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
    @ApiResponse({
        status: 200,
        description: 'XĂ³a nhiá»u ticket thĂ nh cĂ´ng',
        schema: buildSuccessResponseSchema({
            code: 'contact.deleted_many',
            message: 'XĂ³a nhiá»u ticket thĂ nh cĂ´ng',
            dataSchema: {
                type: 'object',
                properties: {
                    count: { type: 'number', example: 2 },
                },
            },
            dataExample: {
                count: 2,
            },
        }),
    })
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



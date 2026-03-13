import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiOperation,
    ApiParam,
    ApiQuery,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { FaqService } from './faq.service';
import { CreateFaqDto, QueryFaqDto, UpdateFaqDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import { CreatedResponse, DeletedResponse, GetResponse, UpdatedResponse } from '../../common/responses/success.response';
import {
    buildErrorResponseSchema,
    buildPaginationDataSchema,
    buildSuccessResponseSchema,
} from '../../common/swagger/swagger-response.helper';

const FAQ_ID = '550e8400-e29b-41d4-a716-446655440201';

const faqItemSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', example: FAQ_ID },
        question: { type: 'string', example: 'Làm sao để đăng ký tài khoản?' },
        answer: { type: 'string', example: 'Bạn có thể đăng ký bằng cách nhấn vào nút Đăng ký trên trang chủ.' },
        order: { type: 'number', example: 1 },
        is_active: { type: 'boolean', example: true },
        created_at: { type: 'string', format: 'date-time', example: '2026-03-13T08:00:00.000Z' },
        updated_at: { type: 'string', format: 'date-time', example: '2026-03-13T08:10:00.000Z' },
    },
};

const notFoundSchema = buildErrorResponseSchema({
    code: 'faq.not_found',
    message: 'Không tìm thấy FAQ',
});

@ApiTags('FAQs')
@Controller('faqs')
export class FaqController {
    constructor(private readonly faqService: FaqService) { }

    @Post()
    @ApiOperation({
        summary: 'Tạo FAQ mới',
        description: 'Tạo một câu hỏi thường gặp mới để hiển thị trong hệ thống. Có thể thiết lập thứ tự hiển thị và trạng thái hoạt động ngay khi tạo. Yêu cầu quyền `faq.create`.',
    })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.create')
    @ApiBody({
        type: CreateFaqDto,
        description: 'Dữ liệu FAQ cần tạo mới',
        examples: {
            account_faq: {
                summary: 'FAQ về tài khoản',
                description: 'Ví dụ FAQ hướng dẫn đăng ký tài khoản',
                value: {
                    question: 'Làm sao để đăng ký tài khoản?',
                    answer: 'Bạn có thể đăng ký bằng cách nhấn vào nút Đăng ký trên trang chủ.',
                    order: 1,
                    is_active: true,
                },
            },
            rental_faq: {
                summary: 'FAQ về thuê kho',
                description: 'Ví dụ FAQ giải thích thời gian thuê tối thiểu',
                value: {
                    question: 'Thời gian thuê kho tối thiểu là bao lâu?',
                    answer: 'Thời gian thuê kho tối thiểu là 1 tháng.',
                    order: 2,
                    is_active: true,
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Trả về FAQ vừa được tạo thành công',
        schema: buildSuccessResponseSchema({
            code: 'faq.created',
            message: 'Đã tạo FAQ thành công',
            dataSchema: faqItemSchema,
            dataExample: {
                id: FAQ_ID,
                question: 'Làm sao để đăng ký tài khoản?',
                answer: 'Bạn có thể đăng ký bằng cách nhấn vào nút Đăng ký trên trang chủ.',
                order: 1,
                is_active: true,
                created_at: '2026-03-13T08:00:00.000Z',
                updated_at: '2026-03-13T08:00:00.000Z',
            },
        }),
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async create(
        @Body() dto: CreateFaqDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const faq = await this.faqService.create(dto, userId, lang);
        return new CreatedResponse('faq.created', faq, 'Đã tạo FAQ thành công');
    }

    @Get()
    @ApiOperation({
        summary: 'Lấy danh sách FAQ',
        description: 'Lấy danh sách tất cả FAQ với phân trang, tìm kiếm theo từ khóa, và lọc theo trạng thái hoạt động. Yêu cầu quyền `faq.list`.',
    })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.list')
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng bản ghi trên mỗi trang', example: 20 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu để phân trang', example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm kiếm theo câu hỏi hoặc câu trả lời', example: 'đăng ký' })
    @ApiQuery({ name: 'is_active', required: false, type: Boolean, description: 'Lọc theo trạng thái hoạt động của FAQ', example: true })
    @ApiResponse({
        status: 200,
        description: 'Trả về danh sách FAQ và thông tin phân trang',
        schema: buildSuccessResponseSchema({
            code: 'faq.list',
            message: 'Lấy danh sách FAQ thành công',
            dataSchema: buildPaginationDataSchema(faqItemSchema),
            dataExample: {
                items: [
                    {
                        id: FAQ_ID,
                        question: 'Làm sao để đăng ký tài khoản?',
                        answer: 'Bạn có thể đăng ký bằng cách nhấn vào nút Đăng ký trên trang chủ.',
                        order: 1,
                        is_active: true,
                        created_at: '2026-03-13T08:00:00.000Z',
                        updated_at: '2026-03-13T08:10:00.000Z',
                    },
                ],
                total: 12,
                limit: 20,
                offset: 0,
                hasMore: false,
            },
        }),
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async findAll(
        @Query() query: QueryFaqDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.faqService.findAll(query);
        return new GetResponse('faq.list', result, 'Lấy danh sách FAQ thành công');
    }

    @Get('public')
    @ApiOperation({
        summary: 'Lấy danh sách FAQ công khai',
        description: 'Lấy danh sách FAQ đang hoạt động để hiển thị cho người dùng bên ngoài. Endpoint này là public và không yêu cầu đăng nhập.',
    })
    @ApiResponse({
        status: 200,
        description: 'Trả về danh sách FAQ công khai đang hoạt động',
        schema: buildSuccessResponseSchema({
            code: 'faq.public',
            message: 'Lấy danh sách FAQ thành công',
            dataSchema: {
                type: 'array',
                items: faqItemSchema,
            },
            dataExample: [
                {
                    id: FAQ_ID,
                    question: 'Làm sao để đăng ký tài khoản?',
                    answer: 'Bạn có thể đăng ký bằng cách nhấn vào nút Đăng ký trên trang chủ.',
                    order: 1,
                    is_active: true,
                    created_at: '2026-03-13T08:00:00.000Z',
                    updated_at: '2026-03-13T08:10:00.000Z',
                },
            ],
        }),
    })
    async findAllPublic() {
        const result = await this.faqService.findAllPublic();
        return new GetResponse('faq.public', result, 'Lấy danh sách FAQ thành công');
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Lấy chi tiết FAQ',
        description: 'Lấy thông tin chi tiết của một FAQ theo ID. Yêu cầu quyền `faq.read`.',
    })
    @ApiParam({ name: 'id', required: true, description: 'ID FAQ cần xem chi tiết', example: FAQ_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.read')
    @ApiResponse({
        status: 200,
        description: 'Trả về thông tin chi tiết của FAQ',
        schema: buildSuccessResponseSchema({
            code: 'faq.read',
            message: 'Lấy chi tiết FAQ thành công',
            dataSchema: faqItemSchema,
            dataExample: {
                id: FAQ_ID,
                question: 'Làm sao để đăng ký tài khoản?',
                answer: 'Bạn có thể đăng ký bằng cách nhấn vào nút Đăng ký trên trang chủ.',
                order: 1,
                is_active: true,
                created_at: '2026-03-13T08:00:00.000Z',
                updated_at: '2026-03-13T08:10:00.000Z',
            },
        }),
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy FAQ tương ứng với ID được cung cấp', schema: notFoundSchema })
    @ApiAuthResponses()
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const faq = await this.faqService.findById(id, lang);
        return new GetResponse('faq.read', faq, 'Lấy chi tiết FAQ thành công');
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Cập nhật FAQ',
        description: 'Cập nhật một phần hoặc toàn bộ nội dung FAQ. Chỉ các trường được gửi mới được thay đổi. Yêu cầu quyền `faq.update`.',
    })
    @ApiParam({ name: 'id', required: true, description: 'ID FAQ cần cập nhật', example: FAQ_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.update')
    @ApiBody({
        type: UpdateFaqDto,
        description: 'Dữ liệu FAQ cần cập nhật',
        examples: {
            update_content: {
                summary: 'Cập nhật nội dung',
                description: 'Ví dụ chỉnh sửa câu hỏi và câu trả lời',
                value: {
                    question: 'Làm thế nào để đăng ký tài khoản GEN-HUB?',
                    answer: 'Bạn có thể đăng ký nhanh bằng email hoặc số điện thoại trên trang chủ.',
                },
            },
            update_status: {
                summary: 'Ẩn FAQ tạm thời',
                description: 'Ví dụ chuyển FAQ sang trạng thái không hoạt động',
                value: {
                    is_active: false,
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Trả về FAQ sau khi cập nhật thành công',
        schema: buildSuccessResponseSchema({
            code: 'faq.updated',
            message: 'Đã cập nhật FAQ thành công',
            dataSchema: faqItemSchema,
            dataExample: {
                id: FAQ_ID,
                question: 'Làm thế nào để đăng ký tài khoản GEN-HUB?',
                answer: 'Bạn có thể đăng ký nhanh bằng email hoặc số điện thoại trên trang chủ.',
                order: 1,
                is_active: true,
                created_at: '2026-03-13T08:00:00.000Z',
                updated_at: '2026-03-13T09:00:00.000Z',
            },
        }),
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy FAQ cần cập nhật', schema: notFoundSchema })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateFaqDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const faq = await this.faqService.update(id, dto, userId, lang);
        return new UpdatedResponse('faq.updated', faq, 'Đã cập nhật FAQ thành công');
    }

    @Delete('delete/many')
    @ApiOperation({
        summary: 'Xóa nhiều FAQ',
        description: 'Xóa nhiều FAQ cùng lúc theo danh sách ID. Yêu cầu quyền `faq.delete`.',
    })
    @ApiBody({
        description: 'Danh sách ID FAQ cần xóa',
        schema: {
            type: 'object',
            properties: {
                ids: {
                    type: 'array',
                    items: { type: 'string', format: 'uuid' },
                    example: [FAQ_ID, '550e8400-e29b-41d4-a716-446655440202'],
                },
            },
            required: ['ids'],
        },
    })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.delete')
    @ApiResponse({
        status: 200,
        description: 'Trả về kết quả xóa nhiều FAQ thành công',
        schema: buildSuccessResponseSchema({
            code: 'faq.deletedMany',
            message: 'Đã xóa các FAQ thành công',
            dataSchema: { type: 'null', nullable: true },
            dataExample: null,
        }),
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async deleteMany(
        @Body('ids') ids: string[],
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.faqService.deleteMany(ids, userId, lang);
        return new DeletedResponse('faq.deletedMany', null, 'Đã xóa các FAQ thành công');
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Xóa FAQ',
        description: 'Xóa một FAQ theo ID. Yêu cầu quyền `faq.delete`.',
    })
    @ApiParam({ name: 'id', required: true, description: 'ID FAQ cần xóa', example: FAQ_ID, schema: { type: 'string', format: 'uuid' } })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.delete')
    @ApiResponse({
        status: 200,
        description: 'Trả về kết quả xóa FAQ thành công',
        schema: buildSuccessResponseSchema({
            code: 'faq.deleted',
            message: 'Đã xóa FAQ thành công',
            dataSchema: { type: 'null', nullable: true },
            dataExample: null,
        }),
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy FAQ cần xóa', schema: notFoundSchema })
    @ApiAuthResponses()
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.faqService.delete(id, userId, lang);
        return new DeletedResponse('faq.deleted', null, 'Đã xóa FAQ thành công');
    }
}

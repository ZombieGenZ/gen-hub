import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    ParseUUIDPipe,
    Post,
    Put,
    Query,
    Req,
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
import { WarnPenalty } from '@prisma/client';
import type { Request } from 'express';
import { I18nLang } from 'nestjs-i18n';
import { ApiAuthResponses, ApiValidationErrorResponse, CurrentUser, RequirePermission } from '../../common/decorators';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import {
    CreatedResponse,
    DeletedResponse,
    GetResponse,
    UpdatedResponse,
} from '../../common/responses/success.response';
import {
    buildErrorResponseSchema,
    buildPaginationDataSchema,
    buildSuccessResponseSchema,
} from '../../common/swagger/swagger-response.helper';
import { CreateWarnPenaltyDto, QueryWarnPenaltyDto, UpdateWarnPenaltyDto } from './dto';
import { WarnPenaltyService } from './warn-penalty.service';

const warnPenaltySchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440050' },
        min_warn_count: { type: 'number', example: 3 },
        max_warn_count: { type: 'number', nullable: true, example: 4 },
        is_permanent_ban: { type: 'boolean', example: false },
        duration_value: { type: 'number', nullable: true, example: 7 },
        duration_unit: { type: 'string', nullable: true, example: 'DAY' },
        is_active: { type: 'boolean', example: true },
        description: { type: 'string', example: 'Khóa tài khoản 7 ngày khi người dùng đạt từ 3 đến 4 cảnh báo' },
        created_at: { type: 'string', format: 'date-time', example: '2026-03-13T09:30:00.000Z' },
        updated_at: { type: 'string', format: 'date-time', example: '2026-03-13T10:00:00.000Z' },
    },
};

@ApiTags('Warn Penalty')
@ApiBearerAuth('JWT-auth')
@Controller('admin/warn-penalties')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WarnPenaltyController {
    constructor(private readonly service: WarnPenaltyService) { }

    @Post()
    @RequirePermission('warn-penalty.create')
    @ApiOperation({
        summary: 'Tạo quy tắc phạt warn mới',
        description:
            'Tạo một quy tắc xử phạt tự động dựa trên số lượng warning tích lũy của người dùng. Yêu cầu quyền `warn-penalty.create`.',
    })
    @ApiBody({
        type: CreateWarnPenaltyDto,
        description: 'Thông tin quy tắc phạt warn cần tạo',
        examples: {
            temporary_ban: {
                summary: 'Khóa tạm thời khi đạt 3 warn',
                description: 'Tạo quy tắc khóa 7 ngày nếu người dùng đạt từ 3 đến 4 cảnh báo',
                value: {
                    min_warn_count: 3,
                    max_warn_count: 4,
                    is_permanent_ban: false,
                    duration_value: 7,
                    duration_unit: 'DAY',
                    description: 'Khóa tài khoản 7 ngày khi người dùng đạt từ 3 đến 4 cảnh báo',
                },
            },
            permanent_ban: {
                summary: 'Khóa vĩnh viễn khi đạt 5 warn',
                description: 'Tạo quy tắc cấm vĩnh viễn khi vi phạm vượt ngưỡng nghiêm trọng',
                value: {
                    min_warn_count: 5,
                    is_permanent_ban: true,
                    description: 'Khóa vĩnh viễn khi số cảnh báo vượt ngưỡng nghiêm trọng',
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo quy tắc phạt warn thành công',
        schema: buildSuccessResponseSchema({
            code: 'warn-penalty.create',
            message: 'Tạo quy tắc phạt warn thành công',
            dataSchema: warnPenaltySchema,
            dataExample: {
                id: '550e8400-e29b-41d4-a716-446655440050',
                min_warn_count: 3,
                max_warn_count: 4,
                is_permanent_ban: false,
                duration_value: 7,
                duration_unit: 'DAY',
                is_active: true,
                description: 'Khóa tài khoản 7 ngày khi người dùng đạt từ 3 đến 4 cảnh báo',
                created_at: '2026-03-13T09:30:00.000Z',
                updated_at: '2026-03-13T10:00:00.000Z',
            },
        }),
    })
    @ApiResponse({
        status: 400,
        description: 'Dữ liệu gửi lên không hợp lệ theo quy tắc xử phạt',
        schema: buildErrorResponseSchema({
            code: 'warn-penalty.invalid_payload',
            message: 'Dữ liệu quy tắc phạt warn không hợp lệ',
        }),
    })
    @ApiResponse({
        status: 409,
        description: 'Quy tắc phạt warn bị trùng điều kiện',
        schema: buildErrorResponseSchema({
            code: 'warn-penalty.range_conflict',
            message: 'Khoảng số lượng cảnh báo đã được cấu hình ở một quy tắc khác',
        }),
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async create(
        @Body() dto: CreateWarnPenaltyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ): Promise<CreatedResponse<WarnPenalty>> {
        const penalty = await this.service.create(dto, userId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new CreatedResponse('warn-penalty.create', penalty);
    }

    @Get()
    @RequirePermission('warn-penalty.list')
    @ApiOperation({
        summary: 'Lấy danh sách quy tắc phạt warn',
        description:
            'Lấy danh sách tất cả quy tắc xử phạt warn với phân trang và bộ lọc. Yêu cầu quyền `warn-penalty.list`.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng kết quả tối đa', example: 20 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu', example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm kiếm theo mô tả', example: '7 ngày' })
    @ApiQuery({ name: 'is_active', required: false, type: Boolean, description: 'Lọc theo trạng thái kích hoạt', example: true })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách quy tắc phạt warn thành công',
        schema: buildSuccessResponseSchema({
            code: 'warn-penalty.list',
            message: 'Lấy danh sách quy tắc phạt warn thành công',
            dataSchema: buildPaginationDataSchema(warnPenaltySchema),
            dataExample: {
                items: [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440050',
                        min_warn_count: 3,
                        max_warn_count: 4,
                        is_permanent_ban: false,
                        duration_value: 7,
                        duration_unit: 'DAY',
                        is_active: true,
                        description: 'Khóa tài khoản 7 ngày khi người dùng đạt từ 3 đến 4 cảnh báo',
                        created_at: '2026-03-13T09:30:00.000Z',
                        updated_at: '2026-03-13T10:00:00.000Z',
                    },
                ],
                total: 1,
                limit: 20,
                offset: 0,
                hasMore: false,
            },
        }),
    })
    @ApiAuthResponses()
    async findMany(
        @Query() query: QueryWarnPenaltyDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.findMany(query, lang);
        return new GetResponse('warn-penalty.list', result);
    }

    @Get('active')
    @RequirePermission('warn-penalty.list')
    @ApiOperation({
        summary: 'Lấy tất cả quy tắc phạt warn đang active',
        description:
            'Lấy toàn bộ quy tắc xử phạt đang hoạt động để áp dụng trong nghiệp vụ cảnh báo. Yêu cầu quyền `warn-penalty.list`.',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách quy tắc phạt warn active thành công',
        schema: buildSuccessResponseSchema({
            code: 'warn-penalty.list.all',
            message: 'Lấy danh sách quy tắc phạt warn active thành công',
            dataSchema: {
                type: 'array',
                items: warnPenaltySchema,
            },
            dataExample: [
                {
                    id: '550e8400-e29b-41d4-a716-446655440050',
                    min_warn_count: 3,
                    max_warn_count: 4,
                    is_permanent_ban: false,
                    duration_value: 7,
                    duration_unit: 'DAY',
                    is_active: true,
                    description: 'Khóa tài khoản 7 ngày khi người dùng đạt từ 3 đến 4 cảnh báo',
                    created_at: '2026-03-13T09:30:00.000Z',
                    updated_at: '2026-03-13T10:00:00.000Z',
                },
            ],
        }),
    })
    @ApiAuthResponses()
    async findAllActive(@I18nLang() lang: string) {
        const items = await this.service.findAllActive(lang);
        return new GetResponse('warn-penalty.list.all', items);
    }

    @Get(':id')
    @RequirePermission('warn-penalty.read')
    @ApiOperation({
        summary: 'Lấy chi tiết quy tắc phạt warn',
        description:
            'Lấy thông tin chi tiết của một quy tắc phạt warn theo ID. Yêu cầu quyền `warn-penalty.read`.',
    })
    @ApiParam({ name: 'id', description: 'ID quy tắc phạt warn', example: '550e8400-e29b-41d4-a716-446655440050' })
    @ApiResponse({
        status: 200,
        description: 'Lấy chi tiết quy tắc phạt warn thành công',
        schema: buildSuccessResponseSchema({
            code: 'warn-penalty.read',
            message: 'Lấy chi tiết quy tắc phạt warn thành công',
            dataSchema: warnPenaltySchema,
            dataExample: {
                id: '550e8400-e29b-41d4-a716-446655440050',
                min_warn_count: 3,
                max_warn_count: 4,
                is_permanent_ban: false,
                duration_value: 7,
                duration_unit: 'DAY',
                is_active: true,
                description: 'Khóa tài khoản 7 ngày khi người dùng đạt từ 3 đến 4 cảnh báo',
                created_at: '2026-03-13T09:30:00.000Z',
                updated_at: '2026-03-13T10:00:00.000Z',
            },
        }),
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy quy tắc phạt warn',
        schema: buildErrorResponseSchema({
            code: 'warn-penalty.not_found',
            message: 'Không tìm thấy quy tắc phạt warn',
        }),
    })
    @ApiAuthResponses()
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<WarnPenalty>> {
        const penalty = await this.service.findById(id, lang);
        return new GetResponse('warn-penalty.read', penalty);
    }

    @Put(':id')
    @RequirePermission('warn-penalty.update')
    @ApiOperation({
        summary: 'Cập nhật quy tắc phạt warn',
        description:
            'Cập nhật một phần hoặc toàn bộ thông tin quy tắc phạt warn. Chỉ các trường được gửi trong request body mới được cập nhật. Yêu cầu quyền `warn-penalty.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID quy tắc phạt warn', example: '550e8400-e29b-41d4-a716-446655440050' })
    @ApiBody({
        type: UpdateWarnPenaltyDto,
        description: 'Dữ liệu cập nhật quy tắc phạt warn',
        examples: {
            disable_rule: {
                summary: 'Ngưng kích hoạt quy tắc',
                description: 'Chỉ cập nhật trạng thái hoạt động của quy tắc',
                value: {
                    is_active: false,
                },
            },
            update_duration: {
                summary: 'Cập nhật thời lượng xử phạt',
                description: 'Điều chỉnh thời gian khóa từ 7 ngày lên 14 ngày',
                value: {
                    duration_value: 14,
                    duration_unit: 'DAY',
                    description: 'Tăng thời gian khóa lên 14 ngày',
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật quy tắc phạt warn thành công',
        schema: buildSuccessResponseSchema({
            code: 'warn-penalty.update',
            message: 'Cập nhật quy tắc phạt warn thành công',
            dataSchema: warnPenaltySchema,
            dataExample: {
                id: '550e8400-e29b-41d4-a716-446655440050',
                min_warn_count: 3,
                max_warn_count: 4,
                is_permanent_ban: false,
                duration_value: 14,
                duration_unit: 'DAY',
                is_active: true,
                description: 'Tăng thời gian khóa lên 14 ngày',
                created_at: '2026-03-13T09:30:00.000Z',
                updated_at: '2026-03-13T10:00:00.000Z',
            },
        }),
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy quy tắc phạt warn',
        schema: buildErrorResponseSchema({
            code: 'warn-penalty.not_found',
            message: 'Không tìm thấy quy tắc phạt warn',
        }),
    })
    @ApiResponse({
        status: 409,
        description: 'Quy tắc phạt warn cập nhật bị xung đột dữ liệu',
        schema: buildErrorResponseSchema({
            code: 'warn-penalty.range_conflict',
            message: 'Khoảng số lượng cảnh báo cập nhật bị chồng lấn với quy tắc khác',
        }),
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateWarnPenaltyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ): Promise<UpdatedResponse<WarnPenalty>> {
        const penalty = await this.service.update(id, dto, userId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new UpdatedResponse('warn-penalty.update', penalty);
    }

    @Delete(':id')
    @RequirePermission('warn-penalty.delete')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Xóa quy tắc phạt warn',
        description: 'Soft delete một quy tắc phạt warn theo ID. Yêu cầu quyền `warn-penalty.delete`.',
    })
    @ApiParam({ name: 'id', description: 'ID quy tắc phạt warn', example: '550e8400-e29b-41d4-a716-446655440050' })
    @ApiResponse({
        status: 200,
        description: 'Xóa quy tắc phạt warn thành công',
        schema: buildSuccessResponseSchema({
            code: 'warn-penalty.delete',
            message: 'Xóa quy tắc phạt warn thành công',
        }),
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy quy tắc phạt warn',
        schema: buildErrorResponseSchema({
            code: 'warn-penalty.not_found',
            message: 'Không tìm thấy quy tắc phạt warn',
        }),
    })
    @ApiAuthResponses()
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ): Promise<DeletedResponse<void>> {
        await this.service.delete(id, userId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new DeletedResponse('warn-penalty.delete');
    }

    @Delete()
    @RequirePermission('warn-penalty.delete')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Xóa nhiều quy tắc phạt warn',
        description: 'Xóa mềm nhiều quy tắc phạt warn cùng lúc theo danh sách ID. Yêu cầu quyền `warn-penalty.delete`.',
    })
    @ApiBody({
        description: 'Danh sách ID quy tắc phạt warn cần xóa',
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
                    '550e8400-e29b-41d4-a716-446655440050',
                    '550e8400-e29b-41d4-a716-446655440051',
                ],
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa nhiều quy tắc phạt warn thành công',
        schema: buildSuccessResponseSchema({
            code: 'warn-penalty.delete-many',
            message: 'Xóa nhiều quy tắc phạt warn thành công',
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
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @Req() req: Request,
    ): Promise<DeletedResponse<{ count: number }>> {
        const count = await this.service.deleteMany(ids, userId, lang, {
            ip: req.ip,
            userAgent: req.headers['user-agent'],
        });
        return new DeletedResponse('warn-penalty.delete-many', { count });
    }
}

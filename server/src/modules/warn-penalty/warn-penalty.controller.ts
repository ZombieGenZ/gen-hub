import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
    ApiQuery,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { WarnPenaltyService } from './warn-penalty.service';
import { CreateWarnPenaltyDto, UpdateWarnPenaltyDto, QueryWarnPenaltyDto } from './dto';
import { WarnPenalty } from '@prisma/client';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser, ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import {
    CreatedResponse,
    GetResponse,
    UpdatedResponse,
    DeletedResponse,
} from '../../common/responses/success.response';
import type { Request } from 'express';

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
        description: 'Tạo một quy tắc xử phạt tự động dựa trên số lượng warning tích lũy của người dùng. Yêu cầu quyền `warn-penalty.create`.',
    })
    @ApiBody({
        type: CreateWarnPenaltyDto,
        description: 'Thông tin quy tắc phạt warn cần tạo',
        examples: {
            temporary_ban: {
                summary: 'Khóa tạm thời khi đạt 3 warn',
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
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warn-penalty.create' },
                message: { type: 'string', example: 'Tạo quy tắc phạt warn thành công' },
                success: { type: 'boolean', example: true },
                data: { type: 'object' },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Dữ liệu gửi lên không hợp lệ theo quy tắc xử phạt' })
    @ApiResponse({ status: 409, description: 'Quy tắc phạt warn bị trùng điều kiện' })
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
        description: 'Lấy danh sách tất cả quy tắc xử phạt warn với phân trang và bộ lọc. Yêu cầu quyền `warn-penalty.list`.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng kết quả tối đa', example: 20 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu', example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm kiếm', example: '7 ngày' })
    @ApiQuery({ name: 'is_active', required: false, type: Boolean, description: 'Lọc theo trạng thái kích hoạt', example: true })
    @ApiResponse({ status: 200, description: 'Lấy danh sách quy tắc phạt warn thành công' })
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
        description: 'Lấy toàn bộ quy tắc xử phạt đang hoạt động để áp dụng trong nghiệp vụ cảnh báo. Yêu cầu quyền `warn-penalty.list`.',
    })
    @ApiResponse({ status: 200, description: 'Lấy danh sách quy tắc phạt warn active thành công' })
    @ApiAuthResponses()
    async findAllActive(@I18nLang() lang: string) {
        const items = await this.service.findAllActive(lang);
        return new GetResponse('warn-penalty.list.all', items);
    }

    @Get(':id')
    @RequirePermission('warn-penalty.read')
    @ApiOperation({
        summary: 'Lấy chi tiết quy tắc phạt warn',
        description: 'Lấy thông tin chi tiết của một quy tắc phạt warn theo ID. Yêu cầu quyền `warn-penalty.read`.',
    })
    @ApiParam({ name: 'id', description: 'ID quy tắc phạt warn', example: '550e8400-e29b-41d4-a716-446655440050' })
    @ApiResponse({ status: 200, description: 'Lấy chi tiết quy tắc phạt warn thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy quy tắc phạt warn' })
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
        description: 'Cập nhật một phần hoặc toàn bộ thông tin quy tắc phạt warn. Yêu cầu quyền `warn-penalty.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID quy tắc phạt warn', example: '550e8400-e29b-41d4-a716-446655440050' })
    @ApiBody({
        type: UpdateWarnPenaltyDto,
        description: 'Dữ liệu cập nhật quy tắc phạt warn',
        examples: {
            disable_rule: {
                summary: 'Ngưng kích hoạt quy tắc',
                value: {
                    is_active: false,
                },
            },
            update_duration: {
                summary: 'Cập nhật thời lượng xử phạt',
                value: {
                    duration_value: 14,
                    duration_unit: 'DAY',
                    description: 'Tăng thời gian khóa lên 14 ngày',
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Cập nhật quy tắc phạt warn thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy quy tắc phạt warn' })
    @ApiResponse({ status: 409, description: 'Quy tắc phạt warn cập nhật bị xung đột dữ liệu' })
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
    @ApiResponse({ status: 200, description: 'Xóa quy tắc phạt warn thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy quy tắc phạt warn' })
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
    @ApiResponse({ status: 200, description: 'Xóa nhiều quy tắc phạt warn thành công' })
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

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
        description: 'Tạo quy tắc xử phạt tự động khi user đạt đến số lượng warning nhất định. Ví dụ: 3 warning = ban 7 ngày. Yêu cầu quyền `warn-penalty.create`.',
    })
    @ApiBody({
        type: CreateWarnPenaltyDto,
        examples: {
            auto_ban: {
                summary: 'Auto ban khi đạt 3 warnings',
                value: {
                    name: 'Ban 7 ngày - 3 warnings',
                    warning_count: 3,
                    penalty_type: 'BAN',
                    penalty_duration: 7,
                    penalty_duration_unit: 'days',
                    is_active: true,
                },
            },
            permanent_ban: {
                summary: 'Ban vĩnh viễn khi đạt 5 warnings',
                value: {
                    name: 'Ban vĩnh viễn - 5 warnings',
                    warning_count: 5,
                    penalty_type: 'PERMANENT_BAN',
                    is_active: true,
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo quy tắc thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'warn-penalty.create' },
                success: { type: 'boolean', example: true },
                data: { type: 'object' },
            },
        },
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
        description: 'Lấy danh sách tất cả quy tắc xử phạt với phân trang. Yêu cầu quyền `warn-penalty.list`.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String })
    @ApiQuery({ name: 'is_active', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'Danh sách quy tắc' })
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
        description: 'Lấy danh sách tất cả quy tắc đang active để áp dụng. Yêu cầu quyền `warn-penalty.list`.',
    })
    @ApiResponse({ status: 200, description: 'Danh sách quy tắc active' })
    @ApiAuthResponses()
    async findAllActive(@I18nLang() lang: string) {
        const items = await this.service.findAllActive(lang);
        return new GetResponse('warn-penalty.list.all', items);
    }

    @Get(':id')
    @RequirePermission('warn-penalty.read')
    @ApiOperation({
        summary: 'Lấy chi tiết quy tắc phạt warn',
        description: 'Lấy thông tin chi tiết của một quy tắc xử phạt. Yêu cầu quyền `warn-penalty.read`.',
    })
    @ApiParam({ name: 'id', description: 'ID quy tắc (UUID)' })
    @ApiResponse({ status: 200, description: 'Chi tiết quy tắc' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
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
        description: 'Cập nhật thông tin quy tắc xử phạt. Yêu cầu quyền `warn-penalty.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID quy tắc (UUID)' })
    @ApiBody({ type: UpdateWarnPenaltyDto })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
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
        description: 'Soft delete quy tắc xử phạt. Yêu cầu quyền `warn-penalty.delete`.',
    })
    @ApiParam({ name: 'id', description: 'ID quy tắc (UUID)' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
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
        description: 'Xóa nhiều quy tắc cùng lúc. Yêu cầu quyền `warn-penalty.delete`.',
    })
    @ApiBody({
        schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } },
    })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
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

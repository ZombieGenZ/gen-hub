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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { WarnPenaltyService } from './warn-penalty.service';
import { CreateWarnPenaltyDto, UpdateWarnPenaltyDto, QueryWarnPenaltyDto } from './dto';
import { WarnPenalty } from '@prisma/client';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    CreatedResponse,
    GetResponse,
    UpdatedResponse,
    DeletedResponse,
} from '../../common/responses/success.response';
import type { Request } from 'express';

@ApiTags('Warn Penalty')
@ApiBearerAuth()
@Controller('admin/warn-penalties')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WarnPenaltyController {
    constructor(private readonly service: WarnPenaltyService) { }

    @Post()
    @RequirePermission('warn-penalty.create')
    @ApiOperation({ summary: 'Tạo quy tắc phạt warn mới' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
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
    @ApiOperation({ summary: 'Lấy danh sách quy tắc phạt warn' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findMany(
        @Query() query: QueryWarnPenaltyDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.findMany(query, lang);
        return new GetResponse('warn-penalty.list', result);
    }

    @Get('active')
    @RequirePermission('warn-penalty.list')
    @ApiOperation({ summary: 'Lấy tất cả quy tắc phạt warn đang active' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findAllActive(@I18nLang() lang: string) {
        const items = await this.service.findAllActive(lang);
        return new GetResponse('warn-penalty.list.all', items);
    }

    @Get(':id')
    @RequirePermission('warn-penalty.read')
    @ApiOperation({ summary: 'Lấy chi tiết quy tắc phạt warn' })
    @ApiResponse({ status: 200, description: 'Lấy chi tiết thành công' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<WarnPenalty>> {
        const penalty = await this.service.findById(id, lang);
        return new GetResponse('warn-penalty.read', penalty);
    }

    @Put(':id')
    @RequirePermission('warn-penalty.update')
    @ApiOperation({ summary: 'Cập nhật quy tắc phạt warn' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
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
    @ApiOperation({ summary: 'Xóa quy tắc phạt warn' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
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
    @ApiOperation({ summary: 'Xóa nhiều quy tắc phạt warn' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
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

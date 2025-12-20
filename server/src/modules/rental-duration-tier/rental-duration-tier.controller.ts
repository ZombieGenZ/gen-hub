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
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { RentalDurationTierService } from './rental-duration-tier.service';
import { CreateRentalDurationTierDto, UpdateRentalDurationTierDto, QueryRentalDurationTierDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
} from '../../common/responses';
import { IRentalDurationTier, IPaginatedResponse } from './interfaces';

@ApiTags('Rental Duration Tiers')
@Controller('rental-duration-tiers')
export class RentalDurationTierController {
    constructor(private readonly service: RentalDurationTierService) { }

    @Post()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('rental-duration-tier.create')
    @ApiOperation({ summary: 'Tạo mốc thời gian thuê mới' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async create(
        @Body() dto: CreateRentalDurationTierDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<CreatedResponse<IRentalDurationTier>> {
        const result = await this.service.create(dto, userId, lang);
        return new CreatedResponse('rental-duration-tier.success.created', result, 'Tạo mốc thời gian thuê thành công');
    }

    @Get()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('rental-duration-tier.list')
    @ApiOperation({ summary: 'Lấy danh sách mốc thời gian thuê' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findAll(
        @Query() query: QueryRentalDurationTierDto,
    ): Promise<GetResponse<IPaginatedResponse<IRentalDurationTier>>> {
        const result = await this.service.findAll(query);
        return new GetResponse('rental-duration-tier.success.fetched', result, 'Lấy danh sách mốc thời gian thuê thành công');
    }

    @Get('active')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Lấy tất cả mốc thời gian thuê đang active (cho dropdown)' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    async findAllActive(): Promise<GetResponse<IRentalDurationTier[]>> {
        const result = await this.service.findAllActive();
        return new GetResponse('rental-duration-tier.success.fetched', result, 'Lấy danh sách mốc thời gian thuê thành công');
    }

    @Get(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('rental-duration-tier.read')
    @ApiOperation({ summary: 'Lấy chi tiết mốc thời gian thuê' })
    @ApiParam({ name: 'id', description: 'ID của mốc thời gian thuê', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IRentalDurationTier>> {
        const result = await this.service.findById(id, lang);
        return new GetResponse('rental-duration-tier.success.fetched', result, 'Lấy chi tiết mốc thời gian thuê thành công');
    }

    @Put(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('rental-duration-tier.update')
    @ApiOperation({ summary: 'Cập nhật mốc thời gian thuê' })
    @ApiParam({ name: 'id', description: 'ID của mốc thời gian thuê', type: 'string' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateRentalDurationTierDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<IRentalDurationTier>> {
        const result = await this.service.update(id, dto, userId, lang);
        return new UpdatedResponse('rental-duration-tier.success.updated', result, 'Cập nhật mốc thời gian thuê thành công');
    }

    @Delete('delete/many')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('rental-duration-tier.delete')
    @ApiOperation({ summary: 'Xóa nhiều mốc thời gian thuê' })
    @ApiBody({ type: DeleteManyDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    async deleteMany(
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.service.deleteMany(dto.ids, userId, lang);
        return new DeletedResponse('rental-duration-tier.success.deleted', null, 'Xóa nhiều mốc thời gian thuê thành công');
    }

    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('rental-duration-tier.delete')
    @ApiOperation({ summary: 'Xóa mốc thời gian thuê' })
    @ApiParam({ name: 'id', description: 'ID của mốc thời gian thuê', type: 'string' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.service.delete(id, userId, lang);
        return new DeletedResponse('rental-duration-tier.success.deleted', null, 'Xóa mốc thời gian thuê thành công');
    }
}

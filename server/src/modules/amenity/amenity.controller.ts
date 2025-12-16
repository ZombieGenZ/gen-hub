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
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { AmenityService } from './amenity.service';
import { CreateAmenityDto, UpdateAmenityDto, QueryAmenityDto } from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
} from '../../common/responses';

@ApiTags('Amenities')
@Controller('amenities')
export class AmenityController {
    constructor(private readonly amenityService: AmenityService) { }

    @Post()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('amenity.create')
    @ApiOperation({ summary: 'Tạo tiện ích mới' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async create(
        @Body() dto: CreateAmenityDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.amenityService.create(dto, userId, lang);
        return new CreatedResponse('amenity.create.success', result, 'Tạo tiện ích thành công');
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách tiện ích (public)' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findAll(
        @Query() query: QueryAmenityDto,
    ) {
        // Public endpoint, không có quyền list.all
        const result = await this.amenityService.findAll(query, false);
        return new GetResponse('amenity.list.success', result, 'Lấy danh sách tiện ích thành công');
    }

    @Get('admin')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('amenity.list.all')
    @ApiOperation({ summary: 'Lấy danh sách tiện ích (Admin - bao gồm inactive)' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findAllAdmin(
        @Query() query: QueryAmenityDto,
    ) {
        const result = await this.amenityService.findAll(query, true);
        return new GetResponse('amenity.list.success', result, 'Lấy danh sách tiện ích thành công');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy chi tiết tiện ích (public)' })
    @ApiParam({ name: 'id', description: 'ID của tiện ích', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy tiện ích' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.amenityService.findById(id, lang);
        return new GetResponse('amenity.get.success', result, 'Lấy chi tiết tiện ích thành công');
    }

    @Put(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('amenity.update')
    @ApiOperation({ summary: 'Cập nhật tiện ích' })
    @ApiParam({ name: 'id', description: 'ID của tiện ích', type: 'string' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy tiện ích' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateAmenityDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.amenityService.update(id, dto, userId, lang);
        return new UpdatedResponse('amenity.update.success', result, 'Cập nhật tiện ích thành công');
    }

    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('amenity.delete')
    @ApiOperation({ summary: 'Xóa tiện ích' })
    @ApiParam({ name: 'id', description: 'ID của tiện ích', type: 'string' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy tiện ích' })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.amenityService.delete(id, userId, lang);
        return new DeletedResponse('amenity.delete.success', undefined, 'Xóa tiện ích thành công');
    }
}

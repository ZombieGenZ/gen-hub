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

import { AmenityService } from './amenity.service';
import { CreateAmenityDto, UpdateAmenityDto, QueryAmenityDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
} from '../../common/responses';
import { IAmenity, IPaginatedResponse } from './interfaces';

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
    ): Promise<CreatedResponse<IAmenity>> {
        const result = await this.amenityService.create(dto, userId, lang);
        return new CreatedResponse('amenity.create.success', result, 'Tạo tiện ích thành công');
    }

    @Get()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('amenity.list')
    @ApiOperation({ summary: 'Lấy danh sách tiện ích (Admin)' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findAll(
        @Query() query: QueryAmenityDto,
    ): Promise<GetResponse<IPaginatedResponse<IAmenity>>> {
        const result = await this.amenityService.findAll(query);
        return new GetResponse('amenity.list.success', result, 'Lấy danh sách tiện ích thành công');
    }

    @Get(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('amenity.read')
    @ApiOperation({ summary: 'Lấy chi tiết tiện ích (Admin)' })
    @ApiParam({ name: 'id', description: 'ID của tiện ích', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy tiện ích' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IAmenity>> {
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
    ): Promise<UpdatedResponse<IAmenity>> {
        const result = await this.amenityService.update(id, dto, userId, lang);
        return new UpdatedResponse('amenity.update.success', result, 'Cập nhật tiện ích thành công');
    }

    @Delete('delete/many')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('amenity.delete')
    @ApiOperation({ summary: 'Xóa nhiều tiện ích' })
    @ApiBody({ type: DeleteManyDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy tiện ích' })
    async deleteMany(
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.amenityService.deleteMany(dto.ids, userId, lang);
        return new DeletedResponse('amenity.delete.success', null, 'Xóa nhiều tiện ích thành công');
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
    ): Promise<DeletedResponse<null>> {
        await this.amenityService.delete(id, userId, lang);
        return new DeletedResponse('amenity.delete.success', null, 'Xóa tiện ích thành công');
    }
}

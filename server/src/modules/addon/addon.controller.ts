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

import { AddonService } from './addon.service';
import { CreateAddonDto, UpdateAddonDto, QueryAddonDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
} from '../../common/responses';
import { IAddon, IPaginatedResponse } from './interfaces';

@ApiTags('Addons')
@Controller('addons')
export class AddonController {
    constructor(private readonly addonService: AddonService) { }

    @Post()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('addon.create')
    @ApiOperation({ summary: 'Tạo addon mới' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async create(
        @Body() dto: CreateAddonDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<CreatedResponse<IAddon>> {
        const result = await this.addonService.create(dto, userId, lang);
        return new CreatedResponse('addon.create.success', result, 'Tạo addon thành công');
    }

    @Get()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('addon.list')
    @ApiOperation({ summary: 'Lấy danh sách addon' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findAll(
        @Query() query: QueryAddonDto,
    ): Promise<GetResponse<IPaginatedResponse<IAddon>>> {
        const result = await this.addonService.findAll(query);
        return new GetResponse('addon.list.success', result, 'Lấy danh sách addon thành công');
    }

    @Get('active')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('addon.list')
    @ApiOperation({ summary: 'Lấy tất cả addon active' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findAllActive(): Promise<GetResponse<IAddon[]>> {
        const result = await this.addonService.findAllActive();
        return new GetResponse('addon.list.success', result, 'Lấy danh sách addon active thành công');
    }

    @Get(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('addon.read')
    @ApiOperation({ summary: 'Lấy chi tiết addon' })
    @ApiParam({ name: 'id', description: 'ID của addon', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy addon' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IAddon>> {
        const result = await this.addonService.findById(id, lang);
        return new GetResponse('addon.read.success', result, 'Lấy chi tiết addon thành công');
    }

    @Put(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('addon.update')
    @ApiOperation({ summary: 'Cập nhật addon' })
    @ApiParam({ name: 'id', description: 'ID của addon', type: 'string' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy addon' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateAddonDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<IAddon>> {
        const result = await this.addonService.update(id, dto, userId, lang);
        return new UpdatedResponse('addon.update.success', result, 'Cập nhật addon thành công');
    }

    @Delete('delete/many')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('addon.delete')
    @ApiOperation({ summary: 'Xóa nhiều addon' })
    @ApiBody({ type: DeleteManyDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy addon' })
    async deleteMany(
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.addonService.deleteMany(dto.ids, userId, lang);
        return new DeletedResponse('addon.delete.success', null, 'Xóa nhiều addon thành công');
    }

    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('addon.delete')
    @ApiOperation({ summary: 'Xóa addon' })
    @ApiParam({ name: 'id', description: 'ID của addon', type: 'string' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy addon' })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.addonService.delete(id, userId, lang);
        return new DeletedResponse('addon.delete.success', null, 'Xóa addon thành công');
    }
}

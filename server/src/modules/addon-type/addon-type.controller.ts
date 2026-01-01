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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { AddonTypeService } from './addon-type.service';
import { CreateAddonTypeDto, UpdateAddonTypeDto, QueryAddonTypeDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
} from '../../common/responses/success.response';

@ApiTags('Addon Types')
@ApiBearerAuth()
@Controller('addon-types')
export class AddonTypeController {
    constructor(private readonly addonTypeService: AddonTypeService) { }

    @Post()
    @ApiOperation({ summary: 'Tạo loại addon mới' })
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('addon-type.create')
    async create(
        @Body() dto: CreateAddonTypeDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const addonType = await this.addonTypeService.create(dto, userId, lang);
        return new CreatedResponse('addon-type.created', addonType, 'Đã tạo loại addon thành công');
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách loại addon' })
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('addon-type.list')
    async findAll(
        @Query() query: QueryAddonTypeDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.addonTypeService.findAll(query);
        return new GetResponse('addon-type.list', result, 'Lấy danh sách loại addon thành công');
    }

    @Get('active')
    @ApiOperation({ summary: 'Lấy tất cả loại addon đang hoạt động' })
    @UseGuards(JwtAuthGuard)
    async findAllActive() {
        const result = await this.addonTypeService.findAllActive();
        return new GetResponse('addon-type.active', result, 'Lấy danh sách loại addon thành công');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy chi tiết loại addon' })
    @ApiParam({ name: 'id', description: 'ID loại addon' })
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('addon-type.read')
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const addonType = await this.addonTypeService.findById(id, lang);
        return new GetResponse('addon-type.read', addonType, 'Lấy chi tiết loại addon thành công');
    }

    @Put(':id')
    @ApiOperation({ summary: 'Cập nhật loại addon' })
    @ApiParam({ name: 'id', description: 'ID loại addon' })
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('addon-type.update')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateAddonTypeDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const addonType = await this.addonTypeService.update(id, dto, userId, lang);
        return new UpdatedResponse('addon-type.updated', addonType, 'Đã cập nhật loại addon thành công');
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Xóa loại addon' })
    @ApiParam({ name: 'id', description: 'ID loại addon' })
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('addon-type.delete')
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.addonTypeService.delete(id, userId, lang);
        return new DeletedResponse('addon-type.deleted', null, 'Đã xóa loại addon thành công');
    }

    @Delete('delete/many')
    @ApiOperation({ summary: 'Xóa nhiều loại addon' })
    @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('addon-type.delete')
    async deleteMany(
        @Body('ids') ids: string[],
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.addonTypeService.deleteMany(ids, userId, lang);
        return new DeletedResponse('addon-type.deletedMany', null, 'Đã xóa các loại addon thành công');
    }
}

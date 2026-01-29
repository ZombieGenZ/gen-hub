import {
    Controller,
    Get,
    Put,
    Delete,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { ApiKeyService } from './api-key.service';
import { QueryAdminApiKeyDto, UpdateAdminApiKeyDto } from './dto/api-key.dto';
import { DeleteManyDto } from '../../common/dto';
import { CurrentUser, RequirePermission } from '../../common/decorators';
import { PermissionGuard } from '../../common/guards';
import {
    GetResponse,
    UpdatedResponse,
    DeletedResponse,
    ResponseCode,
} from '../../common/responses';

/**
 * Controller quản lý API Keys cho Admin (toàn hệ thống)
 */
@ApiTags('API Keys')
@ApiBearerAuth()
@Controller('admin/api-keys')
@UseGuards(PermissionGuard)
export class ApiKeyController {
    constructor(private readonly service: ApiKeyService) { }

    @Get()
    @RequirePermission('apikey.admin.list')
    @ApiOperation({ summary: 'Lấy danh sách tất cả API keys (Admin)' })
    async findMany(
        @Query() query: QueryAdminApiKeyDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.getAdminApiKeys(query, lang);
        return new GetResponse(
            ResponseCode.APIKEY_LIST_SUCCESS,
            result,
            'Lấy danh sách API keys thành công',
        );
    }

    @Get(':id')
    @RequirePermission('apikey.admin.read')
    @ApiOperation({ summary: 'Xem chi tiết API key (Admin)' })
    @ApiParam({ name: 'id', description: 'ID API key' })
    async findOne(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.getAdminApiKeyById(id, lang);
        return new GetResponse(
            ResponseCode.APIKEY_DETAIL_SUCCESS,
            result,
            'Lấy chi tiết API key thành công',
        );
    }

    @Put(':id')
    @RequirePermission('apikey.admin.update')
    @ApiOperation({ summary: 'Cập nhật API key (Admin)' })
    @ApiParam({ name: 'id', description: 'ID API key' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateAdminApiKeyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.updateAdminApiKey(id, dto, userId, lang);
        return new UpdatedResponse(
            ResponseCode.APIKEY_UPDATE_SUCCESS,
            result,
            'Cập nhật API key thành công',
        );
    }

    @Delete(':id')
    @RequirePermission('apikey.admin.delete')
    @ApiOperation({ summary: 'Xóa API key (Admin)' })
    @ApiParam({ name: 'id', description: 'ID API key' })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.deleteAdminApiKey(id, userId, lang);
        return new DeletedResponse(
            ResponseCode.APIKEY_DELETE_SUCCESS,
            undefined,
            'Xóa API key thành công',
        );
    }

    @Delete('delete/many')
    @RequirePermission('apikey.admin.delete')
    @ApiOperation({ summary: 'Xóa nhiều API keys (Admin)' })
    @ApiBody({ type: DeleteManyDto })
    async deleteMany(
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.deleteManyAdminApiKeys(dto.ids, userId, lang);
        return new DeletedResponse(
            ResponseCode.APIKEY_DELETE_SUCCESS,
            undefined,
            'Xóa nhiều API keys thành công',
        );
    }
}

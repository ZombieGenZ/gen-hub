import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    ParseUUIDPipe,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiBody } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { OrganizationService } from './organization.service';
import {
    CreateApiKeyDto,
    UpdateApiKeyDto,
} from './dto';
import { DeleteManyDto } from '../../common/dto';
import { CurrentUser, RequirePermission } from '../../common/decorators';
import { PermissionGuard } from '../../common/guards';
import {
    CreatedResponse,
    GetResponse,
    UpdatedResponse,
    DeletedResponse,
    ResponseCode,
} from '../../common/responses';

@ApiTags('Organization API Keys')
@ApiBearerAuth()
@Controller('organizations/:orgId/api-keys')
@UseGuards(PermissionGuard)
export class ApiKeyController {
    constructor(private readonly service: OrganizationService) { }

    @Post()
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Tạo API key mới' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    async create(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Body() dto: CreateApiKeyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.createApiKey(orgId, dto, userId, lang);
        return new CreatedResponse(
            ResponseCode.APIKEY_CREATE_SUCCESS,
            result,
            'Tạo API key thành công. Lưu ý: Key chỉ hiển thị một lần duy nhất.',
        );
    }

    @Get()
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Lấy danh sách API keys' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    async findMany(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.getApiKeys(orgId, userId, lang);
        return new GetResponse(
            ResponseCode.APIKEY_LIST_SUCCESS,
            result,
            'Lấy danh sách API keys thành công',
        );
    }

    @Get(':keyId')
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Lấy chi tiết API key' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiParam({ name: 'keyId', description: 'ID API key' })
    async findOne(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('keyId', ParseUUIDPipe) keyId: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.getApiKeyById(orgId, keyId, userId, lang);
        return new GetResponse(
            ResponseCode.APIKEY_DETAIL_SUCCESS,
            result,
            'Lấy chi tiết API key thành công',
        );
    }

    @Put(':keyId')
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Cập nhật API key' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiParam({ name: 'keyId', description: 'ID API key' })
    async update(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('keyId', ParseUUIDPipe) keyId: string,
        @Body() dto: UpdateApiKeyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.updateApiKey(orgId, keyId, dto, userId, lang);
        return new UpdatedResponse(
            ResponseCode.APIKEY_UPDATE_SUCCESS,
            result,
            'Cập nhật API key thành công',
        );
    }

    @Post(':keyId/reset')
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Reset API key' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiParam({ name: 'keyId', description: 'ID API key' })
    async reset(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('keyId', ParseUUIDPipe) keyId: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const result = await this.service.resetApiKey(orgId, keyId, userId, lang);
        return new UpdatedResponse(
            ResponseCode.APIKEY_RESET_SUCCESS,
            result,
            'Reset API key thành công. Lưu ý: Key mới chỉ hiển thị một lần duy nhất.',
        );
    }

    @Delete(':keyId')
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Xóa API key' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiParam({ name: 'keyId', description: 'ID API key' })
    async delete(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('keyId', ParseUUIDPipe) keyId: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.deleteApiKey(orgId, keyId, userId, lang);
        return new DeletedResponse(
            ResponseCode.APIKEY_DELETE_SUCCESS,
            undefined,
            'Xóa API key thành công',
        );
    }

    @Delete('delete/many')
    @RequirePermission('organization.read')
    @ApiOperation({ summary: 'Xóa nhiều API keys' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiBody({ type: DeleteManyDto })
    async deleteMany(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.service.deleteManyApiKeys(orgId, dto.ids, userId, lang);
        return new DeletedResponse(
            ResponseCode.APIKEY_DELETE_SUCCESS,
            undefined,
            'Xóa nhiều API keys thành công',
        );
    }
}

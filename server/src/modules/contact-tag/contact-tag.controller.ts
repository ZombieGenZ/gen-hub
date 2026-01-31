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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { ContactTagService } from './contact-tag.service';
import { CreateContactTagDto, UpdateContactTagDto, QueryContactTagDto } from './dto';
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
import { ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators/api-common-responses.decorator';

@ApiTags('Contact Tags')
@Controller('admin/contact-tags')
export class ContactTagController {
    constructor(private readonly contactTagService: ContactTagService) { }

    @Post()
    @ApiOperation({
        summary: 'Tạo ContactTag mới',
        description: 'Tạo nhãn gán cho các ticket liên hệ.'
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-tag.create')
    @ApiBody({
        type: CreateContactTagDto,
        description: 'Thông tin tag',
        examples: {
            vip: { summary: 'VIP Customer', value: { name: 'VIP', color: '#FF0000', description: 'Khách hàng VIP' } },
            spam: { summary: 'Spam', value: { name: 'Spam', color: '#CCCCCC', description: 'Tin rác' } }
        }
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo tag thành công',
        schema: {
            example: {
                code: 'contact-tag.created',
                message: 'Đã tạo tag thành công',
                success: true,
                data: { id: '...', name: 'VIP', color: '#FF0000' }
            }
        }
    })
    async create(
        @Body() dto: CreateContactTagDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const tag = await this.contactTagService.create(dto, userId, lang);
        return new CreatedResponse('contact-tag.created', tag, 'Đã tạo tag thành công');
    }

    @Get()
    @ApiOperation({
        summary: 'Lấy danh sách ContactTag',
        description: 'Lấy danh sách các nhãn có phân trang.'
    })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-tag.list')
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'offset', required: false })
    async findAll(
        @Query() query: QueryContactTagDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.contactTagService.findAll(query);
        return new GetResponse('contact-tag.list', result, 'Lấy danh sách tag thành công');
    }

    @Get('active')
    @ApiOperation({
        summary: 'Lấy danh sách ContactTag đang active',
        description: 'Lấy toàn bộ tag đang hoạt động (không phân trang).'
    })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-tag.list')
    async findAllActive() {
        const result = await this.contactTagService.findAllActive();
        return new GetResponse('contact-tag.active', result, 'Lấy danh sách tag active thành công');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy chi tiết ContactTag' })
    @ApiParam({ name: 'id', description: 'ID Tag (UUID)' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-tag.read')
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const tag = await this.contactTagService.findById(id, lang);
        return new GetResponse('contact-tag.read', tag, 'Lấy chi tiết tag thành công');
    }

    @Put(':id')
    @ApiOperation({ summary: 'Cập nhật ContactTag' })
    @ApiParam({ name: 'id', description: 'ID Tag (UUID)' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-tag.update')
    @ApiBody({ type: UpdateContactTagDto })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateContactTagDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const tag = await this.contactTagService.update(id, dto, userId, lang);
        return new UpdatedResponse('contact-tag.updated', tag, 'Đã cập nhật tag thành công');
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Xóa ContactTag' })
    @ApiParam({ name: 'id', description: 'ID Tag (UUID)' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-tag.delete')
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.contactTagService.delete(id, userId, lang);
        return new DeletedResponse('contact-tag.deleted', null, 'Đã xóa tag thành công');
    }

    @Delete('delete/many')
    @ApiOperation({ summary: 'Xóa nhiều ContactTag' })
    @ApiAuthResponses()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('contact-tag.delete')
    @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
    async deleteMany(
        @Body('ids') ids: string[],
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.contactTagService.deleteMany(ids, userId, lang);
        return new DeletedResponse('contact-tag.deletedMany', null, 'Đã xóa các tag thành công');
    }
}

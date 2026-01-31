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
import { FaqService } from './faq.service';
import { CreateFaqDto, UpdateFaqDto, QueryFaqDto } from './dto';
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

@ApiTags('FAQs')
@Controller('faqs')
export class FaqController {
    constructor(private readonly faqService: FaqService) { }

    @Post()
    @ApiOperation({ summary: 'Tạo FAQ mới' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.create')
    async create(
        @Body() dto: CreateFaqDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const faq = await this.faqService.create(dto, userId, lang);
        return new CreatedResponse('faq.created', faq, 'Đã tạo FAQ thành công');
    }

    @Get()
    @ApiOperation({ summary: 'Lấy danh sách FAQ' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.list')
    async findAll(
        @Query() query: QueryFaqDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.faqService.findAll(query);
        return new GetResponse('faq.list', result, 'Lấy danh sách FAQ thành công');
    }

    @Get('public')
    @ApiOperation({ summary: 'Lấy danh sách FAQ công khai (không cần đăng nhập)' })
    async findAllPublic() {
        const result = await this.faqService.findAllPublic();
        return new GetResponse('faq.public', result, 'Lấy danh sách FAQ thành công');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Lấy chi tiết FAQ' })
    @ApiParam({ name: 'id', description: 'ID FAQ' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.read')
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const faq = await this.faqService.findById(id, lang);
        return new GetResponse('faq.read', faq, 'Lấy chi tiết FAQ thành công');
    }

    @Put(':id')
    @ApiOperation({ summary: 'Cập nhật FAQ' })
    @ApiParam({ name: 'id', description: 'ID FAQ' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.update')
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateFaqDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const faq = await this.faqService.update(id, dto, userId, lang);
        return new UpdatedResponse('faq.updated', faq, 'Đã cập nhật FAQ thành công');
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Xóa FAQ' })
    @ApiParam({ name: 'id', description: 'ID FAQ' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.delete')
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.faqService.delete(id, userId, lang);
        return new DeletedResponse('faq.deleted', null, 'Đã xóa FAQ thành công');
    }

    @Delete('delete/many')
    @ApiOperation({ summary: 'Xóa nhiều FAQ' })
    @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.delete')
    async deleteMany(
        @Body('ids') ids: string[],
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.faqService.deleteMany(ids, userId, lang);
        return new DeletedResponse('faq.deletedMany', null, 'Đã xóa các FAQ thành công');
    }
}

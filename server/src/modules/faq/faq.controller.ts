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
    ApiBearerAuth,
    ApiParam,
    ApiBody,
    ApiQuery,
    ApiResponse,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { FaqService } from './faq.service';
import { CreateFaqDto, UpdateFaqDto, QueryFaqDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
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
    @ApiOperation({
        summary: 'Tạo FAQ mới',
        description: 'Tạo một câu hỏi thường gặp mới. Có thể đặt category, priority và trạng thái công khai. Yêu cầu quyền `faq.create`.',
    })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.create')
    @ApiBody({
        type: CreateFaqDto,
        examples: {
            service: {
                summary: 'FAQ về dịch vụ',
                value: {
                    question: 'Thời gian thuê kho tối thiểu là bao lâu?',
                    answer: 'Thời gian thuê kho tối thiểu là 1 tháng.',
                    category: 'service',
                    priority: 1,
                    is_public: true,
                },
            },
        },
    })
    @ApiResponse({ status: 201, description: 'Tạo FAQ thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async create(
        @Body() dto: CreateFaqDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const faq = await this.faqService.create(dto, userId, lang);
        return new CreatedResponse('faq.created', faq, 'Đã tạo FAQ thành công');
    }

    @Get()
    @ApiOperation({
        summary: 'Lấy danh sách FAQ',
        description: 'Lấy danh sách tất cả FAQ với phân trang và lọc. Yêu cầu quyền `faq.list`.',
    })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.list')
    @ApiQuery({ name: 'limit', required: false, type: Number, example: 20 })
    @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
    @ApiQuery({ name: 'category', required: false, type: String })
    @ApiQuery({ name: 'is_public', required: false, type: Boolean })
    @ApiResponse({ status: 200, description: 'Danh sách FAQ' })
    @ApiAuthResponses()
    async findAll(
        @Query() query: QueryFaqDto,
        @I18nLang() lang: string,
    ) {
        const result = await this.faqService.findAll(query);
        return new GetResponse('faq.list', result, 'Lấy danh sách FAQ thành công');
    }

    @Get('public')
    @ApiOperation({
        summary: 'Lấy danh sách FAQ công khai (không cần đăng nhập)',
        description: 'Lấy danh sách FAQ đang public để hiển thị cho người dùng. API public không cần đăng nhập.',
    })
    @ApiResponse({ status: 200, description: 'Danh sách FAQ công khai' })
    async findAllPublic() {
        const result = await this.faqService.findAllPublic();
        return new GetResponse('faq.public', result, 'Lấy danh sách FAQ thành công');
    }

    @Get(':id')
    @ApiOperation({
        summary: 'Lấy chi tiết FAQ',
        description: 'Lấy thông tin chi tiết của một FAQ. Yêu cầu quyền `faq.read`.',
    })
    @ApiParam({ name: 'id', description: 'ID FAQ (UUID)' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.read')
    @ApiResponse({ status: 200, description: 'Chi tiết FAQ' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiAuthResponses()
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ) {
        const faq = await this.faqService.findById(id, lang);
        return new GetResponse('faq.read', faq, 'Lấy chi tiết FAQ thành công');
    }

    @Put(':id')
    @ApiOperation({
        summary: 'Cập nhật FAQ',
        description: 'Cập nhật nội dung, category, priority của FAQ. Yêu cầu quyền `faq.update`.',
    })
    @ApiParam({ name: 'id', description: 'ID FAQ (UUID)' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.update')
    @ApiBody({ type: UpdateFaqDto })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateFaqDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const faq = await this.faqService.update(id, dto, userId, lang);
        return new UpdatedResponse('faq.updated', faq, 'Đã cập nhật FAQ thành công');
    }

    @Delete('delete/many')
    @ApiOperation({
        summary: 'Xóa nhiều FAQ',
        description: 'Xóa nhiều FAQ cùng lúc. Yêu cầu quyền `faq.delete`.',
    })
    @ApiBody({ schema: { type: 'object', properties: { ids: { type: 'array', items: { type: 'string' } } } } })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.delete')
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async deleteMany(
        @Body('ids') ids: string[],
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.faqService.deleteMany(ids, userId, lang);
        return new DeletedResponse('faq.deletedMany', null, 'Đã xóa các FAQ thành công');
    }

    @Delete(':id')
    @ApiOperation({
        summary: 'Xóa FAQ',
        description: 'Xóa một FAQ. Yêu cầu quyền `faq.delete`.',
    })
    @ApiParam({ name: 'id', description: 'ID FAQ (UUID)' })
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('faq.delete')
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiAuthResponses()
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.faqService.delete(id, userId, lang);
        return new DeletedResponse('faq.deleted', null, 'Đã xóa FAQ thành công');
    }
}

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
import { CategoryService } from './category.service';
import { CreateCategoryDto, UpdateCategoryDto, QueryCategoryDto } from './dto';
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
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators/api-common-responses.decorator';

@ApiTags('Categories')
@Controller('categories')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo danh mục mới',
    description:
      'Tạo một danh mục bài viết mới. Yêu cầu quyền `category.create`.',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('category.create')
  @ApiBody({
    type: CreateCategoryDto,
    description: 'Thông tin danh mục',
    examples: {
      tech: {
        summary: 'Danh mục Công nghệ',
        value: {
          name: 'Công nghệ',
          slug: 'cong-nghe',
          description: 'Tin tức và bài viết về công nghệ',
          parent_id: null,
          order: 1,
          is_active: true,
        },
      },
      nodejs: {
        summary: 'Danh mục con NodeJS',
        value: {
          name: 'NodeJS',
          slug: 'nodejs',
          description: 'Lập trình NodeJS',
          parent_id: 'parent-uuid-here',
          order: 2,
          is_active: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo danh mục thành công',
    schema: {
      example: {
        code: 'category.created',
        message: 'Đã tạo danh mục thành công',
        success: true,
        data: {
          id: '...',
          name: 'Công nghệ',
          slug: 'cong-nghe',
          created_at: '...',
        },
      },
    },
  })
  async create(
    @Body() dto: CreateCategoryDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const category = await this.categoryService.create(dto, userId, lang);
    return new CreatedResponse(
      'category.created',
      category,
      'Đã tạo danh mục thành công',
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách danh mục (Admin)',
    description:
      'Lấy danh sách danh mục có phân trang và lọc (Cho Admin). Yêu cầu quyền `category.list`.',
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('category.list')
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng item mỗi trang',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Vị trí bắt đầu',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Tìm kiếm theo tên/slug',
    example: 'tech',
  })
  @ApiQuery({
    name: 'is_active',
    required: false,
    type: Boolean,
    description: 'Lọc theo trạng thái',
    example: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
    schema: {
      example: {
        code: 'category.list',
        message: 'Lấy danh sách danh mục thành công',
        success: true,
        data: {
          items: [{ id: '...', name: 'Công nghệ', slug: 'cong-nghe' }],
          total: 10,
        },
      },
    },
  })
  async findAll(@Query() query: QueryCategoryDto, @I18nLang() lang: string) {
    const result = await this.categoryService.findAll(query);
    return new GetResponse(
      'category.list',
      result,
      'Lấy danh sách danh mục thành công',
    );
  }

  @Get('active')
  @ApiOperation({
    summary: 'Lấy danh sách danh mục active (Public)',
    description:
      'Lấy toàn bộ danh mục đang hoạt động (thường dùng cho menu, dropdown). Không cần đăng nhập.',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách thành công',
    schema: {
      example: {
        code: 'category.active',
        message: 'Lấy danh sách danh mục thành công',
        success: true,
        data: [
          {
            id: '...',
            name: 'Công nghệ',
            children: [{ id: '...', name: 'NodeJS' }],
          },
        ],
      },
    },
  })
  async findAllActive(@I18nLang() lang?: string) {
    // Note: Code cũ không có tham số lang trong findAllActive nhưng trong service có thể có?
    // Check code cũ: async findAllActive() (line 62)
    // Check service call: this.categoryService.findAllActive() (line 63)
    // Mới thêm @I18nLang() lang: string vào tham số vì bài toán yêu cầu multilingual?
    // Nhưng nếu service không hỗ trợ thì sẽ lỗi.
    // Tạm thời giữ nguyên logic code cũ: ko truyền tham số nếu chưa chắc chắn.
    // Nhưng trong thay đổi trước đó tôi có thấy `async findAllActive(@I18nLang() lang: string)`
    // Hãy check lại step 14: `async findAllActive() { const result = await this.categoryService.findAllActive(); ... }`
    // Vậy nên tôi sẽ giữ nguyên signature `findAllActive()` không tham số để an toàn.
    const result = await this.categoryService.findAllActive();
    return new GetResponse(
      'category.active',
      result,
      'Lấy danh sách danh mục thành công',
    );
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết danh mục',
    description:
      'Lấy thông tin chi tiết một danh mục. Yêu cầu quyền `category.read`.',
  })
  @ApiAuthResponses()
  @ApiParam({
    name: 'id',
    description: 'ID danh mục (UUID)',
    example: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('category.read')
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết thành công',
    schema: {
      example: {
        code: 'category.read',
        message: 'Lấy chi tiết danh mục thành công',
        success: true,
        data: {
          id: '...',
          name: 'Công nghệ',
          slug: 'cong-nghe',
          description: '...',
        },
      },
    },
  })
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ) {
    const category = await this.categoryService.findById(id, lang);
    return new GetResponse(
      'category.read',
      category,
      'Lấy chi tiết danh mục thành công',
    );
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật danh mục',
    description:
      'Cập nhật thông tin danh mục. Yêu cầu quyền `category.update`.',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiParam({
    name: 'id',
    description: 'ID danh mục (UUID)',
    example: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('category.update')
  @ApiBody({
    type: UpdateCategoryDto,
    description: 'Thông tin cập nhật',
    examples: {
      rename: {
        summary: 'Đổi tên danh mục',
        value: { name: 'Công nghệ mới', slug: 'cong-nghe-moi' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
    schema: {
      example: {
        code: 'category.updated',
        message: 'Đã cập nhật danh mục thành công',
        success: true,
        data: {
          id: '...',
          name: 'Công nghệ mới',
          updated_at: '...',
        },
      },
    },
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const category = await this.categoryService.update(id, dto, userId, lang);
    return new UpdatedResponse(
      'category.updated',
      category,
      'Đã cập nhật danh mục thành công',
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa danh mục',
    description:
      'Xóa (soft delete) một danh mục. Yêu cầu quyền `category.delete`.',
  })
  @ApiAuthResponses()
  @ApiParam({
    name: 'id',
    description: 'ID danh mục (UUID)',
    example: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
  })
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('category.delete')
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
    schema: {
      example: {
        code: 'category.deleted',
        message: 'Đã xóa danh mục thành công',
        success: true,
        data: null,
      },
    },
  })
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.categoryService.delete(id, userId, lang);
    return new DeletedResponse(
      'category.deleted',
      null,
      'Đã xóa danh mục thành công',
    );
  }

  @Delete('delete/many')
  @ApiOperation({
    summary: 'Xóa nhiều danh mục',
    description:
      'Xóa (soft delete) nhiều danh mục cùng lúc. Yêu cầu quyền `category.delete`.',
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('category.delete')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        ids: {
          type: 'array',
          items: { type: 'string', format: 'uuid' },
          description: 'Danh sách ID danh mục cần xóa',
          example: ['b6f48b98-5c49-436f-87a3-e4d355038e24', 'id2'],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
    schema: {
      example: {
        code: 'category.deletedMany',
        message: 'Đã xóa các danh mục thành công',
        success: true,
        data: null,
      },
    },
  })
  async deleteMany(
    @Body('ids') ids: string[],
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.categoryService.deleteMany(ids, userId, lang);
    return new DeletedResponse(
      'category.deletedMany',
      null,
      'Đã xóa các danh mục thành công',
    );
  }
}

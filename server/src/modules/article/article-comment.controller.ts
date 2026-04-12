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
  ApiQuery,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { ArticleCommentService } from './article-comment.service';
import { CreateCommentDto, UpdateCommentDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import {
  GetResponse,
  CreatedResponse,
  UpdatedResponse,
  DeletedResponse,
  OkResponse,
} from '../../common/responses/success.response';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
  ApiUnauthorizedResponses,
} from '../../common/decorators/api-common-responses.decorator';

@ApiTags('Article Comments')
@Controller('articles')
export class ArticleCommentController {
  constructor(private readonly commentService: ArticleCommentService) {}

  @Get(':id/comments')
  @ApiOperation({
    summary: 'Lấy danh sách comments của bài viết',
    description: 'Lấy danh sách bình luận của một bài viết, hỗ trợ phân trang.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bài viết (UUID)',
    example: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng comment mỗi trang',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Vị trí bắt đầu',
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách comment thành công',
    schema: {
      example: {
        code: 'article.comments',
        message: 'Lấy comments thành công',
        success: true,
        data: {
          items: [
            {
              id: '...',
              content: 'Bài viết rất hay!',
              author: { name: 'User 1', avatar: '...' },
              created_at: '2023-11-01T10:00:00.000Z',
            },
          ],
          total: 5,
        },
      },
    },
  })
  async getComments(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit: number = 10,
    @Query('offset') offset: number = 0,
    @I18nLang() lang: string,
  ) {
    const result = await this.commentService.getComments(
      id,
      +limit,
      +offset,
      lang,
    );
    return new GetResponse(
      'article.comments',
      result,
      'Lấy comments thành công',
    );
  }

  @Post(':id/comments')
  @ApiOperation({
    summary: 'Tạo comment',
    description: 'Người dùng (hoặc khách) tạo bình luận mới cho bài viết.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bài viết (UUID)',
    example: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
  })
  @ApiValidationErrorResponse()
  @UseGuards(OptionalJwtAuthGuard)
  @ApiBody({
    type: CreateCommentDto,
    description: 'Nội dung bình luận',
    examples: {
      user_comment: {
        summary: 'Bình luận thông thường',
        value: {
          content: 'Bài viết rất hữu ích, cảm ơn tác giả!',
          parent_id: null,
        },
      },
      reply_comment: {
        summary: 'Trả lời bình luận khác',
        value: {
          content: 'Tôi đồng ý với quan điểm này.',
          parent_id: 'c7d23a...',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo comment thành công',
    schema: {
      example: {
        code: 'article.comment_created',
        message: 'Đã tạo comment thành công',
        success: true,
        data: {
          id: '...',
          content: 'Bài viết rất hữu ích...',
          status: 'PENDING',
        },
      },
    },
  })
  async createComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser('userId') userId: string | null,
    @I18nLang() lang: string,
  ) {
    const comment = await this.commentService.createComment(
      id,
      dto,
      userId,
      lang,
    );
    return new CreatedResponse(
      'article.comment_created',
      comment,
      'Đã tạo comment thành công',
    );
  }

  @Put(':id/comments/:commentId')
  @ApiOperation({
    summary: 'Cập nhật comment',
    description:
      'Cập nhật nội dung bình luận (Chỉ tác giả mới được sửa). Yêu cầu quyền `article.read` để truy cập API.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bài viết (UUID)',
    example: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
  })
  @ApiParam({
    name: 'commentId',
    description: 'ID của comment (UUID)',
    example: 'c7d23a...',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('article.read')
  @ApiBody({
    type: UpdateCommentDto,
    description: 'Nội dung cập nhật',
    examples: {
      update: {
        summary: 'Sửa nội dung comment',
        value: { content: 'Nội dung đã chỉnh sửa...' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
    schema: {
      example: {
        code: 'article.comment_updated',
        message: 'Đã cập nhật comment thành công',
        success: true,
        data: {
          id: '...',
          content: 'Nội dung đã chỉnh sửa...',
          updated_at: '2023-11-01T10:05:00.000Z',
        },
      },
    },
  })
  async updateComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    // Admin check được thực hiện trong service dựa trên userId
    const comment = await this.commentService.updateComment(
      id,
      commentId,
      dto,
      userId,
      false,
      lang,
    );
    return new UpdatedResponse(
      'article.comment_updated',
      comment,
      'Đã cập nhật comment thành công',
    );
  }

  @Delete(':id/comments/:commentId')
  @ApiOperation({
    summary: 'Xóa comment',
    description:
      'Xóa bình luận (Chỉ tác giả mới được xóa). Yêu cầu quyền `article.read`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bài viết (UUID)',
    example: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
  })
  @ApiParam({
    name: 'commentId',
    description: 'ID của comment (UUID)',
    example: 'c7d23a...',
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('article.read')
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
    schema: {
      example: {
        code: 'article.comment_deleted',
        message: 'Đã xóa comment thành công',
        success: true,
        data: null,
      },
    },
  })
  async deleteComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    // User chỉ có thể xóa comment của mình, admin xóa qua route /admin/*
    await this.commentService.deleteComment(id, commentId, userId, false, lang);
    return new DeletedResponse(
      'article.comment_deleted',
      null,
      'Đã xóa comment thành công',
    );
  }

  @Post(':id/comments/:commentId/approve')
  @ApiOperation({
    summary: 'Duyệt comment (Admin)',
    description:
      'Admin duyệt hiển thị một bình luận. Yêu cầu quyền `article.admin`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bài viết (UUID)',
    example: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
  })
  @ApiParam({
    name: 'commentId',
    description: 'ID của comment (UUID)',
    example: 'c7d23a...',
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('article.admin')
  @ApiResponse({
    status: 200,
    description: 'Duyệt thành công',
    schema: {
      example: {
        code: 'article.comment_approved',
        message: 'Đã duyệt comment',
        success: true,
        data: null,
      },
    },
  })
  async approveComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.commentService.approveComment(id, commentId, userId, lang);
    return new OkResponse('article.comment_approved', null, 'Đã duyệt comment');
  }

  @Post(':id/comments/:commentId/reject')
  @ApiOperation({
    summary: 'Từ chối comment (Admin)',
    description:
      'Admin từ chối hiển thị một bình luận. Yêu cầu quyền `article.admin`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bài viết (UUID)',
    example: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
  })
  @ApiParam({
    name: 'commentId',
    description: 'ID của comment (UUID)',
    example: 'c7d23a...',
  })
  @ApiAuthResponses()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, PermissionGuard)
  @RequirePermission('article.admin')
  @ApiResponse({
    status: 200,
    description: 'Từ chối thành công',
    schema: {
      example: {
        code: 'article.comment_rejected',
        message: 'Đã từ chối comment',
        success: true,
        data: null,
      },
    },
  })
  async rejectComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.commentService.rejectComment(id, commentId, userId, lang);
    return new OkResponse(
      'article.comment_rejected',
      null,
      'Đã từ chối comment',
    );
  }

  @Get(':id/comments/:commentId/history')
  @ApiOperation({
    summary: 'Lấy lịch sử chỉnh sửa comment',
    description: 'Xem lịch sử các thay đổi của comment (Công khai).',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của bài viết (UUID)',
    example: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
  })
  @ApiParam({
    name: 'commentId',
    description: 'ID của comment (UUID)',
    example: 'c7d23a...',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy lịch sử thành công',
    schema: {
      example: {
        code: 'article.comment_history',
        message: 'Lấy lịch sử chỉnh sửa thành công',
        success: true,
        data: [{ content: 'Nội dung cũ...', created_at: '...' }],
      },
    },
  })
  async getCommentHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @I18nLang() lang: string,
  ) {
    const history = await this.commentService.getCommentEditHistory(
      id,
      commentId,
      lang,
    );
    return new GetResponse(
      'article.comment_history',
      history,
      'Lấy lịch sử chỉnh sửa thành công',
    );
  }
}

/**
 * Admin controller for comment moderation
 */
@ApiTags('Admin - Article Comments')
@Controller('admin/articles')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ArticleCommentAdminController {
  constructor(private readonly commentService: ArticleCommentService) {}

  @Put(':articleId/comments/:commentId')
  @ApiOperation({
    summary: 'Admin sửa comment',
    description:
      'Admin sửa nội dung comment (có lưu lịch sử). Yêu cầu quyền `article.admin`.',
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  @ApiParam({
    name: 'articleId',
    description: 'ID của bài viết (UUID)',
    example: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
  })
  @ApiParam({
    name: 'commentId',
    description: 'ID của comment (UUID)',
    example: 'c7d23a...',
  })
  @ApiBearerAuth('JWT-auth')
  @RequirePermission('article.admin')
  @ApiBody({
    type: UpdateCommentDto,
    description: 'Nội dung cập nhật',
    examples: {
      admin_update: {
        summary: 'Admin sửa nội dung violation',
        value: {
          content: '[Nội dung đã bị ẩn do vi phạm tiêu chuẩn cộng đồng]',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
    schema: {
      example: {
        code: 'article.comment_updated',
        message: 'Đã cập nhật comment thành công',
        success: true,
        data: {
          id: '...',
          content: '[Nội dung đã bị ẩn...]',
          updated_at: '2023-11-01T10:05:00.000Z',
        },
      },
    },
  })
  async adminUpdateComment(
    @Param('articleId', ParseUUIDPipe) articleId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const comment = await this.commentService.updateComment(
      articleId,
      commentId,
      dto,
      userId,
      true,
      lang,
    );
    return new UpdatedResponse(
      'article.comment_updated',
      comment,
      'Đã cập nhật comment thành công',
    );
  }

  @Delete(':articleId/comments/:commentId')
  @ApiOperation({
    summary: 'Admin xóa comment',
    description:
      'Admin xóa hoàn toàn comment khỏi hệ thống (cả soft delete). Yêu cầu quyền `article.admin`.',
  })
  @ApiAuthResponses()
  @ApiParam({
    name: 'articleId',
    description: 'ID của bài viết (UUID)',
    example: 'b6f48b98-5c49-436f-87a3-e4d355038e24',
  })
  @ApiParam({
    name: 'commentId',
    description: 'ID của comment (UUID)',
    example: 'c7d23a...',
  })
  @ApiBearerAuth('JWT-auth')
  @RequirePermission('article.admin')
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
    schema: {
      example: {
        code: 'article.comment_deleted',
        message: 'Đã xóa comment thành công',
        success: true,
        data: null,
      },
    },
  })
  async adminDeleteComment(
    @Param('articleId', ParseUUIDPipe) articleId: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    await this.commentService.deleteComment(
      articleId,
      commentId,
      userId,
      true,
      lang,
    );
    return new DeletedResponse(
      'article.comment_deleted',
      null,
      'Đã xóa comment thành công',
    );
  }
}

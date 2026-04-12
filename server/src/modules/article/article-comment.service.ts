import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { I18nService } from 'nestjs-i18n';
import { ArticleRepository } from './article.repository';
import { RedisService } from '../redis/redis.service';
import { WebsocketGateway } from '../websocket/websocket.gateway';
import { SystemLogService } from '../system-log/system-log.service';
import { CreateCommentDto, UpdateCommentDto } from './dto';
import { IArticleCommentPaginatedResponse } from './interfaces';

@Injectable()
export class ArticleCommentService {
  private readonly commentCacheTTL: number;
  private readonly autoApprove: boolean;

  constructor(
    private readonly repository: ArticleRepository,
    private readonly redisService: RedisService,
    private readonly websocketGateway: WebsocketGateway,
    private readonly systemLogService: SystemLogService,
    private readonly configService: ConfigService,
    private readonly i18n: I18nService,
  ) {
    this.commentCacheTTL = this.configService.get<number>(
      'REDIS_ARTICLE_COMMENT_CACHE_TTL',
      60,
    );
    this.autoApprove =
      this.configService.get<string>('AUTO_APPROVE_COMMENTS', 'true') ===
      'true';
  }

  /**
   * Lấy danh sách comments của bài viết
   */
  async getComments(
    articleId: string,
    limit: number = 10,
    offset: number = 0,
    lang: string,
  ): Promise<IArticleCommentPaginatedResponse> {
    const article = await this.repository.findById(articleId);
    if (!article) {
      throw new NotFoundException(
        this.i18n.t('article.errors.not_found', { lang }),
      );
    }

    const cacheKey = `article:comments:${articleId}:${limit}:${offset}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const [comments, total] = await Promise.all([
      this.repository.findCommentsByArticle(articleId, {
        skip: offset,
        take: limit,
      }),
      this.repository.countComments(articleId),
    ]);

    const hasMore = offset + comments.length < total;
    const result = { items: comments, total, limit, offset, hasMore };

    await this.redisService.set(
      cacheKey,
      JSON.stringify(result),
      this.commentCacheTTL,
    );

    return result;
  }

  /**
   * Tạo comment (đăng nhập hoặc guest)
   */
  async createComment(
    articleId: string,
    dto: CreateCommentDto,
    userId: string | null,
    lang: string,
  ) {
    const article = await this.repository.findById(articleId);
    if (!article) {
      throw new NotFoundException(
        this.i18n.t('article.errors.not_found', { lang }),
      );
    }

    // Kiểm tra bài viết có cho phép comment không
    if (!article.allow_comments) {
      throw new BadRequestException(
        this.i18n.t('article.errors.comments_disabled', { lang }),
      );
    }

    // Nếu không đăng nhập thì phải có guest_name và guest_email
    if (!userId && (!dto.guest_name || !dto.guest_email)) {
      throw new BadRequestException(
        this.i18n.t('article.errors.guest_info_required', { lang }),
      );
    }

    // Kiểm tra parent_id nếu reply
    if (dto.parent_id) {
      const parentComment = await this.repository.findCommentById(
        dto.parent_id,
      );
      if (!parentComment || parentComment.article_id !== articleId) {
        throw new NotFoundException(
          this.i18n.t('article.errors.comment_not_found', { lang }),
        );
      }
    }

    const comment = await this.repository.createComment({
      article: { connect: { id: articleId } },
      parent: dto.parent_id ? { connect: { id: dto.parent_id } } : undefined,
      user_id: userId,
      guest_name: dto.guest_name,
      guest_email: dto.guest_email,
      content: dto.content,
      status: this.autoApprove ? 'APPROVED' : 'PENDING',
    });

    // Invalidate cache
    await this.invalidateCommentsCache(articleId);

    // Emit socket event
    this.websocketGateway.server.emit('article:comment', {
      articleId,
      commentId: comment.id,
      action: 'created',
      userId,
      timestamp: new Date().toISOString(),
    });

    return comment;
  }

  /**
   * Cập nhật comment (owner hoặc admin)
   */
  async updateComment(
    articleId: string,
    commentId: string,
    dto: UpdateCommentDto,
    userId: string,
    isAdmin: boolean,
    lang: string,
  ) {
    const comment = await this.repository.findCommentById(commentId);
    if (!comment || comment.article_id !== articleId) {
      throw new NotFoundException(
        this.i18n.t('article.errors.comment_not_found', { lang }),
      );
    }

    // Kiểm tra quyền sửa (owner hoặc admin)
    if (!isAdmin && comment.user_id !== userId) {
      throw new ForbiddenException(
        this.i18n.t('article.errors.comment_forbidden', { lang }),
      );
    }

    // Lưu lịch sử chỉnh sửa
    await this.repository.createCommentEditHistory({
      comment: { connect: { id: commentId } },
      edited_by: userId,
      old_content: comment.content,
      new_content: dto.content,
      edit_reason: dto.edit_reason,
    });

    const updated = await this.repository.updateComment(commentId, {
      content: dto.content,
    });

    // Invalidate cache
    await this.invalidateCommentsCache(articleId);

    // Log nếu admin sửa
    if (isAdmin && comment.user_id !== userId) {
      this.systemLogService.info(
        'Article',
        'ADMIN_EDIT_COMMENT',
        `Admin chỉnh sửa comment`,
        {
          userId,
          metaData: { commentId, articleId, reason: dto.edit_reason },
        },
      );
    }

    // Emit socket event
    this.websocketGateway.server.emit('article:comment', {
      articleId,
      commentId: comment.id,
      action: 'updated',
      editedBy: userId,
      timestamp: new Date().toISOString(),
    });

    return updated;
  }

  /**
   * Xóa comment (owner hoặc admin)
   */
  async deleteComment(
    articleId: string,
    commentId: string,
    userId: string,
    isAdmin: boolean,
    lang: string,
  ) {
    const comment = await this.repository.findCommentById(commentId);
    if (!comment || comment.article_id !== articleId) {
      throw new NotFoundException(
        this.i18n.t('article.errors.comment_not_found', { lang }),
      );
    }

    // Kiểm tra quyền xóa (owner hoặc admin)
    if (!isAdmin && comment.user_id !== userId) {
      throw new ForbiddenException(
        this.i18n.t('article.errors.comment_forbidden', { lang }),
      );
    }

    await this.repository.softDeleteComment(commentId, userId);

    // Invalidate cache
    await this.invalidateCommentsCache(articleId);

    // Log nếu admin xóa
    if (isAdmin && comment.user_id !== userId) {
      this.systemLogService.info(
        'Article',
        'ADMIN_DELETE_COMMENT',
        `Admin xóa comment`,
        {
          userId,
          metaData: { commentId, articleId },
        },
      );
    }

    // Emit socket event
    this.websocketGateway.server.emit('article:comment', {
      articleId,
      commentId,
      action: 'deleted',
      deletedBy: userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Duyệt comment (admin)
   */
  async approveComment(
    articleId: string,
    commentId: string,
    userId: string,
    lang: string,
  ) {
    const comment = await this.repository.findCommentById(commentId);
    if (!comment || comment.article_id !== articleId) {
      throw new NotFoundException(
        this.i18n.t('article.errors.comment_not_found', { lang }),
      );
    }

    await this.repository.updateComment(commentId, { status: 'APPROVED' });

    await this.invalidateCommentsCache(articleId);

    this.systemLogService.info('Article', 'APPROVE_COMMENT', `Duyệt comment`, {
      userId,
      metaData: { commentId, articleId },
    });

    // Emit socket event
    this.websocketGateway.server.emit('article:comment', {
      articleId,
      commentId,
      action: 'approved',
      approvedBy: userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Từ chối comment (admin)
   */
  async rejectComment(
    articleId: string,
    commentId: string,
    userId: string,
    lang: string,
  ) {
    const comment = await this.repository.findCommentById(commentId);
    if (!comment || comment.article_id !== articleId) {
      throw new NotFoundException(
        this.i18n.t('article.errors.comment_not_found', { lang }),
      );
    }

    await this.repository.updateComment(commentId, { status: 'REJECTED' });

    await this.invalidateCommentsCache(articleId);

    this.systemLogService.info('Article', 'REJECT_COMMENT', `Từ chối comment`, {
      userId,
      metaData: { commentId, articleId },
    });

    // Emit socket event
    this.websocketGateway.server.emit('article:comment', {
      articleId,
      commentId,
      action: 'rejected',
      rejectedBy: userId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Lấy lịch sử chỉnh sửa comment
   */
  async getCommentEditHistory(
    articleId: string,
    commentId: string,
    lang: string,
  ) {
    const comment = await this.repository.findCommentById(commentId);
    if (!comment || comment.article_id !== articleId) {
      throw new NotFoundException(
        this.i18n.t('article.errors.comment_not_found', { lang }),
      );
    }

    return this.repository.getCommentEditHistory(commentId);
  }

  private async invalidateCommentsCache(articleId: string) {
    await this.redisService.delByPattern(`article:comments:${articleId}:*`);
  }
}

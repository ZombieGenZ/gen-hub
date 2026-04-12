import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  IArticleWithRelations,
  IArticleEmoji,
  IArticleCommentWithRelations,
} from './interfaces';

@Injectable()
export class ArticleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: Prisma.ArticleCreateInput,
  ): Promise<IArticleWithRelations> {
    return this.prisma.article.create({
      data,
      include: {
        categories: {
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        _count: {
          select: { reactions: true, comments: true },
        },
      },
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ArticleWhereInput;
    orderBy?: Prisma.ArticleOrderByWithRelationInput;
  }): Promise<IArticleWithRelations[]> {
    const { skip, take, where, orderBy } = params;
    return this.prisma.article.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        categories: {
          where: { is_deleted: false },
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        _count: {
          select: { reactions: true, comments: true },
        },
      },
    });
  }

  async count(where?: Prisma.ArticleWhereInput): Promise<number> {
    return this.prisma.article.count({ where });
  }

  async findById(id: string): Promise<IArticleWithRelations | null> {
    return this.prisma.article.findFirst({
      where: { id, is_deleted: false },
      include: {
        categories: {
          where: { is_deleted: false },
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        _count: {
          select: { reactions: true, comments: true },
        },
      },
    });
  }

  async findBySlug(slug: string): Promise<IArticleWithRelations | null> {
    return this.prisma.article.findFirst({
      where: { slug, is_deleted: false },
      include: {
        categories: {
          where: { is_deleted: false },
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        _count: {
          select: { reactions: true, comments: true },
        },
      },
    });
  }

  /**
   * Lấy tất cả article đang published
   */
  async findAllPublished(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ArticleWhereInput;
  }): Promise<IArticleWithRelations[]> {
    const { skip, take, where } = params;
    return this.prisma.article.findMany({
      skip,
      take,
      where: {
        ...where,
        is_active: true,
        is_deleted: false,
        status: 'PUBLISHED',
      },
      orderBy: [{ is_pinned: 'desc' }, { published_at: 'desc' }],
      include: {
        categories: {
          where: { is_deleted: false },
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        _count: {
          select: { reactions: true, comments: true },
        },
      },
    });
  }

  async update(
    id: string,
    data: Prisma.ArticleUpdateInput,
  ): Promise<IArticleWithRelations> {
    return this.prisma.article.update({
      where: { id },
      data,
      include: {
        categories: {
          where: { is_deleted: false },
          include: {
            category: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        _count: {
          select: { reactions: true, comments: true },
        },
      },
    });
  }

  async softDelete(id: string, userId: string): Promise<IArticleWithRelations> {
    return this.prisma.$transaction(async (tx) => {
      // Soft delete article
      const article = await tx.article.update({
        where: { id },
        data: {
          is_deleted: true,
          is_active: false,
          deleted_at: new Date(),
          deleted_by: userId,
        },
      });

      // Soft delete article categories
      await tx.articleCategory.updateMany({
        where: { article_id: id },
        data: {
          is_deleted: true,
          is_active: false,
          deleted_at: new Date(),
          deleted_by: userId,
        },
      });

      return article;
    });
  }

  async findByIds(ids: string[]): Promise<IArticleWithRelations[]> {
    return this.prisma.article.findMany({
      where: { id: { in: ids }, is_deleted: false },
    });
  }

  async softDeleteMany(ids: string[], userId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await tx.article.updateMany({
        where: { id: { in: ids } },
        data: {
          is_deleted: true,
          is_active: false,
          deleted_at: new Date(),
          deleted_by: userId,
        },
      });

      await tx.articleCategory.updateMany({
        where: { article_id: { in: ids } },
        data: {
          is_deleted: true,
          is_active: false,
          deleted_at: new Date(),
          deleted_by: userId,
        },
      });
    });
  }

  async checkSlugExists(slug: string, excludeId?: string): Promise<boolean> {
    const article = await this.prisma.article.findFirst({
      where: {
        slug,
        is_deleted: false,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return !!article;
  }

  // Quản lý ArticleCategory mapping
  async updateCategories(
    articleId: string,
    categoryIds: string[],
    userId: string,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Soft delete existing mappings
      await tx.articleCategory.updateMany({
        where: { article_id: articleId },
        data: {
          is_deleted: true,
          is_active: false,
          deleted_at: new Date(),
          deleted_by: userId,
        },
      });

      // Create new mappings
      if (categoryIds.length > 0) {
        await tx.articleCategory.createMany({
          data: categoryIds.map((categoryId, index) => ({
            article_id: articleId,
            category_id: categoryId,
            order: index,
            created_by: userId,
          })),
          skipDuplicates: true,
        });
      }
    });
  }

  // Tăng view_count
  async incrementViewCount(id: string): Promise<void> {
    await this.prisma.article.update({
      where: { id },
      data: { view_count: { increment: 1 } },
    });
  }

  // Tăng share_count
  async incrementShareCount(id: string): Promise<void> {
    await this.prisma.article.update({
      where: { id },
      data: { share_count: { increment: 1 } },
    });
  }

  // Cập nhật like_count (sync với số lượng reactions)
  async syncLikeCount(id: string): Promise<void> {
    const count = await this.prisma.articleReaction.count({
      where: { article_id: id },
    });
    await this.prisma.article.update({
      where: { id },
      data: { like_count: count },
    });
  }

  // Lịch sử chỉnh sửa
  async createEditHistory(
    data: Prisma.ArticleEditHistoryCreateInput,
  ): Promise<void> {
    await this.prisma.articleEditHistory.create({ data });
  }

  async getEditHistory(articleId: string): Promise<any[]> {
    return this.prisma.articleEditHistory.findMany({
      where: { article_id: articleId },
      orderBy: { created_at: 'desc' },
    });
  }

  // Emoji operations
  async findAllEmojis(): Promise<IArticleEmoji[]> {
    return this.prisma.articleEmoji.findMany({
      where: { is_active: true },
      orderBy: { order: 'asc' },
      include: {
        _count: { select: { reactions: true } },
      },
    });
  }

  async findEmojiById(id: string): Promise<IArticleEmoji | null> {
    return this.prisma.articleEmoji.findFirst({
      where: { id, is_active: true },
    });
  }

  // Reaction operations
  async findReaction(
    articleId: string,
    userId: string | null,
    emojiId: string,
    guestIdentifier?: string,
  ) {
    return this.prisma.articleReaction.findFirst({
      where: {
        article_id: articleId,
        emoji_id: emojiId,
        ...(userId
          ? { user_id: userId }
          : { guest_identifier: guestIdentifier }),
      },
    });
  }

  async createReaction(data: Prisma.ArticleReactionCreateInput) {
    return this.prisma.articleReaction.create({ data });
  }

  async deleteReaction(id: string): Promise<void> {
    await this.prisma.articleReaction.delete({ where: { id } });
  }

  async getReactionSummary(articleId: string) {
    const reactions = await this.prisma.articleReaction.groupBy({
      by: ['emoji_id'],
      where: { article_id: articleId },
      _count: { emoji_id: true },
    });

    const emojis = await this.prisma.articleEmoji.findMany({
      where: { id: { in: reactions.map((r) => r.emoji_id) } },
    });

    return reactions.map((r) => {
      const emoji = emojis.find((e) => e.id === r.emoji_id);
      return {
        emoji_id: r.emoji_id,
        emoji: emoji?.emoji || '',
        name: emoji?.name || '',
        count: r._count.emoji_id,
      };
    });
  }

  // Comment operations
  async createComment(
    data: Prisma.ArticleCommentCreateInput,
  ): Promise<IArticleCommentWithRelations> {
    return this.prisma.articleComment.create({
      data,
      include: {
        replies: {
          where: { is_deleted: false },
          orderBy: { created_at: 'asc' },
        },
      },
    });
  }

  async findCommentById(
    id: string,
  ): Promise<IArticleCommentWithRelations | null> {
    return this.prisma.articleComment.findFirst({
      where: { id, is_deleted: false },
      include: {
        replies: {
          where: { is_deleted: false },
          orderBy: { created_at: 'asc' },
        },
        edit_history: {
          orderBy: { created_at: 'desc' },
        },
      },
    });
  }

  async findCommentsByArticle(
    articleId: string,
    params: {
      skip?: number;
      take?: number;
    },
  ): Promise<IArticleCommentWithRelations[]> {
    return this.prisma.articleComment.findMany({
      where: {
        article_id: articleId,
        parent_id: null, // Chỉ lấy top-level comments
        is_deleted: false,
        status: 'APPROVED',
      },
      skip: params.skip,
      take: params.take,
      orderBy: { created_at: 'desc' },
      include: {
        replies: {
          where: { is_deleted: false, status: 'APPROVED' },
          orderBy: { created_at: 'asc' },
        },
      },
    });
  }

  async countComments(articleId: string): Promise<number> {
    return this.prisma.articleComment.count({
      where: {
        article_id: articleId,
        parent_id: null,
        is_deleted: false,
        status: 'APPROVED',
      },
    });
  }

  async updateComment(
    id: string,
    data: Prisma.ArticleCommentUpdateInput,
  ): Promise<IArticleCommentWithRelations> {
    return this.prisma.articleComment.update({
      where: { id },
      data,
    });
  }

  async softDeleteComment(id: string, userId: string): Promise<void> {
    await this.prisma.articleComment.update({
      where: { id },
      data: {
        is_deleted: true,
        is_active: false,
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }

  async createCommentEditHistory(
    data: Prisma.ArticleCommentEditHistoryCreateInput,
  ): Promise<void> {
    await this.prisma.articleCommentEditHistory.create({ data });
  }

  async getCommentEditHistory(commentId: string) {
    return this.prisma.articleCommentEditHistory.findMany({
      where: { comment_id: commentId },
      orderBy: { created_at: 'desc' },
    });
  }
}

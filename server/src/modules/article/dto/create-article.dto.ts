import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  IsUUID,
  IsEnum,
  IsArray,
  IsDateString,
  Matches,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { ArticleStatus, ArticleType } from '@prisma/client';

/**
 * DTO tạo mới Article
 */
export class CreateArticleDto {
  @ApiProperty({
    description: 'Tiêu đề bài viết',
    example: 'Hướng dẫn sử dụng NestJS',
  })
  @IsNotEmpty({
    message: i18nValidationMessage('article.validation.title_required'),
  })
  @IsString({
    message: i18nValidationMessage('article.validation.title_string'),
  })
  title: string;

  @ApiProperty({ description: 'Slug URL', example: 'huong-dan-su-dung-nestjs' })
  @IsNotEmpty({
    message: i18nValidationMessage('article.validation.slug_required'),
  })
  @IsString({
    message: i18nValidationMessage('article.validation.slug_string'),
  })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: i18nValidationMessage('article.validation.slug_format'),
  })
  slug: string;

  @ApiPropertyOptional({ description: 'Đoạn trích ngắn' })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('article.validation.excerpt_string'),
  })
  excerpt?: string;

  @ApiProperty({ description: 'Nội dung bài viết' })
  @IsNotEmpty({
    message: i18nValidationMessage('article.validation.content_required'),
  })
  @IsString({
    message: i18nValidationMessage('article.validation.content_string'),
  })
  content: string;

  @ApiPropertyOptional({ description: 'URL ảnh thumbnail' })
  @IsOptional()
  @IsString()
  thumbnail_url?: string;

  @ApiPropertyOptional({ description: 'URL ảnh bìa' })
  @IsOptional()
  @IsString()
  cover_image_url?: string;

  @ApiPropertyOptional({
    description: 'Loại bài viết',
    enum: ArticleType,
    default: ArticleType.BLOG,
  })
  @IsOptional()
  @IsEnum(ArticleType, {
    message: i18nValidationMessage('article.validation.type_enum'),
  })
  type?: ArticleType;

  @ApiPropertyOptional({
    description: 'Trạng thái',
    enum: ArticleStatus,
    default: ArticleStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ArticleStatus, {
    message: i18nValidationMessage('article.validation.status_enum'),
  })
  status?: ArticleStatus;

  @ApiPropertyOptional({ description: 'Tên tác giả' })
  @IsOptional()
  @IsString()
  author_name?: string;

  @ApiPropertyOptional({ description: 'Bài viết nổi bật', default: false })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage('article.validation.is_featured_boolean'),
  })
  is_featured?: boolean;

  @ApiPropertyOptional({ description: 'Ghim bài viết', default: false })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage('article.validation.is_pinned_boolean'),
  })
  is_pinned?: boolean;

  @ApiPropertyOptional({ description: 'Cho phép bình luận', default: true })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage('article.validation.allow_comments_boolean'),
  })
  allow_comments?: boolean;

  @ApiPropertyOptional({ description: 'Ngày xuất bản' })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: i18nValidationMessage('article.validation.published_at_date'),
    },
  )
  published_at?: string;

  @ApiPropertyOptional({ description: 'Ngày lên lịch xuất bản' })
  @IsOptional()
  @IsDateString(
    {},
    {
      message: i18nValidationMessage('article.validation.scheduled_at_date'),
    },
  )
  scheduled_at?: string;

  @ApiPropertyOptional({ description: 'Tiêu đề SEO' })
  @IsOptional()
  @IsString()
  seo_title?: string;

  @ApiPropertyOptional({ description: 'Mô tả SEO' })
  @IsOptional()
  @IsString()
  seo_description?: string;

  @ApiPropertyOptional({ description: 'Từ khóa SEO', type: [String] })
  @IsOptional()
  @IsArray({
    message: i18nValidationMessage('article.validation.seo_keywords_array'),
  })
  @IsString({ each: true })
  seo_keywords?: string[];

  @ApiPropertyOptional({ description: 'Danh sách ID chủ đề', type: [String] })
  @IsOptional()
  @IsArray({
    message: i18nValidationMessage('article.validation.category_ids_array'),
  })
  @IsUUID('4', {
    each: true,
    message: i18nValidationMessage('article.validation.category_ids_uuid'),
  })
  category_ids?: string[];
}

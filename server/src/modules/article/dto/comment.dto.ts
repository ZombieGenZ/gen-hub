import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsUUID,
  IsEmail,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO tạo comment (đã đăng nhập hoặc guest)
 */
export class CreateCommentDto {
  @ApiProperty({ description: 'Nội dung bình luận' })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'article.validation.comment_content_required',
    ),
  })
  @IsString({
    message: i18nValidationMessage('article.validation.comment_content_string'),
  })
  content: string;

  @ApiPropertyOptional({ description: 'ID comment cha (nếu reply)' })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage('article.validation.parent_id_uuid'),
  })
  parent_id?: string;

  @ApiPropertyOptional({
    description: 'Tên guest (bắt buộc nếu không đăng nhập)',
  })
  @IsOptional()
  @IsString()
  guest_name?: string;

  @ApiPropertyOptional({
    description: 'Email guest (bắt buộc nếu không đăng nhập)',
  })
  @IsOptional()
  @IsEmail(
    {},
    {
      message: i18nValidationMessage('article.validation.guest_email_format'),
    },
  )
  guest_email?: string;
}

/**
 * DTO cập nhật comment
 */
export class UpdateCommentDto {
  @ApiProperty({ description: 'Nội dung bình luận mới' })
  @IsNotEmpty({
    message: i18nValidationMessage(
      'article.validation.comment_content_required',
    ),
  })
  @IsString({
    message: i18nValidationMessage('article.validation.comment_content_string'),
  })
  content: string;

  @ApiPropertyOptional({ description: 'Lý do chỉnh sửa' })
  @IsOptional()
  @IsString()
  edit_reason?: string;
}

/**
 * DTO thả reaction
 */
export class CreateReactionDto {
  @ApiProperty({ description: 'ID của emoji' })
  @IsNotEmpty({
    message: i18nValidationMessage('article.validation.emoji_id_required'),
  })
  @IsUUID('4', {
    message: i18nValidationMessage('article.validation.emoji_id_uuid'),
  })
  emoji_id: string;

  @ApiPropertyOptional({ description: 'Guest identifier (fingerprint)' })
  @IsOptional()
  @IsString()
  guest_identifier?: string;
}

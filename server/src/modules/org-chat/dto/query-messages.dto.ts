import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryMessagesDto {
  @ApiPropertyOptional({
    description: 'Số lượng tin nhắn tối đa',
    default: 25,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'common.LIMIT_MUST_BE_INTEGER' })
  @Min(1, { message: 'common.LIMIT_MIN_1' })
  @Max(100, { message: 'common.LIMIT_MAX_100' })
  limit?: number = 25;

  @ApiPropertyOptional({
    description: 'Số tin nhắn bỏ qua',
    default: 0,
    minimum: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'common.OFFSET_MUST_BE_INTEGER' })
  @Min(0, { message: 'common.OFFSET_MIN_0' })
  offset?: number = 0;

  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm trong nội dung tin nhắn',
  })
  @IsOptional()
  @IsString({ message: 'common.KEYWORDS_MUST_BE_STRING' })
  keywords?: string;
}

import { IsOptional, IsInt, Min, Max, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ChatCallStatus } from '@prisma/client';

export class QueryCallsDto {
    @ApiPropertyOptional({ description: 'Số lượng cuộc gọi tối đa', default: 25, minimum: 1, maximum: 100 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'common.LIMIT_MUST_BE_INTEGER' })
    @Min(1, { message: 'common.LIMIT_MIN_1' })
    @Max(100, { message: 'common.LIMIT_MAX_100' })
    limit?: number = 25;

    @ApiPropertyOptional({ description: 'Số cuộc gọi bỏ qua', default: 0, minimum: 0 })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'common.OFFSET_MUST_BE_INTEGER' })
    @Min(0, { message: 'common.OFFSET_MIN_0' })
    offset?: number = 0;

    @ApiPropertyOptional({ description: 'Lọc theo trạng thái', enum: ChatCallStatus })
    @IsOptional()
    @IsEnum(ChatCallStatus, { message: 'org-chat.INVALID_CALL_STATUS' })
    status?: ChatCallStatus;
}

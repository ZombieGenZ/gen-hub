import { ApiPropertyOptional } from '@nestjs/swagger';
import { ConsultationRequestSource, ConsultationRequestStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class QueryConsultationRequestDto {
    @ApiPropertyOptional({ default: 1 })
    @IsOptional()
    @Type(() => Number)
    @Min(1)
    page?: number = 1;

    @ApiPropertyOptional({ default: 10 })
    @IsOptional()
    @Type(() => Number)
    @Min(1)
    limit?: number = 10;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({ enum: ConsultationRequestStatus })
    @IsOptional()
    @IsEnum(ConsultationRequestStatus)
    status?: ConsultationRequestStatus;

    @ApiPropertyOptional({ enum: ConsultationRequestSource })
    @IsOptional()
    @IsEnum(ConsultationRequestSource)
    source?: ConsultationRequestSource;

    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    assigned_to?: string;

    @ApiPropertyOptional({ default: 'created_at' })
    @IsOptional()
    @IsString()
    sort_by?: string = 'created_at';

    @ApiPropertyOptional({ default: 'desc' })
    @IsOptional()
    @IsString()
    sort_order?: 'asc' | 'desc' = 'desc';
}

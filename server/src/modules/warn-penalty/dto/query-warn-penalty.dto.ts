import { IsEnum, IsOptional, IsString, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export enum StatusFilter {
    ALL = 'all',
    ACTIVE = 'active',
    INACTIVE = 'inactive',
}

export class QueryWarnPenaltyDto {
    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(1)
    limit?: number;

    @IsOptional()
    @Transform(({ value }) => parseInt(value, 10))
    @IsInt()
    @Min(0)
    offset?: number;

    @IsOptional()
    @IsString()
    keywords?: string;

    @IsOptional()
    @IsEnum(StatusFilter)
    status?: StatusFilter;
}

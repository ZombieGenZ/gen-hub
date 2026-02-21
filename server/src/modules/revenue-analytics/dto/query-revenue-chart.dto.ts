import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { QueryRevenueDto } from './query-revenue.dto';

export enum ChartGranularity {
    DAY = 'DAY',
    WEEK = 'WEEK',
    MONTH = 'MONTH',
}

export class QueryRevenueChartDto extends QueryRevenueDto {
    @ApiPropertyOptional({
        enum: ChartGranularity,
        default: ChartGranularity.MONTH,
        description: 'Độ chi tiết trục thời gian (Ngày/Tuần/Tháng)',
    })
    @IsOptional()
    @IsEnum(ChartGranularity)
    granularity?: ChartGranularity;

    @ApiPropertyOptional({
        description: 'Bao gồm dữ liệu coupon discount (negative bars)',
        default: false,
    })
    @IsOptional()
    include_coupon_discount?: boolean;
}

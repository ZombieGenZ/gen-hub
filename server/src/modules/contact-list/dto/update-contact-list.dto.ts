import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { i18nValidationMessage } from 'nestjs-i18n';

/**
 * DTO cập nhật ContactListEntry
 */
export class UpdateContactListDto {
    @ApiPropertyOptional({ description: 'Giá trị mới', example: 'newemail@example.com' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    value?: string;

    @ApiPropertyOptional({ description: 'Mã quốc gia' })
    @IsOptional()
    @IsString()
    @MaxLength(2)
    country_code?: string;

    @ApiPropertyOptional({ description: 'Mã tỉnh/thành phố' })
    @IsOptional()
    @IsString()
    @MaxLength(10)
    city_code?: string;

    @ApiPropertyOptional({ description: 'Lý do' })
    @IsOptional()
    @IsString()
    @MaxLength(255)
    reason?: string;

    @ApiPropertyOptional({ description: 'Ghi chú' })
    @IsOptional()
    @IsString()
    notes?: string;

    @ApiPropertyOptional({ description: 'Trạng thái' })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === 'true') return true;
        if (value === 'false') return false;
        return value;
    })
    @IsBoolean()
    is_active?: boolean;
}

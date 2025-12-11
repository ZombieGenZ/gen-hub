import { IsOptional, IsString, MaxLength, ValidateNested, IsHexColor } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class UpdateAppColorsDto {
  @ApiPropertyOptional({ description: 'Primary color', example: '#0F766E' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  primary?: string;

  @ApiPropertyOptional({ description: 'Primary light color', example: '#14B8A6' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  primaryLight?: string;

  @ApiPropertyOptional({ description: 'Primary dark color', example: '#0D5A52' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  primaryDark?: string;

  @ApiPropertyOptional({ description: 'Gray 900 color', example: '#1E293B' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  gray900?: string;

  @ApiPropertyOptional({ description: 'Gray 700 color', example: '#334155' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  gray700?: string;

  @ApiPropertyOptional({ description: 'Gray 500 color', example: '#64748B' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  gray500?: string;

  @ApiPropertyOptional({ description: 'Gray 300 color', example: '#CBD5E1' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  gray300?: string;

  @ApiPropertyOptional({ description: 'Gray 100 color', example: '#F1F5F9' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  gray100?: string;

  @ApiPropertyOptional({ description: 'Background color', example: '#F8FAFC' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  background?: string;

  @ApiPropertyOptional({ description: 'Card/Surface color', example: '#FFFFFF' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  cardSurface?: string;

  @ApiPropertyOptional({ description: 'Sidebar background color', example: '#F1F5F9' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  sidebarBg?: string;

  @ApiPropertyOptional({ description: 'Success color', example: '#10B981' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  success?: string;

  @ApiPropertyOptional({ description: 'Warning color', example: '#F59E0B' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  warning?: string;

  @ApiPropertyOptional({ description: 'Error color', example: '#EF4444' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  error?: string;

  @ApiPropertyOptional({ description: 'Info color', example: '#0EA5E9' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  info?: string;

  @ApiPropertyOptional({ description: 'Border color', example: '#E2E8F0' })
  @IsOptional()
  @IsString()
  @IsHexColor()
  border?: string;

  @ApiPropertyOptional({ description: 'Shadow color', example: 'rgba(0, 0, 0, 0.04)' })
  @IsOptional()
  @IsString()
  shadow?: string;
}

export class UpdateAppConfigDto {
  @ApiPropertyOptional({
    description: 'Tên thương hiệu',
    example: 'GEN-HUB',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  brandName?: string;

  @ApiPropertyOptional({
    description: 'Bảng màu theme',
    type: UpdateAppColorsDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateAppColorsDto)
  colors?: UpdateAppColorsDto;
}

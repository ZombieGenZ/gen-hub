import { IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAppConfigDto {
  @ApiPropertyOptional({
    description: 'Tên ứng dụng',
    example: 'GEN-HUB',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  appName?: string;

  @ApiPropertyOptional({
    description: 'Phiên bản ứng dụng',
    example: '1.0.0',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  appVersion?: string;

  @ApiPropertyOptional({
    description: 'Tên team phát triển',
    example: 'TANK ZENITH GEN Development Team',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  teamName?: string;

  @ApiPropertyOptional({
    description: 'Thông tin bản quyền',
    example: '© 2025 TANK ZENITH GEN. All rights reserved.',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  copyright?: string;
}

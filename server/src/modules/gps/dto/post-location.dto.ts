import { IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PostLocationDto {
  @ApiProperty({ description: 'Token phiên GPS (trong URL /track/[token])' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'Vĩ độ (latitude)', example: 10.762622 })
  @IsNumber()
  latitude: number;

  @ApiProperty({ description: 'Kinh độ (longitude)', example: 106.660172 })
  @IsNumber()
  longitude: number;

  @ApiPropertyOptional({ description: 'Độ chính xác GPS (meters)' })
  @IsOptional()
  @IsNumber()
  accuracy?: number;

  @ApiPropertyOptional({ description: 'Tốc độ (km/h)' })
  @IsOptional()
  @IsNumber()
  speed?: number;
}

import { IsOptional, IsArray, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetResourcesDto {
  @ApiPropertyOptional({
    description: 'Filter by specific services',
    example: ['server', 'client'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];
}

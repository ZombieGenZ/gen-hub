import { Body, Controller, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { Public } from '../../common/decorators';
import { AiPluginService } from './ai-plugin.service';

class RecommendWarehousesDto {
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  query: string;

  @IsOptional()
  @IsString()
  context?: string;
}

@ApiTags('Warehouse AI')
@Public()
@Controller('warehouse/ai')
export class WarehouseAiController {
  constructor(private readonly service: AiPluginService) {}

  @Post('recommend')
  @ApiOperation({ summary: 'Gợi ý kho phù hợp bằng ngôn ngữ tự nhiên' })
  @ApiBody({
    schema: {
      properties: {
        query: {
          type: 'string',
          example: 'Tôi cần kho lạnh ~500m² gần cảng, ngân sách 15 triệu/tháng',
        },
      },
      required: ['query'],
    },
  })
  recommend(@Body() dto: RecommendWarehousesDto) {
    return this.service.recommendWarehouses(dto.query);
  }
}

import {
  Controller,
  Get,
  HttpStatus,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { ResourcesService } from './resources.service';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, ApiAuthResponses } from '../../common/decorators';
import { GetResourcesDto } from './dto';
import { buildSuccessResponseSchema } from '../../common/swagger/swagger-response.helper';

const SERVICE_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', example: 'redis' },
    status: { type: 'string', example: 'healthy' },
    cpu: { type: 'number', example: 12.5 },
    memory: { type: 'number', example: 512 },
    responseTime: { type: 'number', example: 8.4 },
  },
};

@ApiTags('Resources')
@Controller('admin/resources')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get('overview')
  @RequirePermission('resources.admin')
  @ApiOperation({
    summary: 'Get resources overview',
    description:
      'Lấy tổng quan tài nguyên hệ thống của tất cả services bao gồm CPU, RAM, dung lượng ổ đĩa và thời gian uptime. Yêu cầu quyền `resources.admin`.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về số liệu tổng quan tài nguyên của hệ thống',
    schema: buildSuccessResponseSchema({
      code: 'resources.overview',
      message: 'Lấy tổng quan tài nguyên thành công',
      dataSchema: {
        type: 'object',
        properties: {
          cpu: {
            type: 'number',
            example: 45.5,
            description: 'Mức sử dụng CPU (%)',
          },
          memory: {
            type: 'number',
            example: 2048,
            description: 'Dung lượng RAM đang dùng (MB)',
          },
          disk: {
            type: 'number',
            example: 50.2,
            description: 'Mức sử dụng dung lượng ổ đĩa (%)',
          },
          uptime: {
            type: 'number',
            example: 86400,
            description: 'Thời gian hệ thống chạy liên tục (giây)',
          },
        },
      },
      dataExample: { cpu: 45.5, memory: 2048, disk: 50.2, uptime: 86400 },
    }),
  })
  @ApiAuthResponses()
  async getOverview() {
    const overview = await this.resourcesService.getResourcesOverview();
    return {
      success: true,
      data: overview,
    };
  }

  @Get('stats')
  @RequirePermission('resources.admin')
  @ApiOperation({
    summary: 'Get all services metrics',
    description:
      'Lấy metrics chi tiết của tất cả services hoặc chỉ một nhóm services được chỉ định qua query `services`. Yêu cầu quyền `resources.admin`.',
  })
  @ApiQuery({
    name: 'services',
    required: false,
    isArray: true,
    type: String,
    description: 'Danh sách service cần lọc, ví dụ: redis, prisma, coze',
    example: ['redis', 'prisma'],
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về metrics chi tiết của các services cùng phần tổng quan',
    schema: buildSuccessResponseSchema({
      code: 'resources.stats',
      message: 'Lấy metrics services thành công',
      dataSchema: {
        type: 'object',
        properties: {
          services: { type: 'array', items: SERVICE_SCHEMA },
          overview: {
            type: 'object',
            properties: {
              cpu: { type: 'number', example: 45.5 },
              memory: { type: 'number', example: 2048 },
              disk: { type: 'number', example: 50.2 },
              uptime: { type: 'number', example: 86400 },
            },
          },
        },
      },
      dataExample: {
        services: [
          {
            name: 'redis',
            status: 'healthy',
            cpu: 12.5,
            memory: 512,
            responseTime: 8.4,
          },
          {
            name: 'prisma',
            status: 'healthy',
            cpu: 10.2,
            memory: 768,
            responseTime: 14.1,
          },
        ],
        overview: { cpu: 45.5, memory: 2048, disk: 50.2, uptime: 86400 },
      },
    }),
  })
  @ApiAuthResponses()
  async getStats(@Query() query: GetResourcesDto) {
    const [services, overview] = await Promise.all([
      this.resourcesService.getAllServicesMetrics(query.services),
      this.resourcesService.getResourcesOverview(),
    ]);

    return {
      success: true,
      data: {
        services,
        overview,
      },
    };
  }

  @Get('service/:serviceName')
  @RequirePermission('resources.admin')
  @ApiOperation({
    summary: 'Get specific service metrics',
    description:
      'Lấy metrics của một service cụ thể như Redis, Prisma, Coze hoặc Discord để chẩn đoán nhanh trạng thái vận hành. Yêu cầu quyền `resources.admin`.',
  })
  @ApiParam({
    name: 'serviceName',
    description: 'Tên service cần xem metrics',
    example: 'redis',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Trả về metrics chi tiết của service được yêu cầu',
    schema: buildSuccessResponseSchema({
      code: 'resources.service',
      message: 'Lấy metrics service thành công',
      dataSchema: SERVICE_SCHEMA,
      dataExample: {
        name: 'redis',
        status: 'healthy',
        cpu: 12.5,
        memory: 512,
        responseTime: 8.4,
      },
    }),
  })
  @ApiAuthResponses()
  async getServiceMetrics(@Param('serviceName') serviceName: string) {
    const metrics = await this.resourcesService.getServiceMetrics(
      serviceName as any,
    );
    return {
      success: true,
      data: metrics,
    };
  }
}

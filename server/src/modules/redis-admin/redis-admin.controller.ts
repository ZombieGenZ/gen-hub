import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RedisAdminService } from './redis-admin.service';
import { CreateCacheDto } from './dto/create-cache.dto';
import { BulkCacheDto } from './dto/bulk-cache.dto';
import { BulkKeysDto } from './dto/bulk-keys.dto';
import { UpdateCacheDto } from './dto/update-cache.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import {
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators/api-common-responses.decorator';
import {
  CreatedResponse,
  DeletedResponse,
  GetResponse,
  UpdatedResponse,
} from '../../common/responses/success.response';
import { ResponseCode } from '../../common/responses/response-code.enum';
import { I18n, I18nContext } from 'nestjs-i18n';

@ApiTags('Redis Admin')
@ApiBearerAuth('JWT-auth')
@Controller('redis-admin')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiAuthResponses()
export class RedisAdminController {
  constructor(private readonly redisAdminService: RedisAdminService) { }

  @Post('cache')
  @RequirePermission('redis.manage')
  @ApiOperation({
    summary: 'Thêm 1 cache entry vào Redis',
    description:
      'Tạo mới một cache entry với key, value và TTL tùy chọn. Nếu key đã tồn tại, giá trị sẽ bị ghi đè. Yêu cầu quyền `redis.manage`.',
  })
  @ApiBody({
    type: CreateCacheDto,
    description: 'Dữ liệu cache entry cần tạo',
    examples: {
      simple_string: {
        summary: 'Cache giá trị chuỗi đơn giản',
        description: 'Tạo cache không có TTL - tồn tại vĩnh viễn cho đến khi bị xóa thủ công',
        value: {
          key: 'greeting_message',
          value: 'Xin chào, GEN-HUB!',
        },
      },
      with_ttl: {
        summary: 'Cache có TTL (1 giờ)',
        description: 'Tạo cache với thời gian sống 3600 giây (1 giờ). Sau thời gian này cache sẽ tự động bị xóa',
        value: {
          key: 'user:session:abc123',
          value: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          ttl: 3600,
        },
      },
      json_value: {
        summary: 'Cache giá trị JSON (serialize dưới dạng string)',
        description: 'Lưu object JSON đã stringify. Khi đọc ra cần JSON.parse()',
        value: {
          key: 'config:app:v1',
          value: '{"brandName":"GEN-HUB","primaryColor":"#0F766E"}',
          ttl: 86400,
        },
      },
      session_cache: {
        summary: 'Cache phiên đăng nhập',
        description: 'Lưu trữ thông tin phiên người dùng với TTL 30 phút',
        value: {
          key: 'session:user:550e8400',
          value: '{"userId":"550e8400","role":"admin","email":"admin@gen-hub.dev"}',
          ttl: 1800,
        },
      },
      rate_limit_cache: {
        summary: 'Cache rate limit',
        description: 'Lưu trữ bộ đếm rate limit với TTL 60 giây',
        value: {
          key: 'rate_limit:ip:192.168.1.1',
          value: '5',
          ttl: 60,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo cache entry thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'REDIS_ADMIN_CACHE_CREATE_SUCCESS' },
        message: { type: 'string', example: 'Thêm cache thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Key của cache vừa được tạo', example: 'user:session:abc123' },
          },
        },
      },
      example: {
        code: 'REDIS_ADMIN_CACHE_CREATE_SUCCESS',
        message: 'Thêm cache thành công',
        success: true,
        data: { key: 'user:session:abc123' },
      },
    },
  })
  @ApiValidationErrorResponse()
  async addCache(
    @Body() dto: CreateCacheDto,
    @I18n() i18n: I18nContext,
  ) {
    const data = await this.redisAdminService.addCache(dto);
    return new CreatedResponse(
      ResponseCode.REDIS_ADMIN_CACHE_CREATE_SUCCESS,
      data,
      i18n.t('redis-admin.cache_create_success'),
    );
  }

  @Post('cache/bulk')
  @RequirePermission('redis.manage')
  @ApiOperation({
    summary: 'Thêm nhiều cache entries vào Redis cùng lúc',
    description:
      'Tạo mới nhiều cache entries đồng thời bằng Promise.all. Các key đã tồn tại sẽ bị ghi đè. Phù hợp để khởi tạo hàng loạt cache khi deploy hoặc seed dữ liệu. Yêu cầu quyền `redis.manage`.',
  })
  @ApiBody({
    type: BulkCacheDto,
    description: 'Danh sách các cache entries cần tạo',
    examples: {
      bulk_simple: {
        summary: 'Tạo nhiều cache đơn giản không TTL',
        description: 'Tạo các cache entry cơ bản không có thời gian hết hạn',
        value: {
          items: [
            { key: 'feature:dark_mode', value: 'true' },
            { key: 'feature:ai_reply', value: 'false' },
            { key: 'feature:maintenance', value: 'false' },
          ],
        },
      },
      bulk_with_ttl: {
        summary: 'Tạo nhiều cache có TTL khác nhau',
        description: 'Mỗi entry có TTL riêng biệt theo nhu cầu',
        value: {
          items: [
            { key: 'otp:user:001', value: '123456', ttl: 300 },
            { key: 'otp:user:002', value: '789012', ttl: 300 },
            { key: 'token:refresh:abc', value: 'eyJhbGci...', ttl: 604800 },
          ],
        },
      },
      bulk_config_seed: {
        summary: 'Seed cấu hình hệ thống vào cache',
        description: 'Khởi tạo các giá trị cấu hình quan trọng vào Redis khi khởi động hệ thống',
        value: {
          items: [
            { key: 'config:max_upload_size', value: '10485760', ttl: 86400 },
            { key: 'config:allowed_origins', value: 'https://gen-hub.dev,https://admin.gen-hub.dev', ttl: 86400 },
            { key: 'config:smtp_host', value: 'smtp.gmail.com', ttl: 86400 },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo nhiều cache entries thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'REDIS_ADMIN_CACHE_BULK_CREATE_SUCCESS' },
        message: { type: 'string', example: 'Thêm nhiều cache thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Số lượng cache entries đã được tạo', example: 3 },
          },
        },
      },
      example: {
        code: 'REDIS_ADMIN_CACHE_BULK_CREATE_SUCCESS',
        message: 'Thêm nhiều cache thành công',
        success: true,
        data: { count: 3 },
      },
    },
  })
  @ApiValidationErrorResponse()
  async addBulkCache(
    @Body() dto: BulkCacheDto,
    @I18n() i18n: I18nContext,
  ) {
    const data = await this.redisAdminService.addBulkCache(dto);
    return new CreatedResponse(
      ResponseCode.REDIS_ADMIN_CACHE_BULK_CREATE_SUCCESS,
      data,
      i18n.t('redis-admin.cache_bulk_create_success'),
    );
  }

  @Delete('cache/all')
  @RequirePermission('redis.manage')
  @ApiOperation({
    summary: '⚠️ Xóa toàn bộ cache Redis (Flush DB)',
    description:
      '**NGUY HIỂM**: Xóa toàn bộ dữ liệu trong Redis database hiện tại (FLUSHDB). Thao tác này **không thể hoàn tác**. Tất cả cache bao gồm sessions, OTP, rate limits, config cache sẽ bị xóa sạch. Chỉ sử dụng khi thực sự cần thiết (ví dụ: debug môi trường dev, reset toàn bộ hệ thống). Yêu cầu quyền `redis.manage`.',
  })
  @ApiResponse({
    status: 200,
    description: 'Flush toàn bộ Redis DB thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'REDIS_ADMIN_CACHE_CLEAR_SUCCESS' },
        message: { type: 'string', example: 'Xóa toàn bộ cache thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'object', nullable: true, example: null },
      },
      example: {
        code: 'REDIS_ADMIN_CACHE_CLEAR_SUCCESS',
        message: 'Xóa toàn bộ cache thành công',
        success: true,
        data: null,
      },
    },
  })
  async clearAllCache(@I18n() i18n: I18nContext) {
    await this.redisAdminService.clearAllCache();
    return new DeletedResponse(
      ResponseCode.REDIS_ADMIN_CACHE_CLEAR_SUCCESS,
      null,
      i18n.t('redis-admin.cache_clear_success'),
    );
  }

  @Get('cache')
  @RequirePermission('redis.manage')
  @ApiOperation({
    summary: 'Lấy danh sách tất cả các cache keys',
    description:
      'Lấy danh sách tất cả các cache keys hiện có trong Redis, kèm theo value và TTL. Có thể filter theo pattern. Yêu cầu quyền `redis.manage`.',
  })
  @ApiQuery({
    name: 'pattern',
    description: 'Pattern để filter keys (ví dụ: user:*). Mặc định là *',
    required: false,
    example: 'user:*',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách cache thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'REDIS_ADMIN_CACHE_LIST_SUCCESS' },
        message: { type: 'string', example: 'Lấy danh sách cache thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              key: { type: 'string', example: 'user:session:abc123' },
              value: { type: 'string', example: '{"userId":"123"}' },
              ttl: { type: 'number', example: 3600 },
            },
          },
        },
      },
    },
  })
  async getAllCache(
    @Query('pattern') pattern: string = '*',
    @I18n() i18n: I18nContext,
  ) {
    const data = await this.redisAdminService.getAllCache(pattern);
    return new GetResponse(
      ResponseCode.REDIS_ADMIN_CACHE_LIST_SUCCESS,
      data,
      i18n.t('redis-admin.cache_list_success'),
    );
  }

  @Get('cache/:key')
  @RequirePermission('redis.manage')
  @ApiOperation({
    summary: 'Lấy chi tiết 1 cache entry theo key',
    description:
      'Lấy value và TTL của một cache entry cụ thể. Yêu cầu quyền `redis.manage`.',
  })
  @ApiParam({
    name: 'key',
    description: 'Key của cache entry cần lấy',
    example: 'user:session:abc123',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết cache thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'REDIS_ADMIN_CACHE_GET_SUCCESS' },
        message: { type: 'string', example: 'Lấy chi tiết cache thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            key: { type: 'string', example: 'user:session:abc123' },
            value: { type: 'string', example: '{"userId":"123"}' },
            ttl: { type: 'number', example: 3600 },
          },
        },
      },
    },
  })
  async getCacheByKey(
    @Param('key') key: string,
    @I18n() i18n: I18nContext,
  ) {
    const data = await this.redisAdminService.getCacheByKey(key);
    return new GetResponse(
      ResponseCode.REDIS_ADMIN_CACHE_GET_SUCCESS,
      data,
      i18n.t('redis-admin.cache_get_success'),
    );
  }

  // ==================== DELETE /cache/bulk ====================
  @Delete('cache/bulk')
  @RequirePermission('redis.manage')
  @ApiOperation({
    summary: 'Xóa nhiều cache entries theo danh sách keys',
    description:
      'Xóa đồng thời nhiều cache entries theo danh sách keys được cung cấp. Keys không tồn tại sẽ được bỏ qua (không báo lỗi). Trả về số lượng keys thực sự đã bị xóa. Yêu cầu quyền `redis.manage`.',
  })
  @ApiBody({
    type: BulkKeysDto,
    description: 'Danh sách các keys cần xóa khỏi Redis',
    examples: {
      delete_user_sessions: {
        summary: 'Xóa nhiều phiên đăng nhập của user',
        description: 'Xóa tất cả sessions của nhiều user cùng lúc (ví dụ: force logout)',
        value: {
          keys: [
            'session:user:550e8400',
            'session:user:661f9511',
            'session:user:772g0622',
          ],
        },
      },
      delete_module_cache: {
        summary: 'Xóa cache của một module',
        description: 'Xóa toàn bộ cache liên quan đến module posts',
        value: {
          keys: [
            'posts:list:page1',
            'posts:list:page2',
            'posts:detail:123',
            'posts:detail:456',
          ],
        },
      },
      delete_otp_cache: {
        summary: 'Xóa cache OTP đã sử dụng',
        description: 'Dọn dẹp các OTP cache sau khi xác thực thành công',
        value: {
          keys: [
            'otp:email:user@gen-hub.dev',
            'otp:phone:0783504540',
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa nhiều cache entries thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'REDIS_ADMIN_CACHE_BULK_DELETE_SUCCESS' },
        message: { type: 'string', example: 'Xóa nhiều cache thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Số lượng keys thực sự đã bị xóa', example: 3 },
          },
        },
      },
      example: {
        code: 'REDIS_ADMIN_CACHE_BULK_DELETE_SUCCESS',
        message: 'Xóa nhiều cache thành công',
        success: true,
        data: { count: 3 },
      },
    },
  })
  @ApiValidationErrorResponse()
  async removeBulkCache(
    @Body() dto: BulkKeysDto,
    @I18n() i18n: I18nContext,
  ) {
    const data = await this.redisAdminService.removeBulkCache(dto.keys);
    return new DeletedResponse(
      ResponseCode.REDIS_ADMIN_CACHE_BULK_DELETE_SUCCESS,
      data,
      i18n.t('redis-admin.cache_bulk_delete_success'),
    );
  }

  @Delete('cache/:key')
  @RequirePermission('redis.manage')
  @ApiOperation({
    summary: 'Xóa 1 cache entry theo key',
    description:
      'Xóa một cache entry cụ thể khỏi Redis theo key. Nếu key không tồn tại, thao tác vẫn thành công (idempotent). Yêu cầu quyền `redis.manage`.',
  })
  @ApiParam({
    name: 'key',
    description: 'Key của cache entry cần xóa',
    example: 'user:session:abc123',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa cache entry thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'REDIS_ADMIN_CACHE_DELETE_SUCCESS' },
        message: { type: 'string', example: 'Xóa cache thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'object', nullable: true, example: null },
      },
      example: {
        code: 'REDIS_ADMIN_CACHE_DELETE_SUCCESS',
        message: 'Xóa cache thành công',
        success: true,
        data: null,
      },
    },
  })
  async removeCache(
    @Param('key') key: string,
    @I18n() i18n: I18nContext,
  ) {
    await this.redisAdminService.removeCache(key);
    return new DeletedResponse(
      ResponseCode.REDIS_ADMIN_CACHE_DELETE_SUCCESS,
      null,
      i18n.t('redis-admin.cache_delete_success'),
    );
  }

  @Patch('cache/bulk')
  @RequirePermission('redis.manage')
  @ApiOperation({
    summary: 'Chỉnh sửa nhiều cache entries cùng lúc',
    description:
      'Cập nhật value và/hoặc TTL của nhiều cache entries đồng thời bằng Promise.all. Nếu key chưa tồn tại, sẽ tự động tạo mới (upsert behavior). Yêu cầu quyền `redis.manage`.',
  })
  @ApiBody({
    type: BulkCacheDto,
    description: 'Danh sách các cache entries cần cập nhật',
    examples: {
      extend_ttl: {
        summary: 'Gia hạn TTL cho nhiều sessions',
        description: 'Gia hạn thời gian sống của nhiều phiên đăng nhập cùng lúc',
        value: {
          items: [
            { key: 'session:user:001', value: '{"userId":"001","role":"user"}', ttl: 7200 },
            { key: 'session:user:002', value: '{"userId":"002","role":"admin"}', ttl: 7200 },
          ],
        },
      },
      update_feature_flags: {
        summary: 'Cập nhật feature flags',
        description: 'Bật/tắt nhiều tính năng cùng lúc qua cache',
        value: {
          items: [
            { key: 'feature:dark_mode', value: 'true' },
            { key: 'feature:ai_reply', value: 'true' },
            { key: 'feature:maintenance', value: 'false' },
          ],
        },
      },
      update_config_cache: {
        summary: 'Cập nhật cache cấu hình',
        description: 'Refresh cache cấu hình hệ thống sau khi thay đổi settings',
        value: {
          items: [
            { key: 'config:max_upload_size', value: '20971520', ttl: 86400 },
            { key: 'config:rate_limit_window', value: '60', ttl: 86400 },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật nhiều cache entries thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'REDIS_ADMIN_CACHE_BULK_UPDATE_SUCCESS' },
        message: { type: 'string', example: 'Cập nhật nhiều cache thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            count: { type: 'number', description: 'Số lượng cache entries đã được cập nhật', example: 3 },
          },
        },
      },
      example: {
        code: 'REDIS_ADMIN_CACHE_BULK_UPDATE_SUCCESS',
        message: 'Cập nhật nhiều cache thành công',
        success: true,
        data: { count: 3 },
      },
    },
  })
  @ApiValidationErrorResponse()
  async editBulkCache(
    @Body() dto: BulkCacheDto,
    @I18n() i18n: I18nContext,
  ) {
    const data = await this.redisAdminService.editBulkCache(dto);
    return new UpdatedResponse(
      ResponseCode.REDIS_ADMIN_CACHE_BULK_UPDATE_SUCCESS,
      data,
      i18n.t('redis-admin.cache_bulk_update_success'),
    );
  }

  @Patch('cache/:key')
  @RequirePermission('redis.manage')
  @ApiOperation({
    summary: 'Chỉnh sửa 1 cache entry theo key',
    description:
      'Cập nhật value và/hoặc TTL của một cache entry cụ thể. Nếu key chưa tồn tại, sẽ tự động tạo mới (upsert behavior). Chỉ gửi các field cần thay đổi. Yêu cầu quyền `redis.manage`.',
  })
  @ApiParam({
    name: 'key',
    description: 'Key của cache entry cần chỉnh sửa',
    example: 'user:session:abc123',
    required: true,
  })
  @ApiBody({
    type: UpdateCacheDto,
    description: 'Dữ liệu cần cập nhật cho cache entry',
    examples: {
      update_value_only: {
        summary: 'Chỉ cập nhật value, giữ nguyên TTL',
        description: 'Thay đổi giá trị của cache mà không ảnh hưởng đến TTL hiện tại',
        value: {
          value: 'new_value_here',
        },
      },
      update_with_new_ttl: {
        summary: 'Cập nhật value và gia hạn TTL',
        description: 'Thay đổi giá trị và đặt lại thời gian sống mới (3600 giây)',
        value: {
          value: '{"userId":"550e8400","role":"admin","lastActive":"2026-04-27T07:00:00Z"}',
          ttl: 3600,
        },
      },
      update_json_value: {
        summary: 'Cập nhật JSON config trong cache',
        description: 'Refresh cache cấu hình với giá trị mới, TTL 24 giờ',
        value: {
          value: '{"brandName":"GEN-HUB Pro","primaryColor":"#6366F1","enableAiReply":true}',
          ttl: 86400,
        },
      },
      reset_ttl_long: {
        summary: 'Gia hạn TTL dài hạn (7 ngày)',
        description: 'Gia hạn cache tồn tại 7 ngày, giữ nguyên giá trị',
        value: {
          value: 'keep_existing_value',
          ttl: 604800,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật cache entry thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'REDIS_ADMIN_CACHE_UPDATE_SUCCESS' },
        message: { type: 'string', example: 'Cập nhật cache thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            key: { type: 'string', description: 'Key của cache entry vừa được cập nhật', example: 'user:session:abc123' },
          },
        },
      },
      example: {
        code: 'REDIS_ADMIN_CACHE_UPDATE_SUCCESS',
        message: 'Cập nhật cache thành công',
        success: true,
        data: { key: 'user:session:abc123' },
      },
    },
  })
  @ApiValidationErrorResponse()
  async editCache(
    @Param('key') key: string,
    @Body() dto: UpdateCacheDto,
    @I18n() i18n: I18nContext,
  ) {
    const data = await this.redisAdminService.editCache(key, dto);
    return new UpdatedResponse(
      ResponseCode.REDIS_ADMIN_CACHE_UPDATE_SUCCESS,
      data,
      i18n.t('redis-admin.cache_update_success'),
    );
  }
}

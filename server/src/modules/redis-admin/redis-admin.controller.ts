import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
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
  constructor(private readonly redisAdminService: RedisAdminService) {}

  @Post('cache')
  @RequirePermission('redis.manage')
  @ApiOperation({
    summary: 'Thêm 1 cache entry',
    description: 'Yêu cầu quyền `redis.manage`.',
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
    summary: 'Thêm nhiều cache entries',
    description: 'Yêu cầu quyền `redis.manage`.',
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
    summary: 'Xóa toàn bộ cache (Flush DB)',
    description: 'Yêu cầu quyền `redis.manage`. Thận trọng khi sử dụng!',
  })
  async clearAllCache(@I18n() i18n: I18nContext) {
    await this.redisAdminService.clearAllCache();
    return new DeletedResponse(
      ResponseCode.REDIS_ADMIN_CACHE_CLEAR_SUCCESS,
      null,
      i18n.t('redis-admin.cache_clear_success'),
    );
  }

  @Delete('cache/bulk')
  @RequirePermission('redis.manage')
  @ApiOperation({
    summary: 'Xóa nhiều cache entries',
    description: 'Yêu cầu quyền `redis.manage`.',
  })
  @ApiBody({ type: BulkKeysDto })
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
    summary: 'Xóa 1 cache entry',
    description: 'Yêu cầu quyền `redis.manage`.',
  })
  @ApiParam({ name: 'key', description: 'Key của cache cần xóa' })
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
    summary: 'Chỉnh sửa nhiều cache entries',
    description: 'Yêu cầu quyền `redis.manage`.',
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
    summary: 'Chỉnh sửa 1 cache entry',
    description: 'Yêu cầu quyền `redis.manage`.',
  })
  @ApiParam({ name: 'key', description: 'Key của cache cần sửa' })
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

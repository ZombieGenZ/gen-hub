import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { ApiKeyVerificationService } from './api-key-verification.service';
import { VerifyApiKeyDto } from './dto/verify-api-key.dto';
import { Public, ApiValidationErrorResponse } from '../../common/decorators';
import { GetResponse, ResponseCode } from '../../common/responses';

@ApiTags('API Key Verification')
@Controller('api-keys')
export class ApiKeyVerifyController {
  constructor(private readonly service: ApiKeyVerificationService) {}

  @Post('verify')
  @Public()
  @ApiOperation({
    summary: 'Verify API key và lấy thông tin',
    description:
      'Xác thực một API key và trả về thông tin tổ chức liên quan. API public không cần đăng nhập. Sử dụng bởi các ứng dụng bên thứ 3 để xác thực quyền truy cập.',
  })
  @ApiBody({
    description: 'API key cần verify',
    schema: {
      type: 'object',
      properties: {
        api_key: {
          type: 'string',
          example: 'GENHUB-A1B2C3D4E5F6789012345678901234AB',
          description: 'API key được cấp cho tổ chức',
        },
      },
      required: ['api_key'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Verify thành công',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'api-key.verify.success' },
        message: { type: 'string', example: 'Verify API key thành công' },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            organization_id: { type: 'string', format: 'uuid' },
            organization: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string', example: 'Công ty ABC' },
              },
            },
            permissions: {
              type: 'array',
              items: { type: 'string' },
              example: ['warehouse.read', 'batch.read'],
            },
            is_active: { type: 'boolean', example: true },
            expires_at: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'API key không hợp lệ hoặc hết hạn',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'api-key.invalid' },
        message: { type: 'string', example: 'API key không hợp lệ' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiValidationErrorResponse()
  async verify(@Body() dto: VerifyApiKeyDto, @I18nLang() lang: string) {
    const result = await this.service.getApiKeyByPlainKey(dto.api_key, lang);
    return new GetResponse(
      ResponseCode.APIKEY_VERIFY_SUCCESS,
      result,
      'Verify API key thành công',
    );
  }
}

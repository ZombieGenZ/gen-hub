import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { Public } from '../../common/decorators';
import { GetResponse, ResponseCode } from '../../common/responses';
import { OrganizationRepository } from '../organization/organization.repository';

/**
 * Public Organization Controller
 * Cung cấp API công khai liên quan đến tổ chức.
 * Không yêu cầu xác thực.
 */
@ApiTags('Public Organizations')
@Controller('public/organizations')
export class PublicOrganizationController {
  constructor(private readonly repository: OrganizationRepository) {}

  @Get('check-tax-code')
  @Public()
  @ApiOperation({
    summary: 'Kiểm tra mã số thuế đã tồn tại',
    description:
      'API công khai để kiểm tra mã số thuế đã được đăng ký trong hệ thống chưa. ' +
      'Không yêu cầu xác thực. Dùng cho Checkout page và tạo tổ chức.',
  })
  @ApiQuery({
    name: 'tax_code',
    required: true,
    type: String,
    description: 'Mã số thuế cần kiểm tra (10 hoặc 13 chữ số)',
    example: '0123456789',
  })
  @ApiResponse({
    status: 200,
    description: 'Kết quả kiểm tra mã số thuế',
    schema: {
      example: {
        code: 'ORGANIZATION_GET_SUCCESS',
        message: 'Kiểm tra mã số thuế thành công',
        success: true,
        data: {
          exists: true,
          organization_name: 'Công ty ABC',
        },
      },
    },
  })
  async checkTaxCode(@Query('tax_code') taxCode: string) {
    if (!taxCode || !/^\d{10}(\d{3})?$/.test(taxCode)) {
      return new GetResponse(ResponseCode.ORGANIZATION_GET_SUCCESS, {
        exists: false,
        message: 'Mã số thuế không hợp lệ',
      });
    }

    const exists = await this.repository.findByTaxCode(taxCode);

    if (exists) {
      const org: { name: string } | null =
        await this.repository.findByTaxCodeWithName(taxCode);
      return new GetResponse(ResponseCode.ORGANIZATION_GET_SUCCESS, {
        exists: true,
        organization_name: org?.name || undefined,
      });
    }

    return new GetResponse(ResponseCode.ORGANIZATION_GET_SUCCESS, {
      exists: false,
    });
  }
}

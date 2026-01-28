import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { OrganizationUpdateRequestService } from './organization-update-request.service';
import {
  QueryOrganizationUpdateRequestDto,
  RejectOrganizationUpdateRequestDto,
} from './dto';
import {
  CurrentUser,
  RequirePermission,
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import { PermissionGuard } from '../../common/guards';
import { I18nLang } from 'nestjs-i18n';
import { OkResponse, GetResponse, ResponseCode } from '../../common/responses';

@ApiTags('Organization Update Requests')
@ApiBearerAuth('JWT-auth')
@Controller('organization-update-requests')
@UseGuards(PermissionGuard)
export class OrganizationUpdateRequestController {
  constructor(private readonly service: OrganizationUpdateRequestService) {}

  @Get()
  @RequirePermission('organization.update_request.list')
  @ApiOperation({
    summary: 'Lấy danh sách yêu cầu cập nhật tổ chức',
    description:
      'Lấy danh sách các yêu cầu cập nhật thông tin tổ chức với phân trang và lọc theo trạng thái. Yêu cầu quyền `organization.update_request.list`.',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi tối đa',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Số bản ghi bỏ qua',
    example: 0,
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    description: 'Lọc theo trạng thái',
  })
  @ApiQuery({
    name: 'keyword',
    required: false,
    type: String,
    description: 'Từ khóa tìm kiếm (tên tổ chức, mã số thuế...)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách yêu cầu thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_UPDATE_REQUEST_LIST_SUCCESS',
        message: 'Lấy danh sách yêu cầu thành công',
        success: true,
        data: {
          items: [
            {
              id: '550e8400-e29b-41d4-a716-446655440000',
              organization_id: '550e8400-e29b-41d4-a716-446655440001',
              organization: {
                id: '550e8400-e29b-41d4-a716-446655440001',
                name: 'Công ty ABC',
              },
              tax_code: '0123456789',
              representative_name: 'Nguyễn Văn A',
              representative_title: 'Giám đốc',
              representative_phone: '0901234567',
              representative_email: 'contact@abc.com',
              status: 'PENDING',
              requester_id: '550e8400-e29b-41d4-a716-446655440002',
              requester: {
                id: '550e8400-e29b-41d4-a716-446655440002',
                email: 'user@abc.com',
                full_name: 'Nguyễn Văn B',
              },
              created_at: '2026-01-20T06:00:00.000Z',
            },
          ],
          total: 25,
          limit: 10,
          offset: 0,
        },
      },
    },
  })
  @ApiAuthResponses()
  async findAll(@Query() query: QueryOrganizationUpdateRequestDto) {
    const data = await this.service.findAll(query);
    return new GetResponse(
      ResponseCode.ORGANIZATION_UPDATE_REQUEST_LIST_SUCCESS,
      data,
    );
  }

  @Get(':id')
  @RequirePermission('organization.update_request.read')
  @ApiOperation({
    summary: 'Lấy chi tiết yêu cầu cập nhật tổ chức',
    description:
      'Lấy thông tin chi tiết của một yêu cầu cập nhật bao gồm thông tin tổ chức và người yêu cầu. Yêu cầu quyền `organization.update_request.read`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID yêu cầu cập nhật (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết yêu cầu thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_UPDATE_REQUEST_GET_SUCCESS',
        message: 'Lấy chi tiết yêu cầu thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          organization_id: '550e8400-e29b-41d4-a716-446655440001',
          organization: {
            id: '550e8400-e29b-41d4-a716-446655440001',
            name: 'Công ty ABC',
            tax_code: '9999999999',
            representative_name: 'Nguyễn Văn Old',
          },
          tax_code: '0123456789',
          representative_name: 'Nguyễn Văn A',
          representative_title: 'Giám đốc',
          representative_phone: '0901234567',
          representative_email: 'contact@abc.com',
          status: 'PENDING',
          reject_reason: null,
          requester_id: '550e8400-e29b-41d4-a716-446655440002',
          requester: {
            id: '550e8400-e29b-41d4-a716-446655440002',
            email: 'user@abc.com',
            full_name: 'Nguyễn Văn B',
          },
          created_at: '2026-01-20T06:00:00.000Z',
          updated_at: '2026-01-20T06:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu cập nhật' })
  @ApiAuthResponses()
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @I18nLang() lang: string,
  ) {
    const data = await this.service.findOne(id, lang);
    return new OkResponse(
      ResponseCode.ORGANIZATION_UPDATE_REQUEST_GET_SUCCESS,
      data,
    );
  }

  @Patch(':id/approve')
  @RequirePermission('organization.update_request.approve')
  @ApiOperation({
    summary: 'Duyệt yêu cầu cập nhật thông tin tổ chức',
    description:
      'Phê duyệt yêu cầu cập nhật thông tin tổ chức. Sau khi duyệt, thông tin tổ chức sẽ được cập nhật theo yêu cầu. Yêu cầu quyền `organization.update_request.approve`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID yêu cầu cập nhật (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiResponse({
    status: 200,
    description: 'Duyệt yêu cầu thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_UPDATE_REQUEST_APPROVE_SUCCESS',
        message: 'Duyệt yêu cầu thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          organization_id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'APPROVED',
          updated_by: '550e8400-e29b-41d4-a716-446655440003',
          updated_at: '2026-01-20T07:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Yêu cầu không ở trạng thái chờ duyệt',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu cập nhật' })
  @ApiAuthResponses()
  async approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @I18nLang() lang: string,
  ) {
    const data = await this.service.approve(id, userId, lang);
    return new OkResponse(
      ResponseCode.ORGANIZATION_UPDATE_REQUEST_APPROVE_SUCCESS,
      data,
    );
  }

  @Patch(':id/reject')
  @RequirePermission('organization.update_request.reject')
  @ApiOperation({
    summary: 'Từ chối yêu cầu cập nhật thông tin tổ chức',
    description:
      'Từ chối yêu cầu cập nhật thông tin tổ chức với lý do từ chối. Yêu cầu quyền `organization.update_request.reject`.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID yêu cầu cập nhật (UUID)',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @ApiBody({
    type: RejectOrganizationUpdateRequestDto,
    description: 'Lý do từ chối yêu cầu',
    examples: {
      reject: {
        summary: 'Từ chối với lý do',
        value: { reject_reason: 'Thông tin mã số thuế không chính xác' },
      },
      invalid_info: {
        summary: 'Thông tin không đầy đủ',
        value: { reject_reason: 'Thiếu thông tin người đại diện' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Từ chối yêu cầu thành công',
    schema: {
      example: {
        code: 'ORGANIZATION_UPDATE_REQUEST_REJECT_SUCCESS',
        message: 'Từ chối yêu cầu thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          organization_id: '550e8400-e29b-41d4-a716-446655440001',
          status: 'REJECTED',
          reject_reason: 'Thông tin mã số thuế không chính xác',
          updated_by: '550e8400-e29b-41d4-a716-446655440003',
          updated_at: '2026-01-20T07:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Yêu cầu không ở trạng thái chờ duyệt',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu cập nhật' })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async reject(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: RejectOrganizationUpdateRequestDto,
    @I18nLang() lang: string,
  ) {
    const data = await this.service.reject(id, userId, dto, lang);
    return new OkResponse(
      ResponseCode.ORGANIZATION_UPDATE_REQUEST_REJECT_SUCCESS,
      data,
    );
  }
}

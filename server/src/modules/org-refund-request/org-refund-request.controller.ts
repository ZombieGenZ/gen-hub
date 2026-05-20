import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
  ApiQuery,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { RefundRequestService } from '../refund-request/refund-request.service';
import { QueryRefundRequestDto, CreateRefundRequestDto } from './dto';
import { CombinedAuthGuard, OrgPermissionGuard } from '../../common/guards';
import {
  CurrentActor,
  RequireOrgPermission,
  ApiAuthResponses,
  ApiValidationErrorResponse,
} from '../../common/decorators';
import {
  GetResponse,
  CreatedResponse,
  ResponseCode,
} from '../../common/responses';
import {
  buildErrorSchema,
  buildSuccessSchema,
} from '../../common/swagger/master-data-swagger.helper';

@ApiTags('Organization Refund Requests')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
  name: 'x-api-key',
  description:
    'API Key của tổ chức. Có thể dùng thay cho Bearer token khi gọi bằng tích hợp hệ thống.',
  required: false,
})
@Controller('organizations/:orgId/refund-requests')
@UseGuards(CombinedAuthGuard, OrgPermissionGuard)
export class OrgRefundRequestController {
  constructor(private readonly refundRequestService: RefundRequestService) {}

  @Post()
  @RequireOrgPermission('refund-request.create')
  @ApiOperation({
    summary: 'Tạo yêu cầu hoàn tiền',
    description:
      'Tạo mới một yêu cầu hoàn tiền cho hợp đồng thuê kho của tổ chức. Hệ thống sẽ tính toán số tiền hoàn trả dựa trên thông tin hợp đồng và phí phạt hủy sớm. Yêu cầu quyền `refund-request.create`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức sở hữu hợp đồng (UUID format).',
    type: 'string',
    format: 'uuid',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiBody({
    type: CreateRefundRequestDto,
    description:
      'Thông tin yêu cầu hoàn tiền. Số tiền phí và số tiền thực nhận phải nhất quán: `final_refund_amount = original_amount - fee_amount`.',
    examples: {
      full_refund: {
        summary: 'Yêu cầu hoàn tiền đầy đủ thông tin',
        description:
          'Ví dụ tạo yêu cầu hoàn tiền với đầy đủ lý do và các trường bắt buộc',
        value: {
          rental_contract_id: '550e8400-e29b-41d4-a716-446655440010',
          original_amount: 10000000,
          fee_percent: 10,
          fee_amount: 1000000,
          final_refund_amount: 9000000,
          reason: 'Chuyển văn phòng nên không còn nhu cầu sử dụng kho',
        },
      },
      minimal_refund: {
        summary: 'Yêu cầu hoàn tiền tối thiểu (không có lý do)',
        description:
          'Ví dụ tạo yêu cầu hoàn tiền chỉ với các trường bắt buộc, không kèm lý do',
        value: {
          rental_contract_id: '550e8400-e29b-41d4-a716-446655440011',
          original_amount: 5000000,
          fee_percent: 5,
          fee_amount: 250000,
          final_refund_amount: 4750000,
        },
      },
      high_value_refund: {
        summary: 'Yêu cầu hoàn tiền giá trị cao',
        description: 'Ví dụ yêu cầu hoàn tiền hợp đồng lớn với phí phạt 15%',
        value: {
          rental_contract_id: '550e8400-e29b-41d4-a716-446655440012',
          original_amount: 50000000,
          fee_percent: 15,
          fee_amount: 7500000,
          final_refund_amount: 42500000,
          reason: 'Công ty giải thể, cần thanh lý toàn bộ hợp đồng thuê kho',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description:
      'Tạo yêu cầu hoàn tiền thành công. Yêu cầu sẽ ở trạng thái `PENDING` và chờ admin xét duyệt.',
    schema: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'refund-request.create_success' },
        message: {
          type: 'string',
          example: 'Tạo yêu cầu hoàn tiền thành công',
        },
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440099',
            },
            code: {
              type: 'string',
              example: 'RR-202603-0001',
              description: 'Mã yêu cầu hoàn tiền tự sinh',
            },
            status: {
              type: 'string',
              example: 'PENDING',
              enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'],
            },
            original_amount: {
              type: 'number',
              example: 10000000,
              description: 'Số tiền gốc hợp đồng (VND)',
            },
            fee_percent: {
              type: 'number',
              example: 10,
              description: 'Phần trăm phí hủy hợp đồng',
            },
            fee_amount: {
              type: 'number',
              example: 1000000,
              description: 'Số tiền phí (VND)',
            },
            final_refund_amount: {
              type: 'number',
              example: 9000000,
              description: 'Số tiền thực nhận sau khi trừ phí (VND)',
            },
            reason: {
              type: 'string',
              nullable: true,
              example: 'Chuyển văn phòng nên không còn nhu cầu sử dụng kho',
            },
            organization_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440001',
            },
            rental_contract_id: {
              type: 'string',
              format: 'uuid',
              example: '550e8400-e29b-41d4-a716-446655440010',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
              example: '2026-03-12T08:00:00.000Z',
            },
          },
        },
      },
      example: {
        code: 'refund-request.create_success',
        message: 'Tạo yêu cầu hoàn tiền thành công',
        success: true,
        data: {
          id: '550e8400-e29b-41d4-a716-446655440099',
          code: 'RR-202603-0001',
          status: 'PENDING',
          original_amount: 10000000,
          fee_percent: 10,
          fee_amount: 1000000,
          final_refund_amount: 9000000,
          reason: 'Chuyển văn phòng nên không còn nhu cầu sử dụng kho',
          organization_id: '550e8400-e29b-41d4-a716-446655440001',
          rental_contract_id: '550e8400-e29b-41d4-a716-446655440010',
          created_at: '2026-03-12T08:00:00.000Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Yêu cầu hoàn tiền không hợp lệ về nghiệp vụ. Ví dụ: hợp đồng đã có yêu cầu hoàn tiền đang xử lý, số tiền không nhất quán, hoặc hợp đồng không đủ điều kiện hoàn tiền.',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'error.refund_request.contract_not_eligible',
        },
        message: {
          type: 'string',
          example: 'Hợp đồng không đủ điều kiện yêu cầu hoàn tiền',
        },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy hợp đồng thuê hoặc tổ chức.',
    schema: {
      type: 'object',
      properties: {
        code: {
          type: 'string',
          example: 'error.refund_request.contract_not_found',
        },
        message: { type: 'string', example: 'Không tìm thấy hợp đồng thuê' },
        success: { type: 'boolean', example: false },
      },
    },
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateRefundRequestDto,
    @CurrentActor() userId: string,
    @I18nLang() lang: string,
  ) {
    const data = await this.refundRequestService.createByOrganization(
      orgId,
      userId,
      dto,
      lang,
    );
    return new CreatedResponse(
      ResponseCode.REFUND_REQUEST_CREATE_SUCCESS || 'SUCCESS',
      data,
      'Tạo yêu cầu hoàn tiền thành công',
    );
  }

  @Get()
  @RequireOrgPermission('refund-request.list')
  @ApiOperation({
    summary: 'Lấy danh sách yêu cầu hoàn tiền của tổ chức',
    description:
      'Trả về danh sách yêu cầu hoàn tiền thuộc tổ chức hiện tại, có hỗ trợ phân trang và lọc theo từ khóa, trạng thái hoặc mã tổ chức. Endpoint hỗ trợ cả JWT và `x-api-key`. Yêu cầu quyền `refund-request.list`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức cần lấy danh sách yêu cầu hoàn tiền.',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số lượng bản ghi tối đa trên mỗi trang.',
    example: 10,
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    type: Number,
    description: 'Vị trí bắt đầu để phân trang.',
    example: 0,
  })
  @ApiQuery({
    name: 'keywords',
    required: false,
    type: String,
    description: 'Từ khóa tìm kiếm theo mã hợp đồng hoặc ghi chú.',
    example: 'GENHUB',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'],
    description: 'Lọc theo trạng thái yêu cầu hoàn tiền.',
    example: 'PENDING',
  })
  @ApiQuery({
    name: 'organization_id',
    required: false,
    type: String,
    description: 'Lọc theo ID tổ chức trong dữ liệu hoàn tiền.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy danh sách yêu cầu hoàn tiền thành công.',
    schema: buildSuccessSchema({
      code: 'refund-request.list_success',
      message: 'Lấy danh sách yêu cầu hoàn tiền thành công',
      dataSchema: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                code: { type: 'string', example: 'RR-202603-0001' },
                status: { type: 'string', example: 'PENDING' },
                refund_amount: { type: 'number', example: 2500000 },
                organization_id: { type: 'string', format: 'uuid' },
                created_at: { type: 'string', format: 'date-time' },
              },
            },
          },
          total: { type: 'number', example: 1 },
          limit: { type: 'number', example: 10 },
          offset: { type: 'number', example: 0 },
        },
      },
      dataExample: {
        items: [
          {
            id: '550e8400-e29b-41d4-a716-446655440011',
            code: 'RR-202603-0001',
            status: 'PENDING',
            refund_amount: 2500000,
            organization_id: '550e8400-e29b-41d4-a716-446655440001',
            created_at: '2026-03-12T08:00:00.000Z',
          },
        ],
        total: 1,
        limit: 10,
        offset: 0,
      },
    }),
  })
  @ApiResponse({
    status: 400,
    description: 'Tham số truy vấn hoặc `orgId` không hợp lệ.',
    schema: buildErrorSchema({
      code: 'error.refund_request.bad_request',
      message: 'Tham số lọc yêu cầu hoàn tiền không hợp lệ',
    }),
  })
  @ApiAuthResponses()
  @ApiValidationErrorResponse()
  async findMany(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Query() query: QueryRefundRequestDto,
    @CurrentActor() userId: string,
    @I18nLang() lang: string,
  ) {
    const data = await this.refundRequestService.findByOrganization(
      query,
      userId,
      orgId,
      lang,
    );
    return new GetResponse(
      ResponseCode.REFUND_REQUEST_LIST_SUCCESS,
      data,
      'Lấy danh sách yêu cầu hoàn tiền thành công',
    );
  }

  @Get(':id')
  @RequireOrgPermission('refund-request.read')
  @ApiOperation({
    summary: 'Lấy chi tiết yêu cầu hoàn tiền',
    description:
      'Trả về đầy đủ thông tin chi tiết của một yêu cầu hoàn tiền thuộc tổ chức hiện tại. Endpoint hỗ trợ cả JWT và `x-api-key`. Yêu cầu quyền `refund-request.read`.',
  })
  @ApiParam({
    name: 'orgId',
    description: 'ID của tổ chức sở hữu yêu cầu hoàn tiền.',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @ApiParam({
    name: 'id',
    description: 'ID của yêu cầu hoàn tiền cần xem chi tiết.',
    type: 'string',
    example: '550e8400-e29b-41d4-a716-446655440011',
  })
  @ApiResponse({
    status: 200,
    description: 'Lấy chi tiết yêu cầu hoàn tiền thành công.',
    schema: buildSuccessSchema({
      code: 'refund-request.read_success',
      message: 'Lấy thông tin yêu cầu hoàn tiền thành công',
      dataSchema: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          code: { type: 'string', example: 'RR-202603-0001' },
          status: { type: 'string', example: 'PENDING' },
          refund_amount: { type: 'number', example: 2500000 },
          reason: {
            type: 'string',
            example: 'Khách hàng hủy dịch vụ trước thời hạn.',
          },
          organization_id: { type: 'string', format: 'uuid' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      dataExample: {
        id: '550e8400-e29b-41d4-a716-446655440011',
        code: 'RR-202603-0001',
        status: 'PENDING',
        refund_amount: 2500000,
        reason: 'Khách hàng hủy dịch vụ trước thời hạn.',
        organization_id: '550e8400-e29b-41d4-a716-446655440001',
        created_at: '2026-03-12T08:00:00.000Z',
      },
    }),
  })
  @ApiResponse({
    status: 404,
    description:
      'Không tìm thấy yêu cầu hoàn tiền thuộc tổ chức theo ID được cung cấp.',
    schema: buildErrorSchema({
      code: 'error.refund_request.not_found',
      message: 'Không tìm thấy yêu cầu hoàn tiền',
    }),
  })
  @ApiAuthResponses()
  async findById(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentActor() userId: string,
    @I18nLang() lang: string,
  ) {
    const data = await this.refundRequestService.findByIdByOrg(
      id,
      userId,
      orgId,
      lang,
    );
    return new GetResponse(
      ResponseCode.REFUND_REQUEST_READ_SUCCESS,
      data,
      'Lấy thông tin yêu cầu hoàn tiền thành công',
    );
  }
}

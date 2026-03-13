import {
    Controller,
    Get,
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
    ApiResponse,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { RefundRequestService } from '../refund-request/refund-request.service';
import { QueryRefundRequestDto } from './dto';
import { CombinedAuthGuard, OrgPermissionGuard } from '../../common/guards';
import {
    CurrentActor,
    RequireOrgPermission,
    ApiAuthResponses,
    ApiValidationErrorResponse,
} from '../../common/decorators';
import { GetResponse, ResponseCode } from '../../common/responses';
import { buildErrorSchema, buildSuccessSchema } from '../../common/swagger/master-data-swagger.helper';

@ApiTags('Organization Refund Requests')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
    name: 'x-api-key',
    description: 'API Key của tổ chức. Có thể dùng thay cho Bearer token khi gọi bằng tích hợp hệ thống.',
    required: false,
})
@Controller('organizations/:orgId/refund-requests')
@UseGuards(CombinedAuthGuard, OrgPermissionGuard)
export class OrgRefundRequestController {
    constructor(private readonly refundRequestService: RefundRequestService) { }

    @Get()
    @RequireOrgPermission('refund-request.list')
    @ApiOperation({
        summary: 'Lấy danh sách yêu cầu hoàn tiền của tổ chức',
        description: 'Trả về danh sách yêu cầu hoàn tiền thuộc tổ chức hiện tại, có hỗ trợ phân trang và lọc theo từ khóa, trạng thái hoặc mã tổ chức. Endpoint hỗ trợ cả JWT và `x-api-key`. Yêu cầu quyền `refund-request.list`.',
    })
    @ApiParam({
        name: 'orgId',
        description: 'ID của tổ chức cần lấy danh sách yêu cầu hoàn tiền.',
        type: 'string',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng bản ghi tối đa trên mỗi trang.', example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu để phân trang.', example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm kiếm theo mã hợp đồng hoặc ghi chú.', example: 'GENHUB' })
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'], description: 'Lọc theo trạng thái yêu cầu hoàn tiền.', example: 'PENDING' })
    @ApiQuery({ name: 'organization_id', required: false, type: String, description: 'Lọc theo ID tổ chức trong dữ liệu hoàn tiền.', example: '550e8400-e29b-41d4-a716-446655440001' })
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
        const data = await this.refundRequestService.findByOrganization(query, userId, orgId, lang);
        return new GetResponse(ResponseCode.REFUND_REQUEST_LIST_SUCCESS, data, 'Lấy danh sách yêu cầu hoàn tiền thành công');
    }

    @Get(':id')
    @RequireOrgPermission('refund-request.read')
    @ApiOperation({
        summary: 'Lấy chi tiết yêu cầu hoàn tiền',
        description: 'Trả về đầy đủ thông tin chi tiết của một yêu cầu hoàn tiền thuộc tổ chức hiện tại. Endpoint hỗ trợ cả JWT và `x-api-key`. Yêu cầu quyền `refund-request.read`.',
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
                reason: { type: 'string', example: 'Khách hàng hủy dịch vụ trước thời hạn.' },
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
        description: 'Không tìm thấy yêu cầu hoàn tiền thuộc tổ chức theo ID được cung cấp.',
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
        const data = await this.refundRequestService.findByIdByOrg(id, userId, orgId, lang);
        return new GetResponse(ResponseCode.REFUND_REQUEST_READ_SUCCESS, data, 'Lấy thông tin yêu cầu hoàn tiền thành công');
    }
}

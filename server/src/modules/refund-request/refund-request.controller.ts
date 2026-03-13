import {
    Controller,
    Get,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { RefundRequestService } from './refund-request.service';
import {
    QueryRefundRequestDto,
    AcceptRefundRequestDto,
    RejectRefundRequestDto,
    ChangeRefundStatusDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser, RequirePermission, ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import { GetResponse, UpdatedResponse, DeletedResponse, ResponseCode } from '../../common/responses';

@ApiTags('Admin Refund Requests')
@ApiBearerAuth('JWT-auth')
@Controller('admin/refund-requests')
@UseGuards(JwtAuthGuard)
export class RefundRequestController {
    constructor(private readonly refundRequestService: RefundRequestService) { }

    @Get()
    @RequirePermission('refund-request.list')
    @ApiOperation({
        summary: 'Lấy danh sách tất cả yêu cầu hoàn tiền',
        description: 'Lấy danh sách tất cả yêu cầu hoàn tiền với phân trang, tìm kiếm theo từ khóa, trạng thái và tổ chức. Yêu cầu quyền `refund-request.list`.',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng kết quả tối đa', example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu', example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Từ khóa tìm kiếm theo mã hợp đồng hoặc ghi chú', example: 'GENHUB' })
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'], description: 'Trạng thái yêu cầu hoàn tiền', example: 'PENDING' })
    @ApiQuery({ name: 'organization_id', required: false, type: String, description: 'ID tổ chức cần lọc', example: '550e8400-e29b-41d4-a716-446655440001' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách yêu cầu hoàn tiền thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'refund_request.list.success' },
                message: { type: 'string', example: 'Lấy danh sách yêu cầu hoàn tiền thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440010' },
                                    status: { type: 'string', example: 'PENDING' },
                                    requested_amount: { type: 'number', example: 1500000 },
                                    organization_id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440001' },
                                    created_at: { type: 'string', format: 'date-time', example: '2026-03-13T09:30:00.000Z' },
                                },
                            },
                        },
                        total: { type: 'number', example: 12 },
                        limit: { type: 'number', example: 10 },
                        offset: { type: 'number', example: 0 },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async findMany(
        @Query() query: QueryRefundRequestDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.refundRequestService.findMany(query, userId, lang);
        return new GetResponse(ResponseCode.REFUND_REQUEST_LIST_SUCCESS, data, 'Lấy danh sách yêu cầu hoàn tiền thành công');
    }

    @Get(':id')
    @RequirePermission('refund-request.read')
    @ApiOperation({
        summary: 'Lấy chi tiết yêu cầu hoàn tiền',
        description: 'Lấy thông tin chi tiết một yêu cầu hoàn tiền theo ID. Yêu cầu quyền `refund-request.read`.',
    })
    @ApiParam({ name: 'id', description: 'ID của yêu cầu hoàn tiền', type: 'string', example: '550e8400-e29b-41d4-a716-446655440010' })
    @ApiResponse({
        status: 200,
        description: 'Lấy chi tiết yêu cầu hoàn tiền thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'refund_request.read.success' },
                message: { type: 'string', example: 'Lấy thông tin yêu cầu hoàn tiền thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        status: { type: 'string', example: 'PENDING' },
                        requested_amount: { type: 'number', example: 1500000 },
                        reject_reason: { type: 'string', nullable: true, example: null },
                        process_notes: { type: 'string', nullable: true, example: 'Đang chờ kiểm tra hồ sơ hoàn tiền' },
                        organization: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', format: 'uuid', example: '550e8400-e29b-41d4-a716-446655440001' },
                                name: { type: 'string', example: 'GEN-HUB Logistics' },
                            },
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu hoàn tiền' })
    @ApiAuthResponses()
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.refundRequestService.findById(id, userId, lang);
        return new GetResponse(ResponseCode.REFUND_REQUEST_READ_SUCCESS, data, 'Lấy thông tin yêu cầu hoàn tiền thành công');
    }

    @Patch(':id/accept')
    @RequirePermission('refund-request.accept')
    @ApiOperation({
        summary: 'Duyệt yêu cầu hoàn tiền',
        description: 'Duyệt yêu cầu hoàn tiền và ghi nhận thông tin xử lý nếu có. Yêu cầu quyền `refund-request.accept`.',
    })
    @ApiParam({ name: 'id', description: 'ID của yêu cầu hoàn tiền', type: 'string', example: '550e8400-e29b-41d4-a716-446655440010' })
    @ApiBody({
        type: AcceptRefundRequestDto,
        description: 'Thông tin xử lý khi duyệt yêu cầu hoàn tiền',
        examples: {
            simple_accept: {
                summary: 'Duyệt không ghi chú',
                value: {},
            },
            accept_with_note: {
                summary: 'Duyệt có ghi chú',
                value: {
                    process_notes: 'Đã duyệt và chuyển lệnh hoàn tiền sang bộ phận kế toán',
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Duyệt yêu cầu hoàn tiền thành công' })
    @ApiResponse({ status: 400, description: 'Yêu cầu hoàn tiền không ở trạng thái có thể duyệt' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu hoàn tiền' })
    @ApiResponse({ status: 409, description: 'Yêu cầu hoàn tiền đã được xử lý trước đó' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async accept(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AcceptRefundRequestDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.refundRequestService.accept(id, dto, userId, lang);
        return new UpdatedResponse(ResponseCode.REFUND_REQUEST_ACCEPT_SUCCESS, data, 'Duyệt yêu cầu hoàn tiền thành công');
    }

    @Patch(':id/reject')
    @RequirePermission('refund-request.reject')
    @ApiOperation({
        summary: 'Từ chối yêu cầu hoàn tiền',
        description: 'Từ chối yêu cầu hoàn tiền với lý do rõ ràng và ghi chú xử lý nếu có. Yêu cầu quyền `refund-request.reject`.',
    })
    @ApiParam({ name: 'id', description: 'ID của yêu cầu hoàn tiền', type: 'string', example: '550e8400-e29b-41d4-a716-446655440010' })
    @ApiBody({
        type: RejectRefundRequestDto,
        description: 'Thông tin từ chối yêu cầu hoàn tiền',
        examples: {
            reject_by_policy: {
                summary: 'Từ chối do không đủ điều kiện',
                value: {
                    reject_reason: 'Không đủ điều kiện hoàn tiền theo chính sách hiện hành',
                    process_notes: 'Đã liên hệ khách hàng để giải thích chi tiết',
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Từ chối yêu cầu hoàn tiền thành công' })
    @ApiResponse({ status: 400, description: 'Yêu cầu hoàn tiền không ở trạng thái có thể từ chối' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu hoàn tiền' })
    @ApiResponse({ status: 409, description: 'Yêu cầu hoàn tiền đã được xử lý trước đó' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async reject(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RejectRefundRequestDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.refundRequestService.reject(id, dto, userId, lang);
        return new UpdatedResponse(ResponseCode.REFUND_REQUEST_REJECT_SUCCESS, data, 'Từ chối yêu cầu hoàn tiền thành công');
    }

    @Patch(':id/change')
    @RequirePermission('refund-request.change')
    @ApiOperation({
        summary: 'Thay đổi trạng thái yêu cầu hoàn tiền',
        description: 'Thay đổi trạng thái yêu cầu hoàn tiền sang trạng thái mới theo luồng xử lý nghiệp vụ. Yêu cầu quyền `refund-request.change`.',
    })
    @ApiParam({ name: 'id', description: 'ID của yêu cầu hoàn tiền', type: 'string', example: '550e8400-e29b-41d4-a716-446655440010' })
    @ApiBody({
        type: ChangeRefundStatusDto,
        description: 'Dữ liệu thay đổi trạng thái yêu cầu hoàn tiền',
        examples: {
            approve_after_review: {
                summary: 'Chuyển sang APPROVED',
                value: {
                    new_status: 'APPROVED',
                    change_reason: 'Xem xét lại hồ sơ và quyết định duyệt',
                    process_notes: 'Đã xác minh đầy đủ chứng từ',
                },
            },
            complete_refund: {
                summary: 'Chuyển sang COMPLETED',
                value: {
                    new_status: 'COMPLETED',
                    process_notes: 'Đã hoàn tiền thành công qua chuyển khoản',
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Thay đổi trạng thái yêu cầu hoàn tiền thành công' })
    @ApiResponse({ status: 400, description: 'Trạng thái mới không hợp lệ theo quy trình' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu hoàn tiền' })
    @ApiResponse({ status: 409, description: 'Xung đột trạng thái khi cập nhật yêu cầu hoàn tiền' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async changeStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ChangeRefundStatusDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.refundRequestService.changeStatus(id, dto, userId, lang);
        return new UpdatedResponse(ResponseCode.REFUND_REQUEST_CHANGE_SUCCESS, data, 'Thay đổi trạng thái thành công');
    }

    @Delete(':id')
    @RequirePermission('refund-request.delete')
    @ApiOperation({
        summary: 'Xóa yêu cầu hoàn tiền',
        description: 'Xóa mềm một yêu cầu hoàn tiền theo ID. Yêu cầu quyền `refund-request.delete`.',
    })
    @ApiParam({ name: 'id', description: 'ID của yêu cầu hoàn tiền', type: 'string', example: '550e8400-e29b-41d4-a716-446655440010' })
    @ApiResponse({
        status: 200,
        description: 'Xóa yêu cầu hoàn tiền thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'refund_request.delete.success' },
                message: { type: 'string', example: 'Xóa yêu cầu hoàn tiền thành công' },
                success: { type: 'boolean', example: true },
                data: { type: 'null', example: null },
            },
        },
    })
    @ApiResponse({ status: 404, description: 'Không tìm thấy yêu cầu hoàn tiền' })
    @ApiAuthResponses()
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.refundRequestService.delete(id, userId, lang);
        return new DeletedResponse(ResponseCode.REFUND_REQUEST_DELETE_SUCCESS, null, 'Xóa yêu cầu hoàn tiền thành công');
    }
}

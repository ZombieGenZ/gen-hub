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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { RefundRequestService } from './refund-request.service';
import {
    QueryRefundRequestDto,
    AcceptRefundRequestDto,
    RejectRefundRequestDto,
    ChangeRefundStatusDto,
} from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser, RequirePermission } from '../../common/decorators';
import { GetResponse, UpdatedResponse, DeletedResponse, ResponseCode } from '../../common/responses';

/**
 * Controller xử lý các endpoints Admin cho RefundRequest
 * Route: /admin/refund-requests
 */
@ApiTags('Admin Refund Requests')
@ApiBearerAuth('JWT-auth')
@Controller('admin/refund-requests')
@UseGuards(JwtAuthGuard)
export class RefundRequestController {
    constructor(private readonly refundRequestService: RefundRequestService) { }

    /**
     * Lấy danh sách tất cả yêu cầu hoàn tiền
     */
    @Get()
    @RequirePermission('refund-request.list')
    @ApiOperation({ summary: 'Lấy danh sách tất cả yêu cầu hoàn tiền' })
    async findMany(
        @Query() query: QueryRefundRequestDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.refundRequestService.findMany(query, userId, lang);
        return new GetResponse(ResponseCode.REFUND_REQUEST_LIST_SUCCESS, data, 'Lấy danh sách yêu cầu hoàn tiền thành công');
    }

    /**
     * Lấy chi tiết yêu cầu hoàn tiền theo ID
     */
    @Get(':id')
    @RequirePermission('refund-request.read')
    @ApiOperation({ summary: 'Lấy chi tiết yêu cầu hoàn tiền' })
    @ApiParam({ name: 'id', description: 'ID của yêu cầu hoàn tiền', type: 'string' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.refundRequestService.findById(id, userId, lang);
        return new GetResponse(ResponseCode.REFUND_REQUEST_READ_SUCCESS, data, 'Lấy thông tin yêu cầu hoàn tiền thành công');
    }

    /**
     * Duyệt yêu cầu hoàn tiền
     */
    @Patch(':id/accept')
    @RequirePermission('refund-request.accept')
    @ApiOperation({ summary: 'Duyệt yêu cầu hoàn tiền' })
    @ApiParam({ name: 'id', description: 'ID của yêu cầu hoàn tiền', type: 'string' })
    @ApiBody({ type: AcceptRefundRequestDto })
    async accept(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: AcceptRefundRequestDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.refundRequestService.accept(id, dto, userId, lang);
        return new UpdatedResponse(ResponseCode.REFUND_REQUEST_ACCEPT_SUCCESS, data, 'Duyệt yêu cầu hoàn tiền thành công');
    }

    /**
     * Từ chối yêu cầu hoàn tiền
     */
    @Patch(':id/reject')
    @RequirePermission('refund-request.reject')
    @ApiOperation({ summary: 'Từ chối yêu cầu hoàn tiền' })
    @ApiParam({ name: 'id', description: 'ID của yêu cầu hoàn tiền', type: 'string' })
    @ApiBody({ type: RejectRefundRequestDto })
    async reject(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RejectRefundRequestDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.refundRequestService.reject(id, dto, userId, lang);
        return new UpdatedResponse(ResponseCode.REFUND_REQUEST_REJECT_SUCCESS, data, 'Từ chối yêu cầu hoàn tiền thành công');
    }

    /**
     * Thay đổi trạng thái yêu cầu hoàn tiền
     */
    @Patch(':id/change')
    @RequirePermission('refund-request.change')
    @ApiOperation({ summary: 'Thay đổi trạng thái yêu cầu hoàn tiền' })
    @ApiParam({ name: 'id', description: 'ID của yêu cầu hoàn tiền', type: 'string' })
    @ApiBody({ type: ChangeRefundStatusDto })
    async changeStatus(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: ChangeRefundStatusDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.refundRequestService.changeStatus(id, dto, userId, lang);
        return new UpdatedResponse(ResponseCode.REFUND_REQUEST_CHANGE_SUCCESS, data, 'Thay đổi trạng thái thành công');
    }

    /**
     * Xóa yêu cầu hoàn tiền (soft delete)
     */
    @Delete(':id')
    @RequirePermission('refund-request.delete')
    @ApiOperation({ summary: 'Xóa yêu cầu hoàn tiền' })
    @ApiParam({ name: 'id', description: 'ID của yêu cầu hoàn tiền', type: 'string' })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.refundRequestService.delete(id, userId, lang);
        return new DeletedResponse(ResponseCode.REFUND_REQUEST_DELETE_SUCCESS, null, 'Xóa yêu cầu hoàn tiền thành công');
    }
}

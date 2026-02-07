import {
    Controller,
    Get,
    Param,
    Query,
    ParseUUIDPipe,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiHeader } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { RefundRequestService } from '../refund-request/refund-request.service';
import { QueryRefundRequestDto } from './dto';
import { CombinedAuthGuard, OrgPermissionGuard } from '../../common/guards';
import { CurrentUser, RequireOrgPermission } from '../../common/decorators';
import { GetResponse, ResponseCode } from '../../common/responses';

/**
 * Controller xử lý các endpoints cấp tổ chức cho RefundRequest
 * Route: /organizations/:orgId/refund-requests
 * Hỗ trợ cả JWT Auth và API Key
 */
@ApiTags('Organization Refund Requests')
@ApiBearerAuth('JWT-auth')
@ApiHeader({
    name: 'x-api-key',
    description: 'API Key của tổ chức (thay thế Bearer token)',
    required: false,
})
@Controller('organizations/:orgId/refund-requests')
@UseGuards(CombinedAuthGuard)
export class OrgRefundRequestController {
    constructor(private readonly refundRequestService: RefundRequestService) { }

    /**
     * Lấy danh sách yêu cầu hoàn tiền của tổ chức
     */
    @Get()
    @RequireOrgPermission('refund-request.list')
    @ApiOperation({ summary: 'Lấy danh sách yêu cầu hoàn tiền của tổ chức' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    async findMany(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query() query: QueryRefundRequestDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.refundRequestService.findByOrganization(query, userId, orgId, lang);
        return new GetResponse(ResponseCode.REFUND_REQUEST_LIST_SUCCESS, data, 'Lấy danh sách yêu cầu hoàn tiền thành công');
    }

    /**
     * Lấy chi tiết yêu cầu hoàn tiền của tổ chức
     */
    @Get(':id')
    @RequireOrgPermission('refund-request.read')
    @ApiOperation({ summary: 'Lấy chi tiết yêu cầu hoàn tiền' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    @ApiParam({ name: 'id', description: 'ID của yêu cầu hoàn tiền', type: 'string' })
    async findById(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.refundRequestService.findByIdByOrg(id, userId, orgId, lang);
        return new GetResponse(ResponseCode.REFUND_REQUEST_READ_SUCCESS, data, 'Lấy thông tin yêu cầu hoàn tiền thành công');
    }
}

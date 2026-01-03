import {
    Controller,
    Get,
    Put,
    Post,
    Delete,
    Body,
    Param,
    Query,
    ParseUUIDPipe,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { RentalContractService } from './rental-contract.service';
import { RenewRentalContractDto, QueryRentalContractDto, OrgCancelContractDto, OrgDeleteManyWithReasonDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';
import { GetResponse, UpdatedResponse, DeletedResponse, ResponseCode } from '../../common/responses';

/**
 * Controller xử lý các endpoints cấp tổ chức cho Rental Contract
 * Route: /organizations/:orgId/rental-contracts
 * Yêu cầu: owner hoặc member của organization đó
 */
@ApiTags('Organization Rental Contracts')
@ApiBearerAuth('JWT-auth')
@Controller('organizations/:orgId/rental-contracts')
@UseGuards(JwtAuthGuard)
export class OrgRentalContractController {
    constructor(private readonly rentalContractService: RentalContractService) { }

    /**
     * Lấy danh sách hợp đồng của tổ chức
     * Chỉ owner/member của org mới được xem
     */
    @Get()
    @ApiOperation({ summary: 'Lấy danh sách hợp đồng của tổ chức' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    async findMany(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query() query: QueryRentalContractDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.findManyByOrg(query, userId, orgId, lang);
        return new GetResponse(ResponseCode.RENTAL_CONTRACT_LIST_SUCCESS, data, 'Lấy danh sách hợp đồng thành công');
    }

    /**
     * Lấy chi tiết hợp đồng của tổ chức
     * Chỉ owner/member của org mới được xem
     */
    @Get(':id')
    @ApiOperation({ summary: 'Lấy chi tiết hợp đồng của tổ chức' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    @ApiParam({ name: 'id', description: 'ID của hợp đồng', type: 'string' })
    async findById(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.findByIdByOrg(id, userId, orgId, lang);
        return new GetResponse(ResponseCode.RENTAL_CONTRACT_READ_SUCCESS, data, 'Lấy thông tin hợp đồng thành công');
    }

    /**
     * Lấy chi tiết đầy đủ hợp đồng (với addons, logs, coupons)
     */
    @Get(':id/full')
    @ApiOperation({ summary: 'Lấy chi tiết đầy đủ hợp đồng với addons, logs, coupons' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    @ApiParam({ name: 'id', description: 'ID của hợp đồng', type: 'string' })
    async findByIdFull(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.findByIdWithFullDetails(id, userId, orgId, lang);
        return new GetResponse(ResponseCode.RENTAL_CONTRACT_READ_SUCCESS, data, 'Lấy thông tin hợp đồng đầy đủ thành công');
    }

    /**
     * Gia hạn hợp đồng (chỉ cho phép adjust_months)
     * Chỉ owner/member của org mới được gia hạn
     */
    @Put(':id/renew')
    @ApiOperation({ summary: 'Gia hạn hợp đồng' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    @ApiParam({ name: 'id', description: 'ID của hợp đồng', type: 'string' })
    async renew(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RenewRentalContractDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.renewByOrg(id, dto, userId, orgId, lang);
        return new UpdatedResponse(ResponseCode.RENTAL_CONTRACT_UPDATE_SUCCESS, data, 'Gia hạn hợp đồng thành công');
    }

    /**
     * Tạo lại link thanh toán cho hợp đồng PENDING đã hết hạn
     * Kiểm tra templates không bị block và tạo payment mới
     */
    @Post(':id/retry-payment')
    @ApiOperation({ summary: 'Tạo lại link thanh toán cho hợp đồng PENDING' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    @ApiParam({ name: 'id', description: 'ID của hợp đồng', type: 'string' })
    async retryPayment(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.retryPayment(id, userId, orgId, lang);
        return new UpdatedResponse(ResponseCode.RENTAL_CONTRACT_UPDATE_SUCCESS, data, 'Tạo lại link thanh toán thành công');
    }

    /**
     * Lấy danh sách addons của hợp đồng
     */
    @Get(':id/addons')
    @ApiOperation({ summary: 'Lấy danh sách addons của hợp đồng' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    @ApiParam({ name: 'id', description: 'ID của hợp đồng', type: 'string' })
    async getAddons(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.getContractAddons(id, userId, orgId, lang);
        return new GetResponse(ResponseCode.RENTAL_CONTRACT_READ_SUCCESS, data, 'Lấy danh sách addons thành công');
    }

    /**
     * Lấy danh sách insurance của hợp đồng
     */
    @Get(':id/insurances')
    @ApiOperation({ summary: 'Lấy danh sách bảo hiểm của hợp đồng' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    @ApiParam({ name: 'id', description: 'ID của hợp đồng', type: 'string' })
    async getInsurances(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.getContractInsurances(id, userId, orgId, lang);
        return new GetResponse(ResponseCode.RENTAL_CONTRACT_READ_SUCCESS, data, 'Lấy danh sách bảo hiểm thành công');
    }

    /**
     * Lấy lịch sử thay đổi của hợp đồng
     */
    @Get(':id/logs')
    @ApiOperation({ summary: 'Lấy lịch sử thay đổi của hợp đồng' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    @ApiParam({ name: 'id', description: 'ID của hợp đồng', type: 'string' })
    async getLogs(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.getContractLogs(id, userId, orgId, lang);
        return new GetResponse(ResponseCode.RENTAL_CONTRACT_READ_SUCCESS, data, 'Lấy lịch sử thay đổi thành công');
    }

    /**
     * Hủy hợp đồng của tổ chức
     * Chỉ owner/member của org mới được hủy
     * Chỉ yêu cầu cancel_reason (cancel_type tự động là CLIENT_REQUEST)
     */
    @Delete(':id')
    @ApiOperation({ summary: 'Hủy hợp đồng của tổ chức' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    @ApiParam({ name: 'id', description: 'ID của hợp đồng', type: 'string' })
    @ApiBody({ type: OrgCancelContractDto })
    async delete(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: OrgCancelContractDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.rentalContractService.deleteByOrg(id, dto, userId, orgId, lang);
        return new DeletedResponse(ResponseCode.RENTAL_CONTRACT_DELETE_SUCCESS, null, 'Hủy hợp đồng thành công');
    }

    @Delete('delete/many')
    @ApiOperation({ summary: 'Hủy nhiều hợp đồng của tổ chức' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức', type: 'string' })
    @ApiBody({ type: OrgDeleteManyWithReasonDto })
    async deleteMany(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Body() dto: OrgDeleteManyWithReasonDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.rentalContractService.deleteManyByOrg(dto.items, userId, orgId, lang);
        return new DeletedResponse(ResponseCode.RENTAL_CONTRACT_DELETE_SUCCESS, null, 'Hủy nhiều hợp đồng thành công');
    }
}

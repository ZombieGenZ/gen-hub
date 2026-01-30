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
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { OrgRentalContractService } from './org-rental-contract.service';
import {
    OrgCreateRentalContractDto,
    OrgCreateRentalContractWithFileDto,
    RenewRentalContractDto,
    RenewRentalContractWithFileDto,
    OrgCancelContractDto,
    OrgDeleteManyWithReasonDto,
    QueryRentalContractDto,
    AddAddonDto,
    AddAddonsDto,
    RemoveAddonDto,
    ApplyCouponsDto,
    ValidateCouponsDto,
} from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import { GetResponse, CreatedResponse, UpdatedResponse, DeletedResponse } from '../../common/responses';

/**
 * Controller xử lý các endpoints cấp tổ chức cho Rental Contract
 * Route: /organizations/:orgId/rental-contracts
 * Yêu cầu: owner hoặc member của organization đó
 */
@ApiTags('Organization Rental Contracts')
@ApiBearerAuth()
@Controller('organizations/:orgId/rental-contracts')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OrgRentalContractController {
    constructor(private readonly rentalContractService: OrgRentalContractService) { }

    /**
     * Lấy danh sách hợp đồng của tổ chức
     */
    @Get()
    @RequirePermission('org.rental-contract.list')
    @ApiOperation({ summary: 'Lấy danh sách hợp đồng của tổ chức' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    async findMany(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Query() query: QueryRentalContractDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.findMany(query, userId, orgId, lang);
        return new GetResponse('rental-contract.list.success', data, 'Lấy danh sách hợp đồng thành công');
    }

    /**
     * Lấy chi tiết hợp đồng
     */
    @Get(':id')
    @RequirePermission('org.rental-contract.read')
    @ApiOperation({ summary: 'Lấy chi tiết hợp đồng' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiParam({ name: 'id', description: 'ID hợp đồng' })
    async findById(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.findById(id, userId, orgId, lang);
        return new GetResponse('rental-contract.read.success', data, 'Lấy thông tin hợp đồng thành công');
    }

    /**
     * Lấy chi tiết hợp đồng đầy đủ (có addons, logs, coupons)
     */
    @Get(':id/full')
    @RequirePermission('org.rental-contract.read')
    @ApiOperation({ summary: 'Lấy chi tiết hợp đồng đầy đủ' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiParam({ name: 'id', description: 'ID hợp đồng' })
    async findByIdFull(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.findByIdWithFullDetails(id, userId, orgId, lang);
        return new GetResponse('rental-contract.read.success', data, 'Lấy thông tin hợp đồng đầy đủ thành công');
    }

    /**
     * Gia hạn hợp đồng
     */
    @Put(':id/renew')
    @RequirePermission('org.rental-contract.renew')
    @ApiOperation({ summary: 'Gia hạn hợp đồng' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiParam({ name: 'id', description: 'ID hợp đồng' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('signature'))
    @ApiBody({ type: RenewRentalContractWithFileDto })
    async renew(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: RenewRentalContractDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @UploadedFile() signatureFile: Express.Multer.File,
    ) {
        const data = await this.rentalContractService.renew(id, dto, userId, orgId, lang, signatureFile);
        return new UpdatedResponse('rental-contract.renew.success', data, 'Gia hạn hợp đồng thành công');
    }

    /**
     * Tạo lại link thanh toán (cho contract PENDING)
     */
    @Post(':id/retry-payment')
    @RequirePermission('org.rental-contract.update')
    @ApiOperation({ summary: 'Tạo lại link thanh toán' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiParam({ name: 'id', description: 'ID hợp đồng' })
    async retryPayment(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.retryPayment(id, userId, orgId, lang);
        return new CreatedResponse('rental-contract.retry_payment.success', data, 'Tạo lại link thanh toán thành công');
    }

    /**
     * Lấy danh sách addons của hợp đồng
     */
    @Get(':id/addons')
    @RequirePermission('org.rental-contract.read')
    @ApiOperation({ summary: 'Lấy các addons của hợp đồng' })
    async getAddons(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.getContractAddons(id, userId, orgId, lang);
        return new GetResponse('rental-contract.addons.list.success', data, 'Lấy danh sách addon thành công');
    }

    /**
     * Lấy danh sách insurances của hợp đồng
     */
    @Get(':id/insurances')
    @RequirePermission('org.rental-contract.read')
    @ApiOperation({ summary: 'Lấy các insurances của hợp đồng' })
    async getInsurances(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.getContractInsurances(id, userId, orgId, lang);
        return new GetResponse('rental-contract.insurances.list.success', data, 'Lấy danh sách bảo hiểm thành công');
    }

    /**
     * Lấy logs của hợp đồng
     */
    @Get(':id/logs')
    @RequirePermission('org.rental-contract.read')
    @ApiOperation({ summary: 'Lấy logs của hợp đồng' })
    async getLogs(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.getContractLogs(id, userId, orgId, lang);
        return new GetResponse('rental-contract.logs.list.success', data, 'Lấy danh sách logs thành công');
    }

    /**
     * Hủy hợp đồng
     */
    @Delete(':id')
    @RequirePermission('org.rental-contract.delete')
    @ApiOperation({ summary: 'Hủy hợp đồng' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiParam({ name: 'id', description: 'ID hợp đồng' })
    @ApiBody({ type: OrgCancelContractDto })
    async delete(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: OrgCancelContractDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.rentalContractService.delete(id, dto, userId, orgId, lang);
        return new DeletedResponse('rental-contract.delete.success', null, 'Hủy hợp đồng thành công');
    }

    /**
     * Hủy nhiều hợp đồng
     */
    @Delete('delete/many')
    @RequirePermission('org.rental-contract.delete')
    @ApiOperation({ summary: 'Hủy nhiều hợp đồng' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiBody({ type: OrgDeleteManyWithReasonDto })
    async deleteMany(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Body() dto: OrgDeleteManyWithReasonDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.rentalContractService.deleteMany(dto.items, userId, orgId, lang);
        return new DeletedResponse('rental-contract.delete.success', null, 'Hủy nhiều hợp đồng thành công');
    }

    /**
     * Tạo hợp đồng thuê mới
     */
    @Post()
    @RequirePermission('org.rental-contract.create')
    @ApiOperation({ summary: 'Tạo hợp đồng thuê mới (Organization)' })
    @ApiParam({ name: 'orgId', description: 'ID tổ chức' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('signature'))
    @ApiBody({ type: OrgCreateRentalContractWithFileDto })
    async create(
        @Param('orgId', ParseUUIDPipe) orgId: string,
        @Body() dto: OrgCreateRentalContractDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @UploadedFile() signatureFile: Express.Multer.File,
    ) {
        const data = await this.rentalContractService.create(dto, userId, orgId, lang, signatureFile);
        return new CreatedResponse('rental-contract.create.success', data, 'Tạo hợp đồng thuê thành công');
    }
}

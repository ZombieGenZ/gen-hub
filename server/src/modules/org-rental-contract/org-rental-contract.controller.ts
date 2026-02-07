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
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
    ApiConsumes,
    ApiResponse,
    ApiQuery,
} from '@nestjs/swagger';
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
import { RequirePermission, CurrentUser, ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import { GetResponse, CreatedResponse, UpdatedResponse, DeletedResponse } from '../../common/responses';

/**
 * Controller xử lý các endpoints cấp tổ chức cho Rental Contract
 * Route: /organizations/:orgId/rental-contracts
 * Yêu cầu: owner hoặc member của organization đó
 */
@ApiTags('Organization Rental Contracts')
@ApiBearerAuth('JWT-auth')
@Controller('organizations/:orgId/rental-contracts')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OrgRentalContractController {
    constructor(private readonly rentalContractService: OrgRentalContractService) { }

    /**
     * Tạo hợp đồng thuê mới
     */
    @Post()
    @RequirePermission('org.rental-contract.create')
    @ApiOperation({
        summary: 'Tạo hợp đồng thuê mới (Organization)',
        description: 'Tạo hợp đồng thuê kho mới cho tổ chức. Có thể thuê nhiều kho trong cùng một hợp đồng, chọn gói thời hạn, thêm addons/bảo hiểm, và áp dụng coupon. Hỗ trợ upload chữ ký điện tử. Yêu cầu quyền `org.rental-contract.create`.',
    })
    @ApiParam({
        name: 'orgId',
        description: 'ID của tổ chức (UUID)',
        type: 'string',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('signature'))
    @ApiBody({
        type: OrgCreateRentalContractWithFileDto,
        description: 'Thông tin hợp đồng thuê mới',
        examples: {
            basic_contract: {
                summary: 'Hợp đồng cơ bản',
                description: 'Thuê 1 kho với gói 3 tháng',
                value: {
                    templates: [
                        { template_id: '550e8400-e29b-41d4-a716-446655440001', warehouse_name: 'Kho hàng A1', row_template_ids: [] }
                    ],
                    duration_tier_id: '550e8400-e29b-41d4-a716-446655440005',
                    payment_method: 'TRANSFER',
                    notes: 'Hợp đồng thuê kho mới',
                },
            },
            contract_with_rows: {
                summary: 'Hợp đồng thuê theo row',
                description: 'Thuê một số row cụ thể trong kho',
                value: {
                    templates: [
                        {
                            template_id: '550e8400-e29b-41d4-a716-446655440001',
                            warehouse_name: 'Kho hàng B1',
                            row_template_ids: ['row-uuid-1', 'row-uuid-2'],
                        }
                    ],
                    duration_tier_id: '550e8400-e29b-41d4-a716-446655440005',
                    auto_renew: true,
                },
            },
            contract_with_addons: {
                summary: 'Hợp đồng với addons và coupon',
                description: 'Thuê kho kèm addons và áp dụng mã giảm giá',
                value: {
                    templates: [
                        { template_id: '550e8400-e29b-41d4-a716-446655440001', warehouse_name: 'Kho Premium' }
                    ],
                    duration_tier_id: '550e8400-e29b-41d4-a716-446655440005',
                    addon_ids: ['addon-uuid-1', 'addon-uuid-2'],
                    insurance_ids: ['insurance-uuid-1'],
                    coupon_codes: ['NEWUSER10'],
                    auto_renew: false,
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo hợp đồng thành công, trả về thông tin hợp đồng và link thanh toán',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'rental-contract.create.success' },
                message: { type: 'string', example: 'Tạo hợp đồng thuê thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', example: '550e8400-e29b-41d4-a716-446655440010' },
                        contract_number: { type: 'string', example: 'RC-2026-00001' },
                        status: { type: 'string', example: 'PENDING' },
                        total_amount: { type: 'number', example: 5000000 },
                        payment_url: { type: 'string', example: 'https://payment.example.com/...' },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ hoặc template không khả dụng' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy template hoặc duration tier' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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

    /**
     * Lấy danh sách hợp đồng của tổ chức
     */
    @Get()
    @RequirePermission('org.rental-contract.list')
    @ApiOperation({
        summary: 'Lấy danh sách hợp đồng của tổ chức',
        description: 'Lấy danh sách hợp đồng thuê kho của tổ chức với phân trang và bộ lọc theo trạng thái, từ khóa. Yêu cầu quyền `org.rental-contract.list`.',
    })
    @ApiParam({
        name: 'orgId',
        description: 'ID của tổ chức (UUID)',
        type: 'string',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng kết quả tối đa', example: 10 })
    @ApiQuery({ name: 'offset', required: false, type: Number, description: 'Vị trí bắt đầu', example: 0 })
    @ApiQuery({ name: 'keywords', required: false, type: String, description: 'Tìm kiếm theo tên kho, mã hợp đồng' })
    @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'TERMINATED'], description: 'Lọc theo trạng thái' })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách hợp đồng thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'rental-contract.list.success' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        items: { type: 'array', items: { type: 'object' } },
                        total: { type: 'number', example: 25 },
                        limit: { type: 'number', example: 10 },
                        offset: { type: 'number', example: 0 },
                        hasMore: { type: 'boolean', example: true },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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
    @ApiOperation({
        summary: 'Lấy chi tiết hợp đồng',
        description: 'Lấy thông tin chi tiết của một hợp đồng thuê theo ID. Yêu cầu quyền `org.rental-contract.read`.',
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiParam({ name: 'id', description: 'ID của hợp đồng (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440010' })
    @ApiResponse({ status: 200, description: 'Lấy chi tiết hợp đồng thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy hợp đồng' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Lấy chi tiết hợp đồng đầy đủ',
        description: 'Lấy thông tin chi tiết đầy đủ của hợp đồng bao gồm: addons đã đăng ký, bảo hiểm, coupons đã áp dụng, và lịch sử logs. Yêu cầu quyền `org.rental-contract.read`.',
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiParam({ name: 'id', description: 'ID của hợp đồng (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440010' })
    @ApiResponse({ status: 200, description: 'Lấy chi tiết đầy đủ thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy hợp đồng' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Gia hạn hợp đồng',
        description: 'Gia hạn hợp đồng thuê đang hoạt động hoặc sắp hết hạn. Có thể thay đổi addons và áp dụng coupon mới cho đợt gia hạn. Yêu cầu quyền `org.rental-contract.renew`.',
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiParam({ name: 'id', description: 'ID của hợp đồng (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440010' })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('signature'))
    @ApiBody({
        type: RenewRentalContractWithFileDto,
        description: 'Thông tin gia hạn hợp đồng',
        examples: {
            basic_renew: {
                summary: 'Gia hạn cơ bản',
                value: { duration_tier_id: '550e8400-e29b-41d4-a716-446655440005' },
            },
            renew_with_addons: {
                summary: 'Gia hạn và thêm addons',
                value: {
                    duration_tier_id: '550e8400-e29b-41d4-a716-446655440005',
                    addon_ids: ['addon-uuid-1'],
                    coupon_codes: ['RENEW20'],
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Gia hạn hợp đồng thành công' })
    @ApiResponse({ status: 400, description: 'Hợp đồng không thể gia hạn (đã hủy/terminated)' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy hợp đồng' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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
    @ApiOperation({
        summary: 'Tạo lại link thanh toán',
        description: 'Tạo lại link thanh toán cho hợp đồng đang chờ thanh toán (PENDING). Dùng khi link thanh toán cũ đã hết hạn. Yêu cầu quyền `org.rental-contract.update`.',
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiParam({ name: 'id', description: 'ID của hợp đồng (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440010' })
    @ApiResponse({
        status: 201,
        description: 'Tạo lại link thanh toán thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'rental-contract.retry_payment.success' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        payment_url: { type: 'string', example: 'https://payment.example.com/...' },
                        expires_at: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
    })
    @ApiResponse({ status: 400, description: 'Hợp đồng không ở trạng thái PENDING' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy hợp đồng' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Lấy các addons của hợp đồng',
        description: 'Lấy danh sách các addon đã đăng ký cho hợp đồng. Yêu cầu quyền `org.rental-contract.read`.',
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiParam({ name: 'id', description: 'ID của hợp đồng (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440010' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách addon thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy hợp đồng' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Lấy các insurances của hợp đồng',
        description: 'Lấy danh sách các gói bảo hiểm đã đăng ký cho hợp đồng. Yêu cầu quyền `org.rental-contract.read`.',
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiParam({ name: 'id', description: 'ID của hợp đồng (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440010' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách bảo hiểm thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy hợp đồng' })
    @ApiAuthResponses()
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
    @ApiOperation({
        summary: 'Lấy logs của hợp đồng',
        description: 'Lấy lịch sử thao tác trên hợp đồng: tạo mới, gia hạn, thay đổi addon, thanh toán, hủy, v.v. Yêu cầu quyền `org.rental-contract.read`.',
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiParam({ name: 'id', description: 'ID của hợp đồng (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440010' })
    @ApiResponse({ status: 200, description: 'Lấy logs thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy hợp đồng' })
    @ApiAuthResponses()
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
     * Hủy nhiều hợp đồng (phải đặt trước delete/:id để tránh conflict route)
     */
    @Delete('delete/many')
    @RequirePermission('org.rental-contract.delete')
    @ApiOperation({
        summary: 'Hủy nhiều hợp đồng',
        description: 'Hủy nhiều hợp đồng cùng lúc với lý do cho từng hợp đồng. Chỉ có thể hủy hợp đồng PENDING hoặc ACTIVE. Yêu cầu quyền `org.rental-contract.delete`.',
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiBody({
        type: OrgDeleteManyWithReasonDto,
        description: 'Danh sách hợp đồng cần hủy với lý do cho từng item',
        examples: {
            cancel_multiple: {
                summary: 'Hủy 2 hợp đồng',
                value: {
                    items: [
                        { id: '550e8400-e29b-41d4-a716-446655440010', cancel_reason: 'Không còn nhu cầu sử dụng' },
                        { id: '550e8400-e29b-41d4-a716-446655440011', cancel_reason: 'Chuyển sang gói khác' },
                    ],
                },
            },
        },
    })
    @ApiResponse({ status: 200, description: 'Hủy nhiều hợp đồng thành công' })
    @ApiResponse({ status: 400, description: 'Một hoặc nhiều hợp đồng không thể hủy' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy một hoặc nhiều hợp đồng' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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
     * Hủy hợp đồng
     */
    @Delete(':id')
    @RequirePermission('org.rental-contract.delete')
    @ApiOperation({
        summary: 'Hủy hợp đồng',
        description: 'Hủy một hợp đồng thuê. Chỉ có thể hủy hợp đồng PENDING hoặc ACTIVE. Nếu đã thanh toán, sẽ tính toán hoàn tiền theo chính sách. Yêu cầu quyền `org.rental-contract.delete`.',
    })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440000' })
    @ApiParam({ name: 'id', description: 'ID của hợp đồng (UUID)', type: 'string', example: '550e8400-e29b-41d4-a716-446655440010' })
    @ApiBody({
        type: OrgCancelContractDto,
        description: 'Lý do hủy hợp đồng',
        examples: {
            cancel: { summary: 'Hủy do không sử dụng', value: { cancel_reason: 'Không còn nhu cầu sử dụng dịch vụ' } },
        },
    })
    @ApiResponse({ status: 200, description: 'Hủy hợp đồng thành công' })
    @ApiResponse({ status: 400, description: 'Hợp đồng không thể hủy (đã hủy/terminated)' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy hợp đồng' })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
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
}

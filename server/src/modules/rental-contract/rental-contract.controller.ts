import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
    ParseUUIDPipe,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
    ApiConsumes,
    ApiQuery,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { RentalContractService } from './rental-contract.service';
import { UpdateRentalContractDto, QueryRentalContractDto, CancelContractDto, DeleteManyWithReasonDto, AdminCreateRentalContractDto, AdminCreateRentalContractWithFileDto } from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    ApiAuthResponses,
    ApiValidationErrorResponse,
} from '../../common/decorators/api-common-responses.decorator';
import { GetResponse, CreatedResponse, UpdatedResponse, DeletedResponse } from '../../common/responses';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Rental Contracts')
@ApiBearerAuth('JWT-auth')
@Controller('rental-contracts')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RentalContractController {
    constructor(
        private readonly rentalContractService: RentalContractService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Kiểm tra user có permission cụ thể không
     */
    private async hasPermission(userId: string, permissionKey: string): Promise<boolean> {
        const user = await this.prisma.user.findFirst({
            where: { id: userId },
            include: {
                system_roles: {
                    where: { is_deleted: false, is_active: true },
                    include: {
                        role: {
                            include: {
                                permissions: {
                                    where: { is_deleted: false, is_active: true },
                                    include: { permission: true },
                                },
                            },
                        },
                    },
                },
                system_permissions: {
                    where: { is_deleted: false, is_active: true },
                    include: { permission: true },
                },
            },
        });

        if (!user) return false;

        // Check direct permissions
        const hasDirectPerm = user.system_permissions.some(
            (p) => p.permission.key === permissionKey,
        );
        if (hasDirectPerm) return true;

        // Check role permissions
        const hasRolePerm = user.system_roles.some((ur) =>
            ur.role.permissions.some((rp) => rp.permission.key === permissionKey),
        );
        return hasRolePerm;
    }

    /**
     * Admin tạo hợp đồng thuê mới
     * - Hỗ trợ thanh toán tiền mặt (kích hoạt ngay)
     * - Hoặc tạo link thanh toán chuyển khoản
     */
    @Post()
    @RequirePermission('rental-contract.create')
    @ApiOperation({
        summary: 'Admin tạo hợp đồng thuê mới',
        description: 'Admin tạo hợp đồng thuê kho mới cho tổ chức. Hỗ trợ 2 loại thanh toán:\n\n- **CASH**: Kích hoạt hợp đồng ngay lập tức (đã thanh toán tiền mặt)\n- **TRANSFER**: Tạo link thanh toán chuyển khoản, hợp đồng ở trạng thái PENDING\n\nCó thể đính kèm file chữ ký (PNG). Yêu cầu quyền `rental-contract.create`.',
    })
    @ApiConsumes('multipart/form-data')
    @UseInterceptors(FileInterceptor('signature'))
    @ApiBody({
        type: AdminCreateRentalContractWithFileDto,
        description: 'Thông tin hợp đồng cần tạo (multipart/form-data)',
        examples: {
            cash_payment: {
                summary: 'Thanh toán tiền mặt - Kích hoạt ngay',
                description: 'Tạo hợp đồng với thanh toán tiền mặt, hợp đồng được kích hoạt ngay lập tức',
                value: {
                    organization_id: '550e8400-e29b-41d4-a716-446655440001',
                    type: 'CASH',
                    duration_tier_id: '550e8400-e29b-41d4-a716-446655440005',
                    templates: [
                        {
                            template_id: '550e8400-e29b-41d4-a716-446655440010',
                            warehouse_name: 'Kho hàng A1',
                            warehouse_description: 'Kho chứa hàng điện tử',
                            contents_description: 'Linh kiện máy tính, thiết bị điện tử',
                        },
                    ],
                    addon_ids: ['550e8400-e29b-41d4-a716-446655440020'],
                    insurance_ids: ['550e8400-e29b-41d4-a716-446655440030'],
                    coupon_codes: ['SUMMER2024'],
                    notes: 'Thanh toán tiền mặt tại văn phòng',
                    auto_renew: false,
                },
            },
            transfer_payment: {
                summary: 'Thanh toán chuyển khoản - Tạo link thanh toán',
                description: 'Tạo hợp đồng với thanh toán chuyển khoản, trả về link thanh toán',
                value: {
                    organization_id: '550e8400-e29b-41d4-a716-446655440001',
                    type: 'TRANSFER',
                    duration_tier_id: '550e8400-e29b-41d4-a716-446655440005',
                    templates: [
                        {
                            template_id: '550e8400-e29b-41d4-a716-446655440010',
                            warehouse_name: 'Kho B2',
                            row_template_ids: ['550e8400-e29b-41d4-a716-446655440011', '550e8400-e29b-41d4-a716-446655440012'],
                        },
                    ],
                    scheduled_start_at: '2026-02-07T00:00:00.000Z',
                },
            },
            minimal: {
                summary: 'Tạo với thông tin tối thiểu',
                description: 'Tạo hợp đồng chỉ với các trường bắt buộc',
                value: {
                    organization_id: '550e8400-e29b-41d4-a716-446655440001',
                    type: 'TRANSFER',
                    duration_tier_id: '550e8400-e29b-41d4-a716-446655440005',
                    templates: [
                        {
                            template_id: '550e8400-e29b-41d4-a716-446655440010',
                            warehouse_name: 'Kho mới',
                        },
                    ],
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo hợp đồng thuê thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'rental-contract.create.success' },
                message: { type: 'string', example: 'Tạo hợp đồng thuê thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        code: { type: 'string', example: 'RC-2026020001' },
                        organization_id: { type: 'string', format: 'uuid' },
                        status: { type: 'string', enum: ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED'], example: 'ACTIVE' },
                        start_at: { type: 'string', format: 'date-time' },
                        end_at: { type: 'string', format: 'date-time' },
                        total_amount: { type: 'number', example: 5000000, description: 'Tổng tiền (VND)' },
                        discount_amount: { type: 'number', example: 500000, description: 'Số tiền giảm giá' },
                        final_amount: { type: 'number', example: 4500000, description: 'Số tiền phải thanh toán' },
                        payment_url: { type: 'string', nullable: true, description: 'Link thanh toán (chỉ có khi type=TRANSFER)' },
                        warehouses: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', format: 'uuid' },
                                    name: { type: 'string', example: 'Kho hàng A1' },
                                },
                            },
                        },
                        created_at: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy tài nguyên',
        content: {
            'application/json': {
                examples: {
                    org_not_found: {
                        summary: 'Không tìm thấy tổ chức',
                        value: {
                            code: 'rental-contract.organization_not_found',
                            message: 'Không tìm thấy tổ chức',
                            success: false,
                        },
                    },
                    template_not_found: {
                        summary: 'Không tìm thấy template kho',
                        value: {
                            code: 'rental-contract.template_not_found',
                            message: 'Không tìm thấy template kho',
                            success: false,
                        },
                    },
                    duration_tier_not_found: {
                        summary: 'Không tìm thấy gói thời hạn',
                        value: {
                            code: 'rental-contract.duration_tier_not_found',
                            message: 'Không tìm thấy gói thời hạn',
                            success: false,
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 409,
        description: 'Xung đột - Kho đã được thuê hoặc đang bị khóa',
        content: {
            'application/json': {
                examples: {
                    warehouse_locked: {
                        summary: 'Kho đang bị khóa',
                        value: {
                            code: 'rental-contract.warehouse_lock.locked',
                            message: 'Kho/dãy đang bị khóa bởi giao dịch khác',
                            success: false,
                        },
                    },
                    warehouse_conflict: {
                        summary: 'Kho đã được thuê',
                        value: {
                            code: 'rental-contract.warehouse_lock.conflict',
                            message: 'Hợp đồng bị xung đột do kho/dãy đã được thuê',
                            success: false,
                        },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async create(
        @Body() dto: AdminCreateRentalContractDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
        @UploadedFile() signatureFile: Express.Multer.File,
    ) {
        const data = await this.rentalContractService.createByAdmin(dto, userId, lang, signatureFile);
        return new CreatedResponse('rental-contract.create.success', data);
    }

    /**
     * Lấy danh sách hợp đồng
     * - Không có organization_id + có quyền list.all: xem tất cả
     * - Không có organization_id + không có quyền list.all: chỉ xem contracts của user
     * - Có organization_id: xem contracts của org đó (cần là owner/member)
     */
    @Get()
    @RequirePermission('rental-contract.list')
    @ApiOperation({
        summary: 'Lấy danh sách hợp đồng',
        description: 'Lấy danh sách hợp đồng thuê với phân quyền:\n\n- **Có quyền `rental-contract.list.all`**: Xem tất cả hợp đồng\n- **Không có quyền list.all**: Chỉ xem hợp đồng của tổ chức mình\n- **Có `organization_id`**: Lọc theo tổ chức cụ thể\n\nYêu cầu quyền `rental-contract.list`.',
    })
    @ApiQuery({
        name: 'limit',
        required: false,
        description: 'Số lượng bản ghi tối đa trả về (mặc định: 10)',
        type: Number,
        example: 10,
    })
    @ApiQuery({
        name: 'offset',
        required: false,
        description: 'Vị trí bắt đầu lấy dữ liệu (mặc định: 0)',
        type: Number,
        example: 0,
    })
    @ApiQuery({
        name: 'keywords',
        required: false,
        description: 'Từ khóa tìm kiếm (mã hợp đồng, tên kho)',
        type: String,
        example: 'RC-2026',
    })
    @ApiQuery({
        name: 'status',
        required: false,
        description: 'Lọc theo trạng thái hợp đồng',
        enum: ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'OVERDUE', 'SEALED', 'LIQUIDATED'],
        example: 'ACTIVE',
    })
    @ApiQuery({
        name: 'organization_id',
        required: false,
        description: 'Lọc theo ID tổ chức',
        type: String,
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách hợp đồng thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'rental-contract.list.success' },
                message: { type: 'string', example: 'Lấy danh sách hợp đồng thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        items: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', format: 'uuid' },
                                    code: { type: 'string', example: 'RC-2026020001' },
                                    organization_id: { type: 'string', format: 'uuid' },
                                    organization: {
                                        type: 'object',
                                        properties: {
                                            id: { type: 'string', format: 'uuid' },
                                            name: { type: 'string', example: 'Công ty ABC' },
                                        },
                                    },
                                    status: { type: 'string', example: 'ACTIVE' },
                                    start_at: { type: 'string', format: 'date-time' },
                                    end_at: { type: 'string', format: 'date-time' },
                                    total_amount: { type: 'number', example: 5000000 },
                                    final_amount: { type: 'number', example: 4500000 },
                                    warehouses: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string', format: 'uuid' },
                                                name: { type: 'string', example: 'Kho A1' },
                                            },
                                        },
                                    },
                                    created_at: { type: 'string', format: 'date-time' },
                                },
                            },
                        },
                        total: { type: 'number', example: 50 },
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
        @Query() query: QueryRentalContractDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const hasListAllPermission = await this.hasPermission(userId, 'rental-contract.list.all');
        const data = await this.rentalContractService.findMany(query, userId, hasListAllPermission, lang);
        return new GetResponse('rental-contract.list.success', data);
    }

    /**
     * Lấy chi tiết hợp đồng
     */
    @Get(':id')
    @RequirePermission('rental-contract.read')
    @ApiOperation({
        summary: 'Lấy chi tiết hợp đồng',
        description: 'Lấy thông tin chi tiết của một hợp đồng thuê theo ID. Bao gồm thông tin kho, dãy, addon, bảo hiểm và lịch sử thanh toán. Yêu cầu quyền `rental-contract.read`.',
    })
    @ApiParam({
        name: 'id',
        description: 'ID của hợp đồng (UUID format)',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy thông tin hợp đồng thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'rental-contract.read.success' },
                message: { type: 'string', example: 'Lấy thông tin hợp đồng thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        code: { type: 'string', example: 'RC-2026020001' },
                        organization_id: { type: 'string', format: 'uuid' },
                        organization: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', format: 'uuid' },
                                name: { type: 'string', example: 'Công ty ABC' },
                            },
                        },
                        status: { type: 'string', example: 'ACTIVE' },
                        start_at: { type: 'string', format: 'date-time' },
                        end_at: { type: 'string', format: 'date-time' },
                        total_amount: { type: 'number', example: 5000000 },
                        discount_amount: { type: 'number', example: 500000 },
                        final_amount: { type: 'number', example: 4500000 },
                        notes: { type: 'string', nullable: true },
                        auto_renew: { type: 'boolean', example: false },
                        warehouses: {
                            type: 'array',
                            description: 'Danh sách kho trong hợp đồng',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', format: 'uuid' },
                                    name: { type: 'string' },
                                    rows: {
                                        type: 'array',
                                        items: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string', format: 'uuid' },
                                                name: { type: 'string' },
                                            },
                                        },
                                    },
                                },
                            },
                        },
                        addons: {
                            type: 'array',
                            description: 'Danh sách addon đã đăng ký',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', format: 'uuid' },
                                    addon_id: { type: 'string', format: 'uuid' },
                                    addon: {
                                        type: 'object',
                                        properties: {
                                            name: { type: 'string' },
                                            price: { type: 'number' },
                                        },
                                    },
                                    status: { type: 'string' },
                                },
                            },
                        },
                        insurances: {
                            type: 'array',
                            description: 'Danh sách bảo hiểm',
                        },
                        payments: {
                            type: 'array',
                            description: 'Lịch sử thanh toán',
                        },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy hợp đồng',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'rental-contract.not_found' },
                message: { type: 'string', example: 'Không tìm thấy hợp đồng' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    @ApiAuthResponses()
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.findById(id, userId, lang);
        return new GetResponse('rental-contract.read.success', data);
    }

    /**
     * Cập nhật/gia hạn hợp đồng
     */
    @Put(':id')
    @RequirePermission('rental-contract.update')
    @ApiOperation({
        summary: 'Cập nhật/gia hạn hợp đồng',
        description: 'Cập nhật thông tin hợp đồng. Hỗ trợ các thao tác:\n\n- **Đổi tên/ghi chú**: Cập nhật thông tin cơ bản\n- **Gia hạn**: Dùng `extend_duration_tier_id` để thêm thời gian\n- **Rút ngắn**: Dùng `reduce_months` để giảm thời gian\n- **Addon/Insurance**: Cập nhật danh sách addon/bảo hiểm (logic upsert)\n\nYêu cầu quyền `rental-contract.update`.',
    })
    @ApiParam({
        name: 'id',
        description: 'ID của hợp đồng (UUID format)',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @ApiBody({
        type: UpdateRentalContractDto,
        description: 'Thông tin cần cập nhật (chỉ gửi các trường cần thay đổi)',
        examples: {
            update_notes: {
                summary: 'Cập nhật ghi chú',
                description: 'Cập nhật tên và ghi chú hợp đồng',
                value: {
                    name: 'Hợp đồng thuê kho B2 - Gia hạn',
                    notes: 'Đã gia hạn thêm 3 tháng theo yêu cầu khách hàng',
                },
            },
            extend_contract: {
                summary: 'Gia hạn hợp đồng',
                description: 'Gia hạn hợp đồng bằng cách chọn gói thời hạn',
                value: {
                    extend_duration_tier_id: '550e8400-e29b-41d4-a716-446655440005',
                },
            },
            reduce_contract: {
                summary: 'Rút ngắn hợp đồng',
                description: 'Giảm thời gian hợp đồng (ví dụ: giảm 2 tháng)',
                value: {
                    reduce_months: 2,
                },
            },
            update_addons: {
                summary: 'Cập nhật addon',
                description: 'Thêm/xóa addon (ID không có trong list sẽ bị hủy)',
                value: {
                    addon_ids: ['550e8400-e29b-41d4-a716-446655440020', '550e8400-e29b-41d4-a716-446655440021'],
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật hợp đồng thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'rental-contract.update.success' },
                message: { type: 'string', example: 'Cập nhật hợp đồng thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    description: 'Thông tin hợp đồng sau khi cập nhật',
                },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Không thể thực hiện thao tác',
        content: {
            'application/json': {
                examples: {
                    cannot_renew: {
                        summary: 'Không thể gia hạn',
                        value: {
                            code: 'rental-contract.cannot_renew',
                            message: 'Không thể gia hạn hợp đồng này',
                            success: false,
                        },
                    },
                    cannot_reduce: {
                        summary: 'Không thể rút ngắn',
                        value: {
                            code: 'rental-contract.cannot_reduce_past_now',
                            message: 'Không thể rút ngắn thời gian hợp đồng xuống dưới ngày hiện tại',
                            success: false,
                        },
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy hợp đồng hoặc tài nguyên',
        content: {
            'application/json': {
                examples: {
                    contract_not_found: {
                        summary: 'Không tìm thấy hợp đồng',
                        value: {
                            code: 'rental-contract.not_found',
                            message: 'Không tìm thấy hợp đồng',
                            success: false,
                        },
                    },
                    addon_not_found: {
                        summary: 'Không tìm thấy addon',
                        value: {
                            code: 'rental-contract.addon_not_found',
                            message: 'Không tìm thấy addon',
                            success: false,
                        },
                    },
                },
            },
        },
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateRentalContractDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.update(id, dto, userId, lang);
        return new UpdatedResponse('rental-contract.update.success', data);
    }

    /**
     * Hủy hợp đồng
     */
    @Delete(':id')
    @RequirePermission('rental-contract.delete')
    @ApiOperation({
        summary: 'Hủy hợp đồng',
        description: 'Hủy một hợp đồng thuê. Cần cung cấp loại hủy và lý do hủy. Các loại hủy:\n\n- **CLIENT_REQUEST**: Khách hàng yêu cầu hủy\n- **PROVIDER_REQUEST**: Nhà cung cấp yêu cầu hủy\n- **VIOLATION**: Vi phạm hợp đồng\n\nYêu cầu quyền `rental-contract.delete`.',
    })
    @ApiParam({
        name: 'id',
        description: 'ID của hợp đồng cần hủy (UUID format)',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @ApiBody({
        type: CancelContractDto,
        description: 'Thông tin hủy hợp đồng',
        examples: {
            client_request: {
                summary: 'Khách hàng yêu cầu hủy',
                value: {
                    cancel_type: 'CLIENT_REQUEST',
                    cancel_reason: 'Không còn nhu cầu sử dụng kho',
                },
            },
            violation: {
                summary: 'Vi phạm hợp đồng',
                value: {
                    cancel_type: 'VIOLATION',
                    cancel_reason: 'Vi phạm quy định lưu trữ hàng hóa nguy hiểm',
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Hủy hợp đồng thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'rental-contract.delete.success' },
                message: { type: 'string', example: 'Hủy hợp đồng thành công' },
                success: { type: 'boolean', example: true },
                data: { type: 'null', example: null },
            },
        },
    })
    @ApiResponse({
        status: 400,
        description: 'Không thể hủy hợp đồng',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'rental-contract.cannot_cancel' },
                message: { type: 'string', example: 'Không thể hủy hợp đồng này' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy hợp đồng',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'rental-contract.not_found' },
                message: { type: 'string', example: 'Không tìm thấy hợp đồng' },
                success: { type: 'boolean', example: false },
            },
        },
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CancelContractDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.rentalContractService.delete(id, dto, userId, lang);
        return new DeletedResponse('rental-contract.delete.success', null);
    }

    @Delete('delete/many')
    @RequirePermission('rental-contract.delete')
    @ApiOperation({
        summary: 'Hủy nhiều hợp đồng',
        description: 'Hủy nhiều hợp đồng cùng lúc. Mỗi hợp đồng có thể có loại hủy và lý do riêng. Yêu cầu quyền `rental-contract.delete`.',
    })
    @ApiBody({
        type: DeleteManyWithReasonDto,
        description: 'Danh sách hợp đồng cần hủy với thông tin cancel riêng cho từng item',
        examples: {
            delete_multiple: {
                summary: 'Hủy nhiều hợp đồng',
                description: 'Mỗi hợp đồng có cancel_type và cancel_reason riêng',
                value: {
                    items: [
                        {
                            id: '550e8400-e29b-41d4-a716-446655440001',
                            cancel_type: 'CLIENT_REQUEST',
                            cancel_reason: 'Không còn nhu cầu sử dụng',
                        },
                        {
                            id: '550e8400-e29b-41d4-a716-446655440002',
                            cancel_type: 'VIOLATION',
                            cancel_reason: 'Vi phạm quy định',
                        },
                    ],
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Hủy nhiều hợp đồng thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'rental-contract.delete.success' },
                message: { type: 'string', example: 'Hủy hợp đồng thành công' },
                success: { type: 'boolean', example: true },
                data: { type: 'null', example: null },
            },
        },
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async deleteMany(
        @Body() dto: DeleteManyWithReasonDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.rentalContractService.deleteMany(dto.items, userId, lang);
        return new DeletedResponse('rental-contract.delete.success', null);
    }
}

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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiBody } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { RentalContractService } from './rental-contract.service';
import { UpdateRentalContractDto, QueryRentalContractDto, CancelContractDto, DeleteManyWithReasonDto, AdminCreateRentalContractDto } from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import { GetResponse, CreatedResponse, UpdatedResponse, DeletedResponse } from '../../common/responses';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Rental Contracts')
@ApiBearerAuth()
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
    @ApiOperation({ summary: 'Admin tạo hợp đồng thuê mới (hỗ trợ CASH/TRANSFER)' })
    @ApiBody({ type: AdminCreateRentalContractDto })
    async create(
        @Body() dto: AdminCreateRentalContractDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.createByAdmin(dto, userId, lang);
        return new CreatedResponse('rental-contract.create.success', data, 'Tạo hợp đồng thuê thành công');
    }

    /**
     * Lấy danh sách hợp đồng
     * - Không có organization_id + có quyền list.all: xem tất cả
     * - Không có organization_id + không có quyền list.all: chỉ xem contracts của user
     * - Có organization_id: xem contracts của org đó (cần là owner/member)
     */
    @Get()
    @RequirePermission('rental-contract.list')
    @ApiOperation({ summary: 'Lấy danh sách hợp đồng' })
    async findMany(
        @Query() query: QueryRentalContractDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const hasListAllPermission = await this.hasPermission(userId, 'rental-contract.list.all');
        const data = await this.rentalContractService.findMany(query, userId, hasListAllPermission, lang);
        return new GetResponse('rental-contract.list.success', data, 'Lấy danh sách hợp đồng thành công');
    }

    /**
     * Lấy chi tiết hợp đồng
     */
    @Get(':id')
    @RequirePermission('rental-contract.read')
    @ApiOperation({ summary: 'Lấy chi tiết hợp đồng' })
    @ApiParam({ name: 'id', description: 'ID hợp đồng' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.findById(id, userId, lang);
        return new GetResponse('rental-contract.read.success', data, 'Lấy thông tin hợp đồng thành công');
    }

    /**
     * Cập nhật/gia hạn hợp đồng
     */
    @Put(':id')
    @RequirePermission('rental-contract.update')
    @ApiOperation({ summary: 'Cập nhật/gia hạn hợp đồng' })
    @ApiParam({ name: 'id', description: 'ID hợp đồng' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateRentalContractDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.update(id, dto, userId, lang);
        return new UpdatedResponse('rental-contract.update.success', data, 'Cập nhật hợp đồng thành công');
    }

    /**
     * Hủy hợp đồng
     */
    @Delete(':id')
    @RequirePermission('rental-contract.delete')
    @ApiOperation({ summary: 'Hủy hợp đồng' })
    @ApiParam({ name: 'id', description: 'ID hợp đồng' })
    @ApiBody({ type: CancelContractDto })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: CancelContractDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.rentalContractService.delete(id, dto, userId, lang);
        return new DeletedResponse('rental-contract.delete.success', null, 'Hủy hợp đồng thành công');
    }

    @Delete('delete/many')
    @RequirePermission('rental-contract.delete')
    @ApiOperation({ summary: 'Hủy nhiều hợp đồng' })
    @ApiBody({ type: DeleteManyWithReasonDto })
    async deleteMany(
        @Body() dto: DeleteManyWithReasonDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ) {
        await this.rentalContractService.deleteMany(dto.items, userId, lang);
        return new DeletedResponse('rental-contract.delete.success', null, 'Hủy nhiều hợp đồng thành công');
    }
}

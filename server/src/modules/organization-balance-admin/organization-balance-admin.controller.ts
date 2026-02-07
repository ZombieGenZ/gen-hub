import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { OrganizationBalanceAdminService } from './organization-balance-admin.service';
import { AdjustBalanceDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { GetResponse, OkResponse } from '../../common/responses';
import type { IOrganizationBalance, IOrganizationBalanceTransaction, IPaginatedResponse } from './interfaces';

/**
 * Controller Admin cho quản lý số dư tổ chức
 */
@ApiTags('Admin - Organization Balance')
@Controller('admin/organization-balances')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class OrganizationBalanceAdminController {
    constructor(private readonly service: OrganizationBalanceAdminService) { }

    /**
     * Xem danh sách tất cả số dư tổ chức
     */
    @Get()
    @RequirePermission('organization-balance.list.all')
    @ApiOperation({ summary: 'Xem danh sách số dư tất cả tổ chức (Admin)' })
    async findAll(
        @Req() req: Request,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
        @Query('keywords') keywords?: string,
    ): Promise<GetResponse<IPaginatedResponse<IOrganizationBalance>>> {
        const adminId = (req.user as any).id;
        const lang = (req.user as any).language || 'vi';
        const data = await this.service.findAll({ limit, offset, keywords }, adminId, lang);
        return new GetResponse('organization-balance.list', data);
    }

    /**
     * Xem số dư của tổ chức cụ thể
     */
    @Get(':organizationId')
    @RequirePermission('organization-balance.list.all')
    @ApiOperation({ summary: 'Xem số dư của tổ chức cụ thể (Admin)' })
    @ApiParam({ name: 'organizationId', description: 'ID của tổ chức' })
    async findByOrganizationId(
        @Param('organizationId') organizationId: string,
        @Req() req: Request,
    ): Promise<GetResponse<IOrganizationBalance>> {
        const adminId = (req.user as any).id;
        const lang = (req.user as any).language || 'vi';
        const data = await this.service.findByOrganizationId(organizationId, adminId, lang);
        return new GetResponse('organization-balance.get', data);
    }

    /**
     * Điều chỉnh số dư tổ chức (thưởng/phạt)
     */
    @Post(':organizationId/adjust')
    @RequirePermission('organization-balance.adjust')
    @ApiOperation({ summary: 'Điều chỉnh số dư tổ chức (Admin)' })
    @ApiParam({ name: 'organizationId', description: 'ID của tổ chức' })
    async adjustBalance(
        @Param('organizationId') organizationId: string,
        @Body() dto: AdjustBalanceDto,
        @Req() req: Request,
    ): Promise<OkResponse<{ balance: IOrganizationBalance; transaction: IOrganizationBalanceTransaction }>> {
        const adminId = (req.user as any).id;
        const lang = (req.user as any).language || 'vi';
        const data = await this.service.adjustBalance(organizationId, dto, adminId, lang);
        return new OkResponse('organization-balance.adjust', data);
    }
}

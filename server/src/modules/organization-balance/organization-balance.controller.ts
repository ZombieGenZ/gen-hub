import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    Req,
    Param,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { OrganizationBalanceService } from './organization-balance.service';
import { SepayService } from '../payment/sepay.service';
import { CreateDepositDto, QueryBalanceTransactionDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OrgPermissionGuard } from '../../common/guards/org-permission.guard';
import { RequireOrgPermission } from '../../common/decorators/require-org-permission.decorator';
import { GetResponse, CreatedResponse } from '../../common/responses';
import type { IOrganizationBalance, IOrganizationBalanceTransaction, IPaginatedResponse } from './interfaces';

/**
 * Controller cho số dư tài khoản tổ chức
 */
@ApiTags('Organization Balance')
@Controller('organizations/:orgId/balance')
@UseGuards(JwtAuthGuard, OrgPermissionGuard)
@ApiBearerAuth()
export class OrganizationBalanceController {
    constructor(
        private readonly service: OrganizationBalanceService,
        private readonly sepayService: SepayService,
    ) { }

    /**
     * Xem số dư của tổ chức
     */
    @Get()
    @ApiOperation({ summary: 'Xem số dư tài khoản của tổ chức' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @RequireOrgPermission('organization.balance.read')
    async getOrganizationBalance(
        @Param('orgId') orgId: string,
        @Req() req: Request,
    ): Promise<GetResponse<IOrganizationBalance>> {
        const lang = (req.user as any)?.language || 'vi';
        const data = await this.service.getOrganizationBalance(orgId, lang);
        return new GetResponse('organization-balance.get', data);
    }

    /**
     * Xem lịch sử giao dịch của tổ chức
     */
    @Get('transactions')
    @ApiOperation({ summary: 'Xem lịch sử giao dịch số dư tổ chức' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @RequireOrgPermission('organization.balance.read')
    async getOrganizationTransactions(
        @Param('orgId') orgId: string,
        @Req() req: Request,
        @Query() query: QueryBalanceTransactionDto,
    ): Promise<GetResponse<IPaginatedResponse<IOrganizationBalanceTransaction>>> {
        const lang = (req.user as any)?.language || 'vi';
        const data = await this.service.getOrganizationTransactions(orgId, query, lang);
        return new GetResponse('organization-balance.transactions', data);
    }

    /**
     * Tạo yêu cầu nạp tiền cho tổ chức
     */
    @Post('deposit')
    @ApiOperation({ summary: 'Tạo yêu cầu nạp tiền vào tài khoản tổ chức' })
    @ApiParam({ name: 'orgId', description: 'ID của tổ chức' })
    @RequireOrgPermission('organization.balance.deposit')
    async createDeposit(
        @Param('orgId') orgId: string,
        @Req() req: Request,
        @Body() dto: CreateDepositDto,
    ): Promise<CreatedResponse<any>> {
        const userId = (req.user as any).id;
        const result = await this.sepayService.createDepositPayment({
            organizationId: orgId,
            userId,
            amount: dto.amount,
            notes: dto.notes,
        });
        return new CreatedResponse('organization-balance.deposit.created', result, 'Tạo yêu cầu nạp tiền thành công');
    }
}

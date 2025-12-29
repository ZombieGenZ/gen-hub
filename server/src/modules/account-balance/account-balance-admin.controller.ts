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

import { AccountBalanceService } from './account-balance.service';
import { AdjustBalanceDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { RequirePermission } from '../../common/decorators/require-permission.decorator';
import { GetResponse, OkResponse } from '../../common/responses';
import type { IAccountBalance, IBalanceTransaction, IPaginatedResponse } from './interfaces';

/**
 * Controller Admin cho quản lý số dư
 */
@ApiTags('Admin - Account Balance')
@Controller('admin/account-balances')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class AccountBalanceAdminController {
    constructor(private readonly service: AccountBalanceService) { }

    /**
     * Xem danh sách tất cả số dư
     */
    @Get()
    @RequirePermission('account-balance.list.all')
    @ApiOperation({ summary: 'Xem danh sách số dư tất cả users (Admin)' })
    async findAll(
        @Req() req: Request,
        @Query('limit') limit?: number,
        @Query('offset') offset?: number,
        @Query('keywords') keywords?: string,
    ): Promise<GetResponse<IPaginatedResponse<IAccountBalance>>> {
        const adminId = (req.user as any).id;
        const lang = (req.user as any).language || 'vi';
        const data = await this.service.findAll({ limit, offset, keywords }, adminId, lang);
        return new GetResponse('account-balance.list', data);
    }

    /**
     * Xem số dư của user cụ thể
     */
    @Get(':userId')
    @RequirePermission('account-balance.list.all')
    @ApiOperation({ summary: 'Xem số dư của user cụ thể (Admin)' })
    @ApiParam({ name: 'userId', description: 'ID của user' })
    async findByUserId(
        @Param('userId') userId: string,
        @Req() req: Request,
    ): Promise<GetResponse<IAccountBalance>> {
        const adminId = (req.user as any).id;
        const lang = (req.user as any).language || 'vi';
        const data = await this.service.findByUserId(userId, adminId, lang);
        return new GetResponse('account-balance.get', data);
    }

    /**
     * Điều chỉnh số dư (thưởng/phạt)
     */
    @Post(':userId/adjust')
    @RequirePermission('account-balance.adjust')
    @ApiOperation({ summary: 'Điều chỉnh số dư user (Admin)' })
    @ApiParam({ name: 'userId', description: 'ID của user' })
    async adjustBalance(
        @Param('userId') userId: string,
        @Body() dto: AdjustBalanceDto,
        @Req() req: Request,
    ): Promise<OkResponse<{ balance: IAccountBalance; transaction: IBalanceTransaction }>> {
        const adminId = (req.user as any).id;
        const lang = (req.user as any).language || 'vi';
        const data = await this.service.adjustBalance(userId, dto, adminId, lang);
        return new OkResponse('account-balance.adjust', data);
    }
}

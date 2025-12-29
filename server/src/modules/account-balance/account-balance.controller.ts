import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
    Req,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { AccountBalanceService } from './account-balance.service';
import { SepayService } from '../payment/sepay.service';
import { CreateDepositDto, QueryBalanceTransactionDto } from './dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GetResponse, CreatedResponse } from '../../common/responses';
import type { IAccountBalance, IBalanceTransaction, IPaginatedResponse } from './interfaces';

/**
 * Controller cho số dư tài khoản người dùng
 */
@ApiTags('Account Balance')
@Controller('account/balance')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AccountBalanceController {
    constructor(
        private readonly service: AccountBalanceService,
        private readonly sepayService: SepayService,
    ) { }

    /**
     * Xem số dư của tôi
     */
    @Get()
    @ApiOperation({ summary: 'Xem số dư tài khoản của tôi' })
    async getMyBalance(@Req() req: Request): Promise<GetResponse<IAccountBalance>> {
        const userId = (req.user as any).id;
        const lang = (req.user as any).language || 'vi';
        const data = await this.service.getMyBalance(userId, lang);
        return new GetResponse('account-balance.get', data);
    }

    /**
     * Xem lịch sử giao dịch của tôi
     */
    @Get('transactions')
    @ApiOperation({ summary: 'Xem lịch sử giao dịch số dư' })
    async getMyTransactions(
        @Req() req: Request,
        @Query() query: QueryBalanceTransactionDto,
    ): Promise<GetResponse<IPaginatedResponse<IBalanceTransaction>>> {
        const userId = (req.user as any).id;
        const lang = (req.user as any).language || 'vi';
        const data = await this.service.getMyTransactions(userId, query, lang);
        return new GetResponse('account-balance.transactions', data);
    }

    /**
     * Tạo yêu cầu nạp tiền
     */
    @Post('deposit')
    @ApiOperation({ summary: 'Tạo yêu cầu nạp tiền vào tài khoản' })
    async createDeposit(
        @Req() req: Request,
        @Body() dto: CreateDepositDto,
    ): Promise<CreatedResponse<any>> {
        const userId = (req.user as any).id;
        const result = await this.sepayService.createDepositPayment({
            userId,
            amount: dto.amount,
            notes: dto.notes,
        });
        return new CreatedResponse('account-balance.deposit.created', result, 'Tạo yêu cầu nạp tiền thành công');
    }
}

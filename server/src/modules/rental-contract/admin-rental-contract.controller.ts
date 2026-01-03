import {
    Controller,
    Post,
    Body,
    UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { RentalContractService } from './rental-contract.service';
import { AdminCreateRentalContractDto } from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import { CreatedResponse } from '../../common/responses';

@ApiTags('Admin Rental Contracts')
@ApiBearerAuth()
@Controller('admin/rental-contracts')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AdminRentalContractController {
    constructor(
        private readonly rentalContractService: RentalContractService,
    ) { }

    /**
     * Admin tạo hợp đồng thuê mới
     * - Hỗ trợ thanh toán tiền mặt (kích hoạt ngay)
     * - Hoặc tạo link thanh toán chuyển khoản
     */
    @Post()
    @RequirePermission('rental-contract.create') // Cần quyền tạo hợp đồng 
    // Có thể thêm quyền admin cụ thể nếu cần, ví dụ: @RequirePermission('system.admin')
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
}

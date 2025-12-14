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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiHeader } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { RentalContractService } from './rental-contract.service';
import { CreateRentalContractDto, UpdateRentalContractDto, QueryRentalContractDto } from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission } from '../../common/decorators';
import { GetResponse, CreatedResponse, UpdatedResponse, DeletedResponse } from '../../common/responses';

@ApiTags('Rental Contracts')
@ApiBearerAuth()
@Controller('rental-contracts')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class RentalContractController {
    constructor(private readonly rentalContractService: RentalContractService) { }

    /**
     * Tạo hợp đồng thuê mới
     */
    @Post()
    @RequirePermission('rental-contract.create')
    @ApiOperation({ summary: 'Tạo hợp đồng thuê mới' })
    async create(
        @Body() dto: CreateRentalContractDto,
        @Request() req: any,
        @I18nLang() lang: string,
    ) {
        const data = await this.rentalContractService.create(dto, req.user.userId, lang);
        return new CreatedResponse('rental-contract.create.success', data, 'Tạo hợp đồng thuê thành công');
    }

    /**
     * Lấy danh sách hợp đồng
     */
    @Get()
    @RequirePermission('rental-contract.list')
    @ApiOperation({ summary: 'Lấy danh sách hợp đồng' })
    @ApiHeader({ name: 'x-organization-id', description: 'ID của tổ chức', required: false })
    async findMany(
        @Query() query: QueryRentalContractDto,
        @Request() req: any,
        @I18nLang() lang: string,
    ) {
        const organizationId = req.headers['x-organization-id'];
        const data = await this.rentalContractService.findMany(query, req.user.userId, organizationId, lang);
        return new GetResponse('rental-contract.list.success', data, 'Lấy danh sách hợp đồng thành công');
    }

    /**
     * Lấy chi tiết hợp đồng
     */
    @Get(':id')
    @RequirePermission('rental-contract.read')
    @ApiOperation({ summary: 'Lấy chi tiết hợp đồng' })
    @ApiHeader({ name: 'x-organization-id', description: 'ID của tổ chức', required: false })
    async findById(
        @Param('id') id: string,
        @Request() req: any,
        @I18nLang() lang: string,
    ) {
        const organizationId = req.headers['x-organization-id'];
        const data = await this.rentalContractService.findById(id, req.user.userId, organizationId, lang);
        return new GetResponse('rental-contract.read.success', data, 'Lấy thông tin hợp đồng thành công');
    }

    /**
     * Cập nhật/gia hạn hợp đồng
     */
    @Put(':id')
    @RequirePermission('rental-contract.update')
    @ApiOperation({ summary: 'Cập nhật/gia hạn hợp đồng' })
    @ApiHeader({ name: 'x-organization-id', description: 'ID của tổ chức', required: true })
    async update(
        @Param('id') id: string,
        @Body() dto: UpdateRentalContractDto,
        @Request() req: any,
        @I18nLang() lang: string,
    ) {
        const organizationId = req.headers['x-organization-id'];
        const data = await this.rentalContractService.update(id, dto, req.user.userId, organizationId, lang);
        return new UpdatedResponse('rental-contract.update.success', data, 'Cập nhật hợp đồng thành công');
    }

    /**
     * Hủy hợp đồng
     */
    @Delete(':id')
    @RequirePermission('rental-contract.delete')
    @ApiOperation({ summary: 'Hủy hợp đồng' })
    @ApiHeader({ name: 'x-organization-id', description: 'ID của tổ chức', required: true })
    async delete(
        @Param('id') id: string,
        @Request() req: any,
        @I18nLang() lang: string,
    ) {
        const organizationId = req.headers['x-organization-id'];
        await this.rentalContractService.delete(id, req.user.userId, organizationId, lang);
        return new DeletedResponse('rental-contract.delete.success', null, 'Hủy hợp đồng thành công');
    }
}


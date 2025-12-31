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
    ParseUUIDPipe,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
    ApiBody,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { InsuranceService } from './insurance.service';
import { CreateInsuranceDto, UpdateInsuranceDto, QueryInsuranceDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
} from '../../common/responses';
import { IInsurance, IPaginatedResponse } from './interfaces';

/**
 * Controller cho Insurance - Bảo hiểm
 */
@ApiTags('Insurances')
@Controller('insurances')
export class InsuranceController {
    constructor(private readonly insuranceService: InsuranceService) { }

    @Post()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('insurance.create')
    @ApiOperation({ summary: 'Tạo bảo hiểm mới' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async create(
        @Body() dto: CreateInsuranceDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<CreatedResponse<IInsurance>> {
        const result = await this.insuranceService.create(dto, userId, lang);
        return new CreatedResponse('insurance.create.success', result, 'Tạo bảo hiểm thành công');
    }

    @Get()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('insurance.list')
    @ApiOperation({ summary: 'Lấy danh sách bảo hiểm' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findAll(
        @Query() query: QueryInsuranceDto,
    ): Promise<GetResponse<IPaginatedResponse<IInsurance>>> {
        const result = await this.insuranceService.findAll(query);
        return new GetResponse('insurance.list.success', result, 'Lấy danh sách bảo hiểm thành công');
    }

    @Get('active')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('insurance.list')
    @ApiOperation({ summary: 'Lấy tất cả bảo hiểm active' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findAllActive(): Promise<GetResponse<IInsurance[]>> {
        const result = await this.insuranceService.findAllActive();
        return new GetResponse('insurance.list.success', result, 'Lấy danh sách bảo hiểm active thành công');
    }

    @Get(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('insurance.read')
    @ApiOperation({ summary: 'Lấy chi tiết bảo hiểm' })
    @ApiParam({ name: 'id', description: 'ID của bảo hiểm', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy bảo hiểm' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IInsurance>> {
        const result = await this.insuranceService.findById(id, lang);
        return new GetResponse('insurance.read.success', result, 'Lấy chi tiết bảo hiểm thành công');
    }

    @Put(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('insurance.update')
    @ApiOperation({ summary: 'Cập nhật bảo hiểm' })
    @ApiParam({ name: 'id', description: 'ID của bảo hiểm', type: 'string' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy bảo hiểm' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateInsuranceDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<IInsurance>> {
        const result = await this.insuranceService.update(id, dto, userId, lang);
        return new UpdatedResponse('insurance.update.success', result, 'Cập nhật bảo hiểm thành công');
    }

    @Delete('delete/many')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('insurance.delete')
    @ApiOperation({ summary: 'Xóa nhiều bảo hiểm' })
    @ApiBody({ type: DeleteManyDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy bảo hiểm' })
    async deleteMany(
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.insuranceService.deleteMany(dto.ids, userId, lang);
        return new DeletedResponse('insurance.delete.success', null, 'Xóa nhiều bảo hiểm thành công');
    }

    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('insurance.delete')
    @ApiOperation({ summary: 'Xóa bảo hiểm' })
    @ApiParam({ name: 'id', description: 'ID của bảo hiểm', type: 'string' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy bảo hiểm' })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.insuranceService.delete(id, userId, lang);
        return new DeletedResponse('insurance.delete.success', null, 'Xóa bảo hiểm thành công');
    }
}

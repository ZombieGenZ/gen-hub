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

import { CouponService } from './coupon.service';
import { CreateCouponDto, UpdateCouponDto, QueryCouponDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
} from '../../common/responses';
import { ICoupon, IPaginatedResponse } from './interfaces';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponController {
    constructor(private readonly couponService: CouponService) { }

    @Post()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('coupon.create')
    @ApiOperation({ summary: 'Tạo coupon mới' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async create(
        @Body() dto: CreateCouponDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<CreatedResponse<ICoupon>> {
        const result = await this.couponService.create(dto, userId, lang);
        return new CreatedResponse('coupon.create.success', result, 'Tạo coupon thành công');
    }

    @Get()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('coupon.list')
    @ApiOperation({ summary: 'Lấy danh sách coupon (Admin)' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findAll(
        @Query() query: QueryCouponDto,
    ): Promise<GetResponse<IPaginatedResponse<ICoupon>>> {
        const result = await this.couponService.findAll(query);
        return new GetResponse('coupon.list.success', result, 'Lấy danh sách coupon thành công');
    }

    @Get(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('coupon.read')
    @ApiOperation({ summary: 'Lấy chi tiết coupon' })
    @ApiParam({ name: 'id', description: 'ID của coupon', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy coupon' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<ICoupon>> {
        const result = await this.couponService.findById(id, lang);
        return new GetResponse('coupon.read.success', result, 'Lấy chi tiết coupon thành công');
    }

    @Put(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('coupon.update')
    @ApiOperation({ summary: 'Cập nhật coupon' })
    @ApiParam({ name: 'id', description: 'ID của coupon', type: 'string' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy coupon' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCouponDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<ICoupon>> {
        const result = await this.couponService.update(id, dto, userId, lang);
        return new UpdatedResponse('coupon.update.success', result, 'Cập nhật coupon thành công');
    }

    @Delete('delete/many')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('coupon.delete')
    @ApiOperation({ summary: 'Xóa nhiều coupon' })
    @ApiBody({ type: DeleteManyDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy coupon' })
    async deleteMany(
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.couponService.deleteMany(dto.ids, userId, lang);
        return new DeletedResponse('coupon.delete.success', null, 'Xóa nhiều coupon thành công');
    }

    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('coupon.delete')
    @ApiOperation({ summary: 'Xóa coupon' })
    @ApiParam({ name: 'id', description: 'ID của coupon', type: 'string' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy coupon' })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.couponService.delete(id, userId, lang);
        return new DeletedResponse('coupon.delete.success', null, 'Xóa coupon thành công');
    }
}

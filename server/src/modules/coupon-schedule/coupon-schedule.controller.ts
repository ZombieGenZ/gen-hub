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

import { CouponScheduleService } from './coupon-schedule.service';
import { CreateCouponScheduleDto, UpdateCouponScheduleDto, QueryCouponScheduleDto } from './dto';
import { DeleteManyDto } from '../../common/dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission, CurrentUser } from '../../common/decorators';
import {
    CreatedResponse,
    UpdatedResponse,
    GetResponse,
    DeletedResponse,
} from '../../common/responses';
import { ICouponSchedule, IPaginatedResponse } from './interfaces';

@ApiTags('Coupon Schedules')
@Controller('coupon-schedules')
export class CouponScheduleController {
    constructor(private readonly couponScheduleService: CouponScheduleService) { }

    @Post()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('coupon-schedule.create')
    @ApiOperation({ summary: 'Tạo lịch coupon mới' })
    @ApiResponse({ status: 201, description: 'Tạo thành công' })
    @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async create(
        @Body() dto: CreateCouponScheduleDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<CreatedResponse<ICouponSchedule>> {
        const result = await this.couponScheduleService.create(dto, userId, lang);
        return new CreatedResponse('coupon-schedule.create.success', result, 'Tạo lịch coupon thành công');
    }

    @Get()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('coupon-schedule.list')
    @ApiOperation({ summary: 'Lấy danh sách lịch coupon' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findAll(
        @Query() query: QueryCouponScheduleDto,
    ): Promise<GetResponse<IPaginatedResponse<ICouponSchedule>>> {
        const result = await this.couponScheduleService.findAll(query);
        return new GetResponse('coupon-schedule.list.success', result, 'Lấy danh sách lịch coupon thành công');
    }

    @Get(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('coupon-schedule.read')
    @ApiOperation({ summary: 'Lấy chi tiết lịch coupon' })
    @ApiParam({ name: 'id', description: 'ID của lịch coupon', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    @ApiResponse({ status: 403, description: 'Không có quyền' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<ICouponSchedule>> {
        const result = await this.couponScheduleService.findById(id, lang);
        return new GetResponse('coupon-schedule.read.success', result, 'Lấy chi tiết lịch coupon thành công');
    }

    @Put(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('coupon-schedule.update')
    @ApiOperation({ summary: 'Cập nhật lịch coupon' })
    @ApiParam({ name: 'id', description: 'ID của lịch coupon', type: 'string' })
    @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    async update(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCouponScheduleDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<UpdatedResponse<ICouponSchedule>> {
        const result = await this.couponScheduleService.update(id, dto, userId, lang);
        return new UpdatedResponse('coupon-schedule.update.success', result, 'Cập nhật lịch coupon thành công');
    }

    @Delete('delete/many')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('coupon-schedule.delete')
    @ApiOperation({ summary: 'Xóa nhiều lịch coupon' })
    @ApiBody({ type: DeleteManyDto })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    async deleteMany(
        @Body() dto: DeleteManyDto,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.couponScheduleService.deleteMany(dto.ids, userId, lang);
        return new DeletedResponse('coupon-schedule.delete.success', null as any, 'Xóa nhiều lịch coupon thành công');
    }

    @Delete(':id')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('coupon-schedule.delete')
    @ApiOperation({ summary: 'Xóa lịch coupon' })
    @ApiParam({ name: 'id', description: 'ID của lịch coupon', type: 'string' })
    @ApiResponse({ status: 200, description: 'Xóa thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    async delete(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<DeletedResponse<null>> {
        await this.couponScheduleService.delete(id, userId, lang);
        return new DeletedResponse('coupon-schedule.delete.success', null as any, 'Xóa lịch coupon thành công');
    }
}

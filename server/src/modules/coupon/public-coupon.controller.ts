import {
    Controller,
    Get,
    Post,
    Delete,
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
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { CouponService } from './coupon.service';
import { QueryCouponDto } from './dto';
import { JwtAuthGuard } from '../../common/guards';
import { CurrentUser, Public } from '../../common/decorators';
import { GetResponse, OkResponse } from '../../common/responses';
import { ICoupon, IPaginatedResponse } from './interfaces';

@ApiTags('Public Coupons')
@Controller('public/coupons')
export class PublicCouponController {
    constructor(private readonly couponService: CouponService) { }

    @Get()
    @Public()
    @ApiOperation({ summary: 'Lấy danh sách coupon công khai' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findAllPublic(
        @Query() query: QueryCouponDto,
    ): Promise<GetResponse<IPaginatedResponse<ICoupon>>> {
        const result = await this.couponService.findAllPublic(query);
        return new GetResponse('coupon.public.list.success', result, 'Lấy danh sách coupon công khai thành công');
    }

    @Get('saved')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Lấy danh sách coupon đã lưu của user' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async getSavedCoupons(
        @CurrentUser('userId') userId: string,
        @Query() query: QueryCouponDto,
    ): Promise<GetResponse<IPaginatedResponse<ICoupon>>> {
        const result = await this.couponService.getSavedCoupons(userId, query);
        return new GetResponse('coupon.saved.list.success', result, 'Lấy danh sách coupon đã lưu thành công');
    }

    @Post(':id/save')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Lưu coupon vào tài khoản' })
    @ApiParam({ name: 'id', description: 'ID của coupon', type: 'string' })
    @ApiResponse({ status: 200, description: 'Lưu thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy coupon' })
    @ApiResponse({ status: 409, description: 'Coupon đã được lưu' })
    async saveCoupon(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<OkResponse<null>> {
        await this.couponService.saveCoupon(userId, id, lang);
        return new OkResponse('coupon.save.success', null, 'Lưu coupon thành công');
    }

    @Delete(':id/save')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard)
    @ApiOperation({ summary: 'Bỏ lưu coupon khỏi tài khoản' })
    @ApiParam({ name: 'id', description: 'ID của coupon', type: 'string' })
    @ApiResponse({ status: 200, description: 'Bỏ lưu thành công' })
    @ApiResponse({ status: 404, description: 'Coupon chưa được lưu' })
    async unsaveCoupon(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser('userId') userId: string,
        @I18nLang() lang: string,
    ): Promise<OkResponse<null>> {
        await this.couponService.unsaveCoupon(userId, id, lang);
        return new OkResponse('coupon.unsave.success', null, 'Bỏ lưu coupon thành công');
    }
}

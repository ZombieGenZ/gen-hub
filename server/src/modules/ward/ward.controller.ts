import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { WardService } from './ward.service';
import { QueryWardDto } from './dto';
import { GetResponse, ResponseCode } from '../../common/responses';
import { Public } from '../../common/decorators';
import { IWard, IWardWithProvince, IPaginatedResponse } from './interfaces';

@ApiTags('Wards')
@Controller()
export class WardController {
    constructor(private readonly service: WardService) { }

    /**
     * Lấy danh sách phường/xã (Public API)
     */
    @Get('wards')
    @Public()
    @ApiOperation({ summary: 'Lấy danh sách phường/xã' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findMany(
        @Query() query: QueryWardDto,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IPaginatedResponse<IWard>>> {
        const result = await this.service.findMany(query, lang);
        return new GetResponse(ResponseCode.WARD_LIST_SUCCESS, result);
    }

    /**
     * Lấy chi tiết phường/xã theo ID (Public API)
     */
    @Get('wards/:id')
    @Public()
    @ApiOperation({ summary: 'Lấy chi tiết phường/xã' })
    @ApiParam({ name: 'id', description: 'ID của phường/xã' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IWardWithProvince>> {
        const result = await this.service.findById(id, lang);
        return new GetResponse(ResponseCode.WARD_GET_SUCCESS, result);
    }

    /**
     * Lấy danh sách phường/xã theo Province ID (Public API)
     */
    @Get('provinces/:provinceId/wards')
    @Public()
    @ApiOperation({ summary: 'Lấy danh sách phường/xã theo tỉnh/thành phố' })
    @ApiParam({ name: 'provinceId', description: 'ID của tỉnh/thành phố' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findByProvinceId(
        @Param('provinceId', ParseUUIDPipe) provinceId: string,
        @Query() query: QueryWardDto,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IPaginatedResponse<IWard>>> {
        const result = await this.service.findByProvinceId(provinceId, query, lang);
        return new GetResponse(ResponseCode.WARD_LIST_SUCCESS, result);
    }
}

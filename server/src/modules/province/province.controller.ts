import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { ProvinceService } from './province.service';
import { QueryProvinceDto } from './dto';
import { GetResponse, ResponseCode } from '../../common/responses';
import { Public } from '../../common/decorators';
import { IProvince, IProvinceWithWards } from './interfaces';

@ApiTags('Provinces')
@Controller('provinces')
export class ProvinceController {
    constructor(private readonly service: ProvinceService) { }

    /**
     * Lấy danh sách tỉnh/thành phố (Public API)
     */
    @Get()
    @Public()
    @ApiOperation({ summary: 'Lấy danh sách tỉnh/thành phố' })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async findMany(
        @Query() query: QueryProvinceDto,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IProvince[]>> {
        const result = await this.service.findMany(query, lang);
        return new GetResponse(ResponseCode.PROVINCE_LIST_SUCCESS, result);
    }

    /**
     * Lấy chi tiết tỉnh/thành phố theo ID (Public API)
     */
    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Lấy chi tiết tỉnh/thành phố' })
    @ApiParam({ name: 'id', description: 'ID của tỉnh/thành phố' })
    @ApiResponse({ status: 200, description: 'Lấy thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy' })
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IProvinceWithWards>> {
        const result = await this.service.findById(id, lang);
        return new GetResponse(ResponseCode.PROVINCE_GET_SUCCESS, result);
    }
}

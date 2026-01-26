import { Controller, Get, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiQuery,
    ApiExtraModels,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';
import { ProvinceType } from '@prisma/client';

import { ProvinceService } from './province.service';
import { QueryProvinceDto } from './dto';
import { GetResponse, ResponseCode } from '../../common/responses';
import { Public, ApiValidationErrorResponse } from '../../common/decorators';
import { IProvince, IProvinceWithWards } from './types';

@ApiTags('Provinces')
@Controller('provinces')
@ApiExtraModels(QueryProvinceDto)
export class ProvinceController {
    constructor(private readonly service: ProvinceService) { }

    /**
     * Lấy danh sách tỉnh/thành phố (Public API)
     */
    @Get()
    @Public()
    @ApiOperation({
        summary: 'Lấy danh sách tỉnh/thành phố',
        description:
            'API công khai để lấy danh sách tỉnh/thành phố. Hỗ trợ tìm kiếm theo từ khóa (tên, mã) và lọc theo loại (PROVINCE/CITY). Dữ liệu được cache để tối ưu hiệu năng.',
    })
    @ApiQuery({
        name: 'keywords',
        required: false,
        type: String,
        description: 'Từ khóa tìm kiếm (tên tỉnh/thành phố, mã)',
        example: 'Hà Nội',
    })
    @ApiQuery({
        name: 'type',
        required: false,
        enum: ProvinceType,
        description: 'Loại tỉnh/thành phố (PROVINCE: Tỉnh, CITY: Thành phố trực thuộc trung ương)',
        example: 'CITY',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách tỉnh/thành phố thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'province.list_success' },
                message: { type: 'string', example: 'Lấy danh sách tỉnh/thành phố thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            id: {
                                type: 'string',
                                format: 'uuid',
                                description: 'ID của tỉnh/thành phố',
                                example: '550e8400-e29b-41d4-a716-446655440001',
                            },
                            code: {
                                type: 'string',
                                description: 'Mã tỉnh/thành phố',
                                example: '01',
                            },
                            name: {
                                type: 'string',
                                description: 'Tên tỉnh/thành phố',
                                example: 'Thành phố Hà Nội',
                            },
                            slug: {
                                type: 'string',
                                description: 'Slug URL-friendly',
                                example: 'thanh-pho-ha-noi',
                            },
                            type: {
                                type: 'string',
                                enum: ['PROVINCE', 'CITY'],
                                description: 'Loại: PROVINCE (Tỉnh) hoặc CITY (Thành phố trực thuộc TW)',
                                example: 'CITY',
                            },
                            is_active: {
                                type: 'boolean',
                                description: 'Trạng thái hoạt động',
                                example: true,
                            },
                            created_at: {
                                type: 'string',
                                format: 'date-time',
                                description: 'Ngày tạo',
                                example: '2024-01-01T00:00:00.000Z',
                            },
                            updated_at: {
                                type: 'string',
                                format: 'date-time',
                                description: 'Ngày cập nhật',
                                example: '2024-01-01T00:00:00.000Z',
                            },
                        },
                    },
                },
            },
            example: {
                code: 'province.list_success',
                message: 'Lấy danh sách tỉnh/thành phố thành công',
                success: true,
                data: [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440001',
                        code: '01',
                        name: 'Thành phố Hà Nội',
                        slug: 'thanh-pho-ha-noi',
                        type: 'CITY',
                        is_active: true,
                        created_at: '2024-01-01T00:00:00.000Z',
                        updated_at: '2024-01-01T00:00:00.000Z',
                    },
                    {
                        id: '550e8400-e29b-41d4-a716-446655440002',
                        code: '79',
                        name: 'Thành phố Hồ Chí Minh',
                        slug: 'thanh-pho-ho-chi-minh',
                        type: 'CITY',
                        is_active: true,
                        created_at: '2024-01-01T00:00:00.000Z',
                        updated_at: '2024-01-01T00:00:00.000Z',
                    },
                ],
            },
        },
    })
    @ApiValidationErrorResponse()
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
    @ApiOperation({
        summary: 'Lấy chi tiết tỉnh/thành phố',
        description:
            'API công khai để lấy thông tin chi tiết của một tỉnh/thành phố theo ID, bao gồm danh sách các phường/xã thuộc tỉnh/thành phố đó.',
    })
    @ApiParam({
        name: 'id',
        type: String,
        format: 'uuid',
        description: 'ID của tỉnh/thành phố (UUID v4)',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy chi tiết tỉnh/thành phố thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'province.get_success' },
                message: { type: 'string', example: 'Lấy thông tin tỉnh/thành phố thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID của tỉnh/thành phố',
                            example: '550e8400-e29b-41d4-a716-446655440001',
                        },
                        code: {
                            type: 'string',
                            description: 'Mã tỉnh/thành phố',
                            example: '01',
                        },
                        name: {
                            type: 'string',
                            description: 'Tên tỉnh/thành phố',
                            example: 'Thành phố Hà Nội',
                        },
                        slug: {
                            type: 'string',
                            description: 'Slug URL-friendly',
                            example: 'thanh-pho-ha-noi',
                        },
                        type: {
                            type: 'string',
                            enum: ['PROVINCE', 'CITY'],
                            description: 'Loại: PROVINCE (Tỉnh) hoặc CITY (Thành phố trực thuộc TW)',
                            example: 'CITY',
                        },
                        is_active: {
                            type: 'boolean',
                            description: 'Trạng thái hoạt động',
                            example: true,
                        },
                        created_at: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Ngày tạo',
                            example: '2024-01-01T00:00:00.000Z',
                        },
                        updated_at: {
                            type: 'string',
                            format: 'date-time',
                            description: 'Ngày cập nhật',
                            example: '2024-01-01T00:00:00.000Z',
                        },
                        wards: {
                            type: 'array',
                            description: 'Danh sách phường/xã thuộc tỉnh/thành phố',
                            items: {
                                type: 'object',
                                properties: {
                                    id: {
                                        type: 'string',
                                        format: 'uuid',
                                        description: 'ID của phường/xã',
                                        example: '550e8400-e29b-41d4-a716-446655440010',
                                    },
                                    code: {
                                        type: 'string',
                                        description: 'Mã phường/xã',
                                        example: '00001',
                                    },
                                    name: {
                                        type: 'string',
                                        description: 'Tên phường/xã',
                                        example: 'Phường Phúc Xá',
                                    },
                                    slug: {
                                        type: 'string',
                                        description: 'Slug URL-friendly',
                                        example: 'phuong-phuc-xa',
                                    },
                                    type: {
                                        type: 'string',
                                        enum: ['WARD', 'COMMUNE', 'TOWNSHIP', 'TOWN', 'CITY'],
                                        description: 'Loại phường/xã',
                                        example: 'WARD',
                                    },
                                },
                            },
                        },
                    },
                },
            },
            example: {
                code: 'province.get_success',
                message: 'Lấy thông tin tỉnh/thành phố thành công',
                success: true,
                data: {
                    id: '550e8400-e29b-41d4-a716-446655440001',
                    code: '01',
                    name: 'Thành phố Hà Nội',
                    slug: 'thanh-pho-ha-noi',
                    type: 'CITY',
                    is_active: true,
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: '2024-01-01T00:00:00.000Z',
                    wards: [
                        {
                            id: '550e8400-e29b-41d4-a716-446655440010',
                            code: '00001',
                            name: 'Phường Phúc Xá',
                            slug: 'phuong-phuc-xa',
                            type: 'WARD',
                        },
                        {
                            id: '550e8400-e29b-41d4-a716-446655440011',
                            code: '00004',
                            name: 'Phường Trúc Bạch',
                            slug: 'phuong-truc-bach',
                            type: 'WARD',
                        },
                    ],
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy tỉnh/thành phố',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'error.not_found' },
                message: { type: 'string', example: 'Không tìm thấy tỉnh/thành phố' },
                success: { type: 'boolean', example: false },
            },
            example: {
                code: 'error.not_found',
                message: 'Không tìm thấy tỉnh/thành phố',
                success: false,
            },
        },
    })
    @ApiValidationErrorResponse()
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IProvinceWithWards>> {
        const result = await this.service.findById(id, lang);
        return new GetResponse(ResponseCode.PROVINCE_GET_SUCCESS, result);
    }
}

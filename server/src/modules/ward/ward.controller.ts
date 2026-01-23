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

import { WardService } from './ward.service';
import { QueryWardDto } from './dto';
import { GetResponse, ResponseCode } from '../../common/responses';
import { Public, ApiValidationErrorResponse } from '../../common/decorators';
import { IWard, IWardWithProvince } from './types';

@ApiTags('Wards')
@Controller()
@ApiExtraModels(QueryWardDto)
export class WardController {
    constructor(private readonly service: WardService) { }

    /**
     * Lấy danh sách phường/xã (Public API)
     */
    @Get('wards')
    @Public()
    @ApiOperation({
        summary: 'Lấy danh sách phường/xã',
        description:
            'API công khai để lấy danh sách phường/xã. Hỗ trợ tìm kiếm theo từ khóa (tên, mã), lọc theo loại (WARD/COMMUNE/TOWNSHIP/TOWN/CITY) và lọc theo tỉnh/thành phố. Dữ liệu được cache để tối ưu hiệu năng.',
    })
    @ApiQuery({
        name: 'keywords',
        required: false,
        type: String,
        description: 'Từ khóa tìm kiếm (tên phường/xã, mã)',
        example: 'Phúc Xá',
    })
    @ApiQuery({
        name: 'type',
        required: false,
        enum: ['WARD', 'COMMUNE', 'TOWNSHIP', 'TOWN', 'CITY'],
        description:
            'Loại phường/xã (WARD: Phường, COMMUNE: Xã, TOWNSHIP: Thị trấn, TOWN: Thị xã, CITY: Thành phố)',
        example: 'WARD',
    })
    @ApiQuery({
        name: 'province_id',
        required: false,
        type: String,
        format: 'uuid',
        description: 'ID tỉnh/thành phố để lọc phường/xã thuộc tỉnh/thành phố đó',
        example: '550e8400-e29b-41d4-a716-446655440001',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách phường/xã thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'ward.list_success' },
                message: { type: 'string', example: 'Lấy danh sách phường/xã thành công' },
                success: { type: 'boolean', example: true },
                data: {
                    type: 'array',
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
                            province_id: {
                                type: 'string',
                                format: 'uuid',
                                description: 'ID của tỉnh/thành phố',
                                example: '550e8400-e29b-41d4-a716-446655440001',
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
                code: 'ward.list_success',
                message: 'Lấy danh sách phường/xã thành công',
                success: true,
                data: [
                    {
                        id: '550e8400-e29b-41d4-a716-446655440010',
                        code: '00001',
                        name: 'Phường Phúc Xá',
                        slug: 'phuong-phuc-xa',
                        type: 'WARD',
                        province_id: '550e8400-e29b-41d4-a716-446655440001',
                        is_active: true,
                        created_at: '2024-01-01T00:00:00.000Z',
                        updated_at: '2024-01-01T00:00:00.000Z',
                    },
                    {
                        id: '550e8400-e29b-41d4-a716-446655440011',
                        code: '00004',
                        name: 'Phường Trúc Bạch',
                        slug: 'phuong-truc-bach',
                        type: 'WARD',
                        province_id: '550e8400-e29b-41d4-a716-446655440001',
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
        @Query() query: QueryWardDto,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IWard[]>> {
        const result = await this.service.findMany(query, lang);
        return new GetResponse(ResponseCode.WARD_LIST_SUCCESS, result);
    }

    /**
     * Lấy chi tiết phường/xã theo ID (Public API)
     */
    @Get('wards/:id')
    @Public()
    @ApiOperation({
        summary: 'Lấy chi tiết phường/xã',
        description:
            'API công khai để lấy thông tin chi tiết của một phường/xã theo ID, bao gồm thông tin tỉnh/thành phố mà phường/xã đó thuộc về.',
    })
    @ApiParam({
        name: 'id',
        type: String,
        format: 'uuid',
        description: 'ID của phường/xã (UUID v4)',
        example: '550e8400-e29b-41d4-a716-446655440010',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy chi tiết phường/xã thành công',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'ward.get_success' },
                message: { type: 'string', example: 'Lấy thông tin phường/xã thành công' },
                success: { type: 'boolean', example: true },
                data: {
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
                        province_id: {
                            type: 'string',
                            format: 'uuid',
                            description: 'ID của tỉnh/thành phố',
                            example: '550e8400-e29b-41d4-a716-446655440001',
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
                        province: {
                            type: 'object',
                            description: 'Thông tin tỉnh/thành phố',
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
                            },
                        },
                    },
                },
            },
            example: {
                code: 'ward.get_success',
                message: 'Lấy thông tin phường/xã thành công',
                success: true,
                data: {
                    id: '550e8400-e29b-41d4-a716-446655440010',
                    code: '00001',
                    name: 'Phường Phúc Xá',
                    slug: 'phuong-phuc-xa',
                    type: 'WARD',
                    province_id: '550e8400-e29b-41d4-a716-446655440001',
                    is_active: true,
                    created_at: '2024-01-01T00:00:00.000Z',
                    updated_at: '2024-01-01T00:00:00.000Z',
                    province: {
                        id: '550e8400-e29b-41d4-a716-446655440001',
                        code: '01',
                        name: 'Thành phố Hà Nội',
                    },
                },
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy phường/xã',
        schema: {
            type: 'object',
            properties: {
                code: { type: 'string', example: 'error.not_found' },
                message: { type: 'string', example: 'Không tìm thấy phường/xã' },
                success: { type: 'boolean', example: false },
            },
            example: {
                code: 'error.not_found',
                message: 'Không tìm thấy phường/xã',
                success: false,
            },
        },
    })
    @ApiValidationErrorResponse()
    async findById(
        @Param('id', ParseUUIDPipe) id: string,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IWardWithProvince>> {
        const result = await this.service.findById(id, lang);
        return new GetResponse(ResponseCode.WARD_GET_SUCCESS, result);
    }
}

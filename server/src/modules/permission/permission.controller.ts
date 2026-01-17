import {
    Controller,
    Get,
    Post,
    Body,
    Query,
    UseGuards,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';
import { I18nLang } from 'nestjs-i18n';

import { PermissionService } from './permission.service';
import { QueryPermissionDto } from './dto';
import { JwtAuthGuard, PermissionGuard } from '../../common/guards';
import { RequirePermission } from '../../common/decorators';
import { GetResponse, ResponseCode } from '../../common/responses';
import { IPermissionListResult, IPermissionWithAssignmentListResult } from './interfaces';

@ApiTags('Permissions')
@Controller('permissions')
export class PermissionController {
    constructor(private readonly service: PermissionService) { }

    /**
     * Lấy danh sách modules (prefix) duy nhất từ permission keys
     */
    @Get('modules')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('permission.read')
    @ApiOperation({
        summary: 'Lấy danh sách modules',
        description: 'Trả về danh sách các module (prefix của permission key) duy nhất.',
    })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async getModules(): Promise<GetResponse<string[]>> {
        const result = await this.service.getModules();
        return new GetResponse(ResponseCode.PERMISSION_LIST_SUCCESS, result);
    }

    /**
     * Lấy danh sách permissions trong hệ thống
     * Có thể truyền type (role/user) và id để so sánh với permissions đã gán
     */
    @Get()
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('permission.read')
    @ApiOperation({
        summary: 'Lấy danh sách permissions',
        description: 'Lấy danh sách permissions. Nếu truyền type và id sẽ trả về permissions với trạng thái is_assigned.',
    })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    @ApiResponse({ status: 403, description: 'Không có quyền truy cập' })
    async findMany(
        @Query() query: QueryPermissionDto,
        @I18nLang() lang: string,
    ): Promise<GetResponse<IPermissionListResult | IPermissionWithAssignmentListResult>> {
        const result = await this.service.findMany(query, lang);
        return new GetResponse(ResponseCode.PERMISSION_LIST_SUCCESS, result);
    }

    /**
     * Lấy danh sách permission IDs theo role IDs
     * Dùng cho frontend để tính toán permissions kế thừa từ roles
     */
    @Post('by-roles')
    @ApiBearerAuth('JWT-auth')
    @UseGuards(JwtAuthGuard, PermissionGuard)
    @RequirePermission('permission.read')
    @ApiOperation({
        summary: 'Lấy permission IDs theo role IDs',
        description: 'Trả về danh sách permission IDs được gán cho các roles được chỉ định.',
    })
    @ApiResponse({ status: 200, description: 'Lấy danh sách thành công' })
    async getPermissionIdsByRoleIds(
        @Body() dto: { role_ids: string[] },
    ): Promise<GetResponse<string[]>> {
        const result = await this.service.getPermissionIdsByRoleIds(dto.role_ids);
        return new GetResponse(ResponseCode.PERMISSION_LIST_SUCCESS, result);
    }
}

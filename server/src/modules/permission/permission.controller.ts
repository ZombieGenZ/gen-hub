import {
    Controller,
    Get,
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
}

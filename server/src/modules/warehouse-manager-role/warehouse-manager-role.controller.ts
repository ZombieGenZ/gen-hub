import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';

import { WarehouseManagerRoleService } from './warehouse-manager-role.service';
import { CreateWarehouseManagerRoleDto, UpdateWarehouseManagerRoleDto } from './dto';
import { ApiAuthResponses, ApiValidationErrorResponse } from '../../common/decorators';
import { RequireAnyPermission } from '../../common/decorators/require-any-permission.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PermissionGuard } from '../../common/guards/permission.guard';
import { CreatedResponse, DeletedResponse, GetResponse, ResponseCode, UpdatedResponse } from '../../common/responses';

const ROLE_ID = 'b2f76b83-ce55-49bc-955c-4ddf49bc955c';
const PERMISSION_ID = '1d9ac3a5-f593-4e73-9a7c-435f0d6b45e1';

const warehouseManagerRoleSchema = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid', description: 'ID của vai trò', example: ROLE_ID },
        name: { type: 'string', description: 'Tên vai trò quản lý kho', example: 'Quản lý kho ca sáng' },
        description: {
            type: 'string',
            nullable: true,
            description: 'Mô tả ngắn về phạm vi và trách nhiệm của vai trò',
            example: 'Phụ trách duyệt phiếu nhập và xuất kho tại kho trung tâm',
        },
        created_at: { type: 'string', format: 'date-time', description: 'Thời điểm tạo', example: '2026-03-31T08:30:00.000Z' },
        updated_at: { type: 'string', format: 'date-time', description: 'Thời điểm cập nhật gần nhất', example: '2026-03-31T09:15:00.000Z' },
        permissions: {
            type: 'array',
            description: 'Danh sách quyền hạn đã gán cho vai trò',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid', example: PERMISSION_ID },
                    key: { type: 'string', example: 'warehouse-manager.inventory.outbound.approve' },
                    name: { type: 'string', example: 'Duyệt phiếu xuất kho' },
                    description: { type: 'string', example: 'Cho phép duyệt và xử lý phiếu xuất kho thuộc phạm vi được phân quyền' },
                },
            },
        },
    },
};

const roleSuccessSchema = (code: string, message: string) => ({
    type: 'object',
    properties: {
        code: { type: 'string', example: code },
        message: { type: 'string', example: message },
        success: { type: 'boolean', example: true },
        data: warehouseManagerRoleSchema,
    },
});

const roleListSuccessSchema = {
    type: 'object',
    properties: {
        code: { type: 'string', example: ResponseCode.WAREHOUSE_MANAGER_ROLE_LIST_SUCCESS },
        message: { type: 'string', example: 'Lấy danh sách vai trò quản lý kho thành công' },
        success: { type: 'boolean', example: true },
        data: {
            type: 'object',
            properties: {
                items: {
                    type: 'array',
                    items: warehouseManagerRoleSchema,
                },
                meta: {
                    type: 'object',
                    properties: {
                        totalItems: { type: 'number', example: 2 },
                        itemCount: { type: 'number', example: 2 },
                        itemsPerPage: { type: 'number', example: 10 },
                        totalPages: { type: 'number', example: 1 },
                        currentPage: { type: 'number', example: 1 },
                    },
                },
            },
            example: {
                items: [
                    {
                        id: ROLE_ID,
                        name: 'Quản lý kho ca sáng',
                        description: 'Phụ trách duyệt phiếu nhập và xuất kho tại kho trung tâm',
                        created_at: '2026-03-31T08:30:00.000Z',
                        updated_at: '2026-03-31T09:15:00.000Z',
                        permissions: [
                            {
                                id: PERMISSION_ID,
                                key: 'warehouse-manager.inventory.outbound.approve',
                                name: 'Duyệt phiếu xuất kho',
                                description: 'Cho phép duyệt và xử lý phiếu xuất kho thuộc phạm vi được phân quyền',
                            },
                        ],
                    },
                ],
                meta: {
                    totalItems: 2,
                    itemCount: 2,
                    itemsPerPage: 10,
                    totalPages: 1,
                    currentPage: 1,
                },
            },
        },
    },
};

const permissionListSuccessSchema = {
    type: 'object',
    properties: {
        code: { type: 'string', example: ResponseCode.WAREHOUSE_MANAGER_ROLE_PERMISSIONS_LIST_SUCCESS },
        message: { type: 'string', example: 'Lấy danh sách quyền hạn thành công' },
        success: { type: 'boolean', example: true },
        data: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    id: { type: 'string', format: 'uuid', example: PERMISSION_ID },
                    key: { type: 'string', example: 'warehouse-manager.inventory.inbound.list' },
                    name: { type: 'string', example: 'Xem danh sách phiếu nhập kho' },
                    description: { type: 'string', example: 'Cho phép xem danh sách phiếu nhập kho thuộc phạm vi phụ trách' },
                },
            },
            example: [
                {
                    id: PERMISSION_ID,
                    key: 'warehouse-manager.inventory.inbound.list',
                    name: 'Xem danh sách phiếu nhập kho',
                    description: 'Cho phép xem danh sách phiếu nhập kho thuộc phạm vi phụ trách',
                },
                {
                    id: '5a9e6f02-df9d-46af-a7cf-3c03f2c4b3fd',
                    key: 'warehouse-manager.inventory.outbound.approve',
                    name: 'Duyệt phiếu xuất kho',
                    description: 'Cho phép duyệt và xử lý phiếu xuất kho thuộc phạm vi được phân quyền',
                },
            ],
        },
    },
};

const deleteSuccessSchema = {
    type: 'object',
    properties: {
        code: { type: 'string', example: ResponseCode.WAREHOUSE_MANAGER_ROLE_DELETE_SUCCESS },
        message: { type: 'string', example: 'Xóa vai trò thành công' },
        success: { type: 'boolean', example: true },
        data: { type: 'null', nullable: true, example: null },
    },
};

const notFoundSchema = {
    type: 'object',
    properties: {
        code: { type: 'string', example: 'warehouse_manager.errors.role_not_found' },
        message: { type: 'string', example: 'Không tìm thấy vai trò quản lý kho' },
        success: { type: 'boolean', example: false },
    },
};

const conflictSchema = (message: string) => ({
    type: 'object',
    properties: {
        code: { type: 'string', example: 'warehouse_manager_role.conflict' },
        message: { type: 'string', example: message },
        success: { type: 'boolean', example: false },
    },
});

@ApiTags('Warehouse Manager Roles')
@Controller('warehouse-manager-roles')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth('JWT-auth')
export class WarehouseManagerRoleController {
    constructor(private readonly warehouseManagerRoleService: WarehouseManagerRoleService) { }

    @Post()
    @RequireAnyPermission('warehouse-manager-role.create')
    @ApiOperation({
        summary: 'Tạo vai trò quản lý kho mới',
        description:
            'Tạo mới một vai trò quản lý kho với tên, mô tả và danh sách quyền hạn được gán ban đầu. ' +
            'Vai trò tạo thành công sẽ được dùng để phân quyền cho Warehouse Manager trong phạm vi nghiệp vụ kho. ' +
            'Yêu cầu quyền `warehouse-manager-role.create`.',
    })
    @ApiBody({
        type: CreateWarehouseManagerRoleDto,
        description: 'Thông tin vai trò quản lý kho cần tạo mới',
        examples: {
            basic_role: {
                summary: 'Tạo vai trò cơ bản',
                description: 'Tạo vai trò chỉ có tên và mô tả, chưa gán quyền hạn cụ thể',
                value: {
                    name: 'Nhân viên kiểm đếm kho',
                    description: 'Chịu trách nhiệm kiểm đếm và xác nhận số lượng hàng nhập kho',
                },
            },
            manager_role: {
                summary: 'Tạo vai trò đầy đủ quyền nghiệp vụ',
                description: 'Tạo vai trò có mô tả và danh sách quyền hạn xử lý inbound/outbound',
                value: {
                    name: 'Quản lý kho ca sáng',
                    description: 'Phụ trách duyệt phiếu nhập và xuất kho tại kho trung tâm',
                    permission_ids: [
                        '1d9ac3a5-f593-4e73-9a7c-435f0d6b45e1',
                        '5a9e6f02-df9d-46af-a7cf-3c03f2c4b3fd',
                    ],
                },
            },
            outbound_specialist: {
                summary: 'Tạo vai trò điều phối xuất kho',
                description: 'Ví dụ tạo vai trò ưu tiên xử lý phiếu xuất kho và tách phiếu thiếu hàng',
                value: {
                    name: 'Điều phối xuất kho',
                    description: 'Theo dõi tồn kho, duyệt phiếu xuất và xử lý thiếu hàng',
                    permission_ids: [
                        '5a9e6f02-df9d-46af-a7cf-3c03f2c4b3fd',
                        'c1840188-d0bc-4234-8f17-41965d1b6260',
                    ],
                },
            },
        },
    })
    @ApiResponse({
        status: 201,
        description: 'Tạo vai trò quản lý kho thành công',
        schema: roleSuccessSchema(ResponseCode.WAREHOUSE_MANAGER_ROLE_CREATE_SUCCESS, 'Tạo vai trò thành công'),
    })
    @ApiResponse({
        status: 409,
        description: 'Xung đột dữ liệu khi tạo vai trò',
        schema: conflictSchema('Tên vai trò đã tồn tại hoặc có quyền hạn không hợp lệ'),
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async create(@Body() dto: CreateWarehouseManagerRoleDto) {
        const data = await this.warehouseManagerRoleService.createRole(dto);
        return new CreatedResponse(ResponseCode.WAREHOUSE_MANAGER_ROLE_CREATE_SUCCESS, data, 'Tạo vai trò thành công');
    }

    @Get()
    @RequireAnyPermission('warehouse-manager-role.list', 'warehouse-manager-role.list.all')
    @ApiOperation({
        summary: 'Lấy danh sách vai trò quản lý kho',
        description:
            'Lấy danh sách các vai trò quản lý kho có hỗ trợ phân trang và tìm kiếm theo tên hoặc mô tả. ' +
            'Phù hợp để hiển thị bảng quản trị vai trò và màn hình chọn quyền.',
    })
    @ApiQuery({ name: 'search', required: false, type: String, description: 'Từ khóa tìm kiếm theo tên vai trò hoặc mô tả', example: 'Quản lý' })
    @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Số lượng bản ghi trên mỗi trang, mặc định là 10', example: 10 })
    @ApiQuery({ name: 'page', required: false, type: Number, description: 'Trang hiện tại, bắt đầu từ 1', example: 1 })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách vai trò quản lý kho thành công',
        schema: roleListSuccessSchema,
    })
    @ApiAuthResponses()
    async findAll(@Query() query: any) {
        const data = await this.warehouseManagerRoleService.findAllRoles(query);
        return new GetResponse(ResponseCode.WAREHOUSE_MANAGER_ROLE_LIST_SUCCESS, data, 'Lấy danh sách vai trò quản lý kho thành công');
    }

    @Get('permissions')
    @RequireAnyPermission('warehouse-manager-role.list', 'warehouse-manager-role.list.all')
    @ApiOperation({
        summary: 'Lấy danh sách quyền hạn vai trò kho',
        description:
            'Lấy toàn bộ quyền hạn có thể gán cho vai trò quản lý kho. ' +
            'Dữ liệu này thường được dùng để render danh sách checkbox hoặc tree quyền ở màn hình tạo/cập nhật vai trò.',
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy danh sách quyền hạn thành công',
        schema: permissionListSuccessSchema,
    })
    @ApiAuthResponses()
    async findAllPermissions() {
        const data = await this.warehouseManagerRoleService.findAllPermissions();
        return new GetResponse(ResponseCode.WAREHOUSE_MANAGER_ROLE_PERMISSIONS_LIST_SUCCESS, data, 'Lấy danh sách quyền hạn thành công');
    }

    @Get(':id')
    @RequireAnyPermission('warehouse-manager-role.read', 'warehouse-manager-role.read.all')
    @ApiOperation({
        summary: 'Lấy chi tiết vai trò quản lý kho',
        description:
            'Lấy thông tin chi tiết của một vai trò quản lý kho theo ID, bao gồm danh sách quyền hạn đã được gán. ' +
            'Dùng cho màn hình xem chi tiết hoặc đổ dữ liệu form cập nhật vai trò.',
    })
    @ApiParam({
        name: 'id',
        type: 'string',
        description: 'ID của vai trò quản lý kho cần xem chi tiết',
        example: ROLE_ID,
    })
    @ApiResponse({
        status: 200,
        description: 'Lấy chi tiết vai trò thành công',
        schema: roleSuccessSchema(ResponseCode.WAREHOUSE_MANAGER_ROLE_GET_SUCCESS, 'Lấy thông tin vai trò thành công'),
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy vai trò quản lý kho',
        schema: notFoundSchema,
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const data = await this.warehouseManagerRoleService.findRoleById(id, lang);
        return new GetResponse(ResponseCode.WAREHOUSE_MANAGER_ROLE_GET_SUCCESS, data, 'Lấy thông tin vai trò thành công');
    }

    @Patch(':id')
    @RequireAnyPermission('warehouse-manager-role.update', 'warehouse-manager-role.update.all')
    @ApiOperation({
        summary: 'Cập nhật vai trò quản lý kho',
        description:
            'Cập nhật một phần hoặc toàn bộ thông tin vai trò quản lý kho, bao gồm tên, mô tả và danh sách quyền hạn. ' +
            'Chỉ các trường được gửi trong request body mới được thay đổi.',
    })
    @ApiParam({
        name: 'id',
        type: 'string',
        description: 'ID của vai trò quản lý kho cần cập nhật',
        example: ROLE_ID,
    })
    @ApiBody({
        type: UpdateWarehouseManagerRoleDto,
        description: 'Dữ liệu cập nhật vai trò. Có thể chỉ gửi các trường muốn thay đổi.',
        examples: {
            update_name_description: {
                summary: 'Cập nhật tên và mô tả',
                description: 'Đổi tên vai trò và điều chỉnh mô tả nghiệp vụ',
                value: {
                    name: 'Quản lý kho ca chiều',
                    description: 'Phụ trách vận hành xuất nhập kho trong khung giờ chiều',
                },
            },
            update_permissions: {
                summary: 'Cập nhật danh sách quyền hạn',
                description: 'Thay đổi các quyền được gán cho vai trò hiện có',
                value: {
                    permission_ids: [
                        '1d9ac3a5-f593-4e73-9a7c-435f0d6b45e1',
                        '5a9e6f02-df9d-46af-a7cf-3c03f2c4b3fd',
                        'c1840188-d0bc-4234-8f17-41965d1b6260',
                    ],
                },
            },
            update_all: {
                summary: 'Cập nhật toàn bộ thông tin',
                description: 'Cập nhật đồng thời tên, mô tả và quyền hạn của vai trò',
                value: {
                    name: 'Điều phối kho trung tâm',
                    description: 'Giám sát toàn bộ luồng nhập, xuất và điều phối nhân sự tại kho trung tâm',
                    permission_ids: [
                        '1d9ac3a5-f593-4e73-9a7c-435f0d6b45e1',
                        '5a9e6f02-df9d-46af-a7cf-3c03f2c4b3fd',
                    ],
                },
            },
        },
    })
    @ApiResponse({
        status: 200,
        description: 'Cập nhật vai trò thành công',
        schema: roleSuccessSchema(ResponseCode.WAREHOUSE_MANAGER_ROLE_UPDATE_SUCCESS, 'Cập nhật vai trò thành công'),
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy vai trò quản lý kho',
        schema: notFoundSchema,
    })
    @ApiResponse({
        status: 409,
        description: 'Xung đột dữ liệu khi cập nhật vai trò',
        schema: conflictSchema('Tên vai trò đã tồn tại hoặc có quyền hạn không hợp lệ'),
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateWarehouseManagerRoleDto, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        const data = await this.warehouseManagerRoleService.updateRole(id, dto, lang);
        return new UpdatedResponse(ResponseCode.WAREHOUSE_MANAGER_ROLE_UPDATE_SUCCESS, data, 'Cập nhật vai trò thành công');
    }

    @Delete(':id')
    @RequireAnyPermission('warehouse-manager-role.delete', 'warehouse-manager-role.delete.all')
    @ApiOperation({
        summary: 'Xóa vai trò quản lý kho',
        description:
            'Thực hiện xóa mềm vai trò quản lý kho theo ID. ' +
            'Vai trò đang được gán cho người dùng hoặc đang phát sinh ràng buộc nghiệp vụ có thể bị từ chối xóa.',
    })
    @ApiParam({
        name: 'id',
        type: 'string',
        description: 'ID của vai trò quản lý kho cần xóa',
        example: ROLE_ID,
    })
    @ApiResponse({
        status: 200,
        description: 'Xóa vai trò thành công',
        schema: deleteSuccessSchema,
    })
    @ApiResponse({
        status: 404,
        description: 'Không tìm thấy vai trò quản lý kho',
        schema: notFoundSchema,
    })
    @ApiResponse({
        status: 409,
        description: 'Không thể xóa vai trò do đang có ràng buộc dữ liệu',
        schema: conflictSchema('Không thể xóa vai trò đang được gán cho người dùng hoặc đang được sử dụng'),
    })
    @ApiAuthResponses()
    @ApiValidationErrorResponse()
    async remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
        const lang = req.headers['accept-language'] || 'vi';
        await this.warehouseManagerRoleService.deleteRole(id, req.user.id, lang);
        return new DeletedResponse(ResponseCode.WAREHOUSE_MANAGER_ROLE_DELETE_SUCCESS, null, 'Xóa vai trò thành công');
    }
}
